"use client";
import {useEffect,useRef,useState} from 'react';
import {padSteering} from '@/lib/ride-input.mjs';
import {QUALITY_PRESETS} from '@/lib/ride-settings.mjs';
function SteeringPad({controller,disabled}){
 const [value,setValue]=useState(0),pointer=useRef(null);
 useEffect(()=>()=>{if(pointer.current!==null)controller.release(`pad:${pointer.current}`);controller.release('pad:keyboard');},[controller]);
 function update(e){if(pointer.current!==e.pointerId)return;const b=e.currentTarget.getBoundingClientRect(),v=padSteering(e.clientX,b.left,b.width);controller.steer(v,`pad:${e.pointerId}`);setValue(v);}
 function end(e){if(pointer.current!==e.pointerId)return;controller.release(`pad:${e.pointerId}`);pointer.current=null;setValue(0);}
 return <div className="ride-steering-pad" role="slider" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label="Kemudi geser" aria-orientation="horizontal" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(value*100)} aria-valuetext={Math.abs(value)<.01?'Lurus':`${value<0?'Kiri':'Kanan'} ${Math.round(Math.abs(value)*100)} persen`} onPointerDown={e=>{if(disabled||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);update(e);}} onPointerMove={update} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
  onKeyDown={e=>{if(disabled||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();const v=e.key==='Home'?0:Math.max(-1,Math.min(1,value+(e.key==='ArrowRight'?.15:-.15)));setValue(v);controller.steer(v,'pad:keyboard');}}
  onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.stopPropagation();controller.release('pad:keyboard');setValue(0);}}} onBlur={()=>{controller.release('pad:keyboard');setValue(0);}}>
  <span aria-hidden="true">←</span><i aria-hidden="true" style={{transform:`translateX(${value*35}px)`}}/><span aria-hidden="true">→</span><small>GESER KEMUDI</small>
 </div>;
}
export default function RideControls({controller,status,settings}){
 const [held,setHeld]=useState({});const owned=useRef(new Set());
 useEffect(()=>{const sources=owned.current;return()=>{for(const source of sources)controller.release(source);};},[controller]);
 function release(e){const source=`touch:${e.pointerId}`;controller.release(source);owned.current.delete(source);setHeld(old=>{const next={...old};delete next[source];return next;});}
 function button(action,label){return <button type="button" aria-label={action==='left'?'Belok kiri':action==='right'?'Belok kanan':label} aria-pressed={Object.values(held).includes(action)} disabled={status!=='moving'} onPointerDown={e=>{if(status!=='moving')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const source=`touch:${e.pointerId}`;owned.current.add(source);controller.press(action,source);setHeld(old=>({...old,[source]:action}));}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{label}</button>;}
 return <footer className={'route-touch control-size-'+settings.controlSize} aria-label="Kontrol berkendara"><div>{settings.controls==='pad'?<SteeringPad controller={controller} disabled={status!=='moving'}/>:<>{button('left','←')}{button('right','→')}</>}</div><div>{button('reverse','MUNDUR')}{button('brake','REM')}{button('gas','GAS')}</div></footer>;
}
export function RidePreferences({settings,onChange,loaded,message,onFullscreen,fullscreen,onAudio,audioReady}){
 return <section className="ride-preferences" aria-label="Pengaturan kontrol dan grafis"><h2>Kontrol & tampilan</h2>
  <label>Kualitas grafis<select aria-label="Kualitas grafis" disabled={!loaded} value={settings.quality} onChange={e=>onChange({...settings,quality:e.target.value})}>{Object.entries(QUALITY_PRESETS).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></label>
  <label>Kontrol kemudi<select aria-label="Kontrol kemudi" disabled={!loaded} value={settings.controls} onChange={e=>onChange({...settings,controls:e.target.value})}><option value="buttons">Tombol kiri / kanan</option><option value="pad">Kemudi geser</option></select></label>
  <label>Sensitivitas kemudi · {settings.sensitivity.toFixed(1)}×<input type="range" min="0.6" max="1.4" step="0.1" disabled={!loaded} value={settings.sensitivity} onChange={e=>onChange({...settings,sensitivity:Number(e.target.value)})}/></label>
  <label>Ukuran kontrol<select aria-label="Ukuran kontrol" disabled={!loaded} value={settings.controlSize} onChange={e=>onChange({...settings,controlSize:e.target.value})}><option value="normal">Normal</option><option value="large">Besar</option></select></label>
  <label className="ride-check"><input type="checkbox" checked={settings.minimap} disabled={!loaded} onChange={e=>onChange({...settings,minimap:e.target.checked})}/>Tampilkan minimap</label>
  <label className="ride-check"><input type="checkbox" checked={settings.helmets} disabled={!loaded} onChange={e=>onChange({...settings,helmets:e.target.checked})}/>Helm karakter</label>
  <label className="ride-check"><input type="checkbox" checked={settings.sound} disabled={!loaded} onChange={e=>onAudio(e.target.checked)}/>Suara perjalanan</label>
  <label>Volume suara · {Math.round(settings.volume*100)}%<input aria-label="Volume suara" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e=>onChange({...settings,volume:Number(e.target.value)})}/></label>
  {settings.sound&&!audioReady&&<button type="button" onClick={()=>onAudio(true)}>Aktifkan suara</button>}
  <button type="button" onClick={onFullscreen}>{fullscreen?'Keluar layar penuh':'Layar penuh'}</button>
  <p>Petunjuk belokan mengikuti bentuk rute. Minimap menunjukkan ruas aktif dan fasilitas simulasi, dengan utara di atas. Tetap kendalikan kemudi sendiri. Mode hemat mengurangi resolusi, jarak gambar dan dekorasi.</p><p role="status">{message}</p>
 </section>;
}
