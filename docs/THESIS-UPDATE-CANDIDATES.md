# Thesis update candidates

**Status: NONE APPLIED.** `THESIS.md` is unchanged (SHA-256 prefix `bfd3ed42bd7e8077`, last modified
2026-09-30). This document only records what *could* be proposed to a human author, with the evidence that
would support each change. Applying any of them is a human decision.

---

## Why nothing was applied

The thesis is part of the frozen layer. Changing it requires a named human author and, where it touches a
research finding, the full causal/evidence standard. None of the candidates below meets that bar today, and
several are explicitly blocked on evidence that does not yet exist.

## Candidate 1 — Record that the measurement capability now exists

**Proposed addition:** a line stating that price impact at four standardised sizes is now measurable with a
fixed, fingerprinted method, captured from three real runs.

**Evidence:** RUN-001/002/003 at blocks 94,711,694 · 94,712,797 · 94,722,565; `METHOD_FINGERPRINT_EXP001`.

**Why it is only a candidate:** this is an implementation fact, not a research finding. It changes no
conclusion. A human may prefer to keep it in the implementation docs, where it already is.

**Status:** PROPOSED — no action required.

## Candidate 2 — Record the market-data coverage gap as a durable limitation

**Proposed addition:** note that market capitalisation, circulating supply and market rank are not published
for this contract by the configured public sources, and that no value is substituted.

**Evidence:** every live sync records these as DATA UNAVAILABLE with the source's own reason — the source
reports `0`, which is not a measurement.

**Why it is only a candidate:** the thesis already states that displayed market cap is supply × price rather
than realisable value. This would add operational detail, not a new conclusion.

**Status:** PROPOSED — no action required.

## Candidate 3 — Nothing about liquidity change

**Explicitly NOT a candidate.** Current pool liquidity is observable, but May 2026 pool TVL was **never
measured** (EV-901) and historical CEX order-book depth is **unrecoverable** (EV-902). No time-aligned
before/after comparison is possible in either direction, so no thesis statement about liquidity improving or
deteriorating can be supported.

**Status:** BLOCKED — DATA UNAVAILABLE, permanently for the May window.

## Candidate 4 — Nothing about adoption, utility or value capture

**Still NOT a candidate for a thesis edit.** H7 (weak organic utility/adoption) is INCONCLUSIVE and H8 (weak
token value capture) is DATA_UNAVAILABLE in the frozen research. No product telemetry is connected to this
project.

**Updated 2026-10-07 by EXP-002.** The public-evidence position has changed even though the thesis position
has not. [EXP-002](EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md) collected 41 evidence items and established:
14 dated first-party utility claims; real measured mainnet SUT activity (473 transfer legs / 399
transactions / 251 distinct senders in 16 h 40 m); **0 of 399** transactions resolvable to a product record
against the only first-party public verification endpoint; and **no** publicly attributable merchant,
product, company or exchange address.

This is new evidence bearing on H7 and H8, and it is **consistent** with both of their existing statuses. It
does **not** meet the bar to re-status a frozen hypothesis, for two reasons recorded in the report: product
usage may be occurring privately and invisibly to a public audit (§16.4), and the sensitivity of the linkage
instrument could not be established, so the central negative is bounded rather than conclusive (§12.3).

**Status:** BLOCKED for a thesis edit — DATA UNAVAILABLE pending a real telemetry source (lab opportunity
OPP-L4). **Evidence advanced**, hypothesis statuses unchanged.

## Candidate 5 — Nothing about market ranking

**Explicitly NOT a candidate.** Ranking is a downstream market outcome, not an operating KPI. The project
does not calculate or predict it, and no ranking statement may be added to the thesis.

**Status:** OUT OF SCOPE by design.

## Candidate 6 — A result from EXP-001

**Not yet possible.** A thesis statement about whether depth changes price impact requires: registered
business-approved thresholds, an approved baseline, a recorded intervention, a post-intervention measurement
with the identical method fingerprint, and a named human review. Currently 0 of 8 evidence steps are
satisfied.

**Status:** BLOCKED — the measured result is DATA UNAVAILABLE and the final result is NOT DETERMINED.

---

## Summary

| # | Candidate | Status |
|---|---|---|
| 1 | Measurement capability exists | PROPOSED — optional, no conclusion changes |
| 2 | Market-data coverage gap | PROPOSED — optional, no conclusion changes |
| 3 | Liquidity change | BLOCKED — no time-aligned evidence can exist |
| 4 | Adoption / utility / value capture | BLOCKED — no telemetry source · **EXP-002 evidence advanced, statuses unchanged** |
| 5 | Market ranking | OUT OF SCOPE |
| 6 | EXP-001 result | BLOCKED — no measurement, no review |

**No thesis file was modified.** Any change requires a named human author and must pass the project's
existing evidence standard.
