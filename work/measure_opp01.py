"""OPP-01 baseline measurement: price impact at standardised sizes.
Reads live Uniswap V3 pool state; computes impact with V3 single-range math."""
import json, urllib.request, datetime

RPCS=["https://polygon.drpc.org","https://polygon-bor-rpc.publicnode.com",
      "https://polygon.blockscout.com/api/eth-rpc"]
H={"Content-Type":"application/json","User-Agent":"Mozilla/5.0 research/1.0"}
POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
SUT ="0x98965474ecbec2f532f1f780ee37b0b05f77ca55"
USDT="0xc2132d05d31c914a87c6611c10748aeb04b58e8f"

def rpc(m,p):
    body=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode()
    last=None
    for _ in range(2):
        for u in RPCS:
            try:
                r=json.loads(urllib.request.urlopen(urllib.request.Request(u,data=body,headers=H),timeout=30).read())
                if "result" in r: return r["result"]
                last=r.get("error")
            except Exception as e: last=repr(e)[:80]
    raise RuntimeError(last)

def call(to,data): return rpc("eth_call",[{"to":to,"data":data},"latest"])
def bal(token,who): return int(call(token,"0x70a08231"+"0"*24+who[2:]),16)

blk = int(rpc("eth_blockNumber",[]),16)
ts  = int(rpc("eth_getBlockByNumber",[hex(blk),False])["timestamp"],16)
slot0 = call(POOL,"0x3850c7bd")           # slot0()
L     = int(call(POOL,"0x1a686502"),16)   # liquidity()
sqrtP = int(slot0[2:66],16)
tick  = int(slot0[66:130],16); tick = tick-(1<<256) if tick>=(1<<255) else tick

Q96 = 2**96
D0, D1 = 18, 6                      # token0 = SUT(18), token1 = USDT(6)
raw_price = (sqrtP/Q96)**2          # token1_raw per token0_raw
price = raw_price * 10**(D0-D1)     # USDT per SUT (human)

r_sut  = bal(SUT, POOL)/10**D0
r_usdt = bal(USDT,POOL)/10**D1

print(f"block={blk}  utc={datetime.datetime.utcfromtimestamp(ts).isoformat()}Z")
print(f"sqrtPriceX96={sqrtP}  tick={tick}  activeLiquidity={L}")
print(f"spot price      = ${price:.6f} per SUT")
print(f"pool balances   = {r_sut:,.2f} SUT / {r_usdt:,.2f} USDT   (TVL approx ${r_sut*price + r_usdt:,.0f})")

def impact_buy(usd):
    """USDT in -> price rises. sqrtP' = sqrtP + dy/L  (raw units)"""
    dy = usd*10**D1
    sp2 = sqrtP + (dy*Q96)//L
    p2 = (sp2/Q96)**2 * 10**(D0-D1)
    return (p2/price - 1)*100, p2

def impact_sell(usd):
    """SUT in -> price falls. 1/sqrtP' = 1/sqrtP + dx/L (raw units)"""
    dx = (usd/price)*10**D0
    inv = Q96/sqrtP + dx/L
    sp2 = Q96/inv
    p2 = (sp2/Q96)**2 * 10**(D0-D1)
    return (p2/price - 1)*100, p2

print("\nPRICE IMPACT (V3 single active range; excludes tick crossing):")
out={}
for usd in (10_000, 50_000, 100_000):
    b,_ = impact_buy(usd); s,_ = impact_sell(usd)
    out[usd]={"buy_pct":b,"sell_pct":s}
    print(f"  ${usd:>7,}  buy {b:+8.2f}%   sell {s:+8.2f}%")

# depth to move price +/-2%
def depth_for(target_pct, side):
    lo,hi=0.0,50_000_000.0
    for _ in range(60):
        mid=(lo+hi)/2
        pct = impact_buy(mid)[0] if side=="buy" else impact_sell(mid)[0]
        if abs(pct) < abs(target_pct): lo=mid
        else: hi=mid
    return (lo+hi)/2

d_up = depth_for(2.0,"buy"); d_dn = depth_for(2.0,"sell")
print(f"\nDEPTH within +/-2% of spot:  +${d_up:,.0f}  /  -${d_dn:,.0f}")
print(f"FEE TIER (round-trip cost)  : 1.00% per side")

json.dump({"block":blk,"utc":datetime.datetime.utcfromtimestamp(ts).isoformat()+"Z",
           "sqrtPriceX96":str(sqrtP),"tick":tick,"activeLiquidity":str(L),
           "price":price,"reserveSut":r_sut,"reserveUsdt":r_usdt,
           "tvlApprox":r_sut*price+r_usdt,"impact":out,
           "depthUp2pct":d_up,"depthDown2pct":d_dn},
          open("work/opp01_baseline.json","w"),indent=1)
print("\nsaved work/opp01_baseline.json")
