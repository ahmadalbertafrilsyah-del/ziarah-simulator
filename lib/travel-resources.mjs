import {initialMaintenance,validMaintenance,maintenanceService} from './vehicle-maintenance.mjs';
// All values below are game balancing rules, not real tariffs or vehicle specifications.
import {CHARACTERS} from './catalog.mjs';
export const CAPACITY=5.5, METERS_PER_LITER=35000, FUEL_PRICE=10000;
export function initialResources(){return {...initialMaintenance(),serviceLog:[],fuel:4,money:450000,clock:540,totalMeters:0,energy:Object.fromEntries(CHARACTERS.map(c=>[c.id,100]))};}
export function validResources(r){return !!r&&Array.isArray(r.serviceLog)&&r.serviceLog.length<=50&&r.serviceLog.every(e=>typeof e.facilityId==='string'&&typeof e.name==='string'&&typeof e.action==='string'&&Number.isFinite(e.clock)&&e.clock>=0)&&validMaintenance(r)&&Number.isFinite(r.fuel)&&r.fuel>=0&&r.fuel<=CAPACITY&&Number.isFinite(r.money)&&r.money>=0&&Number.isFinite(r.clock)&&r.clock>=0&&Number.isFinite(r.totalMeters)&&r.totalMeters>=0&&CHARACTERS.every(c=>Number.isFinite(r.energy?.[c.id])&&r.energy[c.id]>=0&&r.energy[c.id]<=100);}
export function blockedReason(r,party){if(r.breakdown)return r.breakdown.type==='tyre'?'Ban bocor. Buka Menu untuk perbaikan.':'Busi mati. Buka Menu untuk perbaikan.';if(r.fuel<=1e-9)return 'Bensin habis. Buka Menu untuk mengisi atau meminta bantuan.';if(party.some(id=>r.energy[id]<=0))return 'Energi karakter habis. Buka Menu untuk istirahat.';return '';}
export function advanceResources(r,meters,seconds,party){
 const distance=Math.max(0,meters),minutes=Math.max(0,seconds)*6/60,energy={...r.energy};
 party.forEach((id,i)=>energy[id]=Math.max(0,energy[id]-distance/1000*(i===0?1.2:.9)-minutes*.03));
 return {...r,fuel:Math.max(0,r.fuel-distance/METERS_PER_LITER),clock:r.clock+minutes,totalMeters:r.totalMeters+distance,energy};
}
export function serviceResources(r,action,party){
 if(action.startsWith("buy-")||["repair","repair-help"].includes(action))return maintenanceService(r,action);
 if(action==='fuel'){
  const liters=Math.min(1,CAPACITY-r.fuel),cost=Math.round(liters*FUEL_PRICE);
  if(liters<.001)return {resources:r,message:'Tangki sudah penuh.'};
  if(r.money<cost)return {resources:r,message:'Bekal belum cukup. Bantuan darurat tersedia jika tangki kosong.'};
  return {resources:{...r,fuel:Math.min(CAPACITY,r.fuel+liters),money:r.money-cost,clock:r.clock+5},message:`Bensin bertambah ${liters.toFixed(2)} L. Biaya simulasi Rp${cost.toLocaleString('id-ID')}.`};
 }
 if(action==='rest-hotel'){
  if(r.money<40000)return {resources:r,message:'Bekal belum cukup untuk penginapan. Pilih masjid singgah atau bantuan istirahat saat energi habis.'};
  const energy={...r.energy};party.forEach(id=>energy[id]=Math.min(100,energy[id]+70));
  return {resources:{...r,money:r.money-40000,clock:r.clock+360,energy},message:'Menginap enam jam. Energi bertambah maksimal 70 poin; biaya simulasi Rp40.000.'};
 }
 if(action==='rest-help'){
  if(!party.some(id=>r.energy[id]<=0))return {resources:r,message:'Bantuan istirahat darurat tersedia ketika energi karakter habis.'};
  const energy={...r.energy};party.forEach(id=>energy[id]=Math.min(100,energy[id]+20));
  return {resources:{...r,clock:r.clock+180,energy},message:'Bantuan istirahat darurat simulasi: waktu maju tiga jam, energi bertambah maksimal 20 poin.'};
 }
 if(action==='rest'){
  const energy={...r.energy};party.forEach(id=>energy[id]=Math.min(100,energy[id]+35));
  return {resources:{...r,clock:r.clock+120,energy},message:'Istirahat dua jam. Energi kedua karakter bertambah maksimal 35 poin.'};
 }
 if(action==='help'){
  if(r.fuel>1e-9)return {resources:r,message:'Bantuan hanya tersedia saat bensin habis.'};
  const paid=r.money>=15000;
  return {resources:{...r,fuel:paid?1:.5,money:paid?r.money-15000:r.money,clock:r.clock+(paid?30:60)},message:paid?'Bantuan pengantaran simulasi: bensin 1 L, biaya Rp15.000, waktu maju 30 menit.':'Bantuan bensin darurat simulasi memberi 0,5 L tanpa biaya; waktu maju 60 menit.'};
 }
 return {resources:r,message:'Layanan tidak dikenal.'};
}
export function clockLabel(clock){const n=Math.floor(clock),t=n%1440;return `Hari ${Math.floor(n/1440)+1} · ${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
export function isTravelNight(clock){const t=clock%1440;return t<360||t>=1080;}
