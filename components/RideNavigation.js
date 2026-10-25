"use client";
import {distanceLabel} from '@/lib/catalog.mjs';
import {minimapGeometry,navigationState} from '@/lib/ride-navigation.mjs';
import './ride-guidance.css';
const SYMBOL={straight:'↑',left:'↰',right:'↱',uturn:'↶',offroute:'↗',wrongway:'↶',arrival:'⚑',arrived:'✓'};
export default function RideNavigation({road,driver,turns,facilities,showMap,onToggleMap}){
 const nav=navigationState(road,driver,turns),map=showMap?minimapGeometry(road,driver):null;
 return <aside className={'ride-guidance'+(showMap?' has-minimap':'')} aria-label="Navigasi perjalanan">
  <div className={'ride-direction'+(nav.offRoute||nav.wrongWay?' is-warning':'')} data-testid="ride-direction" aria-live="off"><span className="ride-turn-symbol" aria-hidden="true">{SYMBOL[nav.kind]}</span><div><strong>{nav.instruction}</strong><small>{nav.kind==='arrived'?'Perjalanan selesai':nav.offRoute?`${distanceLabel(nav.offset)} dari jalur`:nav.distance<8&&['left','right','uturn'].includes(nav.kind)?'Sekarang':`${distanceLabel(nav.distance)}${nav.kind==='straight'||nav.kind==='arrival'?' ke tujuan':' lagi'}`}</small><small className="ride-route-legend"><i aria-hidden="true"/>Ikuti panah hijau</small></div></div>
  <div className="ride-minimap"><button type="button" aria-expanded={showMap} aria-label={showMap?'Sembunyikan minimap':'Tampilkan minimap'} onClick={onToggleMap}>{showMap?'− Minimap':'+ Minimap'}</button>
   {map&&<svg viewBox="0 0 160 120" role="img" aria-label="Minimap rute aktif, utara di atas"><rect width="160" height="120" rx="8" fill="#edf1df"/><path d={map.path} fill="none" stroke="#fff" strokeWidth="9" strokeLinejoin="round"/><path d={map.path} fill="none" stroke="#7e9480" strokeWidth="4" strokeLinejoin="round"/><path d={map.aheadPath} fill="none" stroke="#149b50" strokeWidth="4" strokeLinejoin="round"/>
    {facilities.map(f=>{const p=map.point(f);return p.x>6&&p.x<154&&p.y>6&&p.y<114?<circle key={f.id} cx={p.x} cy={p.y} r="3" fill={f.type==='spbu'?'#bf743c':'#8a8196'}><title>{f.name}</title></circle>:null;})}
    {map.destinationVisible&&<g transform={`translate(${map.destination.x} ${map.destination.y})`}><circle r="6" fill="#b37437" stroke="#fff" strokeWidth="2"/><title>Tujuan ruas aktif</title></g>}
    {nav.offRoute&&<path d={`M80,60 L${Math.max(8,Math.min(152,map.ahead.x))},${Math.max(8,Math.min(112,map.ahead.y))}`} stroke="#bf783b" strokeWidth="1.5" strokeDasharray="3 3"/>}
    <g transform={`translate(80 60) rotate(${map.heading})`}><path d="M0,-9 L6,7 L0,4 L-6,7 Z" fill="#234e3d" stroke="#fff" strokeWidth="1.5"/></g><text x="9" y="15" fontSize="9" fill="#3b5943">U ↑</text><path d="M9 106 H27 M9 103 V109 M27 103 V109" stroke="#3b5943" strokeWidth="1"/><text x="9" y="100" fontSize="8" fill="#3b5943">{Math.round(18*map.metresPerPixel)} m</text>
   </svg>}
  </div>
 </aside>;
}
