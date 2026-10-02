# Data Source Contract — SUT Value Forensics

**Prepared:** 2026-09-30
**Binds:** every data point that enters the project.
**Companion documents:** `research-baseline.md`, `evidence-model.md`.

This contract defines, for every source: what it *is* authoritative for, what it is
**not** authoritative for, its identity requirements, and how conflicts are handled.

> **Prime directive.** A source is authoritative only for what it directly observes.
> A market aggregator observes *its own index construction*, not on-chain truth. A block
> explorer observes *chain state*, not corporate ownership. No source is authoritative for
> causation. **Nothing is.**

---

## 1. Mandatory record fields

Every observation stored by this project **must** carry all of the following. A record
missing any field is **invalid** and must not be used in an analysis.

| Field | Type | Meaning |
|---|---|---|
| `token_symbol` | string | As displayed by the source (e.g. `SUT`) |
| `token_contract` | address | **Required.** Lowercased hex. |
| `chain` | string | `polygon-pos` / chainId `137` |
| `exchange` | string \| null | Venue; `null` only for pure chain-state facts |
| `trading_pair` | string \| null | e.g. `SUT/USDT0` |
| `source` | enum | See §3 |
| `source_url` | url | Exact URL queried |
| `retrieved_at` | ISO-8601 UTC | **When we fetched it** |
| `observation_time` | ISO-8601 UTC \| null | **When the fact was true** — differs from `retrieved_at` |
| `methodology` | string | How the source computes it (or `UNKNOWN`) |
| `value` | number \| string | |
| `unit` | string | `USD`, `SUT`, `count`, `percent`, … |
| `confidence` | enum | `VERIFIED` \| `SECONDARY` \| `CLAIM` \| `SNIPPET_ONLY` \| `UNVERIFIED` |
| `identity_status` | enum | `CONTRACT_VERIFIED` \| `PAIR_VERIFIED` \| `TICKER_ONLY` \| `IDENTITY_NOT_VERIFIED` |

### 1.1 `retrieved_at` vs `observation_time` — never collapse these

- CertiK score fetched on 2026-09-30 showing the current score:
  `retrieved_at = 2026-09-30`, `observation_time = 2026-09-30`.
- CoinGecko daily close for 2026-05-18 fetched on 2026-09-30:
  `retrieved_at = 2026-09-30`, `observation_time = 2026-05-18T23:59:59Z`.

Collapsing them destroys the ability to detect source revision — the mechanism by which a
provider silently rewrites history.

---

## 2. TOKEN IDENTITY REQUIREMENTS (gate — applied before anything else)

### 2.1 The target

| Field | Required value |
|---|---|
| Contract | `0x98965474ecbec2f532f1f780ee37b0b05f77ca55` |
| Chain | Polygon PoS (137) |
| Symbol | `SUT` |
| Name | SuperTrust / SUPER TRUST / "Super Trust" |

### 2.2 Known ticker collisions — active contamination risk

| Token | Chain | Status |
|---|---|---|
| Super Useless Token (SUT) | Polygon | Different token |
| **Sanity United (SUT)** | Ethereum | **Caused a real misattribution — see §2.4** |

### 2.3 Identity ladder

| Level | Condition | Usable for |
|---|---|---|
| `CONTRACT_VERIFIED` | Source states the contract, or is queried *by* contract | **Everything**, incl. causal analysis |
| `PAIR_VERIFIED` | Venue + pair confirmed to map to the contract by an independent check | Market metrics for that venue |
| `TICKER_ONLY` | Only symbol `SUT` available | **Context only.** Never a finding, never an event, never causal input. |
| `IDENTITY_NOT_VERIFIED` | Cannot be mapped | **EXCLUDED.** Record as `DATA UNAVAILABLE / IDENTITY NOT VERIFIED` and state it in outputs. |

**Escalation is forbidden without new evidence.** A `TICKER_ONLY` record never becomes
`PAIR_VERIFIED` because it "obviously" refers to SuperTrust.

### 2.4 Standing identity incident — BitMart

`sut-coin-research` v2 corrected v1: the **March 2026 BitMart delisting** and the **April
2026 "contract swap"** were **Sanity United**, not SuperTrust. CoinMarketCap's AI pages
mixed the two.

> **STANDING RULE.** No BitMart event may be attributed to SuperTrust unless
> contract-level evidence establishes it. This includes the **"withdrawal closed
> 2026-05-16"** date, which falls exactly at the May crash onset. Current status:
> **IDENTITY NOT VERIFIED** (notice unreachable — Cloudflare 403, 2026-09-30).
> Using it without verification would manufacture a false root cause at the right date.

