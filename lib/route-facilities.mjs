import {roadPose,createRoad} from './route-drive.mjs';
const cache=new WeakMap();
const TYPES=[{type:'spbu',key:'pom',name:'SPBU simulasi',color:'#ead8b4'},{type:'bengkel',key:'bengkel',name:'Bengkel simulasi',color:'#b2d0cf'},{type:'hotel',key:'hotel',name:'Penginapan simulasi',color:'#d6bed8'},{type:'masjid',key:'masjid',name:'Masjid singgah simulasi',color:'#c8d8ae'}];
export function getFacilities(road){
 if(cache.has(road))return cache.get(road);
 const result=[],first=Math.min(80,road.distanceM*.3),spacing=Math.max(1000,Math.ceil(road.distanceM/1500));
 for(let d=first,i=0;d<road.distanceM-10;d+=spacing,i++){
  const pose=roadPose(road,d),side=i%2===0?1:-1,nx=Math.cos(pose.heading)*side,nz=-Math.sin(pose.heading)*side;
  const kind=TYPES[i%TYPES.length];result.push({...kind,id:`service-${i}-${kind.type}`,name:`${kind.name} ${String(i+1).padStart(2,'0')}`,progress:d,x:pose.x+nx*19,z:pose.z+nz*19,access:{x:pose.x+nx*8,z:pose.z+nz*8},radius:18,height:9});
 }
 cache.set(road,result);return result;
}
export function nearbyFacility(road,driver){
 if(!driver)return null;
 let best=null;
 for(const f of getFacilities(road)){
  if(Math.abs(f.progress-driver.progress)>70)continue;
  const distance=Math.hypot(f.access.x-driver.x,f.access.z-driver.z);
  if(distance<=f.radius&&(!best||distance<best.distance))best={...f,distance};
 }
 return best;
}
export function serviceAccess(session,action){
 if(session.status==='moving')return {allowed:false,message:'Berhenti dan jeda kendaraan sebelum menggunakan layanan.'};
 const camp=['idle','ready','arrived','error','loading'].includes(session.status);
 const near=!camp&&session.route&&session.driver?nearbyFacility(createRoad(session.route),session.driver):null;
 if(!camp&&session.driver&&Math.abs(session.driver.speed)>.5)return {allowed:false,message:'Perlambat hingga kendaraan berhenti.'};
 const facility=camp?{id:'camp',type:'camp',name:'Pos persiapan perjalanan'}:near;
 if(['repair','repair-help','help','rest-help'].includes(action))return {allowed:true,facility:facility||{id:'roadside',type:'roadside',name:'Bantuan tepi jalan'}};
 const allowed=action.startsWith('buy-')?camp||near?.type==='bengkel':action==='fuel'?camp||near?.type==='spbu':action==='rest'?camp||['hotel','masjid'].includes(near?.type):action==='rest-hotel'?near?.type==='hotel':false;
 if(!allowed)return {allowed:false,message:action==='fuel'?'Isi bensin hanya di pos persiapan atau dekat SPBU simulasi.':action.startsWith('buy-')?'Belanja suku cadang hanya di pos persiapan atau dekat bengkel simulasi.':'Berhenti dekat penginapan atau masjid singgah untuk istirahat.'};
 return {allowed:true,facility,action:action==='rest'&&near?.type==='hotel'?'rest-hotel':action};
}

export function serviceLabel(action){if(action.startsWith('buy-'))return 'Belanja persediaan';return {fuel:'Isi bensin',rest:'Istirahat', 'rest-hotel':'Menginap','rest-help':'Bantuan istirahat',repair:'Perbaikan mandiri','repair-help':'Bantuan perbaikan',help:'Bantuan bensin'}[action]||'Layanan';}
