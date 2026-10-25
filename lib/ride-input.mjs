const ACTIONS=['gas','brake','reverse','left','right'];
export function createRideInput(){
 const pressed=new Map(),steering=new Map();
 return {
  press(action,source){if(ACTIONS.includes(action))pressed.set(source,action);},
  steer(value,source){if(Number.isFinite(value))steering.set(source,Math.max(-1,Math.min(1,value)));},
  release(source){pressed.delete(source);steering.delete(source);},
  clear(){pressed.clear();steering.clear();},
  read(sensitivity=1){const values=new Set(pressed.values()),input=Object.fromEntries(ACTIONS.map(k=>[k,values.has(k)]));const analog=[...steering.values()].at(-1)||0;const direction=(Number(input.right)-Number(input.left));input.steer=Math.max(-1.4,Math.min(1.4,(direction||analog)*Math.max(.6,Math.min(1.4,sensitivity))));return input;},
 };
}
export function padSteering(clientX,left,width){const raw=Math.max(-1,Math.min(1,(clientX-left-width/2)/Math.max(1,width*.4)));return Math.abs(raw)<.12?0:Math.sign(raw)*(Math.abs(raw)-.12)/.88;}
