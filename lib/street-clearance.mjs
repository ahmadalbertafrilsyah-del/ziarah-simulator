import polygonClipping from 'polygon-clipping';
import {polygonBounds,segmentProjection} from './street-geometry.mjs';
export const BUILDING_SETBACK=1.85;
export const signedArea=ring=>ring.reduce((sum,p,i)=>sum+p.x*ring[(i+1)%ring.length].z-ring[(i+1)%ring.length].x*p.z,0)/2;
export function roadCapsule(segment,extra=BUILDING_SETBACK){
 const {a,b}=segment,r=segment.width/2+extra,heading=Math.atan2(b.z-a.z,b.x-a.x),ring=[];
 for(let i=0;i<=8;i++){const angle=heading-Math.PI/2+i*Math.PI/8;ring.push([b.x+Math.cos(angle)*r,b.z+Math.sin(angle)*r]);}
 for(let i=0;i<=8;i++){const angle=heading+Math.PI/2+i*Math.PI/8;ring.push([a.x+Math.cos(angle)*r,a.z+Math.sin(angle)*r]);}
 return [ring];
}
export function clearBuildingFootprint(building,segments){
 const polygon=building.polygon,bounds=polygonBounds(polygon),radius=Math.hypot(bounds.width,bounds.length)/2;
 const nearby=segments.filter(s=>segmentProjection(bounds,s.a,s.b).distance<=radius+s.width/2+BUILDING_SETBACK+1);
 if(!nearby.length)return [{...building,holes:building.holes||[]}];
 let result;
 try{result=polygonClipping.difference([polygon.map(p=>[p.x,p.z]),...(building.holes||[]).map(r=>r.map(p=>[p.x,p.z]))],...nearby.map(s=>roadCapsule(s)));}
 catch{return [];}// An unresolvable footprint is omitted instead of left across a road.
 return result.map((rings,i)=>{
  const polygon=rings[0].slice(0,-1).map(([x,z])=>({x,z})),holes=rings.slice(1).map(r=>r.slice(0,-1).map(([x,z])=>({x,z})));
  return {...building,...polygonBounds(polygon),id:`${building.id}:part-${i}`,polygon,holes};
 }).filter(p=>p.polygon.length>=3&&Math.abs(signedArea(p.polygon))-p.holes.reduce((a,r)=>a+Math.abs(signedArea(r)),0)>=3);
}
