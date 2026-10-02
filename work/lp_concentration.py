"""Probe: can LP (liquidity) concentration be measured for the SUT/USDT V3 pool?"""
import json, urllib.request, collections
RPCS=["https://polygon.drpc.org","https://polygon-bor-rpc.publicnode.com","https://polygon.blockscout.com/api/eth-rpc"]
H={"Content-Type":"application/json","User-Agent":"Mozilla/5.0 research/1.0"}
POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
MINT="0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde"
def rpc(m,p):
    b=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode(); last=None
    for _ in range(2):
        for u in RPCS:
            try:
                r=json.loads(urllib.request.urlopen(urllib.request.Request(u,data=b,headers=H),timeout=30).read())
                if "result" in r: return r["result"]
                last=r.get("error")
            except Exception as e: last=repr(e)[:70]
    raise RuntimeError(last)
latest=int(rpc("eth_blockNumber",[]),16)
start=latest-200_000            # ~4 days of Polygon blocks
logs=[]; a=start
while a<=latest:
    b=min(a+40000,latest)
    logs.extend(rpc("eth_getLogs",[{"fromBlock":hex(a),"toBlock":hex(b),"address":POOL,"topics":[MINT]}])); a=b+1
print(f"Mint events in last ~200k blocks: {len(logs)}")
owners=collections.Counter()
for l in logs: owners["0x"+l["topics"][1][-40:]]+=1
print(f"distinct Mint 'owner' values: {len(owners)}")
for o,c in owners.most_common(6):
    info=rpc("eth_getCode",[o,"latest"])
    print(f"  {o}  mints={c}  isContract={len(info)>2}")
