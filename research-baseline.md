# SUT Value Forensics — Research Baseline

**Status:** Living baseline. Supersedes nothing; extends `SUT-Value-Forensics-Research-Handoff/`.
**Prepared:** 2026-09-30
**Predecessor research (preserved, unmodified):**
- `SUT-Value-Forensics-Research-Handoff/SUT-Value-Forensics-Research-Handoff.md`
- `SUT-Value-Forensics-Research-Handoff/sut-coin-research-2026-09-29.txt` (v2)
- `SUT-Value-Forensics-Research-Handoff/sut-trust-analysis-2026-09-29.txt`
- `SUT-Value-Forensics-Research-Handoff/sut-top100-validation-plan-2026-09-29.txt`
- `SUT-Value-Forensics-Research-Handoff/CLAUDE-CONTINUE-PROMPT.md`

**Additional inputs integrated 2026-09-30** (reconciliation recorded in `research-change-log.md`):
- `research-inputs/SUT_Coin_Detail_Research.pdf` — **DUPLICATE** of `sut-coin-research-2026-09-29.txt`
  (same content in PDF form; **not** an independent source — do not double-count)
- `research-inputs/PIP_Week_2_thesis.pdf` (30 Sep 2026) — new material: top-100 peer benchmark
  (§6.6–6.7), RWA verification standard (§9.4). **Two claims rejected** — see §11.7, §11.8.

> **Reading rule.** Nothing here replaces the predecessor research. Where this file changes
> a prior number, the change is listed explicitly in §11 *Corrections*, with both old and
> new values and the reason. Where two sources disagree and neither is demonstrably wrong,
> **both are kept** in §10 *Contradictions & data conflicts*.

---

## 1. Project identity

### 1.1 The asset under investigation

| Field | Value | Confidence |
|---|---|---|
| Name | SuperTrust / SUPER TRUST ("Super Trust" per on-chain metadata) | VERIFIED |
| Symbol | SUT | VERIFIED |
| Chain | Polygon PoS (chainId 137) | VERIFIED |
| Contract | `0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55` | VERIFIED |
| Standard | ERC-20, 18 decimals | VERIFIED |
| Deployed | 2024-01-29 | VERIFIED (predecessor research) |
| Total supply | 238,403,732 SUT | VERIFIED (on-chain, re-checked 2026-09-30) |

**Re-verified 2026-09-30** via Blockscout `api/v2/tokens/0x98965474...`:
`total_supply = 238403732000000000000000000` (= 238,403,732 × 10^18), `decimals = 18`,
`symbol = SUT`, `name = "Super Trust"`, `holders_count = 56241`, `circulating_supply = null`.

### 1.2 THE TOKEN IDENTITY RULE (mandatory, non-negotiable)

**The ticker `SUT` does not identify this asset.** At least three unrelated tokens use it:

| Token | Chain | Note |
|---|---|---|
| **SuperTrust (SUT)** | Polygon `0x98965474…Ca55` | **This investigation** |
| Super Useless Token | Polygon | "MORCHI" mini-game token |
| Sanity United (SUT) | Ethereum | Listed/delisted by BitMart 2026; later swapped to token "SU" |

Every data point entering this project **must** carry: token symbol, token contract, chain,
exchange, trading pair, source, source URL, `retrieved_at`, and `observation_time`. A source
that cannot be mapped to the contract above is recorded as
**DATA UNAVAILABLE / IDENTITY NOT VERIFIED** and is *not* silently included.

This rule exists because a real misattribution already occurred — see §11.1.

### 1.3 Entities (from predecessor research; not re-verified this cycle)

| Role | Entity | Confidence |
|---|---|---|
| Issuer | MUST COMPANY SG PTE. LTD. (Singapore, UEN 202313835R, inc. 2023-04-11) | SECONDARY (third-party registry copy, not ACRA direct) |
| Operator | 주식회사 슈퍼트러스트 / SUPERTRUST Co., Ltd. (Korea, BRN 559-87-02646, founded 2022-08-12) | SECONDARY |
| CEO | Kim Hak-eung (김학응) | SECONDARY (ESG경제, Oct 2025) |
| Claimed advisors | TON Network, Outlier Ventures | **UNVERIFIED — could not be found** |
| Claimed partner | Victus Capital | **UNVERIFIED** |

**Declared conflict of interest (preserved):** the issuer's name and Singapore address appear
in the footer of `must.company`, the website of the organisation that produced this research.
This must remain disclosed in any output.

---

## 2. Current research state

| Area | State |
|---|---|
| Token identity | **Resolved and re-verified.** Contract-level control defined. |
| Contract properties | **Resolved** (predecessor research, on-chain verified). |
| May 2026 price event | **Resolved across three independent sources**, one of them contract-identity-verified (added this cycle). |
| Broad-market control (H1) | **Newly resolved this cycle** — quantified, §6.2. |
| Wallet flow | **Materially advanced** — chain extended 2 → ≥3 hops; volume corrected ~2.8× upward; destination *behaviour* characterised. Terminal economic outcome still open. |
| CEX depth/spread history for May 2026 | **DATA UNAVAILABLE** — no public retroactive source identified. |
| Per-venue May 2026 volume | **OPEN** |
| SoloPay / SuperSave economics | **DATA UNAVAILABLE** — no access. |
| Legal/regulatory primary records | **OPEN** — only secondary reporting and snippets held. |
| RWA backing | **UNVERIFIED claim** (§9.4). |

---

## 3. Source hierarchy

Strongest available source wins per data type. Full rules in `data-source-contract.md`.

**Tier 1 — Primary / on-chain (identity-safe: queried *by contract address*)**
Polygon RPC (drpc.org, publicnode, Blockscout eth-rpc), Blockscout API, Sourcify,
GeckoTerminal & DexScreener (contract-keyed), verified contract events.

**Tier 2 — Primary documentary**
Official SuperTrust notices, official exchange announcements, whitepaper, GOPAX review PDFs,
court/registry records.

**Tier 3 — Independent market aggregators (ticker/slug-keyed → identity risk)**
CoinGecko, CoinMarketCap, Coinranking, CoinCodex, CoinLore, Gate.

**Tier 4 — Secondary reporting / opinion**
Korean news media, lawyer posts, community analyses. Never promoted to fact silently.

---

## 4. Verified facts (on-chain / contract)

All items were established in predecessor research; ✅RE-CHECKED = independently
re-confirmed 2026-09-30.

| # | Fact | Status |
|---|---|---|
| F1 | Contract `0x98965474…Ca55` on Polygon is SuperTrust SUT | VERIFIED ✅RE-CHECKED |
| F2 | Source code verified (Blockscout full match; Sourcify exact match) | VERIFIED |
| F3 | Deployed 2024-01-29; all 238,403,732 SUT created once at deployment | VERIFIED |
| F4 | **Minting not available** after deployment | VERIFIED |
| F5 | **No fees / no tax** | VERIFIED |
| F6 | **No blacklist** | VERIFIED |
| F7 | **Not a proxy** — code cannot be swapped | VERIFIED |
| F8 | Only admin power was pause/unpause | VERIFIED |
| F9 | 50,000,000 SUT sent to `0x…dEaD` on 2024-03-19 | VERIFIED |
| F10 | `totalSupply` **still reads 238,403,732** — the "burn" did not reduce it | VERIFIED ✅RE-CHECKED |
| F11 | Ownership **renounced 2026-07-20** (tx `0xf52d0924…acc7d`); owner now `0x000…000`; not paused; **nobody can pause it now** | VERIFIED |
| F12 | Ownership transferred 2025-08-27, 2025-09-25, 2026-06-21 before renunciation | VERIFIED |
| F13 | All tokens moved creator → `0xc4e930…3ece` on 2024-01-30 and were distributed from there; that wallet's balance is now 0 | VERIFIED (role = **UNKNOWN**; "team/treasury" is an inference, *not* established) |
| F14 | GoPlus live check: no honeypot, not mintable, not proxy, no blacklist, no hidden owner, no fees | VERIFIED |

**Temporal discipline on F4–F11.** Pre-renunciation state (pause live, owner active) and
post-renunciation state are *different states of the same contract*. The 2024 GOPAX/audit-era
description of a pause function was accurate **then**. Any admin-risk statement must be dated.

> **Material for this case:** during the **May 2026 crash window the contract was still owned
> and still pausable.** Renunciation came 2026-07-20, two months later. The "ownership
> renounced" reassurance does **not** apply to May 2026.

---

## 5. Supply findings

### 5.1 The three circulating-supply figures

