"""Rebuild the photographed Unit 8, p.111 exercise and its requested transposition."""
from pathlib import Path
from xml.etree import ElementTree as E
from music21 import pitch

OUT = Path(__file__).resolve().parents[1] / 'repertoire'
OUT.mkdir(exist_ok=True)
# Written bar numbers exclude the one-beat anacrusis. Durations are quarter beats.
MELODY = [
 [('F4',.5),('B-4',.5)],
 [('D5',1),('D5',.5),('D5',.5),('D5',1),('C5',.5),('D5',.5)],
 [('C5',.5),('B-4',.5),('B-4',2),('F4',.5),('B-4',.5)],
 [('D5',1),('B-4',.5),('D5',.5),('F5',1),('E-5',.5),('D5',.5)],
 [('C5',3),('F5',.5),('E-5',.5)],
 [('D5',1),('D5',.5),('C5',.5),('B-4',1),('C5',.5),('D5',.5)],
 [('F5',.5),('E-5',.5),('E-5',2),('G4',.5),('G-4',.5)],
 [('F4',1),('A4',.5),('B-4',.5),('C5',1),('D5',.5),('C5',.5)],
 [('B-4',3)],
]
CHORDS = {'I':['B-2','D3','F3'], 'V7':['A2','C3','E-3','F3'],
          'IV':['B-2','E-3','G3'], 'V7/IV':['B-2','D3','F3','A-3']}
LEFT = [[(None,1)], [('I',2),('I',2)], [('I',4)], [('I',4)], [('V7',4)],
        [('I',2),('V7/IV',2)], [('IV',4)], [('V7',4)], [('I',3)]]
FINGERS={(0,0):1,(0,1):3,(1,0):5,(2,3):1,(2,4):3,(3,0):5,(3,1):1,
         (6,3):1,(6,4):2,(7,0):1,(7,1):2}
SLURS={(0,0):'start',(2,2):'stop',(2,3):'start',(4,0):'stop',
       (4,1):'start',(6,2):'stop',(6,3):'start',(8,0):'stop'}

def sub(parent, tag, value=None, **attrs):
    node=E.SubElement(parent,tag,attrs)
    if value is not None: node.text=str(value)
    return node

def make_note(parent, pitches, dur, staff, transpose=0, tie=None, slur=None, finger=None, beam=None):
    for i,p in enumerate(pitches or [None]):
        n=sub(parent,'note')
        if i: sub(n,'chord')
        if p:
            p=pitch.Pitch(p)
            if transpose: p=p.transpose('M2')
            pn=sub(n,'pitch');sub(pn,'step',p.step)
            if p.accidental: sub(pn,'alter',int(p.accidental.alter))
            sub(pn,'octave',p.octave)
        else: sub(n,'rest')
        sub(n,'duration',int(dur*8))
        if tie: sub(n,'tie',type=tie)
        sub(n,'voice',staff)
        sub(n,'type',{.5:'eighth',1:'quarter',2:'half',3:'half',4:'whole'}[dur])
        if dur==3: sub(n,'dot')
        sub(n,'staff',staff)
        if beam: sub(n,'beam',beam,number='1')
        if tie or slur or finger:
            ns=sub(n,'notations')
            if tie: sub(ns,'tied',type=tie)
            if slur: sub(ns,'slur',type=slur,number='1')
            if finger: sub(sub(ns,'technical'),'fingering',finger)

for key,transpose,fifths in [('Bb',0,-2),('C',2,0)]:
    root=E.Element('score-partwise',version='4.0')
    sub(sub(root,'work'),'work-title',f'Red River Valley - {"B-flat" if key=="Bb" else "C"} major')
    sub(sub(root,'identification'),'creator','Traditional - United States',type='composer')
    pl=sub(root,'part-list');sp=sub(pl,'score-part',id='P1');sub(sp,'part-name','Piano')
    ins=sub(sp,'score-instrument',id='I1');sub(ins,'instrument-name','Piano')
    mi=sub(sp,'midi-instrument',id='I1');sub(mi,'midi-channel',1);sub(mi,'midi-program',1)
    part=sub(root,'part',id='P1')
    for bar,(melody,left) in enumerate(zip(MELODY,LEFT)):
        m=sub(part,'measure',number=str(bar),**({'implicit':'yes'} if bar==0 else {}))
        if bar==0:
            a=sub(m,'attributes');sub(a,'divisions',8);sub(sub(a,'key'),'fifths',fifths)
            tm=sub(a,'time',symbol='common');sub(tm,'beats',4);sub(tm,'beat-type',4)
            sub(a,'staves',2)
            for num,sign,line in [(1,'G',2),(2,'F',4)]:
                c=sub(a,'clef',number=str(num));sub(c,'sign',sign);sub(c,'line',line)
            d=sub(m,'direction',placement='above');dt=sub(d,'direction-type');sub(dt,'words','Allegro')
            met=sub(sub(d,'direction-type'),'metronome');sub(met,'beat-unit','quarter');sub(met,'per-minute',112)
            sub(d,'staff',1);sub(d,'sound',tempo='112')
            d=sub(m,'direction',placement='below');sub(sub(sub(d,'direction-type'),'dynamics'),'f');sub(d,'staff',1)
        if bar==5: sub(m,'print',**{'new-system':'yes'})
        for i,(p,dur) in enumerate(melody):
            tie=('start' if i==1 else 'stop') if bar in (2,6) and i in (1,2) else None
            beam=None
            if dur==.5:
                run=i
                while run>0 and melody[run-1][1]==.5: run-=1
                beam='begin' if (i-run)%2==0 else 'end'
            make_note(m,[p],dur,1,transpose,tie,SLURS.get((bar,i)),FINGERS.get((bar,i)),beam)
        sub(sub(m,'backup'),'duration',int(sum(d for p,d in melody)*8))
        for label,dur in left:
            if label:
                d=sub(m,'direction',placement='below');sub(sub(d,'direction-type'),'words',label);sub(d,'staff',2)
            make_note(m,CHORDS.get(label),dur,2,transpose)
        if bar==8: sub(sub(m,'barline',location='right'),'bar-style','light-heavy')
    E.indent(root)
    E.ElementTree(root).write(OUT/f'Red-River-Valley-{key}.musicxml',encoding='utf-8',xml_declaration=True)
    print(key, '40 melody notes, 10 LH attacks, 32 quarter beats; tempo 112 is editorial.')
