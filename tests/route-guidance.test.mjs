import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {normalizeRoute} from '../lib/geo.mjs';
import {createRoad,roadPose} from '../lib/route-drive.mjs';
import {roadSamples,roadFrame} from '../lib/route-3d-layout.mjs';
import {routeGuidance,roadStripVertices,GUIDE_LANE} from '../lib/route-guidance.mjs';
import {minimapGeometry} from '../lib/ride-navigation.mjs';
import {createRouteEnvironment} from '../lib/route-3d-environment.mjs';
const road={points:[{x:0,z:0},{x:0,z:41},{x:37,z:41},{x:37,z:90},{x:4,z:90}],cumulative:[0,41,78,127,160],distanceM:160};
test('road ribbon retains bends between regular samples rather than cutting across them',()=>{
 const samples=roadSamples(road,0,160,7),vertices=roadStripVertices(samples,0,0);
 for(const p of road.points)assert.ok(vertices.some((x,i)=>i%3===0&&Math.abs(x-p.x)<1e-6&&Math.abs(vertices[i+2]-p.z)<1e-6));
});
test('green arrows point towards destination on north, east and west legs in the left lane',()=>{
 const guide=routeGuidance(road,0);
 for(const d of [12,60,144]){
  const i=guide.markers.findIndex(p=>p.progress===d);assert.ok(i>=0);
  const p=guide.markers[i],expected=roadFrame(road,d,GUIDE_LANE);assert.equal(p.x,expected.x);assert.equal(p.z,expected.z);
  const a=guide.arrows.slice(i*27+3,i*27+6),tip=roadFrame(road,d+1.35,GUIDE_LANE);
  assert.ok(Math.hypot(a[0]+guide.anchor.x-tip.x,a[2]+guide.anchor.z-tip.z)<1e-8);
 }
 const east=guide.markers.find(p=>p.progress===60),west=guide.markers.find(p=>p.progress===144);assert.ok(east.z>41);assert.ok(west.z<90);
});
test('guidance is bounded at both route endpoints and moves with progress and quality range',()=>{
 for(const progress of [0,40,120,160])for(const range of [35,260,550]){
  const guide=routeGuidance(road,progress,range);assert.ok(guide.start>=0&&guide.end<=160);assert.ok(guide.end-guide.start<=240);
  assert.ok(guide.markers.every(p=>p.progress>=guide.start&&p.progress<=guide.end));assert.ok([...guide.arrows,...guide.ribbon].every(Number.isFinite));
 }
 assert.equal(routeGuidance(road,0,35).end,35);assert.equal(routeGuidance(road,0,550).end,160);
});
test('minimap keeps each sharp geographic vertex and highlights only the remaining path',()=>{
 const driver={...roadPose(road,40),heading:0},map=minimapGeometry(road,driver,180);
 for(const p of road.points){const q=map.point(p);assert.ok(map.path.includes(`${q.x.toFixed(2)},${q.y.toFixed(2)}`));}
 const q=map.point(driver);assert.ok(map.aheadPath.startsWith(`M${q.x.toFixed(2)},${q.y.toFixed(2)}`));
});
test('real Ampel–Giri route is preserved in 3D, round-trips to map coordinates and has turns',()=>{
 const route=normalizeRoute(JSON.parse(fs.readFileSync(new URL('../data/example-route.json',import.meta.url))).response),actual=createRoad(route);
 assert.ok(actual.points.length>100);
 for(let i=0;i<actual.points.length;i++){const a=actual.toGeo(actual.points[i]),b=route.coordinates[i];assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9);}
 const headings=new Set(actual.points.slice(1).map((p,i)=>Math.round(Math.atan2(p.x-actual.points[i].x,p.z-actual.points[i].z)*4)));assert.ok(headings.size>8);
 for(const d of [0,500,2000,actual.distanceM-60])assert.ok(routeGuidance(actual,d).arrows.length>0);
});
test('streaming replaces guide geometry, keeps two draw objects and disposes resources',()=>{
 const world=new THREE.Group(),material=new THREE.MeshBasicMaterial(),primitive=new THREE.BoxGeometry();
 const mesh=(parent)=>{const obj=new THREE.Mesh(primitive,material);parent.add(obj);return obj;};
 const env=createRouteEnvironment({world,road,box:mesh,mesh,mat:()=>material});env.update(roadPose(road,0),260);
 const guide=world.getObjectByName('green-route-guidance');assert.ok(guide);assert.equal(guide.children.length,2);
 let disposed=0;const first=guide.children[0].geometry;first.addEventListener('dispose',()=>disposed++);
 env.update(roadPose(road,4),260);assert.equal(guide.children[0].geometry,first);
 env.update(roadPose(road,16),260);assert.equal(disposed,1);assert.notEqual(guide.children[0].geometry,first);
 for(let p=24;p<160;p+=8)env.update(roadPose(road,p),260);assert.equal(guide.children.length,2);
 const last=guide.children[0];let geometryDisposed=false,materialDisposed=false;last.geometry.addEventListener('dispose',()=>geometryDisposed=true);last.material.addEventListener('dispose',()=>materialDisposed=true);
 env.dispose();assert.equal(geometryDisposed,true);assert.equal(materialDisposed,true);assert.equal(world.getObjectByName('green-route-guidance'),undefined);primitive.dispose();material.dispose();
});
