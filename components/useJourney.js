"use client";
import {allLocations,arrivalEntry,confirmVisit,saveCustom,deleteCustom} from '@/lib/ziarah-journal.mjs';
import {useCallback,useEffect,useRef,useState} from 'react';
import {validateJourneyRoute} from '@/lib/journey.mjs';
import {createRoad,newDriver} from '@/lib/route-drive.mjs';
import {JOURNEY_KEY,initialJourney,decodeJourney,encodeJourney} from '@/lib/journey-save.mjs';
import {serviceResources,validResources} from '@/lib/travel-resources.mjs';
import {serviceAccess} from '@/lib/route-facilities.mjs';
import {isValidParty} from '@/lib/party.mjs';
import {validateStopIds,splitItinerary,nextItineraryLeg,itineraryRemaining} from '@/lib/itinerary.mjs';
import {createBackup,inspectBackup,persistBackup} from '@/lib/game-backup.mjs';
export function useJourney(start){
 const [session,setSession]=useState(()=>initialJourney(start));
 const live=useRef(initialJourney(start)),request=useRef(null);
 const [hydrated,setHydrated]=useState(false),[storageNote,setStorageNote]=useState('');
 const update=useCallback(next=>{live.current=next;setSession(next);},[]);
 const save=useCallback(()=>{try{localStorage.setItem(JOURNEY_KEY,encodeJourney(live.current));setStorageNote('Kemajuan tersimpan');return true;}catch{setStorageNote('Kemajuan belum tersimpan. Penyimpanan browser penuh atau tidak tersedia.');return false;}},[]);
 useEffect(()=>{
  const timer=setTimeout(()=>{try{const raw=localStorage.getItem(JOURNEY_KEY);if(raw)update(decodeJourney(raw,start));}catch{setStorageNote('Simpanan tidak dapat dibaca. Perjalanan baru tersedia.');}setHydrated(true);},0);
  return()=>clearTimeout(timer);
 },[start,update]);
 const pause=useCallback(()=>{const s=live.current;if(s.status==='moving'){update({...s,status:'paused',driver:{...s.driver,speed:0}});save();}},[update,save]);
 useEffect(()=>{if(!hydrated)return;const t=setInterval(save,2000);const hidden=()=>{if(document.hidden)pause();};window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',hidden);return()=>{clearInterval(t);window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',hidden);};},[hydrated,pause,save]);
 useEffect(()=>()=>{request.current?.abort();request.current=null;},[]);
 function clearRoute(){const s=live.current;if(['moving','paused'].includes(s.status))return;request.current?.abort();request.current=null;update({...s,destination:null,route:null,driver:null,itinerary:null,status:'idle',error:''});save();}
 async function plan(place){
  const s=live.current;if(!hydrated||['moving','paused'].includes(s.status)||place.id===s.origin.id)return;
  request.current?.abort();const controller=new AbortController();request.current=controller;
  update({...s,itinerary:null,destination:place,route:null,driver:null,status:'loading',error:''});
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{const response=await fetch('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({points:[s.origin.coordinates,place.coordinates]}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Rute gagal dihitung.');const route=validateJourneyRoute(data);if(request.current!==controller)return;update({...live.current,route,driver:{...newDriver(createRoad(route)),resources:live.current.resources},party:[],status:'ready'});save();}
  catch(e){if(request.current===controller)update({...live.current,status:'error',error:e.name==='AbortError'?'Layanan rute melewati batas waktu. Coba lagi.':e.message});}
  finally{clearTimeout(timeout);if(request.current===controller)request.current=null;}
 }
 async function planStops(ids){
  const s=live.current;if(!hydrated||['moving','paused','loading'].includes(s.status))return {ok:false,message:'Selesaikan perjalanan aktif atau tunggu penghitungan rute.'};
  let places;try{places=validateStopIds(ids,allLocations(s),s.origin.id);}catch(e){return {ok:false,message:e.message};}
  request.current?.abort();const controller=new AbortController();request.current=controller;
  update({...s,itinerary:null,destination:places[0],route:null,driver:null,party:[],status:'loading',error:''});
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({points:[s.origin.coordinates,...places.map(p=>p.coordinates)]}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Rangkaian rute gagal dihitung.');
   if(request.current!==controller)return {ok:false,message:'Penghitungan dibatalkan.'};
   const itinerary=splitItinerary(data,places,s.origin),route=itinerary.legRoutes[0];
   update({...live.current,itinerary,route,driver:{...newDriver(createRoad(route)),resources:live.current.resources},status:'ready',error:''});save();
   return {ok:true,message:`${places.length} tujuan siap. Berangkat menuju ${places[0].name}.`};
  }catch(e){const message=e.name==='AbortError'?'Layanan rute melewati batas waktu. Coba lagi.':e.message;if(request.current===controller)update({...live.current,status:'error',error:message});return {ok:false,message};}
  finally{clearTimeout(timeout);if(request.current===controller)request.current=null;}
 }
 function nextStop(){try{update(nextItineraryLeg(live.current,allLocations(live.current)));const persisted=save();return {ok:true,message:persisted?'Tujuan berikutnya siap. Tekan Berangkat untuk melanjutkan.':'Tujuan berikutnya siap, tetapi kemajuan belum tersimpan.'};}catch(e){return {ok:false,message:e.message};}}
 function exportProgress(party){if(!hydrated)throw Error('Tunggu progres selesai dimuat.');pause();save();return createBackup(live.current,party);}
 function restoreProgress(raw){
  if(!hydrated||live.current.status==='loading')return {ok:false,message:'Tunggu pemuatan atau penghitungan rute selesai.'};
  try{const backup=inspectBackup(raw,start);persistBackup(localStorage,backup);request.current?.abort();request.current=null;update(backup.session);setStorageNote('Cadangan berhasil dipulihkan');return {ok:true,party:backup.selectedParty,origin:backup.session.origin,message:'Cadangan dipulihkan. Perjalanan aktif dijeda dan dapat dilanjutkan.'};}catch(e){return {ok:false,message:e.message};}
 }
 function startTravel(party){const s=live.current;if(s.route&&['ready','paused'].includes(s.status)&&isValidParty(s.party.length?s.party:party)){update({...s,party:s.party.length?s.party:[...party],status:'moving'});save();}}
 const report=useCallback(driver=>{
  const s=live.current;if(s.status!=='moving')return;
  if(!validResources(driver.resources))return;
  const arrived=driver.arrived;
  update({...s,driver,resources:driver.resources,status:arrived?'arrived':driver.resources.breakdown?'paused':'moving',origin:arrived?s.destination:s.origin,visits:arrived?[...s.visits,arrivalEntry(s.destination,s.party,driver.resources.clock,new Date().toISOString(),crypto.randomUUID())].slice(-100):s.visits});
  if(arrived||driver.resources.breakdown)save();
 },[update,save]);
 const service=useCallback((action,selectedParty)=>{
  const s=live.current;if(s.status==='moving')return {message:'Jeda perjalanan sebelum menggunakan layanan.'};
  const pair=s.party.length?s.party:selectedParty;
  if(!isValidParty(pair))return {message:'Pilih dua karakter dahulu.'};
  const access=serviceAccess(s,action);if(!access.allowed)return {message:access.message};
  const result=serviceResources(s.resources,access.action||action,pair);
  if(result.resources!==s.resources)result.resources={...result.resources,serviceLog:[...s.resources.serviceLog,{facilityId:access.facility.id,name:access.facility.name,action:access.action||action,clock:result.resources.clock}].slice(-50)};
  update({...s,resources:result.resources,driver:s.driver?{...s.driver,speed:0,resources:result.resources}:null});save();return result;
 },[update,save]);
 const savedResult=message=>{const persisted=save();return {ok:true,persisted,message:persisted?message:'Perubahan diterapkan, tetapi belum tersimpan. Penyimpanan browser penuh atau tidak tersedia.'};};
 const recordVisit=(locationId,selectedParty)=>{const s=live.current;try{const place=allLocations(s).find(p=>p.id===locationId),pair=s.party.length?s.party:selectedParty;update(confirmVisit(s,place,pair,new Date().toISOString(),crypto.randomUUID()));return savedResult('Kunjungan dicatat di jurnal.');}catch(e){return {ok:false,message:e.message};}};
 const saveProfileNote=(id,note)=>{const s=live.current;if(!allLocations(s).some(p=>p.id===id))return {ok:false,message:'Lokasi tidak ditemukan.'};if(typeof note!=='string'||note.length>6000)return {ok:false,message:'Catatan maksimal 6.000 karakter.'};update({...s,profileNotes:{...s.profileNotes,[id]:note.trim()}});return savedResult('Catatan pribadi disimpan.');};
 const saveVisitNote=(id,note)=>{const s=live.current;if(typeof note!=='string'||note.length>6000||!s.visits.some(v=>v.id===id))return {ok:false,message:'Catatan kunjungan tidak valid.'};update({...s,visits:s.visits.map(v=>v.id===id?{...v,note:note.trim()}:v)});return savedResult('Catatan jurnal disimpan.');};
 const saveLocation=input=>{try{update(saveCustom(live.current,input));return savedResult('Lokasi tambahan disimpan.');}catch(e){return {ok:false,message:e.message};}};
 const removeLocation=id=>{try{update(deleteCustom(live.current,id));return savedResult('Lokasi dihapus. Riwayat kedatangan tetap disimpan.');}catch(e){return {ok:false,message:e.message};}};
 const cancel=()=>{pause();const s=live.current;update({...s,status:'idle',route:null,driver:null,destination:null,itinerary:null,party:[],error:''});save();};
 const traveled=session.driver?.progress||0;
 const position=session.route&&session.driver?createRoad(session.route).toGeo(session.driver):session.origin.coordinates;
 return {...session,planStops,nextStop,exportProgress,restoreProgress,itineraryRemaining:itineraryRemaining(session),recordVisit,saveProfileNote,saveVisitNote,saveLocation,removeLocation,locations:allLocations(session),service,hydrated,storageNote,save,report,cancel,position,traveled,remaining:Math.max(0,(session.route?.distanceM||0)-traveled),plan,start:startTravel,pause,clearRoute};
}
