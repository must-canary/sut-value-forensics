# Research Change Log

**Purpose:** auditable record of every reconciliation decision made when new evidence is
integrated into the existing research state. One row per decision.
**Decisions:** `KEEP` · `REPLACE` · `QUALIFY` · `REJECT` · `ADD` · `DUPLICATE`

---

## Entry 001 — Integration of `research-inputs/` PDFs (2026-09-30)

**New inputs:**
- `research-inputs/SUT_Coin_Detail_Research.pdf` (10 pp, dated 29 Sep 2026)
- `research-inputs/PIP_Week_2_thesis.pdf` (8 pp, dated 30 Sep 2026)

**Method:** text extracted with PyMuPDF to `work/*.txt`; compared line-by-line against
`SUT-Value-Forensics-Research-Handoff.md`, the three `.txt` research files, and the
on-chain/market work performed in this session.

---

### 1.0 Provenance finding — PDF 1 is a duplicate, not new evidence

| Field | Detail |
|---|---|
| **Existing finding** | `sut-coin-research-2026-09-29.txt` (v2) — the research note with its three corrections |
| **New PDF finding** | `SUT_Coin_Detail_Research.pdf` — **identical content**: same date, same three v2 corrections, same CertiK 74.06/BBB and sub-scores, same holder table, same timeline, same source list |
| **Decision** | **DUPLICATE** |
| **Reason** | Byte-level content differs (PDF layout) but every factual claim matches the existing `.txt`. It is a PDF rendering of the same document, **not** an independent source. Treating it as corroboration would be **double-counting a single source**. |
| **Effect** | No baseline change. Recorded as a second *format* of one source. Its value is confirming the `.txt` file has not been altered. |
| **Source** | `research-inputs/SUT_Coin_Detail_Research.pdf`; `SUT-Value-Forensics-Research-Handoff/sut-coin-research-2026-09-29.txt` |

