import re,html,sys,os
def text(p):
    s=open(p,encoding='utf-8',errors='replace').read()
    s=re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>',' ',s)
    t=html.unescape(re.sub(r'(?s)<[^>]+>','\n',s))
    out=[]
    for l in (x.strip() for x in t.split('\n')):
        if l and len(l)>1 and (not out or l!=out[-1]): out.append(l)
    return '\n'.join(out)
for p in sys.argv[1:]:
    o=os.path.splitext(p)[0]+'.txt'
    open(o,'w',encoding='utf-8').write(text(p))
    print(o, len(open(o,encoding='utf-8').read()))
