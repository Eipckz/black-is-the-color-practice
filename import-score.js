// Local MusicXML reading. No uploads or external conversion service.
import {measureStarts,keyAlter} from './engine.js?v=9';
const text=(node,selector,fallback='')=>node.querySelector(selector)?.textContent.trim()??fallback;
const number=(node,selector,fallback)=>Number(text(node,selector,String(fallback)));
const children=(node,name)=>Array.from(node.children).filter(n=>n.localName===name);
const fail=message=>{throw new Error(message);};
export function parseMusicXML(source, filename='Imported score', Parser=DOMParser, partId=null){
  if(source.length>8000000)fail('Choose a MusicXML file smaller than 8 MB.');
  if(/<!ENTITY/i.test(source))fail('XML entities are not supported. Export a fresh MusicXML file.');
  if(/^MThd/.test(source))fail('This is a MIDI file. MIDI score import is not supported yet. Export MusicXML from your notation app instead.');
  const doc=new Parser().parseFromString(source,'application/xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='score-partwise')fail('Choose a partwise MusicXML file exported by your notation app.');
  const parts=children(doc.documentElement,'part');
  if(!parts.length)fail('This MusicXML contains no parts.');
  if(parts.length>1&&!partId){const error=new Error('Choose the piano part to import.');error.parts=parts.map((part,i)=>({id:part.getAttribute('id'),name:text(Array.from(doc.querySelectorAll('score-part')).find(n=>n.getAttribute('id')===part.getAttribute('id'))||part,'part-name','Part '+(i+1))}));throw error;}
  const selected=partId?parts.find(p=>p.getAttribute('id')===partId):parts[0];
  if(!selected)fail('The selected piano part is missing from this score.');
  for(const part of parts)if(part!==selected)part.remove();
  if(doc.querySelector('transpose, unpitched'))fail('Import a concert-pitch piano part without percussion or transposition.');
  if(doc.querySelector('grace'))fail('Grace notes need a measured realization. Export a practice copy with their written durations.');
  if(doc.querySelector('segno, coda')||Array.from(doc.querySelectorAll('sound')).some(n=>['dacapo','dalsegno','tocoda','fine','segno','coda'].some(a=>n.hasAttribute(a))))fail('Expand D.C., D.S., coda and fine jumps in your notation app before importing, so each practice measure has one playback position. Repeats and endings are written out automatically.');
  const written=children(selected,'measure');
  if(!written.length)fail('Import between 1 and 500 measures at a time.');
  const order=unfoldRepeats(written),measures=order.map(i=>written[i]);
  if(measures.length>500)fail('Import between 1 and 500 measures at a time'+(measures.length>written.length?' (after writing out repeats).':'.'));
  let divisions=1,meter=null,beats=4,beatType=4,key=0,tempo=null;
  // Meters may change: every measure keeps its own meter and absolute start in quarter-note beats.
  const starts=[0],meters=[];
  const measureKeys=[];
  const raw={right:[],left:[]},clefs={right:'treble',left:'bass'},marks={right:[],left:[]},openWedge={right:null,left:null};
  const warnings=new Set(['Playback uses a steady tempo. Follow expressive dynamics, pedal, ornaments, and tempo changes yourself.']);
  measures.forEach((measure,index)=>{
    const attr=children(measure,'attributes')[0];
    if(attr){
      divisions=number(attr,'divisions',divisions);if(!(divisions>0))fail('Invalid MusicXML divisions.');
      const time=attr.querySelector('time');
      if(time){const b=number(time,'beats',4),t=number(time,'beat-type',4);if(!Number.isInteger(b)||b<1||b>12||![2,4,8,16].includes(t))fail('Use a simple numeric time signature.');beats=b;beatType=t;meter??=b+'/'+t;}
      const nextKey=number(attr,'key fifths',key);if(!Number.isInteger(nextKey)||Math.abs(nextKey)>7)fail('Use a standard key signature with at most seven sharps or flats.');key=nextKey;
      for(const clef of children(attr,'clef')){const staff=Number(clef.getAttribute('number')||1),sign=text(clef,'sign'),line=number(clef,'line',sign==='F'?4:2);if(!((sign==='G'&&line===2)||(sign==='F'&&line===4))||number(clef,'clef-octave-change',0)!==0)fail('Only standard treble and bass clefs are supported.');if(index)warnings.add('The practice score uses the opening clefs throughout.');else clefs[staff===2?'left':'right']=sign==='F'?'bass':'treble';}
    }
    measureKeys.push(key);meters.push(beats+'/'+beatType);
    const length=beats*4/beatType,base=starts[index];let cursor=0,previous=null,reached=0;
    const sound=measure.querySelector('sound[tempo]');if(index===0&&sound)tempo=Number(sound.getAttribute('tempo'))||null;
    for(const element of measure.children){
      if(['backup','forward'].includes(element.localName)){cursor+=(element.localName==='backup'?-1:1)*number(element,'duration',0)/divisions;if(cursor<-.00001)fail('Invalid backward position in MusicXML.');reached=Math.max(reached,cursor);continue;}
      // Dynamics, hairpins and pedal marks at their written position (engraving only; playback stays even).
      if(element.localName==='direction'){const hand=number(element,'staff',1)===2?'left':'right',at=base+cursor+number(element,'offset',0)/divisions;
        for(const type of element.querySelectorAll('direction-type > *')){if(type.localName==='dynamics'){const name=dynamicName(type.firstElementChild?.localName);if(name)marks[hand].push({beat:at,dynamic:name});}else if(type.localName==='wedge'){const kind=type.getAttribute('type');if(kind==='crescendo'||kind==='diminuendo'){openWedge[hand]=kind;marks[hand].push({beat:at,wedge:kind});}else if(kind==='stop'&&openWedge[hand]){marks[hand].push({beat:at,wedge:'stop-'+openWedge[hand]});openWedge[hand]=null;}}else if(type.localName==='pedal'){const kind=type.getAttribute('type');if(['start','stop','change'].includes(kind))marks[hand].push({beat:at,pedal:kind});}}
        continue;}
      if(element.localName!=='note')continue;
      const duration=number(element,'duration',0)/divisions;if(!(duration>0))fail('Every note needs a positive duration. Export a measured practice copy.');
      const chord=!!element.querySelector('chord'),start=chord?previous:cursor;if(start===null)fail('A chord is missing its first note.');
      if(start+duration>length+.00001)fail(`Measure ${measure.getAttribute('number')||index+1}, staff ${number(element,'staff',1)} exceeds ${beats}/${beatType} at beat ${start+duration}. Correct this measure in your notation app and export again.`);
      const staff=number(element,'staff',1);if(![1,2].includes(staff))fail('Export a piano part with at most two staves.');
      if(!element.querySelector('rest')){
        const step=text(element,'pitch step'),octave=number(element,'pitch octave',NaN),alter=number(element,'pitch alter',0);
        const midi=12*(octave+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step])+alter;
        if(!Number.isInteger(midi)||midi<21||midi>108||!Number.isInteger(alter)||Math.abs(alter)>2)fail('Only standard piano pitches A0 to C8 are supported.');
        const ties=Array.from(element.querySelectorAll('tie')).map(t=>t.getAttribute('type')),slurs=Array.from(element.querySelectorAll('notations slur')).map(s=>s.getAttribute('type'));
        const arts=['staccato','staccatissimo','accent','strong-accent','tenuto'].filter(a=>element.querySelector('articulations '+a)).concat(element.querySelector('notations fermata')?['fermata']:[]);
        raw[staff===2?'left':'right'].push({beat:base+start,duration,midi,step,octave,alter,voice:text(element,'voice','1')||'1',finger:text(element,'notations technical fingering'),tieStart:ties.includes('start'),tieEnd:ties.includes('stop'),arts,slurStart:slurs.includes('start'),slurStop:slurs.includes('stop')});
      }
      if(!chord){previous=cursor;cursor+=duration;}
      reached=Math.max(reached,start+duration);
    }
    // A short opening measure is a pickup: it ends on the first barline. Other short measures are padded at the end.
    if(index===0&&reached<length-.00001){for(const n of [...raw.right,...raw.left,...marks.right,...marks.left])n.beat+=length-reached;warnings.add('Pickup measure placed at the end of bar 1.');}
    else if(reached<length-.00001)warnings.add('Short measures are padded with rests to the full meter.');
    starts.push(base+length);
  });
  if(!raw.right.length&&!raw.left.length)fail('The score contains no playable piano notes.');
  if(measures.length>written.length)warnings.add('Repeats and endings are written out in playing order; bar numbers show which time through.');
  const seen=new Map(),printedMeasures=order.map(i=>{const count=(seen.get(i)||0)+1;seen.set(i,count);return (written[i].getAttribute('number')||String(i+1))+(count>1?' ('+count+(count===2?'nd':count===3?'rd':'th')+' time)':'');});
  const voices=Object.entries(raw).map(([id,notes])=>({id,events:segmentNotes(notes,starts)}));
  // Separate MusicXML voices per staff, for voice-aware engraving: one abcjs voice each, stems up then down.
  const voiceParts=Object.fromEntries(Object.entries(raw).map(([id,notes])=>[id,[...new Set(notes.map(n=>n.voice))].sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b)).map(voice=>({voice,events:segmentNotes(notes.filter(n=>n.voice===voice),starts)}))]).filter(([,parts])=>parts.length>1));
  return {title:text(doc,'work-title',text(doc,'movement-title',filename.replace(/\.(musicxml|xml|mxl)$/i,''))).slice(0,160),tempo,measures:measures.length,meter:meter||'4/4',meters,measureStarts:starts,beatsPerMeasure:starts[1],...(measures.length>written.length?{printedMeasures}:{}),...(marks.right.length||marks.left.length?{expressions:marks}:{}),...(Object.keys(voiceParts).length?{voiceParts}:{}),clefs,measureKeys,voices,warnings:[...warnings],partId:selected.getAttribute('id'),imported:true};
}
// Repeats and endings written out in playing order, as indexes into the written measures. A backward
// repeat returns to the last forward repeat (or the start, or just after the previous repeat); an
// ending plays only on the passes its number lists.
export function unfoldRepeats(measures){
  const order=[];let i=0,start=0,pass=1,ending=null;
  while(i<measures.length){
    if(order.length>2000)fail('These repeats write out to more than 2000 measures. Import a shorter section.');
    const lines=children(measures[i],'barline'),endings=lines.map(b=>b.querySelector('ending')).filter(Boolean);
    if(lines.some(b=>b.querySelector('repeat[direction="forward"]'))&&start!==i){start=i;pass=1;}
    const opening=endings.find(e=>e.getAttribute('type')==='start');if(opening)ending=(opening.getAttribute('number')||'1').split(/[,\s]+/).map(Number).filter(Boolean);
    const closes=endings.some(e=>['stop','discontinue'].includes(e.getAttribute('type'))),plays=!ending||ending.includes(pass),back=lines.find(b=>b.querySelector('repeat[direction="backward"]'));
    if(plays)order.push(i);
    if(plays&&back){const times=Number(back.querySelector('repeat').getAttribute('times'))||2;if(closes)ending=null;if(pass<times){pass++;i=start;continue;}pass=1;start=i+1;}
    else if(closes){ending=null;if(plays){pass=1;start=i+1;}}
    i++;
  }
  return order;
}
const dynamicNames=['pppp','ppp','pp','p','mp','mf','f','ff','fff','ffff','sfz'];
const dynamicName=name=>dynamicNames.includes(name)?name:['sf','sfp','sffz','sfzp','fz','rfz','rf'].includes(name)?'sfz':null;
const articulation={staccato:'.',staccatissimo:'!wedge!',accent:'!>!','strong-accent':'!>!',tenuto:'!tenuto!',fermata:'!fermata!'};
const wedgeMark={crescendo:'!<(!',diminuendo:'!>(!','stop-crescendo':'!<)!','stop-diminuendo':'!>)!'};
const pedalMark={start:'"_Ped."',stop:'"_*"',change:'"_*""_Ped."'};
// Split overlapping voices into chord slices, retaining per-note ties and fingerings.
export function segmentNotes(notes,starts){
  const events=[];
  for(let m=0;m<starts.length-1;m++){
    const start=starts[m],end=starts[m+1],inBar=notes.filter(n=>n.beat<end-1e-7&&n.beat+n.duration>start+1e-7);
    const cuts=[...new Set([start,end,...inBar.flatMap(n=>[Math.max(start,n.beat),Math.min(end,n.beat+n.duration)])].map(n=>Math.round(n*1e7)/1e7))].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const beat=cuts[i],duration=cuts[i+1]-beat,active=inBar.filter(n=>n.beat<=beat+1e-6&&n.beat+n.duration>beat+1e-6).sort((a,b)=>a.midi-b.midi);
      if(new Set(active.map(n=>n.midi)).size!==active.length)fail('Overlapping unison voices need to be merged in the notation app before importing.');
      const starting=active.filter(n=>Math.abs(n.beat-beat)<1e-6),arts=[...new Set(starting.flatMap(n=>n.arts||[]))],slurStart=starting.some(n=>n.slurStart),slurStop=active.some(n=>n.slurStop&&Math.abs(n.beat+n.duration-beat-duration)<1e-6);
      events.push({...(arts.length?{arts}:{}),...(slurStart?{slurStart}:{}),...(slurStop?{slurStop}:{}),beat,duration,notes:active.map(n=>n.midi),fingers:active.map(n=>Math.abs(n.beat-beat)<1e-6?n.finger:''),spellings:active.map(n=>({step:n.step,octave:n.octave,alter:n.alter})),tieStarts:active.filter(n=>n.tieStart||n.beat+n.duration>beat+duration+1e-6).map(n=>n.midi),tieEnds:active.filter(n=>n.tieEnd||n.beat<beat-1e-6).map(n=>n.midi)});
    }
  }
  return events;
}
const fraction=value=>{let denominator=1;while(denominator<100000&&Math.abs(value*denominator-Math.round(value*denominator))>1e-5)denominator++;return `${Math.round(value*denominator)}/${denominator}`;};
const keyNames=['Cb','Gb','Db','Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#'];
const powers=[1/16,1/8,1/4,1/2,1,2,4,8,16];
const plain=d=>powers.some(p=>[1,1.5,1.75].some(dot=>Math.abs(d-p*dot)<1e-5));
// Playback durations alone do not tell abcjs to engrave a tuplet. A duration that no plain or dotted
// note can write starts a tuplet: find the shortest contiguous group whose written values fill n units
// of one standard note value, e.g. (3:2:3 eighths, (3:2:2 quarter + eighth, (5:4:5 sixteenths.
// Rounded timings in scores saved before this fix are accepted within the tolerance.
function tupletAt(events,index,compound){
  const first=events[index];if(!first||plain(first.duration))return null;
  for(const n of compound?[3,2,4,5,6,7]:[3,5,6,7]){
    const m=compound&&(n===2||n===4)?3:2**Math.floor(Math.log2(n)),factor=n/m;let written=0;
    for(let j=index;j<events.length;j++){
      const e=events[j];if(j>index&&Math.abs(e.beat-events[j-1].beat-events[j-1].duration)>1e-6)break;
      if(!plain(e.duration*factor))break;written+=e.duration*factor;
      if(j>index&&powers.some(p=>Math.abs(written/n-p)<1e-5))return {n,m,count:j-index+1,factor};
      if(written>n*4)break;
    }
  }
  return null;
}
// The abcjs voices for a hand, in staff order: one per staff, or one per MusicXML voice when layout.separate.
export function excerptVoices(score,hand,separate=false){
  return (hand==='both'?['right','left']:[hand]).flatMap(staff=>{const parts=separate?score.voiceParts?.[staff]:null;return parts?parts.map((p,i)=>({key:staff+(i+1),staff,events:p.events,secondary:i>0,stem:i?'down':'up',first:!i})):[{key:staff,staff,events:score.voices.find(v=>v.id===staff).events,secondary:false,first:true}];});
}
export function importedExcerpt(score,hand,start,end,large=false,layout={}){
  const ids=hand==='both'?['right','left']:[hand],starts=measureStarts(score),meterAt=m=>score.meters?.[m-1]??score.meter,lines=excerptVoices(score,hand,layout.separate),group=staff=>{const keys=lines.filter(l=>l.staff===staff).map(l=>l.key);return keys.length>1?'('+keys.join(' ')+')':keys[0];};
  let abc=`X:1\nT:Measures ${start}-${end}\nM:${meterAt(start)}\nL:1/4\n%%score ${ids.length===2?'{ '+group('right')+' '+group('left')+' }':group(ids[0])}\n%%barsperstaff ${layout.bars??(large?1:2)}\n%%staffwidth ${layout.width??(large?300:540)}\n%%stretchlast 1\n%%measurenb 0\n%%setbarnb 2\n`;
  for(const l of lines)abc+=`V:${l.key} clef=${score.clefs[l.staff]}`+(l.first?` name="${l.staff==='right'?'RH':'LH'}"`:'')+(l.stem?' stem='+l.stem:'')+'\n';
  const openingKey=score.measureKeys?.[start-1]??0;
  abc+='K:'+keyNames[openingKey+7]+'\n';
  for(const {key,staff:id,events,secondary,first:primary} of lines){abc+=`[V:${key}] `;const marks=layout.expression&&primary?score.expressions?.[id]||[]:[];
    for(let m=start;m<=end;m++){
      const fifths=score.measureKeys?.[m-1]??0,accidentals=new Map();
      if(m>start&&meterAt(m)!==meterAt(m-1))abc+='[M:'+meterAt(m)+'] ';
      if(m>start&&fifths!==(score.measureKeys?.[m-2]??0))abc+='[K:'+keyNames[fifths+7]+'] ';
      const [beats,beatType]=meterAt(m).split('/').map(Number),group=beatType===8&&beats%3===0?1.5:1;
      const inBar=events.filter(e=>e.beat>=starts[m-1]-1e-6&&e.beat<starts[m]-1e-6),barStart=starts[m-1];
      let tupletRemaining=0,factor=1;
      for(let i=0;i<inBar.length;i++){
        const e=inBar[i];
        if(!tupletRemaining){const t=tupletAt(inBar,i,group===1.5);factor=t?.factor??1;if(t){abc+='('+t.n+':'+t.m+':'+t.count;tupletRemaining=t.count;}}
        const duration=e.duration*factor;
        // A space breaks the beam: beam contiguous notes shorter than a quarter within one beat group.
        const n=inBar[i+1],beamed=!tupletRemaining&&n&&e.notes.length&&n.notes.length&&duration<1&&n.duration*(tupletAt(inBar,i+1,group===1.5)?.factor??1)<1&&Math.abs(n.beat-e.beat-e.duration)<1e-6&&Math.floor((e.beat-barStart+1e-6)/group)===Math.floor((n.beat-barStart+1e-6)/group);
        const separator=tupletRemaining&&--tupletRemaining||beamed?'':' ';
        const here=marks.filter(k=>k.beat>=e.beat-1e-6&&k.beat<e.beat+e.duration-1e-6),expression=here.map(k=>k.pedal?pedalMark[k.pedal]:'').join('')+here.map(k=>k.dynamic?'!'+k.dynamic+'!':k.wedge?wedgeMark[k.wedge]:'').join('');
        if(!e.notes.length){abc+=expression+(secondary?'x':'z')+fraction(duration)+separator;continue;}
        const tokens=e.notes.map((n,i)=>{const p=e.spellings[i];let pitch=p.octave>=5?p.step.toLowerCase()+"'".repeat(p.octave-5):p.step+','.repeat(Math.max(0,4-p.octave));const previous=accidentals.get(pitch)??keyAlter(p.step,fifths);const accidental=p.alter===previous?'':p.alter>0?'^'.repeat(p.alter):p.alter<0?'_'.repeat(-p.alter):'=';accidentals.set(pitch,p.alter);return accidental+pitch+(e.tieStarts.includes(n)?'-':'');});
        const fingering=e.fingers.filter(f=>/^[1-5]$/.test(f)).map(f=>'!'+f+'!').join('');
        const slurOpen=layout.expression&&e.slurStart?'(':'',slurClose=layout.expression&&e.slurStop?')':'',arts=layout.expression?(e.arts||[]).map(a=>articulation[a]).join(''):'';
        abc+=expression+slurOpen+fingering+arts+(tokens.length>1?'['+tokens.join('')+']':tokens[0].replace(/-$/,''))+fraction(duration)+(tokens.length===1&&tokens[0].endsWith('-')?'-':'')+slurClose+separator;
      }abc+='| ';
    }abc+='\n';
  }return abc;
}
export async function readMusicXMLFile(file){
  if(file.size>8000000)fail('Choose a score smaller than 8 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  // File pickers and export tools can supply inconsistent extensions and MIME types.
  // Inspect the actual archive signature, then let the XML parser validate the score.
  if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)return file.text();
  if(bytes.length<22)fail('The MXL archive is invalid.');
  const view=new DataView(bytes.buffer);let end=bytes.length-22;
  while(end>=Math.max(0,bytes.length-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
  if(end<0||end<bytes.length-65557)fail('The MXL archive is invalid.');
  const count=view.getUint16(end+10,true),entries=new Map();let offset=view.getUint32(end+16,true);
  for(let i=0;i<count;i++){
    if(view.getUint32(offset,true)!==0x02014b50)fail('Invalid MXL archive directory.');
    const method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),expanded=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
    const name=new TextDecoder().decode(bytes.slice(offset+46,offset+46+nameLength));entries.set(name,{method,size,expanded,local});offset+=46+nameLength+extra+comment;
  }
  async function extract(name){const e=entries.get(name);if(!e||e.expanded>8000000)fail('Missing or oversized MusicXML content in the archive.');const start=e.local+30+view.getUint16(e.local+26,true)+view.getUint16(e.local+28,true),data=bytes.slice(start,start+e.size);if(e.method===0)return new TextDecoder().decode(data);if(e.method!==8)fail('Unsupported MXL compression. Export uncompressed MusicXML.');const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8000000){await reader.cancel();fail('Expanded MusicXML is too large.');}chunks.push(value);}return new Blob(chunks).text();}
  const container=new DOMParser().parseFromString(await extract('META-INF/container.xml'),'application/xml');const path=container.querySelector('rootfile')?.getAttribute('full-path');if(!path)fail('MXL archive has no root score.');return extract(path);
}
