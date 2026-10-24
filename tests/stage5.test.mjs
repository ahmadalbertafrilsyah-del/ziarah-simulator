import test from 'node:test';import assert from 'node:assert/strict';
import {initialResources,serviceResources,blockedReason} from '../lib/travel-resources.mjs';
import {advanceMaintenance,validMaintenance} from '../lib/vehicle-maintenance.mjs';
import {stepExpedition} from '../lib/expedition.mjs';
import {createRoad,newDriver} from '../lib/route-drive.mjs';
import {validateJourneyRoute} from '../lib/journey.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
const party=['bapak','ibu'];
const broken=type=>({...initialResources(),condition:{tyre:type==='tyre'?0:100,spark:type==='spark'?0:100},breakdown:{type,atMeters:4500},totalMeters:4500});
test('failures are driven by distance, not idle calls or refresh',()=>{
 const r=initialResources();assert.deepEqual(advanceMaintenance(r,0),r);assert.equal(advanceMaintenance({...r,totalMeters:r.nextFailureM-1},1).breakdown,null);
 const failed=advanceMaintenance({...r,totalMeters:r.nextFailureM},1);assert.ok(failed.breakdown);assert.equal(failed.condition[failed.breakdown.type],0);
 assert.deepEqual(advanceMaintenance(failed,100),failed);
 const s={...initialJourney(SEED_LOCATIONS[0]),resources:failed};assert.deepEqual(decodeJourney(encodeJourney(s)).resources.breakdown,failed.breakdown);
 const pending={...initialJourney(SEED_LOCATIONS[0]),resources:r};assert.equal(decodeJourney(encodeJourney(pending)).resources.nextFailureM,r.nextFailureM);
});
test('self repair consumes one replacement and keeps durable tools; repeat cannot duplicate',()=>{
 for(const type of ['tyre','spark']){
 const before=broken(type),fixed=serviceResources(before,'repair',party).resources;
 assert.equal(fixed.breakdown,null);assert.equal(fixed.inventory[type],0);assert.equal(fixed.inventory.wrench,1);assert.equal(fixed.inventory.pump,1);assert.equal(fixed.condition[type],100);assert.ok(fixed.nextFailureM>=fixed.totalMeters+4000);assert.equal(fixed.repairLog.length,1);
 assert.deepEqual(serviceResources(fixed,'repair',party).resources,fixed);
 }
});
test('missing stock or tools prevents repair; paid and free help avoid dead ends',()=>{
 const r=broken('tyre');r.inventory={...r.inventory,tyre:0};assert.ok(serviceResources(r,'repair',party).resources.breakdown);
 const paid=serviceResources(r,'repair-help',party).resources;assert.equal(paid.money,r.money-25000);assert.equal(paid.breakdown,null);assert.equal(paid.inventory.tyre,0);
 const poor={...r,money:0};const emergency=serviceResources(poor,'repair-help',party).resources;assert.equal(emergency.money,0);assert.equal(emergency.clock,poor.clock+90);assert.equal(emergency.breakdown,null);
 const noWrench=broken('spark');noWrench.inventory={...noWrench.inventory,wrench:0};assert.ok(serviceResources(noWrench,'repair',party).resources.breakdown);
});
test('purchases respect caps and funds; other services do not clear a breakdown',()=>{
 const r=broken('spark');assert.equal(serviceResources(r,'buy-spark',party).resources.inventory.spark,2);
 assert.equal(serviceResources({...r,money:0},'buy-spark',party).resources.inventory.spark,1);
 assert.deepEqual(serviceResources(r,'buy-wrench',party).resources,r);
 assert.ok(serviceResources(r,'rest',party).resources.breakdown);assert.ok(serviceResources(r,'fuel',party).resources.breakdown);
 assert.equal(validMaintenance({...r,inventory:{...r.inventory,tyre:-1}}),false);
});
test('broken vehicle cannot move; version 2 migration keeps stage 4 supplies',()=>{
 const road=createRoad(validateJourneyRoute({coordinates:[[112,-7],[112,-6.99]],durationSec:100}));const r=broken('tyre');const s={...newDriver(road),resources:r,speed:12};
 const n=stepExpedition(road,s,{gas:true},.05,party);assert.equal(n.x,s.x);assert.equal(n.z,s.z);assert.equal(n.speed,0);assert.ok(blockedReason(r,party).includes('Ban bocor'));
 const old=JSON.parse(encodeJourney({...initialJourney(SEED_LOCATIONS[0]),resources:{...initialResources(),fuel:1.2,totalMeters:18000,money:12345}}));old.version=2;for(const k of ['condition','inventory','breakdown','rng','nextFailureM','repairLog'])delete old.resources[k];
 const restored=decodeJourney(JSON.stringify(old));assert.equal(restored.resources.fuel,1.2);assert.equal(restored.resources.money,12345);assert.ok(restored.resources.nextFailureM>=22000);assert.equal(restored.resources.breakdown,null);
});
