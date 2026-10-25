"use client";
import {useState} from 'react';
import {canParkVisit,isParkedForVisit,hasRecordedVisit,visitMilestones,journeySummaryText} from '@/lib/visit-flow.mjs';
import {isValidParty} from '@/lib/party.mjs';
import {distanceLabel} from '@/lib/catalog.mjs';
import {clockLabel} from '@/lib/travel-resources.mjs';
import './visit-flow.css';

export function VisitActions({journey,place,party,onPark,onRecord}){
 const [message,setMessage]=useState(''),pair=journey.party.length?journey.party:party,near=canParkVisit(journey,place),parked=isParkedForVisit(journey,place,pair),recorded=hasRecordedVisit(journey,place,pair),ready=journey.hydrated&&isValidParty(pair);
 function run(action){const result=action();setMessage(result.message);}
 return <section className="visit-flow" aria-label="Tahapan kunjungan maqbarah"><ol className="visit-steps"><li className={near?'is-done':''}>1. Tiba dan berhenti</li><li className={parked||recorded?'is-done':''}>2. Parkirkan Vespa</li><li className={recorded?'is-done':''}>3. Catat kunjungan</li></ol>
 {recorded?<p className="visit-recorded" role="status">Kunjungan untuk pasangan ini sudah dicatat.</p>:<><p>{!ready?'Pilih dua karakter dahulu.':!near?'Berhenti dekat maqbarah atau selesaikan perjalanan ke tujuan ini.':parked?'Vespa sudah diparkir. Catat kunjungan untuk menambah progres.':'Parkirkan Vespa sebelum mencatat kunjungan.'}</p><div className="visit-buttons"><button type="button" className="button secondary" disabled={!ready||!near||parked} onClick={()=>run(onPark||(()=>journey.parkVisit(place.id,party)))}>{parked?'Vespa sudah diparkir':'Parkirkan Vespa'}</button><button type="button" className="button primary" disabled={!ready||!parked} onClick={()=>run(onRecord||(()=>journey.recordVisit(place.id,party)))}>Catat kunjungan</button></div></>}
 {message&&<p role="status">{message}</p>}</section>;
}

export function JourneyChecklist({journey,onProfile,onSummary}){
 const progress=visitMilestones(journey);
 return <section className="journey-checklist" aria-label="Daftar sembilan maqbarah"><strong>{progress.count}/{progress.total} maqbarah sudah dicatat</strong><progress max={progress.total} value={progress.count} aria-label="Progres sembilan maqbarah"/><p>Kedatangan belum otomatis dihitung. Parkir dan catat kunjungan, termasuk di lokasi awal.</p><ul>{progress.places.map(p=><li key={p.id}><span className={p.completed?'check-done':''}>{p.completed?'✓':'○'}</span><span>{p.name}<small>{p.completed?'Sudah dicatat':'Belum dicatat'}</small></span><button type="button" className="button secondary" onClick={()=>onProfile(p.id)} aria-label={`Profil ${p.name}`}>Profil</button></li>)}</ul>{onSummary&&<button type="button" className="button secondary" onClick={onSummary}>Buka ringkasan ziarah</button>}</section>;
}

export function JourneySummary({journey,onProfile,onJournal}){
 const progress=visitMilestones(journey);
 function download(){const blob=new Blob([journeySummaryText(journey)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ringkasan-ziarah-walisongo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className={'journey-finish'+(progress.complete?' is-complete':'')} aria-label="Ringkasan progres ziarah"><span className="journey-finish-count">{progress.count}/{progress.total}</span><h3>{progress.complete?'Ziarah Walisongo selesai':'Progres ziarah Walisongo'}</h3><p>{progress.complete?'Sembilan maqbarah telah dicatat pada simpanan ini. Jurnal dan progres tetap tersedia; Anda dapat melanjutkan kunjungan tambahan.':'Lanjutkan kunjungan yang belum dicatat. Lokasi awal juga termasuk dalam sembilan maqbarah.'}</p><dl><div><dt>Jarak berkendara tersimpan</dt><dd>{distanceLabel(journey.resources.totalMeters)}</dd></div><div><dt>Waktu permainan</dt><dd>{clockLabel(journey.resources.clock)}</dd></div></dl>
 <JourneyChecklist journey={journey} onProfile={onProfile}/><div className="visit-buttons"><button type="button" className="button primary" onClick={download}>Unduh ringkasan teks</button><button type="button" className="button secondary" onClick={onJournal}>Buka jurnal kunjungan</button></div><small>Ringkasan teks bukan cadangan progres. Gunakan menu Cadangan untuk memindahkan atau memulihkan simpanan.</small>{journey.storageNote&&<p className="muted small">{journey.storageNote}</p>}</section>;
}
