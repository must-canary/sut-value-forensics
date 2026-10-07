# SUT Value Forensics

An evidence-first platform investigating why SuperTrust (SUT) lost market value, and converting that
evidence into measurable, governed improvement experiments.

**Case #001 — SUT May 2026 crash.** Research frozen 2026-09-30. Mechanism supported; initiating catalyst
unresolved.

Created & Idea by **Magha Ram**.

---

## What this is

A local, client-side React application with a Node entrypoint for scheduled data collection. It holds three
layers that are kept permanently apart:

| Layer | What it is | Can it change? |
|---|---|---|
| **1. Historical / forensic evidence** | The frozen May 2026 investigation: hypotheses, evidence records, timeline, conflicts | **Never.** Frozen 2026-09-30 |
| **2. Current — SUT market state** | Live public market observations with full provenance, captured on demand or by cron | Appends new immutable records |
| **3. Experiment & governance (EXP-001)** | Thresholds, baseline approval, intervention, measurement, review | Only a named human advances it |

The application **observes, compares when valid, and proposes**. It never approves a business decision,
never performs an intervention, and never produces a measured result.

## Current state at a glance

| Item | State |
|---|---|
| Research | **FROZEN 2026-09-30** |
| EXP-001 baseline | Captured from 3 real runs (RUN-001/002/003) |
| Business thresholds | **PROPOSED — PENDING BUSINESS APPROVAL** (not approved) |
| Threshold registration | **0 of 4 registered** |
| Baseline approval | **0 of 3 approved** |
| Intervention | **NOT EXECUTED** |
| Post-intervention measurement | **DATA UNAVAILABLE** |
| Measured result | **DATA UNAVAILABLE / NOT DETERMINED** |
| Governance gate | `THRESHOLDS_PENDING` |
| EXP-002 (GAP-D public utility audit) | **COMPLETE 2026-10-07 — awaiting human review** |
| GAP-D experiment-level status | **ON-CHAIN ACTIVITY OBSERVED, PRODUCT USAGE UNVERIFIED** |
| Market Quality (QA) | **OPERATIONAL** — six dimensions, categorical status only, no numeric score |

No liquidity improvement, adoption increase, price movement or Top-100 ranking change is claimed anywhere
in this project. No SUT product usage, merchant payment or token value capture is claimed either — and
equally, it is not claimed that SUT has no utility. EXP-002 reports what public evidence can and cannot
prove, and nothing beyond it.

## Verified test state (2026-10-07)

```
npm test             575 passed (19 files)
npm run typecheck    0 errors
npm run build        success
npm run smoke        32/32 checks passed
npx playwright test  225 passed (18 files)
```

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build
npm test           # unit tests (vitest)
npm run smoke      # end-to-end guard check of the evidence workflow
npx playwright test
```

Scheduled market collection (outside the browser):

```bash
cp .env.example .env.local     # optional: add CMC_API_KEY for the deferred CMC source
npm run daily-sync             # cron: 5 0 * * *  (00:05 UTC)
```

## Documentation

| Document | Purpose |
|---|---|
| [docs/README.md](docs/README.md) | Documentation index and reading order |
| [docs/IMPLEMENTATION-GUIDE.md](docs/IMPLEMENTATION-GUIDE.md) | Architecture, modules, data flow, persistence |
| [docs/QA-VALIDATION-GUIDE.md](docs/QA-VALIDATION-GUIDE.md) | How to run and interpret every check |
| [docs/EXP-001-LIQUIDITY-MARKET-DEPTH.md](docs/EXP-001-LIQUIDITY-MARKET-DEPTH.md) | EXP-001: baseline, thresholds, gates |
| [docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md](docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md) | EXP-002: GAP-D public utility and value-capture evidence audit |
| [docs/SUT-VALUE-IMPROVEMENT-LAB.md](docs/SUT-VALUE-IMPROVEMENT-LAB.md) | Gaps, opportunities, next actions |
| [docs/MARKET-QUALITY-QA.md](docs/MARKET-QUALITY-QA.md) | Market Quality (QA): six QA dimensions, status semantics, regression methodology |
| [docs/WEEK-2-FINAL-REPORT.md](docs/WEEK-2-FINAL-REPORT.md) | What was delivered and verified in week 2 |
| [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) | Live status of every layer and decision |
| [docs/GIT-RELEASE-CHECKLIST.md](docs/GIT-RELEASE-CHECKLIST.md) | Pre-commit verification and secret scan |
| [docs/THESIS-UPDATE-CANDIDATES.md](docs/THESIS-UPDATE-CANDIDATES.md) | Proposed thesis changes — none applied |

Frozen research documents live at the repository root and must not be edited:
`THESIS.md`, `research-baseline.md`, `research-freeze.md`, `research-change-log.md`,
`hypothesis-matrix.md`, `evidence-model.md`, `data-source-contract.md`,
`may-2026-investigation-plan.md`.

## Screens

**Historical research — frozen:** Executive Dashboard · Crash Investigations · Market Analysis ·
On-Chain Forensics · Exchange & Liquidity · Hypothesis Lab · Evidence

**Experiment & governance — EXP-001:** Improvement Backlog · Improvement Opportunities ·
Experiment Execution · Baseline Operations · Proposed Thresholds · Pre-Registration · Baseline History ·
Experiment Guide

**Current — SUT market state:** Daily Market Sync · Value Improvement Lab

**Market quality — QA:** Market Quality (QA)

**Reporting:** Reports · Settings

## Rules this codebase enforces

- The asset is identified by its **Polygon contract** `0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55`,
  never by the ticker "SUT" (a known collision).
- A value a source does not publish is **DATA UNAVAILABLE with the real reason** — never zero, never
  estimated, never carried over.
- Raw ERC-20 transfer flow is never called "trading volume".
- A threshold registered after seeing results is a rationalisation; registration requires a named human,
  a rationale and an independence confirmation, before any measurement exists.
- `LOWER_IS_BETTER` compares signed price impact by **absolute magnitude**.
- No root cause, finding or result exists without a named human author.

## The next business decision

Approve (or revise) the four EXP-001 measurement thresholds. Until a business owner approves and a named
human registers them, and a named human approves a baseline run, the intervention gate stays closed and no
result can exist. See [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md).
