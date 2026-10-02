# EXP-001 — Liquidity / market depth

Status as of **2026-10-02**: baseline captured, **thresholds not approved**, **intervention not executed**,
**no measured result exists**.

---

## 1. Why this experiment exists

The frozen research established (H2, **SUPPORTED**) that depth exhaustion was the amplification mechanism of
the May 2026 move: a net sell imbalance of roughly **$26,981** accompanied a **−62.7%** intraday move, while
net pool liquidity was *positive* on every crash day — so this was not LP withdrawal. OPP-01 turns that into
a measurable market-structure property: price response per unit of order flow.

The initiating catalyst remains **unresolved**. This experiment measures structure; it does not identify who
sold first.

## 2. Observed baseline — not a target

Three real captures from live pool state at exact Polygon blocks on 2026-09-30. Values are quoted unchanged
from `src/data/baseline-captures.ts` and are never recalculated by any feature.

| Standardised size | RUN-001 | RUN-002 | RUN-003 | Magnitude (RUN-003) |
|---|---|---|---|---|
| $10,000 buy | 10.59% | 10.68% | **10.64%** | **10.6%** |
| $10,000 sell | −9.57% | −9.65% | **−9.61%** | **9.6%** |
| $50,000 buy | 58.26% | 58.82% | **58.56%** | **58.6%** |
| $50,000 sell | −36.81% | −37.03% | **−36.93%** | **36.9%** |
| $100,000 (both sides) | — | — | — | **NOT EXECUTABLE / NOT REGISTERABLE** |

Blocks: 94,711,694 · 94,712,797 · 94,722,565. Evidence IDs for RUN-003: EV-143, EV-144, EV-145, EV-146;
`$100,000` is EV-147 with a null value.

**These are baseline MEASUREMENTS, not targets.** Sells are negative; comparison uses absolute magnitude
(`LOWER_IS_BETTER`).

### Why $100,000 is not registerable

The pool cannot fill the size on either side. At the latest capture a buy needs 159,614 SUT against 99,065
available, and a sell needs $65,859 against $51,696 available. No percentage is reported, because a number
would describe a trade the venue cannot perform. The slot becomes registerable only if inventory later
supports it.

## 3. Proposed business thresholds — not approved

| Standardised size | Proposed | Status |
|---|---|---|
| $10,000 buy | ≤ 8% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $10,000 sell | ≤ 8% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $50,000 buy | ≤ 40% | **PROPOSED — PENDING BUSINESS APPROVAL** |
| $50,000 sell | ≤ 30% | **PROPOSED — PENDING BUSINESS APPROVAL** |

Author/source: project working proposal for experiment planning — **not a business owner**. These values
unlock nothing, are not success criteria, and are not registered. `isRegisteredThreshold()` returns the
literal `false` for every one of them.

## 4. Governance chain and current gate

| # | Required evidence | Current state |
|---|---|---|
| 1 | Registered business-approved thresholds | **NOT REGISTERED (0 of 4)** — business approval required |
| 2 | Approved baseline | **CAPTURED but NOT APPROVED** — no named human has accepted a run |
| 3 | Intervention evidence | **NOT EXECUTED** |
| 4 | Same measurement methodology | not applicable until a comparison exists |
| 5 | Same method fingerprint | required: `METHOD_FINGERPRINT_EXP001` |
| 6 | New post-intervention measurement | **DATA UNAVAILABLE** |
| 7 | Named human review | **NOT RECORDED** |
| 8 | Final decision | **NOT DETERMINED** |

Current gate: **`THRESHOLDS_PENDING`**.

## 5. Measurement method (fixed, fingerprinted)

Uniswap V3 single-active-range math on pool `0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165`
(token0 = SUT, token1 = USDT, fee 1.00%), read directly from `slot0`/`liquidity`/`balanceOf` at a stated
block, with a one-sided inventory feasibility check applied before any percentage is reported. A comparison
must declare the identical fingerprint; any change invalidates it, and unrelated measurements are never
compared.

## 6. Expected measurable effect — if an intervention were ever approved and performed

If such an intervention were carried out and were effective, the modelled price impact at the four
standardised sizes **should fall** relative to the approved baseline, compared by absolute magnitude. That
is the metric to be measured. It is **not** a prediction of price, market capitalisation or market rank, and
not a claim about what an intervention would do.

## 7. What is explicitly not claimed

- No liquidity improvement. Current pool liquidity is observable, but May 2026 pool TVL was **never
  measured** (EV-901) and historical CEX order-book depth is **unrecoverable** (EV-902), so no time-aligned
  before/after liquidity comparison is possible in either direction.
- No price improvement, no adoption increase, no Top-100 ranking change.
- No intervention result. The post-intervention measurement is DATA UNAVAILABLE and the measured result is
  NOT DETERMINED.

## 8. How to proceed

1. A named business owner enters and confirms the acceptable thresholds on **Proposed Thresholds**.
2. A named human registers each approved threshold on **Pre-Registration** with a rationale and an
   independence confirmation, before any measurement exists.
3. A named human approves one captured baseline run on **Baseline History**.
4. Only then does the intervention gate open — and the intervention itself is a real-world action recorded
   by a human, never performed by this application.
