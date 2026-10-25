import {nextRouteSignal} from './street-furniture.mjs';
import {followingSpeed,angleDifference} from './ride-handling.mjs';
import {resolveMovement} from './ride-collision.mjs';
import {roadPose,roadSegmentAt} from './route-drive.mjs';
import {getFacilities} from './route-facilities.mjs';

export function roadFrame(road,distance,offset=0){
 const p=roadPose(road,distance),a=roadPose(road,distance-1.5),b=roadPose(road,distance+1.5);
 const heading=Math.atan2(b.x-a.x,b.z-a.z);
 return {...p,heading,x:p.x+Math.cos(heading)*offset,z:p.z-Math.sin(heading)*offset};
}
export function roadSamples(road,start,end,step=7){
 const low=Math.max(0,start),high=Math.min(road.distanceM,end),distances=[low,high];
 for(let d=Math.ceil(low/step)*step;d<high;d+=step)distances.push(d);
 // Keep the actual route's vertices so a bend is never replaced by a chord.
 for(let i=roadSegmentAt(road,low);i<road.points.length&&road.cumulative[i]<high;i++)distances.push(road.cumulative[i]);
 return [...new Set(distances)].sort((a,b)=>a-b).map(d=>roadFrame(road,d));
}
export function corridorDistance(road,x,z){
 let result=Infinity;
 for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)):0;result=Math.min(result,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}
 return result;
}
export function routeLots(road,progress,range=280){
 const lots=[],facilities=getFacilities(road),spacing=44;
 for(let d=Math.max(22,Math.floor((progress-150)/spacing)*spacing+22);d<Math.min(road.distanceM,progress+range);d+=spacing){
  const index=Math.floor(d/spacing);
  for(const side of [-1,1]){const p=roadFrame(road,d,side*(18+index%3*2));
   if(corridorDistance(road,p.x,p.z)<12||facilities.some(f=>Math.hypot(f.x-p.x,f.z-p.z)<25))continue;
   lots.push({...p,id:`lot-${index}-${side}`,kind:index%3===0?'shop':'house',width:9+index%3,height:6+(index%3)*1.5,depth:9,color:['#d9c9a7','#c8c9b3','#c6b3a3','#a8beb6'][(index+(side===1?1:0))%4],heading:p.heading+(side===1?-Math.PI/2:Math.PI/2)});
  }
 }
 return lots;
}
export function initialRouteTraffic(road,progress){
 return Array.from({length:8},(_,i)=>({id:`route-npc-${i}`,type:i%3===1?'motorcycle':'car',dir:i%2?1:-1,progress:progress+35+i*39,speed:0,cruise:i%3===1?7:8.5})).filter(v=>v.progress<road.distanceM-8);
}
export function stepRouteTraffic(road,vehicles,player,dt,time=0){
 const seconds=Math.max(0,Math.min(.1,dt));if(!seconds)return vehicles;
 const updated=[];
 return vehicles.map(v=>{
  let gap=Infinity,leaderSpeed=0;
  const lateral=Math.hypot(player.x-roadFrame(road,player.progress,-v.dir*1.9).x,player.z-roadFrame(road,player.progress,-v.dir*1.9).z);
  const playerGap=(player.progress-v.progress)*v.dir;
  if(lateral<2.2&&playerGap>0){gap=playerGap-(v.type==='car'?4.2:2.1)/2-2.6;const heading=roadFrame(road,player.progress).heading;leaderSpeed=Math.max(0,(player.speed||0)*Math.cos(player.heading-heading)*v.dir);}
  for(const other of vehicles)if(other.id!==v.id&&other.dir===v.dir){const g=(other.progress-v.progress)*v.dir,spacing=((v.type==='car'?4.2:2.1)+(other.type==='car'?4.2:2.1))/2+1.8;if(g>0&&g-spacing<gap){gap=g-spacing;leaderSpeed=other.speed;}}
  const boundary=v.dir===1?road.distanceM-v.progress-5:v.progress-5;
  if(boundary<gap){gap=boundary;leaderSpeed=0;}
  const signal=nextRouteSignal(road,v,time);if(signal&&signal.distance<gap){gap=signal.distance<.6?0:signal.distance;leaderSpeed=0;}
  const turn=routeTurnPlan(road,v),following=followingSpeed(v.speed,Math.min(v.cruise,turn.speed),gap,leaderSpeed,seconds),speed=following.speed;
  const travel=Math.min(speed*seconds,Math.max(0,Math.min(gap,boundary)));
  const progress=Math.max(0,Math.min(road.distanceM,v.progress+travel*v.dir));
  const shape=o=>({...routeTrafficPose(road,o),width:o.type==='car'?1.85:.75,length:o.type==='car'?4.2:2.1});
  const candidate={...v,progress,speed:seconds?travel/seconds:v.speed,braking:following.braking||(speed<.15&&gap<.7),indicator:turn.indicator};
  const blockers=[{...player,id:'player'},...vehicles.filter(o=>o.id!==v.id).map(o=>shape(updated.find(q=>q.id===o.id)||o))];
  const result=resolveMovement(shape(v),shape(candidate),blockers);
  const next=result.hit?{...v,speed:0,braking:true,indicator:turn.indicator}:candidate;updated.push(next);return next;
 });
}
export function routeTurnPlan(road,vehicle){
 const look=Math.min(64,Math.max(24,vehicle.speed*vehicle.speed/4.4+20));
 let speed=vehicle.cruise,previous=roadFrame(road,vehicle.progress),indicator=null;
 for(let offset=4;offset<=look;offset+=4){const next=roadFrame(road,vehicle.progress+vehicle.dir*offset),turn=angleDifference(next.heading,previous.heading),angle=Math.abs(turn);
  if(angle>.015){const curve=Math.max(2.5,Math.sqrt(2.2*4/angle));speed=Math.min(speed,Math.sqrt(curve*curve+2*2.2*Math.max(0,offset-4)));}
  previous=next;
 }
 const delta=angleDifference(roadFrame(road,vehicle.progress+vehicle.dir*18).heading,roadFrame(road,vehicle.progress).heading);
 if(Math.abs(delta)>.35)indicator=delta>0?'right':'left';
 return {speed,indicator};
}

