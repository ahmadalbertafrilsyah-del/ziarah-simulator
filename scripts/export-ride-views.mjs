// Optional browser-side atlas extraction used by the asset gallery. Original atlases are preserved.
export const ATLAS_FILES={vespa:'vespa-5-arah.png',bapak:'bapak-5-arah.png',ibu:'ibu-5-arah.png',anak:'anak-5-arah.png','remaja-hijau':'remaja-hijau-5-arah.png','remaja-terakota':'remaja-terakota-5-arah.png'};
export const DIRECTIONS=['front','back','right','left','top'];
export async function exportAtlasViews(id,base='/assets/ride-hd/'){
 const img=new Image();img.src=base+ATLAS_FILES[id];await img.decode();
 const cells=id==='vespa'?[[105,0,358,512],[580,0,370,512],[950,0,586,512],[0,512,590,512],[590,512,370,512]]:[[0,0,512,512],[512,0,512,512],[1024,0,512,512],[0,512,512,512],[512,512,512,512]];
 return cells.map(([x,y,w,h],index)=>{const frame=document.createElement('canvas');frame.width=w;frame.height=h;const ctx=frame.getContext('2d');ctx.drawImage(img,x,y,w,h,0,0,w,h);const data=ctx.getImageData(0,0,w,h);let minX=w,minY=h,maxX=0,maxY=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(data.data[(j*w+i)*4+3]>70){minX=Math.min(minX,i);maxX=Math.max(maxX,i);minY=Math.min(minY,j);maxY=Math.max(maxY,j);}minX=Math.max(0,minX-5);minY=Math.max(0,minY-5);maxX=Math.min(w-1,maxX+5);maxY=Math.min(h-1,maxY+5);const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(frame,minX,minY,out.width,out.height,0,0,out.width,out.height);return {id,direction:DIRECTIONS[index],width:out.width,height:out.height,data:out.toDataURL('image/png')};});
}
