import json,urllib.request,urllib.error,time,collections
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
EP="https://api.msq.market/super-save/public/dect-transaction-details/"
RPCS=["https://polygon-bor-rpc.publicnode.com","https://polygon.drpc.org","https://polygon-rpc.com"]
TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
USDT="0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
SRC="0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c"
def rpc(m,p,r=6):
    for i in range(r):
        try:
            q=urllib.request.Request(RPCS[i%3],data=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode(),headers={"content-type":"application/json","User-Agent":UA})
            o=json.loads(urllib.request.urlopen(q,timeout=60).read())
            if "error" in o: raise RuntimeError(o["error"])
            return o["result"]
        except Exception:
            if i==r-1: raise
            time.sleep(1.5*(i+1))
meta=json.load(open('work/exp-002/onchain-transfers.json'))['meta']
lo,hi=meta['fromBlock'],meta['toBlock']; pad="0x"+"0"*24+SRC[2:]
got=[]
b=lo
while b<=hi:
    e=min(b+4999,hi)
    got+=rpc("eth_getLogs",[{"fromBlock":hex(b),"toBlock":hex(e),"address":USDT,"topics":[TRANSFER,None,pad]}])
    got+=rpc("eth_getLogs",[{"fromBlock":hex(b),"toBlock":hex(e),"address":USDT,"topics":[TRANSFER,pad]}])
    b=e+1; time.sleep(0.2)
txs=sorted({l["transactionHash"] for l in got})
print(f"USDT transactions involving SRC in window: {len(txs)}")
res=[]
for tx in txs:
    code=None;body=None
    for a in range(5):
        try:
            r=urllib.request.Request(EP+tx,headers={"User-Agent":UA})
            body=json.loads(urllib.request.urlopen(r,timeout=30).read().decode()); code=200; break
        except urllib.error.HTTPError as e:
            code=e.code
            try: body=json.loads(e.read().decode())
            except Exception: body=None
            if code!=429: break
            time.sleep(6*(a+1))
    res.append({"tx":tx,"http":code,"body":body}); time.sleep(1.5)
c=collections.Counter(r['http'] for r in res)
print("DeCT lookup on SRC-related USDT transactions:",dict(c))
hits=[r for r in res if r['http']==200]
print("MATCHED:",len(hits))
for h in hits[:5]: print(json.dumps(h,ensure_ascii=False)[:500])
json.dump({"endpoint":EP,"purpose":"instrument sensitivity check — can the public DeCT endpoint return a positive for any observed on-chain transaction?",
 "assetTested":"USDT (0xc2132d05...) transactions involving "+SRC,"window":{"fromBlock":lo,"toBlock":hi},
 "txTested":len(txs),"httpCounts":dict(c),"matched":len(hits),"results":res,
 "retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},open('work/exp-002/instrument-check.json','w'),indent=1)
