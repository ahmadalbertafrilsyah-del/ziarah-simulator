"use client";
import {performanceReport} from '@/lib/ride-performance.mjs';
import './ride-performance.css';
const value=(number,suffix='',digits=1)=>Number.isFinite(number)?number.toFixed(digits)+suffix:'Belum tersedia';
export default function RidePerformance({metrics,quality,mode,target=30,onReset}){
 function download(){const blob=new Blob([JSON.stringify(performanceReport(mode,quality,metrics),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`laporan-performa-${mode}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details className="ride-performance"><summary>Performa & laporan</summary><p>Mainkan 30–60 detik, lalu buka bagian ini. Angka berasal dari perangkat dan sesi ini; jeda tidak dihitung sebagai FPS bermain.</p>
 <dl><div><dt>FPS terukur</dt><dd data-testid="performance-fps">{value(metrics?.fps,' FPS')}</dd></div><div><dt>Target kualitas</dt><dd>{target} FPS</dd></div><div><dt>Antar frame p95</dt><dd>{value(metrics?.frameP95Ms,' ms')}</dd></div><div><dt>CPU render p95</dt><dd>{value(metrics?.renderP95Ms,' ms')}</dd></div><div><dt>Gambar pertama</dt><dd>{value(metrics?.firstFrameMs,' ms')}</dd></div><div><dt>Geometri / tekstur</dt><dd>{metrics?`${metrics.geometries} / ${metrics.textures}`:'Belum tersedia'}</dd></div><div><dt>Draw calls / segitiga</dt><dd>{metrics?`${metrics.drawCalls} / ${metrics.triangles}`:'Belum tersedia'}</dd></div><div><dt>Resolusi gambar</dt><dd>{metrics?`${metrics.width} × ${metrics.height}`:'Belum tersedia'}</dd></div><div><dt>Heap JavaScript</dt><dd>{value(metrics?.heapMB,' MB')}</dd></div><div><dt>Frame aktif tercatat</dt><dd>{metrics?.totalFrames||0}</dd></div></dl>
 {metrics?.fps&&metrics.fps<target*.7&&<p>Kinerja di bawah target kualitas. Coba kualitas Hemat, lalu ukur ulang saat berkendara.</p>}
 <p>p95 menunjukkan batas waktu untuk 95% sampel. CPU render bukan waktu GPU. Heap JavaScript bergantung pada dukungan browser dan mencakup halaman, bukan hanya arena.</p>
 <div className="ride-performance-actions"><button type="button" disabled={!metrics?.samples} onClick={download}>Unduh laporan performa</button><button type="button" onClick={onReset}>Mulai pengukuran baru</button></div></details>;
}
