import re,html
for f,lbl in [('work/exp-002/raw/play-supertrust.html','GOOGLE PLAY'),('work/exp-002/raw/apple-supertrust.html','APP STORE')]:
    s=open(f,encoding='utf-8',errors='replace').read()
    txt=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s)))
    print("="*70); print(lbl)
    for kw in ['SUT','SuperSave','DeCT','payment','Downloads','10K+','100K+','50K+']:
        hits=[m.start() for m in re.finditer(re.escape(kw),txt)]
        if hits:
            seg=txt[max(0,hits[0]-230):hits[0]+300]
            print(f"\n--- [{kw}] x{len(hits)} ---\n{seg}")
