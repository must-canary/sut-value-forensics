import json,urllib.request,time,sys,collections
RPCS=["https://polygon-bor-rpc.publicnode.com","https://polygon.drpc.org","https://polygon-rpc.com"]
RPC=RPCS[0]
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
SUT="0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
def rpc(method,params,retries=6):
    global RPC
    for i in range(retries):
        try:
            RPC=RPCS[i%len(RPCS)]
            req=urllib.request.Request(RPC,data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),headers={"content-type":"application/json","User-Agent":UA})
            r=json.loads(urllib.request.urlopen(req,timeout=60).read())
            if "error" in r: raise RuntimeError(r["error"])
            return r["result"]
        except Exception as e:
            if i==retries-1: raise
            time.sleep(1.5*(i+1))
latest=int(rpc("eth_blockNumber",[]),16)
WINDOW=40000
start=latest-WINDOW+1
logs=[]
step=5000
b=start
while b<=latest:
    e=min(b+step-1,latest)
    got=rpc("eth_getLogs",[{"fromBlock":hex(b),"toBlock":hex(e),"address":SUT,"topics":[TRANSFER]}])
    logs.extend(got); b=e+1; time.sleep(0.3)
    print(f"  blocks {b-step}-{e}: {len(got)} (total {len(logs)})",file=sys.stderr)
def addr(t): return "0x"+t[-40:]
rows=[]
for l in logs:
    rows.append({"tx":l["transactionHash"],"block":int(l["blockNumber"],16),
                 "from":addr(l["topics"][1]),"to":addr(l["topics"][2]),
                 "value":int(l["data"],16)/10**18,"logIndex":int(l["logIndex"],16)})
blk_first=rpc("eth_getBlockByNumber",[hex(start),False]); blk_last=rpc("eth_getBlockByNumber",[hex(latest),False])
meta={"rpcPool":RPCS,"contract":SUT,"fromBlock":start,"toBlock":latest,
      "fromBlockTime":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(int(blk_first["timestamp"],16))),
      "toBlockTime":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(int(blk_last["timestamp"],16))),
      "transferLogs":len(rows),"distinctTx":len({r['tx'] for r in rows}),
      "distinctFrom":len({r['from'] for r in rows}),"distinctTo":len({r['to'] for r in rows}),
      "retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
json.dump({"meta":meta,"transfers":rows},open('work/exp-002/onchain-transfers.json','w'),indent=1)
print(json.dumps(meta,indent=2))
cs=collections.Counter(); 
for r in rows: cs[r["from"]]+=1; cs[r["to"]]+=1
print("\n=== TOP 20 ADDRESSES BY TRANSFER COUNT ===")
for a,c in cs.most_common(20): print(f"{a}  {c}")
