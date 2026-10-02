# Git release checklist

Prepared **2026-10-02** and revised the same day to record the state as actually committed.

**Current state: 3 commits on `master`, 153 tracked files, no remote configured, nothing pushed.**
The verification, secret-scan, `work/` audit and fingerprint sections below are unchanged and were
re-verified against the committed tree.

---

## 0. Repository state — committed locally, never pushed

```
$ git log --oneline
<HEAD>   Add the final submission report and update the release checklist
baf21c8  Clarify Experiment Guide evidence wording
09ae3b4  Week 2: live market evidence, governance persistence and the Value Improvement Lab

$ git ls-files | wc -l
153

$ git remote -v
(no output — no remote is configured)
```

**3 commits on `master`. 153 tracked files, 3.6 MB. No remote configured. Nothing pushed.**

This document's own revision ships in the third commit alongside the submission PDF, so that
commit is the one hash not listed above. The repository history was created as follows:

| Commit | Contents |
|---|---|
| `09ae3b4` | Week 2 implementation — 152 files, +36,533 lines |
| `baf21c8` | Experiment Guide wording correction — 1 file, +12 −6 |
| `HEAD` | Submission PDF + this checklist revision — 2 files |

Pushing remains a maintainer decision; no remote has been added and no push has been attempted.

## 0a. Submission artifact

| Item | State |
|---|---|
| File | `SUT_Value_Forensics_Final_Comparison_and_Evidence_Report_v2.pdf` |
| Authoritative location | **repository root** — exactly one copy |
| Size | 81,805 bytes |
| SHA-256 | `d130fa2c01c7c879dbcec16275dbece5fe88bf391e07fc86b9702b27167cc062` |
| Tracked | yes — committed as the submission artifact |
| Contents | **unmodified**; the PDF was committed byte-for-byte as supplied |

A byte-identical duplicate previously sat under `SUT-Value-Forensics-Research-Handoff/`. Both copies
were verified to carry the SHA-256 above before the duplicate was removed, so a single authoritative
copy now exists and nothing unique was lost. `work/_report.txt` — the `pdftotext -layout` extraction
of the same PDF — was also removed: it was regenerable output, not evidence, and no source file or
test referenced it.

## 1. Secret scan — PASS

| Check | Result |
|---|---|
| `.env` files present | `.env.example` (template, safe to commit) and `.env.local` (**gitignored**) |
| `CMC_API_KEY` value in `.env.local` | **empty** — no key has been supplied in this environment |
| Key-like strings in `src/`, `scripts/`, `test/`, `e2e/`, `*.md` | **none** (the only match is the literal `TEST-PLACEHOLDER-NOT-A-REAL-KEY` in a test) |
| Credential in a URL, store, report or log | none — the key travels only in the `X-CMC_PRO_API_KEY` header |
| `VITE_*` credential | none; the env loader refuses any `VITE_`-prefixed variable with a warning |
| Persisted stores scanned for `api_key` / `authorization` / `Bearer` | clean (asserted by unit and browser tests) |

## 2. `.gitignore` coverage

```
.env  .env.*  !.env.example          # secrets; .env.local is never staged
node_modules/  dist/  dist-tsc/  .vite/
e2e/.artifacts/                      # Playwright failure artefacts
e2e/screenshots/                     # ~6 MB, regenerable by screenshots.spec.ts
__pycache__/  *.pyc                  # caches from the offline measurement scripts
work/*.json  work/*.out  work/*.err  # raw dumps and captures (section 3)
work/daily-market-store.json         # runtime store written by the cron entrypoint
!work/window.json  !work/exp002_week.json  !work/opp01_baseline.json
!work/opp01_feasibility.json  !work/pool_BUYS.json
!work/pool_SELLS_PROCEEDS.json  !work/c1_result.json
*.zip                                # the research handoff ships as loose files
```

The submission PDF at the repository root is **not** ignored — it is tracked deliberately as the
submission artifact (section 0a).

Excluded by size: `node_modules` 89 MB · `work/` raw dumps 8.3 MB · `e2e/screenshots` 6.0 MB ·
`dist-tsc` 1.5 MB · `work/daily-market-store.json` 884 KB · `dist` 620 KB.

Verified committed: 153 files, 3.6 MB. No `.env`, `.env.local`, `node_modules`, `dist`, screenshot,
test artefact, runtime store or large raw dump appears in the committed tree.

## 3. `work/` policy - audited and decided

`work/` holds the offline measurement scripts that produced the frozen evidence, their small computed
results, the research input transcripts, and large raw dumps. Every file was audited for whether any source
file or test depends on it.

