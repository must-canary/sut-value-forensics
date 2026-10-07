# Market Quality (QA)

A QA intelligence layer **inside** SUT Value Forensics. Added **2026-10-07**.

Screen: **Market Quality (QA)**. Core: `src/core/market-quality/`. UI: `src/ui/market-quality.tsx`
and `src/ui/market-quality-sections.tsx`.

> **The QA layer identifies measurable quality degradation and provides evidence that can support
> controlled interventions and future experiments.** It does not improve SUT market value, and it makes
> no claim about price, adoption, utility or market ranking.

---

## 1. Why it exists

The project already captures market evidence and already holds a frozen baseline. What it did not have
was a layer that asks whether that evidence is *any good* — whether it arrived, whether it is fresh,
whether it is traceable, and whether anything has degraded since the last observation.

Without that, a silently stale source or a quietly missing metric would flow into an experiment unnoticed
and a decision would rest on it. Market Quality closes that gap:

```
RESEARCH → EVIDENCE → LIVE MARKET DATA → QA VALIDATION
        → REGRESSION / ANOMALY DETECTION → EVIDENCE → REPORT / DECISION
```

## 2. How it relates to SUT Value Forensics

It is **not a separate product** and not a second data pipeline. It consumes what already exists:

| It reads | From | It writes |
|---|---|---|
| Stored sync runs, observations, source evidence, payload hashes | the existing Live Market / Daily Sync ledger | nothing |
| EXP-001 price-impact baseline | `src/data/baseline-captures.ts` (frozen) | nothing |
| Effective governance state | the existing governance ledger | nothing |
| Frozen evidence records | `src/data/evidence.ts` (frozen) | nothing |
| Experiment registry | `src/data/experiment-runs.ts` (frozen) | nothing |

The module performs **no retrieval of its own**. A second ingestion path would create a second version of
the truth, which is the very thing this layer exists to detect.

It also renders **no button, input, select or textarea** — a browser test asserts all four counts are zero,
so it is structurally incapable of approving, registering or executing anything.

## 3. What each dimension validates

| # | Dimension | Validates |
|---|---|---|
| 1 | **Transaction Integrity QA** | That an observed blockchain transaction matches its expected transaction data, field by field, whenever both sides are actually available |
| 2 | **Market Data QA** | Source availability, freshness, schema, provenance, completeness, duplicates, source-side staleness and cross-source deviation |
| 3 | **Liquidity Regression** | Current comparable observations against the frozen EXP-001 baseline and against the previous stored sync |
| 4 | **Resilience Testing** | Failure scenarios, executed against the real persistence and evidence functions |
| 5 | **Security QA** | Identity validation, input validation, replay protection, evidence integrity and the governance authorization boundary |
| 6 | **Evidence Validation** | That every QA verdict can name its evidence, and that the frozen "state the reason" rule still holds |

## 4. Data sources

Everything comes from layers already in the project — nothing is fetched by this module:

- **Live Market ledger** (`loadLiveLedger`) — stored, integrity-verified `LiveSyncRun` records.
- **Frozen EXP-001 captures** — read via `baselineImpacts()`, never recomputed.
- **Frozen evidence** — `EVIDENCE`, read-only.
- **Experiment registry** — `EXPERIMENT_RUNS`, read-only.
- **Governance state** — `effectiveState(...)`, read-only.
- **Repository functions themselves** — the resilience and security dimensions execute real functions
  (`loadLiveLedger`, `appendRun`, `checkRunIntegrity`) against an isolated `MemoryStorage` and throwaway
  copies, which is what makes their PASS results real rather than asserted.

## 5. Status semantics

Six check statuses, and the distinctions between them are the point of the whole module:

| Status | Means | Never means |
|---|---|---|
| `PASS` | A real check ran against real data and succeeded | — |
| `WARNING` | A real check ran and found something worth attention | a failure |
| `FAIL` | A real check ran and the expectation was not met | — |
| `DATA_UNAVAILABLE` | The data needed does not exist, with a stated reason | a failure |
| `NOT_EXECUTED` | The check could not be run here, with the dependency named | a pass |
| `BLOCKED` | A prerequisite prevents evaluation | a failure |

Two rules are enforced in code, not just documented:

- **`DATA_UNAVAILABLE` is never collapsed into `FAIL`.**
- **`NOT_EXECUTED` is never collapsed into `PASS`.**

