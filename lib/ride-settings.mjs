export const RIDE_SETTINGS_KEY='ziarah-walisongo.ride-settings.v1';
export const DEFAULT_RIDE_SETTINGS={quality:'balanced',controls:'buttons',sensitivity:1,controlSize:'normal',minimap:true,sound:false,volume:.35,helmets:true,visualStyle:'illustration'};
export const QUALITY_PRESETS={
 low:{label:'Hemat',fps:20,dpr:1,maxWidth:1280,pixelBudget:1100000,viewDistance:260,decorations:.5},
 balanced:{label:'Seimbang',fps:30,dpr:1.5,maxWidth:1920,pixelBudget:2200000,viewDistance:420,decorations:1},
 high:{label:'Tinggi',fps:45,dpr:2,maxWidth:3840,pixelBudget:8294400,viewDistance:550,decorations:1},
};
export function normalizeRideSettings(value){
 const v=value&&typeof value==='object'?value:{};
 return {quality:Object.hasOwn(QUALITY_PRESETS,v.quality)?v.quality:'balanced',controls:v.controls==='pad'?'pad':'buttons',sensitivity:Number.isFinite(v.sensitivity)?Math.round(Math.max(.6,Math.min(1.4,v.sensitivity))*10)/10:1,controlSize:v.controlSize==='large'?'large':'normal',minimap:typeof v.minimap==='boolean'?v.minimap:true,sound:v.sound===true,volume:Number.isFinite(v.volume)?Math.max(0,Math.min(1,v.volume)):.35,helmets:typeof v.helmets==='boolean'?v.helmets:true,visualStyle:v.visualStyle==='model'?'model':'illustration'};
}
export function readRideSettings(raw){try{return normalizeRideSettings(JSON.parse(raw));}catch{return {...DEFAULT_RIDE_SETTINGS};}}
export function renderSize(width,height,dpr,quality){
 const preset=Object.hasOwn(QUALITY_PRESETS,quality)?QUALITY_PRESETS[quality]:QUALITY_PRESETS.balanced;
 const w=Math.max(1,Number.isFinite(width)?width:1),h=Math.max(1,Number.isFinite(height)?height:1);
 const scale=Math.min(Math.max(1,Number.isFinite(dpr)?dpr:1),preset.dpr,preset.maxWidth/w,Math.sqrt(preset.pixelBudget/(w*h)));
 return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale))};
}
