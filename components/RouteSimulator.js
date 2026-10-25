"use client";
import {VisitActions} from './VisitFlow';
import {canContinueFromStop} from '@/lib/visit-flow.mjs';
import MaintenancePanel from "./MaintenancePanel";
import RideNavigation from './RideNavigation';
import RideControls,{RidePreferences} from './RideControls';
import {useEffect,useRef,useState,useMemo,useCallback} from 'react';
import {createRoad} from '@/lib/route-drive.mjs';
import {getFacilities,nearbyFacility,serviceLabel} from '@/lib/route-facilities.mjs';
import {createRouteSimulation} from '@/lib/route-collision.mjs';
import RidePerformance from './RidePerformance';
import {blockedReason,clockLabel,CAPACITY} from '@/lib/travel-resources.mjs';
import {createCityScene} from '@/lib/city-scene.mjs';
import {createRideAudio} from '@/lib/ride-audio.mjs';
import {buildNavigation} from '@/lib/ride-navigation.mjs';
import {createRideInput} from '@/lib/ride-input.mjs';
import {DEFAULT_RIDE_SETTINGS,QUALITY_PRESETS,RIDE_SETTINGS_KEY,readRideSettings,normalizeRideSettings} from '@/lib/ride-settings.mjs';
import {CHARACTERS,ASSET,distanceLabel} from '@/lib/catalog.mjs';
import './driving.css';
import './route-simulator.css';
export default function RouteSimulator({route,destination,party,initialDriver,status,onProgress,onPause,onResume,onExit,onService,onProfile,itinerary,onNext,visitJourney,onPark,onRecord,onSummary}){
 const audio=useRef(null),audioPending=useRef(false),lastCue=useRef({arrived:false,breakdown:false});
 const [audioReady,setAudioReady]=useState(false);
 const worldRef=useRef(null),simulation=useRef(null);
 const [stats,setStats]=useState(null);
 const root=useRef(null),canvas=useRef(null),state=useRef(null),config=useRef(null),resizeRef=useRef(null),repaint=useRef(true);
 const controller=useMemo(()=>createRideInput(),[]);
 const [menuOpen,setMenuOpen]=useState(false),[serviceMessage,setServiceMessage]=useState('');
 const [settings,setSettings]=useState(DEFAULT_RIDE_SETTINGS),[settingsLoaded,setSettingsLoaded]=useState(false),[settingsMessage,setSettingsMessage]=useState(''),[fullscreen,setFullscreen]=useState(false);
 const road=useMemo(()=>createRoad(route),[route]),facilities=useMemo(()=>getFacilities(road),[road]),turns=useMemo(()=>buildNavigation(road),[road]);
 const [camera,setCamera]=useState('behind'),[hud,setHud]=useState(()=>initialDriver),[error,setError]=useState('');
 const near=nearbyFacility(road,hud),nextFacility=facilities.find(f=>f.progress>=(hud?.progress||0)-20);
 const pauseRuntime=useCallback(()=>{controller.clear();audio.current?.silence();worldRef.current?.pausePerformance();if(!state.current)return;state.current={...state.current,speed:0,steering:0};if(config.current)config.current.status='paused';onProgress({...state.current});onPause();repaint.current=true;},[controller,onProgress,onPause]);
 useEffect(()=>{audio.current=createRideAudio();return()=>{audio.current?.dispose();audio.current=null;};},[]);
 async function unlockSound(){if(!settings.sound||audioPending.current||audio.current?.ready)return;audioPending.current=true;try{await audio.current?.enable(settings.volume);setAudioReady(!!audio.current?.ready);}catch{setSettingsMessage('Ketuk Aktifkan suara di menu untuk mengizinkan audio.');}finally{audioPending.current=false;}}
 async function toggleSound(enabled){if(!enabled){audio.current?.silence();changeSettings({...settings,sound:false});return;}try{await audio.current.enable(settings.volume);setAudioReady(true);changeSettings({...settings,sound:true});}catch(e){setSettingsMessage(e.message||'Audio belum dapat diaktifkan.');}}
 const enterFacility=useCallback(()=>{const f=nearbyFacility(road,state.current);if(f&&Math.abs(state.current.speed)<=.5){pauseRuntime();setServiceMessage('');setMenuOpen(true);}},[road,pauseRuntime]);
 useEffect(()=>{const timer=setTimeout(()=>{try{setSettings(readRideSettings(localStorage.getItem(RIDE_SETTINGS_KEY)));}catch{setSettingsMessage('Pengaturan browser belum tersedia.');}setSettingsLoaded(true);},0);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{const change=()=>setFullscreen(document.fullscreenElement===root.current);document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
 function changeSettings(value){const next=normalizeRideSettings(value);if(next.controls!==settings.controls||next.controlSize!==settings.controlSize||next.sensitivity!==settings.sensitivity)controller.clear();setSettings(next);repaint.current=true;if(!next.sound)audio.current?.silence();try{localStorage.setItem(RIDE_SETTINGS_KEY,JSON.stringify(next));setSettingsMessage('Pengaturan tersimpan pada browser ini.');}catch{setSettingsMessage('Pengaturan dipakai, tetapi belum tersimpan pada browser.');}}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.current?.requestFullscreen)await root.current.requestFullscreen();else throw Error();}catch{setSettingsMessage('Layar penuh belum didukung atau ditolak browser ini. Kontrol tetap dapat digunakan.');}}
 useEffect(()=>{config.current={status,camera,onProgress,pauseRuntime,party,enterFacility,settings,menuOpen};if(status!=='moving'){controller.clear();audio.current?.silence(!(status==='arrived'||state.current?.resources?.breakdown));if(state.current){state.current.speed=0;state.current.steering=0;}}repaint.current=true;},[status,camera,onProgress,pauseRuntime,party,enterFacility,settings,menuOpen,controller]);
 useEffect(()=>{resizeRef.current?.();},[settings.quality]);
 useEffect(()=>{
  state.current={...initialDriver,speed:0};
  simulation.current=createRouteSimulation(road,state.current);
  const el=canvas.current;let world;
  try{world=createCityScene(el,party,{player:state.current,vehicles:simulation.current.vehicles},config.current.settings.quality,{road});worldRef.current=world;}catch(e){const t=setTimeout(()=>{setError(e.message);config.current.pauseRuntime();},0);return()=>clearTimeout(t);}
  const render=(driver,view,party,detail)=>world.render({player:driver,vehicles:simulation.current.vehicles,time:simulation.current.time,helmets:detail.helmets},view,config.current.status==='moving'&&!config.current.menuOpen);
  const resize=()=>{world.qualityChange(config.current.settings.quality);repaint.current=true;};
  resizeRef.current=resize;resize();
  const lost=e=>{e.preventDefault();config.current.pauseRuntime();setError('Konteks grafis terputus. Kembali ke peta lalu buka simulator perjalanan lagi.');};el.addEventListener('webglcontextlost',lost);
  const mapping={w:'gas',W:'gas',ArrowUp:'gas',s:'brake',S:'brake',ArrowDown:'brake',' ':'brake',a:'left',A:'left',ArrowLeft:'left',d:'right',D:'right',ArrowRight:'right',r:'reverse',R:'reverse'};
  const key=e=>{const source=`key:${e.code||e.key}`;
   if(e.type==='keyup'){controller.release(source);return;}
   if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.closest?.('[role="slider"]'))return;
   if(['e','E'].includes(e.key)&&!e.repeat){e.preventDefault();config.current.enterFacility();return;}
   if(e.key==='Escape'){config.current.pauseRuntime();return;}
   const action=mapping[e.key];if(action){e.preventDefault();if(config.current.status==='moving'&&!config.current.menuOpen)controller.press(action,source);}
  };
  const blur=()=>config.current.pauseRuntime(),hidden=()=>{if(document.hidden)config.current.pauseRuntime();};
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  let frame,last=null,ui=0,draw=0,accumulator=0,perf=0;
  const tick=now=>{
   const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;const c=config.current,preset=QUALITY_PRESETS[c.settings.quality];
   const moving=c.status==='moving'&&!c.menuOpen&&!document.hidden&&!state.current.arrived;
   if(moving){accumulator+=dt;while(accumulator>=1/60){state.current=simulation.current.advance(state.current,controller.read(c.settings.sensitivity),1/60,c.party);accumulator-=1/60;}}else accumulator=0;
   const interval=moving?1000/preset.fps:1000;
   if(!document.hidden&&(repaint.current||now-draw>=interval)){render(state.current,c.camera,c.party,{...preset,helmets:c.settings.helmets});draw=now-((now-draw)%interval);repaint.current=false;}
   if(now-perf>1000){setStats(world.performance());perf=now;}
   if(now-ui>150){
    const soundEnabled=c.settings.sound&&!document.hidden;
    if(soundEnabled){audio.current?.update(state.current,moving&&!state.current.arrived&&!state.current.resources.breakdown,controller.read().gas,c.settings.volume);const arrived=!!state.current.arrived,broken=!!state.current.resources.breakdown;if(arrived&&!lastCue.current.arrived)audio.current?.cue('arrived');else if(broken&&!lastCue.current.breakdown)audio.current?.cue('breakdown');lastCue.current={arrived,breakdown:broken};}else audio.current?.silence();
    setHud({...state.current});c.onProgress({...state.current});ui=now;
   }
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);el.removeEventListener('webglcontextlost',lost);world.dispose();worldRef.current=null;simulation.current=null;controller.clear();resizeRef.current=null;window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 // Preserve the running physics instance across HUD, camera and preferences updates.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[route]);
 function pauseNow(){pauseRuntime();}
 function exitNow(){pauseRuntime();onExit();}
 function toggleMenu(){if(!menuOpen)pauseRuntime();setMenuOpen(!menuOpen);}
 function continueRide(){controller.clear();setMenuOpen(false);onResume();}
 function applyService(action){const result=onService(action);if(result.resources){state.current={...state.current,resources:result.resources,speed:0};setHud({...state.current});repaint.current=true;}setServiceMessage(action.startsWith('buy-')||action.startsWith('repair')?'':result.message);return result;}
 function recover(){if(status==='arrived')return;controller.clear();state.current=simulation.current.recover(state.current);onResume();onProgress({...state.current});pauseRuntime();setHud({...state.current});}
 return <main ref={root} onPointerDownCapture={unlockSound} onKeyDownCapture={unlockSound} className={"route-screen"+(menuOpen?" menu-open":"")} aria-label="Simulator perjalanan maqbarah">
  <canvas ref={canvas} aria-label="Jalan rute maqbarah dan Vespa dua karakter"/>
  <header className="route-hud"><div><small>PERJALANAN 3D MANUAL{itinerary?` · TUJUAN ${itinerary.index+1}/${itinerary.stopIds.length}`:''}</small><h1>{destination.name}</h1><p>Sisa {distanceLabel(Math.max(0,route.distanceM-(hud?.progress||0)))} · <span data-testid="ride-speed">{Math.round(Math.abs(hud?.speed||0)*3.6)}</span> km/jam</p><p className="route-vitals"><span data-testid="fuel-level">{hud.resources.fuel.toFixed(2)}</span> L · {clockLabel(hud.resources.clock)}</p></div>
  <div className="route-toolbar"><button onClick={status==='moving'?pauseNow:continueRide} disabled={status==='arrived'||!!hud.resources.breakdown}>{status==='moving'?'Jeda':'Lanjutkan'}</button><button aria-expanded={menuOpen} aria-controls="ride-menu" onClick={toggleMenu}>{menuOpen?'Tutup':'Menu'}</button></div></header>
  {!menuOpen&&<RideNavigation road={road} driver={hud} turns={turns} facilities={facilities} showMap={settings.minimap} onToggleMap={()=>changeSettings({...settings,minimap:!settings.minimap})}/>}
  {menuOpen&&<section className="route-menu" id="ride-menu" aria-label="Menu perjalanan">
   <div className="route-menu-heading"><strong>Pengaturan perjalanan</strong><button onClick={()=>setMenuOpen(false)} aria-label="Tutup menu">×</button></div>
   <p>Sudut kamera</p>
   <div className="route-cameras">{[['behind','Belakang'],['front','Depan'],['left','Kiri'],['right','Kanan'],['top','Atas']].map(([v,t])=><button key={v} aria-pressed={camera===v} onClick={()=>setCamera(v)}>{t}</button>)}</div>
   <RidePreferences settings={settings} onChange={changeSettings} loaded={settingsLoaded} message={settingsMessage} onFullscreen={toggleFullscreen} fullscreen={fullscreen} onAudio={toggleSound} audioReady={audioReady}/>
   <RidePerformance metrics={stats} quality={settings.quality} mode="perjalanan" target={QUALITY_PRESETS[settings.quality].fps} onReset={()=>{worldRef.current?.resetPerformance();setStats(worldRef.current?.performance()||null);}}/>
   <aside className="route-party">{party.map((id,i)=>{const c=CHARACTERS.find(p=>p.id===id);return <div key={id}><img src={`${ASSET}/characters/${c.image}`} alt={c.name}/><span>{i===0?'Pengendara':'Penumpang'} · {c.name} · {Math.round(hud.resources.energy[id])}%</span></div>;})}</aside>
   <section className="facility-context"><strong>{near?.name || 'Di luar titik layanan'}</strong><p>{near?'Layanan dapat digunakan ketika kendaraan berhenti di area ini.':'Isi bensin di SPBU, belanja di bengkel, istirahat di penginapan atau masjid singgah.'}</p>{nextFacility&&<p>Berikutnya: {nextFacility.name} · {distanceLabel(Math.max(0,nextFacility.progress-hud.progress))} sepanjang rute.</p>}<small>Semua titik merupakan fasilitas simulasi, bukan lokasi usaha sebenarnya.</small></section>
   <MaintenancePanel resources={hud.resources} onAction={applyService} disabled={status==='moving'} canBuy={near?.type==='bengkel'} />
   <div className="route-actions"><button onClick={exitNow}>Simpan & kembali ke peta</button><button onClick={onProfile}>Profil tujuan</button><button onClick={()=>{recover();setMenuOpen(false);}} disabled={status==='arrived'}>Kembali ke jalur</button><button onClick={continueRide} disabled={status==='arrived'||!!hud.resources.breakdown}>Lanjutkan berkendara</button></div>
   <section className="travel-services" aria-label="Layanan simulasi">
    <strong>Persediaan perjalanan</strong>
    <p>Bensin {hud.resources.fuel.toFixed(2)} / {CAPACITY} L · Bekal Rp{hud.resources.money.toLocaleString('id-ID')}</p>
    <p>{clockLabel(hud.resources.clock)}</p>
    <button disabled={near?.type!=='spbu'} onClick={()=>applyService('fuel')}>Isi bensin 1 L · Rp10.000</button>
    <button disabled={!['hotel','masjid'].includes(near?.type)} onClick={()=>applyService('rest')}>{near?.type==='hotel'?'Menginap 6 jam · Rp40.000':'Istirahat 2 jam · energi +35'}</button>
    <button onClick={()=>applyService('help')} disabled={hud.resources.fuel>1e-9}>Panggil bantuan bensin</button>
    <button disabled={!party.some(id=>hud.resources.energy[id]<=0)} onClick={()=>applyService('rest-help')}>Bantuan istirahat darurat</button>
    <p role="status">{serviceMessage}</p>
    {hud.resources.serviceLog.length>0&&<details><summary>Riwayat layanan ({hud.resources.serviceLog.length})</summary><ol>{hud.resources.serviceLog.slice(-5).reverse().map((entry,i)=><li key={`${entry.clock}-${i}`}>{entry.name} · {serviceLabel(entry.action)} · {clockLabel(entry.clock)}</li>)}</ol></details>}
    <small>Pengisian dan istirahat mengikuti titik layanan. Bantuan darurat tetap bisa dipanggil dari tepi jalan.</small>
   </section>
   <p className="route-menu-help">Jalan 3D mengikuti rute yang sama dengan peta beranda. Panah hijau menunjukkan arah tujuan pada lajur kiri; kendalikan Vespa secara manual saat menikung. Tahan GAS untuk maju. Kemudi kiri/kanan atau geser mengarahkan Vespa; REM untuk berhenti dan MUNDUR untuk kembali. Melepas kemudi geser mengembalikannya ke tengah.</p>
  </section>}
  <p className="route-instruction">W/↑ gas · A/D/←/→ belok · S/↓/Spasi rem · R mundur · Esc jeda. Ikuti panah hijau dan tikungan rute peta.</p>
  {!menuOpen&&blockedReason(hud.resources,party)&&<p className="route-warning" role="alert">{blockedReason(hud.resources,party)}</p>}
  {!menuOpen&&hud.collision&&!blockedReason(hud.resources,party)&&<p className="route-warning" role="status">{hud.collision}</p>}
  {hud?.offRoad&&!hud.collision&&!menuOpen&&!blockedReason(hud.resources,party)&&<p className="route-warning">Di luar jalan. Perlambat dan arahkan kembali, atau tekan Kembali ke jalur.</p>}
  {!menuOpen&&status==='arrived'&&!error&&<section className="route-overlay arrival-overlay" role="region" aria-label="Kedatangan di maqbarah"><h2>Tiba di {destination.name}</h2><p>Vespa sudah berhenti di akses tujuan. Parkirkan Vespa, lalu catat kunjungan sebelum menyiapkan perjalanan berikutnya.</p>
   {visitJourney&&<VisitActions journey={visitJourney} place={destination} party={party} onPark={onPark} onRecord={onRecord}/>}
   <div className="arrival-actions">{onNext&&<button disabled={!visitJourney||!canContinueFromStop(visitJourney)} onClick={onNext}>Siapkan tujuan berikutnya</button>}<button onClick={onProfile}>Buka profil tujuan</button>{onSummary&&<button onClick={onSummary}>Ringkasan ziarah</button>}<button onClick={exitNow}>Kembali ke peta</button></div>
  </section>}
  {!menuOpen&&(status!=='moving'&&status!=='arrived'||error)&&<div className="route-overlay" role="status"><h2>{error?'Arena belum tersedia':hud.resources.breakdown?'Gangguan kendaraan':'Perjalanan dijeda'}</h2><p>{error||'Perjalanan dijeda. Kemajuan disimpan jika penyimpanan browser tersedia.'}</p>{status==='paused'&&!error&&(hud.resources.breakdown?<button onClick={toggleMenu}>Tangani kendaraan</button>:<button onClick={onResume}>Lanjutkan berkendara</button>)}<button onClick={exitNow}>Kembali ke peta</button></div>}
  {!menuOpen&&status!=='arrived'&&near&&!hud.collision&&<div className="facility-hint"><button disabled={Math.abs(hud.speed)>.5} onClick={enterFacility}>{Math.abs(hud.speed)>.5?'Berhenti dekat ': 'Masuk '}{near.name}{Math.abs(hud.speed)<=.5?' · E':''}</button></div>}
  {!menuOpen&&<RideControls key={`${status}-${settings.controls}-${settings.controlSize}`} controller={controller} status={error?'paused':status} settings={settings}/>}
 </main>;
}
