# Research Freeze — SUT Value Forensics, Case #001

**Frozen:** 2026-09-30
**Case:** SUT May 2026 Crash · context window 2026-05-01 → 2026-05-25 · event window 2026-05-16 → 2026-05-20
**Asset:** SuperTrust (SUT) · Polygon PoS (137) · `0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55`

**Status: RESEARCH FROZEN.** Investigation stops here. The last defined procedure (C1) is
complete. No further research is to be performed; the project moves to implementation of the
evidence platform.

**Governing documents (all current as of this freeze):**
`research-baseline.md` · `data-source-contract.md` · `hypothesis-matrix.md` ·
`may-2026-investigation-plan.md` · `evidence-model.md` · `research-change-log.md`

> **No root cause is stated in this document.** The evidence standard defined in
> `evidence-model.md` §4 (timing, magnitude, mechanism, controls, alternatives, human
> authorship) is **not met for any candidate trigger**. A mechanism is established; an
> initiating cause is not.

---

## 1. VERIFIED

Each item below is `CONTRACT_VERIFIED` or derived from `CONTRACT_VERIFIED` measurement,
independently re-checked on 2026-09-30.

### 1.1 The May crash was SUT-specific relative to BTC/ETH

| Asset | 2026-05-16 | 2026-05-18 | Change |
|---|---:|---:|---:|
| BTC | 78,161.07 | 77,016.44 | **−1.5%** |
| ETH | 2,179.90 | 2,134.55 | **−2.1%** |
| **SUT** (DEX close) | **0.6737** | **0.1308** | **−80.6%** |

Across 2026-04-30 → 2026-05-25 BTC ranged 99.3–103.8 (index) and ETH 91.9–103.1. **There was
no broad crypto-market crash on 2026-05-17/18.** SUT's move is ~40–55× the controls'.

**Onset refined:** the collapse begins **2026-05-17 intraday** (open 0.6737 → low 0.2511,
−62.7%, close 0.4756), not on May 18. Price agrees across three independent series, one of
them contract-identity-verified.

### 1.2 Broad sell-side participation occurred

- Swap count rose from **246 (May 16)** to **4,341 (May 17)** and **4,392 (May 18)** — ~**18×**.
- Sell swaps: **2,175** and **2,259** on those days.
- **525 distinct addresses** sent SUT into the pool during May; **325 of them (61.9%)** were
  recipients of the cluster's retail fan-out.
- **No single seller dominates.** The traced wallet cluster contributed **0 SUT — 0.00%** of
  pool sell inflow.

**Caveat carried into the freeze:** the largest pool senders are **router/aggregator
contracts** (including `PolygonSettler`), which bundle many end users. **True economic seller
counts are higher than any address count reported here**, and per-address volume rankings must
never be read as "the biggest seller was X".

### 1.3 Liquidity was structurally shallow — and was *not* withdrawn

**The decisive measurement (procedure C1, decoded Uniswap V3 `Swap` events):**

| Date | Swap volume | Buy | Sell | **Net sell** | Price move |
|---|---:|---:|---:|---:|---|
| 2026-05-17 | $784,333 | $378,676 | $405,657 | **$26,981** | **−62.7% intraday** |
| 2026-05-18 | $362,976 | $179,908 | $183,068 | **$3,160** | **−72.5% close** |

> **A net directional imbalance of roughly $27,000 accompanied a 62.7% single-day collapse.**
> Gross two-way volume was substantial and almost perfectly balanced. The price fell because
> **marginal depth available to absorb order flow was exhausted**, not because of a large net
> imbalance.

**Liquidity providers did not flee.** LP churn rose ~65× (26 mints/30 burns on May 16 →
**643/679** on May 17), but **net liquidity was positive on every day of the crash**:
**+$15,911** (May 17), **+$3,667** (May 18), **+$3,053** (May 19). The churn is
concentrated-liquidity **re-ranging**, not withdrawal.

**Structural context (2026-09-29/30 snapshots):** displayed market cap ~$75M against a main
pool of ~$91.7K and a Gate ±2% book of +$4.4K/−$12.0K; volume/market-cap ~0.11% against a
#90–#110 peer median of 12.4% (~110× worse), with even the least-traded coin in that band
turning over ~50× more per day.

### 1.4 Hypotheses rejected

