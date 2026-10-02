# QA validation guide

Last full run: **2026-10-02**. Every command below was executed and passed.

## 1. The full gate

```bash
npm test             # 575 passed, 19 files
npm run typecheck    # 0 errors
npm run build        # success
npm run smoke        # 32/32 checks passed
npx playwright test  # 225 passed, 18 files
```

Playwright runs against the **built** output via `vite preview` on port 4173 with
`reuseExistingServer: true`. If a change does not appear in the browser tests, run `npm run build` first —
a stale `dist/` is the usual cause.

## 2. Unit suites (575 tests)

| File | Tests | What it proves |
|---|---|---|
| `forensics.test.ts` | 50 | Identity gate, volume-source guard, causal gate, DATA UNAVAILABLE discipline |
| `governance.test.ts` | 43 | The six-stage chain, absolute-magnitude comparison, refusals |
| `daily-sync.test.ts` | 40 | Source normalisation, provenance, missing data, idempotency |
| `pre-registration.test.ts` | 37 | Registration validity, immutability, derivation refusal |
| `baseline-ops.test.ts` | 37 | Capture provenance, coverage without backfill, reviewer identity |
| `experiment-runs.test.ts` | 36 | Lifecycle guards, no result without measurement or reviewer |
| `governance-store.test.ts` | 31 | Registration/approval persistence, versioning, tamper detection |
| `business-decision.test.ts` | 30 | Five decision states, approval requirements, `$100K` exclusion |
| `live-market-sync.test.ts` | 29 | Immutable runs, raw evidence, identity safety, comparison |
| `experiments.test.ts` | 28 | Opportunity model, no outcome promises |
| `live-assessment.test.ts` | 27 | Eight-section assessment, status discipline, language guards |
| `improvement-lab.test.ts` | 26 | Gaps, opportunities, experiment view, decision panel |
| `handoff.test.ts` | 26 | Registration and baseline-review drafting |
| `decision-store.test.ts` | 25 | Business decision persistence and integrity |
| `proposed-thresholds.test.ts` | 25 | Proposals never become registrations |
| `current-state.test.ts` | 24 | Layer separation, frozen-record protection |
| `experiment-01.test.ts` | 24 | EXP-001 captured values and feasibility |
| `cmc-integration.test.ts` | 23 | CMC configuration, identity, secret hygiene |
| `evidence-traceability.test.ts` | 14 | Per-metric provenance, timestamps, SHA-256 |

## 3. Browser suites (225 tests)

| File | Tests | Area |
|---|---|---|
| `app.spec.ts` | 32 | Every screen renders, nav wiring, no console errors |
| `experiments.spec.ts` | 21 | Experiment execution and detail |
| `baseline-ops.spec.ts` | 18 | Baseline operations |
| `improvement.spec.ts` | 16 | Backlog and opportunities |
| `responsive.spec.ts` | 15 | 1440 / 1024 / 390 overflow, clipping, chart collisions |
| `prereg.spec.ts` | 15 | Pre-registration screen |
| `handoff.spec.ts` | 15 | Registration and baseline-review handoff |
| `live-market.spec.ts` | 14 | Live sync, evidence panels, raw evidence, export |
| `daily-sync.spec.ts` | 13 | Daily report, twelve sections, candidate action |
| `improvement-lab.spec.ts` | 10 | The lab's eleven sections |
| `governance-persistence.spec.ts` | 10 | Registration and approval survive reload |
| `experiment-01.spec.ts` | 10 | EXP-001 detail |
| `business-decision.spec.ts` | 10 | Business decision workflow |
| `sidebar.spec.ts` | 9 | Scrollable nav, fixed footer, responsive |
| `proposed.spec.ts` | 7 | Proposed thresholds |
| `business-decision-persistence.spec.ts` | 6 | Decision persistence across reload |
| `screenshots.spec.ts` | 3 | QA screenshot capture |
| `netcheck.spec.ts` | 1 | No failed network requests on load |

## 4. What the tests deliberately do **not** do

- No test asserts a live market value. Every network call in a browser test is intercepted and answered with
  a controlled fixture; production behaviour is unchanged.
- No test fabricates a business approval, an intervention or a measured result to make a flow pass. Where a
  stage cannot proceed, the test asserts the gate.
- No test contains a real credential. `cmc-integration.test.ts` uses the literal
  `TEST-PLACEHOLDER-NOT-A-REAL-KEY`.

## 5. Manual verification checklist

1. **Sidebar** — shorten the window to ~500px tall. The nav list scrolls; the header stays at the top; the
   research status and *Created & Idea by Magha Ram* stay pinned at the bottom; there is no second scrollbar.
2. **Live sync** — Daily Market Sync → **Run Live Market Sync**. A sync ID `LMS-YYYY-MM-DD-NNN` appears,
   sources show HTTP status and SHA-256, unavailable fields show a reason, never zero.
3. **Evidence traceability** — open any metric's Evidence panel: source, endpoint, both timestamps in UTC,
   sync ID, identity, contract, chain, venue/pair, status, hash, methodology. **View Raw Evidence** shows the
   preserved response.
4. **Reload** — the run, its evidence and its timestamps are byte-identical after a browser reload.
5. **Governance** — Pre-Registration still shows `0 of 4`, intervention `BLOCKED`, result `NOT AVAILABLE`.
6. **Lab** — Value Improvement Lab shows four gaps, four opportunities, the observed baseline labelled
   *not a target*, thresholds `PROPOSED — PENDING BUSINESS APPROVAL`, and no buttons or inputs at all.

## 6. Running a real scheduled sync

```bash
npm run daily-sync
```

Writes to `work/daily-market-store.json` (gitignored). Expect `PARTIAL` runs: CoinGecko rate-limits free
endpoints, which is recorded as `HTTP 429 / ERROR` with a reason rather than hidden.

## 7. Known operational limitations

- CoinGecko publishes no market cap, circulating supply or rank for this contract — permanently
  DATA UNAVAILABLE from that source.
- DexScreener publishes no observation timestamp for a pair row; those rows are `freshness: UNKNOWN`.
- Browser storage is per-browser and per-device; the cron store is a separate file. They do not sync.
- `e2e/screenshots/` is regenerable and gitignored.
