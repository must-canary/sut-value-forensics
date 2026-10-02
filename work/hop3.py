import json, sys, collections, datetime
sys.path.insert(0,"work")
from chain import rpc, get_logs, addr_topic, TRANSFER
H3="0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85"
w=json.load(open("work/window.json")); S,E=w["start"],w["end"]
B0,T0,B1,T1 = 86236778,1777593600,87436510,1779753601
RATE=(T1-T0)/(B1-B0)
def est(b): return datetime.datetime.utcfromtimestamp(T0+(b-B0)*RATE)
def dec(l): return {"b":int(l["blockNumber"],16),"tx":l["transactionHash"],
    "f":"0x"+l["topics"][1][-40:],"t":"0x"+l["topics"][2][-40:],"a":int(l["data"],16)/1e18}
for k,tp in [("IN",[TRANSFER,None,addr_topic(H3)]),("OUT",[TRANSFER,addr_topic(H3),None])]:
    logs=[dec(l) for l in get_logs(S,E,tp)]; logs.sort(key=lambda x:x["b"])
    tot=sum(x["a"] for x in logs)
    print(f"\n### HOP3 {k}: {len(logs)} transfers, {tot:,.0f} SUT (May 1-25)",flush=True)
    c=collections.Counter(); n=collections.Counter()
    key = "f" if k=="IN" else "t"
    for x in logs: c[x[key].lower()]+=x["a"]; n[x[key].lower()]+=1
    print(f"  top counterparties ({'senders' if k=='IN' else 'recipients'}):",flush=True)
    for a,v in c.most_common(10): print(f"    {v:>14,.0f} SUT ({n[a]:4d} tx)  {a}",flush=True)
    d=collections.defaultdict(float); dn=collections.Counter()
    for x in logs: d[est(x["b"]).strftime("%Y-%m-%d")]+=x["a"]; dn[est(x["b"]).strftime("%Y-%m-%d")]+=1
    print("  daily:",flush=True)
    for day in sorted(d): print(f"    {day}  {d[day]:>13,.0f} SUT  ({dn[day]} tx)",flush=True)
    json.dump(logs,open(f"work/HOP3_{k}_may.json","w"))
