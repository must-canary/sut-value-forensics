# SUT Value Improvement Lab

A decision-ready evidence and experimentation interface. **Not** an automatic decision engine.

Screen: **Value Improvement Lab**. Core logic: `src/core/improvement-lab.ts`. UI: `src/ui/improvement-lab.tsx`.

---

## 1. What it does

```
CURRENT EVIDENCE -> IDENTIFIED GAPS -> PRODUCT / QA OPPORTUNITIES -> PROPOSED EXPERIMENT
  -> EVIDENCE REQUIRED -> MEASUREMENT -> BUSINESS DECISION
```

It reads the existing live market sync, the frozen research anchors and the live governance state, and
converts them into measurable improvement opportunities. It collects no data of its own, owns no gates, and
renders **no buttons and no inputs** — a browser test asserts both counts are zero, so it is structurally
incapable of approving, registering or executing anything.

## 2. Identified gaps

| Gap | Title | Status | Evidence basis |
|---|---|---|---|
| **GAP-A** | Liquidity / market-depth measurement | SUPPORTED | EXP-001 baseline from RUN-001/002/003; H2 supported; `$100K` not executable |
| **GAP-B** | Market-data coverage | SUPPORTED | Metrics the latest sync could not verify, each with the source's own reason |
| **GAP-C** | Exchange / venue access evidence | DATA INSUFFICIENT | H4 INCONCLUSIVE; EV-902 unrecoverable; only one DEX pool observed |
| **GAP-D** | Utility / token value-capture measurement | DATA UNAVAILABLE | H7 INCONCLUSIVE, H8 DATA_UNAVAILABLE; no product telemetry is connected |

GAP-B degrades honestly: with no stored sync it reports **DATA INSUFFICIENT** and states that nothing is
assumed in its absence. No utility, company, exchange or user activity is fabricated anywhere.

## 3. Opportunities and next actions

| ID | Opportunity | Status | Next action | Next-action status |
|---|---|---|---|---|
| **OPP-L1** | Liquidity / market-depth improvement | BUSINESS REVIEW REQUIRED | Obtain business approval for the measurement thresholds, then register the approved thresholds before any intervention | **BLOCKED BY BUSINESS DECISION** |
| **OPP-L2** | Market transparency / data coverage | PROPOSED | Investigate an additional verified public source for the unavailable market-cap / circulating-supply / rank observations | PROPOSED |
| **OPP-L3** | Exchange / market access evidence | DATA INSUFFICIENT | Identify the verified venue-level evidence required to measure market access, liquidity, spread and depth | DATA INSUFFICIENT |
| **OPP-L4** | Utility / token value-capture measurement | DATA UNAVAILABLE | Identify measurable product telemetry connecting real product usage with SUT-related activity | DATA UNAVAILABLE |

### Prepared by QA for OPP-L1 (already done, not waiting)

- Baseline captured from three real runs
- Evidence traceability available for every observation
- Measurement methodology fixed and fingerprinted
- Governance workflow implemented end to end
- Post-intervention comparison path ready and tested

OPP-L2, OPP-L3 and OPP-L4 require **no business approval** to progress.

### OPP-L4 progressed — EXP-002, 2026-10-07

The tables above are read from `src/core/improvement-lab.ts` and state what the **code** reports. The code
is unchanged, so GAP-D and OPP-L4 still report the literal `DATA UNAVAILABLE`. That is deliberate: a
code-derived status may only move after a named human accepts a finding.

Separately, OPP-L4's next action — *"identify measurable product telemetry connecting real product usage
with SUT-related activity"* — was acted on by
[EXP-002](EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md), a public-evidence audit run because company-side
telemetry is unavailable. It collected 41 evidence items and reached an experiment-level status of
**C — ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED**: mainnet SUT activity is real and measured,
while **0 of 399** transactions could be linked to a product record. EXP-002 identified the telemetry OPP-L4
was asking for — it is internal, and named in the report's §19. No lab status, threshold or gate was changed
by it.

## 4. Experiment view

Shows the observed baseline labelled **"Observed baseline — not a target."**, `$100,000` as
**NOT EXECUTABLE / NOT REGISTERABLE**, and the proposed thresholds separately as
**PROPOSED — PENDING BUSINESS APPROVAL**. Business approval `PENDING`, baseline approval `PENDING`,
intervention `NOT EXECUTED`, post-intervention measurement `DATA UNAVAILABLE`, measured result
`DATA UNAVAILABLE`. `executableByLab` is the literal `false`.

## 5. Decision status

| Field | Value |
|---|---|
| Business threshold | PENDING BUSINESS REVIEW |
| Experiment | READY FOR BUSINESS DECISION |
| Intervention | NOT EXECUTED |
| Measured improvement | DATA UNAVAILABLE |
| Final result | NOT DETERMINED |

QA continues meanwhile: capture further live evidence with provenance, extend source coverage for
unavailable fields, keep the methodology and fingerprint stable, maintain the governance workflow and its
refusal paths, keep the comparison path tested.

## 6. Market ranking context

> Top-100 ranking is a downstream market outcome, not a direct operating KPI. This lab does not predict or
> claim ranking improvement. The purpose is to identify measurable product and market factors that may
> contribute to sustainable usage, liquidity, value capture, market access and market confidence.

No ranking is calculated or predicted.

## 7. Language enforcement

Every string the lab produces passes `assertAssessmentLanguage()` at construction time. Forbidden phrases
include *will rise · will increase · will improve ranking · will reach top 100 · liquidity improved ·
adoption increased · the intervention succeeded · this caused the price increase · this will increase
demand · this guarantees value · target achieved · do this intervention*. A unit test iterates the full list
and a browser test scans the rendered page.

## 8. Week 2 execution summary (shown in the UI)

1. Historical research frozen as reference layer.
2. Current SUT market-state evidence implemented.
3. Source-level evidence traceability implemented.
4. EXP-001 baseline captured from three real runs.
5. Governance workflow implemented.
6. Business threshold decision remains human-controlled.
7. Value Improvement Lab converts evidence into measurable improvement opportunities.
8. No business result is fabricated.

**The chain:** Research tells us what the problem areas are → Live Sync tells us what the current market
condition is → QA/Product prototypes allow us to test what can be improved → Experiments tell us what
actually improved → Business review decides what to scale, continue, change, or stop.
