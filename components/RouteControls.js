"use client";
import {useEffect} from 'react';
export default function RouteControls({input}) {
 useEffect(()=>{
  const keys={w:'gas',ArrowUp:'gas',s:'brake',ArrowDown:'brake',r:'reverse'};
  const clear=()=>{input.current={gas:false,brake:false,reverse:false};};
  const change=(e)=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=keys[e.key];if(k){e.preventDefault();input.current[k]=e.type==='keydown';}};
  window.addEventListener('keydown',change);window.addEventListener('keyup',change);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{clear();window.removeEventListener('keydown',change);window.removeEventListener('keyup',change);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
 },[input]);
 return <div className="route-controls">{[['gas','GAS · W / ↑'],['brake','REM · S / ↓'],['reverse','MUNDUR · R']].map(([key,label])=><button type="button" className="button secondary" key={key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current[key]=true;}} onPointerUp={()=>{input.current[key]=false;}} onPointerCancel={()=>{input.current[key]=false;}} onLostPointerCapture={()=>{input.current[key]=false;}}>{label}</button>)}</div>;
}
