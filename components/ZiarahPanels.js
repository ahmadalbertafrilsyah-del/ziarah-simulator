"use client";
import {useState} from 'react';
import {CHARACTERS,ASSET} from '@/lib/catalog.mjs';
import {clockLabel} from '@/lib/travel-resources.mjs';
import {canRecordVisit,safeSource} from '@/lib/ziarah-journal.mjs';
import './ziarah.css';
function NoteEditor({initial='',label,onSave}){const [value,setValue]=useState(initial),[message,setMessage]=useState('');return <div className="ziarah-form"><label>{label}<textarea rows={4} value={value} maxLength={6000} onChange={e=>setValue(e.target.value)}/></label><button type="button" className="button secondary" onClick={()=>setMessage(onSave(value).message)}>Simpan catatan</button><p role="status">{message}</p></div>;}
export function PlaceProfile({place,journey,party}){
 const [message,setMessage]=useState('');let source='';try{source=safeSource(place.source);}catch{}
 const eligible=journey.hydrated&&canRecordVisit(journey,place)&&party.length===2;
 return <div className="place-profile"><div className="ziarah-profile-head"><img src={`${ASSET}/buildings/maqbarah.png`} alt=""/><div><span>{place.custom?'Lokasi tambahan pribadi':'Tujuan Walisongo'}</span><h3>{place.name}</h3><p>{place.person||'Nama tokoh belum diisi'}</p></div></div>
  <p>{place.region||'Wilayah belum diisi'}</p><p className="ziarah-coordinates">Latitude {place.coordinates[1]} · Longitude {place.coordinates[0]}</p>
  <h4>Sejarah / keterangan</h4><p className="ziarah-paragraph">{place.history||'Belum ada keterangan sejarah yang diisi untuk lokasi ini.'}</p>
  {place.custom&&<p className="muted small">Keterangan dan koordinat berasal dari isian pengguna, belum diverifikasi.</p>}
  {source&&<p><a href={source} target="_blank" rel="noopener noreferrer">Buka sumber lokasi / rujukan</a></p>}
  <p className="muted small">Tautan sumber lokasi tidak otomatis membuktikan seluruh isi sejarah. Catatan berikut merupakan catatan pribadi.</p>
  <NoteEditor key={place.id} initial={journey.profileNotes[place.id]||''} label="Catatan pribadi lokasi" onSave={note=>journey.saveProfileNote(place.id,note)}/>
  <button type="button" className="button primary" disabled={!eligible} onClick={()=>setMessage(journey.recordVisit(place.id,party).message)}>Catat kunjungan</button>
  {!eligible&&<p className="muted small">Pilih dua karakter dan berada dekat lokasi atau selesaikan perjalanan ke tujuan ini untuk mencatat kunjungan.</p>}
  <p role="status">{message}</p>
 </div>;
}
export function JournalPanel({journey,onProfile}){
 const [filter,setFilter]=useState('all');const visits=journey.visits.filter(v=>filter==='all'||v.confirmed);
 return <section className="journal-panel"><div className="ziarah-progress"><strong>{journey.completedSeedIds.length}/9 Walisongo</strong><p>Hanya kunjungan yang dikonfirmasi dihitung. Lokasi tambahan dicatat terpisah.</p><progress max={9} value={journey.completedSeedIds.length} aria-label="Progres kunjungan sembilan Walisongo"/></div>
  <label className="ziarah-filter">Tampilkan<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Semua kedatangan</option><option value="confirmed">Kunjungan yang dicatat</option></select></label>
  {!visits.length&&<p>Belum ada catatan untuk pilihan ini. Mulai perjalanan atau catat kunjungan di profil lokasi saat berada di sana.</p>}
  {[...visits].reverse().map(v=><article className="journal-entry" key={v.id}><span>{v.confirmed?'Kunjungan dicatat':'Kedatangan, belum dikonfirmasi'}{v.snapshot.custom?' · tambahan':''}</span><h3>{v.snapshot.name}</h3><p>{v.snapshot.region}</p><p>{v.gameClock===null?'Waktu permainan lama tidak tersedia':clockLabel(v.gameClock)}</p><p className="muted small">Tercatat pada {new Date(v.arrivedAt).toLocaleString('id-ID')} menurut waktu perangkat.</p><p>{v.party.length?v.party.map((id,i)=>`${i===0?'Pengendara':'Penumpang'}: ${CHARACTERS.find(c=>c.id===id)?.name||id}`).join(' · '):'Pasangan pada simpanan lama tidak tersedia'}</p>
   {journey.locations.some(p=>p.id===v.locationId)?<button className="button secondary" onClick={()=>onProfile(v.locationId)}>Buka profil</button>:<p className="muted small">Lokasi telah dihapus; ringkasan kedatangan tetap disimpan.</p>}
   <NoteEditor initial={v.note} label="Catatan kunjungan ini" onSave={note=>journey.saveVisitNote(v.id,note)}/>
  </article>)}
 </section>;
}
export function CustomLocationsPanel({journey,onAdd,onEdit,onProfile}){
 const [deleting,setDeleting]=useState(null),[message,setMessage]=useState('');
 const locked=['moving','paused'].includes(journey.status);
 return <section className="custom-locations"><p>Kelola lokasi ziarah tambahan. Sembilan tujuan bawaan tetap dipertahankan.</p><button className="button primary" disabled={locked} onClick={onAdd}>Tambah maqbarah</button>{locked&&<p>Selesaikan atau batalkan perjalanan aktif sebelum mengubah lokasi.</p>}
  {!journey.customLocations.length&&<p>Belum ada lokasi tambahan.</p>}
  {journey.customLocations.map(p=><article className="journal-entry" key={p.id}><h3>{p.name}</h3><p>{p.region}</p><div className="ziarah-buttons"><button className="button secondary" onClick={()=>onProfile(p.id)}>Profil</button><button className="button secondary" disabled={locked} onClick={()=>onEdit(p)}>Edit</button><button className="button secondary" disabled={locked} onClick={()=>setDeleting(p.id)}>Hapus</button></div>{deleting===p.id&&<div className="ziarah-confirm"><p>Hapus lokasi ini? Catatan kedatangan tetap ada, tetapi catatan pribadi profil lokasi akan dihapus.</p><button className="button secondary" onClick={()=>setDeleting(null)}>Batal</button><button className="button primary" onClick={()=>{const r=journey.removeLocation(p.id);setMessage(r.message);if(r.ok)setDeleting(null);}}>Ya, hapus lokasi</button></div>}</article>)}
  <p role="status">{message}</p>
 </section>;
}
