# Week 2 — final report

Period ending **2026-10-02**. All figures below were produced by commands run on that date.

---

## 1. Verified state

```
npm test             575 passed (19 files)
npm run typecheck    0 errors
npm run build        success
npm run smoke        32/32 checks passed
npx playwright test  225 passed (18 files)
```

## 2. What was delivered

| # | Deliverable | Evidence |
|---|---|---|
| 1 | Historical research frozen as the reference layer | 8 root documents + 8 data modules, unchanged since 2026-09-30; SHA-256 recorded in the release checklist |
| 2 | Current SUT market-state evidence | Live Market Sync over 6 public, uncredentialed sources; every value identified by contract |
| 3 | Source-level evidence traceability | Per-metric panel: source, endpoint, both timestamps, sync ID, identity, contract, chain, venue/pair, HTTP status, SHA-256, methodology, limitation; raw response preserved |
| 4 | EXP-001 baseline from three real runs | RUN-001/002/003 at blocks 94,711,694 · 94,712,797 · 94,722,565 |
| 5 | Governance workflow | Registration → baseline approval → intervention → comparison → calculation → final review, all persisted and immutable |
| 6 | Business threshold decision remains human-controlled | Thresholds `PROPOSED — PENDING BUSINESS APPROVAL`; business approval is never a registration |
| 7 | Value Improvement Lab | 4 gaps, 4 opportunities, experiment view, 8 evidence steps, decision panel, next actions |
| 8 | No business result fabricated | Language guard + unit and browser tests asserting the absence of every prohibited claim |

## 3. Persistence and immutability

Four append-only stores, all behind one injectable `StoragePort`, all with integrity fingerprints
re-checked on read: business decision, governance, daily market reports, live market runs. A tampered record
is marked `TAMPERED` and excluded from every gate. `$100,000` can never be registered — it is refused on
write and stripped on read.

## 4. Live market evidence

Real scheduled runs executed this week, recorded immutably:

| Sync ID | Status | Values captured | Notes |
|---|---|---|---|
| `LMS-2026-10-01-001` | PARTIAL | 17 of 22 | 5/6 sources VALIDATED; CoinGecko `global` HTTP 429 |
| `LMS-2026-10-01-002` | PARTIAL | 11 of 22 | 3 CoinGecko endpoints rate-limited; recorded, never hidden |
| `LMS-2026-10-01-003` | PARTIAL | 17 of 22 | 5/6 sources VALIDATED |

v1 depends on **no credentialed API**. CoinMarketCap is deliberately deferred: it requires a key and
identifies by ticker only, which the frozen research records as collision-prone for "SUT".

## 5. Sidebar layout fix (final change of the week)

**Cause.** `.nav` was itself the scroll container and the footer relied on `margin-top: auto`, which only
pins while content is shorter than the container. With 19 nav items plus 4 layer labels the content exceeded
`100vh`, the auto margin collapsed, and the footer scrolled away with the list.

**Fix.** Three-part flex column: `.nav` never scrolls (`overflow: hidden`), the new `.nav-scroll`
(`flex:1 1 auto; min-height:0; overflow-y:auto`) is the only scroll region, and `.freeze` is a
`flex: 0 0 auto` footer outside it. Below 900px both revert to `overflow: visible` so the stacked layout has
no nested scroller.

**Verified.**

- Navigation list is independently scrollable; `.nav` itself has no scrollbar.
- Footer (research status + *Created & Idea by Magha Ram*) remains fixed and visible, and does not move when
  the list scrolls.
- No second sidebar scrollbar; no horizontal overflow at any tested size.
- Responsive behaviour verified at 1440×900, 1440×520, 1280×380 (zoomed), 1024×700 and 390×844.
- The last item (Settings) is reachable, clickable and sits above the footer.
- **9 focused sidebar tests added** (`e2e/sidebar.spec.ts`).
- **No business, research or governance logic changed** — CSS plus one wrapper `<div>`.

## 6. Defects found and fixed this week

| Defect | How it surfaced | Fix |
|---|---|---|
| Credential headers were never sent by the fetch adapter | Writing the CMC integration | Merge `s.headers` into the request; CMC then returned a real HTTP 401 for an invalid key |
| On-chain observation used the local clock as its data timestamp | Idempotency test failed | Use the **block** timestamp from `eth_getBlockByNumber` |
| `provides` labels did not match mapper field names | A failed source produced differently-named rows | Aligned the names |
| A failed global source was filed under the SUT symbol | Same test | Per-source fallback symbol |
| Transient `fetch failed` masked real results | Real cron run | One retry for thrown network errors only; an HTTP status is never retried |
| Evidence panel nested in a scrolling table hid the metric name | Screenshot review | Panels moved to full width below the table |
| Sidebar footer scrolled out of view | Reported with a layout sketch | The flex restructure above |

## 7. What is explicitly **not** claimed

- Thresholds are **NOT approved**.
- Intervention is **NOT executed**.
- Post-intervention result is **DATA UNAVAILABLE**.
- **No liquidity improvement** is claimed — May 2026 pool TVL was never measured (EV-901), so no
  time-aligned comparison is possible in either direction.
- **No adoption improvement** is claimed — no product telemetry is connected (H7/H8).
- **No Top-100 ranking improvement** is claimed — ranking is not calculated or predicted.

## 8. Outstanding business decision

Approve or revise the four EXP-001 measurement thresholds, then have a named human register them and approve
a baseline run. Until then the intervention gate stays closed and no result can exist. Three of the four lab
opportunities (OPP-L2, OPP-L3, OPP-L4) need no business approval and can progress immediately.
