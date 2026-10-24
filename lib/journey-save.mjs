import {normalizeItinerary} from './itinerary.mjs';
import {allLocations,normalizeCustoms,normalizeJournal,normalizeProfileNotes} from './ziarah-journal.mjs';
import {initialMaintenance} from './vehicle-maintenance.mjs';
import {initialResources,validResources} from './travel-resources.mjs';
import {validateJourneyRoute} from './journey.mjs';
import {SEED_LOCATIONS} from './locations.mjs';
import {isValidParty} from './party.mjs';
import {createRoad,newDriver,locateDriver} from './route-drive.mjs';
export const JOURNEY_KEY='ziarah-walisongo.manual.v1';
export function initialJourney(start){return {origin:start,destination:null,route:null,driver:null,party:[],status:'idle',visits:[],error:'',resources:initialResources(),customLocations:[],profileNotes:{},completedSeedIds:[],itinerary:null};}
export function decodeJourney(raw,start){
 const d=JSON.parse(raw);if(![1,2,3,4,5,6].includes(d.version))throw Error('Versi simpanan tidak didukung.');
 const customLocations=d.version>=5?normalizeCustoms(d.customLocations||[]):[];
 const locations=allLocations({customLocations}),profileNotes=normalizeProfileNotes(d.profileNotes,locations);
 const origin=locations.find(p=>p.id===d.originId),destination=locations.find(p=>p.id===d.destinationId);
 if(!origin)throw Error('Posisi simpanan tidak valid.');
 const resources=d.version===1?initialResources():d.version===2?{...d.resources,...initialMaintenance(d.resources?.totalMeters||0),serviceLog:[]}:d.version===3?{...d.resources,serviceLog:[]}:d.resources;if(!validResources(resources))throw Error('Data bensin atau energi tidak valid.');
 const visits=normalizeJournal(d.visits,locations);
 const completedSeedIds=[...new Set([...(Array.isArray(d.completedSeedIds)?d.completedSeedIds:[]),...visits.filter(v=>v.confirmed).map(v=>v.locationId)])].filter(id=>SEED_LOCATIONS.some(p=>p.id===id));
 const extra={customLocations,profileNotes,completedSeedIds};
 if(!d.route){if(d.itinerary)throw Error('Rangkaian tujuan kehilangan rute aktif.');return {...initialJourney(origin),visits,resources,...extra};}
 const route=validateJourneyRoute(d.route),road=createRoad(route),a=d.driver;
 if(!destination||!a||!['x','z','heading','progress'].every(k=>Number.isFinite(a[k]))||a.progress<0||a.progress>road.distanceM||Math.abs(a.x)>3000000||Math.abs(a.z)>3000000)throw Error('Kemajuan simpanan tidak valid.');
 if(!isValidParty(d.party)&&d.status!=='ready')throw Error('Pasangan karakter simpanan tidak valid.');
 const nearest=locateDriver(road,a);if(nearest.distance>5000)throw Error('Posisi terlalu jauh dari jalur.');
 const driver={...newDriver(road,a.progress),x:a.x,z:a.z,heading:a.heading,offRoad:nearest.distance>5,speed:0,arrived:d.status==='arrived',resources};
 const session={...extra,origin,destination,route,driver,resources,party:isValidParty(d.party)?d.party:[],visits,error:'',status:d.status==='arrived'?'arrived':d.status==='ready'?'ready':'paused'};
 return {...session,itinerary:normalizeItinerary(d.version>=6?d.itinerary:null,locations,session)};
}
export function encodeJourney(s){return JSON.stringify({version:6,itinerary:s.itinerary,customLocations:s.customLocations,profileNotes:s.profileNotes,completedSeedIds:s.completedSeedIds,resources:s.resources,originId:s.origin.id,destinationId:s.destination?.id,route:s.route,driver:s.driver,party:s.party,status:s.status,visits:s.visits});}
