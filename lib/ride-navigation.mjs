import {roadSamples} from './route-3d-layout.mjs';
import {roadPose,locateDriver} from './route-drive.mjs';
export function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function buildNavigation(road){
 const turns=[];
 for(let i=1;i<road.points.length-1;i++){
  const progress=road.cumulative[i];if(progress<12||progress>road.distanceM-18)continue;
  const before=roadPose(road,Math.max(0,progress-12)),after=roadPose(road,Math.min(road.distanceM,progress+12));
  const angle=angleDifference(after.heading,before.heading),degrees=Math.abs(angle)*180/Math.PI;
  if(degrees<28)continue;
  const turn={progress,angle,degrees,direction:degrees>=150?'uturn':angle>0?'right':'left'};
  const previous=turns.at(-1);
  if(previous&&progress-previous.progress<32&&Math.sign(previous.angle)===Math.sign(angle)){if(degrees>previous.degrees)turns[turns.length-1]=turn;}
  else turns.push(turn);
 }
 return turns;
}
export function navigationState(road,driver,turns){
 const remaining=Math.max(0,road.distanceM-driver.progress),nearest=locateDriver(road,driver);
 const offRoute=nearest.distance>12;
 const heading=roadPose(road,Math.min(road.distanceM,driver.progress+10)).heading;
 const wrongWay=!offRoute&&Math.abs(driver.speed)>1&&Math.abs(angleDifference(driver.heading,heading))>Math.PI*.6&&driver.speed>0;
 const turn=turns.find(t=>t.progress>=driver.progress-6);
 let kind='straight',instruction='Ikuti jalur',distance=remaining;
 if(driver.arrived){kind='arrived';instruction='Sudah tiba';distance=0;}
 else if(offRoute){kind='offroute';instruction='Kembali mendekati jalur';distance=nearest.distance;}
 else if(wrongWay){kind='wrongway';instruction='Arah berlawanan dengan rute';distance=remaining;}
 else if(remaining<=30){kind='arrival';instruction='Tujuan di depan';}
 else if(turn){kind=turn.direction;instruction=kind==='uturn'?'Ikuti putaran jalan':`${turn.degrees>110?'Tikungan tajam':'Belok'} ${kind==='right'?'kanan':'kiri'}`;distance=Math.max(0,turn.progress-driver.progress);}
 const target=roadPose(road,Math.min(road.distanceM,driver.progress+35));
 return {kind,instruction,distance,remaining,offRoute,wrongWay,offset:nearest.distance,bearing:angleDifference(Math.atan2(target.x-driver.x,target.z-driver.z),driver.heading)};
}
// Remove details smaller than a minimap pixel without skipping a visible corner.
function compactMapPoints(points,tolerance){
 if(points.length<3)return points;
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],epsilon=tolerance*tolerance;
 while(stack.length){const [first,last]=stack.pop(),a=points[first],b=points[last],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;let max=epsilon,index=-1;
  for(let i=first+1;i<last;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0,d=(p.x-a.x-t*dx)**2+(p.z-a.z-t*dz)**2;if(d>max){max=d;index=i;}}
  if(index!==-1){keep.add(index);stack.push([first,index],[index,last]);}
 }
 const result=[...keep].sort((a,b)=>a-b).map(i=>points[i]);
 return result.length<=400?result:Array.from({length:400},(_,i)=>result[Math.round(i*(result.length-1)/399)]);
}
// North-up local sketch. Bounds are clipped by the SVG, with a constant metre scale.
export function minimapGeometry(road,driver,range=180){
 const scale=65/range,point=p=>({x:80+(p.x-driver.x)*scale,y:60-(p.z-driver.z)*scale});
 const begin=Math.max(0,driver.progress-range*2),end=Math.min(road.distanceM,driver.progress+range*2);
 const makePath=points=>compactMapPoints(points,.35/scale).map((p,i)=>{const q=point(p);return `${i?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`;}).join(' ');
 const path=makePath(roadSamples(road,begin,end,Math.max(3,(end-begin)/180)));
 const aheadPath=makePath(roadSamples(road,driver.progress,end,Math.max(3,(end-driver.progress)/120)));
 const destination=point(road.points.at(-1)),destinationVisible=destination.x>=5&&destination.x<=155&&destination.y>=5&&destination.y<=115;
 const ahead=point(roadPose(road,Math.min(road.distanceM,driver.progress+35)));
 const heading=Number.isFinite(driver.heading)?driver.heading*180/Math.PI:0;
 return {path,aheadPath,point,destination,destinationVisible,ahead,heading,metresPerPixel:1/scale};
}