**Recurrence confirmed 2026-09-30.** The corrected BitMart attribution **reappeared in an
internally authored document** (`PIP_Week_2_thesis.pdf`, p.1) dated *after* the correction.
The error survived publication of its own correction. See §3.18 and `research-change-log.md` §1.2.

### 2.5 Internal documents carry NO identity privilege

An internally authored document — a thesis, a report, a plan, a handoff, a slide, or a prior
AI-assisted output — is a **Tier 4 secondary source** for any factual claim it did not itself
measure. It must pass the same identity ladder and the same confidence grading as an external
source.

**Specifically:**
1. An internal document's claim is **not** evidence merely because we wrote it.
2. **Document date is not a proxy for claim currency.** A newer document may restate an older,
   already-corrected claim — this has now happened twice (§3.18).
3. Where an internal document repeats an external claim, **the original external source must be
   traced and graded**; the internal restatement adds no confidence.
4. Where an internal document conflicts with a `CONTRACT_VERIFIED` on-chain measurement,
   **the on-chain measurement wins without exception.**

---

## 2A. Same-source duplication control

**A document is not corroboration of itself in another format.**

`research-inputs/SUT_Coin_Detail_Research.pdf` is a PDF rendering of
`sut-coin-research-2026-09-29.txt` — identical date, identical corrections, identical figures,
identical source list. Counting both as independent sources would **double-count a single
source** and falsely inflate confidence.

**Rule.** Before an input raises the confidence of any claim, verify it is an *independent
observation*, not a re-rendering, re-publication, quotation, or summary of an existing source.
Same-source copies are recorded as **formats of one source**, and their only evidential value
is confirming the original has not been altered.

---

## 3. Source register

### Tier 1 — On-chain primary (identity-safe: queried *by contract address*)

#### 3.1 Polygon RPC
`https://polygon.drpc.org` · `https://polygon-bor-rpc.publicnode.com` ·
`https://polygon.blockscout.com/api/eth-rpc`

| | |
|---|---|
| **Authoritative for** | Chain state: balances, `totalSupply`, Transfer/Swap/Mint/Burn logs, block timestamps, contract bytecode, ownership state |
| **NOT authoritative for** | Wallet *identity*, wallet *role*, off-chain intent, corporate ownership, prices, causation |
| **Identity** | `CONTRACT_VERIFIED` by construction |
| **Limitations** | `eth_getLogs` block-range caps (chunk to ≤40k, back off to 2.5k); rate limits; no address labels; `polygon-rpc.com` and `rpc.ankr.com` require keys and are **unusable**; `llamarpc` returned empty |
| **Fallback** | Rotate the three endpoints, then Blockscout REST |

#### 3.2 Blockscout (`polygon.blockscout.com/api/v2`)

| | |
|---|---|
| **Authoritative for** | Token metadata, holder counts *by its own definition*, address token balances, paginated transfer history, contract verification status, `is_contract` |
| **NOT authoritative for** | Prices/market cap (it proxies third-party rates), circulating supply (returns `null`), wallet roles |
| **Identity** | `CONTRACT_VERIFIED` |
| **Limitations** | Pagination is newest-first — **cannot reach far-back history on high-activity addresses** (HOP3: 2,000 transfers only reached 2026-06-19). Use `eth_getLogs` for historical windows. Read timeouts under load. |

#### 3.3 Sourcify — authoritative **only** for source-code verification status.

#### 3.4 GeckoTerminal (`api.geckoterminal.com`)

| | |
|---|---|
| **Authoritative for** | DEX pool inventory, pool reserves, **pool-level OHLCV** — all keyed by contract |
| **NOT authoritative for** | CEX prices/volume, aggregate market cap, circulating supply |
| **Identity** | `CONTRACT_VERIFIED` — **the only price series in this project that is structurally immune to the ticker collision** |
| **Limitations** | **Returns ~11 dormant pools with stale, divergent last prices** ($0.0894–$1.2025, all $0 volume). **Only pool `0x092295c9…e165` is economically live.** Never average across pools. Pool-level price ≠ market price. |

#### 3.5 GoPlus — authoritative for token-security flags at fetch time only. Dynamic.

#### 3.6 DexScreener — cross-check for §3.4. Same pool-selection hazard.

---

### Tier 2 — Primary documentary

#### 3.7 Official SuperTrust notices (`supertrust.club/notice/…`)

