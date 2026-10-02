---
title: SUT Value Forensics — Product Thesis & Experiment Direction
created_and_idea_by: Magha Ram
role: Product direction, thesis framing, and implementation
version: 1.0
date: 2026-09-30
status: Active — Experiment 01 baseline collection RUNNING
attribution_scope: >
  "Created & Idea by Magha Ram" applies to the SUT Value Forensics thesis,
  product direction and implementation work. It does NOT claim authorship of
  the underlying frozen research documents, which are referenced as sources
  and remain the work of their original authors.
frozen_research_sources:
  - research-freeze.md
  - research-baseline.md
  - hypothesis-matrix.md
  - data-source-contract.md
  - evidence-model.md
  - may-2026-investigation-plan.md
  - research-change-log.md
---

# SUT Value Forensics — Product Thesis

**Created & Idea by Magha Ram.**

> **Attribution scope.** This credit covers the product thesis, direction and
> implementation. The frozen research documents listed above are **sources**,
> not work claimed under this attribution.

---

## 1. The thesis

SUT's observable problem is not primarily a valuation problem — it is a
**market-structure and evidence problem**.

The frozen May 2026 investigation established that a net sell imbalance of
roughly **$27,000** accompanied a **−62.7% intraday** price move, while net
liquidity stayed positive on every day of the crash. That is depth exhaustion,
not liquidity flight and not a broad market move.

The thesis follows from that: **the mechanism is measurable, the trigger is
not**, and the useful work is to make the measurable part reproducible rather
than to argue about the unmeasurable part.

## 2. What this product is

An evidence platform where every displayed number carries provenance, every
unmeasurable quantity says so, and no conclusion can be stated that the
evidence does not carry.

**Design constraints, enforced in code rather than prose:**

| Rule | Enforcement |
|---|---|
| Ticker never identifies the asset | contract-level identity gate |
| Gross pool flow is not trading volume | `assertVolumeSource` |
| Wallet roles default to UNKNOWN | `makeWallet` requires role evidence |
| No causal claim without a named human | `assertCausalClaimAllowed` |
| No result before measurement | `assertNoResultBeforeMeasurement` |
| No price or market-rank promise | `assertNoOutcomePromise` |
| Missing history is never substituted | `assertNoHistoricalSubstitution` |
| Unregistered thresholds must say so | `assertThresholdHonest` |

## 3. What this product is not

It is **not** a price-prediction tool, a trading tool, or a ranking-improvement
tool. No experiment in this backlog claims that an intervention will raise SUT's
price or market rank. The measurable business mechanism is the target.

## 4. Experiment direction

Eight improvement opportunities derived strictly from the frozen research.
Experiment 01 — **Liquidity Sensitivity** — is the first to run, because it is
the only one whose primary KPI is measurable today without company or exchange
cooperation.

**Experiment 01 objective:** establish a current, reproducible liquidity-
sensitivity baseline that can be monitored going forward.

**It does not reconstruct May 2026 historical TVL.** That figure was never
measured and is not recoverable; the September readings are explicitly *not*
substituted for it.

## 5. Current state

| Item | State |
|---|---|
| Research | FROZEN 2026-09-30 — mechanism supported, initiating catalyst unresolved |
| OPP-01 | **RUNNING** — baseline collection started |
| EXP-001 | Stage REVIEW · RUN-001, RUN-002 captured · no result |
| EXP-002 | Weekly active addresses measured for ISO 2026-W39 |
| Success threshold | **PRE-REGISTRATION REQUIRED** — no numeric threshold registered |
| Reviews recorded | None — no reviewer configured |

## 6. The standard this product holds itself to

A result is only a result when it has been measured, compared against a
threshold registered *beforehand*, and reviewed by a named human.

A working application is not an experimental result. The implementation and
the business outcome are separate things, and this product is built so that
the second cannot be claimed on the strength of the first.
