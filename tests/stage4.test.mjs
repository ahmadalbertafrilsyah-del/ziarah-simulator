import test from 'node:test';import assert from 'node:assert/strict';
import {initialResources,advanceResources,serviceResources,blockedReason,validResources,clockLabel,isTravelNight} from '../lib/travel-resources.mjs';
import {stepExpedition} from '../lib/expedition.mjs';
import {createRoad,newDriver} from '../lib/route-drive.mjs';
import {validateJourneyRoute} from '../lib/journey.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
const pair=['bapak','ibu'];const road=createRoad(validateJourneyRoute({coordinates:[[112,-7],[112,-6.99]],durationSec:100}));
test('fuel and energy follow actual traveled distance; time has stable sixfold progression',()=>{
 const r=initialResources(),n=advanceResources(r,35000,60,pair);
 assert.equal(n.fuel,3);assert.equal(n.clock,546);assert.ok(n.energy.bapak<n.energy.ibu);assert.equal(n.energy.anak,100);
 let many=r;for(let i=0;i<60;i++)many=advanceResources(many,35000/60,1,pair);
 assert.ok(Math.abs(many.fuel-n.fuel)<1e-9);assert.ok(Math.abs(many.energy.bapak-n.energy.bapak)<1e-9);
});
test('fuel and energy exhaustion stop vehicle without negative resources',()=>{
 let s={...newDriver(road),resources:{...initialResources(),fuel:0},speed:10};const blocked=stepExpedition(road,s,{gas:true},.05,pair);assert.equal(blocked.x,s.x);assert.equal(blocked.z,s.z);assert.equal(blocked.speed,0);
 s={...newDriver(road),resources:{...initialResources(),fuel:.000001},speed:16};const n=stepExpedition(road,s,{gas:true},.1,pair);assert.ok(Math.hypot(n.x-s.x,n.z-s.z)<=.03500001);assert.equal(n.resources.fuel,0);assert.equal(n.arrived,false);
 const tired={...initialResources(),energy:{...initialResources().energy,bapak:0}};assert.ok(blockedReason(tired,pair));
});
test('services cap fuel, deduct only actual quantity, preserve position-independent supplies',()=>{
 const r={...initialResources(),fuel:5.3};const f=serviceResources(r,'fuel',pair).resources;assert.equal(f.fuel,5.5);assert.equal(f.money,448000);
 assert.equal(serviceResources({...r,money:0},'fuel',pair).resources.fuel,r.fuel);
 const e={...r,energy:{...r.energy,bapak:90,ibu:10}};const rest=serviceResources(e,'rest',pair).resources;assert.equal(rest.energy.bapak,100);assert.equal(rest.energy.ibu,45);assert.equal(rest.clock,e.clock+120);assert.equal(rest.fuel,e.fuel);
 const help=serviceResources({...r,fuel:0,money:0},'help',pair).resources;assert.equal(help.fuel,.5);assert.equal(help.money,0);
 assert.equal(serviceResources({...r,fuel:1,money:0},'help',pair).resources.fuel,1);
});
test('version 2 persists supplies and version 1 migrates while preserving trip',()=>{
 const s={...initialJourney(SEED_LOCATIONS[0]),resources:{...initialResources(),fuel:2,clock:1500,money:200000}};
 const back=decodeJourney(encodeJourney(s));assert.deepEqual(back.resources,s.resources);
 const v1=JSON.parse(encodeJourney(s));v1.version=1;delete v1.resources;assert.deepEqual(decodeJourney(JSON.stringify(v1)).resources,initialResources());
 const bad=JSON.parse(encodeJourney(s));bad.resources.energy.ibu=-1;assert.throws(()=>decodeJourney(JSON.stringify(bad)));
 assert.equal(validResources({...s.resources,fuel:Infinity}),false);
});
test('game clock rolls forward across midnight and night boundaries are explicit',()=>{
 assert.equal(clockLabel(1500),'Hari 2 · 01:00');assert.equal(isTravelNight(1080),true);assert.equal(isTravelNight(360),false);
});