| | |
|---|---|
| **Authoritative for** | *That the company said X on date Y* — the company's own position, announcements, buyback offers, lock-up announcements |
| **NOT authoritative for** | Whether the statement is **true**, whether an announced action **occurred**, supply figures, adoption, asset backing |
| **Confidence** | `CLAIM` — always. A company notice is evidence of a statement, never of the fact stated. |
| **Verification rule** | Every announced on-chain action (lock-up, burn, buyback) **must be independently verified on-chain** before being treated as having happened. |
| **Limitations** | Partly blocked to automated access; notices can be edited or removed — archive on retrieval. |

#### 3.8 Official exchange announcements (GOPAX, Gate TR, BitMart, KuCoin, BingX, MEXC)

| | |
|---|---|
| **Authoritative for** | That venue's own listing/delisting/suspension actions and its **stated** reasons |
| **NOT authoritative for** | Whether the stated reason is factually correct; any legal finding; market impact |
| **Identity** | **Must be established per notice.** Gate TR = `PAIR_VERIFIED` (SUPERTRUST SUT/TRY). **BitMart = IDENTITY NOT VERIFIED (§2.4).** |
| **Limitations** | Cloudflare-gated (BitMart 403; Gate TR no response, 2026-09-30). Notices are removed over time — archive immediately. |

**Exchange-stated concerns are `EXCHANGE-STATED CONCERN`, never `VERIFIED` findings of
wrongdoing.**

#### 3.9 GOPAX review PDFs — authoritative for GOPAX's own assessment and the token state
*as at the review date* (Dec 2024). **Not** authoritative for current state. Its 90M/47.8%
foundation figure is preserved as a dated observation (C7).

#### 3.10 Court / registry / regulator records — **highest authority for legal facts.**
Currently **none held directly.** All legal items are secondary or snippet-only.

---

### Tier 3 — Market aggregators (ticker/slug-keyed → identity risk)

#### 3.11 CoinMarketCap

| | |
|---|---|
| **Authoritative for** | CMC's own displayed price, rank, and **its** circulating-supply decision |
| **NOT authoritative for** | On-chain truth, actual circulating supply, CertiK's score, news accuracy |
| **Identity** | `TICKER_ONLY` unless the contract is shown on the page |
| **Known defects** | (a) **AI news pages conflated SuperTrust with Sanity United** — do not use as an event source. (b) Displays a CertiK-labelled **"3.7"** that is **not** CertiK's Skynet score (C2). (c) Live and historical pages disagree on rank (C12). (d) Its supply basis changed 2026-02-10, creating the artificial rank jump (§6.5 baseline). |

#### 3.12 CoinGecko

| | |
|---|---|
| **Authoritative for** | CoinGecko's own price/volume series and FDV |
| **NOT authoritative for** | Circulating supply (it publishes none for SUT), market cap, venue-complete volume |
| **Identity** | `TICKER_ONLY` → verify via its contract field |
| **Known defects** | **Volume appears to under-capture DEX activity**: its 2026-05-17 total ($420,380) barely exceeds the single main DEX pool alone ($397,989). Treat CoinGecko volume as a **lower bound of uncertain coverage** (C4). |
| **Also used for** | **BTC/ETH control series** — appropriate and high-confidence for major assets. |

#### 3.13 Coinranking / CoinCodex / CoinLore / Gate price pages

| | |
|---|---|
| **Authoritative for** | Their own displayed series |
| **NOT authoritative for** | Anything cross-provider |
| **Known defects** | Coinranking volume runs up to **4.2× CoinGecko's** (C4). **CoinLore still uses the stale 2.02M supply**, producing rank #1,133. LBank shows a ~$0.028 SUT market — **likely a different token; not a valid market.** |

#### 3.14 CertiK Skynet (`skynet.certik.com/projects/supertrust`) — **MANDATORY SOURCE**

| | |
|---|---|
| **Authoritative for** | **CertiK's own proprietary ratings and indicators**: Skynet score, grade, audit/KYC/bounty status, concentration indicator, Major Holding Ratio, its own activity metrics |
| **NOT authoritative for** | **Contract state** (its owner field is stale — shows `0x88f76d…9acfc6ba` although ownership was renounced to `0x000…0` on 2026-07-20, C9); holder count as ground truth (C1); market data as ground truth (C13) |
| **Identity** | `CONTRACT_VERIFIED` — page states the Polygon contract |
| **Nature** | **DYNAMIC.** Score moved 74.06 (09-29) → 74.23 (09-30) in one day. **Every CertiK datum must carry `retrieved_at`.** Two values at two times are **both valid**, not a conflict. |
| **Mandatory separations** | 1. CertiK's score is **not** CMC's "3.7". 2. CertiK's **Major Holding Ratio (54.25%)** is **not** our top-10 concentration (~71%) — different, unpublished methodology. Keep both, labelled. 3. CertiK's percentage fields (Code 35, Fundamentals 40, Operational 10, Community 35, Governance 5, Market 5) **sum to 130% and their meaning is unconfirmed** (C10) — do not present as scores. |
| **Limitations** | Methodologies unpublished; snapshot cadence unknown; no history exposed. |

