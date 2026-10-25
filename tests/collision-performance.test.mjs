import test from 'node:test';
import assert from 'node:assert/strict';
import {boxesOverlap,resolveMovement} from '../lib/ride-collision.mjs';
import {createRouteSimulation,routeObstacles} from '../lib/route-collision.mjs';
import {routeLots,routeScenery,stepRouteTraffic,initialRouteTraffic,routeTrafficPose} from '../lib/route-3d-layout.mjs';
import {newDriver} from '../lib/route-drive.mjs';
import {initialResources,METERS_PER_LITER} from '../lib/travel-resources.mjs';
import {createPerformanceMeter,performanceReport} from '../lib/ride-performance.mjs';
import {stepCityPlayer,CITY_BUILDINGS} from '../lib/city-traffic.mjs';
const road={points:[{x:0,z:0},{x:0,z:1000}],cumulative:[0,1000],distanceM:1000},party=['bapak','ibu'];
test('swept oriented collision stops before thin walls at speed and allows reversing away',()=>{
 const previous={x:0,z:0,heading:0,speed:16,width:.85,length:2.1},wall={id:'wall',x:0,z:5,width:8,length:.12,heading:0};
 const hit=resolveMovement(previous,{...previous,z:15},[wall]);assert.ok(hit.hit);assert.equal(hit.value.speed,0);assert.ok(hit.value.z<4);assert.ok(!boxesOverlap(hit.value,wall));
 const back=resolveMovement(hit.value,{...hit.value,z:hit.value.z-1,speed:-2},[wall]);assert.equal(back.hit,null);assert.ok(back.value.z<hit.value.z);
});
test('rotation against a building is blocked and old embedded positions can escape',()=>{
 const obstacle={id:'box',x:2.8,z:0,width:.8,length:2.8,heading:Math.PI/4},p={x:0,z:0,heading:0,speed:4};
 const result=resolveMovement(p,{...p,x:4,z:.5,heading:Math.PI/2},[obstacle]);assert.ok(result.hit);assert.ok(!boxesOverlap(result.value,obstacle));
 const embedded={x:2.8,z:0,heading:0,speed:0};assert.equal(resolveMovement(embedded,{...embedded,x:2.4,speed:-1},[obstacle]).hit,null);
});
test('route scenery and collision footprints stay identical across chunk and quality requests',()=>{
 const a=routeScenery(road,501,260),b=routeScenery(road,519,260);assert.equal(a,b);
 const walls=routeObstacles(road,501);for(const lot of a.lots.filter(l=>l.progress<600&&l.progress>=400)){const wall=walls.find(w=>w.id===lot.id);assert.ok(wall);assert.equal(wall.x,lot.x);assert.equal(wall.z,lot.z);assert.equal(wall.heading,lot.heading);}
 assert.equal(routeObstacles(road,502),walls);
});
test('route impacts stop the Vespa, charge only actual travel and permit recovery',()=>{
 const building=routeLots(road,0)[0],initial={...newDriver(road,building.progress),x:building.x,z:building.z-8,heading:0,speed:12,resources:initialResources()},sim=createRouteSimulation(road,initial);
 let state=initial;for(let i=0;i<120;i++)state=sim.advance(state,{gas:true},1/60,party);
 assert.match(state.collision,/penghalang/);assert.equal(state.speed,0);assert.ok(!sim.obstacles(state).some(o=>boxesOverlap(state,o)));
 const meters=state.resources.totalMeters;assert.ok(meters>0&&meters<5);assert.ok(Math.abs(state.resources.fuel-(initial.resources.fuel-meters/METERS_PER_LITER))<1e-8);
 const fuel=state.resources.fuel;for(let i=0;i<60;i++)state=sim.advance(state,{gas:true},1/60,party);assert.ok(Math.abs(state.resources.fuel-fuel)<1e-8);
 const impact=state.z;for(let i=0;i<60;i++)state=sim.advance(state,{reverse:true},1/60,party);assert.ok(state.z<impact);
 const recovered=sim.recover(state);assert.ok(!sim.obstacles(recovered).some(o=>boxesOverlap(recovered,o)));assert.equal(recovered.resources,state.resources);
});
test('moving route traffic cannot pass through a stationary player or another vehicle',()=>{
 const player={x:1.9,z:90,progress:90,heading:0,speed:0};let traffic=initialRouteTraffic(road,90);
 for(let i=0;i<900;i++){traffic=stepRouteTraffic(road,traffic,player,1/60);const poses=traffic.map(v=>({...routeTrafficPose(road,v),width:v.type==='car'?1.85:.75,length:v.type==='car'?4.2:2.1}));for(const p of poses)assert.ok(!boxesOverlap(p,player));for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)assert.ok(!boxesOverlap(poses[a],poses[b]));}
});
test('route head-on contact remains visible physics and zero-dt pause is immutable',()=>{
 const initial={...newDriver(road),x:1.9,speed:16.67,resources:initialResources()},sim=createRouteSimulation(road,initial);let state=initial;
 for(let i=0;i<180;i++)state=sim.advance(state,{gas:true},1/60,party);
 assert.match(state.collision,/kendaraan/);assert.equal(state.speed,0);assert.ok(sim.vehicles.every(v=>!boxesOverlap(state,v)));
 const snapshot=structuredClone(sim.vehicles),time=sim.time;assert.equal(sim.advance(state,{},0,party),state);assert.deepEqual(sim.vehicles,snapshot);assert.equal(sim.time,time);
});
test('route boundary blocks outward travel while reverse remains available',()=>{
 const initial={...newDriver(road,400),x:60,heading:Math.PI/2,speed:4,offRoad:true,resources:initialResources()},sim=createRouteSimulation(road,initial);
 const stopped=sim.advance(initial,{gas:true},.1,party);assert.equal(stopped.x,60);assert.equal(stopped.speed,0);assert.match(stopped.collision,/Batas area/);assert.equal(stopped.resources.fuel,initial.resources.fuel);
 const reversed=sim.advance(stopped,{reverse:true},.1,party);assert.ok(reversed.x<60);
});
test('city buildings block entry while positions embedded by older code can move outward',()=>{
 const b=CITY_BUILDINGS[0],player={x:b.x,z:b.z,heading:0,speed:0};const next=stepCityPlayer(player,{gas:true},[],1/60);assert.ok(next.player.z>b.z);
 const boundary=stepCityPlayer({x:114,z:0,heading:Math.PI/2,speed:12},{gas:true},[],.1);assert.equal(boundary.player.speed,0);assert.ok(boundary.player.x<115);
});
test('performance meter is bounded, reports render and frame timing, and excludes pauses',()=>{
 const meter=createPerformanceMeter(4);for(let i=0;i<10;i++)meter.record(i*50,2);const before=meter.snapshot();assert.equal(before.samples,4);assert.equal(before.totalFrames,10);assert.equal(before.fps,20);assert.equal(before.renderP95Ms,2);
 meter.record(90000,50,false);meter.record(100000,3,true);assert.equal(meter.snapshot().fps,20);meter.reset();assert.equal(meter.snapshot().fps,null);assert.equal(meter.snapshot().totalFrames,0);
 const report=performanceReport('perjalanan','low',before);assert.equal(report.schema,1);assert.ok(!Object.hasOwn(report,'coordinates'));assert.deepEqual(report.metrics,before);
});
