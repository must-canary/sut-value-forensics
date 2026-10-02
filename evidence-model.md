# Evidence Model — SUT Value Forensics

**Prepared:** 2026-09-30
**Binds:** every finding the product produces.
**Companions:** `data-source-contract.md` (source authority), `hypothesis-matrix.md` (tests).

---

## 1. The chain

```
RAW SOURCE → OBSERVATION → NORMALIZED METRIC → EVENT → RELATIONSHIP → HYPOTHESIS TEST → FINDING
```

Every stage is a stored record with a stable ID. **Every stage retains a reference to its
inputs.** A finding that cannot be walked back to raw sources is invalid and must not be
displayed.

**One-directional rule.** Evidence flows forward only. A hypothesis never edits an
observation. A desired finding never selects its inputs. If a test needs data that does not
exist, the answer is `DATA UNAVAILABLE` — never a substituted proxy presented as the real
thing.

---

## 2. Stage definitions

### 2.1 RAW SOURCE (`src:*`)

A retrieval event. **Immutable.** Never edited, never deleted — corrections are new records.

| Field | Notes |
|---|---|
| `id` | `src:<source>:<hash>` |
| `source` | Enum from `data-source-contract.md` §3 |
| `source_url` | Exact URL queried |
| `request` | Method, params, block range, pagination cursor |
| `retrieved_at` | ISO-8601 UTC |
| `raw_payload_ref` | Pointer to the stored payload |
| `access_status` | `OK` \| `BLOCKED` \| `RATE_LIMITED` \| `NOT_FOUND` \| `PARTIAL` |
| `blocker` | e.g. `cloudflare_403`, `api_key_required` |

> **Failed retrievals are recorded, not discarded.** "BitMart notice — `cloudflare_403` at
> 2026-09-30" is itself evidence: it is why Q3 is unresolved, and it must appear in outputs.

### 2.2 OBSERVATION (`obs:*`)

One extracted datum, exactly as the source stated it. **No unit conversion, no arithmetic, no
reconciliation.**

Carries all mandatory fields from `data-source-contract.md` §1, plus `source_ref`.

**Identity gate.** An observation with `identity_status = IDENTITY_NOT_VERIFIED` is stored but
**cannot** flow to any later stage. It appears in outputs only as a declared exclusion.

### 2.3 NORMALIZED METRIC (`met:*`)

An observation converted to canonical units/timebase. **The first stage where we do anything,
so it must record what we did.**

| Field | Notes |
|---|---|
| `observation_refs[]` | Inputs |
| `transform` | e.g. `wei_to_token(18)`, `daily_bucket_utc`, `usd_convert` |
| `assumptions[]` | e.g. `block_ts_interpolated` |
| `precision_note` | Known accuracy limits |

**Declared transform in current use:** May-window block timestamps interpolated from anchors
block `86,236,778` = `2026-05-01T00:00:00Z` and `87,436,510` = `2026-05-26T00:00:01Z`
(≈1.8004 s/block). Accurate to ~minutes — **valid for daily buckets, invalid for sub-hourly
ordering.** Any metric using it carries `assumptions: ["block_ts_interpolated"]`, and any
hourly analysis must first replace it with exact block timestamps.

### 2.4 EVENT (`evt:*`)

Something that happened at a time. Events are **not** interpretations.

| Field | Notes |
|---|---|
| `event_time` | When it happened (UTC) |
| `event_type` | `price_move`, `onchain_transfer`, `exchange_action`, `company_notice`, `legal`, `supply`, `liquidity`, `data_provider_change` |
| `identity_status` | Must be `CONTRACT_VERIFIED` or `PAIR_VERIFIED` for causal use |
| `classification` | For legal events, the `data-source-contract.md` §4 enum |
| `evidence_refs[]` | Metrics/observations establishing it |

**Rules.** An event with `TICKER_ONLY` identity may be displayed as context but **never**
enters a causal relationship. A company announcement is an event *of announcing* — the
announced action is a separate event that requires independent verification.

### 2.5 RELATIONSHIP (`rel:*`)

A stated connection between events/metrics. **The most dangerous record type** — this is
where causation gets smuggled in.

