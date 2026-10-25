import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {streetTile,tileByIndex,normalizeStreetData,validateStreetTile,osmXmlToElements} from '../lib/street-data.mjs';
import {createRoad,newDriver} from '../lib/route-drive.mjs';
import {createStreetWorld,nearestRoutePoint} from '../lib/street-world.mjs';
import {createRouteSimulation} from '../lib/route-collision.mjs';
import {createStreetLoader} from '../lib/street-loader.mjs';
import {boxesOverlap,resolveMovement} from '../lib/ride-collision.mjs';
import {initialResources} from '../lib/travel-resources.mjs';
import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';
import {validateJourneyRoute} from '../lib/journey.mjs';
const origin=[112,-7],tile=streetTile(origin),geo=(x,z)=>[112+x/(111320*Math.cos(-7*Math.PI/180)),-7+z/111320];
const way=(id,points,tags)=>({type:'way',id,tags,geometry:points.map(([lon,lat])=>({lon,lat}))});
function fixture(){const road=createRoad(validateJourneyRoute({coordinates:[geo(0,0),geo(0,500)],durationSec:200}));const data=normalizeStreetData({elements:[way(1,[geo(0,-50),geo(0,500)],{highway:'residential',width:'8'}),way(2,[geo(-150,200),geo(150,200)],{highway:'residential',width:'8'}),way(3,[geo(100,200),geo(100,350),geo(160,350)],{highway:'living_street'}),way(4,[geo(60,260),geo(70,260),geo(70,270),geo(60,270),geo(60,260)],{building:'house','building:levels':'2'})]}, {...tile,bounds:[111.995,-7.005,112.005,-6.995]});road.streetWorld=createStreetWorld(road);road.streetWorld.add(data);return {road,data};}
test('OSM filtering keeps real grade-zero motor roads, widths, branches and building polygons',()=>{
 const {road,data}=fixture();assert.equal(data.roads.length,3);assert.equal(data.buildings.length,1);assert.equal(data.buildings[0].height,6);assert.equal(validateStreetTile(data),data);
 const raw={elements:['motorway','footway','steps','residential','service'].map((h,i)=>way(i+10,[origin,geo(40,0)],{highway:h,access:i===4?'private':'yes'})).concat([way(20,[origin,geo(0,40)],{highway:'primary',bridge:'yes'}),way(21,[origin,geo(0,40)],{highway:'primary',layer:'-1'}),way(22,[origin,geo(0,40)],{highway:'primary',motorcycle:'no'})])};assert.equal(normalizeStreetData(raw,tile).roads.length,1);
 assert.ok(road.streetWorld.surfaceAt({x:100,z:300}).drivable);assert.ok(road.streetWorld.covers({x:100,z:300}));assert.equal(road.streetWorld.surfaceAt({x:140,z:300})?.drivable||false,false);
});
test('tile requests stay bounded to Indonesia and clipped long ways cannot import a province',()=>{
 assert.throws(()=>tileByIndex(NaN,2));assert.throws(()=>tileByIndex(1,1));assert.throws(()=>streetTile([0,0]));
 const data=normalizeStreetData({elements:[way(1,[[111,-7],[113,-7]],{highway:'primary'})]},tile);assert.equal(data.roads.length,1);assert.ok(data.roads[0].coordinates.every(p=>p[0]>=tile.bounds[0]&&p[0]<=tile.bounds[2]));
 assert.throws(()=>validateStreetTile({...data,roads:[{...data.roads[0],width:1e9}]}));
});
test('OSM XML resolves shared node geometry and safely decodes names without executing entities',()=>{
 const xml='<osm><node id="1" lat="-7" lon="112"/><node id="2" lat="-6.999" lon="112"/><way id="8"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="name" v="A &amp; B"/></way></osm>',data=osmXmlToElements(xml);assert.equal(data.elements[0].tags.name,'A & B');assert.equal(data.elements[0].geometry.length,2);assert.throws(()=>osmXmlToElements('<!DOCTYPE x SYSTEM "https://invalid">'));
});
test('footprint collision follows a concave building without blocking its open courtyard',()=>{
 const polygon=[{x:0,z:0},{x:10,z:0},{x:10,z:3},{x:3,z:3},{x:3,z:10},{x:0,z:10}],building={id:'concave',x:5,z:5,width:10,length:10,polygon};
 assert.equal(boxesOverlap({x:7,z:7,heading:0},building),false);assert.equal(boxesOverlap({x:1,z:7,heading:0},building),true);
 const previous={x:7,z:7,heading:-Math.PI/2,speed:10},hit=resolveMovement(previous,{...previous,x:-2},[building]);assert.ok(hit.hit);assert.ok(hit.value.x>3);assert.equal(boxesOverlap(hit.value,building),false);
});
test('Vespa can travel over 60 metres down a real side street, consume fuel and return to the route',()=>{
 const {road}=fixture(),party=['bapak','ibu'];let player={...newDriver(road,200),x:70,z:200,heading:Math.PI/2,speed:6,resources:initialResources()},sim=createRouteSimulation(road,player);
 for(let i=0;i<120;i++)player=sim.advance(player,{gas:true},1/60,party);assert.ok(player.x>85);assert.equal(player.offRoad,false);assert.equal(player.progress,200);assert.ok(player.resources.totalMeters>10);assert.ok(player.resources.fuel<4);assert.ok(!player.collision);
 const rejoin={...player,x:.5,z:310,heading:0,speed:2};const next=sim.advance(rejoin,{gas:true},1/60,party);assert.ok(next.progress>300);assert.ok(Math.abs(nearestRoutePoint(road,next).distance-.5)<.1);
});
test('a missing neighbourhood stops outward travel and never invents roads or consumes blocked fuel',()=>{
 const {road}=fixture(),p={...newDriver(road,200),x:555,z:200,heading:Math.PI/2,speed:4,resources:initialResources()},sim=createRouteSimulation(road,p),next=sim.advance(p,{gas:true},.1,['bapak','ibu']);assert.equal(next.x,p.x);assert.match(next.collision,/belum dimuat/);assert.equal(next.resources.fuel,p.resources.fuel);
});
test('tiles are deduplicated, limited to five and drive the same collision footprint as rendering',()=>{
 const {road,data}=fixture(),world=road.streetWorld;for(let i=0;i<8;i++)world.add({...data,id:'tile-'+i});assert.equal(world.snapshot().tiles,5);assert.equal(world.roads.length,3);assert.equal(world.buildings.length,1);const obstacle=world.obstacles({x:65,z:265})[0];assert.equal(obstacle.polygon.length,4);assert.equal(world.nearby({x:65,z:265}).buildings[0].parts[0],obstacle);
});
test('bundled Ampel snapshot contains real branching streets and buildings away from the chosen route',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/ampel-street-snapshot.json',import.meta.url)));validateStreetTile(data);assert.ok(data.roads.length>300);assert.ok(data.buildings.length>6000);assert.ok(data.sourceUrl.startsWith('https://www.openstreetmap.org/'));
 const counts=new Map();for(const r of data.roads)for(const p of r.coordinates){const key=p.map(n=>n.toFixed(7)).join(':');counts.set(key,(counts.get(key)||0)+1);}assert.ok([...counts.values()].some(n=>n>=3));
});
test('loader failure is retryable, bounded and disposal ignores late network replies',async()=>{
 const {road,data}=fixture(),world=createStreetWorld(road),messages=[];let calls=0,time=0;const loader=createStreetLoader(road,world,s=>messages.push(s),{now:()=>time,fetcher:async()=>{calls++;return {ok:false,json:async()=>({error:'Layanan gagal'})};}});loader.update({x:0,z:0,heading:0});await new Promise(r=>setTimeout(r,0));assert.equal(messages.at(-1).status,'error');loader.update({x:0,z:0,heading:0});assert.equal(calls,1);time=31000;loader.update({x:0,z:0,heading:0});await new Promise(r=>setTimeout(r,0));assert.equal(calls,2);loader.dispose();
 let resolve;const late=createStreetLoader(road,world,s=>messages.push(s),{fetcher:()=>new Promise(r=>resolve=r)});late.update({x:0,z:0,heading:0});late.dispose();resolve({ok:true,json:async()=>data});await new Promise(r=>setTimeout(r,0));assert.equal(world.ready,false);
});
test('street detours persist their true position without adding map data to the save',()=>{
 const start=SEED_LOCATIONS[0],dest=SEED_LOCATIONS[1],route=validateJourneyRoute({coordinates:[start.coordinates,[start.coordinates[0],start.coordinates[1]+.1]],durationSec:1000}),road=createRoad(route),s={...initialJourney(start),route,destination:dest,party:['bapak','ibu'],status:'paused'};s.driver={...newDriver(road,0),x:2000,z:7000,resources:s.resources};const restored=decodeJourney(encodeJourney(s),start);assert.equal(restored.driver.x,2000);assert.equal(restored.driver.z,7000);assert.equal(restored.status,'paused');assert.equal(encodeJourney(s).includes('streetWorld'),false);
});
test('overlapping tiles preserve differently clipped sections of the same OSM way',()=>{
 const {road,data}=fixture(),world=road.streetWorld,source=data.roads[0],short={...source,coordinates:source.coordinates.map((p,i)=>i===0?geo(0,200):p)};world.add({...data,id:'overlap',roads:[short],buildings:[]});assert.ok(world.surfaceAt({x:0,z:0}).drivable);assert.ok(world.surfaceAt({x:0,z:480}).drivable);assert.ok(world.roads.length>=4);
});
test('recovery checks actual footprints at the destination, not only around the detour position',()=>{
 const {road}=fixture(),p={...newDriver(road,200),x:130,z:200,heading:Math.PI/2,resources:initialResources()},sim=createRouteSimulation(road,p),recovered=sim.recover(p);assert.ok(Math.abs(recovered.x)<5);assert.ok(sim.obstacles(recovered).every(o=>!boxesOverlap(recovered,o,.25)));assert.equal(recovered.resources,p.resources);
});
