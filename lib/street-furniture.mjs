import {segmentProjection,pointInPolygon} from './street-geometry.mjs';
const cache=new WeakMap();
export function streetJunctions(network){
 const saved=cache.get(network);if(saved?.revision===network.revision)return saved.junctions;
 const nodes=new Map(),key=p=>`${p.x.toFixed(1)}:${p.z.toFixed(1)}`;
 for(const s of network.segments||[])for(const [p,other] of [[s.a,s.b],[s.b,s.a]]){const id=key(p);if(!nodes.has(id))nodes.set(id,{id,x:p.x,z:p.z,links:new Map()});const q=nodes.get(id),angle=Math.atan2(other.x-p.x,other.z-p.z),sector=Math.round(angle/.12);const old=q.links.get(sector);if(!old||s.width>old.width)q.links.set(sector,{heading:angle,width:s.width});}
 const junctions=[...nodes.values()].filter(n=>n.links.size>=3).map(n=>({...n,links:[...n.links.values()],signal:n.links.size>=4&&[...n.links.values()].filter(l=>l.width>=5.5).length>=4}));cache.set(network,{revision:network.revision,junctions});return junctions;
}
export function streetFurniture(network,player,range=300){
 const near=network.nearby(player,range),junctions=streetJunctions(network).filter(j=>Math.hypot(j.x-player.x,j.z-player.z)<range),lamps=[],trees=[],benches=[],signals=[],crossings=[],seen=new Set();
 const surfaceClear=(p,r=.2)=>{const s=network.surfaceAt(p);return !s||s.distance>s.width/2+r;};
 const buildingClear=(p,r=.4)=>network.obstacles(p,8).every(b=>!pointInPolygon(p,b.polygon)&&b.polygon.every((a,i)=>segmentProjection(p,a,b.polygon[(i+1)%b.polygon.length]).distance>r));
 for(const road of near.roads){if(road.width<3.2)continue;let next=12,travel=0,index=0;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),heading=Math.atan2(b.x-a.x,b.z-a.z);if(length<.01)continue;
   while(next<=travel+length){const t=(next-travel)/length,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},side=index%2?1:-1,offset=road.width/2+1.1,q={x:p.x+Math.cos(heading)*offset*side,z:p.z-Math.sin(heading)*offset*side,heading};index++;next+=36;
    const id=`${Math.round(q.x)}:${Math.round(q.z)}`;if(seen.has(id)||Math.hypot(q.x-player.x,q.z-player.z)>range||junctions.some(j=>Math.hypot(j.x-q.x,j.z-q.z)<11)||!surfaceClear(q,.45)||!buildingClear(q,.45))continue;
    seen.add(id);lamps.push({...q,id:'lamp-'+id,side});
    if((road.osmId+index)%3===0){const tree={...q,x:p.x+Math.cos(heading)*(offset+1.8)*side,z:p.z-Math.sin(heading)*(offset+1.8)*side};if(surfaceClear(tree,1.4)&&buildingClear(tree,1.5))trees.push({...tree,id:'tree-'+id});}
    if((road.osmId+index)%5===0){const bench={...q,x:q.x+Math.sin(heading)*4,z:q.z+Math.cos(heading)*4};if(surfaceClear(bench,.6)&&buildingClear(bench,1.3))benches.push({...bench,id:'bench-'+id});}
   }travel+=length;
  }
 }
 // Small landscaped pockets in unbuilt spaces. These trees are illustrative, not surveyed OSM objects.
 for(let gx=Math.floor((player.x-range)/32);gx<=Math.ceil((player.x+range)/32);gx++)for(let gz=Math.floor((player.z-range)/32);gz<=Math.ceil((player.z+range)/32);gz++){
  const hash=Math.abs((gx*73856093)^(gz*19349663));if(hash%5)continue;
  const p={x:gx*32+(hash%13)-6,z:gz*32+((hash>>4)%13)-6,heading:0,id:`pocket-tree-${gx}-${gz}`};
  if(trees.length<45&&Math.hypot(p.x-player.x,p.z-player.z)<range&&network.covers(p,8)&&surfaceClear(p,3)&&buildingClear(p,2.2))trees.push(p);
 }
 for(const junction of junctions)for(const [i,link] of junction.links.entries()){
  if(link.width<5.4)continue;const distance=link.width/2+5,p={x:junction.x+Math.sin(link.heading)*distance,z:junction.z+Math.cos(link.heading)*distance,heading:link.heading,width:link.width};
  crossings.push({...p,id:`cross-${junction.id}-${i}`});
  if(junction.signal){const side=link.width/2+1.05,q={...p,x:p.x+Math.cos(link.heading)*side,z:p.z-Math.sin(link.heading)*side};if(surfaceClear(q,.3)&&buildingClear(q,.5))signals.push({...q,id:`signal-${junction.id}-${i}`,junctionId:junction.id,axis:Math.abs(Math.cos(link.heading))>=Math.abs(Math.sin(link.heading))?'z':'x'});}
 }
 return {lamps,trees,benches,signals,crossings,junctions};
}
export function geographicSignalColor(time,axis){const t=((time%46)+46)%46;if(axis==='z')return t<18?'green':t<21?'amber':'red';return t>=23&&t<41?'green':t>=41&&t<44?'amber':'red';}
export function streetSignalAdvice(network,player,time){if(!network?.ready)return null;let best=null;
 for(const junction of streetJunctions(network)){if(!junction.signal)continue;for(const link of junction.links){if(link.width<5.4)continue;const dx=player.x-junction.x,dz=player.z-junction.z,along=dx*Math.sin(link.heading)+dz*Math.cos(link.heading),lateral=Math.abs(dx*Math.cos(link.heading)-dz*Math.sin(link.heading));if(along<5||along>55||lateral>link.width/2+1||Math.cos(player.heading-link.heading)>-.65)continue;const axis=Math.abs(Math.cos(link.heading))>=Math.abs(Math.sin(link.heading))?'z':'x',color=geographicSignalColor(time,axis),distance=Math.max(0,along-(link.width/2+8));if(!best||distance<best.distance)best={color,distance,junctionId:junction.id,message:color==='red'?'Lampu merah di depan. Berhenti sebelum zebra cross.':color==='amber'?'Lampu kuning. Perlambat dan bersiap berhenti.':''};}}
 return best;
}
const routeStopCache=new WeakMap();
export function nextRouteSignal(road,vehicle,time){
 const network=road.streetWorld;if(!network?.ready)return null;let saved=routeStopCache.get(road);
 if(saved?.revision!==network.revision){const stops=[];for(const j of streetJunctions(network)){if(!j.signal)continue;let best=null;for(let i=1;i<road.points.length;i++){const p=segmentProjection(j,road.points[i-1],road.points[i]);if(!best||p.distance<best.distance)best={...p,progress:road.cumulative[i-1]+p.t*(road.cumulative[i]-road.cumulative[i-1]),heading:Math.atan2(road.points[i].x-road.points[i-1].x,road.points[i].z-road.points[i-1].z)};}if(best?.distance<8){const width=Math.max(5.5,...j.links.map(l=>l.width)),axis=Math.abs(Math.cos(best.heading))>=Math.abs(Math.sin(best.heading))?'z':'x';stops.push({...best,width,axis});}}saved={revision:network.revision,stops};routeStopCache.set(road,saved);}
 let result=null;for(const stop of saved.stops){const distance=(stop.progress-vehicle.progress)*vehicle.dir-stop.width/2-8-(vehicle.type==='car'?2.1:1.05);if(distance<0||distance>110)continue;const color=geographicSignalColor(time,stop.axis);if(color==='green')continue;if(!result||distance<result.distance)result={distance,color};}return result;
}
