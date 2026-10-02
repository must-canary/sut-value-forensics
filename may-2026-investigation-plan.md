# May 2026 Investigation Plan — Case #001

**Case:** SUT May 2026 Crash
**Prepared:** 2026-09-30
**Context window:** 2026-05-01 → 2026-05-25
**Event window:** 2026-05-16 → 2026-05-20
**Refined onset (this cycle):** **2026-05-17, intraday** — see §2.2

**Governing documents:** `research-baseline.md`, `data-source-contract.md`,
`hypothesis-matrix.md`, `evidence-model.md`.

> **Standing instruction.** This plan investigates a **mechanism**. It does not assume a
> cause. Every step below is designed to be able to return a *negative* result, and several
> are explicitly designed to falsify the currently most-suggestive lead. No step may
> conclude with an AI-generated root-cause verdict.

---

## 1. Objective

Establish, with auditable evidence, **what measurable mechanism produced the 2026-05-17/18
SUT price collapse**, and which contributing factors are controllable by the business.

**Success is not "finding the cause."** Success is a defensible per-hypothesis evidence state
(SUPPORTED / REJECTED / INCONCLUSIVE / DATA UNAVAILABLE) with every underlying observation
traceable to a source, a timestamp, and a method.

An outcome of *"the trigger remains INCONCLUSIVE; H2 is SUPPORTED as amplifier; H3 unresolved
pending Q1/Q2; H4 blocked on Q3"* is a **legitimate and publishable result**.

---

## 2. Established event timeline

### 2.1 Confirmed price path (three sources; DEX series is `CONTRACT_VERIFIED`)

| Date | DEX open | DEX high | DEX low | DEX close | DEX vol USD | CoinGecko close | Coinranking close |
|---|---:|---:|---:|---:|---:|---:|---:|
| May 14 | 0.6380 | 0.6568 | 0.6117 | 0.6240 | 32,390 | 0.634806 | 0.633 |
| **May 15** | 0.6240 | **0.9012** | 0.6213 | 0.6920 | **244,781** | 0.682996 | 0.683 |
| May 16 | 0.6920 | 0.7180 | 0.6511 | 0.6737 | 39,897 | 0.680758 | 0.679 |
| **May 17** | 0.6737 | 0.6964 | **0.2511** | 0.4756 | **397,989** | 0.478317 | 0.482 |
| **May 18** | 0.4756 | 0.5511 | **0.1145** | **0.1308** | **712,616** | 0.124481 | 0.131 |
| May 19 | 0.1308 | 0.1914 | **0.1022** | 0.1491 | 185,298 | 0.152232 | 0.150 |
| May 20 | 0.1491 | 0.3138 | 0.1368 | 0.3124 | 274,470 | 0.306516 | 0.307 |
| May 21 | 0.3124 | 0.4284 | 0.2971 | 0.3450 | 240,229 | — | — |
| May 25 | 0.2132 | 0.2490 | 0.2008 | 0.2170 | 38,926 | — | — |

### 2.2 Refined onset — a finding of this cycle

The collapse **begins on May 17 intraday**, not May 18:
- May 17 opened at 0.6737 and traded to **0.2511 (−62.7%)** before closing at 0.4756.
- May 18 then continued to **0.1145** intraday, closing −72.5%.

Daily-close series conceal this. **All event-window analysis must run at hourly resolution
from 2026-05-17T00:00Z.**

### 2.3 Established context events

