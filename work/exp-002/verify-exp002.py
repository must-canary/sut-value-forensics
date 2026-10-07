"""Phase 2 verification: re-derive every headline EXP-002 figure from the
committed artefacts and assert the report agrees. Read-only."""
import csv, json, collections, re, sys

ok = True
def check(label, got, want):
    global ok
    good = got == want
    ok &= good
    print(f"  [{'PASS' if good else 'FAIL'}] {label}: got {got!r}, expected {want!r}")

print("=== EVIDENCE REGISTER (work/exp-002/EXP-002-evidence-register.csv) ===")
rows = list(csv.DictReader(open('work/exp-002/EXP-002-evidence-register.csv', encoding='utf-8-sig')))
check("evidence items", len(rows), 41)
lv = collections.Counter(r['Source Type'] for r in rows)
check("Level-1 first-party", lv['LEVEL 1 — official first-party'], 29)
check("Level-2 blockchain",  lv['LEVEL 2 — blockchain'], 10)
check("Level-3 third-party", lv['LEVEL 3 — public third-party'], 2)
check("unique evidence IDs", len({r['Evidence ID'] for r in rows}), 41)

claims = [r for r in rows if r['Evidence Status'] == 'VERIFIED AS CLAIM']
check("first-party utility claims (VERIFIED AS CLAIM)", len(claims), 14)

print("\n=== ON-CHAIN ARTEFACT (work/exp-002/onchain-transfers.json) ===")
oc = json.load(open('work/exp-002/onchain-transfers.json'))
m, tr = oc['meta'], oc['transfers']
check("transfer legs (meta)", m['transferLogs'], 473)
check("transfer legs (actual rows)", len(tr), 473)
check("distinct transactions (meta)", m['distinctTx'], 399)
check("distinct transactions (recomputed)", len({r['tx'] for r in tr}), 399)
check("distinct senders (meta)", m['distinctFrom'], 251)
check("distinct senders (recomputed)", len({r['from'] for r in tr}), 251)
check("contract", m['contract'], '0x98965474ecbec2f532f1f780ee37b0b05f77ca55')
check("fromBlock", m['fromBlock'], 95056696)
check("toBlock", m['toBlock'], 95096695)

print("\n=== LINKAGE TEST (work/exp-002/dect-linkage.json) ===")
dl = json.load(open('work/exp-002/dect-linkage.json'))
res = dl['results']
check("transactions tested", dl['txTested'], 399)
check("results recorded", len(res), 399)
check("matches (HTTP 200)", sum(1 for r in res if r['http'] == 200), 0)
check("conclusive 404s", sum(1 for r in res if r['http'] == 404), 399)
check("inconclusive (non-200/404)", sum(1 for r in res if r['http'] not in (200, 404)), 0)
check("linkage tx set == on-chain tx set",
      {r['tx'] for r in res} == {r['tx'] for r in tr}, True)

print("\n=== INSTRUMENT CHECK (work/exp-002/instrument-check.json) ===")
ic = json.load(open('work/exp-002/instrument-check.json'))
check("USDT transactions tested", ic['txTested'], 26)
check("matches", ic['matched'], 0)

print("\n=== ADDRESS ATTRIBUTION ===")
att = [r for r in rows if 'ADDRESS OWNERSHIP UNVERIFIED' in r['Linkage Status']]
check("rows marked ADDRESS OWNERSHIP UNVERIFIED", len(att), 2)
aj = json.load(open('work/exp-002/attribution.json'))
labelled = [a for a in aj['addresses'] if a.get('public_tags') or a.get('name')]
check("addresses with a retrieved public label", len(labelled), 0)
ev46 = next(r for r in rows if r['Evidence ID'] == 'EXP002-EV-046')
check("EV-046 status", ev46['Evidence Status'], 'DATA UNAVAILABLE')

print("\n=== STATUS STRINGS IN THE REPORT ===")
rep = open('docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md', encoding='utf-8').read()
check("GAP-D experiment-level status present",
      'GAP-D: C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED' in rep, True)
check("code-derived GAP-D status recorded as DATA UNAVAILABLE",
      bool(re.search(r'GAP-D in-code lab status \| \*\*`DATA UNAVAILABLE`\*\*', rep)), True)
check("human review REQUIRED / NOT RECORDED",
      'REQUIRED — NOT RECORDED' in rep, True)
check("thresholds proposed by EXP-002 = NONE", '| **NONE** |' in rep, True)

print("\n=== IN-CODE GAP-D STATUS UNCHANGED (src/core/improvement-lab.ts) ===")
lab = open('src/core/improvement-lab.ts', encoding='utf-8').read()
gd = lab[lab.index("id: 'GAP-D'"):lab.index("id: 'GAP-D'") + 500]
check("GAP-D in code still DATA_UNAVAILABLE", "'DATA_UNAVAILABLE'" in gd, True)

print("\nRESULT:", "ALL CHECKS PASS" if ok else "VERIFICATION FAILED")
sys.exit(0 if ok else 1)