> **Note on the briefing expectation.** The task brief anticipated that "the PDF contains an
> older GoPlus interpretation saying contract control may allow minting…". That claim is
> **not live** in this PDF — this PDF is v2, which *corrects* it (correction #2). The stale
> GoPlus claim appears instead in **PDF 2**, the newer document. See 1.1.

---

### 1.1 ⚠ REJECTED — stale GoPlus "contract control" claim (PDF 2, p.1)

| Field | Detail |
|---|---|
| **Existing finding** | F4–F8, F11, F14: **no minting**, **no fees/tax**, **no blacklist**, **not a proxy**; only admin power was pause/unpause; **ownership renounced 2026-07-20**; GoPlus live check returns *not mintable, no fees, no blacklist, no hidden owner, not a proxy* |
| **New PDF finding** | PIP thesis p.1: *"GoPlus warns that 'the contract creator can make changes to the token contract such as disabling sells, changing fees, minting, transferring tokens etc.' That means the issuer can technically change or freeze the token."* |
| **Decision** | **REJECT** (retain only as a documented historical discrepancy) |
| **Reason** | Directly contradicted by verified on-chain evidence from three independent routes (Blockscout full-match source verification, Sourcify exact match, GoPlus live security feed) and re-confirmed on-chain 2026-09-30. It is the **v1 claim that `sut-coin-research` v2 explicitly retired** (correction #2). It is generic scanner boilerplate, not a finding about this contract. |
| **Aggravating factor — date inversion** | PDF 2 is dated **30 Sep 2026**, one day *newer* than the v2 note that corrects it. **A newer document carries an older, superseded claim.** Document date is therefore **not** a reliable proxy for claim currency. |
| **Secondary defect** | PDF 2 cites *"Source evidence of contract control: coingecko.com/en/coins/super-trust"* — a **mis-citation**. CoinGecko is not the origin of that warning, and the claim cannot be sourced to it. |
| **What is kept** | The **historical** fact that a pause function existed and the contract was owned — true until 2026-07-20, and **true during the May 2026 crash window**. Recorded as C8 (`STATE_CHANGE`, not error). |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` p.1–2 vs `research-baseline.md` §4 |

---

### 1.2 ⚠ REJECTED — BitMart delisting attributed to SuperTrust (PDF 2, p.1)

| Field | Detail |
|---|---|
| **Existing finding** | `sut-coin-research` v2 correction #1: the **March 2026 BitMart delisting** and April 2026 "contract swap" were **Sanity United**, a different Ethereum token sharing the ticker SUT — **not SuperTrust**. CoinMarketCap's AI pages caused the mix-up. |
| **New PDF finding** | PIP thesis p.1, listed under *Risks and Red flags*: *"Exchange loss: the BitMart delisting (Mar 2026) removed a trading venue without a stated reason."* |
| **Decision** | **REJECT** |
| **Reason** | This is **the exact error v2 corrected**, reappearing in a later internal document. No contract-level evidence maps any BitMart SUT event to `0x98965474…Ca55`. Under `data-source-contract.md` §2.4 the standing rule is that no BitMart event may be attributed to SuperTrust without contract-level proof. Current status remains **IDENTITY NOT VERIFIED** (notice unreachable — Cloudflare 403, 2026-09-30). |
| **Why this matters beyond bookkeeping** | The related BitMart date **"withdrawal closed 2026-05-16"** sits exactly at the May crash onset and exactly on the day the wallet pipeline throttled. Admitting an unverified BitMart event would **manufacture a false root cause at precisely the right date**, apparently corroborated by a coincidental on-chain correlation. This is **Q3**, the highest-priority open question. |
| **Escalation** | Demonstrates that identity contamination has **propagated into internal work product**, not just external feeds. `data-source-contract.md` §2 identity gate is hereby extended to **internally authored documents**. H10 updated accordingly. |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` p.1 vs `sut-coin-research-2026-09-29.txt` §0 / v2 correction #1 |

---

### 1.3 ADDED — Top-100 quantitative benchmark (PDF 2, pp.3–4)

| Field | Detail |
|---|---|
| **Existing state** | `sut-top100-validation-plan` listed the #90–#110 benchmark as a **Day-1 TODO with blank cells**. No peer figures existed anywhere in the baseline. |
| **New PDF finding** | A populated benchmark table and a 21-coin peer listing (#90–#110), CoinMarketCap live data, 30 Sep 2026 |
| **Decision** | **ADD** (new, non-duplicative, quantified) |
| **Reason** | Fills a declared gap with concrete comparator data. Independently valuable to **H2** and **H7**: it converts "SUT is illiquid" from an assertion into a peer-relative measurement. |
| **Confidence** | `SECONDARY` — single-source (CoinMarketCap), ticker/slug-keyed for peers, `observation_time` 2026-09-29/30. Peer market caps are not independently verified. |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` pp.3–4 |

Preserved figures (see `research-baseline.md` §6.6):

| Metric | Top-100 band | SUT (#301) | Gap |
|---|---|---|---|
| Market cap to enter top 100 | $413M (#100, BSV) | $75M | **~5.5×** |
| Implied price required | ~$2.19 | $0.398 | ~5.5× |
| Daily volume (median) | $46M | ~$0.08M | **~600×** |
| Volume / market cap (median) | 12.4% | 0.11% | **~110×** |
| Lowest daily volume in band | $4.1M (meme, #93) | ~$0.08M | **~50×** |
| Security audit / verified team | common | none | qualitative |
| Tier-1 listings | most | Gate, KuCoin, BingX, Uniswap | qualitative |

---

### 1.4 QUALIFIED — "SUT traded above $2.19 for most of 2025" (PDF 2, p.7)

| Field | Detail |
|---|---|
| **Existing finding** | Rank history: peak rank **#774** on 2025-09-06 at $14.10–$14.78, **with only 2.02M counted as circulating**. Rank jumped to #299 on 2026-02-10 when the basis changed to 188.4M at ~$0.60. |
| **New PDF finding** | *"Mathematically: yes. A price of about $2.19 (with 188.4M circulating) would reach the ~$413M threshold. **SUT traded above that for most of 2025.**"* |
| **Decision** | **QUALIFY** (arithmetic correct; implication misleading) |
| **Reason** | The price statement is true, but it **mixes two supply regimes**. When SUT's price exceeded $2.19 during 2025, circulating supply was counted at **2.02M**, giving a market cap of roughly **$4–30M** — not $413M. At its all-time-high price the counted market cap was only ~**$29M** (rank #774). **SUT has never had a top-100-scale market capitalisation on any counted basis** (its highest under the 188.4M basis is roughly $150M). |
| **Effect** | The 5.5× market-cap gap is **real and has never been closed**. The sentence must not be read as "SUT was previously near the top 100". This *strengthens* rather than weakens the gap analysis. |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` p.7 vs `research-baseline.md` §6.5 |

---

### 1.5 ADDED — RWA verification standard (PDF 2, p.5)

| Field | Detail |
|---|---|
| **Existing finding** | §9.4: RWA backing is an **UNVERIFIED CLAIM** — gold and Bolor Geo mine claims unverified, no custody evidence, no attestation, no proof-of-reserve. |
| **New PDF finding** | A concrete peer standard: PAX Gold (#50) — *"1 token = 1 oz of gold held in custody"*; regulated issuers; **regular independent audits of reserves**; redeemability; institutional users. Comparators: XAUt (#34), ONDO (#39), PAXG (#50), XDC (#74). |
| **Decision** | **ADD** |
| **Reason** | Supplies the **testable criteria** the existing RWA gap lacked. Converts "unverified" into a specific, four-part checklist SUT can be measured against: (i) redeemability, (ii) custody, (iii) periodic independent reserve audit, (iv) regulated issuer. |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` p.5 |

---

### 1.6 ADDED (as hypothesis H12) — "price support withdrawal" mechanism (PDF 2, p.7)

| Field | Detail |
|---|---|
| **Existing state** | H5 covered company settlement flows; H3 covered holder selling. **Neither covers demand-side support being withdrawn.** |
| **New PDF finding** | *"[NOT SOUND] Pushing the price or rank … With markets this thin, the price can be pushed up cheaply, but it collapses when support stops. **That is what the three past crashes look like.**"* |
| **Decision** | **ADD as H12**, reframed neutrally and made testable |
| **Reason** | This is a **distinct, testable mechanism** not covered by H1–H11: that buy-side support held the price up and its cessation — not new selling — produced the collapse. It is grounded in documented project activity (buyback at KRW 18,000 / KRW 10bn; "1,000 SUT → 2,000 USDT" offer; the 2026-03-30 "Short-Term SUT Value Surge Strategy"), and it is **directly measurable** from pool buy-side flow. It is also **consistent with a finding from this session** — the distribution pipeline throttled ~70% on May 16, the day before onset. |
| **Neutrality requirement** | The PDF characterises this route as *"market manipulation, which carries legal risk"*. **That is a legal characterisation, not an established finding, and no competent authority has been shown to have made it.** H12 tests only whether buy-side support existed and whether it stopped. The word "manipulation" **must not** attach to H12's findings. |
| **Source** | `research-inputs/PIP_Week_2_thesis.pdf` p.7 |

**Outcome (same cycle): H12 REJECTED for the DEX limb.** The test defined above was executed
2026-09-30. Buy-side flow into the main pool **peaked on May 17** (1,364,855 USDT, 2,801 tx —
the month's maximum) rather than withdrawing, and buy/sell flows are near-identical every day
(monthly totals differ by 0.04%), so **no persistent supporting buyer exists to withdraw**.
The hypothesis was added because it was the only candidate explaining a catalyst-free crash;
it was rejected on its own pre-stated criterion. **The catalyst gap remains open.** CEX-side
support remains DATA UNAVAILABLE. See `research-baseline.md` §7.7b and `hypothesis-matrix.md`
H12.

---

### 1.7 KEPT — items confirmed, not changed

| Existing finding | PDF status | Decision | Reason |
|---|---|---|---|
| Contract `0x98965474…Ca55`, Polygon, 238,403,732 supply | Identical in both PDFs | **KEEP** | Re-confirmed on-chain 2026-09-30 |
| SUT ticker collision (3 tokens) | PDF 1 states it | **KEEP** | Core control, unchanged |
| Top-10 holders ~71% (~50% ex-dead); wallet #1 50M | PDF 1 identical | **KEEP** | Unchanged |
| Bank freeze (2025-04-14), court upholds (2025-04-30) | PDF 1 identical | **KEEP** | L1, L2 unchanged |
| GOPAX caution → delisting; stated reasons `SNIPPET_ONLY` | PDF 1 identical | **KEEP** | L3, L4 unchanged |
| Reported criminal complaint (`SNIPPET_ONLY`, outcome unknown) | PDF 1 identical; PDF 2 p.5 restates as "reported fraud allegations" | **KEEP + QUALIFY** | PDF 2's shorthand drops the "REPORTED/unproven" marker — classification `REPORTED ALLEGATION` is re-asserted |
| Lawyer "Ponzi suspicion" post | PDF 1 marks as opinion | **KEEP** | Classification `OPINION` retained |
| Three supply figures (188.4M / 46.6M / 2.02M) | Both PDFs | **KEEP** | Conflict C3 unchanged |
| Feb 2026 rank jump = accounting change, not growth | Both PDFs state it | **KEEP** | Reinforced by PDF 2 p.4 |
| Unlocked Uniswap liquidity, 4 wallets ~97% | PDF 1 identical | **KEEP** | Unchanged |
| Platform status (ZERO PLUS 50+, AI Studio 48 none, etc.) | PDF 1 identical | **KEEP** | Unchanged |
| Usage claims 2,000+ stores / 40K+ members | Both mark unverified | **KEEP** | `CLAIM` retained |
| Conflict of interest (MUST Company ↔ issuer) | PDF 1 identical | **KEEP** | Disclosure retained |
| CertiK 74.06 BBB + sub-scores; CMC "3.7" not reconciled | PDF 1 identical | **KEEP + QUALIFY** | See 1.8 |

---

### 1.8 QUALIFIED — CertiK snapshot is dynamic, not timeless

| Field | Detail |
|---|---|
| **Existing finding** | CertiK Skynet **74.23** BBB, retrieved 2026-09-30 (this session); Major Holding Ratio 54.25%; holders 54,052; owner field **stale**; percentage fields summing to 130% with unconfirmed meaning (C10) |
| **New PDF finding** | PDF 1 states **74.06** BBB with sub-scores Code 62.9, Fundamentals 49.08, Governance 98, Market 91.72 (29 Sep 2026) |
| **Decision** | **KEEP BOTH — QUALIFY** |
| **Reason** | CertiK is a **dynamic source**. 74.06 (09-29) and 74.23 (09-30) are **both valid at their retrieval times** — a `SOURCE_REVISION`, **not** a contradiction. Neither may be presented as *the* CertiK score without `retrieved_at`. |
| **Standing rules re-asserted** | (i) CertiK's score is **not** CoinMarketCap's "3.7"; (ii) CertiK's Major Holding Ratio 54.25% is **not** our top-10 ~71% — different methodologies; (iii) CertiK's owner field is stale and loses to on-chain state. |
| **Source** | `research-inputs/SUT_Coin_Detail_Research.pdf` p.4 vs `research-baseline.md` §13 |

---

### 1.9 KEPT — all session work preserved unchanged

No PDF content contradicts any finding produced in this session. The following are
**unaffected and retained in full**:

| Session finding | PDF impact |
|---|---|
| H1 REJECTED — BTC −1.5%, ETH −2.1% vs SUT −80.6% | None — PDFs contain no market-control analysis |
| DEX contract-verified OHLCV; onset **May 17 intraday**; May 15 +44% spike | None — PDFs use daily aggregator data only and state "no cause found" |
| Wallet chain SRC→DST 16.58M (not 5.92M); third hop; second funder | None — PDFs do not examine May flows |
| **HOP3 fan-out: 15.2M SUT → 34,349 transfers → 16,607 addresses** | None |
| **Pool sells May 17–18: 2,461,147 SUT into ~$91.7K depth; 0.00% cluster-attributed** | None |
| Seller breadth 10–20× increase | None |
| Router/aggregator caveat on seller attribution | None |
| Dead-pool contamination (~11 stale pools) | None |
| Volume conflict C4 (up to 4.2×) | None |

> **Nothing in the PDFs post-dates or supersedes the on-chain measurements made in this
> session.** The PDFs are desk research using daily aggregator data; both explicitly record
> *"No cause was found for any of the three crashes."* The session's log-level analysis
> **advances beyond** both documents and is retained in full.

---

### 1.10 Net effect on hypotheses

| Hypothesis | Change | Driver |
|---|---|---|
| H2 — Liquidity | **Strengthened** | Peer benchmark: volume/mcap 0.11% vs 12.4% median (~110× worse); even the weakest #90–#110 peer trades ~50× more |
| H4 — Exchange access | **Weakened as stated / risk raised** | Its BitMart limb re-appeared unverified; Q3 unresolved |
| H7 — Weak utility | **Strengthened** | Peer comparison on verifiable-usage, audit, KYC and regulatory standing |
| H10 — Contamination | **Strengthened** | Contamination confirmed **inside internal work product**, not just external feeds |
| **H12 — Support withdrawal** | **NEW** | PDF 2 p.7 mechanism; testable via pool buy-side flow |
| H1, H3, H5, H6, H8, H9, H11 | **Unchanged** | No PDF content bears on them |

---

## Entry 002 — Procedure C1: swaps separated from liquidity operations (2026-09-30)

**Scope:** the single already-defined investigation C1. No new hypotheses, no broadened scope.
**Method:** decoded Uniswap V3 `Swap`/`Mint`/`Burn`/`Collect` events from pool
`0x092295c9…e165`, blocks 86,812,650 → 87,292,543. Pool `token0`/`token1`/`fee` read from the
contract rather than assumed.

| # | Existing finding | C1 finding | Decision | Reason |
|---|---|---|---|---|
| 2.1 | **C14** — gross flow ~$1.36M vs GeckoTerminal $397,989; cause unknown (aggregator undercount *or* LP churn) | Swap buy $378,676 **+ LP mint $986,179 = $1,364,855**, exactly the measured gross inflow ($0 difference); outflow reconciles to 0.24% | **RESOLVED — LP churn** | Arithmetic is exact. Aggregators were not undercounting; the gross-flow proxy was wrong. C14 closed. |
| 2.2 | **Q5 / H2 "LP flight" variant** — untested; predecessor research noted liquidity is unlocked and 4 wallets hold ~97%, so withdrawal was *possible* | Churn rose ~65× (26/30 → 643/679 mints/burns) but **net liquidity positive every crash day**: +$15,911, +$3,667, +$3,053 | **REJECTED** (variant) | Liquidity was re-ranged, not removed. Being *able* to withdraw is not evidence of withdrawing. |
| 2.3 | H2 supported via "2.46M SUT sold into a ~$91.7K pool — exceeded depth by an order of magnitude" | Swap-only sells = **2,086,407 SUT** over May 17–18; **net sell imbalance only ~$26,981 on May 17** against −62.7% | **QUALIFY + STRENGTHEN** | Sell figure corrected (raw transfers had included LP deposits). The mechanism statement is now **stronger and better evidenced**: a ~$27K net imbalance moved price 62.7%. |
| 2.4 | "Selling exceeded available depth by more than an order of magnitude" | The ~$91.7K TVL anchor is a **2026-09-30** figure; **May 2026 pool TVL was never measured** | **WITHDRAWN** | Claim depended on an out-of-window TVL number. The net-imbalance finding (2.3) replaces it and needs no TVL estimate. |
| 2.5 | Sell transactions May 17 = 2,308 (raw transfer count) | **2,175 sell swaps** of **4,341 total swaps**; May 18: 2,259 of 4,392 | **REPLACE** | Transfer count ≠ swap count. Breadth conclusion unchanged (~18× rise in trading events). |
| 2.6 | `block_ts_interpolated` declared "adequate for daily buckets" | Single-day May 17/18 splits diverge from the aggregator in **opposite directions** (1.97× and 0.51×) while the **two-day total agrees within 3.3%** | **QUALIFY → new conflict C15** | Accumulated rate drift shifts activity across midnight on concentrated days. Use two-day aggregates; fetch exact timestamps for single-day or hourly claims. |
| 2.7 | Pool described as "SUT/USDT0" | `token1` = `0xc2132d05…58e8f`, **canonical Polygon PoS USDT**; token0 = SUT; fee 1.00% | **CLARIFY** | Naming only; no analytical change. Confirms the buy/sell direction logic used in §7.7b was correct. |
| 2.8 | Evidence model had no rule distinguishing pool flow from volume | Added §6.1a **gross token flow ≠ trading volume**, §6.1b interpolation limits, tests `T-VOL-1`, `T-VOL-2`, `T-TS-4` | **ADD** | The C14 false conflict was caused by the missing rule; it is now structurally prevented. |

**Not changed by C1** (per instruction): token identity; settled hypotheses H1, H3a, H6, H12;
wallet classifications (all remain `UNKNOWN`); source hierarchy; evidence rules other than the
additions in 2.8.

**Net hypothesis effect:** **H2 strengthened and sharpened** (depth-exhaustion mechanism
measured; LP-flight variant rejected). No other hypothesis status changed. **No new hypothesis
was added** — no evidence contradiction forced one.

---

## How to add future entries

One entry per integration event, numbered sequentially. Every row must carry: existing
finding · new finding · decision · reason · source. **A `REJECT` must state what evidence
overrides the rejected claim**, and a `REPLACE` must record the superseded value so the
correction remains auditable (`evidence-model.md` §6).
