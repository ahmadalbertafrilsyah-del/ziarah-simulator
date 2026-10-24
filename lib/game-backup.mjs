import {decodeJourney,encodeJourney,JOURNEY_KEY} from './journey-save.mjs';
import {isValidParty,PARTY_STORAGE_KEY} from './party.mjs';
export const BACKUP_APP='ziarah-walisongo',BACKUP_LIMIT=20*1024*1024;
export function createBackup(session,selectedParty,exportedAt=new Date().toISOString()){
 const party=isValidParty(selectedParty)?[...selectedParty]:[];
 const raw=JSON.stringify({app:BACKUP_APP,backupVersion:1,exportedAt,selectedParty:party,journey:JSON.parse(encodeJourney(session))});
 if(new TextEncoder().encode(raw).length>BACKUP_LIMIT)throw Error('Ukuran cadangan melebihi 20 MB.');
 return raw;
}
export function inspectBackup(raw,start){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>BACKUP_LIMIT)throw Error('File cadangan maksimal 20 MB.');
 let data;try{data=JSON.parse(raw);}catch{throw Error('File bukan JSON yang valid.');}
 if(!data||data.app!==BACKUP_APP||data.backupVersion!==1||!data.journey||typeof data.journey!=='object'||Array.isArray(data.journey))throw Error('Format cadangan Ziarah Walisongo tidak dikenali.');
 if(!isValidParty(data.selectedParty)&&!(Array.isArray(data.selectedParty)&&data.selectedParty.length===0))throw Error('Pilihan karakter dalam cadangan tidak valid.');
 if(!['idle','loading','ready','moving','paused','arrived','error'].includes(data.journey.status))throw Error('Status perjalanan dalam cadangan tidak valid.');
 if(!Array.isArray(data.journey.visits))throw Error('Jurnal dalam cadangan tidak valid.');
 const session=decodeJourney(JSON.stringify(data.journey),start),selectedParty=[...data.selectedParty];
 if(session.party.length&&!isValidParty(selectedParty))throw Error('Pilihan karakter untuk perjalanan aktif tidak tersedia.');
 return {session,selectedParty,exportedAt:typeof data.exportedAt==='string'&&Number.isFinite(Date.parse(data.exportedAt))?data.exportedAt:null};
}
// Persist before changing React state. Roll back the character key if the journey write fails.
export function persistBackup(storage,backup){
 const oldParty=storage.getItem(PARTY_STORAGE_KEY);
 const encoded=encodeJourney(backup.session),party=JSON.stringify({version:1,ids:backup.selectedParty});
 storage.setItem(PARTY_STORAGE_KEY,party);
 try{storage.setItem(JOURNEY_KEY,encoded);}catch{
  try{if(oldParty===null)storage.removeItem(PARTY_STORAGE_KEY);else storage.setItem(PARTY_STORAGE_KEY,oldParty);}catch{throw Error('Pemulihan gagal dan pilihan karakter lama belum dapat dikembalikan. Jangan tutup halaman sebelum penyimpanan browser tersedia.');}
  throw Error('Pemulihan dibatalkan karena penyimpanan browser penuh atau tidak tersedia. Progres lama dipertahankan.');
 }
}