| Date | Event | Identity status | Class |
|---|---|---|---|
| 2026-02-06 | Project notice re CMC circulating-supply correction | Verified notice | COMPANY CLAIM |
| 2026-02-10 | CMC supply basis 2.02M → 188.4M; rank #2,049 → #299 | Verified | DATA-PROVIDER CHANGE |
| 2026-03-19 | Gate TR announces SUPERTRUST SUT/TRY delisting | `PAIR_VERIFIED` | EXCHANGE EVENT |
| 2026-03-30 | "Short-Term SUT Value Surge Strategy" (60% credit lock, lower weekly settlement) | Verified notice | COMPANY INTERVENTION |
| 2026-04-01 | Gate TR services cease 03:00 UTC | `PAIR_VERIFIED` | EXCHANGE EVENT |
| 2026-04-27 | DEX intraday −32% excursion, recovered same day | `CONTRACT_VERIFIED` | MARKET STRESS (precursor) |
| **2026-05-16** | **BitMart "withdrawal closed"** | **⚠ IDENTITY NOT VERIFIED** | **DO NOT USE — see §4** |
| 2026-05-01→17 | Wallet cluster pipeline, 16.58M SUT | `CONTRACT_VERIFIED` | ON-CHAIN FLOW |
| 2026-05-16 | Cluster outflow stops | `CONTRACT_VERIFIED` | ON-CHAIN FLOW |
| 2026-05-19 | Single 1,000,000 SUT cluster outflow | `CONTRACT_VERIFIED` | ON-CHAIN FLOW |
| 2026-07-20 | Contract ownership renounced | Verified | CONTRACT STATE (post-event) |

**Note:** the contract was **still owned and pausable** throughout May 2026.

---

## 3. Investigation structure

Work proceeds in five tracks. Tracks A and B are **decisive** and run first.

| Track | Subject | Hypotheses | Feasibility |
|---|---|---|---|
| **A** | Wallet-chain termination | H3, H5 | **Feasible now** |
| **B** | Exchange-event identity | H4, H10 | Blocked — needs archive access |
| **C** | Liquidity & market microstructure | H2, H11 | DEX feasible; CEX unavailable |
| **D** | Information & event correlation | H9, H11 | Partially feasible |
| **E** | Utility & company economics | H5, H7, H8 | Mostly unavailable |

---

## 4. ⚠ Track B first — the question that can invalidate everything else

**Before any narrative is built, resolve Q3.**

The handoff records a BitMart event with **"withdrawal closed 2026-05-16"** — the exact
onset of the crash window, and the exact day the wallet pipeline stopped. But
`sut-coin-research` v2 established that **BitMart's SUT was Sanity United, not SuperTrust**.

| If BitMart = SuperTrust | If BitMart = Sanity United |
|---|---|
| H4 likely becomes the leading hypothesis | Any use of it manufactures a **false root cause at exactly the right date**, apparently corroborated by a coincidental on-chain correlation |

**This is the single research issue most likely to materially change the conclusion.**

**Procedure B1 — BitMart identity resolution**
1. Retrieve the notice via web archive (`web.archive.org`) — direct access returns
   Cloudflare 403.
2. Extract: token full name, **contract address**, chain, pair, all dates.
3. Cross-check against the Sanity United → "SU" token swap record.
4. Query BitMart's public market API for the historical SUT pair's contract, if exposed.
5. Classify on the identity ladder. **If it cannot be resolved, it stays
   `IDENTITY NOT VERIFIED` and is excluded from all causal analysis** — and that exclusion is
   stated explicitly in the findings.

**Procedure B2 — complete the venue event set**
- Gate TR notice (archive; direct access failed).
- MEXC delisting date and notice (none found; API returns "invalid symbol").
- GOPAX termination notice and stated reasons (currently `SNIPPET_ONLY`).
- Any venue notice dated 2026-05-10 → 2026-05-25.
- For each: contract/pair identity, dates, stated reason, class.

---

## 5. Track A — wallet-chain termination (decisive for H3)

### 5.1 What is already established

```
SRC  0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c   (top-10 holder #4, 13.1M)
  │   16,580,000 SUT  May 1–17, near-daily
  ▼
DST  0x7CC2F8914b4D77b68355757286f146373F4BF7ad   (conduit; ~18.6K SUT left today)
  │   IN 19,007,099 (31 tx) · OUT 16,523,928 (78 tx)
  ├── 15,200,000 (29 tx) ──► HOP3  0xe6e7ec8d…ff85
  ├──  1,271,722 (42 tx) ──► back to SRC
  └──     52,206  (7 tx) ──► 4 others
  also IN: 2,303,367 from 0x0d070796…92fe
```
Outflow ran daily May 1–15, was **zero on May 16, 17, 18**, then **1,000,000 on May 19**.