`check()` throws if a non-`PASS` result carries no reason, or if a status that produced no verdict carries
an evaluation timestamp. Unit tests assert both.

### Dimension rollup (deterministic)

```
any FAIL → FAIL ·  any BLOCKED → BLOCKED ·  any WARNING → WARNING
at least one PASS → PASS ·  else any NOT_EXECUTED → NOT_EXECUTED ·  else DATA_UNAVAILABLE
```

A single `PASS` never masks a `FAIL`, and a non-evaluated check never raises a rollup toward `PASS`.

### Overall rollup (deterministic, categorical)

```
any dimension FAIL                     → DEGRADED
any dimension BLOCKED                  → BLOCKED
any dimension WARNING                  → WARNING
any dimension produced NO verdict      → DATA_INSUFFICIENT
every dimension evaluated and passing  → HEALTHY
```

The fourth rule matters most: **`HEALTHY` is unreachable while any dimension could not be evaluated.**
Announcing "healthy" on partial coverage is exactly the misleading output this layer exists to prevent.
Severity still outranks coverage, so a real `WARNING` or `FAIL` is never hidden behind a coverage caveat.

And `HEALTHY` describes **the QA checks that ran** — never the SUT market, the token, adoption or price.

### There is deliberately no score

The reference design showed a numeric figure (`81/100`). **None is implemented.** A score needs a
documented, deterministic and approved scoring methodology; none exists and none is invented here. The
module reports categorical status only, and a browser test asserts `81/100` never appears.

## 6. Regression methodology

`evaluateRegression()` is a pure function, so it is fully unit-tested without any store:

```
reference value  →  current value  →  change  →  rule evaluation  →  verdict
```

- **`LOWER_IS_BETTER`** compares **absolute magnitude**, matching EXP-001 exactly. A sell impact moving
  from −9.6% to −14.2% is a regression of 4.6 percentage points, even though the signed value fell.
- **`HIGHER_IS_BETTER`** (pool liquidity, volume) treats a decline as the deterioration.
- Verdicts: `NO_REGRESSION`, `REGRESSION_DETECTED`, `DATA_UNAVAILABLE`. If either side is missing the
  verdict is `DATA_UNAVAILABLE` — never a guess, and never a pass.

### A baseline is not a threshold

**The single most important rule in this dimension.** EXP-001's four price-impact values are *historical
measurements*. This module does **not** convert them into acceptance criteria.

A `REGRESSION_DETECTED` here means "divergence beyond the QA detection margin, flagged for human review".
It does **not** mean "this value is unacceptable to the business". Threshold approval remains exactly where
it was: with a named human, via **Proposed Thresholds** and **Pre-Registration**. EXP-001's thresholds
remain `PROPOSED` and `0 of 4 REGISTERED`, and this module changes neither.

The QA detection margins (`REGRESSION_MARGIN_PCT_POINTS`, `LIQUIDITY_DECLINE_WARNING_PCT`, the freshness
bands, the cross-source deviation bands) decide only when something is worth a human's attention. They are
**not business thresholds**, are not registered, and gate nothing.

## 7. Evidence traceability

Every QA result carries a `QaEvidenceRef` with: evidence ID, source, source URL, retrieved at, observed at,
metric, value, unit, symbol, source status, provenance, evidence hash, related experiment and related sync
ID. Every field is nullable, and a null renders as `DATA UNAVAILABLE` rather than a blank — a hole must be
visible, not filled in.

Dimension 6 then audits the other five: of the results that actually produced a verdict, how many can name
a source, a metric and a methodology? A result that cannot is **listed**, not quietly presented as
evidence-backed.

## 8. Limitations

1. **No stored sync means no market-data verdict.** In a fresh browser the ledger is empty, so Market Data
   QA and the run-over-run half of Liquidity Regression are `DATA_UNAVAILABLE`. Run a Live Market Sync, or
   let the scheduled daily sync run, and they become evaluable.
2. **Freshness is measured against the client clock.** A wrong local clock is reported as a `WARNING`
   ("timestamped in the future") rather than silently distorting the result.
3. **Cross-source deviation covers only genuinely comparable pairs.** Two sources must supply the same
   quantity in the same unit. Everything else is `DATA_UNAVAILABLE`, never assumed agreement.
4. **Resilience and Security cannot test what is not here.** Scenarios needing an external runtime — API
   timeout, RPC unavailable, delayed confirmation, missing webhook, hostile upstream payload, outbound rate
   limiting — report `NOT_EXECUTED` with the dependency named. They are never shown as passing.
