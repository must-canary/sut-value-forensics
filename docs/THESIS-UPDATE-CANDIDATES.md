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

**Explicitly NOT a candidate.** H7 (weak organic utility/adoption) is INCONCLUSIVE and H8 (weak token value
capture) is DATA_UNAVAILABLE in the frozen research. No product telemetry is connected to this project, so
there is no observation to add.

**Status:** BLOCKED — DATA UNAVAILABLE pending a real telemetry source (lab opportunity OPP-L4).

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
| 4 | Adoption / utility / value capture | BLOCKED — no telemetry source |
| 5 | Market ranking | OUT OF SCOPE |
| 6 | EXP-001 result | BLOCKED — no measurement, no review |

**No thesis file was modified.** Any change requires a named human author and must pass the project's
existing evidence standard.
