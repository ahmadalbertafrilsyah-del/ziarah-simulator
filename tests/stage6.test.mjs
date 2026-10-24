import test from 'node:test';import assert from 'node:assert/strict';
import {getFacilities,nearbyFacility,serviceAccess} from '../lib/route-facilities.mjs';
import {createRoad,newDriver} from '../lib/route-drive.mjs';import {validateJourneyRoute} from '../lib/journey.mjs';
import {initialResources,serviceResources} from '../lib/travel-resources.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';import {SEED_LOCATIONS} from '../lib/locations.mjs';
const route=validateJourneyRoute({coordinates:[[112,-7],[112,-6.95]],durationSec:600}),road=createRoad(route),facilities=getFacilities(road),party=['bapak','ibu'];
const near=(f,speed=0)=>({route,status:'paused',driver:{...newDriver(road,f.progress),x:f.access.x,z:f.access.z,speed}});
test('facilities are stable, have all service types, and require actual proximity and low speed',()=>{
 assert.deepEqual(getFacilities(createRoad(route)),facilities);assert.ok(['spbu','bengkel','hotel','masjid'].every(t=>facilities.some(f=>f.type===t)));
 const f=facilities[0],s=near(f);assert.equal(nearbyFacility(road,s.driver).id,f.id);
 assert.equal(nearbyFacility(road,{...s.driver,x:s.driver.x+1000}),null);
 assert.equal(serviceAccess({...s,status:'moving'},'fuel').allowed,false);assert.equal(serviceAccess(near(f,3),'fuel').allowed,false);
});
test('only the right facility permits fuel, shopping and resting',()=>{
 const spbu=near(facilities.find(f=>f.type==='spbu')),shop=near(facilities.find(f=>f.type==='bengkel')),hotel=near(facilities.find(f=>f.type==='hotel')),mosque=near(facilities.find(f=>f.type==='masjid'));
 assert.equal(serviceAccess(spbu,'fuel').allowed,true);assert.equal(serviceAccess(spbu,'buy-tyre').allowed,false);
 assert.equal(serviceAccess(shop,'buy-tyre').allowed,true);assert.equal(serviceAccess(shop,'fuel').allowed,false);
 assert.equal(serviceAccess(hotel,'rest').action,'rest-hotel');assert.equal(serviceAccess(mosque,'rest').action,'rest');
 const far={...spbu,driver:{...spbu.driver,x:1000}};
 for(const action of ['fuel','rest','buy-tyre'])assert.equal(serviceAccess(far,action).allowed,false);
 for(const action of ['repair','repair-help','help','rest-help'])assert.equal(serviceAccess(far,action).allowed,true);
 assert.equal(serviceAccess({status:'ready'},'fuel').allowed,true);assert.equal(serviceAccess({status:'arrived'},'rest').allowed,true);
});
test('hotel stays deduct cost and advance time; emergency support prevents stranding',()=>{
 const r=initialResources(),hotel=serviceResources(r,'rest-hotel',party).resources;assert.equal(hotel.money,r.money-40000);assert.equal(hotel.clock,r.clock+360);
 assert.deepEqual(serviceResources({...r,money:0},'rest-hotel',party).resources,{...r,money:0});
 const empty={...r,fuel:0};const delivery=serviceResources(empty,'help',party).resources;assert.equal(delivery.fuel,1);assert.equal(delivery.money,r.money-15000);
 const poor=serviceResources({...empty,money:0},'help',party).resources;assert.equal(poor.fuel,.5);assert.equal(poor.money,0);
 const tired={...r,energy:{...r.energy,bapak:0}};assert.equal(serviceResources(tired,'rest-help',party).resources.energy.bapak,20);
 assert.equal(serviceResources(r,'rest-help',party).resources,r);
});
test('version 3 migrates mechanical state and version 4 retains service history',()=>{
 const s=initialJourney(SEED_LOCATIONS[0]);const original={...s,resources:{...s.resources,breakdown:{type:'spark',atMeters:4500},totalMeters:4500,inventory:{...s.resources.inventory,spark:0}}};
 const old=JSON.parse(encodeJourney(original));old.version=3;delete old.resources.serviceLog;
 const migrated=decodeJourney(JSON.stringify(old));assert.equal(migrated.resources.breakdown.type,'spark');assert.equal(migrated.resources.inventory.spark,0);assert.deepEqual(migrated.resources.serviceLog,[]);
 const history={...s,resources:{...s.resources,serviceLog:[{facilityId:'service-0-spbu',name:'SPBU simulasi 01',action:'fuel',clock:545}]}};
 assert.deepEqual(decodeJourney(encodeJourney(history)).resources.serviceLog,history.resources.serviceLog);
});
