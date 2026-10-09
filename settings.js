// One source of truth for every setting: where it is stored, how it is shown and validated, and
// what must refresh when it changes. 'piece' settings are saved with each piece's progress;
// 'device' settings belong to this browser (theme, colours, keys). Entries without a group are
// controlled elsewhere on the page (tempo, volumes) but validated here.
const select=(key,scope,group,label,def,options,refresh='none',extra={})=>({key,scope,group,label,type:'select',default:def,options,refresh,...extra});
const check=(key,scope,group,label,def,refresh='none',extra={})=>({key,scope,group,label,type:'check',default:def,refresh,...extra});
const colour=(key,label,def)=>({key,scope:'device',group:'display',label,type:'color',default:def,refresh:'display'});
const range=(key,scope,group,label,def,min,max,step,refresh='none',extra={})=>({key,scope,group,label,type:'range',default:def,min,max,step,refresh,...extra});
export const settings=[
 range('tempo','piece',null,'Tempo',50,30,180,1),
 range('volume','piece',null,'Volume',75,0,100,1),
 range('leftVolume','piece',null,'Left hand',70,0,100,1),
 range('rightVolume','piece',null,'Right hand',80,0,100,1),
 // Score
 select('scoreView','piece','score','Show','piece',[['piece','Whole score, dim the rest'],['around','Measures around the section'],['section','Current section only']],'render',{migrate:{page:'around'}}),
 select('scoreHeight','piece','score','Score height','auto',[['auto','Automatic (half the screen in compact view)'],['fit','Full length, the page scrolls'],['half','Half the screen, the score scrolls'],['tall','Three quarters of the screen']],'render'),
 check('followSection','piece','score','Scroll to the section when it changes',true),
 select('pageMeasures','piece','score','Measures around the section',8,[[4,'4 measures'],[8,'8 measures'],[12,'12 measures'],[16,'16 measures']],'render',{help:'Used when Show is “Measures around the section”.'}),
 select('barsPerLine','piece','score','Measures per line','auto',[['auto','Auto (fits the screen)'],[1,'1'],[2,'2'],[4,'4']],'render'),
 range('contextDim','piece','score','Dim the rest',65,0,90,5,'dim',{unit:'%'}),
 select('scoreSize','piece','score','Score size','standard',[['standard','Standard'],['large','Large, one measure per line']],'render'),
 select('highlightMode','piece','score','Highlight','notes',[['notes','Current notes and rests'],['measure','Whole measure'],['off','Off']],'marks'),
 check('outlineNext','piece','score','Outline upcoming notes',false,'marks'),
 check('showCueGuide','piece','score','Show the notes and fingerings guide',true,'marks'),
 check('autoFollow','piece','score','Follow the playing position during playback',true),
 check('heatmap','piece','score','Colour measures by accuracy in timed checks',false,'render',{help:'Green to red, from your recent MIDI timed checks and rhythm taps.'}),
 check('showExpression','piece','score','Dynamics, articulation, slurs and pedal marks',false,'render',{help:'Imported scores. Engraving only: playback stays even.'}),
 select('noteNames','piece','score','Note names on noteheads','off',[['off','Off'],['letters','Letters (C D E)'],['solfege','Fixed do (Do Re Mi)']],'render'),
 check('printNoteNames','piece','score','Print note names',false,'render'),
 check('showKeyboard','piece','score','Keyboard under the score',false,'render',{help:'Shows the keys to play now and outlines the next ones.'}),
 // Sound & playback
 select('countBars','piece','sound','Count-in',1,[[0,'None'],[1,'1 bar'],[2,'2 bars']]),
 select('metronomeSub','piece','sound','Metronome clicks','beat',[['beat','Each beat'],['eighth','Each eighth note']]),
 select('metronomeMode','piece','sound','Metronome pattern','steady',[['steady','Every click'],['accents','Only the first beat of each measure'],['silent','Silent every second measure']],'none',{help:'Fewer clicks make you keep the pulse yourself.'}),
 select('fadeHand','piece','sound','Fade a hand out in hands-together rounds','off',[['off','Off'],['left','Left hand'],['right','Right hand']],'none',{help:'Each clean Mix & combine round lowers that hand’s playback by 20%, so you gradually take it over.'}),
 check('recorder','device','sound','Show the recorder (recordings stay on this device)',false,'display'),
 check('midiPageTurn','device','sound','Sustain pedal turns the page in performance mode',false),
 select('micOctaveTolerance','device','sound','Microphone octave check','low',[['strict','Exact octave only'],['low','Allow an octave error below C3'],['any','Allow any octave error']],'none',{help:'Phone microphones often hear low notes an octave high.'}),
 // Practice flow
 select('sectionSize','piece','practice','Section size',2,[[1,'1 measure'],[2,'2 measures'],[4,'4 measures']],'sections',{help:'Imported pieces only. Each size keeps its own records.'}),
 select('learnOrder','piece','practice','Separate-hands order','left',[['left','Left hand first'],['right','Right hand first'],['alternate','Always alternate hands']],'learnOrder'),
 select('interleave','piece','practice','Interleaving','jump',[['jump','Jump across the piece'],['near','Neighbouring passages'],['order','In order']]),
 select('tempoStep','piece','practice','Tempo step',5,[[2,'2 BPM'],[5,'5 BPM'],[10,'10 BPM']]),
 check('autoSlow','piece','practice','Slow down one tempo step after “Needs a slow retry”',true),
 check('tempoRamp','piece','practice','Tempo ramp: raise a passage one step after two clean rounds',false,'render'),
 range('rampTarget','piece','practice','Tempo ramp target',80,30,180,1,'render',{unit:' BPM',help:'Starts at the marked tempo when the score has one.'}),
 check('loopAccelerate','piece','practice','Speed up one tempo step on each loop pass',false,'none',{help:'Stops at the tempo ramp target.'}),
 select('memorize','piece','practice','Memorization','off',[['off','Off'],['after2','Hide notes after two clean rounds'],['always','Always hide the section’s notes']],'render',{help:'Barlines, rests and bar numbers stay. Hold Peek or the P key to see the notes.'}),
 check('memorizeAll','piece','practice','Also hide the dimmed measures while memorizing',false,'render'),
 check('showHistory','piece','practice','Show practice history in the plan',false,'render',{help:'Every rated round is recorded on this device either way.'}),
 check('autoHint','piece','practice','Show the starting hint for a passage’s first three rounds',false,'render'),
 {key:'dailyGoal',scope:'device',group:'practice',label:'Daily practice goal (minutes, 0 = off)',type:'number',default:0,min:0,max:600,step:5,refresh:'estimate'},
 // Display
 select('theme','device','display','Theme','auto',[['auto','Match this device'],['light','Light'],['dark','Dark']],'display'),
 check('paper','device','display','White paper behind the notation in dark theme',false,'display'),
 select('uiScale','device','display','Text and controls','normal',[['small','Small'],['normal','Normal'],['large','Large']],'display'),
 select('handColours','device','display','Current-note colours','one',[['one','Both hands in the right-hand colour'],['perHand','Each hand in its own colour']],'display'),
 colour('rhColor','Right-hand colour','#b94c22'),
 colour('lhColor','Left-hand colour','#176853'),
 select('accidentalColours','device','display','Coloured sharps and flats','both',[['both','Key signature and accidentals'],['chromatic','Accidentals only'],['off','Off']],'display'),
 colour('accKeyColour','Key-signature sharps and flats','#7736ad'),
 colour('accChromaticColour','Accidentals','#c2185b'),
];
export const groups=[['score','Score'],['sound','Sound & playback'],['practice','Practice flow'],['display','Display'],['keys','Shortcuts'],['data','Your data']];
export const settingByKey=Object.fromEntries(settings.map(s=>[s.key,s]));
export const defaults=scope=>Object.fromEntries(settings.filter(s=>s.scope===scope).map(s=>[s.key,s.default]));
// A valid value for the key, or the fallback (the default unless given). Numbers are clamped to
// their range, so slightly out-of-range saved values survive; wrong types and unknown options do not.
export function validate(key,value,fallback=settingByKey[key]?.default){
 const s=settingByKey[key];if(!s)return undefined;
 if(s.migrate&&Object.hasOwn(s.migrate,value))value=s.migrate[value];
 if(s.type==='select'){const option=s.options.find(([v])=>v===value||String(v)===String(value)&&value!==''&&value!=null);return option?option[0]:fallback;}
 if(s.type==='check')return typeof value==='boolean'?value:fallback;
 if(s.type==='color')return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
 const n=typeof value==='string'&&value.trim()?Number(value):value;
 return typeof n==='number'&&Number.isFinite(n)?Math.max(s.min,Math.min(s.max,Math.round(n))):fallback;
}
// Shortcut actions and their default keys (KeyboardEvent.code).
export const actions=[['playPause','Play or pause','Space'],['previousNote','Previous notes','ArrowLeft'],['nextNote','Next notes','ArrowRight'],['loop','Change loop','KeyL'],['metronome','Metronome on or off','KeyM'],['rate1','Rate: needs a slow retry','Digit1'],['rate2','Rate: close, one stumble','Digit2'],['rate3','Rate: clean and steady','Digit3'],['nextRound','Next round','KeyN'],['openSettings','Open settings','Comma'],['peek','Peek at hidden notes (hold)','KeyP']];
export function validKeys(value){
 const keys=Object.fromEntries(actions.map(([id,,code])=>[id,code]));if(!value||typeof value!=='object')return keys;
 for(const [id] of actions)if(typeof value[id]==='string'&&/^[A-Za-z0-9]{0,24}$/.test(value[id]))keys[id]=value[id];
 return keys;
}
// Presets set only the keys they list and leave every other setting alone.
export const presets={
 beginner:{label:'Beginner',values:{scoreView:'piece',contextDim:75,sectionSize:1,highlightMode:'notes',outlineNext:true,showCueGuide:true,countBars:2,metronomeSub:'eighth',tempoStep:2,autoSlow:true,learnOrder:'left',interleave:'near',noteNames:'letters',showKeyboard:true,tempoRamp:true,autoHint:true,memorize:'off'}},
 intermediate:{label:'Intermediate',values:{scoreView:'piece',contextDim:65,sectionSize:2,highlightMode:'notes',outlineNext:false,showCueGuide:true,countBars:1,metronomeSub:'beat',tempoStep:5,autoSlow:true,learnOrder:'alternate',interleave:'jump',noteNames:'off',showKeyboard:false,tempoRamp:true,autoHint:false,showExpression:true,memorize:'off'}},
 advanced:{label:'Advanced',values:{scoreView:'piece',contextDim:40,sectionSize:4,highlightMode:'measure',outlineNext:false,showCueGuide:false,countBars:1,metronomeSub:'beat',tempoStep:10,autoSlow:false,learnOrder:'alternate',interleave:'jump',noteNames:'off',showKeyboard:false,tempoRamp:false,autoHint:false,showExpression:true,memorize:'after2'}},
};
// The preset whose every value matches; sectionSize is ignored where sections are fixed.
export function matchingPreset(get,fixedSections=false){
 for(const [id,preset] of Object.entries(presets))if(Object.entries(preset.values).every(([k,v])=>fixedSections&&k==='sectionSize'||get(k)===v))return id;
 return 'custom';
}
