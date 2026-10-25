import {steeringStep} from './ride-handling.mjs';
// Local metric world derived from the selected geographic road geometry.
const RAD = Math.PI / 180;
export function createRoad(route) {
  const origin = route.coordinates[0], scaleX = 111320 * Math.cos(origin[1] * RAD), scaleZ = 111320;
  const points = route.coordinates.map(([lon, lat]) => ({x:(lon-origin[0])*scaleX,z:(lat-origin[1])*scaleZ}));
  return {points, cumulative:route.cumulative, distanceM:route.distanceM,
    toGeo:({x,z})=>[origin[0]+x/scaleX,origin[1]+z/scaleZ]};
}
export function roadSegmentAt(road,distance){
 let lo=1,hi=road.cumulative.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(road.cumulative[mid]<distance)lo=mid+1;else hi=mid;}
 return lo;
}
export function roadPose(road, distance) {
  const d=Math.max(0,Math.min(road.distanceM,distance));
  const i=roadSegmentAt(road,d);
  const a=road.points[i-1],b=road.points[i],span=road.cumulative[i]-road.cumulative[i-1];
  const f=span>0?(d-road.cumulative[i-1])/span:0;
  return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,heading:Math.atan2(b.x-a.x,b.z-a.z),progress:d};
}
export function newDriver(road,distance=0) {return {...roadPose(road,distance),speed:0,steering:0,braking:false,offRoad:false,arrived:false};}
export function locateDriver(road,state) {
  let best=null;
  for(let i=roadSegmentAt(road,Math.max(0,state.progress-100));i<road.points.length;i++){
    // A local arc window prevents jumping between nearby hairpins or crossings.
    if(road.cumulative[i-1]>state.progress+150)break;
    const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
    const t=l?Math.max(0,Math.min(1,((state.x-a.x)*dx+(state.z-a.z)*dz)/l)):0;
    const distance=Math.hypot(state.x-a.x-t*dx,state.z-a.z-t*dz);
    if(!best||distance<best.distance)best={distance,progress:road.cumulative[i-1]+t*(road.cumulative[i]-road.cumulative[i-1])};
  }
  return best||{distance:0,progress:state.progress};
}
export function stepDriver(road,state,input,dt) {
  if(state.arrived||dt<=0)return state;
  dt=Math.min(dt,0.1);
  let speed=state.speed;
  if(input.brake) speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-10*dt);
  else if(input.gas) speed=Math.min(16.67,speed+3.5*dt);
  else if(input.reverse) speed=Math.max(-3,speed-2.5*dt);
  else speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-1.2*dt);
  if(state.offRoad)speed=Math.max(-2,Math.min(4,speed));
  const handling=steeringStep(state.steering,input,speed,dt);
  const heading=state.heading+handling.response*speed/6*0.5*dt;
  const next={...state,speed,heading,steering:handling.steering,braking:!!input.brake||Math.abs(speed)<Math.abs(state.speed)-.001,x:state.x+Math.sin(heading)*speed*dt,z:state.z+Math.cos(heading)*speed*dt};
  const nearest=locateDriver(road,next);
  next.progress=nearest.progress;next.offRoad=nearest.distance>5;
  const end=road.points.at(-1);
  next.arrived=next.progress>=road.distanceM-12&&Math.hypot(next.x-end.x,next.z-end.z)<15;
  if(next.arrived){Object.assign(next,roadPose(road,road.distanceM),{speed:0,steering:0,arrived:true,offRoad:false});}
  return next;
}

