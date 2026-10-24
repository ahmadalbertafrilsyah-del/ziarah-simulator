import test from 'node:test';import assert from 'node:assert/strict';
import {MAX_STOPS,validateStopIds,splitItinerary,nextItineraryLeg,itineraryRemaining,itineraryMapRoute} from '../lib/itinerary.mjs';
import {BACKUP_LIMIT,createBackup,inspectBackup,persistBackup} from '../lib/game-backup.mjs';
import {initialJourney,encodeJourney,decodeJourney,JOURNEY_KEY} from '../lib/journey-save.mjs';
import {PARTY_STORAGE_KEY} from '../lib/party.mjs';import {SEED_LOCATIONS} from '../lib/locations.mjs';
import {allLocations,validateCustomLocation,saveCustom,deleteCustom,confirmVisit} from '../lib/ziarah-journal.mjs';
import {createRoad,newDriver} from '../lib/route-drive.mjs';
const origin=SEED_LOCATIONS.find(p=>p.id==='sunan-ampel'),pair=['bapak','ibu'];
const first=validateCustomLocation({id:'custom-firsttest',name:'Tujuan satu',coordinates:[origin.coordinates[0],origin.coordinates[1]+.001]}),second=validateCustomLocation({id:'custom-secondtest',name:'Tujuan dua',coordinates:[origin.coordinates[0],origin.coordinates[1]+.002]});
const base=()=>saveCustom(saveCustom(initialJourney(origin),first),second);
const data={coordinates:[origin.coordinates,[origin.coordinates[0],origin.coordinates[1]+.0005],first.coordinates,second.coordinates],durationSec:90,stops:[{endIndex:2,durationSec:35},{endIndex:3,durationSec:55}],source:'Rute fixture'};
function planned(){const s=base(),itinerary=splitItinerary(data,[first,second],origin),route=itinerary.legRoutes[0];return {...s,itinerary,route,destination:first,status:'ready',party:pair,driver:{...newDriver(createRoad(route)),resources:s.resources}};}
function storage(values={},fail){const m=new Map(Object.entries(values));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>{if(fail?.(k,v))throw Error('quota');m.set(k,v);},removeItem:k=>m.delete(k)};}
test('itinerary validates count, unique destinations, origin, known ids and nearby consecutive points',()=>{
 const s=base(),locations=allLocations(s);assert.deepEqual(validateStopIds([first.id,second.id],locations,origin.id),[first,second]);
 for(const ids of [[],[first.id,first.id],[origin.id],['missing'],Array(MAX_STOPS+1).fill(first.id)])assert.throws(()=>validateStopIds(ids,locations,origin.id));
 assert.throws(()=>validateStopIds([first.id,'custom-nearbytest'],[...locations,{...second,id:'custom-nearbytest',coordinates:first.coordinates}],origin.id));
});
test('service boundaries split real lines at shared endpoints and preserve individual duration',()=>{
 const itinerary=splitItinerary(data,[first,second],origin);assert.equal(itinerary.legRoutes.length,2);assert.deepEqual(itinerary.legRoutes[0].coordinates.at(-1),itinerary.legRoutes[1].coordinates[0]);assert.equal(itinerary.legRoutes[0].durationSec,35);assert.equal(itinerary.legRoutes[1].durationSec,55);assert.deepEqual(itineraryMapRoute(planned()).coordinates,data.coordinates);
 for(const stops of [[],[{endIndex:0},{endIndex:3}],[{endIndex:2},{endIndex:2}],[{endIndex:1},{endIndex:2}]])assert.throws(()=>splitItinerary({...data,stops},[first,second],origin));
 assert.throws(()=>splitItinerary(data,[first,{...second,coordinates:[100,-7]}],origin));
});
test('arrival gates next leg, preserves supplies and selected pair, and stops at final destination',()=>{
 const s=planned();assert.throws(()=>nextItineraryLeg(s,allLocations(s)));
 const arrived={...s,status:'arrived',origin:first,driver:{...s.driver,progress:s.route.distanceM,arrived:true}};
 assert.ok(Math.abs(itineraryRemaining(arrived)-s.itinerary.legRoutes[1].distanceM)<1e-7);
 const next=nextItineraryLeg(arrived,allLocations(s));assert.equal(next.status,'ready');assert.equal(next.itinerary.index,1);assert.equal(next.destination.id,second.id);assert.equal(next.driver.progress,0);assert.equal(next.driver.arrived,false);assert.equal(next.driver.resources,s.resources);assert.equal(next.resources,s.resources);assert.deepEqual(next.party,pair);
 assert.throws(()=>nextItineraryLeg({...next,status:'arrived'},allLocations(s)));
});
test('schema six restores itinerary index and active pose; future custom stops cannot be removed or edited',()=>{
 const s=planned();assert.throws(()=>deleteCustom(s,second.id));assert.throws(()=>saveCustom(s,{...second,name:'Khác'}));
 const next=nextItineraryLeg({...s,status:'arrived',origin:first},allLocations(s));const restored=decodeJourney(encodeJourney({...next,status:'moving'}),origin);assert.equal(restored.status,'paused');assert.equal(restored.itinerary.index,1);assert.equal(restored.destination.id,second.id);assert.deepEqual(restored.itinerary.stopIds,[first.id,second.id]);
 const broken=JSON.parse(encodeJourney(s));broken.itinerary.index=1;assert.throws(()=>decodeJourney(JSON.stringify(broken),origin));broken.itinerary.index=0;broken.itinerary.legRoutes[1].coordinates[0]=[100,-7];assert.throws(()=>decodeJourney(JSON.stringify(broken),origin));
 const old=JSON.parse(encodeJourney(base()));old.version=5;delete old.itinerary;assert.equal(decodeJourney(JSON.stringify(old),origin).itinerary,null);
});
test('backup carries routes, supplies, local notes, locations, visits and both character selections',()=>{
 let s=planned();s=confirmVisit(s,origin,pair,'2026-10-24T12:00:00Z','visit-backup');s.profileNotes[first.id]='Catatan pribadi';s.visits[0].note='Catatan kunjungan';
 const restored=inspectBackup(createBackup({...s,status:'moving'},['anak','ibu'],'2026-10-24T12:00:00Z'),origin);assert.equal(restored.session.status,'paused');assert.deepEqual(restored.selectedParty,['anak','ibu']);assert.deepEqual(restored.session.party,pair);assert.equal(restored.session.profileNotes[first.id],'Catatan pribadi');assert.equal(restored.session.visits[0].note,'Catatan kunjungan');assert.equal(restored.session.customLocations.length,2);assert.deepEqual(restored.session.resources,s.resources);assert.deepEqual(restored.session.completedSeedIds,[origin.id]);
});
test('corrupt, oversized, unrelated and incompatible backups fail before any storage changes',()=>{
 const raw=createBackup(planned(),pair),mutate=f=>{const d=JSON.parse(raw);f(d);return JSON.stringify(d);};
 for(const value of ['not json','null','{}',' '.repeat(BACKUP_LIMIT+1),mutate(d=>d.app='other'),mutate(d=>d.backupVersion=100),mutate(d=>d.selectedParty=['bapak','bapak']),mutate(d=>d.journey.version=99),mutate(d=>d.journey.resources.fuel=-1),mutate(d=>d.journey.itinerary.stopIds=['missing']),mutate(d=>d.journey.status='unknown'),mutate(d=>d.journey.customLocations[0].source='javascript:alert(1)')])assert.throws(()=>inspectBackup(value,origin));
});
test('restore persistence commits both keys and rolls back party if journey storage is full',()=>{
 const backup=inspectBackup(createBackup(planned(),pair),origin),oldJourney=encodeJourney(base()),oldParty=JSON.stringify({version:1,ids:['anak','ibu']});
 const s=storage({[JOURNEY_KEY]:oldJourney,[PARTY_STORAGE_KEY]:oldParty});persistBackup(s,backup);assert.equal(JSON.parse(s.getItem(JOURNEY_KEY)).version,6);assert.deepEqual(JSON.parse(s.getItem(PARTY_STORAGE_KEY)).ids,pair);
 const blocked=storage({[JOURNEY_KEY]:oldJourney,[PARTY_STORAGE_KEY]:oldParty},k=>k===JOURNEY_KEY);assert.throws(()=>persistBackup(blocked,backup),/Progres lama dipertahankan/);assert.equal(blocked.getItem(JOURNEY_KEY),oldJourney);assert.equal(blocked.getItem(PARTY_STORAGE_KEY),oldParty);
 const empty=storage({[JOURNEY_KEY]:oldJourney},k=>k===JOURNEY_KEY);assert.throws(()=>persistBackup(empty,backup));assert.equal(empty.getItem(PARTY_STORAGE_KEY),null);
});
