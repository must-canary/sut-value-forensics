import json,urllib.request,time
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
ADDRS=["0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c","0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165",
"0x3d90f66b534dd8482b181e24655a9e8265316be9","0x0d0707963952f2fba59dd06f2b425ace40b492fe",
"0x278d858f05b94576c1e6f73285886876ff6ef8d2","0x41d8e95a5d41390627b07cd22e800cb99b1a8e90",
"0x0186f74b30043e6241c5777e183d47c1e6605ad9","0x4e5bc1cd2c421ecfef65395b3237f90a97178c55"]
out=[]
for a in ADDRS:
    rec={"address":a}
    try:
        r=urllib.request.Request(f"https://polygon.blockscout.com/api/v2/addresses/{a}",headers={"User-Agent":UA})
        j=json.loads(urllib.request.urlopen(r,timeout=40).read())
        rec.update({"is_contract":j.get("is_contract"),"name":j.get("name"),
          "public_tags":[t.get("display_name") for t in (j.get("public_tags") or [])],
          "private_tags":[t.get("display_name") for t in (j.get("private_tags") or [])],
          "watchlist_names":[t.get("display_name") for t in (j.get("watchlist_names") or [])],
          "is_verified":j.get("is_verified"),"ens_domain_name":j.get("ens_domain_name"),
          "metadata_tags":[t.get("name") for t in ((j.get("metadata") or {}).get("tags") or [])]})
    except Exception as e:
        rec["error"]=str(e)
    out.append(rec); time.sleep(0.8)
json.dump({"source":"Blockscout polygon.blockscout.com/api/v2/addresses","retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),"addresses":out},open('work/exp-002/attribution.json','w'),indent=1)
for r in out:
    print(f"{r['address']}  contract={r.get('is_contract')}  name={r.get('name')!r}  public_tags={r.get('public_tags')}  metadata={r.get('metadata_tags')}  err={r.get('error','')}")
