import test from 'node:test';import assert from 'node:assert/strict';
import {validateCustomLocation,normalizeCustoms,safeSource,saveCustom,deleteCustom,confirmVisit,canRecordVisit,arrivalEntry} from '../lib/ziarah-journal.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
import {validateJourneyRoute} from '../lib/journey.mjs';import {createRoad,newDriver} from '../lib/route-drive.mjs';
const start=SEED_LOCATIONS.find(p=>p.id==='sunan-ampel'),far=SEED_LOCATIONS.find(p=>p.id==='sunan-giri'),pair=['bapak','ibu'];
const custom=validateCustomLocation({id:'custom-abcdefgh',name:'Maqbarah pribadi',coordinates:start.coordinates,history:'Isian pengguna',source:'https://example.com/'});
const base=()=>initialJourney(start),at='2026-10-24T12:00:00.000Z';
test('custom locations require name, Indonesia coordinates and safe source; duplicates rejected',()=>{
 for(const p of [{...custom,name:''},{...custom,coordinates:[0,0]},{...custom,coordinates:[NaN,-7]},{...custom,source:'javascript:alert(1)'},{...custom,id:'sunan-giri'}])assert.throws(()=>validateCustomLocation(p));
 assert.throws(()=>normalizeCustoms([custom,custom]));assert.equal(safeSource(''), '');assert.throws(()=>safeSource('data:text/html,test'));
 assert.equal(saveCustom(base(),custom).customLocations.length,1);
});
test('visits require proximity and two characters; confirmation is distinct and does not duplicate',()=>{
 const s=base();assert.equal(canRecordVisit(s,far),false);assert.throws(()=>confirmVisit(s,far,pair,at,'bad'));assert.throws(()=>confirmVisit(s,start,[],at,'bad'));assert.throws(()=>confirmVisit({...s,status:'moving'},start,pair,at,'bad'));
 const arrived={...s,visits:[arrivalEntry(start,pair,s.resources.clock,at,'arrival')]};assert.equal(arrived.completedSeedIds.length,0);
 const confirmed=confirmVisit(arrived,start,pair,at,'unused');assert.equal(confirmed.visits.length,1);assert.equal(confirmed.visits[0].id,'arrival');assert.equal(confirmed.visits[0].confirmed,true);assert.deepEqual(confirmed.completedSeedIds,[start.id]);assert.throws(()=>confirmVisit(confirmed,start,pair,at,'duplicate'));
});
test('custom visits stay outside nine-wali progress; historical snapshot and note survive deletion and reload',()=>{
 let s=saveCustom(base(),custom);s=confirmVisit(s,custom,pair,at,'custom-visit');s.visits[0].note='Kenangan';s.profileNotes[custom.id]='Pribadi';assert.deepEqual(s.completedSeedIds,[]);
 s=saveCustom(s,{...custom,name:'Nama baru'});assert.equal(s.visits[0].snapshot.name,'Maqbarah pribadi');
 s=decodeJourney(encodeJourney(deleteCustom(s,custom.id)),start);assert.equal(s.customLocations.length,0);assert.equal(s.profileNotes[custom.id],undefined);assert.equal(s.visits[0].snapshot.name,'Maqbarah pribadi');assert.equal(s.visits[0].note,'Kenangan');
});
test('active routes and current endpoints protect edits and deletion',()=>{
 const s=saveCustom(base(),custom);
 for(const status of ['moving','paused']){assert.throws(()=>saveCustom({...s,status},custom));assert.throws(()=>deleteCustom({...s,status},custom.id));}
 for(const endpoint of [{origin:custom},{destination:custom}]){assert.throws(()=>deleteCustom({...s,...endpoint},custom.id));assert.throws(()=>saveCustom({...s,...endpoint},custom));}
});
test('schema five restores custom origin/destination, route, notes, progress and paused pose',()=>{
 const other=validateCustomLocation({...custom,id:'custom-ijklmnop',coordinates:[start.coordinates[0],start.coordinates[1]+.003]});let s=saveCustom(saveCustom(base(),custom),other);
 const route=validateJourneyRoute({coordinates:[custom.coordinates,other.coordinates],durationSec:30});const driver=newDriver(createRoad(route));s={...s,origin:custom,destination:other,route,driver,party:pair,status:'moving',profileNotes:{[custom.id]:'Catatan'},completedSeedIds:[start.id]};
 const restored=decodeJourney(encodeJourney(s),start);assert.equal(restored.status,'paused');assert.equal(restored.origin.id,custom.id);assert.equal(restored.destination.id,other.id);assert.equal(restored.profileNotes[custom.id],'Catatan');assert.deepEqual(restored.completedSeedIds,[start.id]);
});
test('schema four legacy arrivals remain unconfirmed; official progress outlives journal limit',()=>{
 const old=JSON.parse(encodeJourney(base()));old.version=4;delete old.customLocations;delete old.profileNotes;delete old.completedSeedIds;old.visits=[{locationId:start.id,arrivedAt:at}];const restored=decodeJourney(JSON.stringify(old),start);assert.equal(restored.visits[0].confirmed,false);assert.equal(restored.visits[0].gameClock,null);assert.deepEqual(restored.completedSeedIds,[]);
 assert.deepEqual(decodeJourney(encodeJourney({...base(),completedSeedIds:[start.id],visits:[]})).completedSeedIds,[start.id]);
});
