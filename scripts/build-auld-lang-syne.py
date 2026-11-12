"""Build the F-major vocal line and two-hand accompaniment from Unit 8, p. 112."""
import xml.etree.ElementTree as ET
from pathlib import Path

def tag(parent, name, value=None, **attrs):
    child = ET.SubElement(parent, name, attrs)
    if value is not None:
        child.text = str(value)
    return child

score = ET.Element("score-partwise", version="4.0")
tag(tag(score,"work"), "work-title","Auld Lang Syne")
parts = tag(score,"part-list")
for ident,name in [("V","Melody"),("P","Piano accompaniment")]:
    tag(tag(parts,"score-part",id=ident),"part-name",name)

def note(m, pitches, ticks, staff=1, lyric="", finger="", slur=""):
    for i,p in enumerate(pitches.split() or [""]):
        n=tag(m,"note")
        if i: tag(n,"chord")
        if p:
            pitch=tag(n,"pitch")
            tag(pitch,"step",p[0])
            if len(p)==3: tag(pitch,"alter",{"b":-1,"#":1}[p[1]])
            tag(pitch,"octave",p[-1])
        else: tag(n,"rest")
        tag(n,"duration",ticks)
        tag(n,"voice",staff)
        tag(n,"type",{1:"eighth",2:"quarter",3:"quarter",6:"half"}[ticks])
        if ticks in [3,6]: tag(n,"dot")
        tag(n,"staff",staff)
        if slur or finger:
            marks=tag(n,"notations")
            if slur: tag(marks,"slur",type=slur,number="1")
            if finger: tag(tag(marks,"technical"),"fingering",finger)
        if lyric and lyric!="_":
            l=tag(n,"lyric")
            syllable="middle" if lyric.startswith("-") and lyric.endswith("-") else "end" if lyric.startswith("-") else "begin" if lyric.endswith("-") else "single"
            tag(l,"syllabic",syllable)
            tag(l,"text",lyric.strip("-"))
        elif lyric=="_": tag(tag(n,"lyric"),"extend")

def measure(part,i,piano=False):
    m=tag(part,"measure",number=str(i),**({"implicit":"yes"} if i==0 else {}))
    if i in [5,9,13]: tag(m,"print",**{"new-system":"yes"})
    if i==0:
        a=tag(m,"attributes"); tag(a,"divisions",2);tag(tag(a,"key"),"fifths",-1)
        time=tag(a,"time");tag(time,"beats",4);tag(time,"beat-type",4)
        if piano:tag(a,"staves",2)
        for staff in range(1,3 if piano else 2):
            c=tag(a,"clef",number=str(staff));tag(c,"sign","F" if piano else "G");tag(c,"line",4 if piano else 2)
        d=tag(m,"direction");tag(tag(d,"direction-type"),"words","Andante")
    return m

# Each melody pitch has a duration in eighth notes and a sung syllable.
rows=[
("C4","2","Should"),
("F4 F4 F4 A4","3122","auld ac- -quaint- -ance"),
("G4 F4 G4 A4","3122","be for- -got and"),
("F4 F4 A4 C5","3122","nev- -er brought to"),
("D5 D5","62","mind? Should"),
("C5 A4 A4 F4","3122","auld ac- -quaint- -ance"),
("G4 F4 G4 A4 G4","31211","be for- -got _ and"),
("F4 D4 D4 C4","3122","days of auld lang"),
("F4 D5","62","syne? For"),
("C5 A4 A4 F4","3122","auld lang syne, my"),
("G4 F4 G4 D5","3122","dear, _ _ for"),
("C5 A4 A4 C5","3122","auld _ lang _"),
("D5 D5","62","syne, we'll"),
("C5 A4 A4 F4","3122","take a cup o'"),
("G4 F4 G4 A4","3122","kind- -ness yet, for"),
("F4 D4 D4 C4","3122","auld _ lang _"),
("F4","6","syne.")]
fingers={0:{0:1},1:{0:4,1:1},3:{2:2,3:4},5:{1:2,2:3,3:1},6:{0:4},7:{1:2},8:{1:5},9:{3:1},10:{3:5},13:{1:2,2:3,3:1},14:{0:4},15:{1:2}}
v=tag(score,"part",id="V")
for i,(pitches,rhythm,words) in enumerate(rows):
    m=measure(v,i)
    for j,(p,t,w) in enumerate(zip(pitches.split(),rhythm,words.split(),strict=True)):
        slur="start" if (i==0 or i in (4,8,12) and j==1) else "stop" if i in (4,8,12,16) and j==0 else ""
        note(m,p,int(t),lyric=w,finger=fingers.get(i,{}).get(j,""),slur=slur)

# Root bass, followed by the book's single note, dyad, single note figure.
voicing={"F":("F2","F3","A3 C4"),"Dm7":("D3","F3","A3 C4"),
 "Gm":("G2","G3","Bb3 D4"),"C7":("C3","E3","Bb3 C4"),
 "F7":("F2","Eb3","A3 C4"),"Bb":("Bb2","F3","Bb3 D4"),
 "Dm":("D3","F3","A3 D4"),"Gm7":("G2","F3","Bb3 D4"),
 "A7":("A2","E3","G3 C#4")}
changes=[[],["F","Dm7"],["Gm","C7"],["F","F7"],["Bb"],
 ["F","Dm"],["Gm7","C7"],["Dm","Bb","C7"],["F"],
 ["F","Dm7"],["Gm","C7"],["F","F7"],["Bb"],
 ["F","Dm"],["Gm7","A7"],["Dm","Bb","C7"],["F"]]
piano=tag(score,"part",id="P")
for i,chords in enumerate(changes):
    m=measure(piano,i,True)
    for staff in [1,2]:
        if staff==2:tag(tag(m,"backup"),"duration",8 if i else 2)
        if not i:note(m,"",2,staff);continue
        for j,name in enumerate(chords):
            bass,low,dyad=voicing[name]
            if staff==1:
                d=tag(m,"direction",placement="above");tag(tag(d,"direction-type"),"words",name);tag(d,"staff",1)
            if len(chords)==3 and j:
                note(m,low+" "+dyad if staff==1 else bass,2,staff)
            elif staff==1:
                note(m,"",1);note(m,low,1,slur="start");note(m,dyad,1);note(m,low,1,slur="stop")
            else:
                note(m,bass,2,2);note(m,"",2,2)
        if len(chords)==1:
            if staff==1:note(m,"",2);note(m,"",2)
            else:note(m,"Bb4" if chords[0]=="Bb" else "F4",2,2);note(m,"",2,2)
ET.indent(score)
ET.ElementTree(score).write(Path(__file__).resolve().parents[1]/"repertoire/Auld-Lang-Syne-F.musicxml",encoding="utf-8",xml_declaration=True)
