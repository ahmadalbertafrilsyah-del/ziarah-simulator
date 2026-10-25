export function engineSound(state,playing,throttle=false){const speed=Math.max(0,Math.min(17,Math.abs(state?.speed||0)));const healthy=!state?.resources?.breakdown&&(state?.resources?.fuel??1)>0;return {frequency:42+speed*3.6+(throttle?12:0),engine:playing&&healthy ? .055+(throttle ? .025 : 0)+speed*.001 : 0,wind:playing?speed/17*.025:0};}
export function createRideAudio(AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext){
 let context=null,master=null,engine=null,wind=null,oscillators=[],sources=[],volume=.35,disposed=false;const effects=new Set();
 const level=(param,value,time=.07)=>{param.cancelScheduledValues(context.currentTime);param.setTargetAtTime(value,context.currentTime,time);};
 async function enable(nextVolume=.35){
  if(disposed)throw Error('Suara sudah ditutup.');if(!AudioContextClass)throw Error('Suara belum didukung browser ini.');
  volume=Math.max(0,Math.min(1,nextVolume));
  if(!context){context=new AudioContextClass();master=context.createGain();master.gain.value=volume;master.connect(context.destination);const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;engine=context.createGain();engine.gain.value=0;engine.connect(filter);filter.connect(master);
   for(const [type,multiplier] of [['sawtooth',1],['triangle',.5]]){const oscillator=context.createOscillator();oscillator.type=type;oscillator.frequency.value=42*multiplier;oscillator.connect(engine);oscillator.start();oscillators.push({node:oscillator,multiplier});sources.push(oscillator);}
   wind=context.createGain();wind.gain.value=0;const windFilter=context.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=850;wind.connect(windFilter);windFilter.connect(master);const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let seed=7,previous=0;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;previous=.85*previous+.15*(seed/2147483648-1);data[i]=previous;}
   const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(wind);source.start();sources.push(source);
  }
  if(context.state==='suspended')await context.resume();if(context.state!=='running')throw Error('Ketuk Aktifkan suara untuk memberi izin audio.');return true;
 }
 function update(state,playing,throttle,nextVolume){if(!context||disposed)return;volume=Math.max(0,Math.min(1,nextVolume??volume));const sound=engineSound(state,playing,throttle);level(master.gain,volume);level(engine.gain,sound.engine);level(wind.gain,sound.wind);for(const oscillator of oscillators)level(oscillator.node.frequency,sound.frequency*oscillator.multiplier);}
 function silence(mute=true){if(context&&!disposed){level(engine.gain,0,.02);level(wind.gain,0,.02);if(mute)level(master.gain,0,.02);}}
 function cue(kind){if(!context||disposed||context.state!=='running')return;const notes=kind==='arrived'?[523.25,659.25,783.99]:[180,135];level(master.gain,volume);notes.forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.14;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.08,at+.025);gain.gain.exponentialRampToValueAtTime(.001,at+.3);oscillator.connect(gain);gain.connect(master);effects.add(oscillator);oscillator.onended=()=>{effects.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+.32);});}
 function dispose(){if(disposed)return;silence();disposed=true;for(const source of [...sources,...effects]){try{source.stop();source.disconnect();}catch{}}effects.clear();sources=[];oscillators=[];context?.close().catch(()=>{});}
 return {enable,update,silence,cue,dispose,get ready(){return !disposed&&context?.state==='running';}};
}
