import {streetTile} from './street-data.mjs';
// A bounded browser cache is shared across simulator openings, never saved in the journey backup.
const cache=new Map();
export function createStreetLoader(road,world,onChange,{fetcher=fetch,now=()=>Date.now()}={}){
 let alive=true,busy=false,controller=null,lastPlayer=null;const retry=new Map();
 const emit=(status,message)=>{if(alive)onChange({status,message,...world.snapshot()});};
 async function request(tile,bypassCache=false){
  if(!bypassCache&&cache.has(tile.id)){world.add(cache.get(tile.id));emit('ready','Jalan dan bangunan OpenStreetMap siap.');return;}
  busy=true;controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),42000);emit('loading','Memuat jalan dan bangunan kawasan…');
  try{const response=await fetcher(`/api/world?x=${tile.x}&y=${tile.y}`,{signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data.error||'Kawasan belum dapat dimuat.');if(!alive)return;world.add(data);cache.set(tile.id,data);while(cache.size>8)cache.delete(cache.keys().next().value);retry.delete(tile.id);emit('ready','Jalan dan bangunan OpenStreetMap siap.');}
  catch(e){if(alive&&e.name!=='AbortError'){retry.set(tile.id,now()+30000);emit('error',e.message);}else if(alive){retry.set(tile.id,now()+30000);emit('error','Pemuatan kawasan melewati batas waktu. Coba lagi melalui Menu.');}}
  finally{clearTimeout(timer);busy=false;controller=null;}
 }
 function update(player,force=false){if(!alive||!player)return;lastPlayer={...player};if(busy)return;
  // Prefetch towards the direction of travel before the current coverage runs out.
  const ahead={x:player.x+Math.sin(player.heading)*180,z:player.z+Math.cos(player.heading)*180};
  const point=!world.covers(player,140)?player:!world.covers(ahead,100)?ahead:null;if(!point&&!force)return;
  const tile=streetTile(road.toGeo(point||player));if(!force&&(retry.get(tile.id)||0)>now())return;
  if(world.covers(point||player,100)&&!force)return;
  void request(tile,force);
 }
 return {update,retry:()=>{retry.clear();update(lastPlayer,true);},dispose:()=>{alive=false;controller?.abort();},get busy(){return busy;}};
}