| Figure | Attributed to | Note |
|---|---:|---|
| 188,403,732 | CoinMarketCap (from 2026-02-10) | = 238,403,732 − 50,000,000 (dead address) |
| 46,588,062 | "self-reported by the project to CMC" (`sut-coin-research` v2) | **conflicts with the notice below** |
| 2,024,492(.29) | older figure; still used by CoinLore | CMC's figure until 2026-02-09 |

**DATA CONFLICT (unresolved).** The handoff (§2.2) states an official notice dated
**2026-02-06** asked CoinMarketCap to correct circulating supply *from* 2,024,492.29 *to*
**188,403,732**. `sut-coin-research` v2 states the project's own report to CMC was **46.6M**.
These cannot both be the project's position without explanation (different dates? different
definitions — "distributed" vs "circulating" vs "unlocked"?). **Both preserved.** Resolution
requires re-reading the primary notice. See §10-C3.

### 5.2 The float question (derived observation — flagged as INFERENCE)

- Total created: 238,403,732
- Dead address: −50,000,000 → **188,403,732** (the CMC "circulating" figure)
- Project announced (2025-08-24) a **50,000,000 SUT lock-up until 2045**
- Holder #1 `0xbc0e5c…6144` holds exactly 50,000,000, received 2025-10-21

**INFERENCE (NOT VERIFIED):** if the 50M lock-up is the balance in `0xbc0e5c…6144`, that 50M
sits *inside* the 188.4M "circulating" figure, and true free float would be at most ~138.4M.
**Unconfirmed.** The predecessor research explicitly marks the lock-up↔wallet mapping as
unconfirmed, and **no on-chain time-lock contract has been identified** (holding tokens in an
EOA is not a lock). Recorded as open question §12-Q4, not as a finding.

### 5.3 Contradicted distribution claim

GOPAX's Dec 2024 review recorded the **foundation holding 90M SUT (47.8%)**, contradicting the
project's "zero reserve / 100% private sale" claim. Preserved as documented contradiction
(§10-C7), not adjudicated.

---

## 6. Market findings

### 6.1 The May 2026 event — three independent series

Predecessor research supplied CoinGecko and Coinranking daily closes. **This cycle adds a
third, contract-identity-verified series:** daily OHLCV from the Uniswap V3 `SUT/USDT 1%` pool
`0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165`, queried via GeckoTerminal **by contract
address** — therefore structurally immune to the SUT ticker collision.

| Date | CoinGecko close | Coinranking close | **DEX close** | **DEX intraday low** | **DEX vol USD** |
|---|---:|---:|---:|---:|---:|
| May 12 | 0.622627 | 0.624 | 0.6176 | 0.5150 | 84,172 |
| May 13 | 0.630649 | 0.628 | 0.6380 | 0.5939 | 59,202 |
| May 14 | 0.634806 | 0.633 | 0.6240 | 0.6117 | 32,390 |
| May 15 | 0.682996 | 0.683 | **0.6920** | 0.6213 | **244,781** |
| May 16 | 0.680758 | 0.679 | **0.6737** | 0.6511 | 39,897 |
| **May 17** | **0.478317** | **0.482** | **0.4756** | **0.2511** | **397,989** |
| **May 18** | **0.124481** | **0.131** | **0.1308** | **0.1145** | **712,616** |
| May 19 | 0.152232 | 0.150 | 0.1491 | **0.1022** | 185,298 |
| May 20 | 0.306516 | 0.307 | 0.3124 | 0.1368 | 274,470 |
| May 21 | — | — | 0.3450 | 0.2971 | 240,229 |
| May 25 | — | — | 0.2170 | 0.2008 | 38,926 |

**Findings:**

1. **Price is robust across all three sources.** Closes agree within ~1–5%. The May 17–18
   collapse is not a single-provider artifact.
2. **NEW — the event begins on May 17 *intraday*, not May 18.** DEX May 17: open 0.6737,
   **low 0.2511** (−62.7% intraday), close 0.4756. A violent intraday collapse with partial
   same-day recovery *precedes* the May 18 continuation. Daily-close series hide this.
   **Event onset should be modelled from 2026-05-17 at hourly resolution.**
3. **NEW — May 15 anomaly.** DEX high 0.9012 vs open 0.6240 (+44% intraday), volume $244,781
   ≈ 6× the surrounding average, closing back at 0.6920. An unexplained upward spike two days
   before the collapse.
4. **NEW — ATL conflict.** DEX May 19 intraday low **0.1022** is *below* the $0.113–$0.116 ATL
   cited by aggregators (§10-C5).
5. **Volume disagreement is severe** (§10-C4). On May 17 CoinGecko reports total volume
   $420,380 while this **single DEX pool alone** did $397,989 — CoinGecko's whole-market figure
   barely exceeds one pool. Either CoinGecko under-captures DEX volume or the CEX venues were
   near-dead that day. **Unresolved and material.**
6. **Pre-window stress existed.** April 27 (DEX): open 0.6199, low 0.4197 — a −32% intraday
   excursion that recovered. The May 17 pattern is an amplified version of behaviour already
   present in late April, suggesting a fragile book rather than a single novel shock.

### 6.2 Broad-market control — H1 resolved this cycle

Fetched 2026-09-30, CoinGecko `market_chart/range` (BTC, ETH, USD, daily):

| Asset | May 16 | May 18 | Change |
|---|---:|---:|---:|
| BTC | 78,161.07 | 77,016.44 | **−1.5%** |
| ETH | 2,179.90 | 2,134.55 | **−2.1%** |
| **SUT (DEX close)** | **0.6737** | **0.1308** | **−80.6%** |

Over the full window (Apr 30 → May 25) BTC ranged 99.3–103.8 index, ETH 91.9–103.1 — a mild,
orderly drift. **There was no broad crypto market crash on 2026-05-17/18.**

**H1 (broad crypto market conditions) is REJECTED as a sufficient explanation.** SUT's move is
roughly 40–55× the control assets' magnitude over identical hours. H1 is retained only as a
minor background variable.

### 6.3 Market structure (2026-09-29/30)

| Metric | Value | Source | Retrieved |
|---|---|---|---|
| Price | ~$0.398–$0.4026 | CMC / CoinGecko / CoinCodex / Blockscout / CertiK | 2026-09-29/30 |
| Market cap | ~$75.0M–$75.9M (on 188.4M circ.) | CMC / CertiK | 2026-09-29/30 |
| FDV | ~$94.8M–$95.2M | CMC / CoinGecko | 2026-09-29 |
| 24h volume | $65K–$107K | CMC / Blockscout ($95.5K) / CertiK ($107.26K) | 2026-09-29/30 |
| Volume / mcap | ~0.1% | derived | 2026-09-29 |
| Holders | **54,052 (CertiK) vs 56,241 (Blockscout)** | conflict §10-C1 | 2026-09-30 |
| Main DEX pool liquidity | $91,680 | GeckoTerminal (by contract) | 2026-09-30 |
| Gate order-book depth ±2% | +$4.4K / −$12.0K | predecessor research | 2026-09-29 |

> **Market capitalisation ≠ available liquidity.** A ~$75M displayed market cap sits on a
> ~$91.7K DEX pool and a ±2% CEX book of ~$4.4K/−$12.0K. The displayed cap is a
> supply × price arithmetic product, not value that could be realised. **This distinction is
> central to the May crash investigation** and is formalised as H2.

### 6.4 NEW — dead-pool contamination risk

GeckoTerminal (by contract, 2026-09-30) returns **one economically live pool** and ~11
near-dormant pools with **stale, wildly divergent last prices**: $0.3500, $0.3915, $0.7060,
$0.6559, $0.8604, $1.2025, $1.0006, and $0.0894 (POL/SUT) — all with $0.00 24h volume. Any
aggregator naively averaging pool prices would produce a badly wrong SUT price. **A live
data-integrity hazard** and a candidate partial explanation for cross-provider disagreement.
Recorded as a data-source control, not a finding about the crash.

### 6.5 Rank history — not organic

| Date | Rank | Circulating counted |
|---|---|---|
| 2026-02-09 | #2,049 | 2.02M |
| **2026-02-10** | **#299** | **188.4M** |

Same price (~$0.60). **The Feb 2026 rank jump was a supply-counting change and must never be
presented as adoption growth.** Preserved unchanged.

### 6.6 NEW — peer benchmark vs the top-100 band

**Source:** `research-inputs/PIP_Week_2_thesis.pdf` pp.3–4 (CoinMarketCap live listing data,
observation_time 2026-09-29/30). **Confidence:** `SECONDARY` — single-source, peer figures
ticker/slug-keyed and not independently verified.

