# Implementation guide

Last verified **2026-10-02**. React 18 + Vite 5 + TypeScript (strict, `noUncheckedIndexedAccess`), Vitest,
Playwright. Runtime dependencies: `react`, `react-dom`. Nothing else.

---

## 1. Architecture

```
HISTORICAL RESEARCH (frozen)        CURRENT MARKET STATE            EXPERIMENT & GOVERNANCE
src/data/hypotheses.ts              src/core/live-market-sync.ts    src/core/governance.ts
src/data/evidence.ts                src/core/live-market-store.ts   src/core/governance-store.ts
src/data/timeline.ts                src/core/daily-sync.ts          src/core/pre-registration.ts
src/data/baseline-captures.ts       src/core/daily-store.ts         src/core/business-decision.ts
src/data/measurements.ts            src/service/*-sync-service.ts   src/core/decision-store.ts
        |                                    |                               |
        +-------- read only ---------------->+<------- read only ------------+
                                             |
                                    src/core/live-assessment.ts
                                    src/core/improvement-lab.ts
```

There is no backend and no database. The app is a client-side SPA; scheduled collection runs through a Node
entrypoint that shares the same services.

### Layer rules enforced in code

- The current layer and the lab **read** the frozen layer and the governance state. Neither writes to them.
  `labMutatesResearch()`, `liveSyncMutatesGovernance()`, `assessmentApprovesNothing()` and similar functions
  return the literal type `false`, so a regression is a type error, not just a test failure.
- Every store is append-only with a fingerprint re-checked on read. A record whose content no longer matches
  its fingerprint is `TAMPERED` and is excluded from every gate calculation.

## 2. Persistence

All persistence is browser `localStorage` behind an injectable `StoragePort` (`src/core/decision-store.ts`),
with `MemoryStorage` for tests and a file-backed port in the cron entrypoint. No database was introduced.

| Store key | Module | Contents |
|---|---|---|
| `sut-value-forensics:exp-001:business-decision:v1` | `decision-store.ts` | Business threshold input and approval, versioned |
| `sut-value-forensics:exp-001:governance:v1` | `governance-store.ts` | Registrations, baseline approvals, intervention, comparison, final review |
| `sut-value-forensics:daily-market:v1` | `daily-store.ts` | Dated observational reports |
| `sut-value-forensics:live-market:v1` | `live-market-store.ts` | Live sync runs with raw evidence |

Common properties: append-only, immutable records, integrity fingerprint, `$100,000` stripped on read and
refused on write, and a ledger written for another contract is never adopted.

## 3. Market data collection

`src/core/live-market-sync.ts` defines the v1 sources. **No credentialed API is required.**

| Source | Addressing | Identity |
|---|---|---|
| CoinGecko `simple/token_price` | contract | CONTRACT_VERIFIED |
| CoinGecko `coins/polygon-pos/contract` | contract | CONTRACT_VERIFIED |
| DexScreener `tokens/{contract}` | contract, matched to the canonical pool | PAIR/CONTRACT_VERIFIED |
| Polygon RPC batch (`eth_blockNumber`, `slot0`, `eth_getBlockByNumber`) | contract | CONTRACT_VERIFIED |
| CoinGecko `simple/price` (BTC, ETH) | ids | NOT_APPLICABLE |
| CoinGecko `global` | — | NOT_APPLICABLE |
| CoinMarketCap | ticker | **DEFERRED — not used in v1** |

Each observation carries: metric, value, unit, asset, ticker, contract, chain, venue, pair, observation
timestamp, retrieval timestamp, source, endpoint, identity status, status, SHA-256 of the raw payload, the
raw payload, methodology and limitation.

`LiveMarketSyncService` is the single implementation used by both the **Run Live Market Sync** button
(trigger `MANUAL`) and `scripts/daily-sync.ts` (trigger `SCHEDULED`). Only the storage port, source list and
trigger differ. Retrieval is sequential because free public endpoints rate-limit bursts; a thrown network
error is retried once, while an HTTP status (401/429/5xx) is a real answer and is never retried.

### Credentials

`CMC_API_KEY` is read only by the Node entrypoint from `.env.local`, sent as the `X-CMC_PRO_API_KEY`
**header**, and never written to a URL, a store, a report or a log. No `VITE_*` variable holds a credential,
so Vite cannot inline one into the client bundle; the env loader refuses any `VITE_`-prefixed key with a
warning. Logs print only `CMC API configured: YES/NO`.

## 4. Governance chain

`src/core/governance.ts` owns the gates; `governance-store.ts` persists what humans commit:

```
threshold registration (+ rationale, independence, immutable lock)
  -> baseline approval (named human)
    -> controlled intervention record (evidence IDs must exist)
      -> same-method comparison capture (no typing surface)
        -> before/after calculation (derived, never stored)
          -> final human review
```

`LOWER_IS_BETTER` compares signed price impact by **absolute magnitude**. A business approval is never a
registration: `isRegisteredThreshold()` and `unlocksIntervention()` return literal `false`.

## 5. Assessment and lab

- `src/core/live-assessment.ts` — typed statements (OBSERVATION / INTERPRETATION / PROPOSAL /
  EXPECTED_EFFECT / MEASURED_RESULT), four separated categories, and `assertAssessmentLanguage()` which
  throws on any forbidden claim. A MEASURED_RESULT is structurally impossible until a post-intervention
  measurement exists **and** a named human has reviewed it.
- `src/core/improvement-lab.ts` — gaps A–D, four opportunities with next actions, the EXP-001 experiment
  view, eight evidence steps and the decision panel. It owns no gate logic; it reads `GovernanceState`.

## 6. UI

`src/ui/App.tsx` renders a fixed sidebar and the active screen. The sidebar is a three-part flex column:

```
.nav         flex column, height:100vh, overflow:hidden   (never scrolls)
  header     h1 + case line                               (fixed top)
  .nav-scroll  flex:1 1 auto; min-height:0; overflow-y:auto   (the only scrollbar)
  .freeze    flex:0 0 auto                                (fixed footer: research status + attribution)
```

`min-height: 0` is load-bearing: without it a flex child will not shrink below its content height, which is
why the footer previously scrolled out of view. Below 900px the layout stacks, the page scrolls, and both
`.nav` and `.nav-scroll` revert to `overflow: visible` so no nested scroller exists.

Shared UI state uses `useSyncExternalStore` singletons (`governance-state.ts`, `daily-state.ts`,
`live-state.ts`) so every card on a screen reflects the same persisted snapshot.

## 7. Conventions

- Tables that can exceed their container live inside `.scroll`; the page itself never scrolls horizontally.
- Timestamps are rendered from the **stored** ISO string by regex (`formatUtc`), never by constructing a
  `Date`, so no local-time conversion or clock read can occur. The zone is always labelled.
- `formatMeasured()` renders measured values at up to 8 fraction digits — truncation is a defect.
- Every new persisted shape gets: an integrity fingerprint, a load-time re-validation, and a test proving a
  tampered record is not accepted.
