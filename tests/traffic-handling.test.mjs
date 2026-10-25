import test from 'node:test';
import assert from 'node:assert/strict';
import {followingSpeed,steeringStep,createFollowCamera,angleDifference} from '../lib/ride-handling.mjs';
import {routeTurnPlan,stepRouteTraffic} from '../lib/route-3d-layout.mjs';
import {cityTrafficAdvice,initialCity,stepCity} from '../lib/city-traffic.mjs';
const straight={points:[{x:0,z:0},{x:0,z:1000}],cumulative:[0,1000],distanceM:1000};
const bent={points:[{x:0,z:0},{x:0,z:100},{x:200,z:100}],cumulative:[0,100,300],distanceM:300};
test('following speed brakes early and limits normal acceleration and deceleration',()=>{
 assert.ok(followingSpeed(8,10,10,0,.1).speed<8);
 assert.ok(followingSpeed(8,10,100,0,.1).speed>8);
 assert.ok(followingSpeed(8,10,0,0,.1).speed>=8-3.2*.1-1e-10);
 assert.ok(followingSpeed(2,10,100,0,.1).speed<=2.2+1e-10);
 assert.equal(followingSpeed(3,10,10,0,0).speed,3);
});
test('route traffic plans lower speeds and directional indicators before a sharp bend',()=>{
 const v={progress:85,speed:8.5,cruise:8.5,dir:1};
 assert.equal(routeTurnPlan(straight,v).speed,8.5);assert.equal(routeTurnPlan(straight,v).indicator,null);
 assert.ok(routeTurnPlan(bent,v).speed<8.5);assert.equal(routeTurnPlan(bent,v).indicator,'right');
 assert.ok(routeTurnPlan(bent,{...v,progress:98}).speed<routeTurnPlan(bent,v).speed);
 assert.equal(routeTurnPlan(bent,{...v,progress:115,dir:-1}).indicator,'left');
});
test('a moving route car settles behind a stopped leader without emergency speed jumps',()=>{
 const player={x:40,z:0,progress:0,heading:0,speed:0};
 let vehicles=[{id:'follower',type:'car',progress:45,dir:1,speed:8.5,cruise:8.5},{id:'leader',type:'car',progress:100,dir:1,speed:0,cruise:0}];let braked=false;
 for(let i=0;i<1200;i++){const previous=vehicles[0];vehicles=stepRouteTraffic(straight,vehicles,player,1/60);assert.ok(previous.speed-vehicles[0].speed<=3.2/60+1e-8);assert.ok(vehicles[0].progress<vehicles[1].progress-5);braked||=vehicles[0].braking;}
 assert.ok(braked);assert.ok(vehicles[0].speed<.1);assert.equal(vehicles[1].speed,0);
});
test('steering ramps smoothly, respects sensitivity, self-centers and softens at speed',()=>{
 const first=steeringStep(0,{steer:1},10,1/60);assert.ok(first.steering>0&&first.steering<1);
 assert.ok(steeringStep(0,{steer:1.4},10,.05).steering>steeringStep(0,{steer:.6},10,.05).steering);
 assert.ok(Math.abs(steeringStep(1,{steer:1},16,.05).response)<Math.abs(steeringStep(1,{steer:1},3,.05).response));
 let steering=1;for(let i=0;i<60;i++)steering=steeringStep(steering,{steer:0},10,1/60).steering;assert.equal(steering,0);
 let a=0,b=0;for(let i=0;i<60;i++)a=steeringStep(a,{steer:1},8,1/60).steering;for(let i=0;i<30;i++)b=steeringStep(b,{steer:1},8,1/30).steering;assert.ok(Math.abs(a-b)<1e-8);
});
test('camera smoothing takes the short angular path and snaps on view changes or recovery',()=>{
 const rig=createFollowCamera();assert.equal(rig.update({x:0,z:0,heading:Math.PI-.05},'behind',0),Math.PI-.05);
 const value=rig.update({x:0,z:1,heading:-Math.PI+.05},'behind',.05);assert.ok(Math.abs(angleDifference(value,Math.PI-.05))<.1);
 assert.equal(rig.update({x:0,z:1,heading:1},'behind',.05,false),value);
 assert.equal(rig.update({x:0,z:1,heading:1},'front',.05),1);
 assert.equal(rig.update({x:80,z:1,heading:2},'front',.05),2);
});
test('traffic advice identifies red and amber approaches and a red-line crossing without blocking',()=>{
 const north={x:-2.4,z:-28,heading:0,speed:7,length:2.1};
 assert.equal(cityTrafficAdvice(north,{phase:3}).kind,'red');assert.equal(cityTrafficAdvice(north,{phase:1}).kind,'amber');assert.equal(cityTrafficAdvice(north,{phase:0}).message,'');
 assert.equal(cityTrafficAdvice({...north,x:25},{phase:3}).message,'');
 assert.equal(cityTrafficAdvice({x:-28,z:2.4,heading:Math.PI/2,speed:5},{phase:0}).kind,'red');
 assert.equal(cityTrafficAdvice({...north,z:-15},{phase:3},{...north,z:-16}).kind,'crossed');
 let city={...initialCity(),vehicles:[],signal:{phase:3,elapsed:0},player:{...north,z:-16,speed:12}};
 city=stepCity(city,{gas:true},.05);assert.ok(city.player.z>-16);assert.match(city.message,/merah terlewati/);assert.equal(stepCity(city,{},0),city);
});
