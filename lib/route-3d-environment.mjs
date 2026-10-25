import * as THREE from 'three';
import {roadFrame,roadSamples,routeScenery} from './route-3d-layout.mjs';
import {roadStripVertices,routeGuidance} from './route-guidance.mjs';

// Stream only the nearby stretch of the selected geographic road.
export function createRouteEnvironment({world,road,box,mesh,mat}){
 const root=new THREE.Group();world.add(root);
 const ground=box(world,'#91aa77',0,-.18,0,1800,.3,1800,false);
 const geometries=[];let cell=null,currentRange=280,guideCell=null,guideRange=null;
 const guide=new THREE.Group();guide.name='green-route-guidance';world.add(guide);
 const guideMeshes=[['ribbon','#18c965',.48],['arrows','#45ff8b',1]].map(([key,color,opacity],i)=>{
  const geometry=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const obj=new THREE.Mesh(geometry,material);obj.name=`route-guide-${key}`;obj.renderOrder=i+1;guide.add(obj);return {key,obj};
 });
 function updateGuide(player,range){
  const next=Math.floor(player.progress/8);if(next===guideCell&&range===guideRange)return;
  const data=routeGuidance(road,player.progress,range);guide.position.set(data.anchor.x,0,data.anchor.z);
  for(const {key,obj} of guideMeshes){obj.geometry.dispose();obj.geometry=new THREE.BufferGeometry();obj.geometry.setAttribute('position',new THREE.Float32BufferAttribute(data[key],3));obj.geometry.computeBoundingSphere();}
  guideCell=next;guideRange=range;
 }
 function rebuild(player,range){
  for(const geometry of geometries)geometry.dispose();geometries.length=0;root.clear();
  const scenery=routeScenery(road,player.progress,range);
  const anchor=roadFrame(road,Math.floor(player.progress/40)*40);root.position.set(anchor.x,0,anchor.z);
  const samples=roadSamples(road,player.progress-180,player.progress+range+70);
  function strip(left,right,y,color){
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(roadStripVertices(samples,left,right,y,anchor),3));geometry.computeVertexNormals();geometries.push(geometry);
   const material=mat(color);material.side=THREE.DoubleSide;const obj=new THREE.Mesh(geometry,material);obj.receiveShadow=true;root.add(obj);
  }
  strip(-7.8,7.8,.02,'#c0bba6');strip(-4.8,4.8,.075,'#adb3a6');strip(-4.5,4.5,.09,'#515c60');
  for(const side of [-1,1])strip(side*5.1,side*7.8,.13,'#c9c8b8');
  const localGroup=(x,z,heading=0)=>{const group=new THREE.Group();group.position.set(x-anchor.x,0,z-anchor.z);group.rotation.y=heading;root.add(group);return group;};
  for(let d=Math.max(0,Math.floor((player.progress-180)/12)*12);d<Math.min(road.distanceM,player.progress+range+70);d+=12){
   const p=roadFrame(road,d),g=localGroup(p.x,p.z,p.heading);box(g,'#eee6bf',0,.105,0,.12,.015,4.5,false);
  }
  function building(b){
   const g=localGroup(b.x,b.z,b.heading),w=b.width||10,h=b.height||7,depth=b.depth||9;
   box(g,'#afa995',0,.08,0,w+1,.16,depth+1,false);box(g,b.color||'#d9c9a7',0,h/2+.16,0,w,h,depth);
   const roof=mesh(g,'cone','#b57a53',0,h+.95,0,w*.72,2.2,depth*.8);roof.rotation.y=Math.PI/4;
   for(const side of [-1,1])for(const x of [-w*.3,w*.3]){box(g,'#354c54',x,2.5,side*(depth/2+.035),1.5,1.6,.09);if(h>7.5)box(g,'#354c54',x,5.3,side*(depth/2+.035),1.5,1.6,.09);}
   box(g,'#6c5b46',0,1.5,depth/2+.07,1.5,2.7,.12);
   if(b.kind==='shop'){box(g,'#487c69',0,3.6,depth/2+.8,w,.22,1.8);for(const x of [-3,-1.5,1.5,3])box(g,'#bc8a52',x,.5,depth/2+1.2,1.1,.85,.8);}
   return g;
  }
  for(const b of scenery.lots)building(b);
  for(const p of scenery.props){
   const g=localGroup(p.x,p.z,p.heading);mesh(g,'cylinder','#80694c',0,1.5,0,.17,3,.17);mesh(g,'sphere','#507c4e',0,3.9,0,1.6,2,1.6);
   if(p.lamp){const lamp=localGroup(p.x-p.side*1.6,p.z,p.heading);box(lamp,'#66736b',0,2.7,0,.12,5.4,.12);box(lamp,'#e7dfb4',p.side*.35,5.4,0,1,.15,.4);}
  }
  for(const f of scenery.services){
   const p=roadFrame(road,f.progress),side=f.side,g=building(f);
   if(f.type==='spbu'){box(g,'#dfd8bf',0,4.4,8,15,.3,7);box(g,'#b35c48',0,4.55,8,15,.25,7);for(const x of [-5,5])box(g,'#c1bda6',x,2.2,9,.25,4.4,.25);for(const x of [-2.5,2.5]){box(g,'#e1dfce',x,1.15,8,.9,2.3,.8);box(g,'#b55043',x,2.25,8,1,.25,.85);box(g,'#344d53',x,1.65,8.43,.65,.45,.06);}}
   if(f.type==='masjid'){mesh(g,'sphere','#a9bb9d',0,9.4,0,2.4,2.4,2.4);mesh(g,'cylinder','#d1c5a4',-7,5,0,.65,10,.65);mesh(g,'cone','#b57a53',-7,10.6,0,1,1.4,1);}
   // A paved access apron meets the road; it is decorative, not a routing edge.
   const access=localGroup(p.x,p.z,p.heading);box(access,'#b4b4a3',side*10,.045,0,12,.05,9,false);
   for(let x=-3.9;x<=4;x+=1.2){const crossing=roadFrame(road,f.progress-12,x),stripe=localGroup(crossing.x,crossing.z,crossing.heading);box(stripe,'#eeeadd',0,.11,0,.65,.015,2.4,false);}
  }
  if(scenery.goal){
   const g=building(scenery.goal);
   mesh(g,'sphere','#8fac7e',0,10,0,3,2.5,3);for(const x of [-8,8]){box(g,'#c7b99b',x,3.5,8,.8,7,.8);mesh(g,'cone','#ab7650',x,7.6,8,1,1.7,1);}box(g,'#b49b68',0,6.8,8,16,.7,1);box(g,'#d9cfaf',0,.045,10,18,.09,5,false);
  }
 }
 function update(player,range){const next=Math.floor(player.progress/40);if(next!==cell||range!==currentRange){rebuild(player,range);cell=next;currentRange=range;}updateGuide(player,range);ground.position.x=player.x;ground.position.z=player.z;}
 function dispose(){for(const geometry of geometries)geometry.dispose();geometries.length=0;root.clear();world.remove(root);for(const {obj} of guideMeshes){obj.geometry.dispose();obj.material.dispose();}guide.clear();world.remove(guide);}
 return {update,dispose};
}
