import {SEED_LOCATIONS} from './locations.mjs';
import {validCoordinate,distanceMeters} from './geo.mjs';
import {createRoad} from './route-drive.mjs';
import {isValidParty} from './party.mjs';
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function safeSource(value){const s=text(value,1000);if(!s)return '';try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol))throw Error();return u.href;}catch{throw Error('Sumber harus memakai URL http atau https yang valid.');}}
export function validateCustomLocation(input){
 if(!input||typeof input.id!=='string'||!/^custom-[a-z0-9-]{8,100}$/.test(input.id))throw Error('ID lokasi tambahan tidak valid.');
 const name=text(input.name,100);if(!name)throw Error('Nama maqbarah wajib diisi.');
 if(!validCoordinate(input.coordinates))throw Error('Koordinat harus berada dalam cakupan Indonesia: longitude 94–142 dan latitude -11,5–6,5.');
 return {id:input.id,type:'maqbarah',name,person:text(input.person,120),region:text(input.region,140),history:text(input.history,6000),source:safeSource(input.source),coordinates:[...input.coordinates],custom:true,canRest:false};
}
export function allLocations(s){return [...SEED_LOCATIONS,...(s.customLocations||[])];}
export function normalizeCustoms(items){
 if(!Array.isArray(items)||items.length>100)throw Error('Daftar lokasi tambahan tidak valid.');
 const result=items.map(validateCustomLocation);if(new Set(result.map(p=>p.id)).size!==result.length)throw Error('ID lokasi tambahan berulang.');return result;
}
export function snapshotLocation(p){return {id:p.id,name:p.name,person:p.person||'',region:p.region||'',coordinates:[...p.coordinates],custom:!!p.custom};}
export function normalizeJournal(items,locations){
 if(!Array.isArray(items))return [];
 return items.slice(-100).flatMap((v,i)=>{
  if(!v||typeof v.locationId!=='string'||typeof v.arrivedAt!=='string'||!Number.isFinite(Date.parse(v.arrivedAt)))return [];
  const known=locations.find(p=>p.id===v.locationId),snap=v.snapshot;
  const p=(snap&&snap.id===v.locationId&&validCoordinate(snap.coordinates)&&text(snap.name,100)?{...snap,name:text(snap.name,100),person:text(snap.person,120),region:text(snap.region,140)}:known);
  if(!p)return [];
  return [{id:text(v.id,120)||`legacy-${i}-${v.locationId}`,locationId:v.locationId,snapshot:snapshotLocation(p),arrivedAt:v.arrivedAt,party:isValidParty(v.party)?[...v.party]:[],gameClock:Number.isFinite(v.gameClock)&&v.gameClock>=0?v.gameClock:null,note:text(v.note,6000),confirmed:v.confirmed===true}];
 });
}
export function normalizeProfileNotes(notes,locations){
 if(!notes||typeof notes!=='object'||Array.isArray(notes))return {};
 return Object.fromEntries(locations.filter(p=>typeof notes[p.id]==='string').map(p=>[p.id,text(notes[p.id],6000)]));
}
export function canRecordVisit(s,place){
 if(!place||s.status==='moving')return false;
 if(s.status==='arrived'&&s.destination?.id===place.id)return true;
 const position=s.route&&s.driver?createRoad(s.route).toGeo(s.driver):s.origin.coordinates;
 return distanceMeters(position,place.coordinates)<=150;
}
export function arrivalEntry(place,party,clock,at,id){return {id,locationId:place.id,snapshot:snapshotLocation(place),arrivedAt:at,party:[...party],gameClock:clock,note:'',confirmed:false};}
export function confirmVisit(s,place,party,at,id){
 if(!canRecordVisit(s,place))throw Error('Kunjungan hanya dapat dicatat saat berada di dekat maqbarah atau setelah tiba.');
 if(!isValidParty(party))throw Error('Pilih dua karakter sebelum mencatat kunjungan.');
 const day=Math.floor(s.resources.clock/1440);
 if(s.visits.some(v=>v.confirmed&&v.locationId===place.id&&v.gameClock!==null&&Math.floor(v.gameClock/1440)===day&&v.party.join('|')===party.join('|')))throw Error('Kunjungan untuk pasangan dan hari permainan ini sudah dicatat.');
 const visits=[...s.visits];let i=-1;
 for(let j=visits.length-1;j>=0;j--)if(visits[j].locationId===place.id&&!visits[j].confirmed){i=j;break;}
 const entry=i>=0?visits[i]:arrivalEntry(place,party,s.resources.clock,at,id);
 const next={...entry,confirmed:true,party:[...party],gameClock:entry.gameClock??s.resources.clock};
 if(i>=0)visits[i]=next;else visits.push(next);
 const completedSeedIds=[...new Set([...(s.completedSeedIds||[]),...(SEED_LOCATIONS.some(p=>p.id===place.id)?[place.id]:[])])];
 return {...s,visits:visits.slice(-100),completedSeedIds};
}
export function saveCustom(s,input){
 if(['moving','paused','loading'].includes(s.status))throw Error('Selesaikan atau batalkan perjalanan aktif sebelum mengubah lokasi.');
 const place=validateCustomLocation(input),list=s.customLocations||[],index=list.findIndex(p=>p.id===place.id);
 if(index>=0&&(s.origin.id===place.id||s.destination?.id===place.id||s.itinerary?.stopIds.includes(place.id)))throw Error('Lokasi yang menjadi posisi saat ini atau tujuan rangkaian rute tidak dapat diubah.');
 if(index<0&&list.length>=100)throw Error('Maksimum 100 lokasi tambahan.');
 const customs=index<0?[...list,place]:list.map(p=>p.id===place.id?place:p);
 return {...s,customLocations:customs};
}
export function deleteCustom(s,id){
 if(['moving','paused','loading'].includes(s.status))throw Error('Selesaikan atau batalkan perjalanan aktif dahulu.');
 if(s.origin.id===id||s.destination?.id===id||s.itinerary?.stopIds.includes(id))throw Error('Posisi saat ini atau tujuan rute tidak dapat dihapus.');
 if(!s.customLocations.some(p=>p.id===id))throw Error('Lokasi tambahan tidak ditemukan.');
 const notes={...s.profileNotes};delete notes[id];return {...s,customLocations:s.customLocations.filter(p=>p.id!==id),profileNotes:notes};
}