HOP3's Jun–Sep signature: **8 inbound tx → 1,994 outbound to 784 recipients**, median
1,876 SUT — a **fan-out payout pattern**, not an exchange-deposit pattern.

### 5.2 Procedure A1 — terminal destination in May (Q1) — ✅ **COMPLETE (2026-09-30)**

**Question:** where did the 15.2M SUT sent to HOP3 during May actually go?

**Method executed.** `eth_getLogs`, Transfer topic, SUT contract, blocks
86,236,778 → 87,436,510, `topic1`/`topic2` = HOP3. (Blockscout pagination cannot reach May on
this address — 2,000 transfers only reach 2026-06-19 — so logs were required.)

**Result — the falsification test fired.**

| HOP3, May 1–25 | Transfers | Total SUT |
|---|---:|---:|
| Inbound | 31 (29 from DST) | 15,200,471 |
| **Outbound** | **34,349** | **15,332,008** |

Average outbound **~446 SUT** (≈$270). Largest single May recipient **158,598 SUT (~1%)**.
**No DEX pool, router, or identifiable exchange deposit address among the top recipients.**

**The pre-stated falsification criterion was met: May's outflow *is* a mass retail fan-out.**
Accordingly **H3a (concentrated dump) is REJECTED**, and weight moves to **H8/H11**.

Distribution ran at **~1,000,000 SUT/day (≈$600K/day)** through May 1–15 against a ~$91.7K
pool, then **throttled ~70% on May 16** (2,000–2,800 tx/day → 651) and decayed to 52–175
tx/day by May 22–25. **Direction of causation between the throttle and the crash is not
determined.**

**Note:** the earlier "outflow stopped on May 16" observation was **DST-specific**. HOP3
continued distributing from its balance at a reduced rate. Both observations are correct and
describe different stages.

### 5.2b Procedure A1b — recipient sell-through (Q16) — **NEW HIGHEST PRIORITY**

A1 relocated the question rather than closing it: from one large seller to thousands of small
ones. The recipient set is **known and enumerable** from the May fan-out logs.

For the May recipients, measure: what fraction transfer their SUT onward to the main pool,
to another venue, or to any address, within **1 / 7 / 30 days** of receipt? What fraction hold?

| Outcome | Implication |
|---|---|
| High, fast sell-through | ~1M SUT/day of distribution becomes a **continuous supply flood** against ~$91.7K depth → **H8 and H11 strongly supported**, H2 amplification confirmed |
| Low sell-through | Distribution was absorbed; sell pressure came from elsewhere → look to H4/H9/H11 |

**This is now the single most valuable unexecuted test in the case.** It requires no company
access and no new data source.

### 5.3 Procedure A2 — did any cluster address actually sell? (Q2) — **DECISIVE**

Transfers are **not** sales. Test directly:
1. Pull **all Swap events** from pool `0x092295c9…e165` for May 1–25 (Uniswap V3 `Swap`
   topic), with amounts, direction and timestamps.
2. Extract the `sender`/`recipient` of each swap and the initiating EOA of each transaction.
3. **Cross-match against the cluster set** {SRC, DST, HOP3, `0x0d070796…92fe`, the 4 minor
   DST recipients, the 784 fan-out recipients}.
4. Quantify: SUT sold by cluster addresses, per hour, May 16–20.
5. Also check the other ~11 dormant pools for any May activity.

| Outcome | Implication |
|---|---|
| Large cluster sells on May 17–18 | H3 → **SUPPORTED** |
| No cluster sells | H3's dump reading → **REJECTED**; sell pressure came from elsewhere (→ H11) |
| Small cluster sells only | H3 contributory; H2 amplification dominant |

### 5.4 Procedure A3 — stablecoin counter-flow

Handoff records large **USDT0** movements between SRC and DST. Pull USDT0/USDT/USDC transfers
for all cluster addresses across May.

- SUT out **and** stablecoin in → consistent with **selling**.
- SUT out with **no** stablecoin in → consistent with **distribution/payout**.

This is an independent check on A2 and does not depend on identifying swap venues.

### 5.5 Procedure A4 — other large holders (Q12)

