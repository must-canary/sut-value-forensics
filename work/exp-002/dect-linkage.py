import json,urllib.request,urllib.error,time,sys,collections
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
EP="https://api.msq.market/super-save/public/dect-transaction-details/"
d=json.load(open('work/exp-002/onchain-transfers.json'))
meta=d['meta']; tr=d['transfers']
# one row per distinct tx (keep all transfer legs per tx for context)
bytx=collections.OrderedDict()
for r in tr: bytx.setdefault(r['tx'],[]).append(r)
txs=list(bytx.keys())
print(f"distinct tx to test: {len(txs)}",file=sys.stderr)
res=[]
for i,tx in enumerate(txs):
    try:
        req=urllib.request.Request(EP+tx,headers={"User-Agent":UA})
        body=urllib.request.urlopen(req,timeout=30).read().decode()
        res.append({"tx":tx,"http":200,"body":json.loads(body)})
    except urllib.error.HTTPError as e:
        try: b=json.loads(e.read().decode())
        except Exception: b=None
        res.append({"tx":tx,"http":e.code,"body":b})
    except Exception as e:
        res.append({"tx":tx,"http":None,"error":str(e)})
    if (i+1)%50==0: print(f"  {i+1}/{len(txs)}",file=sys.stderr)
    time.sleep(0.25)
out={"endpoint":EP,"retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
     "onchainWindow":{k:meta[k] for k in ('fromBlock','toBlock','fromBlockTime','toBlockTime','contract')},
     "txTested":len(txs),"results":res}
json.dump(out,open('work/exp-002/dect-linkage.json','w'),indent=1)
c=collections.Counter(r['http'] for r in res)
print("\n=== DeCT LINKAGE RESULT ===")
print("tx tested:",len(txs))
for k,v in sorted(c.items(),key=lambda x:(x[0] is None,x[0])): print(f"  HTTP {k}: {v}")
hits=[r for r in res if r['http']==200]
print("MATCHED (200):",len(hits))
for h in hits[:10]: print(json.dumps(h,indent=1)[:600])