5. **Trends need at least two stored runs.** With fewer, the UI prints `INSUFFICIENT DATA FOR TREND`.
6. **The module reads a point in time.** It detects divergence between observations; it does not explain
   why anything diverged, and it asserts no cause.

## 9. What cannot currently be measured

| Not measurable | Why | What would change it |
|---|---|---|
| Transaction integrity (expected vs actual) | No expected-transaction context exists. An expected transaction comes from an order, invoice or payment system, and no product telemetry is connected. The public utility and value-capture audit confirmed the public position: no public order ID, payment reference or receipt exists for any SUT transaction examined, and no address is publicly attributable to a product or merchant | Approved internal telemetry, or any source of expected transactions |
| EXP-001 price-impact regression | The live sync does not compute modelled price impact at standardised sizes. That quantity is Uniswap V3 single-active-range math at a stated block under the registered EXP-001 method fingerprint | A new capture using the identical EXP-001 method. A value from a different methodology is **not** substituted |
| `$100,000` price impact | The frozen baseline records it as NOT EXECUTABLE / NOT REGISTERABLE — the pool could not fill it on either side. There is no baseline percentage to regress against | Pool inventory later supporting the size |
| Pool-liquidity regression against EXP-001 | The baseline records pool reserves by `contract_call`; the live sync reports `pair_liquidity_usd` as `aggregator_reported`. Comparing them across methodologies is barred | A method-matched capture on both sides |

In each case the module reports the gap and names the missing input. None is reported as a pass, and none
is filled with an invented value.

## 10. How future experiments can consume QA findings

A QA finding is evidence, and it enters the existing chain at the point evidence always enters it:

```
QA DETECTS DEGRADATION → EVIDENCE (traceable, timestamped, reasoned)
   → HUMAN REVIEW → PROPOSED EXPERIMENT → PRE-REGISTERED THRESHOLDS
   → BASELINE APPROVAL → CONTROLLED INTERVENTION → MEASURED RESULT
```

Concretely:

- A sustained **`pair_liquidity_usd` regression** is a measurable, dated observation an EXP-001-style
  liquidity experiment can cite as its reason to exist.
- A persistent **completeness `WARNING`** is exactly the evidence `OPP-L2` (market transparency / data
  coverage) asks for, naming which metric is missing and which source could not supply it.
- A **cross-source `FAIL`** identifies two sources that do not describe the same quantity — a prerequisite
  finding for any experiment that would rely on either.
- **Evidence-hash coverage** below full tells a future auditor exactly which observations cannot be
  re-verified from their raw payload.

What the QA layer never does is advance a gate. It produces evidence and a status; a named human decides
what, if anything, follows.

## 11. Experiment identifier collision — open governance item

`EXP-002` is used **twice** in this project, and this module does not resolve it:

| Holder | What it is |
|---|---|
| **Frozen, in-code** | `EXP-002` — *"Reproducible weekly active addresses"* (`OPP-02`, stage `PLANNED`, captures `WEEK-2026-W39`, shown on **Baseline Operations**) |
| **Document** | `docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md` — the public utility and value-capture evidence audit, commissioned under the same number |

Market Quality therefore references the audit **by document path, never by experiment id**, so neither is
renamed, merged or overwritten. The collision is surfaced in the Transaction Integrity panel and recorded in
`EXPERIMENT_ID_COLLISION`. Renumbering the audit (for example to `EXP-003`) is a **governance decision for a
named human** — the in-code experiment is older and is referenced by frozen captures, UI and tests.

## 12. Verification

```
npm run typecheck    0 errors
npm test             654 passed (20 files) — 79 new Market Quality tests
npm run smoke        32/32 checks passed
npm run build        success
npx playwright test  247 passed (19 files) — 22 new Market Quality browser tests
```

Governance regression tests assert, after the module runs, that: the EXP-001 baseline captures are
byte-identical; the frozen evidence layer is byte-identical; the experiment registry is byte-identical with
the frozen `EXP-002` intact; the four price-impact baselines still read 10.64 / −9.61 / 58.56 / −36.93 with
`$100,000` null; every proposed threshold is still proposed; the governance state is unchanged; and the
module exports no function whose name begins with approve, register, execute, commit, save, write or set.

Test fixtures are built in memory, marked **TEST DATA**, never exported and never written to a store, so no
fixture can reach a production evidence store.

**Created & Implemented by Magha Ram.**