For holders #1 `0xbc0e5c…6144`, #3 `0xd6eac4…7e81`, #5 `0xf46e16…7bc8`, #6 `0x29da84…f841`,
#7 `0x8b2fdf…bb72`: full May transfer history, daily net flow, and any pool interaction.
Holder #5 is already known to be inside the cluster.

Also: did **any** address move the 50M in `0xbc0e5c…6144`? (Q4 — lock-up verification.)

### 5.6 Procedure A5 — holder distribution snapshots

Reconstruct holder balance distribution at 2026-05-01, 05-16, 05-18, 05-25. Measure change in
top-10 share and in the number of holding addresses. Supports H3, H6 (float) and H11.

### 5.7 Wallet-labelling discipline — mandatory

> Every address in this case is an **unlabelled EOA** with `is_contract: false`,
> `is_verified: false`, `public_tags: []`, `name: null`. **Role = UNKNOWN.**
>
> The terms *company wallet, treasury, market maker, exchange, LP, whale, insider* are
> **forbidden** unless public evidence establishes the role. The MSQ holding (§7.4 baseline)
> and the payout-shaped behaviour are **evidence bearing on affiliation**, not proof of it.
>
> Permitted descriptions: "unlabelled EOA", "conduit/pass-through address",
> "fan-out distribution address", "top-10 holder", "cluster member".

---

## 6. Track C — liquidity and market microstructure (H2, H11)

### 6.1 Procedure C1 — LP add/remove events (Q5) — ✅ **COMPLETE (2026-09-30)**

**Executed.** Decoded `Swap` / `Mint` / `Burn` / `Collect` from pool `0x092295c9…e165`, blocks
86,812,650 → 87,292,543 (2026-05-13 → 2026-05-23). Pool parameters read from the contract:
token0 = SUT, token1 = USDT (`0xc2132d05…58e8f`), fee 1.00%. Events: **17,056 Swap · 1,342
Mint · 1,481 Burn · 1,471 Collect**.

**Results:**
1. **✅ C14 resolved** — the 3.4× gross-flow gap was LP churn. Swap buy $378,676 + LP mint
   $986,179 = **$1,364,855 = measured gross inflow exactly ($0 difference)**; outflow
   reconciles to 0.24%.
2. **✅ Q5 answered — liquidity was NOT withdrawn.** Churn rose ~65× (26/30 → 643/679
   mints/burns) but **net liquidity was positive every crash day** (+$15,911 / +$3,667 /
   +$3,053). Signature of **concentrated-liquidity re-ranging**, not LP flight. **H2's
   "liquidity flight" variant is REJECTED.**
3. **⭐ Decisive for H2** — May 17 swap volume $784,333 split $378,676 buy / $405,657 sell =
   **net sell imbalance ~$26,981** against a **−62.7% intraday** move (May 18: $3,160 net
   against −72.5%). **Depth exhaustion, not net imbalance, drove the collapse.**
4. **Corrections** — SUT sold via swaps May 17–18 = **2,086,407** (was 2,461,147; the raw
   figure included LP deposits). The "exceeded depth by an order of magnitude" claim is
   **withdrawn** — it used a September TVL figure; **May 2026 pool TVL remains unmeasured**.
5. **New conflict C15** — single-day May 17/18 splits are unreliable (interpolated-timestamp
   day-boundary drift); **the two-day total agrees with GeckoTerminal within 3.3%**. Use the
   combined figure.

Method record retained below.

### 6.1-method — original procedure definition

Pull Uniswap V3 `Mint` / `Burn` / `Collect` events for pool `0x092295c9…e165`, May 1–25.

- Did liquidity **withdraw before or during** May 17–18? → strongly supports the H2
  liquidity-flight variant.
- Was liquidity **stable**? → the crash occurred against constant depth; price impact was
  purely flow-driven.

Predecessor research notes ~97% of pool liquidity is held by 4 wallets and **is not locked** —
so withdrawal was possible at any time. **Whether it happened is unmeasured.** Identify the LP
addresses and cross-check against the cluster.

### 6.2 Procedure C2 — pool reserve time series

Reconstruct SUT and USDT0 reserves per block/hour across the window to compute realised depth
over time rather than a single snapshot.

