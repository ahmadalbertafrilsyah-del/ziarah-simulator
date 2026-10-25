import {polygonBoxOverlap} from './street-geometry.mjs';
// Ground-plane oriented rectangles, shared by route and city physics.
export function vehicleBox(value){return {...value,width:value.width??(value.type==='car'?1.85:.85),length:value.length??(value.type==='car'?4.2:2.1),heading:value.heading||0};}
export function boxesOverlap(first,second,margin=.08){
 const a=vehicleBox(first),b=vehicleBox(second),axes=[];
 if(b.polygon)return polygonBoxOverlap(a,b.polygon,margin,b.holes);if(a.polygon)return polygonBoxOverlap(b,a.polygon,margin,a.holes);
 for(const o of [a,b]){axes.push([Math.cos(o.heading),-Math.sin(o.heading)],[Math.sin(o.heading),Math.cos(o.heading)]);}
 for(const [x,z] of axes){
  const radius=o=>(o.width/2+margin)*Math.abs(x*Math.cos(o.heading)-z*Math.sin(o.heading))+(o.length/2+margin)*Math.abs(x*Math.sin(o.heading)+z*Math.cos(o.heading));
  if(Math.abs((a.x-b.x)*x+(a.z-b.z)*z)>=radius(a)+radius(b))return false;
 }
 return true;
}
export function resolveMovement(previous,candidate,obstacles){
 const distance=Math.hypot(candidate.x-previous.x,candidate.z-previous.z),turn=Math.atan2(Math.sin(candidate.heading-previous.heading),Math.cos(candidate.heading-previous.heading));
 // Step along the whole sweep, including rotation, to stop thin-obstacle tunneling.
 const steps=Math.max(1,Math.ceil(distance/.12),Math.ceil(Math.abs(turn)/.04));
 const interpolate=t=>({...candidate,x:previous.x+(candidate.x-previous.x)*t,z:previous.z+(candidate.z-previous.z)*t,heading:previous.heading+turn*t});
 const radius=Math.max(previous.length||2.1,candidate.length||2.1)/2+1;
 const nearby=obstacles.filter(o=>Math.hypot(o.x-previous.x,o.z-previous.z)<distance+radius+Math.hypot(o.width||1,o.length||1)/2+1);
 const embedded=new Set(nearby.filter(o=>boxesOverlap(previous,o)).map(o=>o.id));
 const hitAt=value=>nearby.find(o=>{
  if(!boxesOverlap(value,o))return false;
  // Older saves can contain a position inside scenery. Permit outward movement.
  if(embedded.has(o.id)&&Math.hypot(value.x-o.x,value.z-o.z)>Math.hypot(previous.x-o.x,previous.z-o.z)+1e-7)return false;
  return true;
 });
 for(let i=1;i<=steps;i++){
  const hit=hitAt(interpolate(i/steps));if(!hit)continue;
  let low=(i-1)/steps,high=i/steps;
  for(let j=0;j<12;j++){const middle=(low+high)/2;if(hitAt(interpolate(middle)))high=middle;else low=middle;}
  return {value:{...interpolate(Math.max(0,low-1e-5)),speed:0,arrived:false},hit};
 }
 return {value:candidate,hit:null};
}
export function collisionMessage(hit){return hit?.kind==='vehicle'?'Ada kendaraan. Rem, mundur, atau cari ruang untuk lewat.':hit?.kind==='boundary'?'Batas area simulasi. Mundur atau kembali ke jalur.':hit?'Ada penghalang. Mundur atau ubah arah.':'';}
