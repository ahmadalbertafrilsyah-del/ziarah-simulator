import {polygonBoxOverlap} from './street-geometry.mjs';
export function safeFollowCamera(target,desired,obstacles){
 const distance=Math.hypot(desired.x-target.x,desired.z-target.z),steps=Math.max(1,Math.ceil(distance/.16));
 const at=t=>({x:target.x+(desired.x-target.x)*t,z:target.z+(desired.z-target.z)*t,y:target.y+(desired.y-target.y)*t});
 const inside=(p,o)=>{
  if(p.y>(o.height||8)+1.9)return false;
  if(o.polygon)return polygonBoxOverlap({...p,width:.55,length:.55,heading:0},o.polygon,0,o.holes||[]);
  const co=Math.cos(o.heading||0),si=Math.sin(o.heading||0),dx=p.x-o.x,dz=p.z-o.z;return Math.abs(dx*co-dz*si)<o.width/2+.3&&Math.abs(dx*si+dz*co)<(o.length||o.depth)/2+.3;
 };
 for(let i=1;i<=steps;i++){const t=i/steps;if(obstacles.some(o=>inside(at(t),o)))return {...at(Math.max(0,(i-1)/steps-.03)),shortened:true};}
 return {...desired,shortened:false};
}
