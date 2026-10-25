import {streetFurniture,streetSignalAdvice} from './street-furniture.mjs';
import {nearestRoutePoint} from './street-world.mjs';
import {roadFrame,routeScenery,initialRouteTraffic,stepRouteTraffic,routeTrafficPose} from './route-3d-layout.mjs';
import {locateDriver} from './route-drive.mjs';
import {stepExpedition} from './expedition.mjs';
import {boxesOverlap,resolveMovement,collisionMessage} from './ride-collision.mjs';

const staticCache=new WeakMap();
export function routeObstacles(road,progress){
 const cell=Math.floor(progress/40);if(staticCache.get(road)?.cell===cell)return staticCache.get(road).items;
 const scenery=routeScenery(road,progress,160),items=[];
 const add=(id,x,z,width,length,heading=0,kind='scenery')=>items.push({id,x,z,width,length,heading,kind});
 const local=(b,x,z)=>({x:b.x+x*Math.cos(b.heading)+z*Math.sin(b.heading),z:b.z-x*Math.sin(b.heading)+z*Math.cos(b.heading)});
 for(const b of [...scenery.lots,...scenery.services,...(scenery.goal?[scenery.goal]:[])]){
  add(b.id,b.x,b.z,b.width+.15,b.depth+.15,b.heading);
  if(b.kind==='shop')for(const x of [-3,-1.5,1.5,3]){const p=local(b,x,b.depth/2+1.2);add(`${b.id}-crate-${x}`,p.x,p.z,1.1,.8,b.heading);}
  if(b.type==='spbu'){
   for(const x of [-2.5,2.5]){const p=local(b,x,8);add(`${b.id}-pump-${x}`,p.x,p.z,1,.9,b.heading);}
   for(const x of [-5,5]){const p=local(b,x,9);add(`${b.id}-post-${x}`,p.x,p.z,.25,.25,b.heading);}
  }
  if(b.type==='masjid'){const p=local(b,-7,0);add(`${b.id}-minaret`,p.x,p.z,1.3,1.3,b.heading);}
  if(b.id==='maqbarah-goal')for(const x of [-8,8]){const p=local(b,x,8);add(`gate-${x}`,p.x,p.z,.8,.8,b.heading);}
 }
 for(const p of scenery.props){add(p.id,p.x,p.z,.34,.34);if(p.lamp)add(`${p.id}-lamp`,p.x-p.side*1.6,p.z,.12,.12,p.heading);}
 staticCache.set(road,{cell,items});return items;
}
export function createRouteSimulation(road,initialDriver){
 let furnitureCell=null,furnitureRevision=-1,furnitureObstacles=[];
 let vehicles=initialRouteTraffic(road,initialDriver.progress),time=0;
 const vehicleObstacles=()=>vehicles.map(v=>({...routeTrafficPose(road,v),kind:'vehicle',width:v.type==='car'?1.85:.75,length:v.type==='car'?4.2:2.1}));
 function obstacles(driver){const network=road.streetWorld;if(network?.ready){const cell=network.cell(driver);if(cell!==furnitureCell||network.revision!==furnitureRevision){const f=streetFurniture(network,driver,180);furnitureObstacles=[...f.lamps.map(p=>({...p,width:.16,length:.16})),...f.trees.map(p=>({...p,width:.3,length:.3})),...f.signals.map(p=>({...p,width:.16,length:.16})),...f.benches.map(p=>({...p,width:.6,length:1.8}))];furnitureCell=cell;furnitureRevision=network.revision;}}return [...routeObstacles(road,driver.progress).filter(o=>!network?.covers(o)),...(network?.ready?network.obstacles(driver):[]),...furnitureObstacles,...vehicleObstacles()];}
 function move(previous,candidate){
  const result=resolveMovement(previous,candidate,obstacles(previous));let next=result.value;
  const network=road.streetWorld,location=network?.ready?nearestRoutePoint(road,next):locateDriver(road,next),oldLocation=network?.ready?nearestRoutePoint(road,previous):locateDriver(road,previous);
  if(location.distance>3000&&location.distance>=oldLocation.distance)return {...previous,speed:0,collision:'Batas jelajah kawasan: kembali mendekati rute tujuan.'};
  if(location.distance>60&&!network?.covers(next)&&location.distance>=oldLocation.distance)return {...previous,speed:0,collision:network?'Jalan kawasan belum dimuat. Tunggu atau buka Menu untuk mencoba lagi.':'Batas area simulasi. Mundur atau kembali ke jalur.'};
  const surface=network?.covers(next)?network.surfaceAt(next):null;
  next={...next,progress:location.distance<=10?location.progress:previous.progress,offRoad:surface? !surface.drivable:location.distance>5,collision:result.hit?collisionMessage(result.hit):''};
  const end=road.points.at(-1);
  if(!result.hit&&location.distance<10&&location.progress>=road.distanceM-12&&Math.hypot(next.x-end.x,next.z-end.z)<15)next={...next,x:end.x,z:end.z,progress:road.distanceM,speed:0,steering:0,arrived:true,offRoad:false};
  else if(location.distance>=10)next.arrived=false;
  return next;
 }
 function advance(driver,input,dt,party){
  if(dt<=0||driver.arrived)return driver;
  const seconds=Math.min(.1,dt),next=stepExpedition(road,driver,input,seconds,party,move);time+=seconds;
  vehicles=stepRouteTraffic(road,vehicles,next,seconds,time);
  next.trafficNotice=streetSignalAdvice(road.streetWorld,next,time)?.message||'';
  // Recycle behind the player only outside the longest supported view distance.
  vehicles=vehicles.map(v=>{if(Math.abs(v.progress-next.progress)<=680)return v;const progress=next.progress+650+Number(v.id.split('-').at(-1))*12;
   if(progress>=road.distanceM-8)return v;const candidate={...v,progress,speed:0},pose=routeTrafficPose(road,candidate);
   if(Math.hypot(pose.x-next.x,pose.z-next.z)<600||vehicleObstacles().some(o=>o.id!==v.id&&boxesOverlap({...pose,width:1.85,length:4.2},o,.5)))return v;
   return candidate;
  });return next;
 }
 function recover(driver){
  for(const delta of [0,-4,4,-8,8])for(const offset of [0,-2,2,-4,4]){const p=roadFrame(road,driver.progress+delta,offset),candidate={...driver,...p,speed:0,steering:0,arrived:false,collision:'',offRoad:Math.abs(offset)>5};if(obstacles(candidate).every(o=>!boxesOverlap(candidate,o,.25)))return candidate;}
  return {...driver,speed:0,collision:'Jalur sedang terhalang. Tunggu kendaraan bergerak, lalu coba lagi.'};
 }
 return {advance,recover,obstacles,get vehicles(){return vehicleObstacles();},get time(){return time;}};
}
