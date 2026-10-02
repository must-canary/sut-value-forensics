import json, sys, collections, datetime
sys.path.insert(0,"work")
from chain import rpc, get_logs, addr_topic, TRANSFER
POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
USDT0="0xc2132D05D31c914a87C6611C10748AEb04B58e8F"   # USDT on Polygon (6 dp)
w=json.load(open("work/window.json")); S,E=w["start"],w["end"]
B0,T0,RATE=86236778,1777593600,1.8004
def est(b): return datetime.datetime.utcfromtimestamp(T0+(b-B0)*RATE).strftime("%Y-%m-%d")
import chain
chain.SUT=USDT0   # retarget log filter to the quote asset
def dec(l): return {"b":int(l["blockNumber"],16),"f":"0x"+l["topics"][1][-40:],
                    "t":"0x"+l["topics"][2][-40:],"a":int(l["data"],16)/1e6}
for label,tp in [("BUYS  (USDT into pool)",[TRANSFER,None,addr_topic(POOL)]),
                 ("SELLS_PROCEEDS (USDT out of pool)",[TRANSFER,addr_topic(POOL),None])]:
    logs=[dec(l) for l in get_logs(S,E,tp)]
    d=collections.defaultdict(float); n=collections.Counter()
    for x in logs: d[est(x["b"])]+=x["a"]; n[est(x["b"])]+=1
    print(f"\n### {label}: {len(logs)} transfers, {sum(x['a'] for x in logs):,.0f} USDT",flush=True)
    for k in sorted(d): print(f"    {k}  {d[k]:>12,.0f} USDT ({n[k]:4d} tx)",flush=True)
    json.dump(d,open(f"work/pool_{label.split()[0]}.json","w"))
