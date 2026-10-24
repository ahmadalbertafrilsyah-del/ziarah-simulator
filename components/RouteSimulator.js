"use client";
import MaintenancePanel from "./MaintenancePanel";
import {useEffect,useRef,useState,useMemo,useCallback} from 'react';
import {createRoad,newDriver} from '@/lib/route-drive.mjs';
import {getFacilities,nearbyFacility,serviceLabel} from '@/lib/route-facilities.mjs';
import {stepExpedition} from '@/lib/expedition.mjs';
import {blockedReason,clockLabel,CAPACITY} from '@/lib/travel-resources.mjs';
import {createSceneRenderer} from '@/lib/driving-scene.mjs';
import {CHARACTERS,ASSET,distanceLabel} from '@/lib/catalog.mjs';
import './driving.css';
import './route-simulator.css';
const empty=()=>({gas:false,brake:false,reverse:false,left:false,right:false});
export default function RouteSimulator({route,destination,party,initialDriver,status,onProgress,onPause,onResume,onExit,onService,onProfile,itinerary,onNext}){
 const canvas=useRef(null),input=useRef(empty()),state=useRef(null),config=useRef(null);
 const [menuOpen,setMenuOpen]=useState(false);
 const [serviceMessage,setServiceMessage]=useState('');
 const road=useMemo(()=>createRoad(route),[route]);
 const facilities=useMemo(()=>getFacilities(road),[road]);
 const [camera,setCamera]=useState('behind'),[hud,setHud]=useState(()=>initialDriver),[error,setError]=useState('');
 const near=nearbyFacility(road,hud),nextFacility=facilities.find(f=>f.progress>=(hud?.progress||0)-20);
 const enterFacility=useCallback(()=>{const f=nearbyFacility(road,state.current);if(f&&Math.abs(state.current.speed)<=.5){onProgress({...state.current});onPause();setServiceMessage('');setMenuOpen(true);}},[road,onProgress,onPause]);
 useEffect(()=>{config.current={status,camera,onProgress,onPause,party,enterFacility};if(status!=='moving')input.current=empty();},[status,camera,onProgress,onPause,party,enterFacility]);
 useEffect(()=>{
  state.current={...initialDriver,speed:0};
  const el=canvas.current;let render;
  try{render=createSceneRenderer(el,{road});}catch(e){const t=setTimeout(()=>setError(e.message),0);return()=>clearTimeout(t);}
  const resize=()=>{const b=el.getBoundingClientRect(),dpr=Math.min(2,Math.max(1,devicePixelRatio||1),2560/Math.max(1,b.width));el.width=Math.round(b.width*dpr);el.height=Math.round(b.height*dpr);};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const mapping={w:'gas',W:'gas',ArrowUp:'gas',s:'brake',S:'brake',ArrowDown:'brake',' ':'brake',a:'left',A:'left',ArrowLeft:'left',d:'right',D:'right',ArrowRight:'right',r:'reverse',R:'reverse'};
  const key=e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['e','E'].includes(e.key)&&e.type==='keydown'&&!e.repeat){e.preventDefault();config.current.enterFacility();return;}if(e.key==='Escape'&&e.type==='keydown'){config.current.onProgress({...state.current});config.current.onPause();return;}const k=mapping[e.key];if(k){e.preventDefault();input.current[k]=e.type==='keydown'&&config.current.status==='moving';}};
  const blur=()=>{input.current=empty();config.current.onProgress({...state.current});config.current.onPause();};
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);
  let frame,last=null,ui=0,draw=0;
  const tick=now=>{
   const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;const c=config.current;
   if(c.status==='moving'&&!state.current.arrived)state.current=stepExpedition(road,state.current,input.current,dt,c.party);
   if(now-draw>33){render(state.current,c.camera,c.party);draw=now;}
   if(now-ui>150){setHud({...state.current});c.onProgress({...state.current});ui=now;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();input.current=empty();window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);};
 // Keep the physics instance alive across HUD reports and camera changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[route]);
 const touch=(name,label)=><button type="button" disabled={status!=='moving'} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current[name]=true;}} onPointerUp={()=>input.current[name]=false} onLostPointerCapture={()=>input.current[name]=false} onPointerCancel={()=>input.current[name]=false}>{label}</button>;
 function pauseNow(){onProgress({...state.current});onPause();}
 function exitNow(){onProgress({...state.current});onExit();}
 function toggleMenu(){if(!menuOpen)pauseNow();setMenuOpen(!menuOpen);}
 function continueRide(){setMenuOpen(false);onResume();}
 function applyService(action){const result=onService(action);if(result.resources){state.current={...state.current,resources:result.resources,speed:0};setHud({...state.current});}setServiceMessage(action.startsWith('buy-')||action.startsWith('repair')?'':result.message);return result;}
 function recover(){if(status==='arrived')return;state.current={...newDriver(createRoad(route),state.current.progress),resources:state.current.resources};onResume();onProgress({...state.current});onPause();setHud({...state.current});}
 return <main className="route-screen" aria-label="Simulator perjalanan maqbarah">
  <canvas ref={canvas} aria-label="Jalan rute maqbarah dan Vespa dua karakter"/>
  <header className="route-hud"><div><small>PERJALANAN MANUAL{itinerary?` · TUJUAN ${itinerary.index+1}/${itinerary.stopIds.length}`:''}</small><h1>{destination.name}</h1><p>Sisa {distanceLabel(Math.max(0,route.distanceM-(hud?.progress||0)))} · <span data-testid="ride-speed">{Math.round(Math.abs(hud?.speed||0)*3.6)}</span> km/jam</p><p className="route-vitals"><span data-testid="fuel-level">{hud.resources.fuel.toFixed(2)}</span> L · {clockLabel(hud.resources.clock)}</p></div>
  <div className="route-toolbar"><button onClick={status==='moving'?pauseNow:continueRide} disabled={status==='arrived'||!!hud.resources.breakdown}>{status==='moving'?'Jeda':'Lanjutkan'}</button><button aria-expanded={menuOpen} aria-controls="ride-menu" onClick={toggleMenu}>{menuOpen?'Tutup':'Menu'}</button></div></header>
  {menuOpen&&<section className="route-menu" id="ride-menu" aria-label="Menu perjalanan">
   <div className="route-menu-heading"><strong>Pengaturan perjalanan</strong><button onClick={()=>setMenuOpen(false)} aria-label="Tutup menu">×</button></div>
   <p>Sudut kamera</p>
   <div className="route-cameras">{[['behind','Belakang'],['front','Depan'],['left','Kiri'],['right','Kanan'],['top','Atas']].map(([v,t])=><button key={v} aria-pressed={camera===v} onClick={()=>setCamera(v)}>{t}</button>)}</div>
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
   <p className="route-menu-help">Tahan GAS untuk maju. Gunakan panah kiri/kanan untuk belok, REM untuk berhenti dan MUNDUR untuk kembali.</p>
  </section>}
  <p className="route-instruction">W/↑ gas · A/D/←/→ belok · S/↓/Spasi rem · R mundur · Esc jeda. Ikuti tikungan jalan.</p>
  {!menuOpen&&blockedReason(hud.resources,party)&&<p className="route-warning" role="alert">{blockedReason(hud.resources,party)}</p>}
  {hud?.offRoad&&!blockedReason(hud.resources,party)&&<p className="route-warning">Di luar jalan. Perlambat dan arahkan kembali, atau tekan Kembali ke jalur.</p>}
  {!menuOpen&&(status!=='moving'||error)&&<div className="route-overlay" role="status"><h2>{error?'Arena belum tersedia':status==='arrived'?`Tiba di ${destination.name}`:hud.resources.breakdown?'Gangguan kendaraan':'Perjalanan dijeda'}</h2><p>{error||(status==='arrived'?(onNext?'Berhenti di tujuan ini. Catat kunjungan atau siapkan tujuan berikutnya.':itinerary?'Seluruh tujuan dalam rangkaian sudah dicapai. Catat kunjungan melalui profil.':'Perjalanan selesai. Catat kunjungan melalui profil tujuan.'):'Perjalanan dijeda. Kemajuan disimpan jika penyimpanan browser tersedia.')}</p>{status==='paused'&&!error&&(hud.resources.breakdown?<button onClick={toggleMenu}>Tangani kendaraan</button>:<button onClick={onResume}>Lanjutkan berkendara</button>)}{status==='arrived'&&onNext&&<button onClick={onNext}>Siapkan tujuan berikutnya</button>}{status==='arrived'&&<button onClick={onProfile}>Buka profil & catat kunjungan</button>}<button onClick={exitNow}>Kembali ke peta</button></div>}
  {!menuOpen&&status!=='arrived'&&near&&<div className="facility-hint"><button disabled={Math.abs(hud.speed)>.5} onClick={enterFacility}>{Math.abs(hud.speed)>.5?'Berhenti dekat ': 'Masuk '}{near.name}{Math.abs(hud.speed)<=.5?' · E':''}</button></div>}
  <footer className="route-touch"><div>{touch('left','←')}{touch('right','→')}</div><div>{touch('reverse','MUNDUR')}{touch('brake','REM')}{touch('gas','GAS')}</div></footer>
 </main>;
}
