import {followingSpeed,steeringStep} from './ride-handling.mjs';
import {resolveMovement,collisionMessage} from './ride-collision.mjs';
export const CITY_LIMIT=115,STOP_LINE=-14,ROAD_HALF=6;
export const SIGNAL_PHASES=[{name:'Utara–selatan hijau',axis:'z',color:'green',duration:18},{name:'Utara–selatan kuning',axis:'z',color:'amber',duration:3},{name:'Semua merah',axis:null,color:'red',duration:2},{name:'Timur–barat hijau',axis:'x',color:'green',duration:18},{name:'Timur–barat kuning',axis:'x',color:'amber',duration:3},{name:'Semua merah',axis:null,color:'red',duration:2}];
export const CITY_BUILDINGS=Array.from({length:32},(_,i)=>{const side=i%2?-1:1,row=Math.floor(i/2)%4,quadrant=Math.floor(i/8),axis=quadrant<2?'z':'x',along=24+row*25,across=23+(quadrant%2)*21;return {id:`lot-${i}`,kind:i%3===0?'shop':'house',x:axis==='z'?side*across:side*along,z:axis==='z'?(quadrant%2?-1:1)*along:(quadrant%2?-1:1)*across,width:10,depth:11,height:6+(i%3)*2};}).filter((p,i,list)=>!list.slice(0,i).some(q=>Math.abs(q.x-p.x)<11&&Math.abs(q.z-p.z)<12));
export function lanePose(axis,dir,s){return axis==='z'?{x:-dir*2.4,z:dir*s,heading:dir===1?0:Math.PI}:{x:dir*s,z:dir*2.4,heading:dir===1?Math.PI/2:-Math.PI/2};}
export function signalColor(signal,axis){const phase=SIGNAL_PHASES[signal.phase];return phase.axis===axis?phase.color:'red';}
export function bounds(entity){const w=entity.width||.85,l=entity.length||2.1,c=Math.abs(Math.cos(entity.heading||0)),s=Math.abs(Math.sin(entity.heading||0));return {x:entity.x,z:entity.z,hx:c*w/2+s*l/2,hz:s*w/2+c*l/2};}
export function overlaps(a,b,margin=0){return Math.abs(a.x-b.x)<a.hx+b.hx+margin&&Math.abs(a.z-b.z)<a.hz+b.hz+margin;}
export function inJunction(entity){return overlaps(bounds(entity),{x:0,z:0,hx:14,hz:14});}
export function advanceSignal(signal,dt,occupied){let phase=signal.phase,elapsed=signal.elapsed+Math.max(0,Math.min(.1,dt)),held=false;const duration=SIGNAL_PHASES[phase].duration;if(elapsed>=duration){const next=(phase+1)%SIGNAL_PHASES.length;if((next===0||next===3)&&occupied){elapsed=duration;held=true;}else {phase=next;elapsed=0;}}return {phase,elapsed,held};}
export function initialCity(){return {signal:{phase:0,elapsed:0,held:false},time:0,player:{x:-2.4,z:-67,heading:0,speed:0,width:.85,length:2.1},vehicles:['z','x'].flatMap(axis=>[1,-1].flatMap(dir=>[-115,-77,-39].map((s,i)=>({id:`${axis}-${dir}-${i}`,axis,dir,s,speed:0,cruise:i===1?7:8.5,type:i===1?'motorcycle':'car',width:i===1?.75:1.85,length:i===1?2:4.2,committed:false,...lanePose(axis,dir,s)})))),message:''};}
export function stepTraffic(vehicles,signal,player,dt){return vehicles.map(v=>{
 let committed=v.committed,speed=v.speed,cruise=v.cruise;const half=v.length/2,stop=STOP_LINE-half-.6,color=signalColor(signal,v.axis);
 if(v.s<stop&&!committed&&color==='amber'&&stop-v.s<speed*speed/(2*5)+.8)committed=true;
 if(v.s>stop+.05&&v.s<16+half)committed=true;
 const leader=vehicles.filter(q=>q.id!==v.id&&q.axis===v.axis&&q.dir===v.dir&&q.s>v.s).sort((a,b)=>a.s-b.s)[0];
 let maxS=leader?leader.s-(leader.length+v.length)/2-1.7:138,leaderSpeed=leader?.speed||0;
 if(!committed&&v.s<=stop+.05&&color!=='green'&&stop<maxS){maxS=stop;leaderSpeed=0;}
 const playerS=(v.axis==='z'?player.z:player.x)*v.dir,across=v.axis==='z'?player.x+v.dir*2.4:player.z-v.dir*2.4;
 if(Math.abs(across)<2.1&&playerS>v.s){const playerStop=playerS-((player.length||2.1)+v.length)/2-1.7;if(playerStop<maxS){maxS=playerStop;leaderSpeed=Math.max(0,(player.speed||0)*(v.axis==='z'?Math.cos(player.heading||0):Math.sin(player.heading||0))*v.dir);}}
 const gap=Math.max(0,maxS-v.s),following=followingSpeed(speed,cruise,gap,leaderSpeed,dt);speed=following.speed;
 let s=Math.max(v.s,Math.min(maxS,v.s+Math.max(0,speed)*dt));speed=Math.min(speed,Math.max(0,(s-v.s)/Math.max(dt,.0001)));let pose=lanePose(v.axis,v.dir,s);
 if(overlaps(bounds({...v,...pose}),bounds(player),1.3)){s=v.s;speed=0;pose=lanePose(v.axis,v.dir,s);}
 if(color==='green'&&s>stop)committed=true;
 if(s>16+half)committed=false;
 if(s>=137.9){const entry=lanePose(v.axis,v.dir,-138),free=vehicles.every(q=>q.id===v.id||q.axis!==v.axis||q.dir!==v.dir||q.s>-126)&&Math.hypot(player.x-entry.x,player.z-entry.z)>35&&Math.hypot(player.x-pose.x,player.z-pose.z)>35;if(free){s=-138;pose=entry;committed=false;speed=0;}else speed=0;}
 return {...v,s,speed,committed,braking:following.braking||(speed<.15&&gap<.7),...pose};
});}
export function stepCityPlayer(player,input,vehicles,dt){let speed=player.speed;if(input.brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-9*dt);else if(input.gas)speed=Math.min(12,speed+3.6*dt);else if(input.reverse)speed=Math.max(-3,speed-2.5*dt);else speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-1.8*dt);
 const handling=steeringStep(player.steering,input,speed,dt),heading=player.heading+handling.response*speed/5*.5*dt,candidate={...player,speed,heading,steering:handling.steering,braking:!!input.brake||Math.abs(speed)<Math.abs(player.speed)-.001,x:player.x+Math.sin(heading)*speed*dt,z:player.z+Math.cos(heading)*speed*dt};
 if((Math.abs(candidate.x)>CITY_LIMIT&&Math.abs(candidate.x)>=Math.abs(player.x))||(Math.abs(candidate.z)>CITY_LIMIT&&Math.abs(candidate.z)>=Math.abs(player.z)))return {player:{...player,speed:0},message:'Batas area simulasi. Mundur untuk kembali.'};
 const result=resolveMovement(player,candidate,[...cityObstacles(),...vehicles.map(v=>({...v,kind:'vehicle'}))]);
 return {player:result.value,message:collisionMessage(result.hit)};}

