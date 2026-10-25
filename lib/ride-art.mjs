export const RIDE_ART_DIRECTIONS=['front','back','right','left','top'];
export const RIDE_ART_IDS=['vespa','bapak','ibu','anak','remaja-hijau','remaja-terakota'];
export function rideArtPath(id,direction){if(!RIDE_ART_IDS.includes(id)||!RIDE_ART_DIRECTIONS.includes(direction))throw Error('Arah atau karakter gambar tidak dikenal.');return `/assets/ride-hd/${id==='vespa'?'vespa':`characters/${id}`}/${direction}.png`;}
// Side sprites are named by their on-screen facing direction.
export function spriteDirection(cameraBearing,heading=0,top=false){if(top)return 'top';const a=Math.atan2(Math.sin(cameraBearing-heading),Math.cos(cameraBearing-heading));if(Math.abs(a)<Math.PI/4)return 'front';if(Math.abs(a)>3*Math.PI/4)return 'back';return a>0?'right':'left';}
