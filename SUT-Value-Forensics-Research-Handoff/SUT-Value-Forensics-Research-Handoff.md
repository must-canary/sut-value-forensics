# SUT Value Forensics — Research Handoff & Baseline

**Purpose:** This document is the frozen research handoff for continuing the SUT Value Forensics project without restarting research from zero.

**Prepared:** 2026-09-30
**Project:** SuperTrust / SUPER TRUST (SUT)
**Primary contract:** `0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55`
**Chain:** Polygon PoS

---

## 1. Final research objective

We are investigating SUT as a company-owned/project-issued asset. The goal is not to predict price or design a generic QA dashboard. The goal is to determine, with evidence, why SUT lost market value and which measurable mechanism caused or amplified the decline.

### Primary question

> **What measurable market, on-chain, exchange, business, utility, or information factor caused or amplified SUT's value decline, especially the May 2026 crash?**

### First investigation case

**May 2026 Crash Forensics**

Investigation window: **2026-05-01 through 2026-05-25**

Primary event window: **2026-05-17 through 2026-05-19**.

The uploaded research framework explicitly recommends decomposing the decline into market conditions, liquidity, supply, holder behavior, exchange accessibility, ecosystem activity, utility and token-value capture, then testing the competing hypotheses rather than starting from a presumed answer.

---

## 2. What is already established from research

### 2.1 SUT identity

The target asset is **SuperTrust (SUPER TRUST), ticker SUT**, a Polygon-based token.

The contract address that must be used for identity validation is:

`0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55`

**Critical rule:** ticker alone is never sufficient. There are other unrelated crypto assets using the ticker `SUT`.

Every future data record must be tied to:

- token contract
- chain
- symbol
- exchange
- trading pair
- source
- timestamp

This is a mandatory data-integrity control.

### 2.2 Supply baseline

Official SuperTrust material currently states:

- Total supply: **238,403,732 SUT**
- Burned: **50,000,000 SUT**
- Circulating/distributed amount stated by the project: **188,403,732 SUT**
- Project site also displays a **50,000,000 SUT company lockup quantity**.

The terminology around “100% in circulation” versus a separate “company lockup quantity” must be preserved and reconciled rather than silently normalized.

Official notice dated **2026-02-06** says the project asked CoinMarketCap to correct an incorrectly displayed circulating supply from **2,024,492.29 SUT** to **188,403,732 SUT**. This is an important market-data integrity event and must be included in the event timeline.

### 2.3 May 2026 crash

Independent historical records show a sharp SUT-specific collapse:

| Date | CoinGecko close | CoinGecko volume | Coinranking close | Coinranking volume |
|---|---:|---:|---:|---:|
| May 9 | 0.608002 | 501,574 | 0.608 | 338,928 |
| May 10 | 0.554506 | 269,486 | 0.543 | 764,283 |
| May 11 | 0.513818 | 624,882 | 0.513 | source-specific |
| May 12 | 0.622627 | 1,055,316 | 0.624 | 1,070,000 |
| May 13 | 0.630649 | 733,426 | 0.628 | 853,111 |
| May 14 | 0.634806 | 639,314 | 0.633 | 799,906 |
| May 15 | 0.682996 | 672,653 | 0.683 | 2,610,000 |
| May 16 | 0.680758 | 2,002,699 | 0.679 | 433,992 |
| **May 17** | **0.478317** | **420,380** | **0.482** | **1,780,000** |
| **May 18** | **0.124481** | **1,579,087** | **0.131** | **3,500,000** |
| May 19 | 0.152232 | 2,585,803 | 0.150 | 951,722 |
| May 20 | 0.306516 | 522,068 | 0.307 | 1,610,000 |

**Important:** market-data providers materially disagree on reported volume and, to a smaller degree, price. Do not merge provider numbers into a single series. Preserve source-level observations and document the selected canonical series for each analysis.

The core finding is robust across sources: the May 17–18 event was an extreme SUT-specific repricing accompanied by a volume shock.

