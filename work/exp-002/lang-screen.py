import re,sys
FORBIDDEN=['will rise','will increase','will go up','price target','guaranteed',
 'target achieved','liquidity improved','liquidity has improved','adoption proven',
 'proves demand','proves adoption','caused the price','this caused','because of this',
 'experiment succeeded','do this intervention','we should execute','will improve ranking',
 'will reach top 100','adoption increased','this will increase demand','this guarantees value',
 'the intervention succeeded','this caused the price increase',
 'increase the price','raise the price','boost the price','price will rise','higher market rank',
 'improve the rank','reach the top 100','guarantee','will succeed','proven to work',
 'crashed because','the root cause was','caused the crash','dumped','was manipulation',
 'is a ponzi','committed fraud',
 'treasury','company wallet','market maker','whale','insider','exchange wallet',
 'looks like','probably','seems']
FILES=['docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md','docs/PROJECT-STATUS.md',
 'docs/README.md','docs/SUT-VALUE-IMPROVEMENT-LAB.md','docs/THESIS-UPDATE-CANDIDATES.md','README.md']
bad=0
for f in FILES:
    txt=open(f,encoding='utf-8').read()
    low=txt.lower()
    for p in FORBIDDEN:
        if p in low:
            for m in re.finditer(re.escape(p),low):
                ln=low[:m.start()].count('\n')+1
                print(f"  HIT {f}:{ln}  [{p}]  ...{txt[max(0,m.start()-90):m.start()+90].replace(chr(10),' ')}...")
                bad+=1
print("\nFORBIDDEN-PHRASE HITS:",bad)
sys.exit(0)
