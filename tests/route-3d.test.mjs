import test from 'node:test';
import assert from 'node:assert/strict';
import {roadFrame,roadSamples,routeLots,initialRouteTraffic,stepRouteTraffic,routeTrafficPose} from '../lib/route-3d-layout.mjs';
const road={points:[{x:0,z:0},{x:0,z:200},{x:180,z:200},{x:180,z:550}],cumulative:[0,200,380,730],distanceM:730};
test('3D road sampling retains exact geographic bend vertices and clamps to endpoints',()=>{
 const samples=roadSamples(road,-100,900);assert.equal(samples[0].progress,0);assert.equal(samples.at(-1).progress,730);
 for(const [i,d] of road.cumulative.entries()){const p=samples.find(p=>p.progress===d);assert.ok(p);assert.equal(p.x,road.points[i].x);assert.equal(p.z,road.points[i].z);}
 assert.ok(samples.every((p,i)=>i===0||p.progress>=samples[i-1].progress));
});
test('3D route lane poses use left-side traffic on both straight and eastbound sections',()=>{
 assert.ok(roadFrame(road,50,-1.9).x<0);assert.ok(roadFrame(road,250,-1.9).z>200);
 const forward=routeTrafficPose(road,{progress:50,dir:1}),opposite=routeTrafficPose(road,{progress:50,dir:-1});
 assert.equal(forward.x,-1.9);assert.equal(opposite.x,1.9);assert.ok(Math.abs(opposite.heading-Math.PI)<1e-8);
});
test('streamed 3D lots are deterministic, on both sides, clear of the road corridor',()=>{
 const lots=routeLots(road,250);assert.deepEqual(lots,routeLots(road,250));assert.ok(lots.length>5);
 for(const lot of lots){let min=Infinity;for(let i=0;i<road.distanceM;i+=2){const p=roadFrame(road,i);min=Math.min(min,Math.hypot(p.x-lot.x,p.z-lot.z));}assert.ok(min>=11.9);assert.ok(lot.height>0);}
});
test('route traffic respects pause, bounds and preserves the expedition state',()=>{
 const player={x:0,z:0,progress:0,resources:{fuel:4,clock:660}},snapshot=structuredClone(player),vehicles=initialRouteTraffic(road,0);
 assert.deepEqual(stepRouteTraffic(road,vehicles,player,0),vehicles);
 let current=vehicles;for(let i=0;i<3600;i++)current=stepRouteTraffic(road,current,player,1/60);
 assert.ok(current.every(v=>v.progress>=0&&v.progress<=road.distanceM));assert.deepEqual(player,snapshot);
 assert.ok(current.some(v=>v.progress!==vehicles.find(a=>a.id===v.id).progress));
});
