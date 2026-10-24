"use client";
import {useState} from "react";
import {PLACE_TYPES} from "@/lib/catalog.mjs";
import {validateLocation} from "@/lib/game-engine.mjs";
import Icon from "./Icon";
export default function LocationForm({initial,onSave,onCancel}){
 const [type,setType]=useState(initial?.type||"maqbarah"),[error,setError]=useState("");
 function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);
  try{const p=validateLocation({id:initial?.id||"lokasi-"+crypto.randomUUID(),type,name:f.get("name"),person:f.get("person"),region:f.get("region"),history:f.get("history"),source:f.get("source"),coordinates:[Number(f.get("longitude")),Number(f.get("latitude"))],canRest:f.get("canRest")==="on",custom:initial?.custom??true});onSave(p);}
  catch(err){setError(err.message);}
 }
 return <form onSubmit={submit} className="location-form">
  <label>Jenis lokasi<select value={type} onChange={e=>setType(e.target.value)}>{Object.entries(PLACE_TYPES).map(([id,t])=><option key={id} value={id}>{t.label}</option>)}</select></label>
  <label>Nama lokasi<input name="name" required maxLength={100} defaultValue={initial?.name||""} placeholder="Contoh: Maqbarah keluarga"/></label>
  {type==="maqbarah"&&<label>Nama tokoh yang diziarahi<input name="person" maxLength={120} defaultValue={initial?.person||""} placeholder="Nama sunan, kiai, atau tokoh"/></label>}
  <label>Alamat / wilayah<input name="region" maxLength={140} defaultValue={initial?.region||""} placeholder="Desa, kota, atau kabupaten"/></label>
  <div className="form-row"><label>Latitude<input name="latitude" type="number" step="any" required min="-11.5" max="6.5" defaultValue={initial?.coordinates?.[1]}/></label><label>Longitude<input name="longitude" type="number" step="any" required min="94" max="142" defaultValue={initial?.coordinates?.[0]}/></label></div>
  <label>{type==="maqbarah"?"Sejarah / catatan tokoh":"Catatan lokasi"}<textarea name="history" rows={5} maxLength={6000} defaultValue={initial?.history||""} placeholder="Tuliskan sejarah atau informasi yang ingin Anda simpan…"/></label>
  <label>Sumber atau rujukan (opsional)<input name="source" type="url" maxLength={1000} defaultValue={initial?.source||""} placeholder="https://…"/></label>
  {type==="masjid"&&<label className="checkbox-label"><input name="canRest" type="checkbox" defaultChecked={!!initial?.canRest}/>Tersedia fasilitas singgah / istirahat dalam game</label>}
  {type==="hotel"&&<p className="muted small">Hotel menawarkan istirahat. Tarif simulasi: Rp50.000.</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="modal-actions"><button className="button secondary" type="button" onClick={onCancel}>Batal</button><button className="button primary" type="submit"><Icon name="save" size={17}/>Simpan lokasi</button></div>
 </form>;
}

