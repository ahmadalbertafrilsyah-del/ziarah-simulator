import {roadPose} from './route-drive.mjs';
import {getFacilities} from './route-facilities.mjs';
export function roadsideProps(road,progress,detail){
 const spacing=55,result=[],range=Math.min(detail.viewDistance||420,240),start=Math.max(0,Math.floor((progress-80)/spacing)*spacing);
 for(let d=start;d<Math.min(road.distanceM,progress+range);d+=spacing){const i=Math.round(d/spacing);if(detail.decorations===.5&&i%2)continue;const p=roadPose(road,d);
  for(const side of [-1,1]){const offset=12+(i%3)*3,x=p.x+Math.cos(p.heading)*side*offset,z=p.z-Math.sin(p.heading)*side*offset;
   if(getFacilities(road).some(f=>Math.hypot(f.x-x,f.z-z)<25))continue;
   // Keep props out of nearby road corridors, including nonadjacent bends.
   let blocked=false;for(let j=1;j<road.points.length;j++){const a=road.points[j-1],b=road.points[j],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)):0;if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<9){blocked=true;break;}}
   if(!blocked)result.push({x,z,type:i%3===0&&side===1?'lamp':'tree',height:5+(i%3)*.65});
  }
 }
 return result;
}
export function shadowFace(x,z,rx,rz,opacity=.18,heading=0){const points=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,dx=Math.cos(a)*rx,dz=Math.sin(a)*rz;return [x+dx*Math.cos(heading)+dz*Math.sin(heading),.065,z-dx*Math.sin(heading)+dz*Math.cos(heading)];});return {points,color:'#112c27',layer:3.5,opacity,unlit:true};}
export function propFaces(props,light){
 const faces=[];const face=(points,color,extra={})=>faces.push({points,color,layer:4,...extra});
 function box(x,z,w,y,h,color){const a=[x-w,y,z-w],b=[x+w,y,z-w],c=[x+w,y,z+w],d=[x-w,y,z+w],up=p=>[p[0],p[1]+h,p[2]];for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])face([p,q,up(q),up(p)],color);face([up(a),up(b),up(c),up(d)],color);}
 for(const p of props){
  if(p.type==='tree'){box(p.x,p.z,.16,0,p.height*.65,'#80634b');for(let ring=0;ring<2;ring++){const y=p.height*.36+ring*.95,r=ring?1.35:1.85;for(let i=0;i<7;i++){const a=i*Math.PI*2/7,b=(i+1)*Math.PI*2/7;face([[p.x+Math.cos(a)*r,y,p.z+Math.sin(a)*r],[p.x,y+2.7,p.z],[p.x+Math.cos(b)*r,y,p.z+Math.sin(b)*r]],ring?'#60875c':'#507a57');}}faces.push(shadowFace(p.x+1,p.z-.4,2.5,1.3,.12*light.daylight));}
  else {box(p.x,p.z,.09,0,p.height,'#606d66');box(p.x,p.z,.48,p.height,.16,'#d4d2ae');if(light.lamps>.05){face([[p.x-.38,p.height-.02,p.z-.28],[p.x+.38,p.height-.02,p.z-.28],[p.x+.38,p.height-.02,p.z+.28],[p.x-.38,p.height-.02,p.z+.28]],'#fff1b6',{unlit:true});const glow=shadowFace(p.x,p.z,3,3,.08*light.lamps);glow.color='#ffdd89';faces.push(glow);}}
 }
 return faces;
}
export function headlightFace(state,light){
 if(light.lamps<=.05)return [];
 const p=(x,z)=>[state.x+x*Math.cos(state.heading)+z*Math.sin(state.heading),.075,state.z-x*Math.sin(state.heading)+z*Math.cos(state.heading)];
 return [{points:[p(-.15,1),p(.15,1),p(4,22),p(-4,22)],color:'#fff0b3',layer:3.7,opacity:light.lamps*.12,unlit:true}];
}
