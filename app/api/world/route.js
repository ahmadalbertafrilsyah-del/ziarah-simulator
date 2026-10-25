import snapshot from '@/data/ampel-street-snapshot.json';
import {tileByIndex,normalizeStreetData,overpassQuery,osmXmlToElements} from '@/lib/street-data.mjs';
const cache=new Map(),pending=new Map();
async function readLimited(response){if(!response.ok)throw Error(`Layanan peta merespons ${response.status}.`);if(Number(response.headers.get('content-length'))>16000000)throw Error('Data kawasan terlalu besar.');const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16000000)throw Error('Data kawasan terlalu besar.');text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{await reader.cancel().catch(()=>{});}}
async function load(tile){
 const options={headers:{Accept:'application/json, application/xml','User-Agent':'Ziarah-Walisongo-Prototype/1.1'},cache:'no-store'};let data;
 try{const text=await readLimited(await fetch(`${process.env.OSM_MAP_API_URL||'https://www.openstreetmap.org/api/0.6/map'}?bbox=${tile.bounds.join(',')}`,{...options,signal:AbortSignal.timeout(15000)}));data=normalizeStreetData(osmXmlToElements(text),tile);}
 catch{const endpoint=process.env.OVERPASS_API_URL||'https://overpass-api.de/api/interpreter';const text=await readLimited(await fetch(endpoint,{...options,method:'POST',headers:{...options.headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:overpassQuery(tile.bounds)}),signal:AbortSignal.timeout(23000)}));data=normalizeStreetData(JSON.parse(text),tile);}
 cache.set(tile.id,{data,time:Date.now()});while(cache.size>32)cache.delete(cache.keys().next().value);return data;
}
export async function GET(request){let tile;try{const url=new URL(request.url),x=url.searchParams.get('x'),y=url.searchParams.get('y');if(x===null||y===null)throw Error();tile=tileByIndex(Number(x),Number(y));}catch{return Response.json({error:'Koordinat kawasan tidak valid.'},{status:400});}
 const b=tile.bounds,s=snapshot.bounds;
 if(b[0]>=s[0]-1e-8&&b[1]>=s[1]-1e-8&&b[2]<=s[2]+1e-8&&b[3]<=s[3]+1e-8)return Response.json({...snapshot,id:tile.id},{headers:{'Cache-Control':'public, max-age=86400'}});
 const cached=cache.get(tile.id);if(cached&&Date.now()-cached.time<86400000)return Response.json(cached.data);
 if(!pending.has(tile.id)){if(pending.size>=2)return Response.json({error:'Pemuatan kawasan sedang antre. Coba lagi.'},{status:429,headers:{'Retry-After':'10'}});const promise=load(tile).finally(()=>pending.delete(tile.id));pending.set(tile.id,promise);}
 try{return Response.json(await pending.get(tile.id));}catch{return Response.json({error:'Jaringan jalan kawasan belum dapat dimuat. Tetap dekat jalur hijau atau coba muat ulang kawasan dari Menu.'},{status:503});}
}
