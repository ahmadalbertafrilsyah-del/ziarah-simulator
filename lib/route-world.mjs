import {getFacilities} from './route-facilities.mjs';
// Stylized road surface follows the route's geographic bends, with a fixed game width.
export function routeFaces(road,state) {
 const faces=[];const face=(points,color,layer)=>faces.push({points,color,layer});
 const {x,z}=state;
 face([[x-650,0,z-650],[x+650,0,z-650],[x+650,0,z+650],[x-650,0,z+650]],'#adc98c',0);
 const normal=i=>{
  const a=road.points[Math.max(0,i-1)],b=road.points[Math.min(road.points.length-1,i+1)];
  const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1;return [dz/n,-dx/n];
 };
 for(let i=1;i<road.points.length;i++){
  if(road.cumulative[i]<state.progress-350||road.cumulative[i-1]>state.progress+550)continue;
  const a=road.points[i-1],b=road.points[i],na=normal(i-1),nb=normal(i);
  const strip=(w,y)=>[[a.x+na[0]*w,y,a.z+na[1]*w],[b.x+nb[0]*w,y,b.z+nb[1]*w],[b.x-nb[0]*w,y,b.z-nb[1]*w],[a.x-na[0]*w,y,a.z-na[1]*w]];
  face(strip(5.5,.01),'#e6d7ae',1);face(strip(4.5,.03),'#73817e',2);
  // Subdivide markings so long geometry segments do not become unbroken lines.
  const length=Math.hypot(b.x-a.x,b.z-a.z),nx=na[0]*.06,nz=na[1]*.06;
  for(let d=0;d<length;d+=12){const t=d/length,u=Math.min(d+5,length)/length;
   const ax=a.x+(b.x-a.x)*t,az=a.z+(b.z-a.z)*t,bx=a.x+(b.x-a.x)*u,bz=a.z+(b.z-a.z)*u;
   face([[ax+nx,.05,az+nz],[bx+nx,.05,bz+nz],[bx-nx,.05,bz-nz],[ax-nx,.05,az-nz]],'#fff2c6',3);
  }
 }
 return faces;
}

// Deterministic roadside decorations. These are not surveyed map buildings.
export function roadsideBuildings(road,state) {
 const result=[],spacing=Math.max(80,Math.ceil(road.distanceM/2500));
 for(let d=Math.max(0,Math.floor((state.progress-100)/spacing)*spacing);d<=Math.min(road.distanceM,state.progress+360);d+=spacing){
  const i=Math.floor(d/spacing);
  const a=poseAt(road,d);
  for(const side of [-1,1]){
   const offset=17+(i%3)*4,x=a.x+Math.cos(a.heading)*offset*side,z=a.z-Math.sin(a.heading)*offset*side;
   // Avoid placing decorations across nearby hairpins on the road corridor.
   let blocked=false;
   for(let j=1;j<road.points.length;j++){
    const p=road.points[j-1],q=road.points[j],dx=q.x-p.x,dz=q.z-p.z,l=dx*dx+dz*dz;
    const t=l?Math.max(0,Math.min(1,((x-p.x)*dx+(z-p.z)*dz)/l)):0;
    if(Math.hypot(x-p.x-t*dx,z-p.z-t*dz)<10){blocked=true;break;}
   }
   if(getFacilities(road).some(f=>Math.hypot(f.x-x,f.z-z)<35))blocked=true;
   if(!blocked)result.push({x,z,key:['rumah','warung','minimarket','hotel','masjid','bengkel'][(i*2+(side===1?1:0))%6],height:7+(i%3)*2,color:['#dfcaa7','#c4d5b0','#c9b7a1'][i%3]});
  }
 }
 return result;
}
function poseAt(road,d){let i=1;while(i<road.points.length-1&&road.cumulative[i]<d)i++;const a=road.points[i-1],b=road.points[i];const f=(d-road.cumulative[i-1])/(road.cumulative[i]-road.cumulative[i-1]||1);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,heading:Math.atan2(b.x-a.x,b.z-a.z)};}
export function buildingFaces(buildings){const faces=[];for(const b of buildings){const w=4,h=b.height,depth=3;const a=[b.x-w,.1,b.z-depth],c=[b.x+w,.1,b.z+depth],p=[c[0],.1,a[2]],q=[a[0],.1,c[2]];const up=v=>[v[0],h,v[2]];for(const [v,u] of [[a,p],[p,c],[c,q],[q,a]])faces.push({points:[v,u,up(u),up(v)],color:b.color,layer:4});faces.push({points:[up(a),up(p),up(c),up(q)],color:'#8d6653',layer:4});const ridge1=[b.x,h+2,b.z-depth],ridge2=[b.x,h+2,b.z+depth];faces.push({points:[up(a),ridge1,ridge2,up(q)],color:'#a86e4b',layer:4},{points:[ridge1,up(p),up(c),ridge2],color:'#915e46',layer:4});}return faces;}