**Dependency finding: no source file and no test imports, reads or requires any file under `work/`.** The
only reference anywhere in the codebase is `scripts/daily-sync.ts:67`, which uses
`work/daily-market-store.json` as the default **output** path for the cron entrypoint; the file is created
when absent, so its presence in the repository is never required.

### Committed (22 files, ~68 KB)

| File | Size | Type | Why committed |
|---|---|---|---|
| `bs_trace.py` | 1.7 KB | script | Buy/sell trace method |
| `buyside.py` | 1.3 KB | script | Buy-side aggregation method |
| `c1.py` | 4.3 KB | script | C1 procedure: LP mint/burn vs swap separation |
| `c1b.py` | 4.6 KB | script | C1 follow-up / C14 reconciliation |
| `chain.py` | 2.4 KB | script | RPC helpers, block/timestamp resolution |
| `exp002_pipeline.py` | 4.3 KB | script | EXP-002 weekly active-address pipeline |
| `feasibility.py` | 1.5 KB | script | One-sided inventory feasibility check |
| `hop3.py` | 1.5 KB | script | Hop-3 transfer tracing |
| `lp_concentration.py` | 1.5 KB | script | LP concentration measurement |
| `measure_opp01.py` | 3.7 KB | script | OPP-01 / EXP-001 baseline capture |
| `pool.py` | 1.8 KB | script | Pool state reads (slot0, liquidity, balances) |
| `trace.py` | 1.3 KB | script | Transfer tracing helper |
| `verify.ts` | 725 B | script | Ad-hoc verification helper |
| `PIP_Week_2_thesis.txt` | 8.2 KB | transcript | Extracted text of a research input PDF |
| `SUT_Coin_Detail_Research.txt` | 20 KB | transcript | Extracted text of a research input PDF |
| `window.json` | 56 B | computed result | The block window used by the May analysis |
| `exp002_week.json` | 251 B | computed result | EXP-002 weekly measurement output |
| `opp01_baseline.json` | 658 B | computed result | RUN-003 pool state at block 94,722,565 |
| `opp01_feasibility.json` | 440 B | computed result | Per-size fillability behind NOT EXECUTABLE |
| `pool_BUYS.json` | 816 B | computed result | Daily buy aggregates (C1 / C14) |
| `pool_SELLS_PROCEEDS.json` | 817 B | computed result | Daily sell-proceeds aggregates (C1 / C14) |
| `c1_result.json` | 5.2 KB | computed result | C1 reconciliation output |

The scripts are the **method** behind the frozen numbers; the seven small JSON files are the **computed
results** that those numbers were read from. Together they are ~68 KB and make the frozen evidence
reproducible.

### Ignored (7 files, ~8.3 MB)

| File | Size | Type | Why ignored |
|---|---|---|---|
| `HOP3_OUT_may.json` | 6.8 MB | raw dump | Raw hop-3 outbound transfer list; regenerable by `hop3.py` |
| `HOP3_sut_transfers.json` | 501 KB | raw dump | Raw transfer list; regenerable by `trace.py` |
| `DST_sut_transfers.json` | 64 KB | raw dump | Raw transfer list; regenerable |
| `pool_sellers_may.json` | 29 KB | raw dump | Raw per-seller rows; regenerable by `pool.py` |
| `HOP3_IN_may.json` | 6.4 KB | raw dump | Raw inbound transfer list; same category as the above |
| `buyside.out` | 2.4 KB | console capture | Printed form of `pool_BUYS.json`, which is committed |
| `trace.err` | 50 B | stderr capture | Noise from a script run |
| `daily-market-store.json` | 884 KB | runtime store | Written by the cron entrypoint; recreated when absent |
| `__pycache__/` | 12 KB | cache | Python bytecode |

**Why the large dumps are not committed:** they are intermediate raw inputs, not results. They are large
(8.3 MB, dominated by a single 6.8 MB file), they are regenerable from the committed scripts against the
same public chain data, and nothing in the application or the test suite reads them. Committing them would
add bulk to every clone without adding reproducibility that the scripts plus the committed results do not
already provide.

**How the raw evidence is preserved:** the files remain on disk in the working directory - nothing was
deleted. They are excluded from version control only. There is **no external archive or backup of these
files**; if they are needed beyond this machine, the maintainer must copy them somewhere deliberately or
regenerate them with the committed scripts.

**Dependency statement:** no source file or test requires any ignored `work/` file to exist.

### The `.gitignore` rules

```
work/*.json          work/*.out          work/*.err
!work/window.json    !work/exp002_week.json    !work/opp01_baseline.json
!work/opp01_feasibility.json   !work/pool_BUYS.json
!work/pool_SELLS_PROCEEDS.json !work/c1_result.json
```

