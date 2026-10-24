import example from "@/data/example-route.json";
import {normalizeRoute,validCoordinate,distanceMeters} from "@/lib/geo.mjs";

export async function POST(request){
 let body;try{body=await request.json();}catch{return Response.json({error:"Permintaan rute tidak valid."},{status:400});}
 const points=body?.points;
 if(!Array.isArray(points)||points.length<2||points.length>9||points.some(p=>!validCoordinate(p)))return Response.json({error:"Pilih 1 sampai 8 tujuan dengan koordinat Indonesia yang valid."},{status:400});
 if(points.some((p,i)=>i>0&&distanceMeters(points[i-1],p)<5))return Response.json({error:"Dua pemberhentian berurutan berada di titik yang sama."},{status:400});
 try{
  const matched=points.length===example.points.length&&points.every((p,i)=>distanceMeters(p,example.points[i])<15);
  if(matched)return Response.json({...normalizeRoute(example.response),source:"Rute jalan tersimpan",retrieved:example.retrieved});
  const endpoint=process.env.VALHALLA_ROUTING_URL||"https://valhalla1.openstreetmap.de/route";
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","User-Agent":"Ziarah-Walisongo-Prototype/0.1"},
   body:JSON.stringify({locations:points.map(p=>({lon:p[0],lat:p[1],type:"break"})),costing:"motor_scooter",units:"kilometers"}),cache:"no-store",signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error("Layanan rute sedang tidak tersedia. Coba lagi atau pilih tujuan lain.");
  const data=await response.json();
  return Response.json({...normalizeRoute(data),source:"Rute jalan Valhalla",retrieved:new Date().toISOString().slice(0,10)});
 }catch(error){return Response.json({error:error.name==="TimeoutError"?"Layanan rute terlalu lama merespons. Silakan coba lagi.":error.message||"Rute belum dapat dihitung."},{status:503});}
}