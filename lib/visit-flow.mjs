import {SEED_LOCATIONS} from './locations.mjs';
import {canRecordVisit,confirmVisit} from './ziarah-journal.mjs';
import {isValidParty} from './party.mjs';
import {clockLabel} from './travel-resources.mjs';

const sameParty=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.join('|')===b.join('|');
export function canParkVisit(session,place){return !!place&&!['moving','loading'].includes(session.status)&&Math.abs(session.driver?.speed||0)<=.3&&canRecordVisit(session,place);}
export function isParkedForVisit(session,place,party){return canParkVisit(session,place)&&session.parking?.locationId===place.id&&sameParty(session.parking.party,party);}
export function hasRecordedVisit(session,place,party){
 if(!place)return false;const visits=session.visits.filter(v=>v.locationId===place.id&&sameParty(v.party,party)),latest=visits.at(-1);
 if(session.status==='arrived'&&session.destination?.id===place.id&&latest?.confirmed)return true;
 return visits.some(v=>v.confirmed&&v.gameClock!==null&&Math.floor(v.gameClock/1440)===Math.floor(session.resources.clock/1440));
}
export function parkForVisit(session,place,party,at=new Date().toISOString()){
 if(!canParkVisit(session,place))throw Error('Berhenti dekat maqbarah atau selesaikan perjalanan sebelum parkir.');
 if(!isValidParty(party))throw Error('Pilih dua karakter sebelum parkir untuk kunjungan.');
 if(!Number.isFinite(Date.parse(at)))throw Error('Waktu parkir tidak valid.');
 return {...session,parking:{locationId:place.id,party:[...party],parkedAt:at,gameClock:session.resources.clock}};
}
export function normalizeParking(value,session,locations){
 if(!value||typeof value!=='object'||!isValidParty(value.party)||typeof value.parkedAt!=='string'||!Number.isFinite(Date.parse(value.parkedAt))||!Number.isFinite(value.gameClock)||value.gameClock<0)return null;
 const place=locations.find(p=>p.id===value.locationId);if(!canParkVisit(session,place))return null;
 return {locationId:place.id,party:[...value.party],parkedAt:value.parkedAt,gameClock:value.gameClock};
}
export function recordParkedVisit(session,place,party,at,id){
 if(!isParkedForVisit(session,place,party))throw Error('Parkirkan Vespa di maqbarah ini sebelum mencatat kunjungan.');
 return confirmVisit(session,place,party,at,id);
}
export function canContinueFromStop(session){return session.status==='arrived'&&hasRecordedVisit(session,session.destination,session.party);}
export function visitMilestones(session){
 const ids=new Set([...(session.completedSeedIds||[]),...session.visits.filter(v=>v.confirmed).map(v=>v.locationId)]);
 const places=SEED_LOCATIONS.map(p=>({...p,completed:ids.has(p.id),entry:[...session.visits].reverse().find(v=>v.confirmed&&v.locationId===p.id)||null}));
 const count=places.filter(p=>p.completed).length;return {places,count,total:places.length,complete:count===places.length};
}
export function journeySummaryText(session){
 const progress=visitMilestones(session),lines=['RINGKASAN ZIARAH WALISONGO',progress.complete?'Sembilan maqbarah telah dicatat pada simpanan ini.':'Perjalanan masih berlangsung.',`Progres terkonfirmasi: ${progress.count}/${progress.total}`,`Jarak berkendara tersimpan: ${(session.resources.totalMeters/1000).toFixed(2)} km`,`Waktu permainan saat ringkasan dibuat: ${clockLabel(session.resources.clock)}`,''];
 for(const [index,p] of progress.places.entries())lines.push(`${index+1}. ${p.name}: ${p.completed?'Sudah dicatat':'Belum dicatat'}`,p.entry?.gameClock!==null&&p.entry?.gameClock!==undefined?`   Waktu kunjungan di jurnal: ${clockLabel(p.entry.gameClock)}`:p.completed?'   Rincian kunjungan tidak tersedia pada jurnal yang tersimpan.':'');
 lines.push('','Hanya kunjungan yang dikonfirmasi dihitung. Lokasi tambahan tidak termasuk sembilan maqbarah.','Jarak mencakup perjalanan pada simpanan ini. Ringkasan teks ini bukan file cadangan dan tidak dapat dipakai memulihkan progres.');return lines.join('\n');
}
