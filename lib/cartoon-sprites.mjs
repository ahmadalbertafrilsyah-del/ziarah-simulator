// New artwork has separate names so the player's existing PNGs stay intact.
export const CARTOON_SPRITES = {
  rumah: '/assets/city-cartoon/rumah-jawa.png',
  warung: '/assets/city-cartoon/warung.png',
  minimarket: '/assets/city-cartoon/toko-kelontong.png',
  pohon: '/assets/city-cartoon/pohon-tropis.png',
};

// Trim transparent padding once at load, anchoring visible feet to ground.
export function trimSprite(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  try {
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
      if(data[(y*canvas.width+x)*4+3] > 16) {
        left=Math.min(left,x); right=Math.max(right,x);
        top=Math.min(top,y); bottom=Math.max(bottom,y);
      }
    }
    if(right<left) return image;
    const cut=document.createElement('canvas');
    cut.width=right-left+1;cut.height=bottom-top+1;
    cut.getContext('2d').drawImage(canvas,left,top,cut.width,cut.height,0,0,cut.width,cut.height);
    return cut;
  } catch {return image;}
}
