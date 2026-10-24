"use client";
import {useEffect,useId,useRef} from "react";
import Icon from "./Icon";
export default function Modal({title,intro,children,onClose,wide=false}){
 const ref=useRef(null),id=useId();
 useEffect(()=>{const d=ref.current;if(!d.open)d.showModal();return()=>{if(d.open)d.close();};},[]);
 return <dialog ref={ref} className={"modal"+(wide?" modal-wide":"")} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
  <div className="modal-top"><div><h2 id={id}>{title}</h2>{intro&&<p>{intro}</p>}</div><button className="icon-button" aria-label="Tutup jendela" onClick={onClose}><Icon name="close"/></button></div>
  {children}
 </dialog>;
}

