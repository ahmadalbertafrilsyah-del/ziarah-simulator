import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {sceneLight,mixColor,surfaceColor} from '../lib/scene-atmosphere.mjs';
import {roadsideProps,propFaces,shadowFace,headlightFace} from '../lib/scene-props.mjs';
import {engineSound,createRideAudio} from '../lib/ride-audio.mjs';
import {normalizeRideSettings} from '../lib/ride-settings.mjs';import {createRoad,newDriver,roadPose} from '../lib/route-drive.mjs';
import {normalizeRoute,validCoordinate,distanceMeters} from '../lib/geo.mjs';import {validateJourneyRoute} from '../lib/journey.mjs';
import {SEED_LOCATIONS} from '../lib/locations.mjs';import {initialJourney,encodeJourney,decodeJourney} from '../lib/journey-save.mjs';
import {advanceResources,serviceResources,validResources} from '../lib/travel-resources.mjs';import {advanceMaintenance} from '../lib/vehicle-maintenance.mjs';import {blockedReason} from '../lib/travel-resources.mjs';
const day=sceneLight(720),night=sceneLight(60),road=createRoad(validateJourneyRoute({coordinates:[[112,-7],[112,-6.98]],durationSec:180}));
test('daylight transitions through dawn/dusk and repeats across days without touching game time',()=>{
 assert.equal(day.daylight,1);assert.equal(night.daylight,0);assert.equal(sceneLight(360).daylight,.5);assert.equal(sceneLight(1080).daylight,.5);assert.equal(sceneLight(300).daylight,0);assert.equal(sceneLight(1140).daylight,0);assert.deepEqual(sceneLight(720+1440),day);assert.equal(sceneLight(-60).hour,23);
 assert.ok(Math.abs(sceneLight(420.001).ambient-sceneLight(419.999).ambient)<.001);assert.ok(day.ambient>night.ambient);assert.ok(night.lamps>day.lamps);
});
test('surface lighting and haze produce bounded colors while retaining exact color endpoints',()=>{
 assert.equal(mixColor('#000000','#ffffff',0),'#000000');assert.equal(mixColor('#000000','#ffffff',1),'#ffffff');assert.equal(mixColor('#000000','#ffffff',.5),'#808080');
 const points=[[0,0,0],[1,0,0],[1,0,1]];assert.match(surfaceColor('#62c2aa',points,day,50),/^#[a-f0-9]{6}$/);assert.notEqual(surfaceColor('#62c2aa',points,day,50),surfaceColor('#62c2aa',points,night,50));assert.equal(surfaceColor('transparent',points,day), 'transparent');
});
test('roadside props are deterministic, outside road corridor, quality-aware and purely visual',()=>{
 const original=JSON.stringify(road),full=roadsideProps(road,500,{viewDistance:420,decorations:1}),low=roadsideProps(road,500,{viewDistance:260,decorations:.5});assert.deepEqual(full,roadsideProps(road,500,{viewDistance:420,decorations:1}));assert.ok(full.length>0);assert.ok(low.length<full.length);assert.ok(full.every(p=>Math.abs(p.x)>=12));assert.equal(JSON.stringify(road),original);
 assert.ok(propFaces(full,night).some(f=>f.unlit));assert.ok(propFaces(full,day).every(f=>f.points.every(p=>p.every(Number.isFinite))));
});
test('contact shadows and headlight beam follow vehicle heading and disappear in daylight',()=>{
 const s=newDriver(road),shadow=shadowFace(1,2,.7,1.35);assert.equal(shadow.layer,3.5);assert.equal(shadow.points.length,16);assert.ok(shadow.points.every(p=>p[1]>.05));assert.deepEqual(headlightFace(s,day),[]);const n=headlightFace(s,night)[0],east=headlightFace({...s,heading:Math.PI/2},night)[0];assert.ok(n.points.some(p=>p[2]>20));assert.ok(east.points.some(p=>p[0]>20));
});
test('engine synthesis responds to speed/throttle, stays silent while paused and mutes broken engine',()=>{
 const idle=engineSound({speed:0},true),fast=engineSound({speed:16},true,true),paused=engineSound({speed:16},false);assert.ok(fast.frequency>idle.frequency);assert.ok(fast.engine>idle.engine);assert.equal(paused.engine,0);assert.equal(paused.wind,0);assert.equal(engineSound({speed:0,resources:{breakdown:{type:'tyre'},fuel:1}},true).engine,0);
});
class Param {value=0;cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Context {static instances=[];state='suspended';currentTime=0;sampleRate=8000;destination={};nodes=[];constructor(){Context.instances.push(this);}node(kind){const n={kind,gain:new Param(),frequency:new Param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};this.nodes.push(n);return n;}createGain(){return this.node('gain');}createBiquadFilter(){return this.node('filter');}createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('buffer');}createBuffer(ch,length){return {getChannelData:()=>new Float32Array(length)};}resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
test('audio starts only on explicit enable, reuses context, fades mute and releases all sources',async()=>{
 Context.instances=[];const audio=createRideAudio(Context);assert.equal(Context.instances.length,0);audio.update({speed:10},true);assert.equal(Context.instances.length,0);await audio.enable(.3);await audio.enable(.5);assert.equal(Context.instances.length,1);const context=Context.instances[0];assert.equal(audio.ready,true);audio.update({speed:10},true,true,.4);const engine=context.nodes.filter(n=>n.kind==='gain')[1];assert.ok(engine.gain.value>0);audio.silence();assert.equal(engine.gain.value,0);audio.cue('arrived');audio.cue('breakdown');audio.dispose();audio.dispose();assert.equal(context.state,'closed');assert.equal(audio.ready,false);assert.ok(context.nodes.filter(n=>n.started).every(n=>n.stopped));await assert.rejects(()=>audio.enable());
});
test('older settings gain optional sound and helmets without altering controls or selecting autoplay',()=>{
 const s=normalizeRideSettings({quality:'low',controls:'pad',sensitivity:.8,minimap:false});assert.equal(s.sound,false);assert.equal(s.volume,.35);assert.equal(s.helmets,true);assert.equal(s.controls,'pad');assert.equal(s.quality,'low');assert.equal(normalizeRideSettings({volume:99}).volume,1);assert.equal(normalizeRideSettings({volume:-1}).volume,0);
});
test('all nine location records pass structural checks and cached Ampel-Giri endpoints match their locations',()=>{
 assert.equal(SEED_LOCATIONS.length,9);assert.equal(new Set(SEED_LOCATIONS.map(p=>p.id)).size,9);assert.ok(SEED_LOCATIONS.every(p=>p.name&&p.region&&validCoordinate(p.coordinates)&&/^https?:/.test(p.source)));
 const data=JSON.parse(readFileSync(new URL('../data/example-route.json',import.meta.url))),route=validateJourneyRoute(normalizeRoute(data.response));for(const [index,id] of [[0,'sunan-ampel'],[-1,'sunan-giri']])assert.ok(distanceMeters(route.coordinates.at(index),SEED_LOCATIONS.find(p=>p.id===id).coordinates)<150);
});
test('long Ampel-Giri resource stress survives mechanical failures and save/restore without negative supplies',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../data/example-route.json',import.meta.url))),route=validateJourneyRoute(normalizeRoute(fixture.response)),world=createRoad(route),party=['bapak','ibu'];let session={...initialJourney(SEED_LOCATIONS.find(p=>p.id==='sunan-ampel')),destination:SEED_LOCATIONS.find(p=>p.id==='sunan-giri'),route,status:'paused',party,driver:{...newDriver(world)},resources:initialJourney(SEED_LOCATIONS[0]).resources};let resources=session.resources,meters=0,repairs=0;
 while(meters<route.distanceM){const step=Math.min(100,route.distanceM-meters);resources=advanceMaintenance(advanceResources(resources,step,step/12,party),step,false);meters+=step;if(resources.breakdown){resources=serviceResources(resources,'repair-help',party).resources;repairs++;}assert.ok(validResources(resources));if(Math.floor(meters)%2000===0){session={...session,resources,driver:{...roadPose(world,meters),resources}};const restored=decodeJourney(encodeJourney(session));assert.deepEqual(restored.resources,resources);assert.equal(restored.driver.speed,0);}}
 assert.ok(repairs>=2);assert.ok(resources.fuel>=0);assert.ok(resources.money>=0);assert.ok(Math.abs(resources.totalMeters-route.distanceM)<1e-6);assert.equal(blockedReason(resources,party),'');
});