### 6.3 Procedure C3 — realised price impact

For each hour of May 16–20: USD volume vs price change → impact per $1K traded. Compare to
April baseline. Simulate slippage at $10K / $50K / $100K against reconstructed reserves.

**Note:** the constant-product/concentrated-liquidity simulation is a **model**, and must be
labelled as such — `evidence-model.md` requires the formula and parameters to be recorded.

### 6.4 Procedure C4 — seller-breadth test (discriminates H3 vs H11) — **high value**

From the May 17–18 Swap set: count **distinct selling addresses** per hour and the
**distribution of sell sizes**.

| Pattern | Reading |
|---|---|
| Few large sellers | → H3 (concentrated distribution) |
| Many small distinct sellers | → H11 (broad confidence collapse) |
| Both | Mixed; sequence matters — who moved first? |

This is the single cleanest discriminator available between the two leading behavioural
hypotheses.

### 6.4b Procedure C6 — buy-side support test (H12, added 2026-09-30) — ✅ **COMPLETE**

**Result: H12 REJECTED (DEX limb).** Buy-side flow **peaked on May 17** (1,364,855 USDT,
2,801 tx — the month's maximum) instead of withdrawing; buy and sell flows are near-identical
daily (monthly totals differ 0.04%), so no persistent supporting buyer exists. Buyers were
active in force *during* the collapse and price still fell 62.7% intraday — strengthening H2
and H11. **Raised new conflict C14** (gross flow ~3.4× reported volume on event days) and
makes **procedure C1 (LP Mint/Burn separation) more urgent**, since it distinguishes the two
explanations. CEX limb remains DATA UNAVAILABLE. Detail below retained as the method record.

**Question.** Was the pre-crash price level sustained by buy-side support that was reduced or
withdrawn before May 17?

**Method.** `eth_getLogs`, Transfer topic, **quote asset (USDT)**, blocks 86,236,778 →
87,436,510, `topic2` = pool (buys) and `topic1` = pool (sell proceeds). Produces daily
buy-side volume and distinct-buyer counts.

**Pre-stated falsification criterion:**

| Observation | Verdict for H12 |
|---|---|
| Buy-side steady or rising into May 17 | **REJECTED** — no support was withdrawn |
| Buy-side falls materially before May 17 | **SUPPORTED as contributing mechanism** — then identify buyer persistence/concentration |
| Buy-side always negligible | **REJECTED** — there was no support to withdraw |

**Already-known tension.** The session's sell-side measurement shows a genuine **27× sell
surge** on May 17 (45,074 → 1,238,819 SUT). H12's pure form — "no new selling, only absent
support" — is **already partly contradicted**. C6 tests whether support withdrawal was a
*contributing* factor alongside the measured selling.

**Discipline.** "Support withdrawal" and "manipulation" are different claims. C6 tests only
whether buying existed and stopped. The word *manipulation* must not attach to its findings.

### 6.5 Procedure C5 — per-venue volume (Q6)

Obtain May 16–20 volume for Gate, BingX, KuCoin, CoinUp.io via venue APIs where historical
klines exist. Reconcile against the C4 provider conflict (CoinGecko vs Coinranking vs DEX).

**Specifically test:** on May 17 CoinGecko's total ($420,380) barely exceeds the single DEX
pool ($397,989). Either CoinGecko under-captures DEX volume, or CEX venues were near-dead.
**Determining which materially changes where the selling occurred.**

### 6.6 CEX depth — declared unavailable

Historical order-book depth and spread for May 2026 are **DATA UNAVAILABLE**. No public source
retains them for these venues/pairs. The ±2% figures in the baseline are a **2026-09-29
snapshot** and may be used only as an order-of-magnitude indication, never as a May
observation. **H2's CEX limb will remain DATA UNAVAILABLE unless a venue provides historical
depth on request** — which is a legitimate action item, not a data-collection task.

---

## 7. Track D — information and event correlation (H9, H11)

### 7.1 Procedure D1 — systematic window search (Q8)

Currently **no** legal/regulatory/news/company event is catalogued within
2026-05-15 → 2026-05-20. Given that Korean media and several primary sources are blocked to
automation, **this is an evidence gap, not a demonstrated absence.**

Search, with dates and classification:
- SuperTrust notice archive (WordPress JSON interface) for May 2026.
- Korean media, Korean-language queries, via archive services.
- Korean court/regulator records.
- Exchange notices from every venue.
- Community/chat-room activity.
- Social/Twitter activity around 38,974 followers' account.

Every result classified per `data-source-contract.md` §4. Note L12: a report about this group
was **corrected by the Press Arbitration Commission** — secondary reporting here has a
demonstrated error rate.

### 7.2 Procedure D2 — event study

For any identified event: abnormal return and abnormal volume in [−5d, +5d], controlled
against BTC/ETH. Report timing precisely: an event **after** the onset cannot be its cause.

### 7.3 Procedure D3 — the May 15 anomaly (Q15)

Two days before the collapse: DEX high 0.9012 vs open 0.6240 (**+44% intraday**) on
**6× normal volume**, closing back at 0.6920 — and the cluster's largest day (3.58M in /
2.00M out). Investigate as a possible precursor: who traded, in what direction, and did the
same addresses appear on May 17–18?