| Field | Notes |
|---|---|
| `relationship_type` | `TEMPORAL_COINCIDENCE` \| `CORRELATION` \| `FLOW` \| `SEQUENCE` \| `MECHANISM_CONSISTENT` |
| `strength` | Quantified where possible |
| `alternative_explanations[]` | **Required, minimum 1** |
| `causal_claim` | **Always `false` at this stage.** No exceptions. |

> **`CAUSATION` is not an available relationship type.** Causal language may appear only in a
> FINDING, only after the §4 gate, and only with a human investigator recorded as author.

**Worked example — the highest-risk relationship in this case:**

```yaml
id: rel:pipeline_halt_vs_crash
type: TEMPORAL_COINCIDENCE
statement: >
  Cluster outflow ran 0.1M–2.0M SUT daily May 1–15, was zero on May 16, 17 and 18,
  and resumed with a single 1,000,000 SUT transfer on May 19. Crash onset was
  May 17 intraday.
strength: "outflow 15/15 days before; 0/3 days across the event"
alternative_explanations:
  - "Operator halted in response to early price stress (effect, not cause)"
  - "Upstream funding source stopped for unrelated reasons"
  - "Scheduled process paused for an operational reason"
  - "Coincidence — a 3-day gap in a 25-day series is not individually improbable"
  - "The halt contributed to the collapse (the causal reading)"
causal_claim: false
note: >
  Direction of causation is NOT determined by this data. The correlation is
  suggestive and must be reported as suggestive only.
```

### 2.6 HYPOTHESIS TEST (`test:*`)

| Field | Notes |
|---|---|
| `hypothesis_id` | H1–H11 |
| `test_method` | Stated **before** execution |
| `falsification_criterion` | **Required** — what result would reject it |
| `supporting_refs[]` / `contradicting_refs[]` | Both required; `contradicting` may be empty only if genuinely searched |
| `result` | `SUPPORTED` \| `REJECTED` \| `INCONCLUSIVE` \| `DATA_UNAVAILABLE` |
| `scope_of_result` | e.g. "rejected as *sufficient* cause" |
| `limitations[]` | Required |

**A test without a pre-stated falsification criterion is invalid.** This is what prevents
retrofitting a test to a preferred answer.

### 2.7 FINDING (`fnd:*`)

The only stage shown as a conclusion. Must retain **all** of:

`source` · `url` · `retrieved_at` · `observation_time` · `calculation` · `evidence_refs[]` ·
`confidence` · `contradictions[]` · `limitations[]` · `author` (human, for any causal claim) ·
`supersedes` (for corrections).

---

## 3. Confidence and identity vocabularies

