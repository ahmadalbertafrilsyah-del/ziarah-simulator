import test from 'node:test';
import assert from 'node:assert/strict';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {parkForVisit,canParkVisit,isParkedForVisit,recordParkedVisit,hasRecordedVisit,canContinueFromStop,visitMilestones,journeySummaryText} from '../lib/visit-flow.mjs';
import {arrivalEntry} from '../lib/ziarah-journal.mjs';
import {createBackup,inspectBackup} from '../lib/game-backup.mjs';
const start=SEED_LOCATIONS[0],pair=['bapak','ibu'],at='2026-10-25T10:00:00Z';
const base=()=>({...initialJourney(start),party:pair});
test('park requires a valid pair, stopped state and proximity; record requires matching parking',()=>{
 const s=base();assert.equal(canParkVisit(s,start),true);assert.throws(()=>recordParkedVisit(s,start,pair,at,'x'),/Parkir/);
 assert.throws(()=>parkForVisit(s,start,[],at));assert.throws(()=>parkForVisit({...s,status:'moving'},start,pair,at));assert.throws(()=>parkForVisit({...s,driver:{speed:2}},start,pair,at));assert.throws(()=>parkForVisit(s,SEED_LOCATIONS.find(p=>p.id!==start.id),pair,at));
 const parked=parkForVisit(s,start,pair,at);assert.ok(isParkedForVisit(parked,start,pair));assert.equal(isParkedForVisit(parked,start,['ibu','bapak']),false);
 const recorded=recordParkedVisit(parked,start,pair,at,'visit');assert.equal(recorded.visits.length,1);assert.ok(recorded.visits[0].confirmed);assert.equal(visitMilestones(recorded).count,1);assert.throws(()=>recordParkedVisit(recorded,start,pair,at,'duplicate'));
});
test('arrival is not a confirmed visit; park and confirm reuses its journal entry',()=>{
 let s={...base(),status:'arrived',destination:start,visits:[arrivalEntry(start,pair,540,at,'arrival')]};assert.equal(visitMilestones(s).count,0);assert.equal(canContinueFromStop(s),false);
 s=recordParkedVisit(parkForVisit(s,start,pair,at),start,pair,at,'unused');assert.equal(s.visits.length,1);assert.equal(s.visits[0].id,'arrival');assert.equal(canContinueFromStop(s),true);
});
test('confirming after a day change still completes the current stop',()=>{
 let s={...base(),status:'arrived',destination:start,visits:[arrivalEntry(start,pair,1439,at,'arrival')]};s.resources={...s.resources,clock:1500};s=recordParkedVisit(parkForVisit(s,start,pair,at),start,pair,at,'unused');assert.equal(hasRecordedVisit(s,start,pair),true);assert.equal(canContinueFromStop(s),true);
});
test('schema seven persists parking and older schemas retain confirmed progress without parking',()=>{
 const parked=parkForVisit(base(),start,pair,at),restored=decodeJourney(encodeJourney(parked),start);assert.equal(JSON.parse(encodeJourney(parked)).version,7);assert.deepEqual(restored.parking,parked.parking);assert.equal(decodeJourney(encodeJourney({...parked,status:'moving'}),start).parking,null);
 const old=JSON.parse(encodeJourney(recordParkedVisit(parked,start,pair,at,'old')));old.version=6;delete old.parking;const migrated=decodeJourney(JSON.stringify(old),start);assert.equal(migrated.parking,null);assert.equal(visitMilestones(migrated).count,1);assert.ok(migrated.visits[0].confirmed);
 for(const value of [{locationId:'missing',party:pair,parkedAt:at,gameClock:540},{locationId:start.id,party:['bad','bad'],parkedAt:at,gameClock:540}]){const data=JSON.parse(encodeJourney(parked));data.parking=value;assert.equal(decodeJourney(JSON.stringify(data),start).parking,null);}
});
test('nine unique official locations finish the goal; arrival, duplicates and custom IDs do not',()=>{
 let s=base();s.completedSeedIds=SEED_LOCATIONS.slice(0,8).map(p=>p.id);s.visits=[arrivalEntry(SEED_LOCATIONS[8],pair,540,at,'last')];assert.equal(visitMilestones(s).complete,false);
 s={...s,status:'arrived',destination:SEED_LOCATIONS[8],origin:SEED_LOCATIONS[8]};s=recordParkedVisit(parkForVisit(s,s.destination,pair,at),s.destination,pair,at,'unused');assert.equal(visitMilestones(s).count,9);assert.equal(visitMilestones(s).complete,true);
 s.completedSeedIds.push('custom-example',SEED_LOCATIONS[0].id);assert.equal(visitMilestones(s).count,9);assert.ok(journeySummaryText(s).includes('Sembilan maqbarah telah dicatat'));assert.ok(journeySummaryText(s).includes('Rincian kunjungan tidak tersedia'));
 const restored=inspectBackup(createBackup(s,pair),start).session;assert.equal(visitMilestones(restored).complete,true);assert.ok(restored.parking);
});
test('legacy confirmation is recognized without forcing parking again and incomplete reports stay incomplete',()=>{
 const s={...base(),status:'arrived',destination:start,visits:[{...arrivalEntry(start,pair,540,at,'legacy'),confirmed:true}]};assert.equal(canContinueFromStop(s),true);assert.equal(s.parking,null);assert.equal(visitMilestones(s).count,1);
 const text=journeySummaryText(base());assert.ok(text.includes('Perjalanan masih berlangsung'));assert.ok(text.includes('bukan file cadangan'));assert.equal(visitMilestones({...base(),completedSeedIds:['unknown','unknown']}).count,0);
});
