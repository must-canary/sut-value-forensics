import json, sys, collections
sys.path.insert(0,"work")
from chain import rpc, get_logs, addr_topic, TRANSFER
POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
w=json.load(open("work/window.json")); S,E=w["start"],w["end"]
B0,T0=86236778,1777593600; RATE=1.8004
import datetime
def est(b): return datetime.datetime.utcfromtimestamp(T0+(b-B0)*RATE).strftime("%Y-%m-%d")
CL={"0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c":"SRC",
    "0x7cc2f8914b4d77b68355757286f146373f4bf7ad":"DST",
    "0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85":"HOP3",
    "0x0d0707963952f2fba59dd06f2b425ace40b492fe":"FUNDER2"}
def dec(l): return {"b":int(l["blockNumber"],16),"f":"0x"+l["topics"][1][-40:],
                    "t":"0x"+l["topics"][2][-40:],"a":int(l["data"],16)/1e18}
logs=[dec(l) for l in get_logs(S,E,[TRANSFER,None,addr_topic(POOL)])]
print(f"### SUT SENT INTO MAIN POOL (sells), May 1-25: {len(logs)} transfers, {sum(x['a'] for x in logs):,.0f} SUT",flush=True)
d=collections.defaultdict(float); dn=collections.Counter(); sellers=collections.Counter()
for x in logs:
    day=est(x["b"]); d[day]+=x["a"]; dn[day]+=1; sellers[x["f"].lower()]+=x["a"]
print("\n  daily SUT sold into pool:",flush=True)
for k in sorted(d): print(f"    {k}  {d[k]:>12,.0f} SUT  ({dn[k]:4d} tx)",flush=True)
print(f"\n  distinct selling addresses: {len(sellers)}",flush=True)
print("  top 15 sellers:",flush=True)
for a,v in sellers.most_common(15):
    print(f"    {v:>12,.0f} SUT  {a} {'  <== '+CL[a] if a in CL else ''}",flush=True)
tot=sum(sellers.values()); cl=sum(v for a,v in sellers.items() if a in CL)
print(f"\n  CLUSTER-ATTRIBUTED SELLS: {cl:,.0f} SUT ({cl/tot*100:.2f}% of all pool inflow)",flush=True)
json.dump({a:v for a,v in sellers.items()},open("work/pool_sellers_may.json","w"))
