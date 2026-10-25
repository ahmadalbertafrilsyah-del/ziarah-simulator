import {advanceMaintenance} from './vehicle-maintenance.mjs';
import {stepDriver,locateDriver} from './route-drive.mjs';
import {advanceResources,blockedReason,METERS_PER_LITER} from './travel-resources.mjs';
export function stepExpedition(road,state,input,dt,party,resolveMove){
 if(dt<=0||state.arrived)return state;
 dt=Math.min(dt,.1);
 const r=state.resources;
 if(blockedReason(r,party))return {...state,speed:0,resources:advanceResources(r,0,dt,party)};
 let next=stepDriver(road,state,input,dt);
 if(resolveMove)next=resolveMove(state,next);
 let meters=Math.hypot(next.x-state.x,next.z-state.z);
 const allowed=r.fuel*METERS_PER_LITER;
 if(meters>allowed){const f=allowed/meters;next={...next,x:state.x+(next.x-state.x)*f,z:state.z+(next.z-state.z)*f,speed:0,arrived:false};const p=locateDriver(road,next);next.progress=p.progress;next.offRoad=p.distance>5;meters=allowed;}
 const resources=advanceMaintenance(advanceResources(r,meters,dt,party),meters,next.arrived);
 if(blockedReason(resources,party))next.speed=0;
 return {...next,resources};
}
