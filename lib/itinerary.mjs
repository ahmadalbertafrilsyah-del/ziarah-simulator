import {validateJourneyRoute} from './journey.mjs';
import {distanceMeters} from './geo.mjs';
import {createRoad,newDriver} from './route-drive.mjs';
export const MAX_STOPS=8;
export function validateStopIds(ids,locations,originId){
 if(!Array.isArray(ids)||ids.length<1||ids.length>MAX_STOPS||new Set(ids).size!==ids.length)throw Error('Pilih 1–8 tujuan berbeda.');
 const places=ids.map(id=>locations.find(p=>p.id===id));
 if(places.some(p=>!p)||ids.includes(originId))throw Error('Tujuan tidak ditemukan atau sama dengan posisi awal.');
 const points=[locations.find(p=>p.id===originId),...places];
 if(!points[0]||points.some((p,i)=>i>0&&distanceMeters(points[i-1].coordinates,p.coordinates)<5))throw Error('Dua titik berurutan terlalu dekat. Pilih lokasi lain.');
 return places;
}
// Split only at boundaries supplied by the routing service. Never invent connecting roads.
export function splitItinerary(data,places,origin){
 const full=validateJourneyRoute(data),stops=data.stops;
 if(!Array.isArray(stops)||stops.length!==places.length)throw Error('Layanan rute belum menyediakan batas setiap pemberhentian.');
 let startIndex=0;
 const routes=stops.map((stop,i)=>{
  const end=stop?.endIndex;
  if(!Number.isInteger(end)||end<=startIndex||end>=full.coordinates.length)throw Error('Batas ruas perjalanan tidak valid.');
  const coordinates=full.coordinates.slice(startIndex,end+1);
  const distanceM=full.cumulative[end]-full.cumulative[startIndex];
  const route=validateJourneyRoute({...full,coordinates,durationSec:Number.isFinite(stop.durationSec)&&stop.durationSec>0?stop.durationSec:full.durationSec*distanceM/full.distanceM});
  const from=i?places[i-1]:origin;
  if(distanceMeters(coordinates[0],from.coordinates)>2000||distanceMeters(coordinates.at(-1),places[i].coordinates)>2000)throw Error('Akses jalan terlalu jauh dari titik tujuan. Periksa koordinat lokasi.');
  startIndex=end;return route;
 });
 if(startIndex!==full.coordinates.length-1)throw Error('Rute tidak berakhir pada tujuan terakhir.');
 return {stopIds:places.map(p=>p.id),legRoutes:routes,index:0};
}
export function normalizeItinerary(value,locations,session){
 if(value==null)return null;
 if(!Array.isArray(value.stopIds)||value.stopIds.length<1||value.stopIds.length>MAX_STOPS||new Set(value.stopIds).size!==value.stopIds.length||value.stopIds.some(id=>!locations.some(p=>p.id===id))||!Number.isInteger(value.index)||value.index<0||value.index>=value.stopIds.length||!Array.isArray(value.legRoutes)||value.legRoutes.length!==value.stopIds.length)throw Error('Rangkaian tujuan dalam simpanan tidak valid.');
 const legRoutes=value.legRoutes.map(validateJourneyRoute);
 for(let i=0;i<legRoutes.length;i++){
  const r=legRoutes[i],target=locations.find(p=>p.id===value.stopIds[i]);
  if(distanceMeters(r.coordinates.at(-1),target.coordinates)>2000||(i>0&&distanceMeters(r.coordinates[0],legRoutes[i-1].coordinates.at(-1))>2))throw Error('Ruas rangkaian tujuan tidak terhubung.');
 }
 if(legRoutes.reduce((n,r)=>n+r.coordinates.length,0)>100000+MAX_STOPS-1)throw Error('Geometri rangkaian tujuan terlalu besar.');
 const active=legRoutes[value.index];
 if(!session.route||session.destination?.id!==value.stopIds[value.index]||JSON.stringify(active.coordinates)!==JSON.stringify(session.route.coordinates))throw Error('Rute aktif tidak cocok dengan rangkaian tujuan.');
 return {stopIds:[...value.stopIds],legRoutes,index:value.index};
}
export function nextItineraryLeg(s,locations){
 const t=s.itinerary;
 if(s.status!=='arrived'||!t||t.index+1>=t.stopIds.length)throw Error('Belum ada tujuan berikutnya yang dapat disiapkan.');
 const index=t.index+1,route=t.legRoutes[index],destination=locations.find(p=>p.id===t.stopIds[index]);
 if(!destination)throw Error('Tujuan berikutnya tidak ditemukan.');
 return {...s,parking:null,itinerary:{...t,index},route,destination,driver:{...newDriver(createRoad(route)),resources:s.resources},status:'ready',error:''};
}
export function itineraryRemaining(s){
 if(!s.itinerary)return Math.max(0,(s.route?.distanceM||0)-(s.driver?.progress||0));
 return Math.max(0,s.itinerary.legRoutes[s.itinerary.index].distanceM-(s.driver?.progress||0))+s.itinerary.legRoutes.slice(s.itinerary.index+1).reduce((n,r)=>n+r.distanceM,0);
}

export function itineraryMapRoute(s){
 if(!s.itinerary)return s.route;
 const routes=s.itinerary.legRoutes.slice(s.itinerary.index);
 const coordinates=routes.flatMap((r,i)=>i?r.coordinates.slice(1):r.coordinates);
 return validateJourneyRoute({coordinates,durationSec:routes.reduce((n,r)=>n+r.durationSec,0),source:s.route.source,retrieved:s.route.retrieved});
}
