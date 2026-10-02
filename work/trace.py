import json, sys, datetime
sys.path.insert(0,"work")
from chain import rpc, get_logs, addr_topic, TRANSFER

SRC = "0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c"
DST = "0x7CC2F8914b4D77b68355757286f146373F4BF7ad"
w = json.load(open("work/window.json")); S,E = w["start"], w["end"]

def dec(l):
    return {"block":int(l["blockNumber"],16),
            "tx":l["transactionHash"],
            "from":"0x"+l["topics"][1][-40:],
            "to":"0x"+l["topics"][2][-40:],
            "amt":int(l["data"],16)/1e18}

tsc={}
def ts(b):
    if b not in tsc:
        tsc[b]=int(rpc("eth_getBlockByNumber",[hex(b),False])["timestamp"],16)
    return tsc[b]

jobs = {
 "src_out": [TRANSFER, addr_topic(SRC), None],
 "dst_in":  [TRANSFER, None, addr_topic(DST)],
 "dst_out": [TRANSFER, addr_topic(DST), None],
}
res={}
for k,t in jobs.items():
    print(f"--- {k} ...", file=sys.stderr)
    logs=[dec(l) for l in get_logs(S,E,t)]
    logs.sort(key=lambda x:x["block"])
    for l in logs: l["utc"]=datetime.datetime.utcfromtimestamp(ts(l["block"])).strftime("%Y-%m-%d %H:%M:%S")
    res[k]=logs
    print(f"{k}: {len(logs)} SUT transfers in window")
    for l in logs:
        print(f"   {l['utc']}  {l['amt']:>14,.2f} SUT  {l['from']} -> {l['to']}  {l['tx']}")
json.dump(res, open("work/may_sut_transfers.json","w"), indent=1)
