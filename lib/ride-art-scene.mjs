import * as THREE from 'three';
import {RIDE_ART_DIRECTIONS,rideArtPath,spriteDirection} from './ride-art.mjs';
export function createRideIllustration(root,party){
 const original=[...root.children],group=new THREE.Group();group.name='vespa-character-hd';group.visible=false;root.add(group);
 const textures=new Map(),materials=[],objects=[],helmets=[],loader=new THREE.TextureLoader();let alive=true,ready=false,failed=false;
 const ids=['vespa',...party],spriteRecords=[];
 for(const [i,id] of ids.entries()){
  const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.15,depthWrite:false,toneMapped:false}),sprite=new THREE.Sprite(material);sprite.name=`hd-${id}-${i}`;group.add(sprite);materials.push(material);objects.push(sprite);spriteRecords.push({id,sprite,index:i-1});
  if(i>0){const helmetMaterial=new THREE.MeshStandardMaterial({color:i===1?'#3f7164':'#e0d0a5',roughness:.3,metalness:.12}),geometry=new THREE.SphereGeometry(.255,24,12,0,Math.PI*2,0,Math.PI/2),helmet=new THREE.Mesh(geometry,helmetMaterial);helmet.position.set(0,id==='anak'?1.77:1.98,i===1?.08:-.65);helmet.castShadow=true;group.add(helmet);helmets.push(helmet);}
 }
 const shadowGeometry=new THREE.CircleGeometry(1,32),shadowMaterial=new THREE.MeshBasicMaterial({color:'#263b31',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}),shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.111;shadow.scale.set(.65,1.1,1);group.add(shadow);
 const work=ids.flatMap(id=>RIDE_ART_DIRECTIONS.map(async direction=>{const texture=await loader.loadAsync(rideArtPath(id,direction));if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.set(`${id}:${direction}`,texture);}));
 Promise.all(work).then(()=>{if(alive)ready=true;}).catch(()=>{failed=true;});
 const worldPosition=new THREE.Vector3(),cameraLocal=new THREE.Vector3(),forward=new THREE.Vector3(),inverse=new THREE.Quaternion();
 function update(camera,player,view,style='illustration',helmetsOn=true){
  const enabled=ready&&!failed&&style!=='model'&&!root.userData.importedVespa;group.visible=enabled;
  for(const child of original)child.visible=enabled?false:child.userData.helmet?helmetsOn:child.userData.vehicleShell?!root.userData.importedVespa:true;
  if(!enabled)return;
  root.getWorldPosition(worldPosition);const bearing=Math.atan2(camera.position.x-worldPosition.x,-(camera.position.z-worldPosition.z)),direction=spriteDirection(bearing,player.heading,view==='top');
  inverse.copy(camera.quaternion).invert();forward.set(Math.sin(player.heading),0,-Math.cos(player.heading)).applyQuaternion(inverse);const rotation=view==='top'?Math.atan2(-forward.x,forward.y):0;
  for(const record of spriteRecords){const {id,sprite,index}=record,texture=textures.get(`${id}:${direction}`),ratio=texture.image.width/texture.image.height,isTop=direction==='top',isBike=id==='vespa',height=isBike?(isTop?2.1:1.55):(isTop?(id==='anak'?.8:1.0):(id==='anak'?1.32:1.6));sprite.material.map=texture;sprite.material.rotation=rotation;sprite.scale.set(height*ratio,height,1);sprite.position.set(0,isBike?(isTop?.78:.78):(isTop?1.8:id==='anak'?1.16:1.25),index===-1?0:index===0?.08:-.65);sprite.userData.direction=direction;sprite.renderOrder=isBike?(direction==='front'||direction==='back'?4:1):3;}
  helmets.forEach(h=>h.visible=helmetsOn);
 }
 function dispose(){alive=false;for(const t of textures.values())t.dispose();materials.forEach(m=>m.dispose());for(const geometry of new Set(objects.map(o=>o.geometry)))geometry.dispose();for(const h of helmets){h.geometry.dispose();h.material.dispose();}shadowGeometry.dispose();shadowMaterial.dispose();root.remove(group);}
 return {update,dispose,get ready(){return ready&&!failed;},get failed(){return failed;}};
}
