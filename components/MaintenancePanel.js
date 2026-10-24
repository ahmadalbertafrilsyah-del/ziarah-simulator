"use client";
import {useState} from 'react';
import {ITEMS} from '@/lib/vehicle-maintenance.mjs';
import './maintenance.css';
const images={tyre:'ban_cadangan.png',spark:'busi.png',wrench:'kunci_pas.png',pump:'pompa_ban.png'};
export default function MaintenancePanel({resources:r,onAction,disabled=false,canBuy=true}){
 const [message,setMessage]=useState('');
 function action(name){const result=onAction(name);setMessage(result?.message||'');}
 return <section className="maintenance-panel" aria-label="Inventaris dan perbaikan kendaraan">
  <strong>Inventaris & kondisi kendaraan</strong>
  <div className="vehicle-condition-grid"><span>Ban <b>{Math.round(r.condition.tyre)}%</b></span><span>Busi <b>{Math.round(r.condition.spark)}%</b></span></div>
  {r.breakdown&&<div className="breakdown-card"><b>{r.breakdown.type==='tyre'?'Ban bocor':'Busi mati'}</b><p>Terjadi pada {(r.breakdown.atMeters/1000).toLocaleString('id-ID',{maximumFractionDigits:2})} km jarak total. Kendaraan dijeda sampai diperbaiki.</p><button disabled={disabled} onClick={()=>action('repair')}>Perbaiki dengan inventaris</button><button disabled={disabled} onClick={()=>action('repair-help')}>Panggil bantuan perbaikan</button><small>Bantuan simulasi: ban Rp25.000 atau busi Rp15.000. Jika bekal kurang, bantuan gratis dengan waktu tunggu lebih lama.</small></div>}
  <div className="inventory-grid">{Object.entries(ITEMS).map(([key,item])=><article key={key}><div><img src={`/assets/items/${images[key]}`} alt="" onError={e=>e.currentTarget.style.display='none'}/><span>{item.name}<b data-testid={`stock-${key}`}>{r.inventory[key]} {item.max===1?'alat':'buah'}</b></span></div><button disabled={disabled||!canBuy||r.inventory[key]>=item.max||r.money<item.price} onClick={()=>action(`buy-${key}`)}>Beli · Rp{item.price.toLocaleString('id-ID')}</button></article>)}</div>
  <p className="maintenance-message" role="status">{message}</p>
  <small>Ganti ban membutuhkan ban cadangan, kunci pas, dan pompa. Ganti busi membutuhkan busi cadangan dan kunci pas. Belanja tersedia di pos persiapan atau bengkel simulasi; bantuan perbaikan bisa dipanggil dari tepi jalan.</small>
  {r.repairLog.length>0&&<details><summary>Riwayat perbaikan ({r.repairLog.length})</summary><ol>{r.repairLog.slice(-5).reverse().map((entry,i)=><li key={`${entry.clock}-${i}`}>{entry.message}</li>)}</ol></details>}
 </section>;
}
