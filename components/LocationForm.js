"use client";
import {useState} from 'react';
import {validateCustomLocation} from '@/lib/ziarah-journal.mjs';
export default function LocationForm({initial,onSave,onCancel,onPickMap}){
 const [error,setError]=useState('');
 function read(form){const f=new FormData(form);return {id:initial?.id||`custom-${crypto.randomUUID()}`,name:f.get('name'),person:f.get('person'),region:f.get('region'),history:f.get('history'),source:f.get('source'),coordinates:[Number(f.get('longitude')),Number(f.get('latitude'))]};}
 function submit(e){e.preventDefault();try{const p=validateCustomLocation(read(e.currentTarget)),result=onSave(p);if(!result.ok)setError(result.message);}catch(e){setError(e.message);}}
 return <form className="ziarah-form" onSubmit={submit}>
  <p className="muted small">Lokasi ini milikmu pada browser ini. Lokasi tambahan tidak mengubah daftar sembilan Walisongo dan tidak dipublikasikan ke peta umum.</p>
  <label>Nama maqbarah<input name="name" required maxLength={100} defaultValue={initial?.name||''}/></label>
  <label>Nama tokoh<input name="person" maxLength={120} defaultValue={initial?.person||''}/></label>
  <label>Wilayah / alamat<input name="region" maxLength={140} defaultValue={initial?.region||''}/></label>
  <div className="ziarah-row"><label>Latitude<input name="latitude" required type="number" step="any" min="-11.5" max="6.5" defaultValue={initial?.coordinates?.[1]}/></label><label>Longitude<input name="longitude" required type="number" step="any" min="94" max="142" defaultValue={initial?.coordinates?.[0]}/></label></div>
  {onPickMap&&<button type="button" className="button secondary" onClick={e=>onPickMap(read(e.currentTarget.form))}>Pilih titik di peta</button>}
  <label>Sejarah / keterangan dari kamu<textarea name="history" rows={5} maxLength={6000} defaultValue={initial?.history||''}/></label>
  <label>Sumber rujukan (opsional)<input name="source" type="url" maxLength={1000} placeholder="https://…" defaultValue={initial?.source||''}/></label>
  <small>Keterangan yang diisi pengguna belum diverifikasi. Pastikan koordinat dan akses jalan sesuai; penghitungan rute dapat gagal jika tidak ada akses kendaraan.</small>
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="modal-actions"><button type="button" className="button secondary" onClick={onCancel}>Batal</button><button type="submit" className="button primary">Simpan lokasi</button></div>
 </form>;
}