To fall back to the blanket policy instead, delete the seven `!` negation lines; nothing in the application
or tests will break either way.

## 4. Frozen-layer fingerprints

Recorded so any later modification is detectable. SHA-256, first 16 hex characters:

| File | SHA-256 (prefix) |
|---|---|
| `THESIS.md` | `bfd3ed42bd7e8077` |
| `research-baseline.md` | `d6125fd7585d7317` |
| `research-freeze.md` | `aef5c16592b6f83a` |
| `research-change-log.md` | `7cce8e877dd0ec91` |
| `hypothesis-matrix.md` | `d0fe32802bb5121a` |
| `evidence-model.md` | `f4aab2882d34c944` |
| `data-source-contract.md` | `00ea3ffda7b86d96` |
| `may-2026-investigation-plan.md` | `73eb79e53a6509f1` |
| `src/data/hypotheses.ts` | `19b5ba2b65d568ac` |
| `src/data/evidence.ts` | `64aba2c6730ca4bc` |
| `src/data/timeline.ts` | `50da44239f7e2712` |
| `src/data/baseline-captures.ts` | `b7acbccd6d41843b` |
| `src/data/measurements.ts` | `f8834c6f87b3aa91` |
| `src/data/sources.ts` | `2977e4e0df623f4f` |
| `src/data/opportunities.ts` | `74226c7477006b68` |
| `src/data/experiment-runs.ts` | `c4386518148072ae` |
| `src/data/pre-registration.ts` | `0c096f689b001a93` |
| `src/data/governance.ts` | `f5eb263afc394fb5` |
| `src/data/proposed-thresholds.ts` | `4e9ad057499bb267` |

Re-verify at any time:

```bash
sha256sum THESIS.md src/data/hypotheses.ts src/data/evidence.ts src/data/baseline-captures.ts
```

## 5. Verification gate — all PASS (re-run 2026-10-02 against the committed tree)

```
npm test             575 passed (19 files)
npm run typecheck    0 errors
npm run build        success
npm run smoke        32/32 checks passed
npx playwright test  225 passed (18 files)
```

Run `npm run build` before `npx playwright test`: the Playwright project serves the built output from
the preview server, so a stale `dist/` fails the whole suite for reasons unrelated to the code.

## 6. Content review — complete

- [x] No credential, token or key in any tracked file
- [x] No fabricated measurement, approval, intervention or result
- [x] Frozen research and EXP-001 baselines unchanged
- [x] Proposed thresholds still `PROPOSED — PENDING BUSINESS APPROVAL`
- [x] No claim of liquidity, adoption, price or ranking improvement
- [x] Build output, `node_modules` and regenerable screenshots excluded
- [x] `work/` audited: scripts and small results committed, large raw dumps ignored (section 3)
- [x] Submission PDF committed at the repository root, single copy, contents unmodified (section 0a)
- [x] Commits created: 3 on `master`; 153 tracked files
- [x] **No remote configured; nothing pushed** — pushing remains a maintainer decision

## 7. Commit history

### `09ae3b4` — Week 2 implementation

```
Week 2: live market evidence, governance persistence and the Value Improvement Lab

Adds the CURRENT - SUT MARKET STATE layer (live market sync over six public,
uncredentialed sources with per-observation provenance and SHA-256 raw evidence),
persistence and immutability for the whole EXP-001 governance chain, the twelve-section
daily report, the SUT Value Improvement Lab, the Experiment Guide, and a cron entrypoint
sharing the same sync service. Fixes the sidebar so the navigation list scrolls inside its
own container while the research-status footer stays pinned.

The frozen research and the EXP-001 baselines are untouched. Business thresholds remain
PROPOSED - PENDING BUSINESS APPROVAL; no intervention has been executed and no measured
result exists. No liquidity, adoption, price or ranking improvement is claimed.

Verified: 575 unit tests, 225 Playwright tests, typecheck clean, build clean, smoke 32/32.
```

### `baf21c8` — Experiment Guide wording

```
Clarify Experiment Guide evidence wording
```

Changed "The validated mechanism" to "The supported mechanism", stated that the net sell imbalance
alone is not established as the cause, and marked the Step 6 intervention text as an example only.

### `HEAD` — submission artifact

```
Add the final submission report and update the release checklist
```

Adds the submission PDF at the repository root as the single authoritative copy and revises this
checklist to describe the committed state. No source file, test, frozen research file, EXP-001
baseline, governance record, live-market evidence record or measurement was touched.
