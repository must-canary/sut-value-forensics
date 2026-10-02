"""EXP-002 baseline: weekly active addresses, EXACT block timestamps only.
Interpolated timestamps are never used for the week boundary."""
import json, urllib.request, datetime, sys

RPCS=["https://polygon.drpc.org","https://polygon-bor-rpc.publicnode.com",
      "https://polygon.blockscout.com/api/eth-rpc"]
H={"Content-Type":"application/json","User-Agent":"Mozilla/5.0 research/1.0"}
SUT="0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# published exclusion set (frozen research + Phase 1 contract checks)
POOL   = "0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
DEAD   = "0x000000000000000000000000000000000000dead"
ZERO   = "0x0000000000000000000000000000000000000000"
ROUTERS= {"0x7150ea07d00d8e5a46bcc809f1c9fdf5cb5f8e81",  # PolygonSettler
          "0xe79745e5f845d607531bc2cbd0159309d6a8e59a",
          "0x278d858f05b94576c1e6f73285886876ff6ef8d2",
          "0x641b5162306abb60f6809c1f62dbe249ae1d70bc"}
CLUSTER= {"0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c",  # SRC
          "0x7cc2f8914b4d77b68355757286f146373f4bf7ad",  # DST
          "0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85",  # HOP3
          "0x0d0707963952f2fba59dd06f2b425ace40b492fe"}  # second funder
EXCLUDED = {POOL, DEAD, ZERO} | ROUTERS | CLUSTER

def rpc(m,p,tries=3):
    body=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode()
    last=None
    for _ in range(tries):
        for u in RPCS:
            try:
                r=json.loads(urllib.request.urlopen(urllib.request.Request(u,data=body,headers=H),timeout=35).read())
                if "result" in r: return r["result"]
                last=r.get("error")
            except Exception as e: last=repr(e)[:80]
    raise RuntimeError(last)

def blk_ts(n): return int(rpc("eth_getBlockByNumber",[hex(n),False])["timestamp"],16)

def find_block_exact(target_ts, lo, hi):
    """Binary search on EXACT block timestamps. No interpolation."""
    while lo < hi:
        mid=(lo+hi)//2
        if blk_ts(mid) < target_ts: lo=mid+1
        else: hi=mid
    return lo

# last COMPLETE ISO week (UTC): Mon 2026-09-21 -> Mon 2026-09-28
WK_START, WK_END = 1789948800, 1790553600
print(f"ISO week: {datetime.datetime.utcfromtimestamp(WK_START).isoformat()}Z "
      f"-> {datetime.datetime.utcfromtimestamp(WK_END).isoformat()}Z", flush=True)

latest=int(rpc("eth_blockNumber",[]),16)
b0=find_block_exact(WK_START, 90_000_000, latest)
b1=find_block_exact(WK_END,   b0,          latest)
t0,t1=blk_ts(b0),blk_ts(b1)
print(f"boundary blocks (exact ts): {b0} (ts {t0}) -> {b1} (ts {t1})", flush=True)
print(f"  verify start: {datetime.datetime.utcfromtimestamp(t0).isoformat()}Z  drift {t0-WK_START}s", flush=True)
print(f"  verify end  : {datetime.datetime.utcfromtimestamp(t1).isoformat()}Z  drift {t1-WK_END}s", flush=True)

logs=[]; a=b0; chunk=40000
while a < b1:
    b=min(a+chunk-1, b1-1)
    try:
        logs.extend(rpc("eth_getLogs",[{"fromBlock":hex(a),"toBlock":hex(b),
                                        "address":SUT,"topics":[TRANSFER]}]))
        a=b+1
        print(f"  logs {len(logs)} ({(a-b0)*100//(b1-b0)}%)", flush=True)
    except Exception as e:
        if chunk>2500: chunk//=2; continue
        print(f"  !! skip {a}-{b}: {e}", file=sys.stderr); a=b+1

print(f"\nraw Transfer events in week: {len(logs)}", flush=True)
initiators=set(); intra=0; excluded_ev=0; total=0
for l in logs:
    frm="0x"+l["topics"][1][-40:]; to="0x"+l["topics"][2][-40:]
    total+=1
    if frm in CLUSTER and to in CLUSTER: intra+=1; continue      # intra-cluster
    if frm in EXCLUDED: excluded_ev+=1; continue                  # pool/router/dead/cluster sender
    initiators.add(frm)

print(f"  intra-cluster transfers excluded : {intra}")
print(f"  excluded-sender transfers        : {excluded_ev}")
print(f"  counted transfers                : {total-intra-excluded_ev}")
print(f"\nWEEKLY ACTIVE ADDRESSES (initiators, exclusions applied): {len(initiators)}")
json.dump({"weekStart":WK_START,"weekEnd":WK_END,"blockStart":b0,"blockEnd":b1,
           "tsStart":t0,"tsEnd":t1,"rawTransfers":len(logs),"intraCluster":intra,
           "excludedSender":excluded_ev,"activeAddresses":len(initiators)},
          open("work/exp002_week.json","w"),indent=1)
print("saved work/exp002_week.json")
