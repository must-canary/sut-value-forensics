import json,collections,urllib.request,time
d=json.load(open('work/exp-002/onchain-transfers.json'))
tr=d['transfers']; meta=d['meta']
POOL="0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165"
KNOWN={ "0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c":"SRC (frozen research: top-10 holder #4, unlabelled EOA)",
 "0x7cc2f8914b4d77b68355757286f146373f4bf7ad":"DST conduit (frozen research)",
 "0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85":"HOP3 fan-out (frozen research)",
 "0x0d0707963952f2fba59dd06f2b425ace40b492fe":"FUNDER2 (frozen research)",
 POOL:"Uniswap V3 SUT/USDT 1% pool (contract-verified)",
 "0x7150ea07d00d8e5a46bcc809f1c9fdf5cb5f8e81":"PolygonSettler router/aggregator (frozen research)"}
print("WINDOW",meta['fromBlock'],"->",meta['toBlock'],meta['fromBlockTime'],"->",meta['toBlockTime'])
print("logs",meta['transferLogs'],"distinctTx",meta['distinctTx'])
vol=sum(r['value'] for r in tr)
print(f"gross SUT moved (sum of Transfer values, NOT volume): {vol:,.2f} SUT")
# pool-facing legs
buy=[r for r in tr if r['from']==POOL]; sell=[r for r in tr if r['to']==POOL]
print(f"pool-out legs {len(buy)} ({sum(r['value'] for r in buy):,.0f} SUT) | pool-in legs {len(sell)} ({sum(r['value'] for r in sell):,.0f} SUT)")
nonpool=[r for r in tr if r['from']!=POOL and r['to']!=POOL]
print(f"legs not touching the pool: {len(nonpool)} of {len(tr)}")
cs=collections.Counter()
for r in tr: cs[r['from']]+=1; cs[r['to']]+=1
print("\n=== TOP 15 ADDRESSES ===")
for a,c in cs.most_common(15):
    sent=sum(r['value'] for r in tr if r['from']==a); recv=sum(r['value'] for r in tr if r['to']==a)
    ns=len([1 for r in tr if r['from']==a]); nr=len([1 for r in tr if r['to']==a])
    print(f"{a} legs={c:4} out={ns:3}/{sent:14,.0f} in={nr:3}/{recv:14,.0f}  {KNOWN.get(a,'UNKNOWN — ownership unverified')}")
json.dump({"topAddresses":[{"address":a,"legs":c,"outLegs":len([1 for r in tr if r['from']==a]),"inLegs":len([1 for r in tr if r['to']==a]),
  "outSut":sum(r['value'] for r in tr if r['from']==a),"inSut":sum(r['value'] for r in tr if r['to']==a),
  "attribution":KNOWN.get(a,"UNKNOWN — ownership unverified")} for a,c in cs.most_common(25)],
  "poolOutLegs":len(buy),"poolInLegs":len(sell),"legsNotTouchingPool":len(nonpool),"grossSutMoved":vol},
  open('work/exp-002/onchain-summary.json','w'),indent=1)
