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
 let maxS=leader?leader.s-(leader.length+v.length)/2-1.7:138;
 if(!committed&&v.s<=stop+.05&&color!=='green')maxS=Math.min(maxS,stop);
 const gap=Math.max(0,maxS-v.s),desired=Math.min(cruise,Math.sqrt(2*5*gap));speed=desired>speed?Math.min(desired,speed+2.3*dt):Math.max(desired,speed-5*dt);
 let s=Math.max(v.s,Math.min(maxS,v.s+Math.max(0,speed)*dt));speed=Math.min(speed,Math.max(0,(s-v.s)/Math.max(dt,.0001)));let pose=lanePose(v.axis,v.dir,s);
 if(overlaps(bounds({...v,...pose}),bounds(player),1.3)){s=v.s;speed=0;pose=lanePose(v.axis,v.dir,s);}
 if(color==='green'&&s>stop)committed=true;
 if(s>16+half)committed=false;
 if(s>=137.9){const entry=lanePose(v.axis,v.dir,-138),free=vehicles.every(q=>q.id===v.id||q.axis!==v.axis||q.dir!==v.dir||q.s>-126)&&Math.hypot(player.x-entry.x,player.z-entry.z)>35&&Math.hypot(player.x-pose.x,player.z-pose.z)>35;if(free){s=-138;pose=entry;committed=false;speed=0;}else speed=0;}
 return {...v,s,speed,committed,...pose};
});}
export function stepCityPlayer(player,input,vehicles,dt){let speed=player.speed;if(input.brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-9*dt);else if(input.gas)speed=Math.min(12,speed+3.6*dt);else if(input.reverse)speed=Math.max(-3,speed-2.5*dt);else speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-1.8*dt);
 const steer=Number.isFinite(input.steer)?input.steer:Number(!!input.right)-Number(!!input.left),heading=player.heading+steer*speed/5*.5*dt,candidate={...player,speed,heading,x:player.x+Math.sin(heading)*speed*dt,z:player.z+Math.cos(heading)*speed*dt},box=bounds(candidate);
 const blocked=Math.abs(candidate.x)>CITY_LIMIT||Math.abs(candidate.z)>CITY_LIMIT||CITY_BUILDINGS.some(b=>overlaps(box,{x:b.x,z:b.z,hx:b.width/2+.3,hz:b.depth/2+.3}))||vehicles.some(v=>overlaps(box,bounds(v),.25));
 return blocked?{player:{...player,speed:0},message:'Ada penghalang. Rem atau mundur untuk mencari ruang.'}:{player:candidate,message:''};}
export function stepCity(state,input,delta){const dt=Math.max(0,Math.min(.05,delta));if(!dt)return state;const occupied=state.vehicles.some(inJunction)||inJunction(state.player),signal=advanceSignal(state.signal,dt,occupied),vehicles=stepTraffic(state.vehicles,signal,state.player,dt),result=stepCityPlayer(state.player,input,vehicles,dt);return {...state,signal,vehicles,player:result.player,time:state.time+dt,message:result.message};}

export function citySpawn(vehicles){for(const z of [-67,-97,-112]){const player={x:-2.4,z,heading:0,speed:0,width:.85,length:2.1};if(vehicles.every(v=>!overlaps(bounds(player),bounds(v),2)))return player;}return {x:-12,z:-67,heading:0,speed:0,width:.85,length:2.1};}
