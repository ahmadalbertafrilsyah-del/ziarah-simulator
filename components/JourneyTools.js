"use client";
import {useRef,useState} from 'react';
import {distanceLabel,CHARACTERS} from '@/lib/catalog.mjs';
import {MAX_STOPS} from '@/lib/itinerary.mjs';
import {BACKUP_LIMIT,inspectBackup} from '@/lib/game-backup.mjs';
import {clockLabel,METERS_PER_LITER} from '@/lib/travel-resources.mjs';
import './journey-tools.css';
import {canContinueFromStop} from '@/lib/visit-flow.mjs';
export function ItinerarySummary({journey,onNext}){
 const t=journey.itinerary;if(!t)return null;
 const hasNext=t.index+1<t.stopIds.length;
 return <section className="itinerary-summary" aria-label="Rangkaian perjalanan aktif"><strong>Tujuan {t.index+1} dari {t.stopIds.length}</strong><ol>{t.stopIds.map((id,i)=><li key={id} className={i===t.index?'current-stop':''}>{journey.locations.find(p=>p.id===id)?.name}{i<t.index?' · sudah tiba':i===t.index?(journey.status==='arrived'?' · sudah tiba':' · tujuan aktif'):''}</li>)}</ol><p>Sisa seluruh rangkaian: {distanceLabel(journey.itineraryRemaining)} · Perkiraan bensin {(journey.itineraryRemaining/METERS_PER_LITER).toFixed(2)} L</p>{journey.itineraryRemaining/METERS_PER_LITER>journey.resources.fuel&&<p>Perkiraan bensin melebihi isi tangki saat ini. Rencanakan berhenti di SPBU simulasi.</p>}{journey.status==='arrived'&&(hasNext?<button type="button" className="button primary" disabled={!canContinueFromStop(journey)} onClick={onNext}>Siapkan tujuan berikutnya</button>:<p role="status">Seluruh tujuan dalam rangkaian sudah dicapai. Parkir dan catat kunjungan terakhir melalui profil atau simulator.</p>)}</section>;
}
export function ItineraryPlanner({journey,selectedId,onPlanned}){
 const t=journey.itinerary,offset=t?t.index+(journey.status==='arrived'?1:0):0;
 const [ids,setIds]=useState(()=>t?t.stopIds.slice(offset):selectedId!==journey.origin.id?[selectedId]:[]);
 const [candidate,setCandidate]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const locked=['moving','paused','loading'].includes(journey.status)||busy;
 const options=journey.locations.filter(p=>p.id!==journey.origin.id&&!ids.includes(p.id));
 function move(i,delta){setIds(old=>{const list=[...old];[list[i],list[i+delta]]=[list[i+delta],list[i]];return list;});}
 async function submit(){setBusy(true);setMessage('Menghitung jalan untuk seluruh urutan tujuan…');try{const r=await journey.planStops(ids);setMessage(r.message);if(r.ok)onPlanned(r.message);}finally{setBusy(false);}}
 return <section className="itinerary-planner"><p>Susun maksimal {MAX_STOPS} tujuan berbeda dari {journey.origin.name}. Vespa berhenti di setiap maqbarah; kamu yang memulai ruas berikutnya.</p>
  {locked&&<p className="muted small">Urutan tidak dapat diubah saat perjalanan aktif atau rute sedang dihitung.</p>}
  <ol className="stop-list">{ids.map((id,i)=><li key={id}><div><small>TUJUAN {i+1}</small><strong>{journey.locations.find(p=>p.id===id)?.name||id}</strong></div><div className="stop-actions"><button type="button" disabled={locked||i===0} aria-label={`Naikkan tujuan ${i+1}`} onClick={()=>move(i,-1)}>↑</button><button type="button" disabled={locked||i===ids.length-1} aria-label={`Turunkan tujuan ${i+1}`} onClick={()=>move(i,1)}>↓</button><button type="button" disabled={locked} aria-label={`Hapus tujuan ${i+1}`} onClick={()=>setIds(old=>old.filter(v=>v!==id))}>×</button></div></li>)}</ol>
  {!ids.length&&<p>Belum ada tujuan. Tambahkan dari pilihan berikut.</p>}
  <div className="ziarah-form"><label>Tambah tujuan ke rangkaian<select value={candidate} disabled={locked||ids.length>=MAX_STOPS} onChange={e=>setCandidate(e.target.value)}><option value="">Pilih maqbarah…</option>{options.map(p=><option key={p.id} value={p.id}>{p.name}{p.custom?' (tambahan)':''}</option>)}</select></label><button type="button" className="button secondary" disabled={locked||!candidate||ids.length>=MAX_STOPS} onClick={()=>{setIds(old=>[...old,candidate]);setCandidate('');}}>Tambahkan tujuan</button></div>
  <p className="muted small">Mengubah urutan lalu menghitung ulang mengganti rute siap sebelumnya. Jika satu ruas gagal, keberangkatan tidak diaktifkan. Kamu masih bisa memilih rute tunggal dari panel utama.</p>
  <button type="button" className="button primary" disabled={locked||!ids.length||!journey.hydrated} onClick={submit}>{busy?'Menghitung seluruh rute…':'Hitung rangkaian rute'}</button><p role="status">{message}</p>
 </section>;
}
export function BackupPanel({journey,party,start,onRestored}){
 const [pending,setPending]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const readToken=useRef(0);
 // A new selection invalidates any slower, previous File.text() result.
 async function readFile(e){const token=++readToken.current;const file=e.target.files?.[0];e.target.value='';setPending(null);setMessage('');setBusy(false);if(!file)return;if(file.size>BACKUP_LIMIT){setMessage('File cadangan maksimal 20 MB.');return;}setBusy(true);try{const raw=await file.text();const preview=inspectBackup(raw,start);if(readToken.current===token)setPending({raw,preview,name:file.name});}catch(error){if(readToken.current===token)setMessage(error.message);}finally{if(readToken.current===token)setBusy(false);}}
 function download(){try{const raw=journey.exportProgress(party),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`ziarah-walisongo-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('File cadangan disiapkan. Simpan file unduhannya di tempat aman.');}catch(e){setMessage(e.message);}}
 function restore(){if(!pending)return;const r=journey.restoreProgress(pending.raw);setMessage(r.message);if(r.ok){setPending(null);onRestored(r);}}
 const preview=pending?.preview,s=preview?.session;
 return <section className="backup-panel"><p>Cadangkan progres ke file JSON untuk dipulihkan pada browser atau perangkat lain. Tidak ada akun atau sinkronisasi otomatis.</p>
  <button type="button" className="button primary" disabled={!journey.hydrated||journey.status==='loading'||busy} onClick={download}>Unduh cadangan progres</button>
  <div className="ziarah-form"><label>Pilih file cadangan JSON<input type="file" accept=".json,application/json" disabled={busy||journey.status==='loading'} onChange={readFile}/></label></div>
  <p className="muted small">Maksimal 20 MB. Termasuk posisi dan rute, urutan tujuan, bensin dan bekal, karakter, lokasi tambahan, jurnal serta catatan pribadi. File tidak dienkripsi.</p>
  {s&&<div className="backup-preview"><h3>Periksa cadangan</h3><p>{pending.name}</p><dl><dt>Dibuat</dt><dd>{preview.exportedAt?new Date(preview.exportedAt).toLocaleString('id-ID'):'Waktu tidak tersedia'}</dd><dt>Posisi</dt><dd>{s.origin.name}</dd><dt>Tujuan aktif</dt><dd>{s.destination?.name||'Belum ada'}</dd><dt>Karakter pilihan</dt><dd>{preview.selectedParty.map(id=>CHARACTERS.find(c=>c.id===id)?.name).join(' & ')||'Belum dipilih'}</dd><dt>Waktu permainan</dt><dd>{clockLabel(s.resources.clock)}</dd><dt>Isi cadangan</dt><dd>{s.customLocations.length} lokasi tambahan · {s.visits.length} catatan kedatangan · {s.completedSeedIds.length}/9 Walisongo{s.itinerary?` · tujuan ${s.itinerary.index+1}/${s.itinerary.stopIds.length}`:''}</dd></dl>
   <p>Memulihkan cadangan akan mengganti seluruh progres pada browser ini, termasuk catatan dan lokasi tambahan. Unduh cadangan progres sekarang terlebih dahulu jika ingin menyimpannya. Perjalanan aktif akan dipulihkan dalam keadaan dijeda.</p>
   <div className="ziarah-buttons"><button type="button" className="button secondary" onClick={()=>{++readToken.current;setPending(null);setMessage('Pemulihan dibatalkan.');}}>Batal memulihkan</button><button type="button" className="button primary" disabled={busy||journey.status==='loading'} onClick={restore}>Ganti progres dengan cadangan ini</button></div>
  </div>}
  <p role="status">{busy?'Memeriksa file cadangan…':message}</p>
 </section>;
}