### 2.4 Broad-market control

The May 18 SUT decline is vastly larger than the concurrent BTC/ETH movement. Therefore a generic “the crypto market fell” explanation is insufficient to explain the observed magnitude.

This should be tested formally using normalized relative return / residual-return analysis rather than only visual inspection.

### 2.5 Exchange-access events before May 2026

**Gate TR** announced on 2026-03-19 that SUPERTRUST (SUT)/TRY no longer met its platform criteria and that deposit, withdrawal and trading services would stop on 2026-04-01 03:00 UTC.

**BitMart:** public notice says SUT/USDT trading/deposit closed on 2026-03-16 and withdrawal closed on 2026-05-16. However, because SUT is a ticker collision and BitMart also has records involving a different SUT token, the BitMart event must be contract-address reconciled before it is used as a SuperTrust causal event.

Therefore:

- Gate TR event = **high-confidence SuperTrust-specific event**
- BitMart event = **relevant but identity-reconciliation required before causal use**

### 2.6 GOPAX / Korea exchange history

GOPAX's official 2024 SUT review material identified the asset as **SuperTrust (SUT)** and recorded the then-current supply/distribution model. Its 2024 AML/review report said it found no prohibited legal issue at that time and recommended monitoring distribution-plan compliance and possible market-manipulation issues. It also documented a contract pause function at that time.

A later 2025 GOPAX record (secondary reconstruction) says SUT was designated an investment-caution asset and that trading support was subsequently terminated. The cited reasons included possible legal/regulatory-policy issues in the business and non-disclosure of material information, among other investor-protection considerations.

SuperTrust's own official notice dated 2025-08-21 says it planned to file a provisional injunction challenging the GOPAX support-termination decision.

**Research treatment:** GOPAX events are historical **information/regulatory/reputational events**, not proof that they caused the May 2026 crash.

### 2.7 Legal/reputation events

A November 2025 Korean report states that a chat-room operator who was accused by M-Square Global of defamation and personal-information violations was forwarded to prosecutors on 2025-11-12 with a recommendation for indictment. The report also says M-Square Global filed a separate civil damages claim of approximately KRW 2 billion. The accused operator disputed the allegations and said the postings were based on publicly available materials and intended as risk warnings.

**Research treatment:** this is a documented legal/reputational event and contested allegation set. It is not proof of fraud or misconduct by SUT.

### 2.8 Project economic interventions

The official SuperTrust site contains a **2026-03-30 “Short-Term SUT Value Surge Strategy”**. It proposes a 60% lock of users' remaining credit balance, lower weekly settlement, and an expected reduction in SUT circulating quantity.

This is a critical business-economics hypothesis because it gives us a testable intervention:

> Did the announced settlement/lock mechanism actually change on-chain supply distribution, user SUT balances, settlement flows, market liquidity, or subsequent price behavior?

The project also published material about reducing market distribution through community self-locking and sequential buybacks and says it has more than 2,000 SUT payment stores.

These are **project claims/announcements**, not independent proof of economic adoption. The tool must separate reported claims from measured usage.

### 2.9 Token/contract security history

A 2024 SuperTrust smart-contract audit report stated:

- standard ERC-20 token behavior
- total supply 238,403,732
- pause function existed
- largest holder was reported around 29%
- second-largest holder was a burn address around 21%

Later direct/on-chain research indicated a different current contract state (including owner/mintability/pause-related properties). This apparent state evolution must be independently rechecked from dated on-chain evidence.

**Do not reconcile by assumption.** Treat it as a historical governance/configuration-change investigation item.

### 2.10 Wallet-flow lead around the crash

A highly relevant on-chain relationship was identified:

`0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c`
→
`0x7CC2F8914b4D77b68355757286f146373F4BF7ad`

Known SUT transfers in the investigated sequence include:

- May 9: ~1.96M SUT
- May 10: ~450K SUT
- May 12: ~830K SUT
- May 14: ~1.09M SUT
- May 15: ~1.36M SUT
- May 17: ~230K SUT

A May 17 transaction is directly visible on PolygonScan and confirms 230,000 SUT transferred from the source to the destination.

The same wallet relationship also involved large USDT0 transfers in the same period, including multi-million-dollar movements.

**Interpretation:** this is a high-priority investigation lead, not proof of causation and not proof of wallet ownership/role.

The destination wallet must be traced forward to determine whether the received SUT was:

- sent to a centralized exchange
- swapped on a DEX
- added/removed from an LP
- transferred to another wallet
- retained

### 2.11 Current-data / source discrepancy

Historical market providers disagree materially on reported trading volume during the crash while agreeing on the broad price event. This makes provider reconciliation a first-class research problem.

The tool must preserve raw provider observations and source metadata instead of silently choosing the most convenient number.

---

## 3. Research gaps that must NOT be forgotten

These are the remaining questions before we claim a root cause.

### A. Exact trigger of the May 17–18 crash

We still need to establish what initiated the sell-side shock.

Candidates:

- concentrated holder selling
- CEX inflow/outflow event
- DEX sell/swaps
- liquidity-provider withdrawal
- exchange-access event spillover
- project/business announcement
- company/SuperSave settlement flow
- supply/distribution change
- market-making activity
- external legal/regulatory/reputation event
- another event not yet identified

### B. Complete historical wallet reconstruction

The identified wallet pair is only a lead. We need complete forward/backward traces around May 1–25 and, ideally, the top 20–50 relevant holders.

### C. Historical liquidity/depth

Daily volume is not enough. We need order-book depth, spread, DEX liquidity and simulated price impact where data is available.

### D. Historical exchange-by-exchange data

We need to know what happened on each active market around May 17–18 rather than treating aggregate volume as if it represented a single market.

### E. Real SUT usage

We need measured data for:

- active wallets
- transaction counts
- SUT-denominated payments
- SoloPay transaction volume
- active merchants/users
- platform usage
- revenue/fees associated with SUT
- token velocity

Project claims are not substitutes for measured data.

### F. Company / SuperSave economics

Need actual settlement and balance-flow records to test whether internal ecosystem mechanisms created net SUT demand, net supply, or merely changed the timing of flows.

### G. Supply reconciliation

Need a dated supply table from chain state and contract events for May 2026.

### H. Information/reputation timeline

Need timestamped mapping of:

- GOPAX actions
- legal/reputational events
- project responses
- official notices
- exchange notices
- major partnerships/products

against price/volume/flow changes.

### I. Data-source identity validation

Every source must be mapped to the SuperTrust contract before inclusion.

This is mandatory because of the SUT ticker collision.

---

## 4. Final hypothesis matrix

| ID | Hypothesis | Required data | Main experiment | Supporting evidence | Contradictory evidence | Status at handoff |
|---|---|---|---|---|---|---|
| H1 | Broad crypto market shock | SUT, BTC, ETH, crypto index | Relative/residual returns | SUT moves with market | SUT materially underperforms controls | **Weak / likely insufficient** |
| H2 | Liquidity / market-depth fragility | order books, DEX LP, spread, depth | Price impact and liquidity-vs-volatility | thin depth + large impact | deep liquidity during decline | **High-priority** |
| H3 | Concentrated holder selling | holder balances, transfers, CEX/DEX flows | Event-window flow correlation | large holders sell before/during declines | holders accumulate or retain | **High-priority** |
| H4 | Exchange-access deterioration | listing/delisting/withdrawal events + exchange flows | Event study | liquidity/volume falls after event | no measurable market effect | **High-priority** |
| H5 | Company/SuperSave/settlement flow | settlement records, lockups, buybacks, SUT flow | Net demand/supply analysis | internal flows precede declines | internal flows neutral/positive | **High-priority** |
| H6 | Supply/distribution shock | total/circulating supply + holder movements | Supply event study | supply increases before decline | stable supply | **High-priority** |
| H7 | Weak organic utility | usage, merchants, payments, active users | Usage vs valuation/returns | low/stagnant demand | strong measured usage | **High-priority** |
| H8 | Weak token value capture | ecosystem activity + SUT demand | Economic value-capture analysis | ecosystem grows without SUT demand | SUT captures rising value | **High-priority** |
| H9 | External/regulatory/reputation event | timestamped notices/news/legal events | Event study | event aligns with abnormal return/flow | no market response | **High-priority** |
| H10 | Data-source/token-identity contamination | contract/pair/source mapping | Cross-provider identity audit | same ticker maps to different asset | contract mapping consistent | **Mandatory control** |

