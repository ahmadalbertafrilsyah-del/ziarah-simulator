const percentile=(values,fraction)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)];};
export function createPerformanceMeter(capacity=180){
 const limit=Math.max(2,Math.min(600,Math.floor(capacity)||180));let frames=[],intervals=[],previous=null,total=0,activeMs=0;
 function record(timestamp,duration,active=true){
  if(!active){previous=null;return;}
  if(!Number.isFinite(timestamp)||!Number.isFinite(duration)||duration<0)return;
  if(previous!==null&&timestamp>previous){const interval=timestamp-previous;intervals.push(interval);activeMs+=interval;if(intervals.length>limit)intervals.shift();}
  previous=timestamp;frames.push(duration);total++;if(frames.length>limit)frames.shift();
 }
 function reset(){frames=[];intervals=[];previous=null;total=0;activeMs=0;}
 function snapshot(){const average=intervals.length?intervals.reduce((a,b)=>a+b,0)/intervals.length:null;return {samples:frames.length,totalFrames:total,activeSeconds:activeMs/1000,fps:average?1000/average:null,frameP95Ms:percentile(intervals,.95),renderP95Ms:percentile(frames,.95)};}
 return {record,reset,snapshot};
}
export function performanceReport(mode,quality,metrics){return {schema:1,createdAt:new Date().toISOString(),mode,quality,metrics,note:'FPS dihitung dari frame yang digambar saat aktif. Waktu render mengukur CPU, bukan waktu GPU. Heap JS hanya tersedia pada browser tertentu. Tidak menyertakan koordinat, progres atau identitas pemain.'};}
