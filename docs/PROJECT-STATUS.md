# Project status

Generated **2026-10-02**. Every value below is read from the code and verified by the test suites.

---

## Layer 1 — Historical research: FROZEN

| Item | State |
|---|---|
| Freeze date | 2026-09-30 |
| Mechanism | **SUPPORTED** — depth exhaustion (H2) |
| Initiating catalyst | **UNRESOLVED** |
| Hypotheses | H1 REJECTED · H2 SUPPORTED · H3a REJECTED · H3b INCONCLUSIVE · H4 INCONCLUSIVE · H5 DATA_UNAVAILABLE · H6 REJECTED · H7 INCONCLUSIVE · H8 DATA_UNAVAILABLE · H9 DATA_UNAVAILABLE · H10 SUPPORTED · H11 SUPPORTED · H12 REJECTED |
| Unrecoverable evidence | EV-901 (May 2026 pool TVL never measured) · EV-902 (historical CEX order-book depth) |

No feature, screen, service or test writes to this layer. Verified by byte-identity assertions in
`current-state.test.ts`, `live-assessment.test.ts`, `improvement-lab.test.ts` and
`evidence-traceability.test.ts`.

## Layer 2 — Current SUT market state: OPERATIONAL

| Item | State |
|---|---|
| Sources (v1) | CoinGecko (contract) · CoinGecko asset detail · DexScreener (canonical pool) · Polygon RPC · CoinGecko BTC/ETH · CoinGecko global |
| Credentialed APIs required | **None.** CoinMarketCap deferred |
| Manual sync | `Run Live Market Sync` |
| Scheduled sync | `npm run daily-sync`, cron `5 0 * * *` (00:05 UTC), same service |
| Latest recorded runs | `LMS-2026-10-01-001`, `-002`, `-003` (all PARTIAL, all immutable) |
| Evidence per observation | source · endpoint · observation ts · retrieval ts · sync ID · asset · contract · chain · venue/pair · HTTP status · SHA-256 · methodology · limitation |

## Layer 3 — EXP-001 governance: BLOCKED ON BUSINESS DECISION

| Stage | State |
|---|---|
| Baseline captured | **COMPLETE** — RUN-001, RUN-002, RUN-003 |
| Business threshold decision | **PENDING BUSINESS REVIEW** |
| Threshold registration | **0 of 4 REGISTERED** |
| Baseline approval | **0 of 3 APPROVED** |
| Intervention | **NOT EXECUTED** |
| Post-intervention measurement | **DATA UNAVAILABLE** |
| Calculated result | **NOT AVAILABLE** |
| Final human review | **NOT RECORDED** |
| Governance gate | **`THRESHOLDS_PENDING`** |

### Observed baseline — not a target

| Size | RUN-003 measured | Magnitude |
|---|---|---|
| $10,000 buy | 10.64% | **10.6%** |
| $10,000 sell | −9.61% | **9.6%** |
| $50,000 buy | 58.56% | **58.6%** |
| $50,000 sell | −36.93% | **36.9%** |
| $100,000 (both sides) | — | **NOT EXECUTABLE / NOT REGISTERABLE** |

### Proposed thresholds — not approved

| Size | Proposed | Status |
|---|---|---|
| $10,000 buy | ≤ 8% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $10,000 sell | ≤ 8% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $50,000 buy | ≤ 40% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $50,000 sell | ≤ 30% | **PROPOSED — PENDING BUSINESS APPROVAL** |

## Layer 4 — EXP-002 public utility & value-capture audit: COMPLETE, AWAITING HUMAN REVIEW

Added **2026-10-07**. Full report: [EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md](EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md).

> **⚠ Identifier collision — open governance item.** `EXP-002` is already used in the frozen code layer for a
> different experiment: *“Reproducible weekly active addresses”* (`OPP-02`, stage `PLANNED`, captures
> `WEEK-2026-W39`, shown on **Baseline Operations**). Two distinct experiments now share one ID. Neither was
> renumbered: the in-code one is frozen, and renaming the audit is a human decision. Recommended
> reconciliation is to renumber **the audit** (e.g. to `EXP-003`) on approval. The two are related — the
> frozen experiment lists *“Payment-associated transfers — DATA UNAVAILABLE until merchant addresses are
> published”* as its own KPI, and the audit confirmed that condition still holds.

| Item | State |
|---|---|
| Gap addressed | GAP-D — utility / token value-capture measurement |
| Evidence items | **41** — 29 Level-1 first-party, 10 Level-2 blockchain, 2 Level-3 third-party |
| Official utility claims inventoried | **14**, each with exact wording, URL and date |
| On-chain window measured | blocks 95,056,696–95,096,695 · 2026-10-06T12:36:37Z → 2026-10-07T05:17:08Z |
| On-chain activity | **473 transfer legs · 399 transactions · 251 distinct senders** |
| Transaction → product linkage | **0 of 399** resolved against the only first-party public verification endpoint |
| Address attribution | **0** addresses publicly attributed to any product, merchant, company or exchange |
| Value-capture measurement | **DATA UNAVAILABLE** — no indicator computable from public evidence |
| **GAP-D experiment-level status** | **C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** |
| GAP-D in-code lab status | **`DATA UNAVAILABLE`** — unchanged, pending human review |
| Thresholds proposed / registered | **0 / 0** |
| Human review | **REQUIRED — NOT RECORDED** |
| Code changed | **None.** No file in `src/` or `test/` was modified; 575 tests still pass |
| Effect on EXP-001 and the frozen layer | **NONE** |

## Improvement Lab

| Opportunity | Status | Blocked by |
|---|---|---|
| OPP-L1 Liquidity / market depth | BUSINESS REVIEW REQUIRED | Business decision |
| OPP-L2 Market transparency / data coverage | PROPOSED | Nothing — QA can proceed |
| OPP-L3 Exchange / market access evidence | DATA INSUFFICIENT | Nothing — QA can proceed |
| OPP-L4 Utility / value-capture measurement | DATA UNAVAILABLE (in code) · **EXP-002 evidence collected** | Nothing — QA can proceed |

OPP-L4's next action is revised by EXP-002: the binding constraint is not a missing product but a missing
verifiable link between on-chain activity and product usage. All eleven EXP-002 evidence gaps are
unanswerable from public sources and answerable from approved internal telemetry. See the report's §19.

## Explicit non-claims

- Thresholds are **NOT approved**.
- Intervention is **NOT executed**.
- Post-intervention result is **DATA UNAVAILABLE**.
- **No liquidity improvement** is claimed.
- **No adoption improvement** is claimed.
- **No Top-100 ranking improvement** is claimed.
- No price prediction of any kind is made.
- **No SUT product usage, merchant payment or token value capture is claimed.** EXP-002 established measured
  on-chain activity and inventoried utility claims; it established no product usage. Equally, it does **not**
  claim that SUT has no utility or that no SUT payments occur — unverified means unverified.

## Test state

```
npm test             575 passed (19 files)
npm run typecheck    0 errors
npm run build        success
npm run smoke        32/32 checks passed
npx playwright test  225 passed (18 files)
```

## The exact outstanding human/business decision

**Approve or revise the four EXP-001 measurement thresholds.**

1. A named business owner enters and confirms the acceptable values on **Proposed Thresholds**.
   That is a business decision only — it registers nothing.
2. A named human registers each approved threshold on **Pre-Registration**, with a written rationale and an
   independence confirmation, before any measurement exists.
3. A named human approves one captured baseline run on **Baseline History**.

Only after all three does the intervention gate open. The intervention itself is a real-world action
recorded by a human; this application cannot perform it, and only a new measured run reviewed by a named
human can produce a result.
