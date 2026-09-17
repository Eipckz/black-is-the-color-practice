// Local MusicXML reading. No uploads or external conversion service.
const text=(node,selector,fallback='')=>node.querySelector(selector)?.textContent.trim()??fallback;
const number=(node,selector,fallback)=>Number(text(node,selector,String(fallback)));
const children=(node,name)=>Array.from(node.children).filter(n=>n.localName===name);
const fail=message=>{throw new Error(message);};
export function parseMusicXML(source, filename='Imported score', Parser=DOMParser){
  if(source.length>8000000)fail('Choose a MusicXML file smaller than 8 MB.');
  if(/<!ENTITY/i.test(source))fail('XML entities are not supported. Export a fresh MusicXML file.');
  const doc=new Parser().parseFromString(source,'application/xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='score-partwise')fail('Choose a partwise MusicXML file exported by your notation app.');
  const parts=children(doc.documentElement,'part');
  if(parts.length!==1)fail('Export just the piano part as MusicXML, with its right and left staves in one part.');
  if(doc.querySelector('transpose, unpitched'))fail('Import a concert-pitch piano part without percussion or transposition.');
  if(doc.querySelector('grace'))fail('Grace notes need a measured realization. Export a practice copy with their written durations.');
  if(doc.querySelector('repeat, ending')||Array.from(doc.querySelectorAll('sound')).some(n=>['dacapo','dalsegno','tocoda','fine'].some(a=>n.hasAttribute(a))))fail('Expand repeats and jumps in your notation app before importing, so each practice measure has one playback position.');
  const measures=children(parts[0],'measure');
  if(!measures.length||measures.length>500)fail('Import between 1 and 500 measures at a time.');
  let divisions=1,meter=null,beats=4,beatType=4,key=0,tempo=80;
  const raw={right:[],left:[]},clefs={right:'treble',left:'bass'};
  const warnings=new Set(['Playback uses a steady tempo. Follow expressive dynamics, pedal, ornaments, and tempo changes yourself.']);
  measures.forEach((measure,index)=>{
    const attr=children(measure,'attributes')[0];
    if(attr){
      divisions=number(attr,'divisions',divisions);if(!(divisions>0))fail('Invalid MusicXML divisions.');
      const time=attr.querySelector('time');
      if(time){const b=number(time,'beats',4),t=number(time,'beat-type',4);if(!Number.isInteger(b)||b<1||b>12||![2,4,8,16].includes(t))fail('Use a simple numeric time signature.');if(meter&&meter!==`${b}/${t}`)fail('Changing time signatures are not supported yet. Import each constant-meter section separately.');beats=b;beatType=t;meter=`${b}/${t}`;}
      const nextKey=number(attr,'key fifths',key);if(index&&nextKey!==key)warnings.add('Key changes are shown using explicit accidentals.');key=nextKey;
      for(const clef of children(attr,'clef')){const staff=Number(clef.getAttribute('number')||1),sign=text(clef,'sign'),line=number(clef,'line',sign==='F'?4:2);if(!((sign==='G'&&line===2)||(sign==='F'&&line===4))||number(clef,'clef-octave-change',0)!==0)fail('Only standard treble and bass clefs are supported.');if(index)warnings.add('The practice score uses the opening clefs throughout.');else clefs[staff===2?'left':'right']=sign==='F'?'bass':'treble';}
    }
    const length=beats*4/beatType,base=index*length;let cursor=0,previous=null;
    const sound=measure.querySelector('sound[tempo]');if(index===0&&sound)tempo=Number(sound.getAttribute('tempo'))||80;
    for(const element of measure.children){
      if(['backup','forward'].includes(element.localName)){cursor+=(element.localName==='backup'?-1:1)*number(element,'duration',0)/divisions;if(cursor<-.00001)fail('Invalid backward position in MusicXML.');continue;}
      if(element.localName!=='note')continue;
      const duration=number(element,'duration',0)/divisions;if(!(duration>0))fail('Every note needs a positive duration. Export a measured practice copy.');
      const chord=!!element.querySelector('chord'),start=chord?previous:cursor;if(start===null)fail('A chord is missing its first note.');
      if(start+duration>length+.00001)fail('A measure exceeds its time signature. Export complete, regular measures.');
      const staff=number(element,'staff',1);if(![1,2].includes(staff))fail('Export a piano part with at most two staves.');
      if(!element.querySelector('rest')){
        const step=text(element,'pitch step'),octave=number(element,'pitch octave',NaN),alter=number(element,'pitch alter',0);
        const midi=12*(octave+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step])+alter;
        if(!Number.isInteger(midi)||midi<21||midi>108||!Number.isInteger(alter)||Math.abs(alter)>2)fail('Only standard piano pitches A0 to C8 are supported.');
        const ties=Array.from(element.querySelectorAll('tie')).map(t=>t.getAttribute('type'));
        raw[staff===2?'left':'right'].push({beat:base+start,duration,midi,step,octave,alter,finger:text(element,'notations technical fingering'),tieStart:ties.includes('start'),tieEnd:ties.includes('stop')});
      }
      if(!chord){previous=cursor;cursor+=duration;}
    }
    if(cursor<length-.00001)warnings.add('Short measures, including pickups, are padded with rests to the full meter.');
  });
  if(!raw.right.length&&!raw.left.length)fail('The score contains no playable piano notes.');
  const beatsPerMeasure=beats*4/beatType;
  const voices=Object.entries(raw).map(([id,notes])=>({id,events:segmentNotes(notes,measures.length,beatsPerMeasure)}));
  return {title:text(doc,'work-title',text(doc,'movement-title',filename.replace(/\.(musicxml|xml|mxl)$/i,''))).slice(0,160),tempo,measures:measures.length,meter:meter||'4/4',beatsPerMeasure,clefs,voices,warnings:[...warnings],imported:true};
}
// Split overlapping voices into chord slices, retaining per-note ties and fingerings.
export function segmentNotes(notes,measures,length){
  const events=[];
  for(let m=0;m<measures;m++){
    const start=m*length,end=start+length,inBar=notes.filter(n=>n.beat<end-1e-7&&n.beat+n.duration>start+1e-7);
    const cuts=[...new Set([start,end,...inBar.flatMap(n=>[Math.max(start,n.beat),Math.min(end,n.beat+n.duration)])].map(n=>Math.round(n*1e7)/1e7))].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const beat=cuts[i],duration=cuts[i+1]-beat,active=inBar.filter(n=>n.beat<=beat+1e-6&&n.beat+n.duration>beat+1e-6).sort((a,b)=>a.midi-b.midi);
      if(new Set(active.map(n=>n.midi)).size!==active.length)fail('Overlapping unison voices need to be merged in the notation app before importing.');
      events.push({beat,duration,notes:active.map(n=>n.midi),fingers:active.map(n=>Math.abs(n.beat-beat)<1e-6?n.finger:''),spellings:active.map(n=>({step:n.step,octave:n.octave,alter:n.alter})),tieStarts:active.filter(n=>n.tieStart||n.beat+n.duration>beat+duration+1e-6).map(n=>n.midi),tieEnds:active.filter(n=>n.tieEnd||n.beat<beat-1e-6).map(n=>n.midi)});
    }
  }
  return events;
}
const fraction=value=>{let denominator=1;while(denominator<100000&&Math.abs(value*denominator-Math.round(value*denominator))>1e-5)denominator++;return `${Math.round(value*denominator)}/${denominator}`;};
export function importedExcerpt(score,hand,start,end,large=false){
  const ids=hand==='both'?['right','left']:[hand];
  let abc=`X:1\nT:Measures ${start}-${end}\nM:${score.meter}\nL:1/4\n%%score ${ids.length===2?'{ right left }':ids[0]}\n%%barsperstaff ${large?1:2}\n%%staffwidth ${large?300:540}\n%%stretchlast 1\n`;
  for(const id of ids)abc+=`V:${id} clef=${score.clefs[id]} name="${id==='right'?'RH':'LH'}"\n`;
  abc+='K:C\n';
  for(const id of ids){abc+=`[V:${id}] `;const events=score.voices.find(v=>v.id===id).events;
    for(let m=start;m<=end;m++){
      for(const e of events.filter(e=>Math.floor((e.beat+1e-6)/score.beatsPerMeasure)+1===m)){
        if(!e.notes.length){abc+='z'+fraction(e.duration)+' ';continue;}
        const tokens=e.notes.map((n,i)=>{const p=e.spellings[i];let pitch=p.octave>=5?p.step.toLowerCase()+"'".repeat(p.octave-5):p.step+','.repeat(Math.max(0,4-p.octave));const accidental=p.alter>0?'^'.repeat(p.alter):p.alter<0?'_'.repeat(-p.alter):'=';return accidental+pitch+(e.tieStarts.includes(n)?'-':'');});
        const fingering=e.fingers.filter(f=>/^[1-5]$/.test(f)).map(f=>'!'+f+'!').join('');
        abc+=fingering+(tokens.length>1?'['+tokens.join('')+']':tokens[0].replace(/-$/,''))+fraction(e.duration)+(tokens.length===1&&tokens[0].endsWith('-')?'-':'')+' ';
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
