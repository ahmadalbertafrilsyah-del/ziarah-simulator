import test from 'node:test';import assert from 'node:assert/strict';
import {buildNavigation,navigationState,minimapGeometry,angleDifference} from '../lib/ride-navigation.mjs';
import {normalizeRideSettings,readRideSettings,renderSize,QUALITY_PRESETS} from '../lib/ride-settings.mjs';
import {createRideInput,padSteering} from '../lib/ride-input.mjs';
import {createRoad,newDriver,roadPose,roadSegmentAt,locateDriver,stepDriver} from '../lib/route-drive.mjs';
import {validateJourneyRoute} from '../lib/journey.mjs';import {routeFaces} from '../lib/route-world.mjs';

const road=coords=>createRoad(validateJourneyRoute({coordinates:coords,durationSec:60}));
const right=road([[112,-7],[112,-6.999],[112.001,-6.999]]),left=road([[112,-7],[112,-6.999],[111.999,-6.999]]),straight=road([[112,-7],[112,-6.998]]);
test('geometry navigation identifies right, left and U-shaped bends without inventing turns on a straight road',()=>{
 const r=buildNavigation(right),l=buildNavigation(left);assert.equal(r.length,1);assert.equal(r[0].direction,'right');assert.equal(l[0].direction,'left');assert.deepEqual(buildNavigation(straight),[]);
 const u=road([[112,-7],[112,-6.999],[112.00001,-6.9999]]);assert.equal(buildNavigation(u)[0].direction,'uturn');assert.ok(Math.abs(angleDifference(-Math.PI+.1,Math.PI-.1)-.2)<1e-8);
});
test('guidance advances after a bend, warns off route and wrong direction, and handles arrival',()=>{
 const turns=buildNavigation(right);let d={...newDriver(right,20),speed:5};let nav=navigationState(right,d,turns);assert.equal(nav.kind,'right');assert.ok(nav.distance>70&&nav.distance<100);
 assert.equal(navigationState(right,{...newDriver(right,turns[0].progress+10),speed:5},turns).kind,'straight');
 assert.equal(navigationState(right,{...d,x:d.x+25},turns).kind,'offroute');assert.equal(navigationState(right,{...d,heading:Math.PI},turns).kind,'wrongway');
 assert.equal(navigationState(right,{...newDriver(right,right.distanceM-15)},turns).kind,'arrival');assert.equal(navigationState(right,{...d,arrived:true},turns).kind,'arrived');
});
test('north-up minimap keeps vehicle centered, heading consistent and dense route path bounded',()=>{
 const driver=newDriver(right,30),m=minimapGeometry(right,driver);assert.deepEqual(m.point(driver),{x:80,y:60});assert.equal(m.heading,0);assert.ok(m.point({x:driver.x,z:driver.z+20}).y<60);assert.ok(m.point({x:driver.x+20,z:driver.z}).x>80);
 const dense=road(Array.from({length:20000},(_,i)=>[112,-7+i*.0000001]));const path=minimapGeometry(dense,newDriver(dense,80)).path;assert.ok(path.length<8000);assert.ok(!path.includes('NaN'));
});
test('input sources combine keyboard and multitouch; one release never releases another source',()=>{
 const c=createRideInput();c.press('gas','key:KeyW');c.press('gas','touch:1');c.press('left','touch:2');assert.equal(c.read().gas,true);assert.equal(c.read().steer,-1);c.release('touch:1');assert.equal(c.read().gas,true);c.release('key:KeyW');assert.equal(c.read().gas,false);assert.equal(c.read().left,true);c.clear();assert.equal(c.read().steer,0);assert.equal(c.read().left,false);
});
test('analog steering has dead zone, bounded range, sensitivity and clean cancellation',()=>{
 assert.equal(padSteering(60,0,120),0);assert.equal(padSteering(-999,0,120),-1);assert.equal(padSteering(999,0,120),1);
 const c=createRideInput();c.steer(.5,'pad:1');assert.ok(Math.abs(c.read(.6).steer-.3)<1e-8);assert.ok(Math.abs(c.read(1.4).steer-.7)<1e-8);c.steer(99,'pad:1');assert.equal(c.read(1.4).steer,1.4);c.release('pad:1');assert.equal(c.read().steer,0);
 const d={...newDriver(straight),speed:8};assert.ok(stepDriver(straight,d,{steer:1.4},.05).heading>stepDriver(straight,d,{steer:.6},.05).heading);
});
test('quality presets cap both pixel count and dimensions for portrait, landscape and extreme screens',()=>{
 for(const quality of Object.keys(QUALITY_PRESETS))for(const [w,h,dpr] of [[375,667,3],[667,375,2],[7680,4320,3],[320,9000,4]]){const size=renderSize(w,h,dpr,quality),p=QUALITY_PRESETS[quality];assert.ok(size.width>=1&&size.height>=1);assert.ok(size.width<=p.maxWidth);assert.ok(size.width*size.height<=p.pixelBudget);}
 assert.ok(renderSize(1280,800,2,'high').width>renderSize(1280,800,2,'low').width);
 assert.equal(renderSize(100,100,2,'toString').width,150);
});
test('settings reject corrupt values and preserve chosen controls and quality after roundtrip',()=>{
 const defaults=normalizeRideSettings(null);assert.deepEqual(readRideSettings('bad json'),defaults);assert.deepEqual(normalizeRideSettings({quality:'constructor',sensitivity:NaN,controls:'autopilot',minimap:'yes'}),defaults);
 const chosen={quality:'low',controls:'pad',sensitivity:.8,controlSize:'large',minimap:false,sound:false,volume:.35,helmets:true,visualStyle:'illustration'};assert.deepEqual(readRideSettings(JSON.stringify(chosen)),chosen);

});
test('binary segment lookup and local nearest-window agree with known route poses',()=>{
 const dense=road(Array.from({length:1000},(_,i)=>[112+i*.000001,-7+i*.00001]));
 for(const d of [0,1,50,dense.distanceM/2,dense.distanceM]){const pose=roadPose(dense,d),index=roadSegmentAt(dense,d);assert.ok(dense.cumulative[index]>=d-1e-7);const result=locateDriver(dense,{...pose,x:pose.x+2});assert.ok(result.distance<=2.00001);assert.ok(Math.abs(result.progress-d)<3);}
});
test('long geometry segments only generate visible road markings for the active drawing distance',()=>{
 const long=road([[112,-7],[112,-6]]),d=newDriver(long,50000);const low=routeFaces(long,d,260),high=routeFaces(long,d,550);assert.ok(low.length<100);assert.ok(high.length<150);assert.ok(high.length>low.length);
});