---

## 8. Track E — company economics and utility (H5, H7, H8)

### 8.1 Currently DATA UNAVAILABLE

No access to SoloPay, SuperSave, production systems, settlement records, or merchant data.
**H5 cannot be tested from outside.** Required, and obtainable only internally:
settlement records for May 2026; SuperSave balances and conversions; buyback execution;
published company wallet map; merchant/payment counts and values.

### 8.2 Procedure E1 — recipient-behaviour study (on-chain proxy for H8) — **feasible now**

The **784 fan-out recipient addresses are known**. Measure: after receiving SUT, what fraction
transfer to a pool/venue within 1/7/30 days? What fraction hold? What fraction spend into
platform-associated addresses?

| Outcome | Implication |
|---|---|
| Most recipients sell quickly | Ecosystem activity is a **structural supply source** → H8 supported |
| Most hold or spend in-ecosystem | Genuine utility circulation → H8 weakened |

This is the strongest available external test of value capture and **requires no company
access**.

### 8.3 Procedure E2 — token velocity and activity baseline

Transfer value / market cap over time; active addresses per day across May; compare event
window to baseline. Note current utility figures are **Sep 2026 snapshots — no May 2026
utility measurement exists**, so a May-specific baseline must be reconstructed on-chain.

### 8.4 Procedure E3 — the 2026-03-30 intervention (Q14)

Did the announced 60% credit lock and reduced weekly settlement change on-chain behaviour
between 2026-03-30 and 2026-05-16? Compare cluster flow rates and holder distribution
pre/post. **An announced intervention is a CLAIM until verified on-chain.**

---

## 9. Statistical and graphical tests

| # | Test | Hypotheses | Status |
|---|---|---|---|
| T1 | Normalised return vs BTC/ETH (residual return) | H1 | **Done — H1 rejected** |
| T2 | Price impact per $1K traded, daily/hourly | H2 | Pending C3 |
| T3 | Liquidity-to-market-cap ratio over time | H2 | Pending C2 |
| T4 | Cluster net flow vs price, lead/lag | H3 | Partially done |
| T5 | Cluster→pool cross-match | H3 | **Done — 0.00% cluster-attributed; H3a rejected** |
| T6 | Distinct-seller count & sell-transaction breadth | H3 vs H11 | **Done — 10–20× breadth increase; H11 broad-exit supported** |
| T11 | Sell volume vs pool depth, May 17–18 | H2 | **Done — 2.46M SUT into a ~$91.7K pool** |
| T12 | Fan-out recipient → pool overlap | H8, H16 | **Partial — 0.67% direct floor; router/CEX sales unattributed** |
| T7 | Event study, [−5d,+5d] abnormal return/volume | H4, H9 | Pending B/D |
| T8 | Supply/float reconciliation over May | H6 | Partially done |
| T9 | Recipient sell-through rate | H8 | Pending E1 |
| T10 | Cross-provider volume divergence | H10 | **Done — conflict C4 recorded** |