export function routeTrafficPose(road,vehicle){const center=roadFrame(road,vehicle.progress),offset=vehicle.dir*(road.streetWorld?.laneOffset(center)??-1.9),p=roadFrame(road,vehicle.progress,offset);return {...vehicle,...p,heading:p.heading+(vehicle.dir===-1?Math.PI:0)};}

const sceneryCache=new WeakMap();
export function routeScenery(road,progress,range=280){
 const center=Math.floor(progress/40)*40,key=`${center}:${range}`;
 if(!sceneryCache.has(road))sceneryCache.set(road,new Map());const cache=sceneryCache.get(road);if(cache.has(key))return cache.get(key);
 const facilities=getFacilities(road),props=[];
 for(let d=Math.max(0,Math.floor((center-160)/28)*28);d<Math.min(road.distanceM,center+range+40);d+=28)for(const side of [-1,1]){
  const p=roadFrame(road,d,side*10.5);if(corridorDistance(road,p.x,p.z)<8.5||facilities.some(f=>Math.hypot(f.x-p.x,f.z-p.z)<18))continue;
  props.push({...p,id:`tree-${d}-${side}`,side,lamp:Math.round(d/28)%3===0});
 }
 const services=facilities.filter(f=>f.progress>=center-170&&f.progress<=center+range+50).map(f=>{const p=roadFrame(road,f.progress),side=(f.x-p.x)*Math.cos(p.heading)-(f.z-p.z)*Math.sin(p.heading)>0?1:-1;return {...f,side,heading:p.heading+(side===1?-Math.PI/2:Math.PI/2),kind:f.type==='bengkel'?'shop':'house',width:12,depth:10};});
 const end=roadFrame(road,road.distanceM,17),goal=road.distanceM-center<range+50?{...end,id:'maqbarah-goal',heading:end.heading-Math.PI/2,width:15,depth:13,height:8,color:'#d6d6bb'}:null;
 const result={lots:routeLots(road,center,range+40),props,services,goal};cache.set(key,result);if(cache.size>8)cache.delete(cache.keys().next().value);return result;
}
