export const noteName = n => ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][n%12]+(Math.floor(n/12)-1);
export const frequency = n => 440*Math.pow(2,(n-69)/12);
export function eventsFor(score,hand,start,end){return score.voices.filter(v=>hand==='both'?['left','right'].includes(v.id):v.id===hand).flatMap(v=>v.events.filter(e=>e.beat>=(start-1)*4&&e.beat<end*4).map(e=>({...e,voice:v.id}))).sort((a,b)=>a.beat-b.beat);}
export function nextLesson(records,phase,previous,round){
 const hands=phase==='learn'?['left','right']:phase==='mix'?['both','left','right']:['both'];
 const sections=phase==='polish'?[0,1,2,3,4,5,6,7,8]:[0,1,2,3,4,5];
 let candidates=sections.flatMap(section=>hands.map(hand=>({section,hand})));
 if(previous)candidates=candidates.filter(c=>c.section!==previous.section);
 const order=[0,2,4,1,3,5,6,7,8];
 candidates.sort((a,b)=>{const ra=records[a.section+':'+a.hand]||{},rb=records[b.section+':'+b.hand]||{};const priority=x=>(x.clean||0)*4+(x.attempts||0)*.5;return priority(ra)-priority(rb)||order.indexOf(a.section)-order.indexOf(b.section)||hands.indexOf(a.hand)-hands.indexOf(b.hand);});
 return candidates[0]||{section:0,hand:'left'};
}
// YIN cumulative mean normalized difference. Downsample before calling (12 kHz).
export function detectPitch(input,sampleRate,minHz=35,maxHz=500){
 let sum=0;for(let i=0;i<input.length;i++)sum+=input[i]*input[i];let rms=Math.sqrt(sum/input.length);
 if(rms<.008)return {midi:null,rms,confidence:0};
 const maxTau=Math.min(Math.floor(sampleRate/minHz),Math.floor(input.length/2)-1),minTau=Math.floor(sampleRate/maxHz),size=input.length-maxTau;
 const d=new Float32Array(maxTau+1);let running=0;
 for(let tau=1;tau<=maxTau;tau++){let value=0;for(let j=0;j<size;j++){let delta=input[j]-input[j+tau];value+=delta*delta;}running+=value;d[tau]=running?value*tau/running:1;}
 let tau=-1;for(let t=minTau;t<maxTau;t++){if(d[t]<.13){while(t+1<maxTau&&d[t+1]<d[t])t++;tau=t;break;}}
 if(tau<0)return {midi:null,rms,confidence:0};
 let before=d[tau-1],center=d[tau],after=d[tau+1],den=2*(2*center-after-before),refined=tau+(den?(after-before)/den:0);
 const hz=sampleRate/refined,midiFloat=69+12*Math.log2(hz/440);
 return {midi:Math.round(midiFloat),cents:Math.round((midiFloat-Math.round(midiFloat))*100),hz,rms,confidence:1-center};
}
export function acceptPitch(detected,target,stableMs){return detected.midi===target&&detected.confidence>=.85&&Math.abs(detected.cents||0)<=40&&stableMs>=160;}