### Required graphs (source-separated — never blend providers)

- **G1** SUT vs BTC vs ETH, normalised to 100 *(data ready)*
- **G2** SUT price vs volume, **one line per provider** *(data ready)*
- **G3** Cluster net flow vs price, daily + hourly *(partially ready)*
- **G4** Per-venue volume share and exchange events *(pending C5)*
- **G5** Liquidity / price impact before-during-after *(pending C1–C3)*
- **G6** Event timeline with markers for exchange, company, legal, supply and wallet events
- **G7** Usage vs market cap *(mostly unavailable)*
- **G8** Token velocity *(partially feasible)*
- **G9** Provider-divergence chart — a **data-integrity** graph, not a market graph
- **G10** Distinct sellers and sell-size distribution, hourly May 16–20 *(pending C4)*

---

## 10. Execution order

| Phase | Steps | Why |
|---|---|---|
| ~~0~~ | ~~A1 — chain termination~~ | **✅ DONE 2026-09-30 — H3a rejected; weight moved to H8/H11** |
| **0** | **B1** — BitMart identity | Can invalidate the whole narrative; do it before building one |
| **1** | **A1b (Q16), A2, A3** — recipient sell-through, swap cross-match, stablecoin counter-flow | **A1b is now the decisive test**; A2/A3 corroborate |
| **2** | **C1, C4** — LP events, seller breadth | Decisive for H2 vs H11; C4 now doubly relevant (diffuse selling predicts many small distinct sellers) |
| **3** | A4, A5, C2, C3, C5 | Quantify depth and holder behaviour |
| **4** | D1, D2, D3 | Fill the information-event gap |
| **5** | E1, E2, E3 | Value-capture proxies |
| **6** | Assemble findings; update `hypothesis-matrix.md` statuses | — |

---

## 11. Causality limitations — binding

1. **Timing correlation is not causation.** This applies with full force to the most
   suggestive fact in the case: **the cluster pipeline stopping on 2026-05-16, the day before
   onset.** It is equally consistent with (a) the halt contributing to the collapse,
   (b) the operator halting *in response to* early stress, (c) an unrelated upstream funding
   change, (d) coincidence. **On current evidence these cannot be distinguished.**
2. **Transfers are not sales.** No on-chain transfer between wallets demonstrates a market
   sale. Only a Swap/trade event does.
3. **Wallet roles are unknown.** No labelling without public evidence.
4. **Absence of evidence is not evidence of absence** — particularly H9, where the search was
   not exhaustive and key sources are blocked.
5. **Amplifier ≠ trigger.** H2 may be SUPPORTED as amplification while the trigger remains
   unknown. These are different findings and must be reported separately.
6. **A single explanation is not required.** Multiple mechanisms may operate together;
   SUPPORTED hypotheses are not mutually exclusive.
7. **Chronic conditions cannot explain dated events.** H7/H8 were equally true on May 1 and
   May 16; they explain severity, not timing.
8. **Model outputs are not observations.** Simulated slippage is a model with stated
   assumptions.
9. **Data conflicts are not resolved by preference.** Where providers disagree (C4), report
   the conflict.
10. **No AI root-cause verdict.** The matrix reports evidence states; a human investigator
    concludes.
11. **Conflict of interest** (issuer name on `must.company`) must be disclosed in outputs.

---

## 12. Exit criteria

The case may be reported when:
1. Q1, Q2, Q3 are resolved **or** formally declared DATA UNAVAILABLE with the attempts
   documented.
2. Every hypothesis H1–H11 has a status, supporting and contradictory evidence, limitations,
   and named missing evidence.
3. Every finding traces to source + URL + `retrieved_at` + `observation_time` + method.
4. Every data conflict is registered, not resolved by preference.
5. Every wallet is described by behaviour, never by assumed role.
6. Graphs G1–G3, G6 and G9 exist at minimum, with source separation preserved.
7. The report states plainly what remains unknown.

**A case that ends with "the trigger is INCONCLUSIVE" and a complete evidence record is a
successful case. A case that ends with a confident cause the evidence does not carry is a
failed case, regardless of how satisfying the story is.**
