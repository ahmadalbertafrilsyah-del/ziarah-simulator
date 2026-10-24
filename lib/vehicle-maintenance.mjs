// Prototype game rules. Costs and intervals are fictional balancing parameters.
const ITEMS={tyre:{name:'Ban cadangan',price:50000,max:10},spark:{name:'Busi cadangan',price:15000,max:10},wrench:{name:'Kunci pas',price:25000,max:1},pump:{name:'Pompa ban',price:20000,max:1}};
export {ITEMS};
function roll(seed){return (Math.imul(seed,1664525)+1013904223)>>>0;}
function nextSchedule(total,seed){const rng=roll(seed);return {rng,nextFailureM:total+4000+rng/4294967296*4000};}
export function initialMaintenance(total=0){return {condition:{tyre:100,spark:100},inventory:{tyre:1,spark:1,wrench:1,pump:1},breakdown:null,...nextSchedule(total,123456789),repairLog:[]};}
export function validMaintenance(r){return !!r.condition&&['tyre','spark'].every(k=>Number.isFinite(r.condition[k])&&r.condition[k]>=0&&r.condition[k]<=100)&&!!r.inventory&&Object.entries(ITEMS).every(([k,v])=>Number.isInteger(r.inventory[k])&&r.inventory[k]>=0&&r.inventory[k]<=v.max)&&(r.breakdown===null||(['tyre','spark'].includes(r.breakdown?.type)&&Number.isFinite(r.breakdown?.atMeters)&&r.breakdown.atMeters>=0))&&Number.isInteger(r.rng)&&r.rng>=0&&r.rng<=4294967295&&Number.isFinite(r.nextFailureM)&&r.nextFailureM>=0&&Array.isArray(r.repairLog)&&r.repairLog.length<=50&&r.repairLog.every(e=>typeof e.message==='string'&&e.message.length<250&&Number.isFinite(e.clock)&&e.clock>=0);}
export function advanceMaintenance(r,meters,arrived=false){
 if(r.breakdown||meters<=0)return r;
 const condition={tyre:Math.max(0,r.condition.tyre-meters/1000*.7),spark:Math.max(0,r.condition.spark-meters/1000*.5)};
 if(arrived||r.totalMeters<r.nextFailureM)return {...r,condition};
 const rng=roll(r.rng),type=condition.tyre<15?'tyre':condition.spark<15?'spark':rng/4294967296<.55?'tyre':'spark';
 return {...r,condition:{...condition,[type]:0},rng,breakdown:{type,atMeters:r.totalMeters}};
}
function finishRepair(r,type,minutes,message){return {resources:{...r,condition:{...r.condition,[type]:100},breakdown:null,clock:r.clock+minutes,...nextSchedule(r.totalMeters,r.rng),repairLog:[...r.repairLog,{clock:r.clock+minutes,message}].slice(-50)},message};}
export function maintenanceService(r,action){
 if(action.startsWith('buy-')){
  const key=action.slice(4),item=ITEMS[key];if(!item)return {resources:r,message:'Barang tidak dikenal.'};
  if(r.inventory[key]>=item.max)return {resources:r,message:'Persediaan barang sudah maksimal.'};
  if(r.money<item.price)return {resources:r,message:'Bekal tidak cukup untuk membeli barang ini.'};
  return {resources:{...r,money:r.money-item.price,inventory:{...r.inventory,[key]:r.inventory[key]+1}},message:`${item.name} ditambahkan ke inventaris.`};
 }
 const type=r.breakdown?.type;
 if(!type)return {resources:r,message:'Tidak ada kerusakan aktif.'};
 if(action==='repair'){
  const needed=type==='tyre'?['tyre','wrench','pump']:['spark','wrench'];
  if(needed.some(k=>r.inventory[k]<1))return {resources:r,message:`Persediaan belum lengkap: ${needed.map(k=>ITEMS[k].name).join(', ')}. Beli barang atau panggil bantuan.`};
  const n={...r,inventory:{...r.inventory,[type]:r.inventory[type]-1}};
  return finishRepair(n,type,type==='tyre'?20:10,type==='tyre'?'Ban cadangan terpasang. Kunci dan pompa tetap tersedia.':'Busi cadangan terpasang. Kunci pas tetap tersedia.');
 }
 if(action==='repair-help'){
  const cost=type==='tyre'?25000:15000;
  const paid=r.money>=cost;
  return finishRepair({...r,money:paid?r.money-cost:r.money},type,paid?30:90,paid?`Bantuan perbaikan simulasi selesai. Biaya Rp${cost.toLocaleString('id-ID')}.`:'Bantuan darurat perbaikan tanpa biaya selesai. Waktu maju 90 menit.');
 }
 return {resources:r,message:'Layanan perbaikan tidak dikenal.'};
}
