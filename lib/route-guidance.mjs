import {roadFrame,roadSamples} from './route-3d-layout.mjs';

// Shared geographic road, in metres. Nothing here changes vehicle physics.
export const GUIDE_LANE=-1.9;
export function roadStripVertices(samples,left,right,y=0,anchor={x:0,z:0}){
 const vertices=[];
 const point=(p,offset)=>[p.x+Math.cos(p.heading)*offset-anchor.x,y,p.z-Math.sin(p.heading)*offset-anchor.z];
 for(let i=1;i<samples.length;i++){
  const a=point(samples[i-1],left),b=point(samples[i],left),c=point(samples[i],right),d=point(samples[i-1],right);
  vertices.push(...a,...b,...c,...a,...c,...d);
 }
 return vertices;
}
export function routeGuidance(road,progress,range=220){
 const center=Math.floor(Math.max(0,Math.min(road.distanceM,progress))/8)*8;
 const start=Math.max(0,center-12),end=Math.min(road.distanceM,center+Math.max(24,Math.min(220,range)));
 const anchor=roadFrame(road,center),samples=roadSamples(road,start,end,3);
 const lane=p=>road.streetWorld?.laneOffset(p)??GUIDE_LANE;
 const shifted=samples.map(q=>{const offset=lane(q)-GUIDE_LANE;return {...q,x:q.x+Math.cos(q.heading)*offset,z:q.z-Math.sin(q.heading)*offset};});
 const ribbon=roadStripVertices(shifted,GUIDE_LANE-.5,GUIDE_LANE+.5,.118,anchor),arrows=[],markers=[];
 const vertex=(distance,offset)=>{const p=roadFrame(road,distance,lane(roadFrame(road,distance))+offset);return [p.x-anchor.x,.135,p.z-anchor.z];};
 const triangle=(d,...points)=>points.forEach(([offset,along])=>arrows.push(...vertex(d+along,offset)));
 // Each arrow points forward along this route even when the rider faces backwards.
 for(let d=Math.ceil((start+2)/12)*12;d<=end-2;d+=12){
  triangle(d,[-.8,0],[0,1.35],[.8,0]);
  triangle(d,[-.26,-1.1],[-.26,0],[.26,0]);triangle(d,[-.26,-1.1],[.26,0],[.26,-1.1]);
  markers.push({...roadFrame(road,d,lane(roadFrame(road,d))),progress:d});
 }
 return {anchor,start,end,ribbon,arrows,markers};
}