| Metric | Top-100 band (#90–#110) | SUT (#301) | Gap |
|---|---|---|---|
| Market cap to enter top 100 | **$413M** (#100, Bitcoin SV) | $75M | **~5.5×** |
| Implied price required | ~$2.19 | $0.398 | ~5.5× |
| Daily volume (median) | **$46M** | ~$0.08M | **~600×** |
| Volume / market cap (median) | **12.4%** | **0.11%** | **~110×** |
| Lowest daily volume in the band | $4.1M (meme coin, #93) | ~$0.08M | **~50×** |
| Security audit / verified team | common | **none** | qualitative |
| Tier-1 exchange listings | most (Binance, Coinbase…) | Gate, KuCoin, BingX, Uniswap | qualitative |

**Why this matters to the forensic case, not just to the ranking question.** The peer data
converts "SUT is illiquid" from an assertion into a **measured, peer-relative** fact:
**even the least-traded coin in the #90–#110 band turns over ~50× more per day than SUT**,
and the median peer's volume/market-cap ratio is **~110× higher**. This is independent
external corroboration of **H2**'s premise — that SUT's displayed capitalisation rests on
structurally abnormal, not merely small, liquidity.

**Qualification on the "SUT traded above $2.19 in 2025" claim (PDF 2, p.7).** The arithmetic
is right ($2.19 × 188.4M ≈ $413M) but it **mixes two supply regimes**. When SUT's price
exceeded $2.19 during 2025, circulating supply was counted at **2.02M**, so its market cap was
roughly **$4–30M** — at the all-time-high price, only ~**$29M** (rank #774). **SUT has never
held a top-100-scale market capitalisation on any counted basis**; its highest under the
188.4M basis is roughly $150M. The 5.5× gap has never been closed. See
`research-change-log.md` §1.4.

### 6.7 NEW — what top-100 peers have that SUT does not (qualitative benchmark)

From the same source (pp.5–7), preserved as a structural gap list:

| Success factor | Typical top-100 coin | SUT today |
|---|---|---|
| Deep, real trading | $5M–$200M+/day | ~$0.07–0.08M/day |
| Major exchange listings | Binance, Coinbase, OKX | Gate, KuCoin, BingX; **delisted from GOPAX; no longer traded on MEXC** |
| Independent security audit | Yes, published | **None** (CertiK: not audited) |
| Known, identity-checked team | Public, often venture-backed | **No KYC**; advisors unverifiable |
| Clear regulatory standing | Licensed issuers, especially for RWAs | Bank freeze + a **reported** criminal complaint |
| Verifiable usage | Locked value / payment volume / active users, on-chain | **Company claims only** |
| Real asset backing (RWA) | Audited reserves, redeemable | Gold and mine claims **unverified** |
| Open access | Anyone can build or use | Useful mainly on one operator's platforms, in Korea |
| Honest data | One consistent supply figure | **Three conflicting supply figures** |
| Spread-out holdings | Wide ownership | **Top 10 ≈ 71%** |

---

## 7. On-chain findings — holders and the May wallet chain

### 7.1 Holder concentration (2026-09-29 snapshot, predecessor research)

Top 10 ≈ **71%** of total supply (≈50% excluding the dead address).

| # | Address | Amount | % |
|---|---|---:|---:|
| 1 | `0xbc0e5c…6144` | 50,000,000 | 20.97% |
| 2 | `0x…dEaD` | 50,000,000 | 20.97% |
| 3 | `0xd6eac4…7e81` | 18.0M | 7.55% |
| 4 | **`0xaaa4d5…cc2c`** | **13.1M** | **5.51%** |
| 5 | **`0xf46e16…7bc8`** | **10.3M** | **4.31%** |
| 6 | `0x29da84…f841` | 10.0M | 4.19% |
| 7 | `0x8b2fdf…bb72` | 10.0M | 4.19% |
| 8–10 | — | — | 1–1.5% each |

**No top holder is a labelled exchange or liquidity pool. None has a public label.**
Holder #4 is the **source wallet** of the May chain; holder #5 also appears inside the cluster
(§7.3).

### 7.2 NEW — the May 2026 wallet chain (materially extended this cycle)

**Method.** Blockscout `api/v2/addresses/{addr}/token-transfers?type=ERC-20&token=0x98965474…Ca55`,
paginated, retrieved 2026-09-30; supplemented by `eth_getLogs` Transfer-topic filtering over
Polygon blocks 86,236,778 → 87,436,510 (= 2026-05-01T00:00:00Z → 2026-05-26T00:00:01Z, block
timestamps resolved by RPC). Window: 2026-05-01 → 2026-05-25. All amounts SUT.

**All addresses in the chain are unlabelled externally-owned accounts**
(`is_contract: false`, `is_verified: false`, `public_tags: []`, `name: null`).
**Their roles are `UNKNOWN`.**

```
  SRC   0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c        (top-10 holder #4)
    │    16,580,000 SUT  (May 1–17, near-daily)
    ▼
  DST   0x7CC2F8914b4D77b68355757286f146373F4BF7ad
    │    IN 19,007,099 SUT (31 tx)  /  OUT 16,523,928 SUT (78 tx)
    │    ├── 15,200,000 SUT (29 tx) ──► HOP3  0xe6e7ec8d…ff85
    │    ├──  1,271,722 SUT (42 tx) ──► back to SRC  (circular)
    │    └──     52,206 SUT  (7 tx) ──► 4 other addresses
    │    also inbound: 2,303,367 SUT from 0x0d070796…92fe  (second funder)
    ▼
  HOP3  0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85
         unlabelled EOA · currently holds ~no SUT · fan-out distribution hub (§7.3)
```

**(a) CORRECTION — the flow is ~2.8× larger than the handoff recorded.**

| | Handoff | Corrected | Basis |
|---|---:|---:|---|
| SRC→DST SUT, May 2026 | ~5,920,000 (6 transfers, May 9–17) | **16,580,000** | full paginated transfer history, 2026-09-30 |

The handoff's six transfers are real and are a subset. **The handoff figures are not
withdrawn — they were incomplete.**

**(b) DST is a conduit, not a holder.** It received 19.0M and forwarded 16.5M in the same
window. Its SUT balance today is **18,604.23 SUT** — effectively nothing. The received SUT did
**not** stay.

**(c) NEW third hop.** 15.2M SUT — 92% of DST's outflow — went to a **single previously
unidentified address**, `0xe6e7ec8d…ff85`, across 29 transactions.

**(d) NEW — the pipeline halts exactly at the crash.** DST outflow ran continuously
0.1M–2.0M *every single day* from May 1 to May 15. Then:

| Date | IN | OUT | Net |
|---|---:|---:|---:|
| May 13 | 925,872 | 1,500,000 | −574,128 |
| May 14 | 1,090,000 | 1,005,036 | +84,964 |
| May 15 | 3,582,223 | 2,000,132 | +1,582,091 |
| May 16 | 440,000 | **0** | +440,000 |
| **May 17** | 253,863 | **0** | +253,863 |
| May 18 | 0 | **0** | 0 |
| **May 19** | 0 | **1,000,000** | −1,000,000 |
| May 20–25 | 0 | 0 | 0 |

Outflows stop on **May 16** — the day *before* crash onset — and the mechanism does not move
again until a single 1,000,000 SUT outflow on **May 19**, the day *after* the low. May 15,
the day of the anomalous +44% intraday price spike, is also the chain's largest day
(3.58M in / 2.00M out).

> **This timing is a correlation, not a cause.** A pipeline stopping *before* a crash is at
> least as consistent with "the operator saw something and stopped", or "an upstream funding
> source stopped", as with "the stopping caused the crash" — and is also consistent with
> coincidence. **No causal claim is made.** Logged as the highest-priority lead in
> `may-2026-investigation-plan.md`.

**(e) Second inbound funder.** `0x0d0707963952f2fba59dd06f2b425ace40b492fe` sent DST
2,303,367 SUT in the window — a previously unrecorded upstream source.

**(f) Circular component.** 1,271,722 SUT returned DST→SRC across 42 transactions — recycling,
not pure one-way distribution.

**(g) Scale context.** 16.58M SUT at the pre-crash price (~$0.67) is nominally ~$11.1M —
against a main DEX pool of ~$91.7K and a Gate ±2% book of ~$4.4K/−$12.0K. **The quantity moved
through this chain in May exceeds every observable venue's liquidity by two to three orders of
magnitude.** What fraction (if any) reached a market is **not yet established** and is the
decisive open question (§12-Q1, Q2).

### 7.3 NEW — what kind of address HOP3 is (behavioural characterisation)

Sample: HOP3's SUT transfers 2026-06-19 → 2026-09-30 (2,000 transfers, retrieved 2026-09-30).

| | Count | Total SUT | Distinct counterparties |
|---|---:|---:|---:|
| Inbound | **8 tx** | 2,271,289 | **5** |
| Outbound | **1,994 tx** | 2,739,079 | **784** |

Outbound amount: **median 1,876 SUT** (≈ $750 at $0.40), min ~0, max 95,524.

**Interpretation — a fan-out distribution hub.** A few large concentrated inflows are broken
into ~2,000 small payments to ~784 distinct recipients at retail-scale amounts. This is the
signature of a **payout / reward / user-withdrawal distribution system**, not of an exchange
deposit address or a DEX sell pipeline.

> **This evidence cuts AGAINST a naive "insider dumping" reading** and must be reported as
> such. It does **not** establish an innocent explanation either. Role remains **UNKNOWN**.
> **The May-window behaviour has now been measured directly — see §7.5.**

**Cluster observations:**
- HOP3's largest inbound sender *and* largest outbound recipient in the sample is **SRC**
  (`0xaaa4d5…cc2c`): 1,960,000 SUT in, 2,076,702 SUT out. SRC ↔ HOP3 is **bidirectional**.
- **Top-10 holder #5** `0xf46e16da…7bc8` (10.3M, 4.31%) appears as an inbound sender to HOP3
  (76,280 SUT) — a second top-10 holder inside the same operational cluster.
- DST also sends to HOP3 outside May (46,878 SUT in the sample period).

Taken together, SRC, DST, HOP3 and at least two top-10 holders form **one interconnected
operational cluster** that recycles SUT among itself and fans it out to hundreds of retail-scale
addresses. **No ownership, control, or corporate role is established for any of them.**

### 7.5 NEW — Q1 RESOLVED: what the 15.2M SUT actually did in May

**Method.** `eth_getLogs`, Transfer topic, SUT contract, Polygon blocks 86,236,778 →
87,436,510 (2026-05-01 → 2026-05-26), `topic1`/`topic2` = HOP3. Retrieved 2026-09-30.
Daily bucketing uses `block_ts_interpolated` (§14.9).

| HOP3, May 1–25 | Transfers | Total SUT |
|---|---:|---:|
| **Inbound** | **31** (29 of them from DST) | **15,200,471** |
| **Outbound** | **34,349** | **15,332,008** |

Average outbound transfer: **~446 SUT** (≈ $270 at pre-crash price). Largest single May
recipient: **158,598 SUT** — ~1% of the total. **No DEX pool, router, or identifiable
exchange deposit address appears among the top recipients.**

**Finding: the chain terminates in a very large retail fan-out, not in a market sale.**
The 15.2M SUT that moved SRC → DST → HOP3 was distributed to **thousands of distinct
addresses in ~34,000 small transfers**, at a rate of roughly **1,000,000 SUT per day**
(≈$600K/day at pre-crash prices) throughout May 1–15.

| Date | SUT distributed | Transfers |
|---|---:|---:|
| May 05 | 1,272,979 | 2,830 |
| May 13 | 1,134,184 | 2,317 |
| May 14 | 1,158,991 | 2,677 |
| May 15 | 930,073 | 1,967 |
| **May 16** | **270,574** | **651** |
| **May 17** | **261,258** | **587** |
| **May 18** | **275,777** | **405** |
| May 19 | 158,406 | 323 |
| May 20 | 290,369 | 946 |
| May 22 | 48,158 | 175 |
| May 25 | 42,071 | 131 |

**Implications — these change the weighting of the hypotheses:**

1. **The concentrated-dump reading of H3 is substantially weakened.** The tokens were not
   sold by a large holder into a venue; they were dispersed to thousands of small addresses.
   Whatever sell pressure existed was **diffuse**, not concentrated.
2. **A continuous, quantified supply mechanism is now visible.** ~1M SUT/day was being
   delivered into retail hands against a main pool of ~$91.7K. **If even a small fraction of
   recipients sold promptly, that alone would exceed pool depth daily.** This is a
   *mechanism*, not a finding — whether recipients sold is **not yet measured** (§12-Q16).
3. **The distribution rate collapsed ~70% on May 16** (2,000–2,800 tx/day → 651), the day
   before crash onset, and never recovered (down to 52–175 tx/day by May 22–25). The
   pipeline did not merely pause — **the entire distribution system throttled down and
   stayed down.**
4. **The earlier "outflow stopped" observation (§7.2d) was DST-specific, not system-wide.**
   DST's forwarding stopped on May 16; HOP3 kept distributing from its existing balance at a
   much reduced rate. Both are real; they describe different stages of the same pipeline.

> **No causal claim.** The distribution throttle and the crash are contemporaneous. Direction
> of causation is not determined. Reduced distribution could be a response to the price
> collapse, a cause of it, or independent of it.

### 7.6 NEW — Q2 RESOLVED: who actually sold into the market

**Method.** `eth_getLogs`, Transfer topic, SUT contract, blocks 86,236,778 → 87,436,510,
`topic2` = main pool `0x092295c9…e165`. This captures **SUT sent into the pool** — i.e. sells.
Retrieved 2026-09-30.

**Total May 1–25: 11,664 transfers, 5,453,204 SUT sold into the pool by 525 distinct addresses.**

| Date | SUT sold into pool | Transfers |
|---|---:|---:|
| May 1–9 (typical) | 11,000 – 37,000 | 50 – 256 |
| May 15 | 149,856 | 568 |
| May 16 | 45,074 | 151 |
| **May 17** | **1,238,819** | **2,308** |
| **May 18** | **1,222,328** | **2,373** |
| May 19 | 500,046 | 663 |
| May 20 | 745,559 | 1,700 |
| May 21 | 340,126 | 735 |
| May 25 | 118,557 | 201 |

**Findings:**

**(a) The crash mechanism is now directly measured.** Sell volume into the pool jumped
**~27×** from May 16 (45,074 SUT) to May 17 (1,238,819 SUT). Across May 17–18,
**2,461,147 SUT** — nominally ~$1.5M at the pre-crash price — was sold into a pool holding
roughly **$91.7K** of liquidity. **The selling exceeded pool depth by more than an order of
magnitude.** This is H2's amplification mechanism observed directly, not inferred.

**(b) The selling was broad, not concentrated.** Transaction count rose from a ~50–250/day
baseline to **2,308 and 2,373** on May 17 and 18 — a 10–20× increase in the *number* of sell
transactions. This is the signature of **many participants exiting**, not one seller
distributing.

**(c) ⚠ NO cluster address sold into the pool — 0 SUT, 0.00% of all pool inflow.**
Neither SRC, DST, HOP3, nor the second funder ever sent SUT into the main pool during May.
**This further rejects H3a (concentrated dumping).**

> **Essential caveat.** This measures *direct* transfers to the pool. A sale routed through an
> aggregator appears as the **router's** address, not the seller's. It is therefore proof that
> the cluster did not sell *directly*, **not** proof that it never sold. Balances corroborate
> the direct finding — HOP3's May inflow (15,200,471) and outflow (15,332,008) nearly match,
> and its outflow went to retail-sized recipients — but router-mediated and CEX sales remain
> unattributable by this method.

**(d) ⚠ The top "sellers" are infrastructure, not people.** The largest pool senders are
**contracts**, including `PolygonSettler` (1,826,279 SUT) and four other unnamed contracts —
routers/aggregators/settlement contracts that bundle many users' trades. **The "525 distinct
sellers" figure therefore understates the true number of economic sellers**, and per-address
volume rankings must never be read as "the biggest seller was X".

### 7.7 NEW — did the distributed tokens come back as selling? (Q16, partial)

Intersecting the **16,607 distinct May fan-out recipients** with the 525 pool senders:

| Measure | Value |
|---|---:|
| Fan-out recipients that also sold directly into the pool | **325** |
| Those 325 as a share of all distinct pool senders | **61.9%** |
| SUT those 325 received from the fan-out | 780,343 |
| SUT those 325 sent into the pool | **103,474** |
| Their sells as a share of all May pool inflow | **1.9%** |
| **Share of all distributed SUT that reached the pool directly** | **0.67%** |

**Two readings, both true, and they must be reported together:**

1. **By participant count, the distribution recipients *are* the retail sellers** — 62% of all
   distinct direct pool sellers had received SUT from the fan-out.
2. **By volume, direct sell-through was low — 0.67%** of distributed tokens reached the pool
   directly. Most recipients did **not** directly dump what they received during May.

> **This 0.67% is a LOWER BOUND, and probably a substantial underestimate.** It excludes
> (i) sales routed through aggregators — which §7.6d shows carry most of the volume,
> (ii) sales on centralised exchanges, and (iii) onward transfers then sold by a third party.
> **True recipient sell-through is NOT measured.** Q16 remains open; only its floor is known.

### 7.7b NEW — buy-side flow across the crash (H12 test, 2026-09-30)

**Method.** `eth_getLogs`, Transfer topic, quote asset USDT (`0xc2132D05…58e8F`, 6 dp), blocks
86,236,778 → 87,436,510, `topic2`/`topic1` = main pool. Daily buckets via
`block_ts_interpolated`.

| Date | USDT **into** pool | tx | USDT **out** | tx |
|---|---:|---:|---:|---:|
| May 15 | 191,977 | 542 | 194,900 | 617 |
| May 16 | 35,113 | 139 | 32,501 | 162 |
| **May 17** | **1,364,855** | **2,801** | **1,379,239** | **2,829** |
| May 18 | 278,236 | 2,299 | 279,969 | 2,437 |
| May 19 | 84,634 | 717 | 81,161 | 668 |
| May 20 | 209,646 | 1,717 | 192,054 | 1,718 |
| **May 1–25 total** | **3,500,193** | **12,726** | **3,501,441** | **12,763** |

**Findings:**

**(a) Buy-side did not withdraw before the crash — it peaked during it.** May 17 buy-side flow
was the month's maximum. **H12 (withdrawal of price support) is REJECTED for the DEX limb** on
its pre-stated criterion.

**(b) No persistent net-buyer exists to withdraw.** Inflow and outflow are near-identical
*every day* (monthly totals differ by 0.04%). This is balanced two-way flow — the signature of
routine trading and arbitrage, **not** of a supporting buyer absorbing supply.

**(c) Buyers were present in force during the collapse** — 2,801 buy transactions on May 17 —
and price still fell 62.7% intraday. **Selling overwhelmed substantial active buying.** This
strengthens H2 (depth failure) and H11 (broad two-sided participation event) and further
weakens any one-sided-dump reading.

> **Caveat — these are gross pool flows, not pure volume.** Raw quote-asset transfers into a
> pool include liquidity additions (`Mint`) as well as swap payments, and transfers out include
> `Burn`. Separating them is **procedure C1 / Q5, still pending**. The conclusion in (a)–(b) is
> robust to this — an LP add/remove would not create the observed daily in/out symmetry across
> 25 consecutive days — but the absolute figures must not be quoted as trading volume.

**(d) NEW DATA CONFLICT — C14.** Gross on-chain quote-asset flow on May 17 (~$1.36M each way)
is **~3.4× GeckoTerminal's reported daily volume for that pool ($397,989)**, even though the
monthly totals are broadly consistent ($3.50M vs ~$3.01M). Either aggregator volume
**materially undercounts the event days**, or LP `Mint`/`Burn` activity inflates the raw flow
on those days — the two candidates are distinguished by procedure C1. **Until resolved, no
volume figure for May 17–18 should be treated as authoritative**, which compounds conflict C4.

### 7.7c C1 COMPLETE — swaps separated from liquidity operations (2026-09-30)

**Method.** Decoded Uniswap V3 events directly from pool `0x092295c9…e165`, blocks
86,812,650 → 87,292,543 (2026-05-13 → 2026-05-23): `Swap`, `Mint`, `Burn`, `Collect`.
Pool parameters **read from the contract**, not assumed: `token0` = SUT
(`0x98965474…ca55`), `token1` = **USDT** (`0xc2132d05…58e8f`, canonical Polygon PoS USDT),
`fee` = 10000 (**1.00%**). Direction derived from the signed `amount0`/`amount1` in each
`Swap` payload. Events found: **17,056 Swap · 1,342 Mint · 1,481 Burn · 1,471 Collect**.

> **Naming clarification:** predecessor research called this the "SUT/USDT0" pool. `token1` is
> canonical Polygon USDT, not a distinct "USDT0" asset.

| Date | **Swap vol $** | buy $ | sell $ | #swaps | #buy | #sell | SUT sold | SUT bought | LP add $ | LP rem $ | #mint | #burn |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| May 13 | 59,477 | 30,164 | 29,313 | 422 | 200 | 222 | 46,816 | 47,236 | 74,784 | 75,708 | 57 | 64 |
| May 14 | 76,859 | 43,127 | 33,732 | 329 | 151 | 178 | 50,173 | 63,101 | 39,245 | 42,521 | 44 | 47 |
| May 15 | 200,460 | 98,281 | 102,179 | 926 | 392 | 534 | 140,591 | 132,263 | 93,696 | 91,799 | 79 | 87 |
| May 16 | 36,922 | 19,963 | 16,959 | 246 | 114 | 132 | 25,390 | 29,297 | 15,151 | 15,015 | 26 | 30 |
| **May 17** | **784,333** | 378,676 | 405,657 | **4,341** | 2,166 | 2,175 | **1,045,185** | 965,067 | **986,179** | **970,268** | **643** | **679** |
| **May 18** | **362,976** | 179,908 | 183,068 | **4,392** | 2,133 | 2,259 | **1,041,222** | 1,007,427 | 98,328 | 94,661 | 163 | 196 |
| May 19 | 153,444 | 77,355 | 76,089 | 1,257 | 654 | 603 | 480,440 | 479,460 | 7,279 | 4,226 | 65 | 68 |
| May 20 | 368,466 | 197,461 | 171,004 | 3,189 | 1,601 | 1,588 | 699,607 | 801,985 | 12,184 | 19,153 | 116 | 131 |
| May 21 | 190,111 | 94,370 | 95,741 | 1,356 | 705 | 651 | 302,296 | 292,197 | 11,002 | 8,406 | 89 | 104 |
| May 22 | 110,988 | 53,582 | 57,406 | 598 | 282 | 316 | 196,988 | 180,729 | 5,121 | 3,292 | 60 | 75 |

#### (a) ✅ C14 RESOLVED — the gap was LP churn, and it reconciles to the dollar

| May 17 | USDT |
|---|---:|
| Swap buy-side (buyers paying in) | 378,676 |
| **+ LP `Mint` (liquidity deposited)** | **986,179** |
| **= predicted gross inflow** | **1,364,855** |
| **Measured gross inflow (§7.7b)** | **1,364,855** |
| **Difference** | **0** |

Outflow reconciles to **0.24%** (405,657 + 970,268 = 1,375,925 vs 1,379,239 measured; residual
is `Collect` fee withdrawal). **The ~3.4× discrepancy was liquidity operations, not aggregator
undercounting.** Aggregators were not wrong; our gross-flow proxy was.

#### (b) ⚠ Liquidity was NOT withdrawn — the H2 "liquidity flight" variant is REJECTED

| Date | LP added | LP removed | **Net** |
|---|---:|---:|---:|
| May 17 | 986,179 | 970,268 | **+15,911** |
| May 18 | 98,328 | 94,661 | **+3,667** |
| May 19 | 7,279 | 4,226 | **+3,053** |

LP churn rose ~65× on May 17 (26 mints/30 burns → **643 mints/679 burns**) but **net liquidity
was slightly positive every day of the crash**. This is the signature of **active re-ranging** —
concentrated-liquidity LPs moving positions to follow a violently falling price — not of
liquidity being pulled. **Liquidity providers did not flee; Q5 is answered.**

#### (c) ⭐ The decisive H2 measurement — net directional pressure was tiny

| Date | Buy $ | Sell $ | **Net sell $** | Price move |
|---|---:|---:|---:|---|
| May 17 | 378,676 | 405,657 | **26,981** | **−62.7% intraday** |
| May 18 | 179,908 | 183,068 | **3,160** | **−72.5% close** |

**A net sell imbalance of roughly $27,000 accompanied a 62.7% intraday collapse.** Gross
two-way volume was large ($784K) but almost perfectly balanced. **The price did not fall
because of a large net imbalance — it fell because the marginal depth available to absorb
order flow was exhausted.** This is the clearest available statement of the H2 mechanism, and
it is measured rather than modelled.

#### (d) Self-corrections arising from C1

| Item | Previous (§7.6) | **Corrected** | Reason |
|---|---:|---:|---|
| SUT sold May 17 | 1,238,819 | **1,045,185** | Raw transfers included 193,634 SUT of LP deposits |
| SUT sold May 18 | 1,222,328 | **1,041,222** | Included 181,106 SUT of LP deposits |
| **SUT sold May 17–18** | **2,461,147** | **2,086,407** | Swap-only |
| Sell transactions May 17 | 2,308 | **2,175** (of 4,341 swaps) | Transfer count ≠ swap count |

**Also corrected:** the claim that selling "exceeded pool depth by more than an order of
magnitude" was anchored to the **2026-09-30** pool liquidity figure (~$91.7K). **May 2026 pool
TVL was not measured and remains unmeasured.** The defensible statement is (c) above — a ~$27K
net imbalance produced a 62.7% move — which does not depend on a TVL estimate.

#### (e) ⚠ Day-boundary misallocation in interpolated timestamps

| | Decoded | GeckoTerminal | Ratio |
|---|---:|---:|---:|
| May 17 | 784,333 | 397,989 | 1.97 |
| May 18 | 362,976 | 712,616 | 0.51 |
| **May 17+18 combined** | **1,147,309** | **1,110,605** | **+3.3% — agree** |

Single-day figures diverge in opposite directions while the **two-day total agrees within
3.3%**. Cause: `block_ts_interpolated` (§14.9) accumulates drift — at ~1.8004 s/block assumed,
a small rate error compounds to **hours** by mid-May, shifting volume across a midnight
boundary on days when activity is concentrated.

> **Binding consequence.** For May 17–18, **use the combined two-day figure**. Single-day
> splits from interpolated timestamps are **not reliable** for this event, and **exact block
> timestamps must be fetched before any hourly analysis or any single-day claim.** This
> supersedes the earlier assessment that interpolation was "adequate for daily buckets" —
> it is adequate only when activity is not concentrated.

### 7.8 NEW — on-chain MSQ linkage (evidence, not proof of affiliation)

DST `0x7CC2F891…F7ad` currently holds **14,735,470.6 MSQ** (MSquare Global,
`0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499`, Polygon) alongside SUT and USDT.

Predecessor research documents a disputed SuperTrust↔MSQUARE GLOBAL relationship (news reports
call SuperTrust an MSQUARE affiliate; the company stated 2026-08-08 that they are "separate
businesses, operated independently").

> **Treatment: EVIDENCE, NOT PROOF.** Holding a token does not establish ownership, control, or
> corporate affiliation. Anyone can hold MSQ. This raises the prior that the chain is connected
> to the MSQ/MSQUARE ecosystem; it does **not** license labelling the wallet as a company,
> treasury, or insider wallet. Role remains **UNKNOWN**.

---

## 8. Trust / legal / reputational findings

**Classification is mandatory.** Nothing below is a finding of fraud, Ponzi operation,
manipulation, or illegality. No competent authority has been shown to have established any
such finding.

| # | Item | Date | Classification | Source quality |
|---|---|---|---|---|
| L1 | Shinhan Bank froze SuperTrust deposits, treating it as an unregistered virtual-asset business | 2025-04-14 | **VERIFIED EVENT** | Secondary (Korean media) |
| L2 | Seoul court rejected request to lift the freeze; company appealed | 2025-04-30 | **LEGAL PROCEEDING** | Secondary |
| L3 | GOPAX designated SUT investment-caution, then terminated trading support | 2025 (Aug–Sep) | **EXCHANGE-STATED CONCERN** → delisting | GOPAX + snippets |
| L4 | GOPAX stated reasons: possible legal/regulatory-policy issues; non-disclosure of material information | 2025 | **EXCHANGE-STATED CONCERN** | **SEARCH SNIPPET ONLY** |
| L5 | SuperTrust announced provisional injunction against GOPAX decision | 2025-08-21 | **COMPANY RESPONSE** | Primary (notice) |
| L6 | Reporter filed fraud / illegal fund-raising (유사수신) complaint vs MSQUARE GLOBAL and affiliates incl. SuperTrust; 30,000+ investors alleged | 2025 | **REPORTED ALLEGATION — outcome unknown** | **SEARCH SNIPPET ONLY** (smartfn) |
| L7 | Reported investor death — SuperTrust says the report is false | 2025 | **REPORTED ALLEGATION + COMPANY DENIAL** | Secondary |
| L8 | Defamation case vs operator of "MSQUARE victims' chat room" forwarded to prosecutors with recommendation to indict | 2025-11-12 | **LEGAL PROCEEDING** | Secondary (Fieldnews) |
| L9 | Separate civil damages claim ~KRW 2bn by M-Square Global | 2025 | **LEGAL PROCEEDING** | Secondary |
| L10 | Accused chat-room operator disputes allegations; says postings were based on public materials as risk warnings | 2025 | **CONTESTED / UNRESOLVED** | Secondary |
| L11 | Lawyer's public post describing "typical Ponzi suspicion" | — | **OPINION** — explicitly labelled | Opinion piece |
| L12 | Press Arbitration Commission ordered a correction: MSQUARE did **not** promise a fixed 140% return | after 2024-12-23 | **VERIFIED CORRECTION (in the company's favour)** | Secondary |
| L13 | SuperTrust statement: independent from MSQUARE GLOBAL | 2026-08-08 | **COMPANY RESPONSE** | Primary (notice 4615) |
| L14 | No MAS or Korean FSC warning naming SUT found; MAS alert list **not checked directly** | — | **NOT ESTABLISHED / NOT CHECKED** | — |

> **Timing note for the May 2026 case:** every item above is dated **2025 or 2026-08**.
> **No legal, regulatory or reputational event dated 2026-05-15 → 2026-05-20 has been
> identified.** This is a genuine gap in evidence, not proof of absence — see H9.

---

## 9. Utility findings

### 9.1 Platform status (predecessor research, 2026-09-29)

| Platform | Status | Measured signal |
|---|---|---|
| SuperTrust app | **Live** | Google Play 10K+ downloads, 4.9★ (2.63K reviews), launched Jan 2026 |
| ZERO PLUS (film) | Site live | App **50+ downloads** |
| MOAD (ads) | Site live | Beta announced Apr 2025; **app listing not found** |
| L2U (travel) | Live | **Run by a separate company** (레저투유) |
| NATURUBOOK | Live | Ownership relative to SuperTrust **unclear** |
| AI Studio 48 | **No product found** | Press release only (Jun 2025) |
| SUT GOLD Connect | **No product found** | Whitepaper only |

**Company claims (UNVERIFIED):** 40,000+ community members; 2,000+ stores accepting SUT.

**Discipline:** "platform exists" ≠ "platform creates SUT demand". "Holder count" ≠ "active
adoption". The main SUT benefit — a 30–50% fee discount — applies only to South Korean users
of the operator's own platforms.

### 9.2 NEW — measured on-chain activity (CertiK Skynet, retrieved 2026-09-30)

| Metric (7d) | Value |
|---|---|
| Active users | 1,580 |
| Transactions | 5,799 (+2.44%) |
| Tokens transferred | $1.61M (+19.83%) |

Against a 54–56K holder base, **~1,580 active users in 7 days ≈ 2.8–2.9% weekly activity**.
Recorded as a measurement; CertiK's methodology for "active users" is **not published here**
(§10-C6 applies by analogy). Do not treat as a validated adoption metric.

### 9.3 NEW — activity-vs-flow observation

HOP3's fan-out (§7.3) distributes SUT to ~784 distinct addresses in ~3.5 months at a median
~1,876 SUT. This is real on-chain distribution activity. **But distribution is not demand:**
tokens being *sent to* users is supply reaching the market, not evidence that anyone *bought*
SUT for utility. Distinguishing the two is the core of H7/H8 and requires payment-side data
that is currently **DATA UNAVAILABLE** (§9.5).

### 9.4 RWA claim

SUT is marketed as a real-world-asset project. Predecessor research found:
- Gold ("SUT GOLD Connect") — **whitepaper only, no product found**
- Mongolian miner Bolor Geo — claimed 30% stake with conditional deal for 80%, **unverified**
- Giant Chemical 4.79% — reported (Newsworker/ESG경제)
- **No independent verification, no custody evidence, no attestation, no proof-of-reserve
  report has been identified.**
- The same Oct 2025 article reported SuperTrust had **zero revenue for three years**.

**Status: RWA backing is an UNVERIFIED CLAIM.** It must be treated as a hypothesis to be
tested, never as established asset backing.

**NEW — the verification standard to test it against** (`PIP_Week_2_thesis.pdf` p.5).
Top-100 RWA peers — Tether Gold XAUt (#34), Ondo ONDO (#39), **PAX Gold PAXG (#50)**, XDC
(#74) — hold their rank on four specific, checkable properties:

| # | Criterion | Peer standard (e.g. PAXG) | SUT status |
|---|---|---|---|
| 1 | **Redeemability** | 1 token = 1 oz of gold, redeemable | **Not evidenced** |
| 2 | **Custody** | Assets held in identified custody | **No custody evidence** |
| 3 | **Independent reserve audit** | Regular published attestations | **None identified** |
| 4 | **Regulated issuer** | Licensed/regulated | **Not evidenced**; issuer is a software-development registrant |

This converts the RWA gap from "unverified" into a **four-part testable checklist**. SUT
currently satisfies **none of the four** on available evidence. Note the project's
documentation otherwise describes a *payment and discount* token, not an asset-backed one.

### 9.5 SoloPay / SuperSave

**DATA UNAVAILABLE.** No access (predecessor research: "DON'T HAVE: SoloPay, production
systems, SUT/SoloPay repositories"). No measured merchant count, payment count, payment value,
SUT-denominated payment volume, ecosystem revenue, or token velocity exists in this baseline.
**H5, H7 and H8 cannot be fully tested without it.**

---

## 10. Contradictions & data conflicts (preserved, not adjudicated)

| ID | Conflict | Side A | Side B | Why they may differ |
|---|---|---|---|---|
| **C1** | Holder count | CertiK 54,052 (2026-09-30) | Blockscout 56,241 (2026-09-30) | Different zero-balance/dust thresholds; different snapshot times. Neither is "wrong". |
| **C2** | CertiK score | CertiK site **74.23** (09-30); **74.06** (09-29) | CoinMarketCap displays **"3.7"** | CertiK is a *dynamic* score — 74.06→74.23 is real drift, both valid at their retrieval times. **CMC's 3.7 is a different field on a different scale and must never be used as CertiK's score.** |
| **C3** | Project-reported circulating supply | Notice 2026-02-06: correct CMC to **188,403,732** | v2 research: project self-reported **46.6M** | Possibly different dates or definitions (distributed vs circulating vs unlocked). **Unresolved.** |
| **C4** | May 17–18 volume | CoinGecko 420,380 / 1,579,087 | Coinranking 1,780,000 / 3,500,000; **DEX pool alone 397,989 / 712,616** | Different venue coverage, DEX inclusion rules, wash-filtering. **Severe — up to 4.2×.** On May 17 CoinGecko's total ≈ one DEX pool. |
| **C5** | All-time low | Aggregators $0.113–$0.116 (May 19) | DEX intraday low **$0.1022** (May 19) | Pool print vs aggregator VWAP/filtered feed. |
| **C6** | Concentration | CertiK "Major Holding Ratio" **54.25%** | Our top-10 calc **~71%** (~50% ex-dead) | **Different methodologies.** CertiK's definition is unpublished here; ours is top-10-by-balance. **Not the same metric — never present as one.** |
| **C7** | Distribution | Project: "zero reserve / 100% private sale" | GOPAX Dec 2024: foundation held 90M (47.8%) | Different dates and/or definitions of "foundation holding". |
| **C8** | Contract admin state | 2024 audit/GOPAX: pause exists, owner active | 2026-09: renounced, unpausable | **Not a contradiction — a state change over time.** Always date admin-risk claims. |
| **C9** | CertiK owner field | CertiK shows owner `0x88f76d…9acfc6ba` (09-30) | On-chain: renounced to `0x000…000` on 2026-07-20 | **CertiK's owner field is stale.** On-chain wins for contract facts. |
| **C10** | CertiK sub-scores | Predecessor (09-29): Code 62.9, Fundamentals 49.08, Governance 98, Market 91.72 | Retrieved 09-30 as **percentages**: Code 35, Fundamentals 40, Operational 10, Community 35, Governance 5, Market 5 | **Different quantities — possibly category weights vs scores.** They sum to 130%, so not a simple weighting either. **Interpretation uncertain — do not use either set as a "score" without confirming the field's meaning.** |
| **C11** | ATH | $14.10 – $14.78 (6–8 Sep 2025) | — | Cross-provider spread preserved. |
| **C12** | Rank | CMC #301–302 vs #385 (live vs historical pages disagree); Gate #372; CoinLore #1,133 (stale 2.02M supply) | — | Supply-basis differences. |
| **C13** | Volume (current) | Blockscout $95,485 | CertiK $107.26K; CMC $65–75K | Venue coverage and DEX inclusion. |
| ~~**C14**~~ | ~~May 17 pool flow vs reported volume~~ | ~~Gross flow ~$1.36M~~ | ~~GeckoTerminal $397,989~~ | **✅ RESOLVED 2026-09-30 by procedure C1 (§7.7c).** The gap was **LP `Mint`/`Burn` churn**, not aggregator undercounting: swap buy-side $378,676 + LP mint $986,179 = **$1,364,855 = measured gross inflow exactly (difference $0)**; outflow reconciles to 0.24%. Aggregators were not wrong — the gross-flow proxy was. **Residual issue moved to C15.** |
| **C15** | May 17 vs May 18 single-day volume split | Decoded swaps: May 17 $784,333 / May 18 $362,976 | GeckoTerminal: May 17 $397,989 / May 18 $712,616 | **Day-boundary misallocation from `block_ts_interpolated`** — the two series diverge in opposite directions while the **two-day total agrees within 3.3%** ($1,147,309 vs $1,110,605). **Use the combined May 17–18 figure; single-day splits are unreliable until exact block timestamps are fetched.** |

---

## 11. Corrections to previous versions

### 11.1 Preserved correction (made by `sut-coin-research` v2 — DO NOT UNDO)

v1 of the predecessor research attributed the **March 2026 BitMart delisting** and an **April
2026 "contract swap"** to SuperTrust. **They were not SuperTrust** — they were **Sanity
United**, a different Ethereum token sharing the ticker SUT, since swapped into a token called
"SU". CoinMarketCap's AI news pages mixed the two, and v1 repeated the error.

> ### ⚠ CRITICAL TRAP FOR THE MAY 2026 CASE
> The handoff (§2.5) still records a BitMart event with **"withdrawal closed 2026-05-16"** — a
> date sitting **exactly at the onset of the crash window**, and exactly the day the wallet
> pipeline stopped (§7.2d). If that event is SuperTrust's, it is a prime candidate cause. If it
> is Sanity United's — as v2's correction indicates — then using it would manufacture a
> **completely spurious root cause at precisely the right date**, reinforced by a coincidental
> on-chain correlation.
>
> **Status: IDENTITY NOT VERIFIED.** The BitMart notice could not be retrieved this cycle
> (Cloudflare challenge, HTTP 403). **No BitMart event may be used as a SuperTrust event until
> contract-level evidence is obtained.** This is **the single research issue most likely to
> materially change the May 2026 conclusion.**

### 11.2 NEW — May wallet-flow volume understated

SRC→DST SUT for May 2026: handoff **~5,920,000** → corrected **16,580,000** (§7.2a).
Handoff figures are a subset, not withdrawn.

### 11.3 NEW — chain depth understated

Handoff modelled a **two-wallet** relationship. Evidence shows **at least three hops**:
SRC → DST → `0xe6e7ec8d…ff85` (15.2M SUT, 92% of DST outflow), plus a second upstream funder
`0x0d070796…92fe` (2.3M) and a circular return leg to SRC (1.27M). HOP3 then fans out to ~784
addresses (§7.3).

### 11.4 NEW — event onset refined

Handoff primary event window **2026-05-17 → 2026-05-19**. Intraday DEX data shows the collapse
**begins 2026-05-17 intraday** (low 0.2511, −62.7% from that day's open) with partial recovery,
before the May 18 continuation. Model onset at **hourly resolution from 2026-05-17 00:00 UTC**.

### 11.5 NEW — H1 status upgraded

Handoff: H1 "Weak / likely insufficient" (untested). Now: **REJECTED as sufficient cause**,
quantified — BTC −1.5%, ETH −2.1% vs SUT −80.6% over the identical May 16→18 interval.

### 11.6 NEW — contract admin state during the crash clarified

Predecessor materials emphasise "ownership renounced, nobody can pause it". **That became true
on 2026-07-20 — two months after the crash.** During May 2026 the contract was **still owned
and still pausable**. This does not imply anything happened; it corrects the risk frame applied
to the May window.

---

### 11.7 ⚠ REJECTED — stale GoPlus "contract control" claim re-entered via PDF 2

`PIP_Week_2_thesis.pdf` (p.1) states: *"GoPlus warns that the contract creator can make
changes to the token contract such as disabling sells, changing fees, minting, transferring
tokens etc."*

**REJECTED.** Contradicted by verified on-chain evidence from three independent routes
(Blockscout full-match verification, Sourcify exact match, GoPlus's own live security feed),
re-confirmed 2026-09-30: **not mintable, no fees, no blacklist, not a proxy, no hidden owner**
(F4–F8, F14). It is the **v1 claim that `sut-coin-research` v2 explicitly retired**
(correction #2), and it is generic scanner boilerplate rather than a finding about this
contract. The PDF additionally **mis-cites CoinGecko** as its source.

> **Date inversion — a standing lesson.** PDF 2 is dated **30 Sep 2026**, one day *newer* than
> the v2 note that corrects this claim. **A newer document carried an older, superseded claim.
> Document date is not a reliable proxy for claim currency.** Currency must be established by
> evidence lineage, not by filename or date.

**What is kept:** the *historical* fact that a pause function existed and the contract was
owned — true until 2026-07-20 and **true throughout the May 2026 crash window** (C8,
`STATE_CHANGE`).

### 11.8 ⚠ REJECTED — BitMart delisting re-attributed to SuperTrust via PDF 2

`PIP_Week_2_thesis.pdf` (p.1) lists under *Risks and Red flags*: *"Exchange loss: the BitMart
delisting (Mar 2026) removed a trading venue without a stated reason."*

**REJECTED.** This is **precisely the error corrected by `sut-coin-research` v2**
(correction #1): BitMart's SUT was **Sanity United**, not SuperTrust. No contract-level
evidence maps any BitMart SUT event to `0x98965474…Ca55`. Status remains
**IDENTITY NOT VERIFIED** (§11.1).

> **Escalation — contamination is now confirmed inside our own work product.** H10 previously
> treated identity contamination as an *external* feed problem (CoinMarketCap's AI pages).
> This shows the same error **propagating into internally authored documents** and surviving a
> published correction. The `data-source-contract.md` §2 identity gate is therefore extended to
> **internal documents**: an internally authored claim carries no identity privilege and must
> pass the same ladder as an external one.

---

## 12. Open research questions

| ID | Question | Blocks | Feasible now? |
|---|---|---|---|
| ~~Q1~~ | ~~Where did the 15.2M SUT terminate in May?~~ | — | **✅ RESOLVED 2026-09-30 — §7.5: retail fan-out, 34,349 transfers, no venue address** |
| **Q2** | **Was any of it sold into a market during May 1–18?** Match pool inflows/Swap events against cluster and recipient addresses. | H2, H3 — **decisive** | **Yes — in progress** |
| **Q16** | **NEW — do the fan-out recipients sell?** Measure sell-through of the thousands of May recipients within 1/7/30 days. | H8, H11 — **now the highest-value test** | **Yes** |
| **Q3** | **Is the BitMart event SuperTrust or Sanity United?** (§11.1) | H4 — could create a false root cause | Blocked (Cloudflare); try archive/alt |
| **Q4** | Is the 50M in `0xbc0e5c…6144` the announced 2045 lock-up? Any on-chain lock contract? | H6, float | Yes |
| **Q5** | LP add/remove (Mint/Burn) events on pool `0x092295c9…e165` during May 1–25 — did liquidity withdraw before/during the crash? | H2 — directly testable | **Yes** |
| **Q6** | Per-venue volume (Gate, BingX, KuCoin, CoinUp.io) for May 16–20 | H4, C4 | Partially |
| **Q7** | CEX order-book depth/spread during May 16–20 — does *any* retroactive source exist? | H2 | **Likely never** |
| **Q8** | Any SuperTrust/exchange notice or legal action dated 2026-05-15→20? | H9 | Yes (archives) |
| **Q9** | Resolve 188.4M vs 46.6M project-reported supply conflict (C3) | H6 | Yes |
| **Q10** | What does CertiK's "Major Holding Ratio" measure? (C6) | Comparability | Yes |
| **Q11** | What do CertiK's percentage fields mean? (C10) | Comparability | Yes |
| **Q12** | Did other top-10 holders (#1, #3, #6, #7) move in May? | H3 | **Yes** |
| **Q13** | Any measured SoloPay/SuperSave flow data obtainable at all? | H5, H7, H8 | No access |
| **Q14** | Did the 2026-03-30 "Short-Term SUT Value Surge Strategy" (60% credit lock, lower weekly settlement) change on-chain behaviour before May? | H5, H6 | Partially |
| **Q15** | What caused the May 15 +44% intraday spike on 6× volume? | H2, H3 | Yes |

---

## 13. CertiK evidence record

**Source:** CertiK Skynet — `https://skynet.certik.com/projects/supertrust`
**Retrieved:** 2026-09-30 (this cycle). Prior retrieval 2026-09-29 (predecessor research).
**Nature: DYNAMIC.** Values change without notice. Every CertiK datum must carry
`retrieved_at`. Two different values at two different times are **both valid**, not a conflict.

| Metric | 2026-09-29 (predecessor) | **2026-09-30 (this cycle)** |
|---|---|---|
| Skynet score | 74.06 | **74.23** |
| Grade | BBB | **BBB** |
| CertiK audit / 3rd-party audit | No / No | **No / No** |
| CertiK KYC / 3rd-party KYC | No / No | **No / No** |
| CertiK bounty / 3rd-party bounty | No / No | **No / No** |
| Concentration indicator | High | **High** |
| Major Holding Ratio | 54.25% | **54.25%** |
| Owner Holding Ratio | — | **"-"** |
| Total holders (24h) | — | **54,052 (change +58)** |
| Sub-scores | Code 62.9, Fundamentals 49.08, Governance 98, Market 91.72 | **displayed as %: Code 35, Fundamentals 40, Operational 10, Community 35, Governance 5, Market 5** — see C10 |
| Owner address shown | "older owner address" | **`0x88f76d…9acfc6ba` — STALE, see C9** |
| Creator | — | **`0x4c90e5…56d7ce19`** |
| Token age / listed date | — | **2 yr 8 mo / Jan 31, 2024** |
| Scan tallies | — | **Contract Uncertainty 5 pass/0 flagged; Owner Privilege 5/1; Trading Constraint 6/2** |
| Active users 7d | — | **1,580** |
| Transactions 7d | — | **5,799 (+2.44%)** |
| Tokens transferred 7d | — | **$1.61M (+19.83%)** |
| Price | — | **$0.40194** (low $0.39579 / high $0.40723) |
| Volume 24h | — | **$107.26K (+40.54%, "Top 5%")** |
| Market cap | — | **$75.9M (+1.00%, "Top 10%")** |
| CEX vs DEX volume | — | **CEX $59.07K / DEX $48.18K** |
| Skynet Monitor items | — | **all four "Not Activated"** |
| Twitter / GitHub | — | **38,974 followers / GitHub impact "Low", 1 follower, 0 stars** |

**Mandatory separations:**
1. **CertiK ≠ CoinMarketCap's "3.7".** Different field, different scale. Never substitute.
2. **CertiK's "Major Holding Ratio" (54.25%) ≠ our top-10 concentration (~71%).** Different
   methodologies; keep both with explicit method labels.
3. **CertiK's owner field is stale** (C9). On-chain state wins for contract facts.
4. CertiK is **Tier 3** for market data and **Tier 1-adjacent** only for its own proprietary
   ratings — it is never a substitute for on-chain verification.

---

## 14. Research limits

1. **Access blocked this cycle:** `polygonscan.com`, `bitmart.zendesk.com` (Cloudflare 403),
   `web02.gate.com.tr` (no response), `polygon-rpc.com` (API key disabled), `rpc.ankr.com`
   (key required), `polygon.llamarpc.com` (empty). Working substitutes: `polygon.drpc.org`,
   `polygon-bor-rpc.publicnode.com`, `polygon.blockscout.com` (API + eth-rpc), GeckoTerminal,
   CoinGecko public API.
2. **Cloudflare/JS-gated sources** cannot be verified programmatically; several Korean news
   sites and exchange notice pages fall in this class.
3. **Snippet-only items** (L4, L6) were never read in full. They remain **SEARCH SNIPPET ONLY**
   and must not be promoted to verified findings.
4. **No retroactive CEX order-book depth or spread source has been identified.** H2's CEX limb
   may be permanently DATA UNAVAILABLE for May 2026.
5. **No access** to SoloPay, SuperSave, production systems, or company settlement records.
6. **Wallet roles are unknown.** No address in the May chain carries a public label. Any role
   attribution would be invention.
7. **The terminal economic outcome of the 15.2M SUT in May is not yet established** (Q1) — the
   single largest gap.
8. **MAS investor-alert list not checked directly.**
9. **Block-timestamp interpolation** was used for some daily bucketing of May log data
   (anchors: block 86,236,778 = 2026-05-01T00:00:00Z; block 87,436,510 = 2026-05-26T00:00:01Z;
   ≈1.8004 s/block). Accurate to ~minutes over the window — adequate for daily buckets, **not**
   for sub-hourly event ordering. Exact timestamps must be fetched before any hourly analysis.
10. **Causality is not established for anything.** Everything in §7 is timing and flow, which
    is correlation.
11. **Conflict of interest** (§1.3) remains live and disclosed.

---

## 15. Status summary

**Testable now:** H1 (done — REJECTED), H2 (DEX limb), H3 (partially), H6, H10.
**Blocked / data-unavailable:** H2 (CEX limb), H5, H7, H8, H9, H11.
**Never to be produced:** an AI-generated overall root-cause verdict.

See `hypothesis-matrix.md` for the full per-hypothesis state,
`may-2026-investigation-plan.md` for the forensic procedure,
`data-source-contract.md` for source authority rules, and
`evidence-model.md` for the evidence lineage schema.
