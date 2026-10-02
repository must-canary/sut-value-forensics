import json
d=json.load(open("work/opp01_baseline.json"))
Q96=2**96
sqrtP=int(d["sqrtPriceX96"]); L=int(d["activeLiquidity"])
price=d["price"]; r_sut=d["reserveSut"]; r_usdt=d["reserveUsdt"]
D0,D1=18,6

def sut_out_for_usdt_in(usd):
    dy=usd*10**D1
    sp2=sqrtP+(dy*Q96)//L
    # amount0 out = L*(1/sqrtP - 1/sp2) in raw token0
    a0 = L*Q96*(1/sqrtP - 1/sp2)
    return a0/10**D0

def usdt_out_for_usdt_value_sold(usd):
    dx=(usd/price)*10**D0
    inv=Q96/sqrtP+dx/L
    sp2=Q96/inv
    a1 = L*(sqrtP-sp2)/Q96
    return a1/10**D1

print(f"Pool inventory: {r_sut:,.0f} SUT (= ${r_sut*price:,.0f} at spot)  |  ${r_usdt:,.0f} USDT")
print(f"Spot ${price:.6f}\n")
print(f"{'size':>9} | {'BUY: SUT needed':>17} {'avail?':>7} | {'SELL: USDT needed':>18} {'avail?':>7}")
print("-"*70)
res={}
for usd in (10_000,50_000,100_000):
    need_sut = sut_out_for_usdt_in(usd)
    need_usdt= usdt_out_for_usdt_value_sold(usd)
    okb = need_sut <= r_sut
    oks = need_usdt <= r_usdt
    res[usd]={"buySutNeeded":need_sut,"buyFillable":okb,
              "sellUsdtNeeded":need_usdt,"sellFillable":oks}
    print(f"${usd:>8,} | {need_sut:>17,.0f} {'YES' if okb else 'NO':>7} | {need_usdt:>18,.0f} {'YES' if oks else 'NO':>7}")
json.dump(res,open("work/opp01_feasibility.json","w"),indent=1)
print("\nNOTE: 'NO' means the standardised size cannot be filled by this pool at all —")
print("      a modelled impact % for that size is not an executable quote.")
