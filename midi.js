export class MidiKeys {
 constructor(){this.down=new Map();}
 clear(){this.down.clear();}
 read(data,channel='all'){
  if(!data||data.length<3)return null;
  const type=data[0]&240,ch=data[0]&15,note=data[1],value=data[2];
  if(channel!=='all'&&ch!==Number(channel))return null;
  const key=ch+':'+note;
  if(type===144&&value>0){this.down.set(key,note);return {type:'on',note,channel:ch,velocity:value};}
  if(type===128||(type===144&&value===0)){this.down.delete(key);return {type:'off',note,channel:ch};}
  if(type===176&&(note===120||note===123)){for(const key of this.down.keys())if(key.startsWith(ch+':'))this.down.delete(key);return {type:'clear'};}
  return null;
 }
 notes(){return [...new Set(this.down.values())].sort((a,b)=>a-b);}
}
export function midiTargets(events){
 const beats=[...new Set(events.filter(e=>e.notes.length&&!e.tieEnd).map(e=>e.beat))].sort((a,b)=>a-b);
 return beats.map(beat=>({beat,notes:[...new Set(events.filter(e=>e.beat<=beat&&beat<e.beat+e.duration).flatMap(e=>e.notes))].sort((a,b)=>a-b),attacks:[...new Set(events.filter(e=>e.beat===beat&&!e.tieEnd).flatMap(e=>e.notes))]}));
}
export function matchesTarget(target,held,attacks){return held.length===target.notes.length&&target.notes.every(n=>held.includes(n))&&target.attacks.every(n=>attacks.has(n));}
export class MidiConnection {
 constructor({onPorts,onMessage,onLost}){Object.assign(this,{onPorts,onMessage,onLost});this.access=null;this.input=null;this.generation=0;}
 async connect(request){const generation=++this.generation;const access=await request({sysex:false});if(generation!==this.generation)return;this.access=access;access.onstatechange=()=>this.refresh();this.refresh();}
 refresh(){if(this.input&&this.input.state==='disconnected'){this.input.onmidimessage=null;this.input=null;this.onLost();}this.onPorts([...this.access.inputs.values()].filter(p=>p.state==='connected'),this.input?.id);}
 async select(id){const generation=++this.generation;if(this.input){this.input.onmidimessage=null;await this.input.close();}this.input=null;this.onLost();const input=this.access?.inputs.get(id);if(!input||input.state!=='connected')return;await input.open();if(generation!==this.generation){await input.close();return;}this.input=input;input.onmidimessage=e=>this.onMessage(e.data);}
 disconnect(){this.generation++;if(this.input){this.input.onmidimessage=null;this.input.close().catch(()=>{});}if(this.access)this.access.onstatechange=null;this.input=null;this.access=null;this.onLost();}
}

// Onset windows in seconds, scaled with tempo and bounded for usability.
export function timingWindow(tempo,level='balanced'){const factors={relaxed:.35,balanced:.25,tighter:.15};return Math.max(.09,Math.min(.3,(60/tempo)*(factors[level]??.25)));}
export class RhythmCheck {
 constructor(events,tempo,level){this.window=timingWindow(tempo,level);this.seconds=60/tempo;this.expected=events.filter(e=>!e.tieEnd).flatMap(e=>e.notes.map(note=>({note,time:e.beat*this.seconds,matched:false})));this.wrong=0;this.stray=0;this.hits=[];}
 hit(note,time){
  const candidates=this.expected.filter(e=>!e.matched&&e.note===note&&Math.abs(e.time-time)<=Math.max(.65,this.window*2));
  candidates.sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time));const target=candidates[0];
  if(!target){if(this.expected.some(e=>Math.abs(e.time-time)<=this.window))this.wrong++;else this.stray++;return {kind:'extra',note};}
  target.matched=true;const delta=time-target.time,kind=Math.abs(delta)<=this.window?'on time':delta<0?'early':'late';const result={kind,note,delta};this.hits.push(result);return result;
 }
 summary(){return {expected:this.expected.length,onTime:this.hits.filter(e=>e.kind==='on time').length,early:this.hits.filter(e=>e.kind==='early').length,late:this.hits.filter(e=>e.kind==='late').length,missed:this.expected.filter(e=>!e.matched).length,wrong:this.wrong,extra:this.stray};}
}
