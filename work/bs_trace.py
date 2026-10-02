import json, urllib.request, time, sys
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) research/1.0","Accept":"application/json"}
SUT="0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55"
def get(url):
    for _ in range(4):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=45).read())
        except Exception as e:
            err=e; time.sleep(2)
    raise RuntimeError(f"{url} -> {err}")

def transfers(addr, token=SUT, stop_before="2026-04-20", max_pages=60):
    base=f"https://polygon.blockscout.com/api/v2/addresses/{addr}/token-transfers?type=ERC-20&token={token}"
    url=base; out=[]; p=0
    while url and p<max_pages:
        d=get(url); p+=1
        for it in d.get("items",[]):
            ts=it.get("timestamp","")
            out.append({"ts":ts,"tx":it.get("transaction_hash"),
                        "from":(it.get("from") or {}).get("hash"),
                        "to":(it.get("to") or {}).get("hash"),
                        "amt":int(it.get("total",{}).get("value","0"))/1e18})
        np=d.get("next_page_params")
        if not np: break
        if out and out[-1]["ts"][:10] < stop_before: break
        url=base+"&"+"&".join(f"{k}={v}" for k,v in np.items() if v is not None)
        time.sleep(0.35)
    return out

if __name__=="__main__":
    for label,addr in [("DST","0x7CC2F8914b4D77b68355757286f146373F4BF7ad"),
                       ("SRC","0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c")]:
        t=transfers(addr)
        json.dump(t,open(f"work/{label}_sut_transfers.json","w"),indent=1)
        print(f"### {label} {addr}: {len(t)} SUT transfers pulled (newest first), oldest={t[-1]['ts'][:10] if t else '-'}",flush=True)
