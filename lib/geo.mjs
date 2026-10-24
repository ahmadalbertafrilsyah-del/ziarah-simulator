export function validCoordinate(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=94&&p[0]<=142&&p[1]>=-11.5&&p[1]<=6.5;}
export function distanceMeters(a,b){const r=Math.PI/180,p=(b[1]-a[1])*r,q=(b[0]-a[0])*r,x=Math.sin(p/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(q/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
export function cumulativeDistances(c){let t=0;return c.map((p,i)=>{if(i)t+=distanceMeters(c[i-1],p);return t;});}
export function positionAtDistance(r,d){const c=r.coordinates,t=r.cumulative,last=t.length-1;if(d<=0)return c[0];if(d>=t[last])return c[last];let lo=1,hi=last;while(lo<hi){const m=(lo+hi)>>1;if(t[m]<d)lo=m+1;else hi=m;}const f=(d-t[lo-1])/(t[lo]-t[lo-1]||1);return c[lo].map((v,i)=>c[lo-1][i]+(v-c[lo-1][i])*f);}
export function decodePolyline(s,precision=6){if(typeof s!=="string"||s.length>2000000)throw Error("Bentuk rute tidak valid.");let i=0,lat=0,lon=0;const c=[],f=10**precision;
const read=()=>{let n=0,shift=0,b;do{if(i>=s.length||shift>30)throw Error("Bentuk rute terpotong.");b=s.charCodeAt(i++)-63;if(b<0||b>63)throw Error("Bentuk rute tidak valid.");n|=(b&31)<<shift;shift+=5;}while(b>=32);return n&1?~(n>>1):n>>1;};
while(i<s.length){lat+=read();lon+=read();c.push([lon/f,lat/f]);}return c;}
export function normalizeRoute(d){const legs=d?.trip?.legs;if(!Array.isArray(legs)||!legs.length||legs.length>8)throw Error("Rute tidak ditemukan.");const coordinates=[],stops=[];let durationSec=0;
for(const leg of legs){const points=decodePolyline(leg.shape),time=Number(leg.summary?.time);if(points.length<2||points.some(p=>!validCoordinate(p))||!Number.isFinite(time)||time<=0)throw Error("Data rute tidak valid.");coordinates.push(...(coordinates.length?points.slice(1):points));durationSec+=time;stops.push({endIndex:coordinates.length-1});}
const cumulative=cumulativeDistances(coordinates),distanceM=cumulative.at(-1);if(!Number.isFinite(distanceM)||distanceM<=0)throw Error("Jarak rute tidak valid.");return {coordinates,cumulative,distanceM,durationSec,stops:stops.map(s=>({...s,endM:cumulative[s.endIndex]}))};}

