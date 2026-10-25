import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {clearBuildingFootprint,BUILDING_SETBACK} from '../lib/street-clearance.mjs';
import {pointInPolygon,segmentProjection} from '../lib/street-geometry.mjs';
import {createStreetWorld} from '../lib/street-world.mjs';import {createRoad} from '../lib/route-drive.mjs';import {normalizeRoute} from '../lib/geo.mjs';
import {streetJunctions,streetFurniture,geographicSignalColor,streetSignalAdvice} from '../lib/street-furniture.mjs';
import {normalizeStreetData,streetTile} from '../lib/street-data.mjs';
import {stepRouteTraffic} from '../lib/route-3d-layout.mjs';
import {spriteDirection,rideArtPath,RIDE_ART_IDS,RIDE_ART_DIRECTIONS} from '../lib/ride-art.mjs';import {safeFollowCamera} from '../lib/camera-clearance.mjs';
const poly=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}];
test('road clearance cuts a building into safe pieces and removes a footprint fully inside the street',()=>{
 const road={a:{x:0,z:-50},b:{x:0,z:50},width:6},b={id:'house',polygon:poly(-10,-8,10,8),height:6},parts=clearBuildingFootprint(b,[road]);assert.equal(parts.length,2);
 for(const p of parts)for(const q of p.polygon)assert.ok(segmentProjection(q,road.a,road.b).distance>=road.width/2+BUILDING_SETBACK-.001);
 assert.deepEqual(clearBuildingFootprint({id:'bad',polygon:poly(-1,-2,1,2)},[road]),[]);
 const corners=clearBuildingFootprint(b,[road,{a:{x:-50,z:0},b:{x:50,z:0},width:6}]);assert.equal(corners.length,4);
});
function realWorld(){const road=createRoad(normalizeRoute(JSON.parse(fs.readFileSync(new URL('../data/example-route.json',import.meta.url))).response));road.streetWorld=createStreetWorld(road);road.streetWorld.add(JSON.parse(fs.readFileSync(new URL('../data/ampel-street-snapshot.json',import.meta.url))));return road;}
test('real Ampel building parts leave asphalt and a safety margin clear across the loaded road network',()=>{
 const road=realWorld(),world=road.streetWorld;let count=0;
 for(const s of world.segments){const length=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);if(length<1)continue;const nx=(s.b.z-s.a.z)/length,nz=-(s.b.x-s.a.x)/length;
  for(const t of [.1,.5,.9])for(const offset of [0,s.width/2+.3,-s.width/2-.3]){const p={x:s.a.x+(s.b.x-s.a.x)*t+nx*offset,z:s.a.z+(s.b.z-s.a.z)*t+nz*offset};for(const b of world.obstacles(p,3))assert.ok(!pointInPolygon(p,b.polygon)||(b.holes||[]).some(h=>pointInPolygon(p,h)),`${b.id} intersects road ${s.road.osmId}`);count++;}
 }
 assert.ok(count>1000);assert.ok(world.snapshot().renderBuildings>6000);
 const f=streetFurniture(world,{x:0,z:0},320);assert.ok(f.lamps.length>3);assert.ok(f.crossings.length>0);for(const lamp of f.lamps){const surface=world.surfaceAt(lamp);assert.ok(!surface||surface.distance>surface.width/2+.4);}assert.ok(streetJunctions(world).some(j=>j.signal));
});
function crossingWorld(){const origin=[112,-7],scale=111320*Math.cos(-7*Math.PI/180),geo=(x,z)=>[112+x/scale,-7+z/111320],coordinates=[geo(0,0),geo(0,200),geo(0,500)],cumulative=[0,200,500],road=createRoad({coordinates,cumulative,distanceM:500});const way=(id,coords)=>({type:'way',id,tags:{highway:'residential',width:'8'},geometry:coords.map(([lon,lat])=>({lon,lat}))});road.streetWorld=createStreetWorld(road);road.streetWorld.add(normalizeStreetData({elements:[way(1,coordinates),way(2,[geo(-200,200),geo(0,200),geo(200,200)])]},{...streetTile(origin),bounds:[111.995,-7.005,112.005,-6.995]}));return road;}
test('geographic signals alternate safely, warn the rider, and stop then release route NPCs',()=>{
 const road=crossingWorld(),world=road.streetWorld;assert.equal(streetJunctions(world).filter(j=>j.signal).length,1);
 for(let t=0;t<46;t+=.25)assert.ok(!(geographicSignalColor(t,'x')==='green'&&geographicSignalColor(t,'z')==='green'));
 const advice=streetSignalAdvice(world,{x:-1.9,z:160,heading:0},23);assert.equal(advice.color,'red');assert.match(advice.message,/merah/);
 let vehicles=[{id:'npc',type:'car',dir:1,progress:120,speed:8.5,cruise:8.5}],player={x:300,z:0,heading:0,speed:0,progress:0};for(let i=0;i<1800;i++)vehicles=stepRouteTraffic(road,vehicles,player,1/60,23);
 assert.ok(vehicles[0].progress<186);assert.ok(vehicles[0].speed<.1);const before=vehicles[0].progress;for(let i=0;i<120;i++)vehicles=stepRouteTraffic(road,vehicles,player,1/60,0);assert.ok(vehicles[0].progress>before+1);
});
test('follow camera stops before building walls and can stay above a low roof',()=>{
 const obstacle={x:5,z:0,width:4,length:8,height:6},target={x:0,z:0,y:1.25},desired={x:8,z:0,y:4.2},safe=safeFollowCamera(target,desired,[obstacle]);assert.equal(safe.shortened,true);assert.ok(safe.x<2.8);assert.ok(safe.x>1);
 const high=safeFollowCamera({...target,y:12},{...desired,y:20},[obstacle]);assert.equal(high.shortened,false);
});
test('all six subjects have five real PNGs with alpha and the view selector follows the camera',()=>{
 for(const id of RIDE_ART_IDS)for(const direction of RIDE_ART_DIRECTIONS){const p=rideArtPath(id,direction),bytes=fs.readFileSync(new URL('../public'+p,import.meta.url));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes[25],6);assert.ok(bytes.readUInt32BE(16)>150);assert.ok(bytes.readUInt32BE(20)>250);}
 assert.equal(spriteDirection(0),'front');assert.equal(spriteDirection(Math.PI),'back');assert.equal(spriteDirection(Math.PI/2),'right');assert.equal(spriteDirection(-Math.PI/2),'left');assert.equal(spriteDirection(0,Math.PI/2),'left');assert.equal(spriteDirection(3,1,true),'top');assert.throws(()=>rideArtPath('../invalid','front'));
});
test('illustration and 3D preferences survive old saves and explicit style changes',async()=>{
 const {normalizeRideSettings,readRideSettings}=await import('../lib/ride-settings.mjs');assert.equal(normalizeRideSettings({}).visualStyle,'illustration');assert.equal(readRideSettings(JSON.stringify({visualStyle:'model'})).visualStyle,'model');assert.equal(normalizeRideSettings({visualStyle:'invalid'}).visualStyle,'illustration');
});
