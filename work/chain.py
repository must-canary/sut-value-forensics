import json, urllib.request, time, sys

RPCS = ["https://polygon.drpc.org",
        "https://polygon-bor-rpc.publicnode.com",
        "https://polygon.blockscout.com/api/eth-rpc"]
SUT = "0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

def rpc(method, params, tries=3):
    body = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode()
    last = None
    for t in range(tries):
        for u in RPCS:
            try:
                req = urllib.request.Request(u, data=body, headers={"Content-Type":"application/json","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) research/1.0","Accept":"application/json"})
                r = json.loads(urllib.request.urlopen(req, timeout=40).read())
                if "result" in r: return r["result"]
                last = r.get("error")
            except Exception as e:
                last = str(e)
        time.sleep(1.5)
    raise RuntimeError(f"{method} failed: {last}")

def blk_ts(n):
    b = rpc("eth_getBlockByNumber", [hex(n), False])
    return int(b["timestamp"], 16)

def find_block(target_ts, lo, hi):
    while lo < hi:
        mid = (lo + hi)//2
        if blk_ts(mid) < target_ts: lo = mid+1
        else: hi = mid
    return lo

def get_logs(frm, to, topics, chunk=40000):
    out = []
    a = frm
    while a <= to:
        b = min(a+chunk-1, to)
        try:
            res = rpc("eth_getLogs", [{"fromBlock":hex(a),"toBlock":hex(b),
                                       "address":SUT,"topics":topics}])
            out.extend(res); a = b+1
        except Exception as e:
            if chunk > 2500:
                chunk //= 2; continue
            print(f"  !! skip {a}-{b}: {e}", file=sys.stderr); a = b+1
    return out

def addr_topic(a): return "0x" + "0"*24 + a.lower().replace("0x","")

if __name__ == "__main__":
    latest = int(rpc("eth_blockNumber", []), 16)
    print("latest block:", latest)
    b_start = find_block(1777593600, 60000000, latest)   # 2026-05-01T00:00Z
    b_end   = find_block(1779753600, 60000000, latest)   # 2026-05-26T00:00Z
    print("2026-05-01 block:", b_start, "ts", blk_ts(b_start))
    print("2026-05-26 block:", b_end,   "ts", blk_ts(b_end))
    json.dump({"start":b_start,"end":b_end,"latest":latest}, open("work/window.json","w"))
