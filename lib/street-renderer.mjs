import * as THREE from 'three';
import {segmentProjection} from './street-geometry.mjs';
import {streetFurniture,geographicSignalColor} from './street-furniture.mjs';
import {createCityTextures} from './city-textures.mjs';
export function createStreetRenderer(world,road){
 const root=new THREE.Group();root.name='osm-neighbourhood-hd';world.add(root);
 const textures=createCityTextures();
 const materials=[new THREE.MeshStandardMaterial({color:'#e3e0d1',map:textures.paving,roughness:.95,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({color:'#727b80',map:textures.asphalt,roughness:.97,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({vertexColors:true,map:textures.facade,roughness:.86,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({vertexColors:true,map:textures.roof,roughness:.86,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})];
 let revision=-1,cell='',range=0,summary={roads:0,buildings:0},signals=[];
 function clear(){for(const child of root.children){child.geometry.dispose();if(child.userData.signal)child.material.dispose();}root.clear();signals=[];}
 function updateSignals(time){for(const {obj,axis,color} of signals){const on=geographicSignalColor(time,axis)===color;obj.material.color.set(on?{red:'#ff4931',amber:'#ffc246',green:'#39df84'}[color]:'#24352f');obj.material.emissiveIntensity=on?1.6:0;}}
 function update(player,viewDistance,time=0){const network=road.streetWorld;if(!network?.ready){if(revision!==-1){clear();revision=-1;}return;}
  const next=`${Math.floor(player.x/40)}:${Math.floor(player.z/40)}`;if(revision===network.revision&&next===cell&&range===viewDistance){updateSignals(time);return;}
  clear();revision=network.revision;cell=next;range=viewDistance;
  const anchor={x:Math.floor(player.x/40)*40,z:Math.floor(player.z/40)*40};root.position.set(anchor.x,0,anchor.z);
  const near=network.nearby(player,viewDistance+45),batches=Array.from({length:7},()=>({positions:[],colors:[],uv:[]}));
  const V=(p,y)=>[p.x-anchor.x,y,p.z-anchor.z],white=new THREE.Color('#ffffff');
  function triangle(index,points,color=white,uv){const b=batches[index],c=typeof color==='string'?new THREE.Color(color):color;b.positions.push(...points.flat());for(let i=0;i<3;i++){b.colors.push(c.r,c.g,c.b);b.uv.push(...(uv?.[i]||[points[i][0]/3,points[i][2]/3]));}}
  function quad(index,a,b,c,d,color=white,uv){triangle(index,[a,b,c],color,uv&&[uv[0],uv[1],uv[2]]);triangle(index,[a,c,d],color,uv&&[uv[0],uv[2],uv[3]]);}
  function box(index,p,y,w,h,l,color,heading=0){const co=Math.cos(heading),si=Math.sin(heading),v=(x,dy,z)=>[p.x-anchor.x+x*co+z*si,y+dy,p.z-anchor.z-x*si+z*co],a=v(-w/2,0,-l/2),b=v(w/2,0,-l/2),c=v(w/2,0,l/2),d=v(-w/2,0,l/2),e=v(-w/2,h,-l/2),f=v(w/2,h,-l/2),g=v(w/2,h,l/2),q=v(-w/2,h,l/2);for(const points of [[a,b,f,e],[b,c,g,f],[c,d,q,g],[d,a,e,q],[e,f,g,q]])quad(index,...points,color);}
  function disk(index,p,r,y,color=white){for(let i=0;i<12;i++)triangle(index,[V(p,y),V({x:p.x+Math.cos(i*Math.PI/6)*r,z:p.z+Math.sin(i*Math.PI/6)*r},y),V({x:p.x+Math.cos((i+1)*Math.PI/6)*r,z:p.z+Math.sin((i+1)*Math.PI/6)*r},y)],color);}
  function ball(p,y,rx,ry,rz,color){for(let j=0;j<6;j++)for(let i=0;i<10;i++){const point=(a,b)=>[p.x-anchor.x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,p.z-anchor.z+Math.sin(a)*Math.sin(b)*rz];quad(5,point(j*Math.PI/6,i*Math.PI/5),point((j+1)*Math.PI/6,i*Math.PI/5),point((j+1)*Math.PI/6,(i+1)*Math.PI/5),point(j*Math.PI/6,(i+1)*Math.PI/5),color);}}
  const clearWalk=p=>{const s=network.surfaceAt(p);return !s||s.distance>=s.width/2+.06;};
  for(const street of near.roads)for(let i=1;i<street.points.length;i++){
   const a=street.points[i-1],b=street.points[i];if(segmentProjection(player,a,b).distance>viewDistance+50)continue;
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.01)continue;const nx=dz/len,nz=-dx/len,r=street.width/2,heading=Math.atan2(dx,dz);
   const p=(t,o)=>({x:a.x+dx*t+nx*o,z:a.z+dz*t+nz*o});
   quad(1,V(p(0,-r),.09),V(p(1,-r),.09),V(p(1,r),.09),V(p(0,r),.09));disk(1,a,r,.09);disk(1,b,r,.09);
   const count=Math.ceil(len/3);
   for(let n=0;n<count;n++)for(const side of [-1,1]){const t=n/count,u=(n+1)/count,walk=[p(t,side*(r+.22)),p(u,side*(r+.22)),p(u,side*(r+1.6)),p(t,side*(r+1.6))];if(!walk.every(clearWalk))continue;
    quad(0,...walk.map(q=>V(q,.17)));const middle=p((t+u)/2,side*(r+.14));box(4,middle,.08,.18,.19,len/count-.025,(n+Math.floor(a.x+a.z))%3===0?'#e6e2d4':'#687471',heading);
   }
   if(street.width>=6.5)for(let d=3;d<len;d+=9){const middle=p(d/len,0),other=network.segmentsNear(middle,12).some(s=>s.road.osmId!==street.osmId&&segmentProjection(middle,s.a,s.b).distance<s.width/2+5);if(!other)box(6,middle,.109,.1,.009,3.8,'#f0e8cd',heading);}
  }
  const visible=near.buildings.slice(0,viewDistance<=260?550:viewDistance<=420?1000:1500);
  for(const building of visible)for(const part of building.parts||[building]){
   const poly=part.polygon,holes=part.holes||[],height=building.height===6?([3.8,5.8,6.5][building.osmId%3]):building.height;
   const shape=poly.map(p=>new THREE.Vector2(p.x-anchor.x,p.z-anchor.z)),holeShapes=holes.map(r=>r.map(p=>new THREE.Vector2(p.x-anchor.x,p.z-anchor.z))),all=[...poly,...holes.flat()],faces=THREE.ShapeUtils.triangulateShape(shape,holeShapes);
   const color=new THREE.Color(['#e8d5ba','#d3dece','#f1d5bf','#ceded9','#eee5ce','#c5d8d0'][building.osmId%6]),roofColor=new THREE.Color(['#b67752','#bf8460','#a9876b','#a7684b'][building.osmId%4]);
   const roofIsPitched=!holes.length&&poly.length===4&&part.width<20&&part.length<20&&poly.every((p,i)=>{const a=poly[(i+1)%4],b=poly[(i+2)%4];return (a.x-p.x)*(b.z-a.z)-(a.z-p.z)*(b.x-a.x)>0;});
   if(roofIsPitched){const center={x:poly.reduce((a,p)=>a+p.x,0)/4,z:poly.reduce((a,p)=>a+p.z,0)/4};for(let i=0;i<4;i++)triangle(3,[V(poly[i],height),V(poly[(i+1)%4],height),V(center,height+Math.min(1.8,Math.min(part.width,part.length)*.18))],roofColor);}
   else for(const [a,b,c] of faces)triangle(3,[V(all[a],height),V(all[b],height),V(all[c],height)],roofColor);
   for(const ring of [poly,...holes])for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.01)continue;
    quad(2,V(a,.12),V(b,.12),V(b,height),V(a,height),color,[[0,0],[length/4,0],[length/4,height/3],[0,height/3]]);
    const heading=Math.atan2(b.x-a.x,b.z-a.z),middle={x:(a.x+b.x)/2,z:(a.z+b.z)/2};box(4,middle,.12,.1,.28,length,'#b8b09c',heading);box(4,middle,height-.16,.14,.16,length,'#f5ead9',heading);
    if(Math.hypot(middle.x-player.x,middle.z-player.z)<120&&length>4&&i===0){const door={x:a.x+(b.x-a.x)*.48,z:a.z+(b.z-a.z)*.48};box(4,door,.19,.13,2.1,1.15,'#79614b',heading);}
   }
  }
  const furniture=streetFurniture(network,player,viewDistance<=260?190:320);
  for(const lamp of furniture.lamps){box(4,lamp,.15,.13,5.9,.13,'#4b5a57');const light={x:lamp.x-Math.cos(lamp.heading)*lamp.side*.55,z:lamp.z+Math.sin(lamp.heading)*lamp.side*.55};box(4,light,5.95,1.25,.11,.14,'#65716a',lamp.heading);box(6,light,5.9,.65,.05,.25,'#ffedb3',lamp.heading);}
  for(const tree of furniture.trees){box(4,tree,.18,.26,3,.26,'#876b48');box(4,tree,.16,1.3,.22,1.3,'#b7b3a1');ball(tree,3.6,1.5,1.7,1.4,'#4e8053');ball({x:tree.x+.45,z:tree.z+.2},4.25,1.05,1.3,1,'#67945d');}
  for(const bench of furniture.benches){box(4,bench,.65,.55,.13,1.7,'#9b7955',bench.heading);const back={x:bench.x+.2*Math.cos(bench.heading),z:bench.z-.2*Math.sin(bench.heading)};box(4,back,.72,.1,.62,1.7,'#9b7955',bench.heading);for(const t of [-.6,.6])box(4,{x:bench.x+Math.sin(bench.heading)*t,z:bench.z+Math.cos(bench.heading)*t},.16,.45,.55,.09,'#4a5b55',bench.heading);}
  for(const crossing of furniture.crossings){for(let x=-crossing.width/2+.5;x<crossing.width/2-.25;x+=.85){const q={x:crossing.x+Math.cos(crossing.heading)*x,z:crossing.z-Math.sin(crossing.heading)*x};box(6,q,.112,.45,.008,2.3,'#f6f0dc',crossing.heading);}}
  for(const signal of furniture.signals){box(4,signal,.15,.13,4.9,.13,'#4c5a56');box(4,signal,3.8,.55,1.45,.35,'#233c33',signal.heading);}
  for(const [i,batch] of batches.entries()){if(!batch.positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));if(i>=2)geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,materials[i]);mesh.receiveShadow=i<2||i===4;mesh.castShadow=i>=2&&i<6;root.add(mesh);}
  // Only six signal draw calls, shared by all intersections in the active area.
  for(const axis of ['x','z'])for(const [index,color] of ['red','amber','green'].entries()){
   const positions=[];for(const signal of furniture.signals.filter(s=>s.axis===axis)){const y=4.96-index*.43,p={x:signal.x+Math.sin(signal.heading)*.2,z:signal.z+Math.cos(signal.heading)*.2},co=Math.cos(signal.heading)*.16,si=-Math.sin(signal.heading)*.16;positions.push(...V({x:p.x-co,z:p.z-si},y-.15),...V({x:p.x+co,z:p.z+si},y-.15),...V({x:p.x+co,z:p.z+si},y+.15),...V({x:p.x-co,z:p.z-si},y-.15),...V({x:p.x+co,z:p.z+si},y+.15),...V({x:p.x-co,z:p.z-si},y+.15));}
   if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color:'#24352f',emissive:{red:'#ff4931',amber:'#ffc246',green:'#39df84'}[color],side:THREE.DoubleSide}),obj=new THREE.Mesh(geometry,material);obj.userData.signal=true;root.add(obj);signals.push({obj,axis,color});
  }
  updateSignals(time);summary={roads:near.roads.length,buildings:visible.length,lamps:furniture.lamps.length,trees:furniture.trees.length,crossings:furniture.crossings.length,signals:furniture.signals.length};
 }
 function dispose(){clear();materials.forEach(m=>m.dispose());textures.dispose();world.remove(root);}
 return {update,dispose,get summary(){return summary;}};
}