---

## 5. Required graphs for Case #001

### Graph 1 — SUT vs BTC/ETH

Normalize all assets to 100 at the beginning of the investigation window. This separates market-wide movement from SUT-specific residual performance.

### Graph 2 — SUT price vs volume

Use source-specific values. Do not blend CoinGecko, Coinranking and CMC volumes into one line.

### Graph 3 — Large-holder net flow vs SUT price

Plot hourly/daily SUT inflow/outflow for the largest relevant wallets against price.

### Graph 4 — Exchange flow vs SUT price

Known exchange deposits/withdrawals and, where possible, exchange netflow.

### Graph 5 — Liquidity / price impact

Before/during/after May 18, estimate price impact for standardized order sizes such as $10K, $50K and $100K where market-depth data supports the calculation.

### Graph 6 — Event timeline

Price/volume with vertical markers for exchange events, project notices, legal/reputation events, supply changes, company interventions and large wallet events.

### Graph 7 — Usage vs market cap

Monthly/weekly actual SUT ecosystem activity against SUT market capitalization.

### Graph 8 — Token velocity

Transaction value relative to circulating market capitalization over time.

---

## 6. Causal discipline

The project must distinguish four levels:

1. **Fact** — directly verified event/data.
2. **Correlation** — variables move together within a defined time window.
3. **Hypothesis** — a proposed mechanism consistent with the data.
4. **Causal finding** — only after timing, magnitude, controls, mechanism and alternative explanations have been evaluated.

Never label a wallet as “market maker”, “treasury”, “company”, “whale”, etc. without evidence supporting the classification.

Never label an event as fraud, manipulation, or misconduct merely because it coincides with a price decline.

---

## 7. Experiment design

### Historical experiment

1. Establish baseline for May 1–16.
2. Isolate May 17–18 event.
3. Examine May 19–25 aftermath.
4. Compare against control assets and alternative SUT-specific events.
5. Quantify timing and magnitude.

### Controlled business experiment

After historical root-cause work identifies a controllable bottleneck:

- 30-day baseline
- one controlled intervention
- 60–90 day measurement
- compare pre/post operating metrics

Primary success metrics should be underlying economic indicators, not price alone.

Candidate metrics:

- active users
- SUT transactions
- payment volume
- active wallets
- merchant activity
- token velocity
- liquidity/depth
- exchange accessibility

---

## 8. Data-source hierarchy

Use the strongest available source for each data type.

### Tier 1 — Primary / on-chain

- PolygonScan / Polygon RPC
- official SUT project notices and site
- official exchange notices
- official project whitepaper/audit documents

### Tier 2 — Independent market aggregators

- CoinGecko
- CoinMarketCap
- Coinranking

### Tier 3 — Secondary reporting

- reputable Korean news/reporting
- exchange/community analyses

Secondary claims must be labeled as such and not silently promoted to fact.

---

## 9. Key source URLs

### SUT / official

