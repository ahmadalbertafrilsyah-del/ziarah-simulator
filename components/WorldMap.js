"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ASSET, PLACE_TYPES } from "@/lib/catalog.mjs";

// Tetapkan lokasi worker sebelum membuat instance peta.
maplibregl.setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url
  ).toString()
);

const STYLE={version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}},layers:[{id:"base",type:"raster",source:"osm",paint:{"raster-saturation":-0.45,"raster-contrast":-0.1}}]};
export default function WorldMap({locations,position,route,selectedId,onSelect,onPick,placing,apiRef,moving,visits,focusRequest}){
 const container=useRef(null),mapRef=useRef(null),markers=useRef([]),vehicle=useRef(null),handlers=useRef({onSelect,onPick,placing});
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 handlers.current={onSelect,onPick,placing};
 useEffect(()=>{
  let alive=true,loaded=false;
  let map;
  try { map=new maplibregl.Map({container:container.current,style:STYLE,center:[111.05,-7.05],zoom:6.6,minZoom:3,maxZoom:18,maxBounds:[[93,-12],[143,7]],attributionControl:false}); }
  catch { setError(true); return; }
  mapRef.current=map;
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
  map.addControl(new maplibregl.AttributionControl({compact:false}),"bottom-right");
  const observer=new ResizeObserver(()=>map.resize());observer.observe(container.current);
  map.on("load",()=>{
   if(!alive)return;loaded=true;setReady(true);
   map.addSource("journey",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
   map.addLayer({id:"journey-halo",type:"line",source:"journey",layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":"#fff","line-width":9,"line-opacity":0.9}});
   map.addLayer({id:"journey-line",type:"line",source:"journey",layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":"#52734e","line-width":4}});
   apiRef.current={
    focus:(coordinates,zoom=12)=>map.flyTo({center:coordinates,zoom,duration:1100}),
    indonesia:()=>map.fitBounds([[94.7,-11],[141,6]],{padding:45,duration:1100}),
    fitRoute:(coordinates)=>{const bounds=new maplibregl.LngLatBounds();coordinates.forEach(p=>bounds.extend(p));map.fitBounds(bounds,{padding:{top:90,bottom:140,left:75,right:75},maxZoom:12,duration:900});}
   };
  });
  map.on("error",()=>{if(alive)setError(true);});
  map.on("click",e=>{if(handlers.current.placing)handlers.current.onPick([Number(e.lngLat.lng.toFixed(6)),Number(e.lngLat.lat.toFixed(6))]);});
  const timer=setTimeout(()=>{if(alive&&!loaded)setError(true);},12000);
  return ()=>{alive=false;clearTimeout(timer);observer.disconnect();markers.current.forEach(m=>m.remove());markers.current=[];vehicle.current=null;map.remove();mapRef.current=null;apiRef.current=null;setReady(false);};
 },[attempt,apiRef]);
 useEffect(()=>{
  if(!ready||!mapRef.current)return;
  markers.current.forEach(m=>m.remove());
  const visited=new Set(visits.map(v=>v.locationId));
  markers.current=locations.map((p,i)=>{
   const type=PLACE_TYPES[p.type],el=document.createElement("button");
   el.type="button";el.className="place-pin"+(selectedId===p.id?" is-selected":"")+(visited.has(p.id)?" is-visited":"");
   el.setAttribute("aria-label","Buka detail "+p.name);el.title=p.name;
   const img=document.createElement("img");img.src=ASSET+"/buildings/"+type.image;img.alt="";img.draggable=false;el.append(img);
   const badge=document.createElement("span");badge.textContent=visited.has(p.id)?"✓":p.custom?"+":String(i+1).padStart(2,"0");el.append(badge);
   el.addEventListener("click",e=>{if(handlers.current.placing)return;e.stopPropagation();handlers.current.onSelect(p.id);});
   return new maplibregl.Marker({element:el,anchor:"bottom"}).setLngLat(p.coordinates).addTo(mapRef.current);
  });
 },[ready,locations,selectedId,visits]);
 useEffect(()=>{
  if(!ready||!mapRef.current)return;
  mapRef.current.getSource("journey")?.setData(route?.coordinates?.length>=2?{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:route.coordinates}}:{type:"FeatureCollection",features:[]});
  if(route?.coordinates)apiRef.current?.fitRoute(route.coordinates);
 },[ready,route,apiRef]);
 useEffect(()=>{
  if(!ready||!mapRef.current)return;
  if(!vehicle.current){const el=document.createElement("div");el.className="vespa-pin";el.setAttribute("role","img");el.setAttribute("aria-label","Posisi Vespa");const img=document.createElement("img");img.src=ASSET+"/items/vespa.png";img.alt="";el.append(img);vehicle.current=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat(position).addTo(mapRef.current);}
  vehicle.current.setLngLat(position);vehicle.current.getElement().classList.toggle("is-moving",moving);
 },[ready,position,moving]);
 useEffect(()=>{if(focusRequest&&ready)apiRef.current?.focus(focusRequest.coordinates,focusRequest.zoom||12);},[focusRequest,ready,apiRef]);
 useEffect(()=>{if(container.current)container.current.style.cursor=placing?"crosshair":"";},[placing]);
 return <div className="map-shell"><div ref={container} className="map-canvas" aria-label="Peta perjalanan Indonesia"/>
  {!ready&&!error&&<div className="map-loading"><span className="spinner"/><span>Menyiapkan peta Indonesia…</span></div>}
  {error&&<div className="map-network-note" role="status">Peta belum dapat ditampilkan sepenuhnya. Periksa koneksi internet dan dukungan WebGL browser. Pemilihan karakter tetap dapat digunakan. <button onClick={()=>{setError(false);setAttempt(x=>x+1);}}>Muat ulang peta</button></div>}
 </div>;
}

