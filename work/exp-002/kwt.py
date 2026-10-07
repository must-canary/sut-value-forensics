import json,re,html
d=json.load(open('work/exp-002/raw/notices-full.json',encoding='utf-8'))
def clean(x): return html.unescape(re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',x))).strip()
for n in d:
    body=clean(n['content']['rendered']); ti=clean(n['title']['rendered'])
    if 'KWT' in body or 'KWT' in ti:
        print("="*70); print(n['id'],n['date_gmt'],ti); print(body[:900]); print()
