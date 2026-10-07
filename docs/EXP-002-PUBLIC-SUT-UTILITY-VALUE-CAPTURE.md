# EXP-002 — Public SUT Utility & Token Value-Capture Evidence Audit

**Experiment status:** COMPLETE — evidence collected, classified, and submitted for human review.
**Retrieval date:** 2026-10-07 (all retrieval timestamps in §20 are UTC).
**Scope:** GAP-D / OPP-L4 only. EXP-001 is untouched.
**Created & Implemented by Magha Ram.**

---

> ## ⚠ Identifier collision — requires a governance decision
>
> **FACT.** The identifier `EXP-002` is **already in use** in the frozen code layer for a different
> experiment: `src/data/experiment-runs.ts` defines `id: 'EXP-002'`, `opportunityId: 'OPP-02'`, title
> **“Reproducible weekly active addresses”**, stage `PLANNED`, with captures under
> `WEEK-2026-W39` in `src/data/baseline-captures.ts` and a card on the **Baseline Operations** screen.
>
> This document was commissioned as “EXP-002 — Public SUT Utility & Token Value-Capture Evidence Audit”,
> so two distinct experiments now share one ID. That is a traceability defect: an experiment ID must
> resolve to exactly one experiment.
>
> **Neither has been renumbered here.** The in-code `EXP-002` is frozen and must not be edited, and
> renaming this audit is a governance decision for a named human, not an automatic one. The recommended
> reconciliation is to renumber **this** audit (the in-code experiment is older and is referenced by
> frozen captures, UI and tests) — for example to `EXP-003` — on human approval. Until then, read
> `EXP-002` as ambiguous and disambiguate by title.
>
> **The two are substantively related, which is why this matters beyond bookkeeping.** The frozen
> in-code EXP-002 tests the same hypotheses (H7 / H8) and already lists, as one of its own secondary
> KPIs, *“Payment-associated transfers — **DATA UNAVAILABLE** until merchant addresses are published.”*
> This audit measured precisely that condition and found it still holds: **zero** publicly attributable
> merchant addresses (EXP002-EV-046, §11). So this audit supplies the evidence for a blocker the frozen
> experiment had already identified — it does not duplicate or supersede it.

---

## 1. Executive summary

EXP-002 asked one question: **can publicly verifiable evidence establish that SUT is actually used for a
real product, service or merchant payment, and can any such activity be linked to on-chain SUT
transactions?**

The answer, on the evidence collected, is **no — not from public sources, as of 2026-10-07**.

What the evidence does establish:

| # | Finding | Status |
|---|---|---|
| 1 | SUT has specific, dated, first-party utility **claims** — including a documented SUT payment procedure for ZERO PLUS and a SUT payment-discount claim for L2U | **VERIFIED AS CLAIM** |
| 2 | Several officially listed products are genuinely live and publicly reachable | **VERIFIED** |
| 3 | Mainnet SUT on-chain activity is real and measurable: 473 transfer legs / 399 transactions in a 16 h 40 m window | **VERIFIED** |
| 4 | The officially listed SUT payment rail (SoloPay) documents its own production environment as **“not yet publicly available”**, and every SUT example in its documentation is a **Polygon Amoy testnet** token that is **not** the mainnet SUT contract | **VERIFIED** |
| 5 | No address in this experiment could be publicly attributed to SuperTrust, MSQUARE, SoloPay, a merchant or an exchange | **ADDRESS OWNERSHIP UNVERIFIED** |
| 6 | **0 of 399** real mainnet SUT transactions resolved against the only first-party public transaction-to-product verification endpoint | **VERIFIED (negative)** |
| 7 | No SUT payment count, payment volume, merchant count or repeat-usage series can be computed from public evidence | **DATA UNAVAILABLE** |

The single most consequential finding is **#4**. The payment rail that the official site presents as SUT's
payment utility is a real, actively developed product — but its production environment is documented as not
publicly available, its only reachable checkout is a self-declared demo store, and the token in all of its
SUT examples is a **test deployment on Polygon Amoy**, verified here to be a different contract from mainnet
SUT. Documented SoloPay SUT activity therefore **cannot** be mainnet SUT activity.

**GAP-D status: C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED.** See §18.

This is not a finding that SUT has no utility. It is a finding about **what public evidence can and cannot
prove**, which is the question EXP-002 was built to answer.

---

## 2. Relationship to SUT Value Forensics

EXP-002 is a continuation of the existing project and uses the existing evidence chain unchanged:

```
RAW DATA -> TIMESTAMP -> EVENT -> MEASUREMENT -> HYPOTHESIS
         -> EXPERIMENT -> EVIDENCE -> HUMAN REVIEW -> STATUS
```

| Existing artefact | Effect of EXP-002 |
|---|---|
| Frozen research layer (`research-baseline.md`, `hypothesis-matrix.md`, `evidence-model.md`, `data-source-contract.md`, `research-freeze.md`, `THESIS.md`) | **Not modified.** No file, no byte. |
| `src/` and `test/` | **Not modified.** EXP-002 required no code change, so no byte-identity assertion is disturbed. |
| **EXP-001** (liquidity / market depth) | **Frozen and untouched.** Its baseline, thresholds, runs, governance state and evidence are unchanged. See §14. |
| **In-code `EXP-002`** — “Reproducible weekly active addresses”, `OPP-02`, stage `PLANNED`, captures `WEEK-2026-W39` | **Frozen and untouched.** A **different experiment that already holds this ID** — see the collision notice above. This audit measured the “payment-associated transfers” blocker that experiment itself records as DATA UNAVAILABLE, and confirmed it still holds. |
| H7 (weak organic utility / adoption) — INCONCLUSIVE | **Not changed.** EXP-002 supplies new public evidence but does not meet the bar to re-status a frozen hypothesis. Routed to `THESIS-UPDATE-CANDIDATES.md` as a candidate, not an edit. |
| H8 (weak token value capture) — DATA_UNAVAILABLE | **Not changed**, for the same reason. |
| GAP-D / OPP-L4 | **Advanced.** The in-code lab status remains the literal `DATA UNAVAILABLE`; EXP-002 records an experiment-level status at §18. |

EXP-002 is **not** a new project, **not** a replacement for EXP-001, **not** a production integration, and
**not** an implementation of SUT OpenPay (§20 of the brief; see §19 here).

---

## 3. GAP-D current state (entering EXP-002)

| Field | Value on entry |
|---|---|
| Gap | GAP-D — Utility / token value-capture measurement |
| Status | DATA UNAVAILABLE |
| Evidence basis | H7 INCONCLUSIVE, H8 DATA_UNAVAILABLE; no product telemetry connected |
| Lab opportunity | OPP-L4 — Utility / value-capture measurement |
| Next evidence required | Identify measurable product telemetry connecting real product usage with SUT-related activity |
| Blocking constraint | Company-side telemetry and access unavailable |
| DEV environment | Available, contains no real transaction activity |

**Stated explicitly, as required:** the DEV environment contains no real transaction activity available for
this research; therefore **DEV cannot establish production usage**. An empty DEV environment is *not*
evidence of zero production usage, and is not used as such anywhere in this document.

Because company-side telemetry is unavailable, EXP-002 pursues GAP-D through **publicly verifiable evidence
only**.

---

## 4. Research question

**Primary.** Can publicly verifiable evidence establish that SUT is actually used for a real product,
service, merchant payment, platform activity or other measurable utility — and can any such activity be
reliably linked to on-chain SUT transactions?

**Secondary.**