- https://supertrust.club/
- https://supertrust.club/notice/4098/
- https://supertrust.club/notice/4082/
- https://supertrust.club/notice/4050/
- https://supertrust.club/notice/4031/
- https://supertrust.club/wp-content/uploads/2024/12/SUT_%EC%8A%A4%EB%A7%88%ED%8A%B8%EC%BB%A8%ED%8A%B8%EB%9E%99%ED%8A%B8-%EA%B0%90%EC%82%AC%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf
- https://supertrust.club/wp-content/uploads/2022/10/SUPER-TRUST_WHITEPAPERENG_ver3.0_250325.pdf

### GOPAX

- https://resources.gopax.co.kr/crypto-details/review-report/Report_SUT.pdf
- https://resources.gopax.co.kr/crypto-details/pdf/Explain_SUT.pdf
- https://resources.gopax.co.kr/crypto-details/ko/Whitepaper_SUT.pdf

### Exchanges

- https://bitmart.zendesk.com/hc/en-us/articles/47853762586523-Announcement-on-the-Delisting-of-SUT
- https://web02.gate.com.tr/en/announcements/article/50303

### Market history

- https://www.coingecko.com/en/coins/super-trust/historical_data
- https://coinranking.com/coin/-qb6-VW8s%2Bsupertrust-sut/historical-data?page=2
- https://coinranking.com/coin/-qb6-VW8s%2Bsupertrust-sut/historical-data?page=3&unit=days

### On-chain lead

- https://polygonscan.com/tx/0x1755d3acb0035139f39e787e36ac4ea88a256a3679dea313f6789251a22366c8
- Wallet A: `0xaaA4D5dD26Eb1A2aFe5FD5Fb529Fc24CEE89cc2c`
- Wallet B: `0x7CC2F8914b4D77b68355757286f146373F4BF7ad`

### Legal/reputation reporting

- https://v.daum.net/v/KzM3NsjJjI

---

## 10. Existing uploaded research that this handoff incorporates

The uploaded research document proposed the SUT Top-100 validation framework, with six core areas: real-world use, RWA value, payment utility, liquidity, transparency and distribution. It then evolved into the more focused May 2026 value-decline investigation with a hypothesis matrix and controlled-intervention plan. The file explicitly recommends baseline measurement, bottleneck identification and controlled experiments rather than making the Top-100 rank itself the engineered KPI.

Source: uploaded research notes from this conversation.

---

## 11. What Claude must do next

Claude must **READ THIS HANDOFF FIRST** and must not restart from zero.

Claude's next job is to create these five files, extending this baseline rather than replacing it:

1. `research-baseline.md`
2. `data-source-contract.md`
3. `hypothesis-matrix.md`
4. `may-2026-investigation-plan.md`
5. `evidence-model.md`

Before implementing the UI, Claude must:

- reconcile source identity using the SuperTrust contract address
- preserve source-level market data differences
- identify any remaining unanswered questions
- define ingestion interfaces and schemas
- define evidence lineage
- define hypothesis evaluation rules
- define graph data structures
- add tests for identity validation and evidence integrity

### Hard rules

- No new ABI tooling.
- No generic QA dashboard.
- No price prediction.
- No automated trading.
- No fake data.
- No AI root-cause decisions.
- No unsupported wallet-role assumptions.
- No silent source reconciliation.
- Do not commit or push until the architecture is reviewed.

---

## 12. Research status at handoff

### Strong evidence

- May 17–18, 2026 was an extreme SUT-specific price event.
- Trading volume increased sharply around the event.
- Major exchange-access changes preceded the event.
- Large SUT and stablecoin transfers occurred around the event window.
- Multiple official/project and exchange notices provide a substantial event history.

### High-priority hypotheses

- Liquidity / market-depth fragility
- Concentrated holder selling
- Exchange-access shock
- Company/SuperSave/settlement flow
- Weak organic demand
- Information/regulatory/reputation effects

### Not proven

- Exact trigger of the May crash
- Causal responsibility of the identified wallet
- Manipulation
- Fraud
- Company causation
- Any single-variable explanation

**The project should move from this handoff into evidence collection, not another broad strategy/research cycle.**
