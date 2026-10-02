import json, sys, collections, datetime, urllib.request, time
RPCS=["https://polygon.drpc.org","https://polygon-bor-rpc.publicnode.com",
      "https://polygon.blockscout.com/api/eth-rpc"]
H={"Content-Type":"application/json","User-Agent":"Mozilla/5.0 research/1.0","Accept":"application/json"}
def rpc(m,p,timeout=25):
    body=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode()
    last=None
    for rnd in range(2):
        for u in RPCS:
            try:
                r=json.loads(urllib.request.urlopen(urllib.request.Request(u,data=body,headers=H),timeout=timeout).read())
                if "result" in r: return r["result"]
                last=r.get("error")
            except Exception as e: last=repr(e)[:90]
    raise RuntimeError(last)

POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
SUT ="0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
TOP={"SWAP":"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
     "MINT":"0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde",
     "BURN":"0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c",
     "COLLECT":"0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0"}
t0="0x"+rpc("eth_call",[{"to":POOL,"data":"0x0dfe1681"},"latest"])[-40:]
t1="0x"+rpc("eth_call",[{"to":POOL,"data":"0xd21220a7"},"latest"])[-40:]
fee=int(rpc("eth_call",[{"to":POOL,"data":"0xddca3f43"},"latest"]),16)
SUT_IS_0=(t0.lower()==SUT.lower())
print(f"token0={t0}\ntoken1={t1}\nfee={fee} ({fee/10000:.2f}%)\nSUT is token{'0' if SUT_IS_0 else '1'}",flush=True)
QDEC=6

B0,T0,RATE=86236778,1777593600,1.8004
S=B0+int(12*86400/RATE); E=B0+int(22*86400/RATE)   # 2026-05-13 -> 2026-05-23
print(f"blocks {S}..{E}",flush=True)
def day(b): return datetime.datetime.utcfromtimestamp(T0+(b-B0)*RATE).strftime("%Y-%m-%d")
def wds(d):
    d=d[2:] if d.startswith("0x") else d
    return [d[i:i+64] for i in range(0,len(d),64)]
def i256(h):
    v=int(h,16); return v-(1<<256) if v>=(1<<255) else v

def fetch(topic,label):
    out=[];a=S;ch=25000
    while a<=E:
        b=min(a+ch-1,E)
        try:
            out.extend(rpc("eth_getLogs",[{"fromBlock":hex(a),"toBlock":hex(b),"address":POOL,"topics":[topic]}]))
            a=b+1
            print(f"  {label} {(a-S)*100//(E-S)}% ({len(out)})",flush=True)
        except Exception as e:
            if ch>3000: ch//=2; continue
            print(f"  !! {label} skip {a}-{b}: {e}",flush=True); a=b+1
    return out

sw=collections.defaultdict(lambda:{"buy":0.0,"sell":0.0,"nbuy":0,"nsell":0,"sut_in":0.0,"sut_out":0.0,"r":set(),"s":set()})
liq=collections.defaultdict(lambda:collections.defaultdict(float))
for name,tp in TOP.items():
    logs=fetch(tp,name); print(f"{name}: {len(logs)} events",flush=True)
    for l in logs:
        W=wds(l["data"]); d=day(int(l["blockNumber"],16))
        if name=="SWAP":
            a0,a1=i256(W[0]),i256(W[1])
            sut=a0 if SUT_IS_0 else a1; q=abs(a1 if SUT_IS_0 else a0)/10**QDEC
            r=sw[d]; r["s"].add("0x"+l["topics"][1][-40:]); r["r"].add("0x"+l["topics"][2][-40:])
            if sut<0: r["buy"]+=q; r["nbuy"]+=1; r["sut_out"]+=abs(sut)/1e18
            else:     r["sell"]+=q; r["nsell"]+=1; r["sut_in"]+=sut/1e18
        else:
            if name=="MINT":   a0,a1=int(W[2],16),int(W[3],16)
            elif name=="BURN": a0,a1=int(W[1],16),int(W[2],16)
            else:              a0,a1=int(W[0],16),int(W[1],16)
            k=name.lower()
            liq[d][k+"_sut"]+=(a0 if SUT_IS_0 else a1)/1e18
            liq[d][k+"_q"]+=(a1 if SUT_IS_0 else a0)/10**QDEC
            liq[d]["n_"+k]+=1

print("\n"+"="*124,flush=True)
print(f"{'date':11s}|{'SWAPVOL$':>11s}{'buy$':>11s}{'sell$':>11s}|{'#sw':>6s}{'#buy':>6s}{'#sell':>6s}{'recip':>6s}|{'SUTsold':>12s}{'SUTbought':>12s}|{'LPadd$':>9s}{'LPrem$':>9s}{'#mint':>6s}{'#burn':>6s}")
print("-"*124)
for d in sorted(set(list(sw)+list(liq))):
    r=sw.get(d); L=liq.get(d,{})
    if r is None: r={"buy":0,"sell":0,"nbuy":0,"nsell":0,"sut_in":0,"sut_out":0,"r":set()}
    print(f"{d:11s}|{r['buy']+r['sell']:11,.0f}{r['buy']:11,.0f}{r['sell']:11,.0f}|{r['nbuy']+r['nsell']:6d}{r['nbuy']:6d}{r['nsell']:6d}{len(r['r']):6d}|"
          f"{r['sut_in']:12,.0f}{r['sut_out']:12,.0f}|{L.get('mint_q',0):9,.0f}{L.get('burn_q',0):9,.0f}{int(L.get('n_mint',0)):6d}{int(L.get('n_burn',0)):6d}")
json.dump({"swaps":{d:{k:(len(v) if isinstance(v,set) else v) for k,v in r.items()} for d,r in sw.items()},
           "liq":{d:dict(v) for d,v in liq.items()}},open("work/c1_result.json","w"),indent=1)
print("\nDONE",flush=True)
