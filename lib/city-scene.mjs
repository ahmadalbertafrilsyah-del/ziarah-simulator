import * as THREE from 'three';
import {CITY_BUILDINGS,signalColor} from './city-traffic.mjs';
import {normalizedCityModel,disposeCityObjects} from './city-assets.mjs';
import {renderSize} from './ride-settings.mjs';
export function createCityScene(canvas,party,initialState,quality='balanced'){
 // React development mode reuses this canvas after an Effect cleanup.
 // Release renderer resources without deliberately losing its reusable context.
 const context=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'});
 if(!context)throw Error('WebGL 2 tidak tersedia. Aktifkan akselerasi grafis browser, lalu buka kembali Kota 3D.');
 if(context.isContextLost())throw Error('Konteks grafis belum siap. Muat ulang halaman, lalu buka kembali Kota 3D.');
 for(const shader of [context.VERTEX_SHADER,context.FRAGMENT_SHADER])for(const precision of [context.HIGH_FLOAT,context.MEDIUM_FLOAT]){
  if(!context.getShaderPrecisionFormat(shader,precision))throw Error('Kemampuan shader grafis belum dapat dibaca. Muat ulang halaman atau periksa akselerasi grafis browser.');
 }
 const renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d8e6');scene.fog=new THREE.Fog('#b9d8e6',75,235);
 const camera=new THREE.PerspectiveCamera(55,1,.1,350);scene.add(new THREE.HemisphereLight('#ecf4ff','#5c6b43',2.3));const sun=new THREE.DirectionalLight('#fff0d0',3.2);sun.position.set(-42,70,-25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.far=170;sun.shadow.normalBias=.035;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
 // Reflect the simulation's north-positive Z into Three's world so right steering stays right on screen.
 const cityWorld=new THREE.Group();cityWorld.scale.z=-1;scene.add(cityWorld);
 const materials=new Map(),geometries=new Map(),models=new Map(),instances=new Map();let alive=true;
 const mat=(color,roughness=.75)=>{const key=color+roughness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness:roughness<.4?.2:0}));return materials.get(key);};
 const geometry=(type)=>{if(!geometries.has(type))geometries.set(type,type==='box'?new THREE.BoxGeometry(1,1,1):type==='sphere'?new THREE.SphereGeometry(1,12,8):type==='cone'?new THREE.ConeGeometry(1,1,7):new THREE.CylinderGeometry(1,1,1,12));return geometries.get(type);};
 function mesh(parent,type,color,x,y,z,sx,sy,sz,shadow=true){const obj=new THREE.Mesh(geometry(type),mat(color));obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.castShadow=shadow;obj.receiveShadow=true;parent.add(obj);return obj;}
 const box=(p,c,x,y,z,w,h,d,shadow=true)=>mesh(p,'box',c,x,y,z,w,h,d,shadow);
 box(cityWorld,'#86a470',0,-.18,0,320,.3,320,false);box(cityWorld,'#414c51',0,.015,0,12,.06,300,false);for(const side of [-1,1])box(cityWorld,'#414c51',side*78,.015,0,144,.06,12,false);
 for(const side of [-1,1])for(const along of [-1,1]){box(cityWorld,'#bfc1b1',side*7,.11,along*78,2,.2,144,false);box(cityWorld,'#bfc1b1',side*78,.11,along*7,144,.2,2,false);}
 for(let d=-144;d<145;d+=8){if(Math.abs(d)<19)continue;box(cityWorld,'#f3e4ae',0,.055,d,.12,.012,3,false);box(cityWorld,'#f3e4ae',d,.055,0,3,.012,.12,false);}
 for(const side of [-1,1]){for(let lane=-4.6;lane<5;lane+=1.15){box(cityWorld,'#f1efe2',lane,.057,side*10,.65,.016,2.5,false);box(cityWorld,'#f1efe2',side*10,.057,lane,2.5,.016,.65,false);}box(cityWorld,'#f1efe2',side*2.8,.06,side*14.5,5.25,.02,.24,false);box(cityWorld,'#f1efe2',side*14.5,.06,-side*2.8,.24,.02,5.25,false);}
 function register(slot,root,shell){if(!instances.has(slot))instances.set(slot,[]);instances.get(slot).push({root,shell,imported:null});return root;}
 for(const [i,b] of CITY_BUILDINGS.entries()){
  const root=new THREE.Group();root.position.set(b.x,.08,b.z);root.rotation.y=Math.abs(b.x)<Math.abs(b.z)?(b.x>0?-Math.PI/2:Math.PI/2):(b.z>0?Math.PI:0);cityWorld.add(root);box(cityWorld,'#a8b39b',b.x,.045,b.z,13,.07,14,false);const shell=new THREE.Group();root.add(shell);register(b.kind,root,shell);
  box(shell,'#c7bd9e',0,.1,0,b.width,.2,b.depth);box(shell,['#d9c9a7','#c8c9b3','#c6b3a3','#a8beb6'][i%4],0,b.height/2+.2,0,b.width,b.height,b.depth);const roof=mesh(shell,'cone','#a86f4e',0,b.height+1.2,0,8.2,2.6,8.2);roof.rotation.y=Math.PI/4;
  for(const side of [-1,1])for(const x of [-3,0,3]){box(shell,'#344f59',x,2.4,side*(b.depth/2+.025),1.35,1.55,.08);if(b.height>7)box(shell,'#344f59',x,5.1,side*(b.depth/2+.025),1.35,1.55,.08);}
  box(shell,'#6e6252',0,1.4,b.depth/2+.06,1.5,2.5,.1);if(b.kind==='shop'){box(shell,'#507e70',0,3.7,b.depth/2+.75,10,.3,1.7);box(shell,'#e4d8b5',0,4.7,b.depth/2+.08,6,1,.14);}
 }
 // Trees, street poles and benches are meshes anchored to ground, never PNG billboards.
 for(let i=-125;i<=125;i+=25)for(const side of [-1,1]){if(Math.abs(i)<22)continue;for(const axis of ['z','x']){const x=axis==='z'?side*11:i,z=axis==='z'?i:side*11;mesh(cityWorld,'cylinder','#7a634b',x,1.6,z,.17,3.2,.17);mesh(cityWorld,'sphere','#4d7d54',x,4,z,1.6,2,1.6);}}
 const signals=[];
 for(const axis of ['z','x'])for(const dir of [-1,1]){const group=new THREE.Group();group.position.set(axis==='z'?-dir*7:dir*-14.5,0,axis==='z'?dir*-14.5:dir*7);group.rotation.y=axis==='z'?(dir===1?0:Math.PI):(dir===1?Math.PI/2:-Math.PI/2);cityWorld.add(group);box(group,'#5e6964',0,2.3,0,.14,4.6,.14);box(group,'#263732',0,4.5,0,.65,1.8,.45);const lenses={};for(const [color,y,hex] of [['red',5.05,'#e65143'],['amber',4.5,'#ecc54b'],['green',3.95,'#48c67a']]){const material=new THREE.MeshStandardMaterial({color:'#172723',emissive:hex,emissiveIntensity:.02,roughness:.35}),lens=new THREE.Mesh(geometry('sphere'),material);lens.position.set(0,y,-.27);lens.scale.set(.2,.2,.08);group.add(lens);lenses[color]=lens;}signals.push({axis,lenses});}
 function vehicle(type,color,ids=[]){const root=new THREE.Group(),shell=new THREE.Group(),wheels=[];root.add(shell);register(type,root,shell);const car=type==='car';
  if(car){box(shell,color,0,.7,0,1.8,.75,4.1);box(shell,'#374e58',0,1.32,-.12,1.5,.65,2);box(shell,color,0,1.67,-.12,1.58,.09,2.05);for(const x of [-.63,.63]){box(shell,'#fff1b9',x,.78,2.08,.36,.22,.08);box(shell,'#c24c42',x,.75,-2.08,.36,.2,.08);}}
  else {box(shell,color,0,.7,-.3,.65,.65,1.25);box(shell,color,0,.95,.63,.64,.7,.18);box(shell,'#3a3932',0,1.1,-.25,.6,.15,1.1);box(shell,'#b5c7bb',0,1.47,.65,.9,.08,.1);mesh(shell,'sphere','#fff1b9',0,1.43,.77,.14,.14,.09);}
  for(const z of car?[-1.25,1.25]:[-.7,.72])for(const x of car?[-.92,.92]:[0]){const wheel=mesh(shell,'cylinder','#27332e',x,.37,z,.34,car?.18:.2,.34);wheel.rotation.z=Math.PI/2;wheels.push(wheel);}
  if(!car){const riders=ids.length?ids:['traffic'];riders.forEach((id,i)=>{const z=i===0?.08:-.65,cloth=id==='ibu'?'#bcab8f':id==='remaja-hijau'?'#6d9c81':id==='remaja-terakota'?'#b67758':id==='anak'?'#e5dfc1':'#d0c3a6';box(root,cloth,0,1.53,z,.47,.7,.35);mesh(root,'sphere','#ddb48e',0,2.06,z+.02,.19,.23,.18);mesh(root,'sphere',i?'#d9d0ad':'#385b52',0,2.19,z-.02,.235,.19,.22);for(const side of [-1,1]){box(root,cloth,side*.27,1.22,z+.18,.15,.2,.55);box(root,'#656052',side*.3,.85,z+.4,.14,.65,.17);box(root,cloth,side*.25,1.53,z+.23,.13,.18,.5);}});}
  root.userData.wheels=wheels;return root;
 }
 const traffic=new Map();for(const v of initialState.vehicles){const obj=vehicle(v.type,['#d57e63','#e2c97c','#86a6ae','#e0dfcf','#678f7c'][traffic.size%5]);cityWorld.add(obj);traffic.set(v.id,obj);}
 const player=vehicle('vespa','#62bba6',party);cityWorld.add(player);const cameraTarget=new THREE.Vector3(),cameraPosition=new THREE.Vector3();
 function qualityChange(value){quality=value;renderer.shadowMap.enabled=value!=='low';renderer.shadowMap.needsUpdate=true;resize();}
 function resize(){if(!alive)return;const b=canvas.getBoundingClientRect(),size=renderSize(b.width,b.height,Math.min(devicePixelRatio||1,2),quality);renderer.setSize(size.width,size.height,false);camera.aspect=Math.max(1,b.width)/Math.max(1,b.height);camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(canvas);qualityChange(quality);
 function render(state,view='behind'){
  if(!alive)return;const p=state.player;player.position.set(p.x,.015,p.z);player.rotation.y=p.heading;
  for(const v of state.vehicles){const obj=traffic.get(v.id);obj.position.set(v.x,.015,v.z);obj.rotation.y=v.heading;for(const wheel of obj.userData.wheels)wheel.rotation.x=state.time*v.speed/.34;}
  for(const wheel of player.userData.wheels)wheel.rotation.x=state.time*p.speed/.34;
  for(const {axis,lenses} of signals){const active=signalColor(state.signal,axis);for(const [color,lens] of Object.entries(lenses)){lens.material.emissiveIntensity=color===active?2:.025;lens.material.color.set(color===active?'#787e62':'#142421');}}
  const angle=view==='front'?0:view==='left'?-Math.PI/2:view==='right'?Math.PI/2:Math.PI;
  if(view==='top'){cameraPosition.set(p.x,32,-p.z+.1);cameraTarget.set(p.x,0,-p.z);}else {const h=p.heading+angle;cameraPosition.set(p.x+Math.sin(h)*7.5,4.2,-(p.z+Math.cos(h)*7.5));cameraTarget.set(p.x,1.25,-p.z);}
  camera.position.copy(cameraPosition);camera.lookAt(cameraTarget);
  for(const v of state.vehicles){const dx=v.x-p.x,dz=v.z-p.z,cameraSide=dx*(cameraPosition.x-p.x)+dz*(-cameraPosition.z-p.z);traffic.get(v.id).visible=!(view!=='top'&&Math.hypot(dx,dz)<6&&cameraSide>0);}
  renderer.render(scene,camera);
 }
 function install(slot,source){if(!alive)return;const replacements=[];try{for(const entry of instances.get(slot)||[]){const model=normalizedCityModel(source,slot);replacements.push({entry,model});}}catch(e){for(const {model} of replacements)disposeCityObjects(model);throw e;}
  for(const {entry,model} of replacements){if(entry.imported)entry.root.remove(entry.imported);entry.shell.visible=false;entry.root.add(model);entry.imported=model;}
  if(models.has(slot))disposeCityObjects(models.get(slot));models.set(slot,source);return replacements.length;
 }
 function dispose(){if(!alive)return;alive=false;observer.disconnect();disposeCityObjects(scene);for(const model of models.values())disposeCityObjects(model);renderer.dispose();}
 return {render,qualityChange,install,dispose,get alive(){return alive;}};
}