**Confidence:** `VERIFIED` (primary/authoritative, directly checked) · `SECONDARY`
(reputable but not primary) · `CLAIM` (an interested party's assertion) · `SNIPPET_ONLY`
(search snippet, full text never read — **never** promotable without retrieval) ·
`UNVERIFIED` · `OPINION`.

**Identity:** `CONTRACT_VERIFIED` · `PAIR_VERIFIED` · `TICKER_ONLY` · `IDENTITY_NOT_VERIFIED`
(see `data-source-contract.md` §2.3).

**Neither may be upgraded without new evidence recorded as a new source record.**

---

## 4. The causal gate

A finding may use causal language **only** if all six hold, each with evidence refs:

1. **Timing** — cause precedes effect, at resolution fine enough to establish order.
2. **Magnitude** — the proposed cause is large enough to produce the observed effect.
3. **Mechanism** — a specific, stated, evidenced pathway.
4. **Controls** — market-wide and asset-specific alternatives tested and excluded.
5. **Alternatives** — enumerated and addressed.
6. **Human authorship** — a named human investigator, recorded in `author`.

**If any fails, the finding is reported as correlation, mechanism-consistency, or
INCONCLUSIVE.**

> **Hard rule: no AI-generated root-cause verdict, ever.** A model may compute metrics, run
> tests, surface correlations and enumerate alternatives. It may **not** author a causal
> conclusion. The system must be incapable of emitting one without a recorded human author.

### 4.1 Language mapping (enforced)

| Evidence state | Permitted | Forbidden |
|---|---|---|
| Flow observed | "X transferred N SUT to Y" | "X dumped", "X sold" |
| Timing coincidence | "stopped the day before onset" | "the halt caused" |
| Correlation | "moved together" | "drove", "led to" |
| Exchange concern | "the exchange stated" | "because the project violated" |
| Allegation | "reported allegation; outcome unknown" | "fraud", "Ponzi", "scam" |
| Unlabelled address | "unlabelled EOA", "conduit", "top-10 holder" | "treasury", "company wallet", "whale", "market maker" |
| Announcement | "the project announced" | "the project locked/burned" (until verified on-chain) |
| Model output | "simulated, assuming …" | presenting as measurement |

---

## 5. Data conflicts

A `conflict:*` record is created whenever sources disagree materially. It has **no winner
field.**

```yaml
id: conflict:C4
metric: daily_volume_usd
observation_time: 2026-05-17
observations:
  - {source: coingecko,   value: 420380,  identity: TICKER_ONLY}
  - {source: coinranking, value: 1780000, identity: TICKER_ONLY}
  - {source: geckoterminal_pool_0x092295c9, value: 397989, identity: CONTRACT_VERIFIED}
methodological_reason: >
  Different venue coverage, DEX inclusion rules and wash-trade filtering.
  CoinGecko's whole-market total barely exceeds the single main DEX pool alone,
  suggesting under-capture of DEX volume — or near-dead CEX venues that day.
resolution: UNRESOLVED
canonical_for_analysis: null   # no canonical volume series exists
display_rule: "Show all three separately. Never blend. Never average."
```

**Rules.** Never silently pick. Never average. Never blend series on one chart line. A
canonical series is chosen **per analysis**, declared visibly, and only where justified —
`null` is a valid and honest value.

---

## 6. Corrections

Records are **immutable**. A correction is a **new** record with `supersedes`, and the
superseded record remains queryable and visible.

```yaml
id: fnd:may_cluster_volume_v2
supersedes: fnd:may_cluster_volume_v1
correction_type: INCOMPLETE_DATA        # not: ERROR
old_value: 5920000
new_value: 16580000
reason: >
  v1 recorded six individually-observed transfers. Full paginated transfer history
  shows a near-daily series ~2.8x larger. v1's transfers are a correct subset.
```

**Correction types:** `INCOMPLETE_DATA` · `IDENTITY_MISATTRIBUTION` · `SOURCE_REVISION`
(the source changed its own value) · `METHOD_ERROR` · `STATE_CHANGE` (the world changed —
not an error) · `STALE_CLAIM_CARRIAGE` (a document restates a claim already retired elsewhere).

### 6.1 Corrections must propagate — the retraction problem

**Observed failure, 2026-09-30.** Two claims retired by `sut-coin-research` v2 on 29 Sep 2026
**reappeared as live claims** in `PIP_Week_2_thesis.pdf` dated **30 Sep 2026** — the GoPlus
"can mint / disable sells / change fees" warning, and the BitMart delisting attributed to
SuperTrust. A correction had been published and the errors still propagated forward.

**Consequences for the model:**

1. **A superseding record must be discoverable from the superseded claim's *content*, not only
   from its record ID.** Corrections indexed solely by ID cannot catch a claim re-typed into a
   new document.
2. **Document date is not claim currency.** A newer document may carry an older claim. Currency
   is established by evidence lineage, never by filename, date, or authorship.
3. **Internal documents carry no privilege** (`data-source-contract.md` §2.5). A claim is not
   evidence because we wrote it.
4. **Test T-STALE-1** (§7) is added to enforce this.

### 6.1a ⚠ Gross token flow is NOT trading volume

**Binding rule.** Raw ERC-20 transfers into or out of a liquidity pool **must never** be
reported, charted, or labelled as trading volume. A pool's token flow is the sum of at least
four distinct economic actions:

| Flow | Event | Economic meaning |
|---|---|---|
| Trader buys | `Swap` (quote in, base out) | **Volume** |
| Trader sells | `Swap` (base in, quote out) | **Volume** |
| LP adds liquidity | `Mint` | **Not volume** — capital deposit |
| LP removes liquidity | `Burn` → `Collect` | **Not volume** — capital withdrawal |

**Only `Swap` events are trading volume.** Volume, buy/sell split, trade counts and trader
counts must be derived from decoded `Swap` payloads — never from transfer flow.

**Worked demonstration (2026-05-17, pool `0x092295c9…e165`):**

```
gross USDT inflow (raw transfers)   1,364,855
  = swap buy-side                     378,676   <- volume  (28%)
  + LP Mint deposits                  986,179   <- NOT volume (72%)
                                    ---------
                                    1,364,855   difference: $0
```

**72% of the apparent "volume" was liquidity provisioning.** Using gross flow overstated
trading by **3.4×** and produced a false conflict against the aggregator (C14), which was
resolved only by decoding events. Metrics derived from gross flow must carry
`methodology = "gross_pool_flow"` and are **barred from any volume field**.

**Pool-parameter rule.** `token0`/`token1`/`fee` must be read from the pool contract before
decoding. Direction (buy vs sell) is derived from the **signed** `amount0`/`amount1` in the
`Swap` payload — never assumed from token address ordering or a pool's display name.

### 6.1b Interpolated timestamps fail under concentrated activity

`block_ts_interpolated` (§2.3) was declared "adequate for daily buckets". **C1 falsified that.**
Decoded single-day volumes for 2026-05-17/18 diverged from the aggregator in *opposite*
directions (ratios 1.97 and 0.51) while the **two-day total agreed within 3.3%** — accumulated
rate drift shifted activity across a midnight boundary.

**Revised rule.** Interpolated timestamps are adequate for daily buckets **only when activity
is not concentrated**. For any event window, or any single-day claim on a high-activity day,
**exact block timestamps must be fetched**. Where they have not been, the record must carry
`aggregation_caveat: "day_boundary_uncertain"` and analyses must use multi-day aggregates.

### 6.2 Same-source duplication

**A document is not corroboration of itself in another format.** Before any input raises
confidence, verify it is an *independent observation* rather than a re-rendering, quotation,
or summary. Same-source copies are recorded as **formats of one source**
(`format_of: <source_id>`), and their only evidential value is confirming the original is
unaltered.

**Observed 2026-09-30:** `SUT_Coin_Detail_Research.pdf` is a PDF rendering of
`sut-coin-research-2026-09-29.txt`. Counting both as independent would have inflated
confidence across every claim in the document.

Distinguishing these matters. The 2024 "pause function exists" record is a **STATE_CHANGE**
(true then, superseded 2026-07-20), not a METHOD_ERROR. The BitMart attribution was an
**IDENTITY_MISATTRIBUTION**. CertiK 74.06 → 74.23 is a **SOURCE_REVISION** where **both
values remain valid at their retrieval times**.

---

## 7. Integrity tests (must exist before UI)

| # | Test | Asserts |
|---|---|---|
| T-ID-1 | Reject any observation lacking `token_contract` | Identity rule |
| T-ID-2 | Reject a contract ≠ `0x98965474…ca55` without explicit cross-token intent | No collision leakage |
| T-ID-3 | `IDENTITY_NOT_VERIFIED` cannot reach a finding | Gate holds |
| T-ID-4 | `TICKER_ONLY` cannot enter a relationship | Causal hygiene |
| T-TS-1 | `retrieved_at` and `observation_time` both present and distinct-capable | No collapse |
| T-TS-2 | `observation_time` ≤ `retrieved_at` | No future data |
| T-TS-3 | Metrics using `block_ts_interpolated` are barred from sub-hourly analyses | Precision honesty |
| T-LIN-1 | Every finding resolves to ≥1 raw source | Lineage |
| T-LIN-2 | No orphan/dangling refs | Lineage |
| T-LIN-3 | Superseded records remain retrievable | Auditability |
| T-CAU-1 | No finding carries causal language without all six §4 conditions + human `author` | **The core control** |
| T-CAU-2 | `relationship.causal_claim` is always `false` | Structural |
| T-CAU-3 | Forbidden terms (§4.1) blocked in generated text | Language discipline |
| T-CON-1 | Conflicting observations create a `conflict:*` record | No silent selection |
| T-CON-2 | No chart blends providers on one line | Display rule |
| T-ROLE-1 | No address labelled with a role absent a role-evidence ref | Wallet discipline |
| T-SNIP-1 | `SNIPPET_ONLY` cannot be promoted without a new retrieval record | Source honesty |
| T-FAIL-1 | Failed retrievals are stored and surfaced | Gaps stay visible |
| **T-STALE-1** | A claim matching a superseded record's content is flagged, regardless of the document's date or authorship | **Corrections propagate** (§6.1) |
| **T-DUP-1** | An input whose content matches an existing source is marked `format_of` and cannot independently raise confidence | **No same-source double-counting** (§6.2) |
| **T-INT-1** | Internally authored documents are graded `SECONDARY`/`CLAIM`, never `VERIFIED` by authorship | No internal privilege |
| **T-VOL-1** | A metric with `methodology = "gross_pool_flow"` cannot populate a volume field or a volume chart | **Gross flow ≠ trading volume** (§6.1a) |
| **T-VOL-2** | Volume/buy/sell metrics must reference decoded `Swap` events; pool `token0`/`token1`/`fee` must be read from the contract | No assumed token ordering |
| **T-TS-4** | A single-day claim on a high-activity day requires exact block timestamps, not interpolation | Day-boundary drift (§6.1b) |

---

## 8. Worked lineage — H1

```
src:coingecko:btc_range_2026        (retrieved_at 2026-09-30, access OK)
src:coingecko:eth_range_2026
src:geckoterminal:pool_0x092295c9_ohlcv_day
      │
      ▼
obs:btc_close_2026-05-16 = 78161.07   (identity: major asset, n/a collision)
obs:btc_close_2026-05-18 = 77016.44
obs:sut_dex_close_2026-05-16 = 0.6737 (identity: CONTRACT_VERIFIED)
obs:sut_dex_close_2026-05-18 = 0.1308
      │
      ▼
met:btc_return_0516_0518 = -1.5%      (transform: pct_change)
met:eth_return_0516_0518 = -2.1%
met:sut_return_0516_0518 = -80.6%
      │
      ▼
evt:sut_price_collapse_2026-05-17_18  (identity: CONTRACT_VERIFIED)
      │
      ▼
rel:sut_vs_market_divergence
      type: CORRELATION
      strength: "SUT move ~40-55x control magnitude"
      alternative_explanations: ["intraday market dislocation not captured by daily closes"]
      causal_claim: false
      │
      ▼
test:H1
      falsification_criterion: >
        "If BTC/ETH fell comparably (same order of magnitude), H1 would be SUPPORTED."
      result: REJECTED
      scope_of_result: "rejected as a SUFFICIENT explanation; retained as minor background"
      limitations: ["daily closes only", "two controls; no small-cap index"]
      │
      ▼
fnd:H1_rejected
      confidence: VERIFIED
      contradictions: []
      limitations: ["intraday market dislocation on May 17 not fully excluded"]
      author: <human investigator — required before publication>
```

---

## 9. Storage shape (schema only — not an implementation)

```
/evidence
  /sources         src:*    immutable payloads + access status
  /observations    obs:*
  /metrics         met:*
  /events          evt:*
  /relationships   rel:*
  /tests           test:*
  /findings        fnd:*
  /conflicts       conflict:*
  /corrections     supersession graph
```

Append-only. Content-addressed payloads. Every record carries `created_at` and, where causal,
`author`.

---

## 10. What this model refuses to represent

1. A root cause without a human author.
2. A wallet role without role evidence.
3. A blended cross-provider series.
4. A resolved conflict without a methodological reason.
5. An allegation as a fact.
6. An announcement as a completed action.
7. A model output as an observation.
8. A finding without limitations.
9. A promoted snippet.
10. A silently dropped failed retrieval.

**These refusals are the product.** The purpose is to make a well-evidenced conclusion
possible and a poorly-evidenced one structurally impossible to state.
