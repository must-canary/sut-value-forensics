import json,urllib.request,urllib.error,time,sys,collections
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
EP="https://api.msq.market/super-save/public/dect-transaction-details/"
d=json.load(open('work/exp-002/dect-linkage.json'))
res={r['tx']:r for r in d['results']}
todo=[tx for tx,r in res.items() if r['http'] not in (200,404,400)]
print("retrying:",len(todo),file=sys.stderr)
def q(tx):
    try:
        req=urllib.request.Request(EP+tx,headers={"User-Agent":UA})
        return 200,json.loads(urllib.request.urlopen(req,timeout=30).read().decode())
    except urllib.error.HTTPError as e:
        try: b=json.loads(e.read().decode())
        except Exception: b=None
        return e.code,b
for i,tx in enumerate(todo):
    for attempt in range(6):
        code,body=q(tx)
        if code!=429: break
        time.sleep(6*(attempt+1))
    res[tx]={"tx":tx,"http":code,"body":body}
    if (i+1)%20==0: print(f"  {i+1}/{len(todo)}",file=sys.stderr)
    time.sleep(2.0)
d['results']=list(res.values()); d['retriedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
json.dump(d,open('work/exp-002/dect-linkage.json','w'),indent=1)
c=collections.Counter(r['http'] for r in d['results'])
print("\n=== FINAL DeCT LINKAGE ===")
print("tx tested:",len(d['results']))
for k,v in sorted(c.items(),key=lambda x:(x[0] is None,x[0])): print(f"  HTTP {k}: {v}")
print("MATCHED(200):",sum(1 for r in d['results'] if r['http']==200))