let cityStatics;
export function cityObstacles(){
 if(cityStatics)return cityStatics;
 cityStatics=CITY_BUILDINGS.map(b=>({...b,width:b.width+.6,length:b.depth+.6,heading:Math.abs(b.x)<Math.abs(b.z)?(b.x>0?-Math.PI/2:Math.PI/2):(b.z>0?Math.PI:0),kind:'scenery'}));
 for(let i=-125;i<=125;i+=25)for(const side of [-1,1]){if(Math.abs(i)<22)continue;for(const axis of ['z','x'])cityStatics.push({id:`tree-${axis}-${i}-${side}`,x:axis==='z'?side*11:i,z:axis==='z'?i:side*11,width:.34,length:.34,heading:0,kind:'scenery'});}
 for(const axis of ['z','x'])for(const dir of [-1,1])cityStatics.push({id:`signal-${axis}-${dir}`,x:axis==='z'?-dir*7:dir*-14.5,z:axis==='z'?dir*-14.5:dir*7,width:.18,length:.18,heading:0,kind:'scenery'});
 for(const side of [-1,1]){cityStatics.push({id:`edge-x-${side}`,x:side*(CITY_LIMIT+1),z:0,width:2,length:1000,kind:'boundary'});cityStatics.push({id:`edge-z-${side}`,x:0,z:side*(CITY_LIMIT+1),width:1000,length:2,kind:'boundary'});}
 return cityStatics;
}

export function cityTrafficAdvice(player,signal,previous=null){
 const reverse=player.speed<-.2?-1:1,sx=Math.sin(player.heading||0)*reverse,sz=Math.cos(player.heading||0)*reverse,axis=Math.abs(sx)>Math.abs(sz)?'x':'z',dir=(axis==='x'?sx:sz)>=0?1:-1;
 const across=axis==='z'?player.x:player.z;if(Math.abs(across)>ROAD_HALF+1)return {kind:'',message:''};
 const s=(axis==='z'?player.z:player.x)*dir,front=s+(player.length||2.1)/2,line=STOP_LINE-.5,distance=line-front,color=signalColor(signal,axis);
 if(previous&&color==='red'&&Math.abs(player.speed)>.05){const before=(axis==='z'?previous.z:previous.x)*dir+(previous.length||2.1)/2;if(before<line&&front>=line)return {kind:'crossed',message:'Lampu merah terlewati. Waspadai kendaraan yang melintas.'};}
 if(distance<0||distance>Math.max(24,player.speed*player.speed/6.4+6))return {kind:'',message:''};
 if(color==='red')return {kind:'red',message:'Lampu merah. Kurangi kecepatan dan berhenti sebelum garis.'};
 if(color==='amber')return {kind:'amber',message:'Lampu kuning. Kurangi kecepatan jika masih aman untuk berhenti.'};
 return {kind:'',message:''};
}
export function stepCity(state,input,delta){
 const dt=Math.max(0,Math.min(.05,delta));if(!dt)return state;
 const occupied=state.vehicles.some(inJunction)||inJunction(state.player),signal=advanceSignal(state.signal,dt,occupied),vehicles=stepTraffic(state.vehicles,signal,state.player,dt),result=stepCityPlayer(state.player,input,vehicles,dt),time=state.time+dt,advice=cityTrafficAdvice(result.player,signal,state.player);
 const noticeUntil=advice.kind==='crossed'?time+3:state.noticeUntil||0,trafficWarning=advice.kind==='crossed'?advice.message:time<noticeUntil?state.trafficWarning:advice.message;
 return {...state,signal,vehicles,player:result.player,time,noticeUntil,trafficWarning,message:result.message||trafficWarning||''};
}

export function citySpawn(vehicles){for(const z of [-67,-97,-112]){const player={x:-2.4,z,heading:0,speed:0,width:.85,length:2.1};if(vehicles.every(v=>!overlaps(bounds(player),bounds(v),2)))return player;}return {x:-12,z:-67,heading:0,speed:0,width:.85,length:2.1};}