| # | Question | Answer | §|
|---|---|---|---|
| 1 | What utility does the official SUT ecosystem publicly claim? | Answered — 14 claims inventoried | §8 |
| 2 | Which products/services publicly claim SUT payment or SUT-related utility? | Answered — 7 officially listed projects, audited individually | §8, §9 |
| 3 | Are those product/payment flows publicly accessible? | Answered — none of the SUT payment flows is | §9 |
| 4 | Can actual SUT on-chain activity be identified? | **Yes** — measured | §10 |
| 5 | Can public wallet/address ownership or attribution be established? | **No** | §11 |
| 6 | Can a specific SUT transaction be linked to a specific product/service/payment? | **No** — 0 of 399 | §12 |
| 7 | Is there evidence of measurable token value capture? | **No** | §14 |
| 8 | What remains unverified or unavailable? | Enumerated | §15, §16 |

---

## 5. Experiment definition

| Field | Value |
|---|---|
| ID | EXP-002 |
| Title | Public SUT Utility & Token Value-Capture Evidence Audit |
| Gap | GAP-D |
| Opportunity | OPP-L4 |
| Type | Evidence-gathering audit. **Not** an intervention, **not** a measurement of an intervention. |
| Blockchain identity anchor | `0x98965474ecbec2f532f1f780ee37b0b05f77ca55` (SUT, Polygon chain 137) |
| On-chain observation window | Blocks 95,056,696 – 95,096,695 (2026-10-06T12:36:37Z → 2026-10-07T05:17:08Z) |
| Executable by this application | **No.** EXP-002 produces evidence and status only; it registers nothing and approves nothing. |
| Thresholds | **None proposed, none registered.** §14 lists candidate indicators as *proposed metrics pending business approval*. |
| Human review | **REQUIRED and NOT YET RECORDED.** |

### Actions explicitly not taken

No purchase was made. No payment was created, submitted or simulated against any production system. No
wallet was created. No merchant, user, transaction, payment volume, revenue or telemetry was fabricated. No
write request was issued to any third-party system. All third-party interaction was read-only, and the one
first-party API used (§12) is the endpoint the official SuperTrust website itself calls from an
unauthenticated browser.

---

## 6. Methodology

The strict evidence principle governing this experiment:

> **ON-CHAIN SUT ACTIVITY ≠ PRODUCT USAGE.**
> A SUT transfer alone does not prove merchant payment, product usage, customer purchase, service
> consumption, revenue, business activity, value capture or adoption.

Linkage was tested against the seven-link chain, and every break is marked:

```
SUT UTILITY CLAIM        -> §8   VERIFIED AS CLAIM (14 claims)
PUBLIC PRODUCT/SERVICE   -> §9   VERIFIED for several products
PUBLIC PAYMENT/USAGE FLOW-> §9   *** BREAK — not publicly accessible for any SUT flow ***
IDENTIFIABLE ACTIVITY    -> §10  VERIFIED (on-chain, intent not encoded)
ON-CHAIN TRANSACTION     -> §10  VERIFIED (399 transactions)
ENTITY / PRODUCT LINKAGE -> §11  *** BREAK — ADDRESS OWNERSHIP UNVERIFIED ***
                            §12  *** BREAK — 0 of 399 resolved ***
VERIFIABLE USAGE         -> §17  NOT ESTABLISHED
```

Three independent links are broken. Each break is documented with the retrieval that established it.

### Reporting discipline

Every statement in this document is tagged by kind, and the kinds are never mixed:

- **FACT** — directly observed and reproducible from a stated retrieval.
- **OBSERVATION** — measured by this experiment, with its window and method stated.
- **CLAIM** — asserted by a source; recorded with provenance, never adopted as fact.
- **INFERENCE** — reasoning over facts, labelled as such and separable from them.
- **DATA UNAVAILABLE** — required evidence could not be obtained.
- **CONCLUSION** — the status assigned after review of the above.

Speculative hedging is not used anywhere in this document — the vague formulations the brief prohibits are
absent by construction. Where evidence is insufficient, the status field says so in explicit terms.

---

## 7. Source hierarchy

| Level | Sources used in EXP-002 | Rows |
|---|---|---|
| **LEVEL 1 — official first-party** | supertrust.club (site, language file, notice corpus via its WordPress REST API, client source); zeroplus.live terms; l2u.co.kr; naturebook.club; moad.live; k-pop.supertrust.club; msq.market; guide.solonetwork.io; gateway.solonetwork.io; sample-merchant.dev.solonetwork.io; api.msq.market DeCT endpoint; app-store listings by the publisher | 29 |
| **LEVEL 2 — blockchain** | Polygon RPC (`eth_call`, `eth_getLogs`, `eth_getCode`, `eth_blockNumber`, `eth_getBlockByNumber`) on chain 137 and chain 80002; verified SUT contract; Blockscout and PolygonScan **attempted** | 10 |
| **LEVEL 3 — public third-party** | npm registry; Google Play / Apple App Store platform metrics | 2 |

No blog, forum post, unverified social claim or speculative commentary is used as evidence anywhere in this
document. Every material claim in §20 carries a source, a URL and a retrieval timestamp.

**Source limitation recorded at Level 2:** both public explorers — Blockscout's address API and PolygonScan's
address pages — returned **HTTP 403** behind a Cloudflare interstitial on 2026-10-07. Address labelling was
therefore unobtainable (§11). Chain state itself was read directly from RPC and is unaffected.

---

## 8. Official SUT utility claims

The official project list is published on supertrust.club and resolved from its own language file. Seven
projects are listed: **K-POP**, **SoloPay**, **MSQUARE ICARUS (MOAD)**, **MSQUARE NatureBook**,
**MSQUARE L2U**, **MSQUARE SuperSave (DeCT)**, **MSQUARE ZeroPlus**.

As the brief requires, **each was verified separately**, and being listed was not treated as evidence that
the project generates SUT payment activity.

### 8.1 Claim inventory

| Claim ID | Product / service | What SUT is allegedly used for | Mechanism stated? | User action publicly observable? | Transaction evidence exists? | Status |
|---|---|---|---|---|---|---|
| EXP002-EV-001 | Company-operated platforms (unnamed) | 30–50% platform-fee discount when paying with SUT, in South Korea | No | No | No | UTILITY CLAIM ONLY |
| EXP002-EV-002 | SoloPay | Gasless blockchain payment gateway | Yes — full API docs | Demo store only | No | UTILITY CLAIM ONLY |
| EXP002-EV-003 | K-POP platform | Ticketing and goods ecosystem | No | No | No | UTILITY CLAIM ONLY |
| EXP002-EV-004 | DeCT SuperSave | Expand SUT's real-world ecosystem | No (states an aim) | No | No | UTILITY CLAIM ONLY |
| EXP002-EV-005 | **L2U** | **Discount when paying with SUT** | No | No | No | UTILITY CLAIM ONLY |
| EXP002-EV-006 | K-POP concert ticketing | SUT-only payment during priority booking | Partially | No | No | UTILITY CLAIM ONLY |
| EXP002-EV-007 | K-MEGA Concert Sydney | Holder promotions, “Live Pass” digital asset | Yes (promotional) | No (HTTP 403) | No | UTILITY CLAIM ONLY |
| EXP002-EV-008 | **ZERO PLUS** | **Paying content usage fees in SUT** | **Yes — step by step** | No (login required) | No | UTILITY CLAIM ONLY |
| EXP002-EV-014 | SuperTrust app | Manage/convert SUT; accumulate SUT from connected services; DeCT credit recording | Partially | No | No | UTILITY CLAIM ONLY |

Full wording, URLs, retrieval and observation timestamps for every row: §20.

### 8.2 The two strongest claims