| ID | Hypothesis | Rejection basis | Scope of rejection |
|---|---|---|---|
| **H1** | Broad crypto market conditions | BTC −1.5%, ETH −2.1% vs SUT −80.6% over identical hours | **Rejected as a *sufficient* cause.** Retained as a minor background variable. |
| **H3a** | Concentrated holder dumping | Chain terminates in **34,349 transfers to 16,607 addresses** (avg ~446 SUT); **cluster contributed 0.00%** of pool sells; no venue address among top recipients | **Rejected** for the traced cluster. **Does not exclude** router- or CEX-mediated selling, which is unattributable. |
| **H6** | Supply / distribution change | Minting unavailable; `totalSupply` **238,403,732** unchanged and re-verified; not a proxy; the Feb 2026 change was a **data-provider accounting change**, three months earlier | **Rejected for on-chain token supply.** The **float/distribution** question is *not* rejected — it is carried by H3b. |
| **H12** | Withdrawal of price support | Buy-side **peaked** on May 17 ($1,364,855 gross / $378,676 swap buy-side — the month's maximum) rather than withdrawing; buy and sell flows near-identical daily (monthly totals differ 0.04%), so **no persistent supporting buyer exists to withdraw** | **Rejected for the DEX limb.** **CEX limb DATA UNAVAILABLE.** |
| **H2 (variant)** | LP liquidity flight | Net liquidity **positive** every crash day | **Variant rejected**; H2's depth-exhaustion mechanism stands. |

---

## 2. SUPPORTED MECHANISM

> ### Sell-side pressure interacting with structurally shallow liquidity.

**H2 — SUPPORTED** (depth-exhaustion mechanism, directly measured).
**H11 — SUPPORTED for its broad-exit *behavioural* limb only** (many participants sold
simultaneously; ~18× rise in trading events).

**What this means precisely:** a market with structurally abnormal thinness for its displayed
capitalisation met simultaneous selling from a broad base of participants. Available depth was
exhausted at the margin, so a very small net imbalance produced an extreme price move. The
mechanism is **measured, not modelled**.

**What this does NOT mean:** it does not identify *why* those participants sold on that day.
**Mechanism is not cause.** H2 explains **how** a modest flow became an 80% move; it does not
explain **what** initiated the selling.

**Related, unproven:** a continuous distribution of ~1,000,000 SUT/day (≈$600K/day at
pre-crash prices) into ~16,607 retail addresses ran through May 1–15 and throttled ~70% on
May 16. **Whether recipients sold is measured only at a floor of 0.67% direct-to-pool**, which
excludes router- and CEX-mediated sales. This is a **plausible supply mechanism, not a
finding** (H3b / H8 remain unresolved).

---

## 3. UNRESOLVED

### 3.1 The initiating catalyst — the central open question

**No catalyst has been identified for 2026-05-17.** Every candidate is closed, blocked, or
unsearched:

| Candidate | State |
|---|---|
| Market-wide move (H1) | **Rejected** |
| Concentrated dump (H3a) | **Rejected** |
| Supply event (H6) | **Rejected** |
| Support withdrawal (H12) | **Rejected** (DEX limb) |
| LP flight | **Rejected** |
| Exchange event (H4) | **Blocked on an identity question** — see 3.3 |
| Information/legal event (H9) | **DATA UNAVAILABLE** — no event found in 2026-05-15→20; the search was **not exhaustive** and key Korean-language sources are blocked to automation |
| Trust/information shock (H11) | **Motive limb unresolved** — see 3.2 |

**Absence of evidence here is not evidence of absence.** The window search was never completed.

### 3.2 H11 — information / trust shock

**Behaviour is measured; motive is not.** Broad simultaneous selling is established. Whether
it reflects confidence collapse, rational response to an unobserved event (H9), or a venue
event (H4) is **not determined by flow data**. No community, social, or Korean chat-room data
for the window was gathered. **H11 and H9 remain entangled and cannot be separated with the
evidence held.**

### 3.3 CEX and router attribution — partly unrecoverable

| Gap | Status |
|---|---|
| Historical CEX order-book depth / spread for May 2026 | **Unrecoverable** — no public source retains it. H2's CEX limb is permanently DATA UNAVAILABLE unless a venue supplies it on request. |
| Router-mediated seller attribution | **Unrecoverable from chain alone** — aggregator contracts collapse many end users into one address. All distinct-seller counts are **lower bounds**. |
| CEX-side sales by cluster or fan-out recipients | **Not observable** — the "0.00% cluster sells" and "0.67% recipient sell-through" findings are **direct-to-pool only**, and are floors, not totals. |
| **Q3 — BitMart identity** | **BLOCKED** (Cloudflare 403). The notice carries a **"withdrawal closed 2026-05-16"** date — exactly at crash onset. `sut-coin-research` v2 established BitMart's SUT was **Sanity United**. **It is either the missing catalyst or a false root cause landing on precisely the right date.** It re-entered internal work product once already (`PIP_Week_2_thesis.pdf`). **No BitMart event may be used until contract-level evidence resolves it.** |

### 3.4 Other data gaps carried into the freeze

- **May 2026 pool TVL was never measured** — all depth figures are Sept 2026 snapshots.
- **Single-day volume splits for May 17/18 are unreliable** (conflict **C15**, interpolated
  timestamp drift). **Use the combined two-day figure**; exact block timestamps are required
  for any hourly or single-day claim.
- **No SoloPay / SuperSave / settlement / merchant data** — H5 untestable from outside; H7/H8
  partly untestable.
- **No primary legal records** — all legal items are `SECONDARY` or `SNIPPET_ONLY`; two key
  items (GOPAX stated reasons; the reported criminal complaint) were **never read in full**.
- **Supply conflicts unresolved** — 188.4M vs 46.6M vs 2.02M (C3); the 50M lock-up↔wallet
  mapping (Q4) is unconfirmed and **no on-chain lock contract exists**.
- **15 registered data conflicts** (C1–C15), of which **C14 is resolved**; the rest stand
  **unresolved by design**, not by neglect.
- **Wallet roles remain `UNKNOWN`** for every address in the case. No public label exists for
  any of them.
- **Conflict of interest** (issuer name and Singapore address on `must.company`) remains live
  and must be disclosed in any output.

---

## 4. Final hypothesis register at freeze

| ID | Hypothesis | Status at freeze |
|---|---|---|
| H1 | Broad crypto market conditions | **REJECTED** (as sufficient cause) |
| H2 | Liquidity / market-depth shock | **SUPPORTED** (depth exhaustion); LP-flight variant **REJECTED**; CEX limb **DATA UNAVAILABLE** |
| H3a | Concentrated holder dumping | **REJECTED** (traced cluster) |
| H3b | Diffuse distribution-driven selling | **INCONCLUSIVE** |
| H4 | Exchange-access deterioration | **INCONCLUSIVE** — blocked on Q3 identity |
| H5 | Company / SuperSave / settlement flows | **DATA UNAVAILABLE** |
| H6 | Supply / distribution changes | **REJECTED** (on-chain token supply) |
| H7 | Weak organic utility / adoption | **INCONCLUSIVE** (chronic condition, not a dated trigger) |
| H8 | Weak token value capture | **DATA UNAVAILABLE** (supply limb quantified; 0.67% sell-through floor only) |
| H9 | External news / regulatory / legal event | **DATA UNAVAILABLE** (search not exhaustive) |
| H10 | Data-source / token-identity contamination | **SUPPORTED** (active risk, incl. inside internal documents) |
| H11 | Trust / information shock | **SUPPORTED** (broad-exit behaviour only); **motive UNRESOLVED** |
| H12 | Withdrawal of price support | **REJECTED** (DEX limb); CEX limb **DATA UNAVAILABLE** |

---

## 5. Why no root cause is stated

Against `evidence-model.md` §4:

| Gate | Met? |
|---|---|
| 1. Timing — cause precedes effect at adequate resolution | **No** — no candidate catalyst identified; single-day resolution is itself degraded (C15) |
| 2. Magnitude — cause large enough | **Partially** — depth exhaustion demonstrably sufficient to *amplify*; no initiating flow identified |
| 3. Mechanism — specific, evidenced pathway | **Yes for the mechanism** (H2/H11 behaviour); **no for the trigger** |
| 4. Controls — alternatives tested and excluded | **Partially** — five candidates rejected; three remain blocked or unsearched |
| 5. Alternatives — enumerated and addressed | **Enumerated; not all addressed** |
| 6. Human authorship | **Not applicable** — no causal claim is made |

**Four of six gates fail.** A root-cause statement is therefore **prohibited**. The correct
and complete finding is:

> **The May 2026 SUT collapse was a SUT-specific event in which broad, simultaneous sell-side
> participation met structurally shallow liquidity, exhausting marginal depth so that a net
> imbalance of roughly $27,000 produced a 62.7% single-day price decline. The mechanism is
> established by direct measurement. The initiating catalyst is not established, and the three
> remaining candidates (exchange event, information event, trust shock) are respectively
> identity-blocked, unsearched, and unmeasurable in motive.**

This is a complete result, not a failed one. **No AI-generated root-cause verdict has been or
may be produced.**

---

## 6. Implementation readiness

**The baseline is frozen and sufficient to build the evidence platform. It is not sufficient
to display a root cause, and the platform must be built so that it cannot.**

**Settled and safe to encode:** token identity and the contract-level identity gate; the
source register with per-source authority and non-authority; the four-stage confidence and
four-stage identity vocabularies; the seven-stage evidence chain; the causal gate; conflicts
C1–C15 with C14 resolved; hypothesis statuses H1–H12; the corrected May dataset.

**Must be encoded as first-class, not as edge cases:**
1. **`DATA UNAVAILABLE` and `UNRESOLVED` are displayable states**, not empty cells.
2. **Conflicts render as conflicts** — never silently reconciled, never averaged, never blended
   on one chart line.
3. **Gross pool flow may never populate a volume field** (`T-VOL-1`).
4. **Wallet roles default to `UNKNOWN`** and cannot be set without a role-evidence reference.
5. **Causal language is gated** and requires a named human author.
6. **Every displayed figure carries** source, URL, `retrieved_at`, `observation_time`, method.
7. **Provisional aggregations are labelled** — e.g. May 17/18 must render as a combined
   two-day figure pending exact timestamps (C15).

**Open items are data-acquisition tasks, not schema questions** — the schema absorbed C1's
corrections without structural change, which is the test it needed to pass.

**RESEARCH IS FROZEN. Implementation may begin.**
