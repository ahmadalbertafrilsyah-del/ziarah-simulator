export const CHARACTERS = [
 {id:"bapak",name:"Bapak",detail:"Bersarung batik",image:"bapak_batik_peci_nu.png",color:"#e8eee4"},
 {id:"ibu",name:"Ibu",detail:"Hijab krem",image:"ibu_paruh_baya.png",color:"#f1e9dd"},
 {id:"anak",name:"Anak laki-laki",detail:"Peci NU",image:"anak_laki_laki_nu.png",color:"#edf0df"},
 {id:"remaja-hijau",name:"Remaja hijau",detail:"Hijab hijau",image:"remaja_perempuan_hijau.png",color:"#e6eee5"},
 {id:"remaja-terakota",name:"Remaja terakota",detail:"Hijab terakota",image:"remaja_perempuan_terakota.png",color:"#f2e4db"},
];
export const PLACE_TYPES = {
 maqbarah:{label:"Maqbarah",icon:"landmark",image:"maqbarah.png",color:"#46674c"},
 masjid:{label:"Masjid",icon:"moon",image:"masjid.png",color:"#68805a"},
 hotel:{label:"Hotel",icon:"bed",image:"hotel.png",color:"#8d7197"},
 spbu:{label:"POM bensin",icon:"fuel",image:"pom_bensin.png",color:"#bd765c"},
 bengkel:{label:"Bengkel",icon:"wrench",image:"bengkel.png",color:"#6b8390"},
 warung:{label:"Warung",icon:"coffee",image:"warung.png",color:"#b68d4a"},
 pasar:{label:"Pasar",icon:"store",image:"pasar.png",color:"#c29853"},
 minimarket:{label:"Minimarket",icon:"store",image:"indomaret.png",color:"#7f89aa"}
};
export const ASSET="/assets";
export const STORAGE_KEY="ziarah-walisongo.game.v1";
export const INITIAL_POSITION=[112.7422732,-7.2299754];
export const money=v=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
export const distanceLabel=m=>m<1000?`${Math.round(m)} m`:`${(m/1000).toLocaleString("id-ID",{maximumFractionDigits:1})} km`;
export function gameTime(m){const t=Math.floor(m)%1440;return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;}
export const isNight=m=>m%1440<360||m%1440>=1080;

