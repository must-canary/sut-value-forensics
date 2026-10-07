# Documentation index

Last verified: **2026-10-07**. Status of the whole project: see [PROJECT-STATUS.md](PROJECT-STATUS.md).

## Reading order

1. **[../README.md](../README.md)** — what the project is, how to run it, current state in one table.
2. **[PROJECT-STATUS.md](PROJECT-STATUS.md)** — the live state of each layer and the exact outstanding
   business decision.
3. **[EXP-001-LIQUIDITY-MARKET-DEPTH.md](EXP-001-LIQUIDITY-MARKET-DEPTH.md)** — the experiment itself:
   captured baseline, proposed thresholds, governance gates.
4. **[EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md](EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md)** — the
   GAP-D public-evidence audit: what public sources can and cannot prove about SUT utility and token value
   capture. 41 evidence items, 29 of them first-party.
5. **[SUT-VALUE-IMPROVEMENT-LAB.md](SUT-VALUE-IMPROVEMENT-LAB.md)** — how evidence becomes measurable
   improvement opportunities.
6. **[MARKET-QUALITY-QA.md](MARKET-QUALITY-QA.md)** — the Market Quality (QA) layer: what each of the six
   QA dimensions validates, the status semantics, the regression methodology and what cannot be measured.
7. **[IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md)** — architecture, modules, persistence, services.
8. **[QA-VALIDATION-GUIDE.md](QA-VALIDATION-GUIDE.md)** — every check, how to run it, what it proves.
9. **[WEEK-2-FINAL-REPORT.md](WEEK-2-FINAL-REPORT.md)** — what was delivered and verified this week.
10. **[GIT-RELEASE-CHECKLIST.md](GIT-RELEASE-CHECKLIST.md)** — pre-commit verification and secret scan.
11. **[THESIS-UPDATE-CANDIDATES.md](THESIS-UPDATE-CANDIDATES.md)** — proposed thesis changes. None applied.

## The frozen layer

These files are the project's evidence foundation. They are **never edited** by any feature, screen,
service or test:

| File | Content |
|---|---|
| `THESIS.md` | The product thesis and attribution |
| `research-baseline.md` | Consolidated research baseline |
| `research-freeze.md` | The freeze declaration and its scope |
| `research-change-log.md` | Every change made before the freeze |
| `hypothesis-matrix.md` | H1–H12 with status and scope |
| `evidence-model.md` | The evidence lineage model |
| `data-source-contract.md` | Source rules, identity ladder, retrieval policy |
| `may-2026-investigation-plan.md` | The investigation plan |

Their in-code counterparts — `src/data/hypotheses.ts`, `evidence.ts`, `timeline.ts`,
`baseline-captures.ts`, `measurements.ts`, `sources.ts`, `opportunities.ts`, `experiment-runs.ts` — are
equally frozen. SHA-256 prefixes for all of them are recorded in
[GIT-RELEASE-CHECKLIST.md](GIT-RELEASE-CHECKLIST.md) so any later change is detectable.

## Language rules that apply to every document and screen

Permitted: *proposed · to be investigated · expected measurable effect · evidence required ·
data unavailable · data insufficient · business approval required · measured result unavailable ·
hypothesis · observation · historical evidence*.

Prohibited anywhere in the product or its documentation: claims that price will increase, that ranking will
improve or reach the Top 100, that liquidity improved, that adoption increased, that an intervention
succeeded, or that anything caused a price movement without evidence meeting the causal standard. These are
enforced in code by `assertAssessmentLanguage()` and asserted by unit and browser tests.
