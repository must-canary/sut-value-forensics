import json,urllib.request,time,collections,sys
RPCS=["https://polygon-bor-rpc.publicnode.com","https://polygon.drpc.org","https://polygon-rpc.com"]
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
USDT="0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
SRC="0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c"
def rpc(m,p,retries=6):
    for i in range(retries):
        try:
            r=urllib.request.Request(RPCS[i%3],data=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode(),headers={"content-type":"application/json","User-Agent":UA})
            o=json.loads(urllib.request.urlopen(r,timeout=60).read())
            if "error" in o: raise RuntimeError(o["error"])
            return o["result"]
        except Exception:
            if i==retries-1: raise
            time.sleep(1.5*(i+1))
d=json.load(open('work/exp-002/onchain-transfers.json')); meta=d['meta']
lo,hi=meta['fromBlock'],meta['toBlock']
pad="0x"+"0"*24+SRC[2:]
def logs(addr,topics):
    out=[]; b=lo; step=5000
    while b<=hi:
        e=min(b+step-1,hi)
        out+=rpc("eth_getLogs",[{"fromBlock":hex(b),"toBlock":hex(e),"address":addr,"topics":topics}])
        b=e+1; time.sleep(0.25)
    return out
def A(t): return "0x"+t[-40:]
usdt_out=logs(USDT,[TRANSFER,pad]); usdt_in=logs(USDT,[TRANSFER,None,pad])
uo=[{"tx":l["transactionHash"],"to":A(l["topics"][2]),"v":int(l["data"],16)/10**6,"blk":int(l["blockNumber"],16)} for l in usdt_out]
ui=[{"tx":l["transactionHash"],"from":A(l["topics"][1]),"v":int(l["data"],16)/10**6,"blk":int(l["blockNumber"],16)} for l in usdt_in]
sut_senders=collections.Counter(); sut_amt=collections.defaultdict(float)
for r in d['transfers']:
    if r['to']==SRC: sut_senders[r['from']]+=1; sut_amt[r['from']]+=r['value']
print(f"WINDOW {lo}-{hi}  ({meta['fromBlockTime']} -> {meta['toBlockTime']})")
print(f"SRC {SRC}")
print(f"  SUT IN : {sum(sut_senders.values())} legs from {len(sut_senders)} distinct senders, {sum(sut_amt.values()):,.2f} SUT")
print(f"  SUT OUT: 0 legs")
print(f"  USDT OUT: {len(uo)} legs to {len({x['to'] for x in uo})} distinct, {sum(x['v'] for x in uo):,.2f} USDT")
print(f"  USDT IN : {len(ui)} legs from {len({x['from'] for x in ui})} distinct, {sum(x['v'] for x in ui):,.2f} USDT")
paid=collections.Counter(x['to'] for x in uo)
overlap=set(sut_senders)&set(paid)
print(f"\n  ADDRESSES THAT SENT SUT *AND* RECEIVED USDT FROM SRC: {len(overlap)} of {len(sut_senders)} SUT senders")
amt=sorted(sut_amt.values())
print(f"\n  SUT-per-sender: min={amt[0]:,.2f} median={amt[len(amt)//2]:,.2f} max={amt[-1]:,.2f}")
dist=collections.Counter()
for v in sut_amt.values():
    dist["<10" if v<10 else "10-99" if v<100 else "100-999" if v<1000 else "1000-9999" if v<10000 else ">=10000"]+=1
print("  sender size buckets:",dict(dist))
json.dump({"address":SRC,"window":{"fromBlock":lo,"toBlock":hi,"fromBlockTime":meta['fromBlockTime'],"toBlockTime":meta['toBlockTime']},
 "sutInLegs":sum(sut_senders.values()),"sutInDistinctSenders":len(sut_senders),"sutInTotal":sum(sut_amt.values()),"sutOutLegs":0,
 "usdtOutLegs":len(uo),"usdtOutTotal":sum(x['v'] for x in uo),"usdtOutDistinct":len({x['to'] for x in uo}),
 "usdtInLegs":len(ui),"usdtInTotal":sum(x['v'] for x in ui),
 "sutSenderAlsoPaidUsdtBySrc":len(overlap),"senderBuckets":dict(dist),
 "retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},open('work/exp-002/src-flow.json','w'),indent=1)
