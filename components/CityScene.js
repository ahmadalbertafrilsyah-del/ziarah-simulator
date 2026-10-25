"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {initialCity,stepCity,SIGNAL_PHASES,signalColor,citySpawn} from '@/lib/city-traffic.mjs';
import {createCityScene} from '@/lib/city-scene.mjs';
import {CITY_SLOTS,MODEL_LIMIT,parseCityGLB,manifestEntries,disposeCityObjects} from '@/lib/city-assets.mjs';
import {createRideInput} from '@/lib/ride-input.mjs';
import {DEFAULT_RIDE_SETTINGS,RIDE_SETTINGS_KEY,readRideSettings,normalizeRideSettings} from '@/lib/ride-settings.mjs';
import {CHARACTERS} from '@/lib/catalog.mjs';
import RideControls from './RideControls';
import RidePerformance from './RidePerformance';
import './route-simulator.css';
import './ride-guidance.css';
import './city.css';
export default function CityScene({party,onExit}){
 const canvas=useRef(null),runtime=useRef(null),state=useRef(initialCity()),config=useRef(null),versions=useRef({}),alive=useRef(false);
 const [stats,setStats]=useState(null);
 const controller=useMemo(()=>createRideInput(),[]);
 const [hud,setHud]=useState(()=>initialCity()),[paused,setPaused]=useState(false),[menu,setMenu]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false),[view,setView]=useState('behind'),[settings,setSettings]=useState(DEFAULT_RIDE_SETTINGS),[slot,setSlot]=useState('house'),[modelMessage,setModelMessage]=useState('Model 3D bawaan siap. GLB tambahan bersifat opsional.'),[busy,setBusy]=useState(false);
 const pause=useCallback(()=>{controller.clear();runtime.current?.pausePerformance();state.current={...state.current,player:{...state.current.player,speed:0,steering:0}};if(config.current)config.current.paused=true;setPaused(true);setHud({...state.current});},[controller]);
 function resume(){controller.clear();setMenu(false);setPaused(false);}
 function changeSettings(value){const next=normalizeRideSettings(value);controller.clear();setSettings(next);try{localStorage.setItem(RIDE_SETTINGS_KEY,JSON.stringify(next));}catch{setModelMessage('Pengaturan dipakai selama sesi ini, tetapi belum tersimpan.');}}
 useEffect(()=>{config.current={paused:paused||menu,view,settings,pause};},[paused,menu,view,settings,pause]);
 useEffect(()=>{const t=setTimeout(()=>{try{setSettings(readRideSettings(localStorage.getItem(RIDE_SETTINGS_KEY)));}catch{}},0);return()=>clearTimeout(t);},[]);
 useEffect(()=>{runtime.current?.qualityChange(settings.quality);},[settings.quality]);
 useEffect(()=>{
  alive.current=true;let world;const timers=[];try{world=createCityScene(canvas.current,party,state.current,config.current.settings.quality);runtime.current=world;timers.push(setTimeout(()=>setReady(true),0));}catch(e){timers.push(setTimeout(()=>setError(e.message||'Kota 3D belum dapat dimulai. Muat ulang halaman, lalu coba lagi.'),0));return()=>{alive.current=false;timers.forEach(clearTimeout);};}
  const fetchController=new AbortController();
  (async()=>{try{const r=await fetch('/assets/models/city-manifest.json',{signal:fetchController.signal});if(!r.ok)throw Error();const entries=manifestEntries(await r.json());for(const [type,path] of entries){try{const response=await fetch(path,{signal:fetchController.signal});if(!response.ok)throw Error('File model tidak ditemukan.');const bytes=await response.arrayBuffer(),model=await parseCityGLB(bytes);if(!alive.current||fetchController.signal.aborted||!world.alive||versions.current[type]){disposeCityObjects(model);continue;}world.install(type,model);setModelMessage(`Model ${CITY_SLOTS[type].label} dari manifest dimuat.`);}catch(e){if(alive.current&&!fetchController.signal.aborted)setModelMessage(`${CITY_SLOTS[type].label}: ${e.message||'Model gagal dimuat.'} Bentuk bawaan tetap digunakan.`);}}}catch{if(alive.current&&!fetchController.signal.aborted)setModelMessage('Manifest belum dapat dibaca. Kota tetap menggunakan model bawaan.');}})();
  const mapping={w:'gas',W:'gas',ArrowUp:'gas',s:'brake',S:'brake',ArrowDown:'brake',' ':'brake',a:'left',A:'left',ArrowLeft:'left',d:'right',D:'right',ArrowRight:'right',r:'reverse',R:'reverse'};
  const key=e=>{const source=`key:${e.code||e.key}`;if(e.type==='keyup'){controller.release(source);return;}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.closest?.('[role="slider"]'))return;if(e.key==='Escape'){config.current.pause();return;}const action=mapping[e.key];if(action){e.preventDefault();if(!config.current.paused)controller.press(action,source);}};
  const blur=()=>config.current.pause(),hidden=()=>{if(document.hidden)config.current.pause();},lost=e=>{e.preventDefault();config.current.pause();setError('Konteks grafis terputus. Kembali ke peta, lalu buka Kota 3D lagi.');};
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);const element=canvas.current;element.addEventListener('webglcontextlost',lost);
  let frame,last=null,paint=0,ui=0,accumulator=0,perf=0;
  const tick=now=>{const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;const c=config.current;if(!c.paused&&!document.hidden){accumulator+=dt;while(accumulator>=1/60){state.current=stepCity(state.current,controller.read(c.settings.sensitivity),1/60);accumulator-=1/60;}}else accumulator=0;
   const interval=c.settings.quality==='low'?50:1000/30;if(!document.hidden&&now-paint>=interval){world.render(state.current,c.view,!c.paused);paint=now-(now-paint)%interval;}if(now-perf>1000){setStats(world.performance());perf=now;}if(now-ui>150){setHud({...state.current});ui=now;}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  return()=>{alive.current=false;fetchController.abort();timers.forEach(clearTimeout);cancelAnimationFrame(frame);controller.clear();window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);element.removeEventListener('webglcontextlost',lost);world.dispose();runtime.current=null;};
 // The city runtime persists across HUD reports and settings changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function importFile(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;pause();if(file.size>MODEL_LIMIT){setModelMessage('GLB maksimal 20 MB.');return;}const type=slot,version=(versions.current[type]||0)+1;versions.current[type]=version;setBusy(true);try{const model=await parseCityGLB(await file.arrayBuffer());if(!alive.current||versions.current[type]!==version){disposeCityObjects(model);return;}const count=runtime.current.install(type,model);setModelMessage(`Model ${CITY_SLOTS[type].label} dimuat pada ${count} objek. Dasar model ditambatkan ke tanah.`);}catch(e){if(alive.current)setModelMessage(`${e.message||'Model gagal dimuat.'} Model sebelumnya tetap digunakan.`);}finally{if(alive.current)setBusy(false);}}
 function reset(){controller.clear();state.current={...state.current,player:citySpawn(state.current.vehicles),message:'',trafficWarning:'',noticeUntil:0};setHud({...state.current});setPaused(true);setMenu(false);}
 const phase=SIGNAL_PHASES[hud.signal.phase];
 return <main className={'route-screen city-screen'+(menu?' menu-open':'')} aria-label="Kawasan kota 3D"><canvas ref={canvas} aria-label="Kota 3D, kendaraan dan persimpangan"/>
  <header className="city-hud"><div><h1>Kota 3D</h1><p><span data-testid="city-speed">{Math.round(Math.abs(hud.player.speed)*3.6)}</span> km/jam · {hud.vehicles.length} kendaraan</p><small>Kawasan contoh · {party.map(id=>CHARACTERS.find(c=>c.id===id)?.name).join(' & ')}</small></div><nav aria-label="Kontrol kota"><button disabled={!ready||!!error} onClick={paused?resume:pause}>{paused?'Lanjutkan':'Jeda'}</button><button onClick={()=>{if(!menu)pause();setMenu(!menu);}} aria-expanded={menu}>Menu</button><button onClick={onExit}>Peta</button></nav></header>
  {!menu&&<aside className="city-signal" aria-label="Status lampu lalu lintas"><span className={signalColor(hud.signal,'z')}>Utara–selatan: {signalColor(hud.signal,'z')==='green'?'Hijau':signalColor(hud.signal,'z')==='amber'?'Kuning':'Merah'}</span><span className={signalColor(hud.signal,'x')}>Timur–barat: {signalColor(hud.signal,'x')==='green'?'Hijau':signalColor(hud.signal,'x')==='amber'?'Kuning':'Merah'}</span><small>{hud.signal.held?'Menunggu simpang kosong':`${Math.ceil(phase.duration-hud.signal.elapsed)} dtk`}</small></aside>}
  {menu&&<section className="route-menu city-menu" aria-label="Menu kota 3D"><div className="route-menu-heading"><strong>Kawasan kota contoh</strong><button aria-label="Tutup menu kota" onClick={()=>setMenu(false)}>×</button></div><p>Kontrol Vespa, amati kendaraan yang menjaga jarak dan mematuhi lampu. Zebra cross dan bangunan dibuat sebagai objek 3D. Progres ziarah utama tetap terpisah.</p>
   <label>Sudut kamera<select aria-label="Sudut kamera kota" value={view} onChange={e=>setView(e.target.value)}>{[['behind','Belakang'],['front','Depan'],['left','Kiri'],['right','Kanan'],['top','Atas']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label>Kualitas grafis<select aria-label="Kualitas grafis kota" value={settings.quality} onChange={e=>changeSettings({...settings,quality:e.target.value})}><option value="low">Hemat</option><option value="balanced">Seimbang</option><option value="high">Tinggi</option></select></label>
   <label>Kontrol kemudi<select aria-label="Kontrol kemudi kota" value={settings.controls} onChange={e=>changeSettings({...settings,controls:e.target.value})}><option value="buttons">Tombol kiri / kanan</option><option value="pad">Kemudi geser</option></select></label>
   <RidePerformance metrics={stats} quality={settings.quality} mode="kota" target={settings.quality==='low'?20:30} onReset={()=>{runtime.current?.resetPerformance();setStats(runtime.current?.performance()||null);}}/>
   <h2>Model GLB opsional</h2><label>Jenis objek<select aria-label="Jenis model GLB" value={slot} disabled={busy} onChange={e=>setSlot(e.target.value)}>{Object.entries(CITY_SLOTS).map(([id,value])=><option key={id} value={id}>{value.label}</option>)}</select></label><label>Pilih model GLB<input aria-label="Pilih model GLB" type="file" accept=".glb,model/gltf-binary" disabled={busy||!ready} onChange={importFile}/></label><p role="status">{busy?'Memuat model…':modelMessage}</p><small>GLB maksimal 20 MB dengan tekstur tertanam, sumbu atas Y dan arah depan +Z. Pratinjau file berlaku selama kawasan terbuka. Untuk aset tetap, gunakan city-manifest.json.</small>
   <button onClick={reset}>Kembali ke posisi awal kota</button><button onClick={resume} disabled={!!error}>Lanjutkan berkendara</button><button onClick={onExit}>Kembali ke peta</button>
  </section>}
  {!ready&&!error&&<div className="city-overlay" role="status">Menyiapkan kawasan 3D…</div>}
  {error&&<div className="city-overlay" role="alert"><h2>Kota belum dapat ditampilkan</h2><p>{error}</p><button onClick={onExit}>Kembali ke peta</button></div>}
  {paused&&!menu&&!error&&ready&&<div className="city-overlay"><h2>Kota dijeda</h2><p>Kendaraan dan lampu berhenti sementara.</p><button onClick={resume}>Lanjutkan berkendara</button></div>}
  {!menu&&hud.message&&<p className="city-warning" role="status">{hud.message}</p>}
  {!menu&&ready&&!error&&<RideControls key={`${paused}-${settings.controls}`} controller={controller} status={paused?'paused':'moving'} settings={settings}/>}
  <p className="city-help">W/↑ gas · A/D belok · S/Spasi rem · R mundur · Esc jeda. Lajur kiri. Area ini belum terhubung ke rute Indonesia.</p>
 </main>;
}
