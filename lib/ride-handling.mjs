const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export function steeringStep(previous,input,speed,dt){
 const target=clamp(Number.isFinite(input.steer)?input.steer:Number(!!input.right)-Number(!!input.left),-1.4,1.4);
 const current=Number.isFinite(previous)?previous:0,rate=target===0?12:8;
 let steering=current+(target-current)*(1-Math.exp(-rate*Math.max(0,dt)));
 if(Math.abs(steering)<.002&&target===0)steering=0;
 return {steering,response:steering/(1+Math.abs(speed)*.08)};
}

// Comfortable braking is separate from the collision system's emergency clamp.
export function followingSpeed(speed,cruise,gap,leaderSpeed,dt){
 const seconds=clamp(dt,0,.1),available=Math.max(0,gap),leader=Math.max(0,leaderSpeed),brake=3.2;
 const target=Math.max(0,Math.min(cruise,Math.sqrt(leader*leader+2*brake*available),leader+(available-speed*1.6)/1.5));
 const next=target>speed?Math.min(target,speed+2*seconds):Math.max(target,speed-brake*seconds);
 return {speed:next,braking:next<speed-.001,target};
}

export function createFollowCamera(){
 let heading=null,position=null,view=null;
 function update(player,nextView,dt,moving=true){
  const teleport=position&&Math.hypot(player.x-position.x,player.z-position.z)>25;
  if(heading===null||view!==nextView||teleport)heading=player.heading;
  else if(moving)heading+=angleDifference(player.heading,heading)*(1-Math.exp(-9*clamp(dt,0,.1)));
  position={x:player.x,z:player.z};view=nextView;return heading;
 }
 return {update};
}