**EXP002-EV-008 — ZERO PLUS (FACT: this document exists and says this).** ZERO PLUS, operated by SUPERTRUST
Co., Ltd. (business registration 559-87-02646), publishes a *Cryptocurrency Payment Terms of Use*, last
amended **2026-01-26**, whose Articles 1–3 define a concrete SUT payment procedure: the member selects “SUT
coin payment” at the payment page; the company or an affiliated payment module **generates a wallet address
or QR code in real time**; the member remits the SUT equivalent; network gas is borne by the member; and the
company completes the payment and grants content access **after at least 3 confirmations**. Article 4 fixes
the KRW-equivalent at payment time. Article 5 imposes AML/KYC duties under Korean law, with identity
verification for high-value transactions (the document's own example: ≥ 1,000,000 KRW).

This is materially stronger than marketing language: it is a dated legal instrument describing a specific
on-chain settlement procedure.

**EXP002-EV-005 — L2U (FACT).** Official notice 4064, dated **2026-01-26**, states that the L2U platform has
opened and that a discount benefit applies when paying with SUT. L2U is live and publicly reachable, and its
page header renders a “1 SUT — KRW” rate element (§9).

### 8.3 Claim families are not interchangeable

**INFERENCE** (labelled; derived from EXP002-EV-001/004/008/014). The official claims divide into two
economically different families, and conflating them would be an error:

| Family | Claims | What it would imply if verified |
|---|---|---|
| **A — Payment utility** | Fee discount; L2U payment discount; ZERO PLUS SUT payment; K-POP SUT-only booking | Users **spend** SUT for goods or services → net purchase demand possible |
| **B — Credit / reward accumulation** | SuperSave, DeCT, P2U rewards, asset conversion | Users **accumulate** SUT as rewards, and convert → distribution to holders |

The app-store listing — the official product description carrying the most measured public traction (§9) —
describes Family **B**: users “accumulate SUT tokens” from connected services and accumulate digital credit
through SuperSave. **It does not claim merchant payment.**

This matters because the frozen research already established the governing discipline (H7/H8,
`research-baseline.md` §9.3): *distribution is not demand.* Tokens sent **to** users are supply reaching
holders, not evidence that anyone **bought** SUT for utility. Family B activity, however large, does not by
itself evidence value capture.

### 8.4 Officially documented value-capture mechanisms

Three mechanisms appear in the official notice corpus. All are recorded as **CLAIM** with exact figures.

| Evidence | Date | Mechanism as stated |
|---|---|---|
| EXP002-EV-009 | 2026-01-16 | Buyback: 2,000,000 USDT total; 1,000 SUT → 2,000 USDT; conditional on 100% SuperSave participation; applicants post a TXID in the SuperTrust channel |
| EXP002-EV-010 | 2025-08-14 | Buyback settled via an internal token: buy KWT with held SUT, then sell the KWT to the company; stated price 13,100 KWT |
| EXP002-EV-012 | 2026-03-30 | “Short-term SUT value surge strategy”: lock 60% of the remaining credit balance in KWT; weekly settlement reduced 60%; stated expectation of reduced SUT circulation |

**OBSERVATION.** All three operate between the company and its own members. None is product revenue, and
none routes through a merchant payment. **EXP002-EV-011** (2025-09-08) records that **KWT was formally
reclassified from a stablecoin to a utility coin**, with the notice stating that a utility coin cannot set
reserves.

**DATA UNAVAILABLE (EXP002-EV-055).** No public KWT contract address is published by the official site, by
its notice corpus, or by public search. The settlement unit named in these notices is therefore **not
independently observable on chain**, and no buyback execution could be verified.

This project makes no price, value, market-cap or ranking prediction, and adopts none of the expectations
expressed in these notices.

---

## 9. Public product / service availability

Each officially listed product was fetched read-only on **2026-10-07T05:07:31Z**. The question asked of each
was narrow: **can a member of the public observe a SUT payment flow?**

| Product | Reachable | Operator (as published) | SUT surface observed | Payment flow observable | Status |
|---|---|---|---|---|---|
| supertrust.club | Yes | SUPER TRUST | Live price/supply panel; DeCT lookup | n/a (corporate site) | **AVAILABLE** |
| **ZERO PLUS** | Yes | **SUPERTRUST Co., Ltd.** | Crypto-payment terms naming SUT | **No — login required** | **PARTIALLY AVAILABLE** |
| **L2U** | Yes | Leisure To You Co., Ltd. (569-87-03491) | “1 SUT — KRW” header element, **value empty in served HTML** | **No — no SUT checkout option** | **PARTIALLY AVAILABLE** |
| **K-MEGA Concert** | Landing page only | SUPER TRUST | — | **No — `/event/` returns HTTP 403** | **NOT PUBLICLY ACCESSIBLE** |
| MOAD / MSQUARE ICARUS | Yes | — | None (body script-rendered) | No | **PARTIALLY AVAILABLE** |
| NatureBook | Yes | Naturebook Lab Co., Ltd. | **None** | No | **AVAILABLE** (no SUT surface) |
| MSQ Market / SuperSave | Yes | **MSQUARE GLOBAL Co. Ltd** | Markets SUPER SAVE, blockchain payments | No | **AVAILABLE** |
| SuperTrust app | Yes | SUPER TRUST Co., Ltd | SUT/SuperSave/DeCT in description | No (app-internal) | **AVAILABLE** |
| **SoloPay** | Yes (docs, gateway, widget) | Solo Network / Solo Pay | SUT in all API examples | **Demo store only** | see §9.1 |

### Specific observations

- **ZERO PLUS (EXP002-EV-021).** The most specific SUT payment procedure in existence (§8.2) sits behind
  authentication. Its checkout, QR code, confirmation and receipt are not publicly observable. No purchase
  was attempted.
- **L2U (EXP002-EV-022).** A SUT-denominated UI element is present in the markup — a rate badge reading
  `1 SUT — 원`. In the served HTML the value is empty. This confirms a SUT integration point exists in the
  product's interface. It does **not** evidence a payment, and no SUT option, QR code or payment history is
  publicly reachable. L2U's published operator is a **separate company**, consistent with the frozen
  research.
- **K-MEGA Concert (EXP002-EV-023).** The promotion participation page named in official notice 4117 —
  `k-pop.supertrust.club/event/` — returns **HTTP 403**, as do `/event`, `/en`, `/ko`, `/promotion` and
  `/tickets`. The landing page itself serves (title: “SuperTrust — K-MEGA Concert Sydney 2026”).
- **NatureBook (EXP002-EV-025).** Officially listed as a SUT ecosystem project; its public site contains
  **no SUT, token or payment reference at all**, and its operator and 2021 copyright notice indicate a
  third-party product.
- **SuperTrust app (EXP002-EV-027).** Google Play: **4.9 stars, 2.63K reviews, 10K+ downloads**, FINANCE
  category, in-app purchases declared. Apple App Store: **4.8 stars, 350 reviews**. These are install and
  rating counts — real, public, measurable platform traction, and **not** SUT payment counts.

### 9.1 SoloPay — the officially listed payment rail

This is the most consequential section of the product audit. Five independent retrievals establish its
status.

| Evidence | Finding |
|---|---|
| **EXP002-EV-030** | SoloPay's own documentation states: **“The production environment is not yet publicly available. Please use the development endpoints for integration and testing.”** |
| **EXP002-EV-031** | **Every** SUT example in the documentation uses `chainId 80002` (Polygon **Amoy testnet**) and `tokenAddress 0xE4C687167705Abf55d709395f92e254bdF5825a2` |
| **EXP002-EV-040** | On-chain identity check (§10.1): that address is a **test deployment**, not mainnet SUT |
| **EXP002-EV-032** | The production gateway **is** reachable — `{service: Solo Pay Gateway, version: 0.1.0, status: running, supportedChains: [137, 80002]}` — but its price endpoint returns **HTTP 401** (“Missing or invalid x-api-key header”): all payment and merchant data is behind authentication |
| **EXP002-EV-034** | The only publicly reachable checkout is the sample merchant **“SOLO ROASTERS”**, which states of itself: **“A SoloPay demo store. No physical orders are shipped.”** |
| **EXP002-EV-033** | SoloPay is nonetheless **real and actively developed**: `@solo-pay/widget-js` has 9 public npm versions from 2026-02-11 to 2026-08-18 (latest 0.2.0), plus `@solo-pay/widget-react` 0.1.6. The declared repository `github.com/supertrust/solo-pay` is **not public** (404 to an authenticated API query) |
| **EXP002-EV-035** | **Zero of 30** official SuperTrust notices (2024-12-09 → 2026-08-08) mention SoloPay, Solo Pay or solonetwork |

**FACT.** The production gateway responds and declares support for Polygon mainnet (chain 137). **FACT.**
The documentation states production is not yet publicly available. These two facts are recorded side by
side; neither is used to overturn the other, and the authenticated surface behind the gateway is
**DATA UNAVAILABLE** to this experiment.

**CONCLUSION for §9.** No SUT payment or usage flow belonging to any officially listed product is publicly
accessible. This is the **second broken link** in the chain of §6 — and it is the reason transaction-level
linkage (§12) has no public reference data to work against.

---

## 10. SUT blockchain activity

Read directly from Polygon RPC. Representative and bounded, as the brief directs — a stated window, fully
enumerated, rather than an undirected bulk download.

### 10.1 Token identity (EXP002-EV-040)

| Chain | Address | `symbol` | `name` | `totalSupply` |
|---|---|---|---|---|
| Polygon 137 (mainnet) | `0x98965474…ca55` | `SUT` | — | **238,403,732** × 10^18 |
| Polygon 80002 (Amoy) | `0xE4C68716…25a2` | `SUT` | `SUPER TRUST` | **238,403,732** × 10^18 |
| Polygon 137 (mainnet) | `0xE4C68716…25a2` | **`TEST-USDT`** | `Tether USDT` | 20,000,000 × 10^6 |

**FACT.** The SoloPay documentation token carries SUT's symbol, name and exact total supply **on the Amoy
testnet**, while the same address on mainnet is a `TEST-USDT` mock. It is a **test fixture**, not the
canonical SUT token.

**CONCLUSION.** Any SUT payment activity described by SoloPay's documentation is testnet activity against a
test token. It **cannot** be mainnet SUT activity, and it cannot be counted toward SUT value capture.

**OBSERVATION.** Mainnet `totalSupply` reads **238,403,732 SUT** — equal to the “total supply” figure on the
official site, not the **188,403,732** “circulating” figure published on the same panel. The 50,000,000 burn
is claimed on the site and dated 2025-08-24. This experiment does not attempt to resolve the supply
discrepancy, which is already an open item in the frozen research.

### 10.2 Measured transfer activity (EXP002-EV-041, EV-042)

| Field | Value |
|---|---|
| Contract | `0x98965474ecbec2f532f1f780ee37b0b05f77ca55` (chain 137) |
| Block range | 95,056,696 – 95,096,695 (40,000 blocks) |
| Time range | 2026-10-06T12:36:37Z → 2026-10-07T05:17:08Z (**16 h 40 m**) |
| Transfer legs | **473** |
| Distinct transactions | **399** |
| Distinct senders | **251** |
| Distinct receivers | **139** |
| Gross SUT moved | **1,597,936.78 SUT** |
| Legs touching the Uniswap V3 SUT/USDT pool | **99** (48 pool-out / 51 pool-in; 22,180 / 24,632 SUT) |
| Legs **not** touching the pool | **374 of 473** |

**Methodology note, per `evidence-model.md` §6.1a.** “Gross SUT moved” is the sum of `Transfer` event values.
It is **not** trading volume and is **barred** from populating any volume field. It is reported solely as a
measure of transfer activity.

**OBSERVATION.** SUT activity is real and non-trivial, and **79% of transfer legs (374 of 473) never touch
the market pool**. Most observed SUT movement is non-market transfer activity. On-chain data encodes **no
intent** for any of it.

### 10.3 Transaction classification

Applying the brief's classification scheme to the eight most active addresses (EXP002-EV-045):

| Class | Addresses among the 8 most active |
|---|---|
| **A — publicly attributed product/merchant address** | **0** |
| **B — publicly attributed company/project address** | **0** |
| **C — publicly attributed exchange address** | **0** |
| **D — unknown address** | **7** — 4 EOAs and 3 contracts, every one ownership-unverified |
| **E — contract / system address** | **1** — `0x092295c9…e165`, the contract-verified Uniswap V3 SUT/USDT pool |
| **F — other** | **0** |

**Classes A, B and C are empty.** Not one address in this experiment carries a public attribution to a
product, merchant, company, project or exchange.

### 10.4 The strongest payment-shaped pattern, and why it is not a payment

**OBSERVATION (EXP002-EV-043).** Address `0xaaa4d5dd…cc2c`, an EOA, in the 16 h 40 m window:

- received **185 SUT transfer legs from 165 distinct senders**, totalling **31,088 SUT**;
- sent **zero** SUT;
- per-sender amounts: min **28**, median **70**, max **5,250** SUT — 97 senders in the 10–99 band, 64 in
  100–999, 4 in 1,000–9,999.

A many-to-one inflow of small amounts from many distinct, mostly one-time senders is the closest shape to a
payment-collection pattern found anywhere in this experiment.

**It is not evidence of payment.** The same shape is equally consistent with fee collection, deposit
collection, sweeping, buyback intake, exchange deposit and several other mechanisms. On-chain data cannot
distinguish them, and identity must never be inferred from transaction behaviour alone (brief §10).

**Hypothesis tested and not supported (EXP002-EV-044).** If this address were operating the buyback described
in official notice 4060 (SUT in → USDT out), USDT should flow back to the same counterparties. In the same
window the address sent USDT in **1** leg (37,000 USDT, to a single address) and received USDT in 25 legs
(4,370 USDT). **Zero of the 165 SUT senders received any USDT from it.** The same-window
SUT-in/USDT-out exchange shape is therefore **REJECTED for this window** — which does not exclude settlement
on another rail, at another time, or off-chain.

---

## 11. Address attribution

Attribution was treated as a separate evidence problem, as the brief requires, and no address was accepted as
belonging to any entity without public supporting evidence.

| Attribution route | Outcome |
|---|---|
| Official documentation / website publishing an address | **None found.** The official site publishes only the token contract link. |
| Official announcement naming an address | **None found** across 30 notices. Notice 4060 refers to a “buyback address” without stating it. |
| Verified explorer label | **DATA UNAVAILABLE (EXP002-EV-046)** — Blockscout address API and PolygonScan address pages both returned **HTTP 403** behind a Cloudflare interstitial |
| Multiple independent sources | Not achievable without either of the above |
| Contract-vs-EOA determination | **VERIFIED** via `eth_getCode` — see below |

### What could be established (EXP002-EV-045)

| Address | Type | Shape in window | Attribution |
|---|---|---|---|
| `0x092295c9…e165` | **Contract** | 48 out / 51 in | Uniswap V3 SUT/USDT 1% pool — **contract-verified** (frozen research EV-013) |
| `0xaaa4d5dd…cc2c` | **EOA** | 185 in / 0 out | **OWNERSHIP UNVERIFIED** (frozen research: top-10 holder #4, unlabelled) |
| `0x3d90f66b…6be9` | **Contract** | 37 in / 37 out, equal amounts | **OWNERSHIP UNVERIFIED** — pass-through shape |
| `0x41d8e95a…8e90` | **Contract** | 9 in / 9 out, equal amounts | **OWNERSHIP UNVERIFIED** — pass-through shape |
| `0x278d858f…f8d2` | **Contract** | 1 in / 31 out | **OWNERSHIP UNVERIFIED** — distributor shape |
| `0x0d070796…92fe` | **EOA** | 26 out / 6 in | **OWNERSHIP UNVERIFIED** (frozen research: second upstream funder) |
| `0x0186f74b…5ad9` | **EOA** | 7 in / 7 out | **OWNERSHIP UNVERIFIED** |
| `0x4e5bc1cd…8c55` | **EOA** | 12 in / 0 out | **OWNERSHIP UNVERIFIED** |

**CONCLUSION.** For every address claimed or suspected to belong to SuperTrust, MSQUARE, SoloPay, the SUT
project, a merchant or an exchange, the status is **ADDRESS OWNERSHIP UNVERIFIED**. No identity is guessed.
Contract-versus-EOA is determinable from chain state; ownership is not. This is the **third broken link**.

---

## 12. Transaction → product linkage

This is the decisive test of EXP-002, and public evidence supplied exactly one mechanism to run it with.

### 12.1 The linkage mechanism (EXP002-EV-050)

**FACT.** The official SuperTrust website contains a **DeCT** verification dialog. Its client code calls an
unauthenticated first-party endpoint:

```
GET https://api.msq.market/super-save/public/dect-transaction-details/{txid}
```

and renders `startDate`, `endDate`, `amount` and `currency` from the response, alongside a link to
`polygonscan.com/tx/{hash}`. The input is validated against `^0x[A-Fa-f0-9]{64}$`.

This is precisely the artefact EXP-002 needed: **a first-party, public mechanism that maps a Polygon
transaction hash to a product-side record.** It is also the operational form of the DeCT claim in the app
listing (EXP002-EV-014) that credit activity is “automatically recorded on the blockchain, ensuring full
transparency”.

**Instrument behaviour was characterised before use:**

| Input | Response |
|---|---|
| Well-formed hash with no record | **HTTP 404** `{"success":false,"message":"Transaction not found"}` |
| Malformed input | **HTTP 400** `{"success":false,"message":"Invalid TXID format"}` |
| Record present | **HTTP 200** with `data.details` |

The endpoint discriminates. A 404 is a real negative, not a generic error.

**Recorded for human review, no conclusion drawn.** This endpoint is served from an **MSQUARE GLOBAL**
domain (`msq.market`, §9), while official notice 4615 (EXP002-EV-013) states that SUPERTRUST Co., Ltd. and
MSQUARE GLOBAL Co., Ltd. are separately and independently operated businesses. The technical dependency is a
**FACT**; it is **not** treated here as evidence of corporate ownership or affiliation. Flagged for the
business reviewer.

### 12.2 The linkage test (EXP002-EV-051)

**All 399 distinct mainnet SUT transactions** from the §10.2 window were submitted to the endpoint.

| Result | Count |
|---|---|
| HTTP 200 — **record found** | **0** |
| HTTP 404 — transaction not found | **399** |
| Inconclusive | **0** |

**FACT. 0 of 399. Every one of the 399 real mainnet SUT transactions returned “Transaction not found”.**

The test is complete: 102 queries initially returned HTTP 429 (rate limited) and were retried with backoff
until every single one reached a conclusive status. Nothing is left indeterminate, and the full
hash-by-hash result set is stored at `work/exp-002/dect-linkage.json` for independent re-execution.

### 12.3 Instrument sensitivity — the honest limitation (EXP002-EV-052)

A negative result is only as strong as the instrument that produced it. To test whether the endpoint can
return a positive at all, **26 USDT transactions** involving `0xaaa4d5dd…cc2c` in the same window were
submitted. All **26 returned HTTP 404**.

**Across 425 real transactions of two different assets, the endpoint returned no positive.**

**DATA UNAVAILABLE.** No known-positive transaction hash is published anywhere public, so the endpoint's
**sensitivity could not be established**. Status: **INCONCLUSIVE**.

**This limitation is binding and is stated plainly: the 0-of-399 result does not prove that no DeCT product
activity exists.** It proves something narrower and still useful:

> Using the only first-party public transaction-to-product verification mechanism that exists, **not one
> observed mainnet SUT transaction could be linked to a product record** — and the mechanism could not be
> shown to link any transaction to any record.

### 12.4 Linkage classification

Applying the brief's scale to each candidate route:

| Linkage route | Classification |
|---|---|
| ZERO PLUS SUT content payment | **UTILITY CLAIM ONLY** — procedure documented; flow behind login; per-payment address prevents attribution |
| L2U SUT payment discount | **UTILITY CLAIM ONLY** — SUT UI element present; no checkout, no transaction |
| K-POP concert SUT payment | **UTILITY CLAIM ONLY** — participation page HTTP 403; May notice describes promotions, not checkout |
| SoloPay SUT payments | **REJECTED as mainnet SUT evidence** — production not publicly available; examples are an Amoy test token |
| DeCT SuperSave credit records | **ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** — 0 of 399; instrument sensitivity unestablished |
| `0xaaa4d5dd…cc2c` collection pattern | **ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** — payment-shaped, intent undetermined |
| Buyback settlement (SUT in → USDT out) | **REJECTED for the observed window** — zero counterparty overlap |
| Any specific SUT transaction → any specific product | **DATA UNAVAILABLE (EXP002-EV-053)** — no public order ID, payment reference or receipt exists for any SUT transaction examined |

**Not one route reaches SUPPORTED or PARTIALLY SUPPORTED.**

---

## 13. Utility evidence matrix (claim → evidence)

Each claim is kept strictly separate, as the brief requires. A claim one row down is **not** established by
the row above it.

| Claim | Required evidence | Evidence found | Evidence missing | Status | Conclusion |
|---|---|---|---|---|---|
| **“SUT can be used for payments”** | Official statement of a payment mechanism | **YES** — ZERO PLUS terms Art. 1–3; L2U notice 4064; 30–50% fee-discount claim; SoloPay docs | — | **VERIFIED AS CLAIM** | A documented payment capability is publicly claimed, with a step-by-step procedure for ZERO PLUS |
| **“A SUT payment flow is publicly accessible”** | A reachable checkout offering SUT | **NO** — ZERO PLUS behind login; L2U has no SUT option; K-POP `/event/` HTTP 403; SoloPay production not publicly available; only a demo store | A publicly reachable SUT checkout | **UNVERIFIED** | No member of the public can observe a SUT payment flow |
| **“SUT on-chain activity exists”** | Transfer events on the verified contract | **YES** — 473 legs / 399 tx / 251 senders / 16 h 40 m | — | **VERIFIED** | Real, measured, reproducible |
| **“SUT is actually used for payments”** | A transaction identifiable as a payment | **NO** — intent is not encoded on chain; the one payment-shaped pattern is mechanism-ambiguous | Payment-side reference data | **UNVERIFIED** | Activity ≠ payment |
| **“SUT payment activity is linked to a real merchant”** | Publicly attributed merchant address | **NO** — attribution class A/B/C empty; explorers HTTP 403 | Any published merchant address | **UNVERIFIED** | No merchant address is publicly attributable |
| **“SUT payment activity is linked to a real product”** | Transaction → product record resolution | **NO** — 0 of 399 against the only public mechanism | A resolvable product record | **UNVERIFIED** | §12.2; limited by §12.3 |
| **“Repeated product usage exists”** | Recurrence per identified product or merchant | **NO** — prerequisite (product identification) not met | Product-keyed series | **DATA UNAVAILABLE** | Not computable |
| **“Token value capture can be measured”** | A verified payment series in SUT | **NO** — no indicator computable | All of them | **DATA UNAVAILABLE** | §14 |

---

## 14. Value-capture evidence

Per the brief, **none** of the following was accepted as evidence of value capture: that SUT transfers exist;
that SUT volume exists; that SUT price moved; that SUT is listed; that a product claims SUT support.

The test applied was the full chain:

```
SUT -> real user action -> real product/service -> payment/utility event
    -> measurable activity -> identifiable transaction -> repeatable usage
```

**Result: the chain breaks at “real product/service” and again at “identifiable transaction”.**

### Candidate indicators — PROPOSED, not approved, not measured

**No target threshold is proposed or implied for any row.** These remain candidate metrics pending business
approval, exactly as `proposed-thresholds` governance requires for EXP-001.

| Candidate indicator | Measurable from public evidence? | Blocking prerequisite |
|---|---|---|
| Verified SUT payment count | **NO** | A payment-side identifier |
| Verified SUT payment volume | **NO** | A payment-side identifier |
| Number of identifiable merchants accepting SUT | **NO** | Published merchant addresses |
| Number of identifiable products accepting SUT in production | **NO** | A publicly accessible SUT checkout |
| Repeat payment activity / payment recurrence | **NO** | Product identification first |
| Transaction frequency | **Partially** — transfer frequency is measurable (§10.2); *payment* frequency is not | Intent attribution |
| Product-specific SUT activity | **NO** | Product↔address mapping |
| Transaction coverage (share of SUT tx attributable to products) | **Measured as 0 of 399**, bounded by §12.3 | A validated linkage instrument |
| Reconciliation consistency | **NO** | Two independent records to reconcile |

**CONCLUSION (EXP002-EV-054). Token value capture cannot be measured from public evidence.** Every indicator
requires a product-side identifier that is not public.

**OBSERVATION on the mechanisms that *are* documented (§8.4).** The value-capture mechanisms SuperTrust
publishes — buybacks and credit lock-ups — operate between the company and its members and are settled
through **KWT**, a token with no publicly identified contract (EXP002-EV-055). Whatever their merits, they
are **not product revenue**, and they are **not independently verifiable from public sources**.

### Relationship to EXP-001 — unchanged

EXP-001 remains **FROZEN**. EXP-002 modified nothing in it. Quoted here for context only:

| Standardised size | RUN-003 measured | Magnitude |
|---|---|---|
| $10,000 buy | 10.64% | 10.6% |
| $10,000 sell | −9.61% | 9.6% |
| $50,000 buy | 58.56% | 58.6% |
| $50,000 sell | −36.93% | 36.9% |
| $100,000 (both sides) | — | **NOT EXECUTABLE / NOT REGISTERABLE** |

Baselines, thresholds, runs, governance state, comparison path and evidence are untouched. EXP-001's
thresholds remain **0 of 4 REGISTERED** and its gate remains **`THRESHOLDS_PENDING`**. EXP-002 is independent
and addresses GAP-D only.

---

## 15. Evidence gaps

| Gap | What is missing | Obtainable publicly? |
|---|---|---|
| **G-01** | A publicly accessible SUT checkout on any production product | No — on current evidence |
| **G-02** | Any officially published merchant, product, project-operated or buyback address | No |
| **G-03** | Public explorer address labels | No — HTTP 403 at both explorers on 2026-10-07 |
| **G-04** | A known-positive DeCT transaction hash to validate the linkage instrument | No |
| **G-05** | A public KWT contract address | No |
| **G-06** | SoloPay production merchant/payment data | No — HTTP 401, authentication required |
| **G-07** | Any public order ID, payment reference or receipt tied to a SUT transaction | No |
| **G-08** | SoloPay source code (`github.com/supertrust/solo-pay`) | No — not public |
| **G-09** | A SUT payment time series of any length | No |
| **G-10** | Confirmation whether the ZERO PLUS SUT payment path is live in production | No — behind authentication |
| **G-11** | Whether the K-POP SUT-only booking claim (notice 4101) was ever implemented | No — `/event/` HTTP 403 |

**Every one of G-01 … G-11 is answerable from approved internal telemetry.** That is the finding that
determines the recommendation in §19.

---

## 16. Limitations

Stated explicitly and without mitigation:

1. **Public website claims are not transaction telemetry.** Fourteen verified claims (§8) establish what is
   asserted, never what occurred.
2. **Blockchain transfers do not identify intent.** No `Transfer` event encodes purpose. The 473 legs in §10
   are movements, not payments.
3. **Wallet ownership is unknown.** Attribution classes A, B and C are empty (§11).
4. **Product usage may be private.** A SUT payment could be occurring inside an authenticated product and be
   invisible to this experiment. Nothing here excludes that.
5. **Merchant data is not public.** No merchant list, count or address is published.
6. **Historical data is incomplete.** The on-chain window is 16 h 40 m. It is representative of that window
   only and is not a historical series.
7. **Public APIs rate-limit.** 102 of 399 linkage queries initially returned HTTP 429; all were retried to a
   conclusive status. Both explorers returned HTTP 403.
8. **Current availability may differ from historical availability.** A product flow absent on 2026-10-07 may
   have existed earlier, and the reverse.
9. **Transaction timing alone does not prove causality.** No timing correlation is offered as linkage.
10. **Market activity is not product usage.** The 99 pool-facing legs are market structure — EXP-001's
    subject, not GAP-D's.
11. **Instrument sensitivity is unestablished (§12.3).** The binding limitation on the central negative
    result.
12. **A 403 or 401 is an access status, not a finding about the business.** Pages and endpoints were recorded
    as unreachable, never as non-existent.
13. **The absence of SoloPay from the notice corpus is not absence of the product** — the npm artefacts prove
    active development.

**Missing evidence is never converted into a positive conclusion anywhere in this document.** Equally, it is
never converted into a negative conclusion about the business: unverified means unverified.

---

## 17. Findings

**FACTS established.**

- **F-01.** Fourteen first-party SUT utility claims exist, with exact wording, URLs and dates (§8, §20).
- **F-02.** ZERO PLUS, operated by SUPERTRUST Co., Ltd., publishes a dated legal instrument defining a
  step-by-step SUT payment procedure with on-chain settlement at ≥ 3 confirmations (EXP002-EV-008).
- **F-03.** Official notice 4064 (2026-01-26) claims a SUT payment discount at L2U, a live product
  (EXP002-EV-005).
- **F-04.** Mainnet SUT activity is real: 473 transfer legs, 399 transactions, 251 distinct senders in
  16 h 40 m (EXP002-EV-041).
- **F-05.** 374 of 473 transfer legs never touch the market pool (EXP002-EV-042).
- **F-06.** SoloPay's documentation states its production environment is not yet publicly available
  (EXP002-EV-030).
- **F-07.** Every documented SoloPay SUT example uses a Polygon Amoy test token verified to be a different
  contract from mainnet SUT (EXP002-EV-031, EV-040).
- **F-08.** The only publicly reachable SoloPay checkout is a self-declared demo store (EXP002-EV-034).
- **F-09.** SoloPay is actively developed — 9 public npm releases, 2026-02-11 → 2026-08-18 (EXP002-EV-033).
- **F-10.** A first-party public transaction→product verification endpoint exists and discriminates
  correctly (EXP002-EV-050).
- **F-11.** 0 of 399 mainnet SUT transactions resolved against it; 0 of 26 USDT transactions likewise
  (EXP002-EV-051, EV-052).
- **F-12.** No address is publicly attributed to any product, merchant, company or exchange
  (EXP002-EV-045, EV-046).
- **F-13.** Officially documented value-capture mechanisms are company-to-member and settle through KWT,
  which has no publicly identified contract (EXP002-EV-009 … EV-012, EV-055).

**OBSERVATIONS.**

- **O-01.** The closest payment-shaped on-chain pattern — 165 distinct senders → 1 EOA, median 70 SUT — is
  mechanism-ambiguous and cannot be resolved from chain data (EXP002-EV-043).
- **O-02.** The buyback-settlement shape is not present in the observed window: zero counterparty overlap
  between SUT senders and USDT recipients (EXP002-EV-044).
- **O-03.** Official claims split into a payment family and a credit/reward-accumulation family; the
  app-store description — the product with the most measured traction — describes the **accumulation**
  family and does not claim merchant payment (§8.3).
- **O-04.** The DeCT verification endpoint is served from an MSQUARE GLOBAL domain while official notice 4615
  states the two companies are independent. Recorded for human review; no ownership conclusion drawn.

**INFERENCE (labelled, separable from the facts above).**

- **I-01.** Because the ZERO PLUS procedure generates a **fresh wallet address per payment**
  (EXP002-EV-008), no stable public merchant address can exist for it. This is a structural explanation for
  why public transaction→product linkage fails for that product, independent of whether payments occur.
- **I-02.** A documented payment rail whose production environment is not publicly available, whose only
  reachable checkout is a demo store, and whose SUT examples are testnet, is **consistent with** a capability
  built and not yet publicly activated for mainnet SUT. This is an inference from access status, **not** a
  finding about internal deployment state, which is **DATA UNAVAILABLE**.

**DATA UNAVAILABLE.** Merchant identity; address ownership; payment counts and volumes; repeat usage;
reconciliation; KWT contract; SoloPay production merchant data; any order ID or receipt; validation of the
linkage instrument.

**CONCLUSION.** Public evidence establishes that **SUT utility is claimed, specifically and with dates**, and
that **mainnet SUT on-chain activity is real and measurable**. Public evidence does **not** establish that
any SUT transaction corresponds to a product purchase, a merchant payment or a service consumption, and it
does **not** permit any measurement of token value capture.

---

## 18. GAP-D status update

### One definitive status

> ## **GAP-D: C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED**

**Why C and not another option:**

| Option | Verdict | Reason |
|---|---|---|
| A — SUPPORTED | **No** | No transaction links to any product. 0 of 399. |
| B — PARTIALLY SUPPORTED | **No** | Requires strong product evidence with incomplete transaction linkage. Product-side evidence does not reach "strong": no SUT payment flow is publicly accessible at all. |
| **C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** | **YES** | SUT transfers are real, measured and reproducible (473 legs / 399 tx / 251 senders). Product usage cannot be established for any of them. This is exactly the defined condition. |
| D — UTILITY CLAIM ONLY | **No — too weak** | Correct at the individual claim level (§12.4), but it would discard the measured on-chain evidence this experiment did establish. |
| E — INCONCLUSIVE | **No** | The experiment reached clear, reproducible results. The negative is bounded by a stated limitation (§12.3), not undermined by one. |
| F — DATA UNAVAILABLE | **No longer accurate** | This was the status on entry. Substantial public evidence was obtained: 41 evidence items, 29 of them first-party. |

**This is a change in evidentiary position, not in business conclusion.** GAP-D moves from *"we have no
evidence"* to *"we have measured evidence, and it does not establish product usage"* — a materially more
useful state for a business decision, and the reason EXP-002 was worth running.

### Governance state

| Field | Value |
|---|---|
| EXP-002 status | COMPLETE — submitted for human review |
| GAP-D experiment-level status | **C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** |
| GAP-D in-code lab status | **`DATA UNAVAILABLE`** — unchanged; `src/core/improvement-lab.ts` not modified |
| OPP-L4 status | DATA UNAVAILABLE → **next action revised** (§19) |
| Thresholds proposed by EXP-002 | **NONE** |
| Thresholds registered by EXP-002 | **NONE** |
| Human review | **REQUIRED — NOT RECORDED** |
| Effect on EXP-001 | **NONE** |
| Effect on frozen layer | **NONE** |
| H7 / H8 | **UNCHANGED** — routed to `THESIS-UPDATE-CANDIDATES.md` |

**Why the in-code status is deliberately left unchanged.** `src/core/improvement-lab.ts` reports GAP-D as the
literal `DATA UNAVAILABLE`, and byte-identity assertions in `current-state.test.ts`,
`live-assessment.test.ts`, `improvement-lab.test.ts` and `evidence-traceability.test.ts` hold it there.
EXP-002 is a documentation-layer experiment whose findings have not been through human review. Changing a
code-derived status ahead of that review would assert a governance outcome that has not occurred. The
experiment-level status above is the finding; the in-code status changes only after a named human accepts it.

### Explicit non-claims

- It is **not** claimed that SUT has no utility.
- It is **not** claimed that no SUT payments occur. They may occur privately and be invisible here.
- It is **not** claimed that any product is inactive, or that any company statement is false.
- It is **not** claimed that SoloPay is not deployed internally — that is **DATA UNAVAILABLE**.
- **No** price, value, market-cap, liquidity, adoption or ranking claim or prediction is made.
- **No** threshold is approved and **no** metric is registered.

---

## 19. Recommended next action

### What the company should do next

The evidence identifies one binding constraint and one asset the business already owns.

**The binding constraint** is not a missing product. It is a **missing verifiable link** between activity and
usage. Eleven of the eleven evidence gaps in §15 are unanswerable from public sources and answerable from
approved internal telemetry.

**The asset** is SoloPay. **FACT:** a non-custodial, gasless ERC-20 payment gateway exists, is actively
developed (9 public npm releases through 2026-08-18), declares support for Polygon mainnet (chain 137), and
has documentation, widgets and a WooCommerce plugin already built. **FACT:** its production environment is
documented as not yet publicly available, and all its SUT examples are testnet.

Accordingly:

| Priority | Recommendation | Basis in evidence |
|---|---|---|
| **1** | **Request approved internal telemetry** (brief option 2) — specifically SoloPay production merchant/payment records for the mainnet SUT contract, and the ZERO PLUS SUT payment records referenced by its own terms Art. 1–3 | §15 G-01…G-11; EXP002-EV-032 (HTTP 401) and EV-021 (login) are the exact access barriers |
| **2** | **Investigate existing company infrastructure** (brief option 6) — determine the production status of the SoloPay mainnet SUT path: whether the mainnet SUT contract is whitelisted and enabled for any merchant, and whether any merchant is live | EXP002-EV-030/031/032/034/040: a built rail, testnet examples, authenticated production surface |
| **3** | **Continue public evidence collection** (brief option 1) — re-run EXP-002's reproducible probes on a schedule; the whole audit is scripted and re-executable | The 0-of-399 test, the product-availability sweep and the on-chain window are all stored and repeatable |
| **4** | **Obtain one known-positive DeCT transaction hash** — a single hash resolving to HTTP 200 would validate the linkage instrument and convert §12's bounded negative into a measured coverage ratio | §12.3 / G-04 — the cheapest single action with the largest evidentiary return |

### Not recommended, and why

| Option | Verdict |
|---|---|
| **Build SUT OpenPay** | **NOT RECOMMENDED.** The evidence shows a payment rail already exists in-house (SoloPay) with documentation, widgets, a plugin and declared mainnet support. Building a second rail before establishing the status of the first is not supported by any evidence in this experiment. OpenPay remains a **FUTURE PRODUCT PROPOSAL**, not an approved initiative. It is not recommended merely because it was previously proposed. |
| **Run a controlled utility experiment** (option 4) | **PREMATURE.** It would measure a flow whose production status is unknown. Recommendation 2 must land first. |
| **Improve existing SUT payment utility** (option 5) | **PREMATURE for the same reason** — "improve" presupposes a measured baseline, and none exists. Recommendation 2 is its prerequisite. |
| **No action until evidence improves** (option 7) | **REJECTED.** Recommendation 4 shows evidence can improve at near-zero cost. |
| **Connect verified product telemetry** (option 3) | **CORRECT TARGET, BLOCKED.** It is the intended end state of recommendation 1, not a separate action. |

**Decision owner.** Recommendations 1 and 2 require a named business owner to authorise internal data access.
This application cannot perform, approve or register any of them.

---

## 20. Evidence appendix

### 20.1 Evidence register

**41 evidence items**, machine-readable with full provenance, at:

| Artefact | Content |
|---|---|
| `work/exp-002/EXP-002-evidence-register.csv` | The full 19-column evidence table: Evidence ID, Category, Claim, Source, Source Type, URL, Retrieved At, Observed At, Entity, Address, Transaction Hash, Amount, Asset, Product, Evidence Status, Confidence, Linkage Status, Limitation, Notes |
| `work/exp-002/EXP-002-evidence-summary.md` | Status/confidence/linkage summary per item |
| `work/exp-002/build-evidence.py` | The register's source of truth; regenerates both of the above |
| `work/exp-002/verify-exp002.py` | Re-derives every headline figure in this report from the artefacts and asserts it; exits non-zero on any mismatch |

**Distribution by status:**

| Evidence Status | Count |
|---|---|
| VERIFIED AS CLAIM | 14 |
| VERIFIED | 12 |
| AVAILABLE | 5 |
| DATA UNAVAILABLE | 4 |
| PARTIALLY AVAILABLE | 3 |
| NOT PUBLICLY ACCESSIBLE | 1 |
| PARTIALLY VERIFIED | 1 |
| INCONCLUSIVE | 1 |
| **Total** | **41** |

**Distribution by source level:** Level 1 (official first-party) **29** · Level 2 (blockchain) **10** ·
Level 3 (public third-party) **2**.

**Distribution by linkage status:** UTILITY CLAIM ONLY **18** · ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE
UNVERIFIED **7** · DATA UNAVAILABLE **6** · NOT APPLICABLE **4** · ADDRESS OWNERSHIP UNVERIFIED **2** ·
REJECTED (4 distinct scopes) **4**.

No row uses vague wording. No field is populated with an unavailable value.

### 20.2 Raw evidence artefacts

| Artefact | Content |
|---|---|
| `work/exp-002/onchain-transfers.json` | All 473 SUT transfer legs with tx hash, block, from, to, value, log index, plus window metadata and retrieval timestamp |
| `work/exp-002/onchain-summary.json` | Top-25 address aggregates, pool-facing leg counts, gross SUT moved |
| `work/exp-002/dect-linkage.json` | The 0-of-399 linkage test: every hash, HTTP status and response body; retrieval and retry timestamps |
| `work/exp-002/instrument-check.json` | The 26-transaction instrument-sensitivity check |
| `work/exp-002/src-flow.json` | `0xaaa4d5dd…cc2c` SUT-in / USDT-out counterparty analysis |
| `work/exp-002/attribution.json` | Address attribution attempt, including the HTTP 403 responses |
| `work/exp-002/raw/` | Served HTML/JSON for every page audited, plus extracted text, the official ENG language file, the full 30-notice corpus, app-store listings and npm metadata. **Retained locally, not committed** (~3.6 MB of served HTML, fully regenerable by re-running the scripts) — the same `work/` policy the frozen-layer measurement dumps follow |

### 20.3 Reproduction

Every retrieval and every derived figure is scripted and re-executable.

**Blockchain audit (§10) and linkage test (§12):**

```
python work/exp-002/onchain.py           # SUT transfer logs for a 40,000-block window
python work/exp-002/analyze.py           # classification and address aggregates
python work/exp-002/dect-linkage.py      # transaction -> product linkage test
python work/exp-002/dect-retry.py        # retries rate-limited queries to a conclusive status
python work/exp-002/instrument-check.py  # instrument sensitivity check
python work/exp-002/src-flow.py          # SUT-in / USDT-out counterparty test
python work/exp-002/attribution.py       # address attribution attempt
```

**Claim and product audit (§8, §9):**

```
python work/exp-002/extract.py <html>    # served HTML -> visible text, for each product page
python work/exp-002/kwt.py               # searches the notice corpus for the KWT settlement claims
python work/exp-002/app-desc.py          # app-store listing metrics and claim wording
```

**Register, verification and language guard:**

```
python work/exp-002/build-evidence.py    # regenerates EXP-002-evidence-register.csv and the summary
python work/exp-002/verify-exp002.py     # re-derives every headline figure from the artefacts and asserts it
python work/exp-002/lang-screen.py       # screens this document against the project's forbidden-phrase lists
```

`verify-exp002.py` is the audit's own check on itself: it recomputes the evidence counts, the Level-1/2/3
split, the transfer-leg, transaction and distinct-sender totals, the 0-of-399 linkage result, the instrument
check and the attribution outcome **from the artefacts rather than from this prose**, and asserts that the
in-code GAP-D status is still the literal `DATA_UNAVAILABLE`. It exits non-zero on any mismatch, so a figure
here cannot drift from its evidence unnoticed.

No API key is required for any of them. The on-chain window will advance with the chain; the window actually
used is recorded in `onchain-transfers.json` and quoted throughout this document.

### 20.4 Primary source index

| Source | URL | Level |
|---|---|---|
| SuperTrust official site | https://supertrust.club/ | 1 |
| SuperTrust language file (claim wording) | https://supertrust.club/wp-content/themes/supertrust-v2/lang/ENG.json | 1 |
| SuperTrust notice corpus (30 notices) | https://supertrust.club/wp-json/wp/v2/notice?per_page=100 | 1 |
| ZERO PLUS cryptocurrency payment terms | https://zeroplus.live/terms/virtual-currency-payment | 1 |
| L2U | https://l2u.co.kr/ | 1 |
| SUT × K-POP | https://k-pop.supertrust.club/ | 1 |
| MOAD | https://www.moad.live/ | 1 |
| NatureBook | https://naturebook.club/ | 1 |
| MSQ Market | https://msq.market/ | 1 |
| Solo Pay marketing site | https://solonetwork.io/ | 1 |
| Solo Pay documentation | https://guide.solonetwork.io/ | 1 |
| Solo Pay production gateway | https://gateway.solonetwork.io/ | 1 |
| Solo Pay sample merchant (dev) | https://sample-merchant.dev.solonetwork.io/ | 1 |
| DeCT public verification endpoint | https://api.msq.market/super-save/public/dect-transaction-details/ | 1 |
| SuperTrust app (Google Play) | https://play.google.com/store/apps/details?id=io.supertrust.app | 1 |
| SuperTrust app (App Store) | https://apps.apple.com/kr/app/super-trust/id6755297934 | 1 |
| Polygon RPC (chain 137) | https://polygon-bor-rpc.publicnode.com | 2 |
| Polygon Amoy RPC (chain 80002) | https://polygon-amoy-bor-rpc.publicnode.com | 2 |
| SUT token contract | https://polygonscan.com/token/0x98965474ecbec2f532f1f780ee37b0b05f77ca55 | 2 |
| npm `@solo-pay/widget-js` | https://registry.npmjs.org/@solo-pay/widget-js | 3 |

---

**EXP-002 is complete and submitted for human review. No threshold is approved, no metric is registered, no
status is auto-applied, and no business decision is made by this document.**

**Created & Implemented by Magha Ram.**