---

### Tier 4 — Secondary reporting and opinion

#### 3.15 Korean news media (Nate, 천지일보, Fieldnews, ESG경제, digitalasset.works, newsw, smartfn, zum, Newsworker)

| | |
|---|---|
| **Authoritative for** | That the outlet reported X on date Y |
| **NOT authoritative for** | The truth of the allegation, any legal finding, corporate structure |
| **Confidence** | `SECONDARY`, or `SNIPPET_ONLY` where only a search snippet was seen |
| **Mandatory** | Every legal item carries a §4 classification. **Never** "fraud", "Ponzi", "manipulation", or "illegal" as established fact. Note the Press Arbitration Commission **ordered a correction** against one such report (L12) — secondary reporting here has a demonstrated error rate. |

#### 3.16 Opinion pieces (e.g. lawtalk.co.kr) — `OPINION`. Never a finding. Always labelled.

#### 3.18 Internally authored documents (`research-inputs/`, handoffs, theses, prior outputs)

| | |
|---|---|
| **Authoritative for** | Its own analysis, its own calculations, and data it directly measured |
| **NOT authoritative for** | Any external fact it restates; token identity; contract state; anything it did not measure |
| **Confidence** | `SECONDARY` for restated facts; `CLAIM` for assertions; **never** `VERIFIED` by virtue of authorship |
| **Identity** | Must pass §2.3 like any source. **No internal privilege** (§2.5). |
| **Demonstrated failure modes (both observed 2026-09-30)** | 1. **Stale-claim carriage** — `PIP_Week_2_thesis.pdf` (30 Sep) repeated the GoPlus "can mint / disable sells / change fees" warning that `sut-coin-research` v2 (29 Sep) had already retired, and mis-cited CoinGecko as its source. 2. **Contamination recurrence** — the same document re-attributed the BitMart delisting to SuperTrust after v2 corrected it to Sanity United. |
| **Required handling** | Trace every restated claim to its original external source and grade *that*. Check every claim against the current baseline before use. Record the reconciliation in `research-change-log.md`. |

**Specific register entries:**

| Document | Status |
|---|---|
| `SUT_Coin_Detail_Research.pdf` | **DUPLICATE** of `sut-coin-research-2026-09-29.txt` — one source, two formats (§2A) |
| `PIP_Week_2_thesis.pdf` | Partly new (top-100 benchmark, RWA standard); **two claims rejected** (GoPlus control, BitMart) |
| Top-100 peer figures within it | `SECONDARY`, single-source CoinMarketCap, `observation_time` 2026-09-29/30, peers ticker-keyed and unverified |

#### 3.17 App stores — authoritative for download bands and ratings only. A download is not
a SUT transaction.

---

## 4. Legal-item classification (mandatory enum)

Every legal/regulatory/reputational item must carry exactly one:

| Class | Meaning |
|---|---|
| `VERIFIED EVENT` | Established by a primary/authoritative record |
| `REPORTED ALLEGATION` | Alleged; unproven; outcome may be unknown |
| `EXCHANGE-STATED CONCERN` | A venue's stated rationale — its view, not a finding |
| `LEGAL PROCEEDING` | A filed/ongoing process; **not** an outcome |
| `COMPANY RESPONSE` | The subject's own statement |
| `UNRESOLVED` | Contested, outcome unknown |
| `OPINION` | Commentary |

**Prohibited without a competent authoritative source:** *fraud, Ponzi, scam,
manipulation, illegal, criminal*, and any equivalent, as statements of fact.

---

## 5. Source conflict handling

**Silent selection is forbidden.** When sources disagree on a material metric:

1. **Preserve every observation** with full metadata.
2. **Create a `DATA CONFLICT` record** with a stable ID (`C1`…`Cn`, registered in
   `research-baseline.md` §10).
