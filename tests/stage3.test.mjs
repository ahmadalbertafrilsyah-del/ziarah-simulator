import test from 'node:test';
import assert from 'node:assert/strict';
import {validateJourneyRoute} from '../lib/journey.mjs';
import {createRoad,newDriver,stepDriver,roadPose} from '../lib/route-drive.mjs';
import {encodeJourney,decodeJourney,initialJourney} from '../lib/journey-save.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
import {routeFaces} from '../lib/route-world.mjs';
const route=validateJourneyRoute({coordinates:[[112.7422732,-7.2299754],[112.7422732,-7.2290754]],durationSec:30});
const road=createRoad(route);
test('manual physics: no input no movement; gas, steering, brake and reverse respond',()=>{
 let s=newDriver(road);assert.deepEqual(stepDriver(road,s,{},.05),s);
 for(let i=0;i<50;i++)s=stepDriver(road,s,{gas:true},.02);
 assert.ok(s.progress>0);assert.ok(s.speed>0);const h=s.heading;
 s=stepDriver(road,s,{gas:true,right:true},.05);assert.ok(s.heading>h);
 const speed=s.speed;s=stepDriver(road,s,{brake:true},.05);assert.ok(s.speed<speed);
 let r=newDriver(road,50);for(let i=0;i<30;i++)r=stepDriver(road,r,{reverse:true},.02);
 assert.ok(r.progress<50);assert.ok(r.speed<0);
});
test('arrival occurs near road endpoint, off-road is detected',()=>{
 let s={...newDriver(road,road.distanceM-10),speed:1};s=stepDriver(road,s,{},.02);
 assert.equal(s.arrived,true);assert.equal(s.progress,road.distanceM);assert.equal(s.speed,0);
 const off={...newDriver(road,30),x:20};assert.equal(stepDriver(road,off,{},.05).offRoad,true);
});
test('save/restore retains route, pose, selected pair and pauses active movement',()=>{
 const original={...initialJourney(SEED_LOCATIONS[0]),destination:SEED_LOCATIONS[1],route,driver:{...newDriver(road,30),speed:8},party:['bapak','ibu'],status:'moving'};
 const saved=decodeJourney(encodeJourney(original),SEED_LOCATIONS[0]);
 assert.equal(saved.status,'paused');assert.equal(saved.driver.speed,0);assert.equal(saved.driver.progress,30);
 assert.deepEqual(saved.party,['bapak','ibu']);assert.deepEqual(saved.route.coordinates,route.coordinates);
 const raw=JSON.parse(encodeJourney(original));raw.driver.x=Infinity;assert.throws(()=>decodeJourney(JSON.stringify(raw),SEED_LOCATIONS[0]));
 assert.throws(()=>decodeJourney('{invalid}',SEED_LOCATIONS[0]));
});
test('route world constructs separated ground, shoulder and road layers',()=>{
 const faces=routeFaces(road,roadPose(road,20));assert.ok(faces.some(f=>f.layer===0));assert.ok(faces.some(f=>f.layer===2));
 assert.ok(faces.every(f=>f.points.every(p=>p.every(Number.isFinite))));
});

test('roadside scenery is deterministic and stays outside the road corridor',async()=>{
 const {roadsideBuildings,buildingFaces}=await import('../lib/route-world.mjs');
 const items=roadsideBuildings(road,newDriver(road));
 assert.ok(items.some(b=>b.x<0));assert.ok(items.some(b=>b.x>0));
 assert.deepEqual(items,roadsideBuildings(road,newDriver(road)));
 assert.ok(items.every(b=>Math.abs(b.x)>=17));
 assert.ok(buildingFaces(items).every(f=>f.points.every(p=>p.every(Number.isFinite))));
});
