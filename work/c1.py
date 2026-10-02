import json, sys, collections, datetime
sys.path.insert(0,"work")
import chain
from chain import rpc, get_logs, TRANSFER

POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
SUT ="0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
SWAP="0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
MINT="0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde"
BURN="0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c"
COLL="0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0"

# --- confirm token ordering from the pool itself (no assumption) ---
def call(sig):
    return rpc("eth_call",[{"to":POOL,"data":sig},"latest"])
t0="0x"+call("0x0dfe1681")[-40:]   # token0()
t1="0x"+call("0xd21220a7")[-40:]   # token1()
fee=int(call("0xddca3f43"),16)     # fee()
print(f"pool token0={t0}\npool token1={t1}\nfee={fee} ({fee/10000:.2f}%)")
SUT_IS_0 = (t0.lower()==SUT.lower())
print(f"SUT is token{'0' if SUT_IS_0 else '1'}  -> quote is token{'1' if SUT_IS_0 else '0'}")
QDEC = 6 if True else 18

w=json.load(open("work/window.json")); S,E=w["start"],w["end"]
B0,T0,RATE=86236778,1777593600,1.8004
def day(b): return datetime.datetime.utcfromtimestamp(T0+(b-B0)*RATE).strftime("%Y-%m-%d")
def words(d):
    d=d[2:] if d.startswith("0x") else d
    return [d[i:i+64] for i in range(0,len(d),64)]
def i256(h):
    v=int(h,16)
    return v-(1<<256) if v>=(1<<255) else v

chain.SUT=POOL   # filter logs by pool address

res={}
for name,topic in [("SWAP",SWAP),("MINT",MINT),("BURN",BURN),("COLLECT",COLL)]:
    logs=get_logs(S,E,[topic])
    res[name]=logs
    print(f"{name}: {len(logs)} events",flush=True)

# ---- SWAPS ----
sw=collections.defaultdict(lambda:{"buy":0.0,"sell":0.0,"nbuy":0,"nsell":0,
                                   "sut_in":0.0,"sut_out":0.0,"recips":set(),"senders":set()})
for l in res["SWAP"]:
    W=words(l["data"]); b=int(l["blockNumber"],16); d=day(b)
    a0,a1=i256(W[0]),i256(W[1])
    sut_amt = a0 if SUT_IS_0 else a1
    qte_amt = a1 if SUT_IS_0 else a0
    q=abs(qte_amt)/10**QDEC
    r=sw[d]
    r["senders"].add("0x"+l["topics"][1][-40:]); r["recips"].add("0x"+l["topics"][2][-40:])
    if sut_amt < 0:   # pool sends SUT out -> trader BOUGHT
        r["buy"]+=q; r["nbuy"]+=1; r["sut_out"]+=abs(sut_amt)/1e18
    else:             # pool receives SUT -> trader SOLD
        r["sell"]+=q; r["nsell"]+=1; r["sut_in"]+=sut_amt/1e18

# ---- LIQUIDITY ----
liq=collections.defaultdict(lambda:{"mint_q":0.0,"mint_sut":0.0,"nmint":0,
                                    "burn_q":0.0,"burn_sut":0.0,"nburn":0,
                                    "coll_q":0.0,"coll_sut":0.0,"ncoll":0})
for name,off in [("MINT",2),("BURN",1),("COLLECT",0)]:
    for l in res[name]:
        W=words(l["data"]); d=day(int(l["blockNumber"],16))
        if name=="MINT":   a0,a1=int(W[2],16),int(W[3],16)
        elif name=="BURN": a0,a1=int(W[1],16),int(W[2],16)
        else:              a0,a1=int(W[0],16),int(W[1],16)
        s=(a0 if SUT_IS_0 else a1)/1e18
        q=(a1 if SUT_IS_0 else a0)/10**QDEC
        k={"MINT":"mint","BURN":"burn","COLLECT":"coll"}[name]
        liq[d][k+"_sut"]+=s; liq[d][k+"_q"]+=q; liq[d]["n"+k]+=1

print("\n"+"="*116)
print(f"{'date':11s}|{'SWAP VOL USDT':>14s}{'buy':>12s}{'sell':>12s}|{'#swaps':>7s}{'#buy':>6s}{'#sell':>6s}|{'recips':>7s}|{'LP ADD usdt':>12s}{'LP REM usdt':>12s}")
print("-"*116)
alld=sorted(set(list(sw)+list(liq)))
for d in alld:
    r=sw.get(d,{"buy":0,"sell":0,"nbuy":0,"nsell":0,"recips":set()}); L=liq.get(d,{})
    tot=r["buy"]+r["sell"]; n=r["nbuy"]+r["nsell"]
    print(f"{d:11s}|{tot:14,.0f}{r['buy']:12,.0f}{r['sell']:12,.0f}|{n:7d}{r['nbuy']:6d}{r['nsell']:6d}|{len(r['recips']):7d}|"
          f"{L.get('mint_q',0):12,.0f}{L.get('burn_q',0):12,.0f}")
json.dump({"swaps":{d:{k:(len(v) if isinstance(v,set) else v) for k,v in r.items()} for d,r in sw.items()},
           "liq":dict(liq)},open("work/c1_result.json","w"),indent=1,default=str)
print("\nTOTALS May1-25: swap volume USDT = %.0f | LP added = %.0f | LP removed = %.0f | collected = %.0f" %
      (sum(r['buy']+r['sell'] for r in sw.values()),
       sum(v.get('mint_q',0) for v in liq.values()),
       sum(v.get('burn_q',0) for v in liq.values()),
       sum(v.get('coll_q',0) for v in liq.values())))