3. **State the methodological reason** for the divergence, or `UNKNOWN`.
4. **Choose a canonical series per analysis, explicitly and visibly** — never blend.
5. **Never merge provider series into one line** on a chart (baseline Graph 2 rule).

### 5.1 Canonical-series designations for the May 2026 case

| Analysis | Canonical series | Why |
|---|---|---|
| Price level & intraday structure | **DEX pool `0x092295c9…e165` OHLCV** | Only `CONTRACT_VERIFIED` series; provides intraday highs/lows |
| Cross-check of price | CoinGecko + Coinranking closes | Independent; agree within ~1–5% |
| Volume | **No canonical series — conflict unresolved (C4)** | Up to 4.2× divergence; report all three separately |
| Market control (BTC/ETH) | CoinGecko | Appropriate for major assets |
| On-chain flows | Polygon RPC logs (primary), Blockscout (cross-check) | Chain state is authoritative |
| Holder count | **Report both** (CertiK 54,052 / Blockscout 56,241) | Definitional difference (C1) |
| Concentration | **Report both, labelled** (CertiK MHR 54.25% / our top-10 ~71%) | Different metrics (C6) |

---

## 6. API / public-source limitations (verified 2026-09-30)

| Source | Status | Workaround |
|---|---|---|
| `polygonscan.com` | Blocks automated access | Blockscout + RPC |
| `polygon-rpc.com` | **403 — "API key disabled, tenant disabled"** | drpc / publicnode / Blockscout eth-rpc |
| `rpc.ankr.com/polygon` | Requires API key | as above |
| `polygon.llamarpc.com` | Empty response | as above |
| `bitmart.zendesk.com` | **Cloudflare challenge (403)** | Archive services; **identity remains unverified** |
| `web02.gate.com.tr` | No response | Archive services |
| `supertrust.club` | Partly blocked | WordPress JSON interface |
| Korean news sites | Several block automation | Snippets only — mark `SNIPPET_ONLY` |
| Blockscout pagination | Cannot reach far history on busy addresses | `eth_getLogs` over explicit block ranges |
| CoinGecko public API | Rate-limited, no key | Throttle; cache |

### 6.1 Block-timestamp interpolation (declared method)

For daily bucketing of May log data, timestamps were interpolated from anchors
block `86,236,778` = `2026-05-01T00:00:00Z` and block `87,436,510` = `2026-05-26T00:00:01Z`
(≈1.8004 s/block). **Accurate to ~minutes over the window — adequate for daily buckets,
NOT for sub-hourly event ordering.** Any hourly analysis must fetch exact block timestamps.
Records produced this way carry `methodology = "block_ts_interpolated"`.

---

## 7. Fallback chains

| Need | 1st | 2nd | 3rd | If all fail |
|---|---|---|---|---|
| Chain state | Polygon RPC (drpc) | publicnode | Blockscout eth-rpc / REST | `DATA UNAVAILABLE` |
| Transfer history | `eth_getLogs` | Blockscout paginated | — | `DATA UNAVAILABLE` |
| DEX price/liquidity | GeckoTerminal (by contract) | DexScreener | direct pool logs | `DATA UNAVAILABLE` |
| CEX price/volume | Exchange API | CoinGecko | Coinranking / CoinCodex | Report conflict, no canonical |
| CEX depth (historical) | — | — | — | **`DATA UNAVAILABLE` — no known retroactive source** |
| Exchange notices | Exchange site | Web archive | Search snippet (`SNIPPET_ONLY`) | `IDENTITY NOT VERIFIED` |
| Legal facts | Court/regulator record | Primary media | Secondary media | `REPORTED ALLEGATION` |
| Utility/adoption | Company systems (no access) | On-chain proxies | Company claims (`CLAIM`) | `DATA UNAVAILABLE` |

---

## 8. Prohibited source practices

1. Merging data on ticker alone.
2. Averaging across DEX pools (dead-pool contamination, §3.4).
3. Presenting CMC's "3.7" as CertiK's score.
4. Presenting CertiK's Major Holding Ratio and our top-10 % as the same metric.
5. Blending provider volume series.
6. Promoting a `SNIPPET_ONLY` item to a finding.
7. Treating a company announcement as a completed action.
8. Treating market cap as available liquidity.
9. Assigning a wallet a role (exchange, treasury, company, market maker, LP, whale)
   without public evidence. **Default is `UNKNOWN`.**
10. Using an undated contract-admin claim (state changed on 2026-07-20).
11. Recording a CertiK value without `retrieved_at`.
12. Presenting the Feb 2026 rank jump as adoption.
13. Letting an AI model decide a root cause.
