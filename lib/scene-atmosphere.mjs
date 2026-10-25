const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function mixColor(a,b,t){const f=clamp(t);const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const first=rgb(a),second=rgb(b);return '#'+first.map((v,i)=>Math.round(v+(second[i]-v)*f).toString(16).padStart(2,'0')).join('');}
export function sceneLight(clock){
 const hour=((Number.isFinite(clock)?clock:540)%1440+1440)%1440/60;
 const daylight=hour<5||hour>=19?0:hour<7?(hour-5)/2:hour<=17?1:(19-hour)/2;
 const warm=clamp(1-Math.min(Math.abs(hour-6),Math.abs(hour-18))/1.5)*daylight;
 return {hour,daylight,ambient:.38+.62*daylight,warm,sky:mixColor('#10243b','#a2d2df',daylight),horizon:mixColor(mixColor('#304455','#e8ecd6',daylight),'#f0c89f',warm*.55),ground:mixColor('#344d43','#afc58a',daylight),haze:mixColor('#263c4b','#d4e0c4',daylight),lamps:1-daylight,vignette:.08+(1-daylight)*.13};
}
export function surfaceColor(color,points,light,depth=0,viewDistance=550){
 if(!/^#[0-9a-f]{6}$/i.test(color))return color;
 const a=points[0],b=points[1],c=points[2];let directional=1;
 if(a&&b&&c){const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1;directional=clamp(.82+.18*Math.abs(normal[1])/length+.1*normal[0]/length-.06*normal[2]/length,.65,1.1);}
 let result=mixColor('#10233a',color,clamp(light.ambient*directional));
 if(light.warm>0)result=mixColor(result,'#d9b086',light.warm*.08);
 return mixColor(result,light.haze,clamp((depth-70)/Math.max(1,viewDistance))*.5);
}
