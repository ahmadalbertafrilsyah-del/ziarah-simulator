import {validCoordinate} from './geo.mjs';
export const STREET_STEP=.004,STREET_PAD=.002,STREET_LIMIT=12000;
export const DRIVABLE=new Set(['primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','unclassified','residential','living_street','service','road','trunk','trunk_link']);
export function streetTile(coordinates){if(!validCoordinate(coordinates))throw Error('Koordinat kawasan di luar Indonesia.');const x=Math.floor(coordinates[0]/STREET_STEP),y=Math.floor(coordinates[1]/STREET_STEP);return tileByIndex(x,y);}
export function tileByIndex(x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||!validCoordinate([(x+.5)*STREET_STEP,(y+.5)*STREET_STEP]))throw Error('Kawasan tidak valid.');return {id:`${x}:${y}`,x,y,bounds:[x*STREET_STEP-STREET_PAD,y*STREET_STEP-STREET_PAD,(x+1)*STREET_STEP+STREET_PAD,(y+1)*STREET_STEP+STREET_PAD]};}
export function inGeoBounds(p,b){return p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];}
export function overpassQuery(b){return `[out:json][timeout:20];(way["highway"](${b[1]},${b[0]},${b[3]},${b[2]});way["building"](${b[1]},${b[0]},${b[3]},${b[2]}););out tags geom;`;}
export function roadWidth(tags){const explicit=Number.parseFloat(tags.width);if(Number.isFinite(explicit))return Math.max(2,Math.min(18,explicit));return /primary|trunk/.test(tags.highway)?9:/secondary/.test(tags.highway)?8:/tertiary/.test(tags.highway)?7:tags.highway==='living_street'?3.6:tags.highway==='service'?3.2:5.5;}
// Clip long ways to the requested region so one intercity way cannot load an entire province.
function clip(a,b,bounds){let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1],p=[-dx,dx,-dy,dy],q=[a[0]-bounds[0],bounds[2]-a[0],a[1]-bounds[1],bounds[3]-a[1]];for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-15){if(q[i]<0)return null;continue;}const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return [[a[0]+dx*lo,a[1]+dy*lo],[a[0]+dx*hi,a[1]+dy*hi]];}
function clippedLines(points,bounds){const out=[];let current=[];for(let i=1;i<points.length;i++){const line=clip(points[i-1],points[i],bounds);if(!line){if(current.length>1)out.push(current);current=[];continue;}if(current.length&&Math.hypot(current.at(-1)[0]-line[0][0],current.at(-1)[1]-line[0][1])<1e-10)current.push(line[1]);else {if(current.length>1)out.push(current);current=line;}}if(current.length>1)out.push(current);return out;}
export function normalizeStreetData(raw,tile){
 if(!Array.isArray(raw?.elements)||raw.elements.length>60000)throw Error('Data OSM kawasan tidak valid atau terlalu besar.');
 const roads=[],buildings=[];let vertices=0;
 for(const element of raw.elements){if(element.type!=='way'||!Number.isSafeInteger(element.id))continue;const tags=element.tags||{},geometry=element.geometry;if(!Array.isArray(geometry)||geometry.length<2||geometry.length>2000)continue;
  const points=geometry.map(p=>[p.lon,p.lat]);if(points.some(p=>!validCoordinate(p)))continue;vertices+=points.length;if(vertices>220000)throw Error('Kawasan terlalu padat untuk dimuat sekaligus.');
  if(tags.highway&&DRIVABLE.has(tags.highway)&&!['no','private'].includes(tags.access)&&!['no','private'].includes(tags.motor_vehicle)&&!['no','private'].includes(tags.motorcycle)&&!(Number(tags.layer)||0)&&!['yes','true','1'].includes(tags.bridge)&&!['yes','true','1'].includes(tags.tunnel)){
   const lines=clippedLines(points,tile.bounds);lines.forEach((coordinates,i)=>roads.push({id:`way-${element.id}-${i}`,osmId:element.id,name:String(tags.name||'').slice(0,140),kind:tags.highway,width:roadWidth(tags),oneway:tags.oneway==='-1'?-1:tags.oneway==='yes'||tags.junction==='roundabout'?1:0,coordinates}));
  }
  if(tags.building&&tags.building!=='no'&&points.length>=4&&points.every(p=>inGeoBounds(p,tile.bounds))&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<1e-8){
   const height=Number.parseFloat(tags.height)||Number.parseFloat(tags['building:levels'])*3||6;
   buildings.push({id:`building-${element.id}`,osmId:element.id,kind:String(tags.building).slice(0,50),height:Math.max(3,Math.min(55,height)),coordinates:points.slice(0,-1)});
  }
 }
 if(roads.length>2500||buildings.length>STREET_LIMIT)throw Error('Kawasan terlalu padat. Gunakan area yang lebih kecil.');
 return {schema:1,id:tile.id,bounds:tile.bounds,source:'OpenStreetMap',retrieved:new Date().toISOString(),roads,buildings};
}
// OSM /map XML contains nodes and ways. No XML entities or external resources are executed.
export function osmXmlToElements(xml){if(typeof xml!=='string'||xml.length>16000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Respons peta OSM tidak valid.');
 const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(_,v)=>v[0]==='#'?String.fromCodePoint(v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10)):({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[v]||''));
 const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:]+)=(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1],decode(m[2]??m[3])]));
 const nodes=new Map();for(const m of xml.matchAll(/<node\b([^>]*?)(?:\/>|>)/g)){const a=attrs(m[1]);nodes.set(a.id,{lon:Number(a.lon),lat:Number(a.lat)});}
 const elements=[];for(const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)){const a=attrs(m[1]),refs=[...m[2].matchAll(/<nd\b([^>]*?)\/>/g)].map(n=>attrs(n[1]).ref),tags=Object.fromEntries([...m[2].matchAll(/<tag\b([^>]*?)\/>/g)].map(t=>{const a=attrs(t[1]);return [a.k,a.v];}));if(refs.every(id=>nodes.has(id)))elements.push({type:'way',id:Number(a.id),tags,geometry:refs.map(id=>nodes.get(id))});}
 return {elements};
}
export function validateStreetTile(data){if(data?.schema!==1||typeof data.id!=='string'||!Array.isArray(data.bounds)||data.bounds.length!==4||!validCoordinate(data.bounds.slice(0,2))||!validCoordinate(data.bounds.slice(2))||data.bounds[2]-data.bounds[0]>.025||data.bounds[3]-data.bounds[1]>.025||data.bounds[0]>=data.bounds[2]||data.bounds[1]>=data.bounds[3])throw Error('Kawasan OSM tidak valid.');
 if(!Array.isArray(data.roads)||data.roads.length>2500||!Array.isArray(data.buildings)||data.buildings.length>STREET_LIMIT)throw Error('Isi kawasan OSM tidak valid.');
 let total=0;for(const item of [...data.roads,...data.buildings]){if(typeof item.id!=='string'||!Array.isArray(item.coordinates)||item.coordinates.length<2||item.coordinates.length>2000||item.coordinates.some(p=>!validCoordinate(p)||!inGeoBounds(p,data.bounds)))throw Error('Geometri kawasan tidak valid.');total+=item.coordinates.length;}
 if(total>220000||data.roads.some(r=>!DRIVABLE.has(r.kind)||!Number.isFinite(r.width)||r.width<2||r.width>18)||data.buildings.some(b=>b.coordinates.length<3||!Number.isFinite(b.height)||b.height<3||b.height>55))throw Error('Ukuran bangunan atau jalan tidak valid.');return data;
}
