import {clearBuildingFootprint} from './street-clearance.mjs';
import {validateStreetTile,inGeoBounds} from './street-data.mjs';
import {segmentProjection,polygonBounds} from './street-geometry.mjs';
export function nearestRoutePoint(road,p){let best={distance:Infinity,progress:p.progress||0};for(let i=1;i<road.points.length;i++){const q=segmentProjection(p,road.points[i-1],road.points[i]),progress=road.cumulative[i-1]+q.t*(road.cumulative[i]-road.cumulative[i-1]);if(q.distance<best.distance-.05||(Math.abs(q.distance-best.distance)<.05&&Math.abs(progress-(p.progress||0))<Math.abs(best.progress-(p.progress||0))))best={...q,progress};}return best;}
export function createStreetWorld(road){
 const tiles=new Map(),footprintCache=new Map();let sourceBuildingCount=0;let revision=0,roads=[],buildings=[],segments=[],roadGrid=new Map(),buildingGrid=new Map();
 const key=(x,z)=>`${Math.floor(x/50)}:${Math.floor(z/50)}`;
 function index(grid,item,minX,minZ,maxX,maxZ){for(let x=Math.floor(minX/50);x<=Math.floor(maxX/50);x++)for(let z=Math.floor(minZ/50);z<=Math.floor(maxZ/50);z++){const k=`${x}:${z}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(item);}}
 function query(grid,p,radius){const out=new Set();for(let x=Math.floor((p.x-radius)/50);x<=Math.floor((p.x+radius)/50);x++)for(let z=Math.floor((p.z-radius)/50);z<=Math.floor((p.z+radius)/50);z++)for(const item of grid.get(`${x}:${z}`)||[])out.add(item);return [...out];}
 function rebuild(){const roadMap=new Map(),buildingMap=new Map();for(const tile of tiles.values()){
  for(const r of tile.roads){const key=r.id+':'+r.coordinates[0].join(',')+':'+r.coordinates.at(-1).join(',');roadMap.set(key,{...r,id:key,points:r.coordinates.map(road.fromGeo)});}
  for(const b of tile.buildings){const polygon=b.coordinates.map(road.fromGeo),bounds=polygonBounds(polygon);if(bounds.width<.5||bounds.length<.5||bounds.width>350||bounds.length>350)continue;buildingMap.set(b.id,{...b,...bounds,polygon,kind:'scenery'});}
 }roads=[...roadMap.values()];sourceBuildingCount=buildingMap.size;buildings=[];segments=[];roadGrid=new Map();buildingGrid=new Map();
 for(const r of roads)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],segment={id:`${r.id}:${i}`,a,b,width:r.width,road:r};segments.push(segment);index(roadGrid,segment,Math.min(a.x,b.x)-r.width,Math.min(a.z,b.z)-r.width,Math.max(a.x,b.x)+r.width,Math.max(a.z,b.z)+r.width);}
 for(const b of buildingMap.values()){
  const nearby=query(roadGrid,b,Math.hypot(b.width,b.length)/2+22),signature=b.id+':'+b.polygon.map(p=>`${p.x.toFixed(3)},${p.z.toFixed(3)}`).join(';')+':'+nearby.map(s=>s.id+':'+s.width).join('|');
  let parts=footprintCache.get(signature);if(!parts){parts=clearBuildingFootprint(b,nearby);footprintCache.set(signature,parts);}
  if(!parts.length)continue;const bounds=polygonBounds(parts.flatMap(p=>p.polygon)),building={...b,...bounds,parts,polygon:parts[0].polygon};buildings.push(building);
  index(buildingGrid,building,bounds.x-bounds.width/2,bounds.z-bounds.length/2,bounds.x+bounds.width/2,bounds.z+bounds.length/2);
 }
 while(footprintCache.size>22000)footprintCache.delete(footprintCache.keys().next().value);revision++;
 }
 function add(data){validateStreetTile(data);tiles.delete(data.id);tiles.set(data.id,data);while(tiles.size>5)tiles.delete(tiles.keys().next().value);rebuild();return snapshot();}
 function covers(p,margin=0){const geo=road.toGeo(p),pad=margin/111320;return [...tiles.values()].some(t=>inGeoBounds(geo,[t.bounds[0]+pad,t.bounds[1]+pad,t.bounds[2]-pad,t.bounds[3]-pad]));}
 function surfaceAt(p){let best=null;for(const s of query(roadGrid,p,25)){const q=segmentProjection(p,s.a,s.b);if(!best||q.distance-s.width/2<best.distance-best.width/2)best={...q,width:s.width,name:s.road.name,road:s.road};}return best?{...best,drivable:best.distance<=best.width/2+.65}:null;}
 function laneOffset(p){const s=surfaceAt(p);return s?.drivable?-Math.min(1.9,Math.max(.45,s.width*.23)):-1.9;}
 function nearby(p,range=420){return {roads:[...new Set(query(roadGrid,p,range).filter(s=>segmentProjection(p,s.a,s.b).distance<range+s.width).map(s=>s.road))],buildings:query(buildingGrid,p,range).filter(b=>Math.hypot(b.x-p.x,b.z-p.z)<range+Math.hypot(b.width,b.length)/2).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))};}
 function snapshot(){return {revision,tiles:tiles.size,roads:roads.length,buildings:sourceBuildingCount,renderBuildings:buildings.length};}
 return {add,covers,surfaceAt,laneOffset,nearby,segmentsNear:(p,r=30)=>query(roadGrid,p,r),obstacles:(p,r=70)=>query(buildingGrid,p,r).flatMap(b=>b.parts||[b]),snapshot,get revision(){return revision;},get ready(){return tiles.size>0;},get segments(){return segments;},get roads(){return roads;},get buildings(){return buildings;},cell:key};
}
