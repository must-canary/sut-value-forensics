/**
 * SUT Improvement Opportunities — derived ONLY from the frozen research.
 *
 * Every baseline number links to an evidence record in src/data/evidence.ts.
 * Anything not measured is `value: null` (DATA UNAVAILABLE) — never substituted
 * with a current-period figure standing in for a missing historical one.
 *
 * No opportunity claims that an intervention will raise price or market rank.
 * The measurable business mechanism is the target; price is not a KPI here.
 */
import type { Measure, Opportunity } from '../core/experiments'

const na = (unit: string, note: string, periodMismatch = false): Measure => ({
  value: null, unit, evidenceId: null, observationTime: null, note, periodMismatch,
})

const m = (
  value: number | string, unit: string, evidenceId: string, observationTime: string, note: string,
  periodMismatch = false,
): Measure => ({ value, unit, evidenceId, observationTime, note, periodMismatch })

export const OPPORTUNITIES: Opportunity[] = [
  // ══════════════════════════════════════════════════════════ 1. LIQUIDITY
  {
    id: 'OPP-01',
    category: 'Liquidity / market depth',
    title: 'Liquidity sensitivity — price response per unit of order flow',
    problem:
      'The market produced an extreme price response to a very small net directional imbalance. On 2026-05-17 a net sell imbalance of roughly $27,000 accompanied a −62.7% intraday move. This is a market-structure property, measurable independently of any price target.',
    evidence: {
      summary:
        'H2 SUPPORTED: depth exhaustion measured directly. Net imbalance $26,981 against −62.7%; net liquidity POSITIVE every crash day (+$15,911 / +$3,667 / +$3,053), so this was not LP withdrawal. Peer benchmark: volume/market-cap 0.11% vs a #90–#110 median of 12.4%.',
      evidenceIds: ['EV-010', 'EV-012', 'EV-013', 'EV-014'],
      hypothesisIds: ['H2'],
      strength: 'STRONG',
    },
    currentBaseline: [
      m(26981, 'USD', 'EV-010', '2026-05-17', 'Net sell imbalance accompanying a −62.7% intraday move'),
      m(91680.59, 'USD', 'EV-013', '2026-09-30', 'Main pool reserves — SEPTEMBER snapshot, not the event window', true),
      m('0.11% vs 12.4% peer median', 'ratio', 'EV-014', '2026-09-30', 'Volume / market cap vs #90–#110 band'),
      na('USD', 'May 2026 pool TVL — NEVER MEASURED (EV-901). Not substituted with the September figure.'),
      na('USD', 'Historical CEX order-book depth for May 2026 — unrecoverable (EV-902).'),
    ],
    missingOrWeak: [
      'May 2026 pool TVL was never measured — the depth denominator for the event is unknown',
      'Historical CEX order-book depth is unrecoverable from any public source',
      'Price-impact curves have never been computed for standardised order sizes',
    ],
    intervention:
      'Increase measurable usable depth on the main venue and publish the resulting market-structure metrics. Scope of the claim is limited to market structure; no price or rank outcome is asserted.',
    primaryKpi: {
      name: 'Price impact per standardised order size ($10K / $50K / $100K)',
      unit: 'percent',
      baseline: na('percent', 'Not yet computed. Requires reconstructed pool reserves per block — feasible on-chain going forward.'),
      successCriterion:
        'PRE-REGISTRATION REQUIRED — no numeric threshold has been registered for this experiment. ' +
        'The comparison method is fixed (same venue, same standardised sizes, same reserve-reconstruction ' +
        'method, compared against the immediately preceding baseline window), but the required magnitude of ' +
        'improvement has NOT been agreed. It must be registered BEFORE any comparison run, never chosen after ' +
        'seeing a result.',
      measurableToday: true,
    },
    secondaryKpis: [
      { name: 'Bid/ask spread (main venue)', unit: 'percent', baseline: na('percent', 'No historical spread series retained.'), successCriterion: 'Predefined narrowing versus the baseline window.', measurableToday: false },
      { name: 'Usable depth within ±2%', unit: 'USD', baseline: m('+$4,400 / −$12,000', 'USD', 'EV-902', '2026-09-29', 'Gate ±2% depth — SEPTEMBER snapshot; no May figure exists', true), successCriterion: 'Predefined increase versus the baseline window.', measurableToday: false },
      { name: 'Volume / usable-depth ratio', unit: 'ratio', baseline: na('ratio', 'Requires a depth series that does not yet exist.'), successCriterion: 'Predefined movement toward the peer-band range.', measurableToday: false },
      { name: 'Net liquidity change per day', unit: 'USD', baseline: m(15911, 'USD', 'EV-012', '2026-05-17', 'Net LP add/remove on the crash day — positive'), successCriterion: 'Stability or predefined growth across the measurement window.', measurableToday: true },
      { name: 'Liquidity concentration (beneficial LP owners)', unit: 'percent', baseline: na('percent', 'DATA UNAVAILABLE — probed 2026-09-30 (EV-131): all Mint events resolve to the Uniswap V3 NonfungiblePositionManager, so pool-level owner is not a beneficial owner. Requires NFPM position-NFT enumeration.'), successCriterion: 'PRE-REGISTRATION REQUIRED — and not measurable by the current method.', measurableToday: false },
    ],
    experimentPeriod: '30-day baseline → intervention → 60-day measurement',
    controlMethod:
      'Compare against BTC/ETH over the identical window (the control that rejected H1), and against the pool’s own preceding 30-day baseline. No cross-asset causal claim is drawn.',
    requiredData: [
      'Uniswap V3 pool reserves per block (reconstructable on-chain)',
      'Decoded Swap events (already available)',
      'Mint/Burn events (already available)',
      'CEX order-book snapshots — NOT retrievable historically; only obtainable prospectively',
    ],
    dependencies: ['Prospective depth capture must start before the intervention', 'Venue cooperation for order-book snapshots'],
    risks: [
      'Depth can be increased temporarily without durable effect — the measurement window must outlast the intervention',
      'A thin market can be moved cheaply, so metric movement is not evidence of durable improvement',
      'No price or rank outcome may be inferred from a market-structure improvement',
    ],
    evidenceRequiredBeforeExecution: [
      'A reconstructed pool-reserve series for the baseline window',
      'A stated, pre-registered success criterion per order size',
      'Confirmation that the measurement method matches the baseline method exactly',
    ],
    status: 'RUNNING',
    dataReadiness: 'PARTIAL',
    experimentReadiness: 'READY',
    experiment: {
      baseline: {
        description: 'Reconstruct pool reserves per block for 30 days and compute price-impact curves at $10K / $50K / $100K. BASELINE COLLECTION HAS STARTED — RUN-001 and RUN-002 captured 2026-09-30.',
        windowDays: 30,
        measures: [
          m(1147309, 'USD', 'EV-011', '2026-05-17/2026-05-18', 'Reference event-window swap volume (two-day aggregate)'),
          na('USD', 'Baseline pool TVL series — to be captured prospectively; the May figure is unrecoverable.'),
        ],
        blockers: ['No historical depth series exists; the baseline must be built forward from today'],
      },
      intervention: {
        description: 'Add and hold measurable usable depth on the main venue, disclosed publicly, for the full measurement window.',
        controlled: true,
        method: 'Single intervention, one venue, no other concurrent market activity by the operator.',
        whatIsHeldConstant: ['Venue set', 'Measurement method', 'Order sizes used for impact simulation', 'Reporting cadence'],
      },
      measurement: {
        windowDays: 60,
        method: 'Recompute price impact at the same standardised sizes, on the same venue, with the same reserve-reconstruction method.',
        controlMethod: 'BTC/ETH over the identical window plus the pool’s own preceding baseline.',
        dataRequired: ['Pool reserves per block', 'Decoded Swap events', 'Mint/Burn events'],
      },
      interpretation: {
        supportedIf: 'Simulated price impact falls by the pre-registered amount at every standardised size and holds through the measurement window.',
        rejectedIf: 'Price impact is unchanged, or improves only while the intervention is active and reverts afterwards.',
        inconclusiveIf: 'The depth series is incomplete, the method changed mid-window, or a confounding venue event occurred.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ══════════════════════════════════════════════════════ 2. UTILITY / USAGE
  {
    id: 'OPP-02',
    category: 'Real SUT utility and usage',
    title: 'Measured on-chain usage relative to the holder base',
    problem:
      'Activity is thin relative to the number of holders, and most platforms show little or no measurable usage. Usage is a chronic condition rather than a dated trigger, so it explains severity rather than timing — but it is measurable and improvable on its own terms.',
    evidence: {
      summary:
        'H7 INCONCLUSIVE (chronic precondition). CertiK: 1,580 active users / 7d against 54,052–56,241 holders ≈ 2.8% weekly activity. Platform reality: ZERO PLUS app 50+ downloads; AI Studio 48 and SUT GOLD Connect — no product found; L2U and NATURUBOOK run by other companies.',
      evidenceIds: ['EV-014'],
      hypothesisIds: ['H7', 'H8'],
      strength: 'MODERATE',
    },
    currentBaseline: [
      m(1580, 'active users / 7d', 'EV-014', '2026-09-30', 'CertiK-reported; methodology unpublished', true),
      m(5799, 'transactions / 7d', 'EV-014', '2026-09-30', 'CertiK-reported', true),
      na('count', 'SUT-denominated payment count — no source (EV-904).'),
      na('USD', 'SUT-denominated payment value — no source (EV-904).'),
    ],
    missingOrWeak: [
      'No payment-side data of any kind exists',
      'CertiK "active users" methodology is unpublished and cannot be reproduced',
      'All utility figures are Sept 2026 snapshots — no May 2026 utility measurement exists',
      'Company claims (2,000+ stores, 40,000+ members) are UNVERIFIED',
    ],
    intervention:
      'Publish a reproducible, on-chain-verifiable usage definition and report it on a fixed cadence, so usage becomes independently checkable rather than claimed.',
    primaryKpi: {
      name: 'Weekly active addresses transacting SUT (own reproducible definition)',
      unit: 'count',
      baseline: na('count', 'Not yet computed with our own definition. CertiK’s 1,580 uses an unpublished method and is not a reproducible baseline.'),
      successCriterion: 'Predefined growth in reproducibly-measured weekly active addresses across the measurement window, against the preceding baseline window.',
      measurableToday: true,
    },
    secondaryKpis: [
      { name: 'Weekly active addresses as % of holders', unit: 'percent', baseline: m('~2.8%', 'percent', 'EV-014', '2026-09-30', 'Derived from CertiK figures; method not reproducible', true), successCriterion: 'Predefined increase using our own definition.', measurableToday: true },
      { name: 'SUT transfer count / week', unit: 'count', baseline: m(5799, 'count', 'EV-014', '2026-09-30', 'CertiK 7d transactions', true), successCriterion: 'Predefined increase.', measurableToday: true },
      { name: 'Payment-associated transfers', unit: 'count', baseline: na('count', 'Cannot distinguish payments from other transfers without merchant address disclosure.'), successCriterion: 'Predefined increase once merchant addresses are published.', measurableToday: false },
    ],
    experimentPeriod: '30-day baseline → publication → 90-day measurement',
    controlMethod:
      'Compare against the same metric computed for the preceding equivalent window. No external comparator exists, so the control is temporal only — this is a stated weakness.',
    requiredData: ['Transfer logs (available)', 'Merchant address list (NOT available)', 'A published usage definition'],
    dependencies: ['Merchant address disclosure for the payment-side KPI'],
    risks: [
      'Distribution is not demand — tokens sent to users are supply reaching holders, not evidence anyone bought SUT for utility',
      'Active-address counts can be inflated by airdrop-style distribution; the definition must exclude pure fan-out receipts',
      'Temporal-only control cannot separate a general market effect from the intervention',
    ],
    evidenceRequiredBeforeExecution: [
      'A written, reproducible active-address definition',
      'Agreement that fan-out receipts are excluded from "active usage"',
    ],
    status: 'READY_FOR_EXPERIMENT',
    dataReadiness: 'PARTIAL',
    experimentReadiness: 'READY',
    experiment: {
      baseline: {
        description: 'Compute weekly active addresses and transfer counts from chain logs using a published definition, for 30 days.',
        windowDays: 30,
        measures: [na('count', 'To be computed with our own reproducible definition.')],
        blockers: ['Merchant addresses are undisclosed, so payment-side usage cannot be separated'],
      },
      intervention: {
        description: 'Publish the usage definition and report the metric on a fixed cadence with on-chain references.',
        controlled: false,
        method: 'Disclosure intervention; no market activity involved.',
        whatIsHeldConstant: ['Metric definition', 'Reporting cadence', 'Address-exclusion rules'],
      },
      measurement: {
        windowDays: 90,
        method: 'Recompute the same metric weekly using the identical definition.',
        controlMethod: 'Preceding equivalent window (temporal control only).',
        dataRequired: ['Transfer logs', 'Holder snapshots'],
      },
      interpretation: {
        supportedIf: 'Reproducibly-measured weekly active addresses grow by the pre-registered amount and the growth is not attributable to fan-out receipts.',
        rejectedIf: 'No change, or growth explained entirely by distribution receipts.',
        inconclusiveIf: 'The definition changed mid-window, or fan-out and organic activity cannot be separated.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═══════════════════════════════════════════════ 3. MERCHANT / ECOSYSTEM
  {
    id: 'OPP-03',
    category: 'Merchant / ecosystem activity',
    title: 'Verifiable merchant participation',
    problem:
      'Merchant participation is asserted but not verifiable. The main stated SUT benefit — a 30–50% fee discount — applies only to South Korean users of the operator’s own platforms, so the addressable surface is narrow and unmeasured.',
    evidence: {
      summary:
        'Company claims 2,000+ accepting stores and 40,000+ community members — both UNVERIFIED in the frozen research. No merchant count, payment count or payment value has ever been measured. H7 / H8 both turn on data that does not exist.',
      evidenceIds: ['EV-904'],
      hypothesisIds: ['H7', 'H8'],
      strength: 'WEAK',
    },
    currentBaseline: [
      na('count', 'Active merchants — company claim of 2,000+ is UNVERIFIED; no measured figure exists.'),
      na('count', 'Payment count — no source (EV-904).'),
      na('USD', 'Payment value — no source (EV-904).'),
    ],
    missingOrWeak: [
      'No verified merchant count exists at any date',
      'No payment count or value exists',
      'Merchant addresses are not published, so acceptance cannot be checked on-chain',
    ],
    intervention:
      'Publish a merchant registry with on-chain-resolvable receiving addresses, so acceptance and payment activity become independently verifiable.',
    primaryKpi: {
      name: 'Merchants with at least one verifiable on-chain SUT receipt in the period',
      unit: 'count',
      baseline: na('count', 'Zero measurable today — no merchant address list exists.'),
      successCriterion: 'Predefined count of registry merchants showing verifiable on-chain receipts during the measurement window.',
      measurableToday: false,
    },
    secondaryKpis: [
      { name: 'Verifiable SUT payment volume', unit: 'SUT', baseline: na('SUT', 'Unmeasurable without merchant addresses.'), successCriterion: 'Predefined verifiable volume.', measurableToday: false },
      { name: 'Repeat-payer addresses', unit: 'count', baseline: na('count', 'Unmeasurable without merchant addresses.'), successCriterion: 'Predefined repeat rate.', measurableToday: false },
      { name: 'Registry coverage vs claimed merchant count', unit: 'percent', baseline: na('percent', 'Claim is 2,000+ but unverified; coverage cannot be computed.'), successCriterion: 'Predefined share of claimed merchants present in the verifiable registry.', measurableToday: false },
    ],
    experimentPeriod: 'Registry publication → 90-day measurement',
    controlMethod: 'No control available. This is a disclosure experiment measured against its own pre-publication state (zero verifiable merchants).',
    requiredData: ['Merchant registry with receiving addresses (NOT available)', 'Transfer logs (available)'],
    dependencies: ['Company disclosure of merchant addresses — outside external reach'],
    risks: [
      'A registry can list merchants that never transact; the KPI must require an actual on-chain receipt',
      'Publishing addresses has privacy and commercial implications for merchants',
      'Verifiable receipts still do not establish that merchants retain or use SUT',
    ],
    evidenceRequiredBeforeExecution: ['A published merchant registry with resolvable addresses'],
    status: 'DATA_REQUIRED',
    dataReadiness: 'BLOCKED',
    experimentReadiness: 'BLOCKED',
    experiment: {
      baseline: {
        description: 'Pre-publication state: zero merchants have verifiable on-chain receiving addresses.',
        windowDays: 30,
        measures: [na('count', 'Verifiable merchants = not measurable; no registry exists.')],
        blockers: ['No merchant registry', 'No payment data of any kind'],
      },
      intervention: {
        description: 'Publish a merchant registry with on-chain-resolvable receiving addresses.',
        controlled: false,
        method: 'Disclosure intervention.',
        whatIsHeldConstant: ['Registry schema', 'Verification method'],
      },
      measurement: {
        windowDays: 90,
        method: 'Count registry merchants with at least one on-chain SUT receipt; sum verifiable payment volume.',
        controlMethod: 'Pre-publication state (zero verifiable).',
        dataRequired: ['Merchant registry', 'Transfer logs'],
      },
      interpretation: {
        supportedIf: 'A pre-registered number of registry merchants show verifiable on-chain receipts during the window.',
        rejectedIf: 'The registry is published but few or no merchants show verifiable receipts.',
        inconclusiveIf: 'The registry is partial, or receipts cannot be distinguished from internal transfers.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═════════════════════════════════════════ 4. EXCHANGE ACCESS
  {
    id: 'OPP-04',
    category: 'Exchange access and market participation',
    title: 'Venue concentration and access continuity',
    problem:
      'Trading is concentrated on a single venue after a sequence of access losses, which raises structural fragility. One candidate venue event in the crash window cannot be used at all because its token identity is unresolved.',
    evidence: {
      summary:
        'Gate TR delisted SUPERTRUST SUT/TRY effective 2026-04-01 (identity-verified); GOPAX terminated support in 2025; MEXC no longer trades SUT. ~58% of volume sits on Gate. H4 is INCONCLUSIVE and blocked on Q3 — the BitMart "withdrawal closed 2026-05-16" record remains IDENTITY NOT VERIFIED.',
      evidenceIds: ['EV-900', 'EV-902'],
      hypothesisIds: ['H4'],
      strength: 'MODERATE',
    },
    currentBaseline: [
      m('~58%', 'percent of volume', 'EV-902', '2026-09-29', 'Gate share of reported volume', true),
      m(4, 'active venues', 'EV-902', '2026-09-29', 'Gate, Uniswap V3, BingX, KuCoin', true),
      na('n/a', 'Per-venue volume for 2026-05-16..20 — never obtained.'),
      na('n/a', 'BitMart event identity — BLOCKED (Cloudflare 403). Either the missing catalyst or a false root cause at exactly the right date (EV-900).'),
    ],
    missingOrWeak: [
      'Per-venue volume for the event window was never obtained',
      'The BitMart record cannot be attributed to SuperTrust or excluded from it',
      'MEXC delisting date and notice were never found',
    ],
    intervention:
      'Reduce venue concentration by maintaining access across multiple identity-verified venues, and publish a venue register in which every listing is tied to the contract address.',
    primaryKpi: {
      name: 'Share of measured volume on the largest single venue',
      unit: 'percent',
      baseline: m('~58%', 'percent', 'EV-902', '2026-09-29', 'Gate share — September figure; no event-window split exists', true),
      successCriterion: 'Predefined reduction in single-venue concentration, measured with per-venue volume that is contract- or pair-verified.',
      measurableToday: false,
    },
    secondaryKpis: [
      { name: 'Count of identity-verified active venues', unit: 'count', baseline: m(4, 'count', 'EV-902', '2026-09-29', 'Active venues at the September snapshot', true), successCriterion: 'Predefined increase, each listing contract-verified.', measurableToday: true },
      { name: 'Venue events correctly attributed by contract', unit: 'percent', baseline: m('unresolved', 'status', 'EV-900', '2026-09-30', 'The BitMart record remains IDENTITY NOT VERIFIED'), successCriterion: '100% of venue events in the register carry contract-level identity.', measurableToday: true },
    ],
    experimentPeriod: 'Register publication → 90-day measurement',
    controlMethod: 'Temporal comparison against the preceding window. No cross-asset control is appropriate for venue structure.',
    requiredData: ['Per-venue volume with contract/pair identity', 'Exchange notices with contract-level identity'],
    dependencies: ['Q3 — BitMart identity resolution', 'Venue APIs exposing historical per-pair volume'],
    risks: [
      'Venue count can rise without usable depth — the count KPI alone is weak and must be read with OPP-01',
      'Adding venues does not imply any price or rank outcome',
      'Using the unresolved BitMart record would manufacture a false root cause at exactly the crash date',
    ],
    evidenceRequiredBeforeExecution: [
      'Q3 resolved, or the BitMart record formally excluded with the attempt documented',
      'Per-venue volume obtainable with contract or pair identity',
    ],
    status: 'DATA_REQUIRED',
    dataReadiness: 'BLOCKED',
    experimentReadiness: 'PARTIAL',
    experiment: {
      baseline: {
        description: 'Build a venue register in which every listing and delisting carries contract-level identity.',
        windowDays: 30,
        measures: [na('percent', 'Per-venue volume split for the event window — never obtained.')],
        blockers: ['Q3 BitMart identity unresolved', 'No historical per-venue volume'],
      },
      intervention: {
        description: 'Maintain access across multiple identity-verified venues and publish the register.',
        controlled: false,
        method: 'Disclosure plus listing continuity.',
        whatIsHeldConstant: ['Identity verification standard', 'Register schema'],
      },
      measurement: {
        windowDays: 90,
        method: 'Measure per-venue volume share where contract- or pair-verified data is obtainable.',
        controlMethod: 'Preceding equivalent window.',
        dataRequired: ['Per-venue volume', 'Venue notices with contract identity'],
      },
      interpretation: {
        supportedIf: 'Single-venue concentration falls by the pre-registered amount using identity-verified per-venue data.',
        rejectedIf: 'Concentration is unchanged, or new listings carry no measurable volume.',
        inconclusiveIf: 'Per-venue data remains unobtainable, or venue identity cannot be verified.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═══════════════════════════════════════════ 5. TOKEN VALUE CAPTURE
  {
    id: 'OPP-05',
    category: 'Token value capture',
    title: 'Whether distributed tokens are retained, spent, or sold',
    problem:
      'The measured on-chain function in the event window was distributing tokens to holders — roughly 1,000,000 SUT/day to ~16,607 addresses — rather than absorbing them. Whether recipients retain, spend or sell what they receive is the core value-capture question and is currently known only at a floor.',
    evidence: {
      summary:
        'H8 DATA UNAVAILABLE with the supply limb quantified. The chain terminates in 34,349 transfers to 16,607 distinct addresses (avg ~446 SUT). Direct-to-pool sell-through is 0.67% — a FLOOR only, excluding router- and CEX-mediated sales. 62% of distinct direct pool sellers were fan-out recipients.',
      evidenceIds: ['EV-021', 'EV-024'],
      hypothesisIds: ['H8', 'H3b'],
      strength: 'MODERATE',
    },
    currentBaseline: [
      m(34349, 'transfers', 'EV-021', '2026-05-01/2026-05-25', 'Fan-out transfers to 16,607 distinct addresses'),
      m(0.67, 'percent', 'EV-024', '2026-05-01/2026-05-25', 'Direct-to-pool sell-through — FLOOR ONLY, excludes router and CEX routes'),
    ],
    missingOrWeak: [
      'True sell-through is unmeasurable: aggregator-routed sales appear as the router address, and CEX sales are invisible on-chain',
      'Recipients’ reason for receiving SUT (reward, settlement, purchase, refund) is not determinable on-chain',
      'No ecosystem revenue or fee-capture data exists',
    ],
    intervention:
      'Publish the economic basis of distributions (what each payout is for) and the funding source of the discount, so value capture can be reasoned about rather than inferred from flow shape alone.',
    primaryKpi: {
      name: 'Recipient retention at 1 / 7 / 30 days after receipt',
      unit: 'percent',
      baseline: m(0.67, 'percent', 'EV-024', '2026-05-01/2026-05-25', 'Only the direct-to-pool floor is known; retention proper has never been computed'),
      successCriterion:
        'Predefined retention profile for a defined recipient cohort, reported with the explicit caveat that router- and CEX-mediated disposals are not observable.',
      measurableToday: true,
    },
    secondaryKpis: [
      { name: 'Share of recipients transacting in-ecosystem after receipt', unit: 'percent', baseline: na('percent', 'Requires merchant addresses (see OPP-03).'), successCriterion: 'Predefined in-ecosystem usage share.', measurableToday: false },
      { name: 'Distribution rate (SUT/day into retail addresses)', unit: 'SUT/day', baseline: m('~1,000,000', 'SUT/day', 'EV-021', '2026-05-01/2026-05-15', 'Measured distribution rate before the throttle'), successCriterion: 'Distribution rate reported alongside absorption, not in isolation.', measurableToday: true },
      { name: 'Ecosystem fee/revenue attributable to SUT', unit: 'USD', baseline: na('USD', 'No source (EV-904).'), successCriterion: 'Predefined measurable fee capture.', measurableToday: false },
    ],
    experimentPeriod: '30-day cohort definition → 90-day retention tracking',
    controlMethod:
      'Cohort comparison: recipients of a defined distribution tranche versus a prior tranche. No external control exists.',
    requiredData: ['Fan-out recipient addresses (available)', 'Transfer logs (available)', 'Merchant addresses (NOT available)', 'Router-level attribution (NOT obtainable)'],
    dependencies: ['OPP-03 merchant registry for the in-ecosystem limb'],
    risks: [
      'The headline retention figure will systematically overstate retention, because router- and CEX-mediated disposals are invisible — this must be stated wherever the number appears',
      'Cohort behaviour may reflect distribution design rather than genuine demand',
      'A retention improvement does not imply any price outcome',
    ],
    evidenceRequiredBeforeExecution: [
      'A defined, frozen recipient cohort',
      'Written acknowledgement that the resulting figure is an upper bound on retention',
    ],
    status: 'READY_FOR_EXPERIMENT',
    dataReadiness: 'PARTIAL',
    experimentReadiness: 'READY',
    experiment: {
      baseline: {
        description: 'Freeze a recipient cohort from the fan-out and compute direct disposal at 1/7/30 days.',
        windowDays: 30,
        measures: [m(0.67, 'percent', 'EV-024', '2026-05-01/2026-05-25', 'Known floor for the May cohort')],
        blockers: ['Router- and CEX-mediated disposals are not attributable — the result is an upper bound on retention'],
      },
      intervention: {
        description: 'Publish the economic basis and funding source of distributions.',
        controlled: false,
        method: 'Disclosure intervention.',
        whatIsHeldConstant: ['Cohort definition', 'Observation horizons (1/7/30 days)'],
      },
      measurement: {
        windowDays: 90,
        method: 'Track cohort balances and outbound transfers at fixed horizons.',
        controlMethod: 'Prior distribution tranche as a comparison cohort.',
        dataRequired: ['Transfer logs', 'Cohort address list'],
      },
      interpretation: {
        supportedIf: 'The measured retention profile meets the pre-registered target and the caveat about unobservable routes is carried with the result.',
        rejectedIf: 'Recipients dispose at or above the pre-registered threshold within the observation horizons.',
        inconclusiveIf: 'Cohort behaviour is dominated by addresses whose disposals cannot be attributed.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═════════════════════════════════════════ 6. HOLDER / DISTRIBUTION
  {
    id: 'OPP-06',
    category: 'Holder / distribution structure',
    title: 'Verifiable holdings structure and lock status',
    problem:
      'Concentration is high and the announced lock-up cannot be verified. No on-chain time-lock contract has been identified, and holding tokens in an externally-owned account is not a lock.',
    evidence: {
      summary:
        'Top-10 hold ~71% of supply (~50% excluding the dead address). CertiK reports a Major Holding Ratio of 54.25% — a DIFFERENT metric with unpublished methodology (conflict C6). The 50M in 0xbc0e5c…6144 may be the announced 2045 lock-up, but this is UNCONFIRMED (Q4), and no lock contract exists. GOPAX (Dec 2024) recorded a 90M/47.8% foundation holding, contradicting the "zero reserve" claim (C7).',
      evidenceIds: ['EV-051', 'EV-030'],
      hypothesisIds: ['H6', 'H3a'],
      strength: 'STRONG',
    },
    currentBaseline: [
      m('~71%', 'percent', 'EV-051', '2026-09-29', 'Top-10 by balance (our method, including the dead address)'),
      m(54.25, 'percent', 'EV-051', '2026-09-30', 'CertiK Major Holding Ratio — a DIFFERENT metric; never present as the same figure'),
      m(238403732, 'SUT', 'EV-030', '2026-09-30', 'Total supply, unchanged; minting unavailable'),
      na('SUT', 'Verifiably time-locked supply — NO on-chain lock contract identified (Q4).'),
    ],
    missingOrWeak: [
      'The 50M lock-up claim has no on-chain lock contract behind it',
      'No published wallet map identifies team, treasury or lock-up addresses',
      'Two different concentration metrics circulate and are easily conflated (C6)',
      'Three circulating-supply figures remain unreconciled (C3)',
    ],
    intervention:
      'Publish a wallet map identifying team, treasury and lock-up addresses, and move any claimed lock-up into a verifiable on-chain time-lock contract.',
    primaryKpi: {
      name: 'Supply held in a verifiable on-chain time-lock',
      unit: 'SUT',
      baseline: m(0, 'SUT', 'EV-030', '2026-09-30', 'No on-chain lock contract has been identified; EOA custody is not a lock'),
      successCriterion: 'A pre-registered quantity of SUT held in a public, independently verifiable time-lock contract for the stated duration.',
      measurableToday: true,
    },
    secondaryKpis: [
      { name: 'Top-10 concentration (our method, stated explicitly)', unit: 'percent', baseline: m('~71%', 'percent', 'EV-051', '2026-09-29', 'Including the dead address; ~50% excluding it'), successCriterion: 'Predefined reduction in free-float concentration, reported with the method stated.', measurableToday: true },
      { name: 'Labelled share of supply in a published wallet map', unit: 'percent', baseline: m(0, 'percent', 'EV-051', '2026-09-30', 'No wallet map exists; every large holder is unlabelled'), successCriterion: 'A pre-registered share of supply attributable to labelled, disclosed addresses.', measurableToday: true },
      { name: 'Circulating-supply figures in public circulation', unit: 'count', baseline: m(3, 'count', 'EV-030', '2026-09-30', '188.4M / 46.6M / 2.02M — conflict C3'), successCriterion: 'One reconciled, documented figure published consistently.', measurableToday: true },
    ],
    experimentPeriod: 'Disclosure → 90-day verification window',
    controlMethod: 'Self-comparison against the pre-disclosure state (zero verifiable locks, zero labelled supply).',
    requiredData: ['Holder snapshots (available)', 'Lock contract address (does not yet exist)', 'Published wallet map (does not yet exist)'],
    dependencies: ['Company disclosure of wallet roles'],
    risks: [
      'A published map is a claim until each address is independently checked on-chain',
      'Locking supply changes float, not demand — no price or rank outcome may be inferred',
      'Labelling a wallet without evidence would violate the frozen wallet-role rule; roles stay UNKNOWN until disclosed and verified',
    ],
    evidenceRequiredBeforeExecution: [
      'A deployed, verifiable time-lock contract address',
      'A wallet map whose entries can each be checked against chain state',
    ],
    status: 'READY_FOR_EXPERIMENT',
    dataReadiness: 'READY',
    experimentReadiness: 'READY',
    experiment: {
      baseline: {
        description: 'Snapshot holder distribution and record that zero supply is verifiably locked and zero supply is labelled.',
        windowDays: 30,
        measures: [
          m('~71%', 'percent', 'EV-051', '2026-09-29', 'Top-10 concentration, our method'),
          m(0, 'SUT', 'EV-030', '2026-09-30', 'Verifiably locked supply'),
        ],
        blockers: [],
      },
      intervention: {
        description: 'Publish a wallet map and move any claimed lock-up into a verifiable on-chain time-lock.',
        controlled: true,
        method: 'Disclosure plus an on-chain state change that can be independently checked.',
        whatIsHeldConstant: ['Concentration method', 'Snapshot cadence'],
      },
      measurement: {
        windowDays: 90,
        method: 'Verify the lock contract on-chain; recompute concentration with the same method; check every wallet-map entry against chain state.',
        controlMethod: 'Pre-disclosure state.',
        dataRequired: ['Holder snapshots', 'Lock contract state'],
      },
      interpretation: {
        supportedIf: 'The pre-registered quantity is verifiably locked on-chain and the wallet map reconciles against chain state.',
        rejectedIf: 'No lock contract is deployed, or map entries do not reconcile.',
        inconclusiveIf: 'A lock exists but its terms cannot be independently verified.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═════════════════════════════════════ 7. TRANSPARENCY / INFORMATION
  {
    id: 'OPP-07',
    category: 'Transparency / information quality',
    title: 'Public data correctness and identity hygiene',
    problem:
      'Public information about SUT is internally inconsistent, and a token-identity misattribution has already propagated — including into internally authored documents dated after the correction was published.',
    evidence: {
      summary:
        'H10 SUPPORTED as an active risk. Three circulating-supply figures (C3); provider volume divergence up to 4.2× (C4); CoinMarketCap displays a CertiK-labelled "3.7" that is not CertiK’s 74.23 score (C2); CertiK’s owner field is stale versus the 2026-07-20 renunciation (C9); ~11 dormant pools carry stale prices from $0.0894 to $1.2025; the BitMart/Sanity United misattribution recurred inside PIP_Week_2_thesis.pdf.',
      evidenceIds: ['EV-050', 'EV-900'],
      hypothesisIds: ['H10'],
      strength: 'STRONG',
    },
    currentBaseline: [
      m(3, 'conflicting figures', 'EV-030', '2026-09-30', 'Circulating supply: 188.4M / 46.6M / 2.02M (C3)'),
      m('up to 4.2x', 'ratio', 'EV-011', '2026-05-17', 'Provider volume divergence (C4)'),
      m(74.23, 'score', 'EV-050', '2026-09-30', 'CertiK Skynet — NOT CoinMarketCap’s "3.7" (C2); dynamic, was 74.06 on 2026-09-29'),
      m('unresolved', 'status', 'EV-900', '2026-09-30', 'BitMart record remains IDENTITY NOT VERIFIED'),
    ],
    missingOrWeak: [
      'No single reconciled circulating-supply figure is published',
      'Aggregator profiles carry stale or wrong fields that the project has not had corrected',
      'Corrections do not propagate — a retired claim reappeared in a newer internal document',
    ],
    intervention:
      'Run a data-correctness programme: reconcile and publish one supply figure, request corrections on each aggregator profile, and apply the contract-level identity gate to every internal and external document.',
    primaryKpi: {
      name: 'Count of open public data conflicts',
      unit: 'count',
      baseline: m(7, 'count', 'EV-030', '2026-09-30', 'Open unresolved conflicts in the register (C14 resolved; C15 and six others open)'),
      successCriterion: 'A pre-registered reduction in open conflicts, each closed with a documented methodological reason rather than by preference.',
      measurableToday: true,
    },
    secondaryKpis: [
      { name: 'Aggregator profiles carrying a correct, reconciled supply figure', unit: 'count', baseline: m(0, 'count', 'EV-030', '2026-09-30', 'No reconciled figure exists to publish yet'), successCriterion: 'Pre-registered number of profiles showing the reconciled figure.', measurableToday: true },
      { name: 'Documents passing the identity gate', unit: 'percent', baseline: m('recurrence observed', 'status', 'EV-900', '2026-09-30', 'A retired claim reappeared in a later internal document'), successCriterion: '100% of new documents pass the contract-level identity check before release.', measurableToday: true },
      { name: 'Stale external fields corrected', unit: 'count', baseline: m(2, 'count', 'EV-050', '2026-09-30', 'CertiK stale owner field (C9); CMC "3.7" mislabelled as a CertiK score (C2)'), successCriterion: 'Pre-registered number of stale fields corrected at source.', measurableToday: true },
    ],
    experimentPeriod: '30-day baseline → correction programme → 90-day re-audit',
    controlMethod: 'Self-comparison against the recorded conflict register at baseline. Each closure must state its methodological reason.',
    requiredData: ['Conflict register (available)', 'Aggregator profile states (observable)', 'Document identity-gate results (available)'],
    dependencies: ['Aggregator responsiveness to correction requests — outside direct control'],
    risks: [
      'Conflicts must be closed by evidence, never by choosing the most convenient figure',
      'A corrected aggregator field can silently revert; re-audit is required',
      'Better data quality is not a market outcome and must not be presented as one',
    ],
    evidenceRequiredBeforeExecution: [
      'A documented reconciliation of the three circulating-supply figures',
      'A written identity-gate procedure applied to internal documents',
    ],
    status: 'READY_FOR_EXPERIMENT',
    dataReadiness: 'READY',
    experimentReadiness: 'READY',
    experiment: {
      baseline: {
        description: 'Record the open-conflict register and the current state of each external profile field.',
        windowDays: 30,
        measures: [m(7, 'count', 'EV-030', '2026-09-30', 'Open unresolved conflicts at baseline')],
        blockers: [],
      },
      intervention: {
        description: 'Reconcile the supply figure, request source-level corrections, and gate every document on contract-level identity.',
        controlled: true,
        method: 'Disclosure and process intervention with a fixed audit checklist.',
        whatIsHeldConstant: ['Conflict-register schema', 'Identity-gate procedure', 'Audit checklist'],
      },
      measurement: {
        windowDays: 90,
        method: 'Re-audit the conflict register and each external profile field against the same checklist.',
        controlMethod: 'Baseline register state.',
        dataRequired: ['Conflict register', 'Aggregator profile snapshots'],
      },
      interpretation: {
        supportedIf: 'Open conflicts fall by the pre-registered amount, each closure carries a methodological reason, and no retired claim reappears.',
        rejectedIf: 'Conflicts persist, or corrections revert at source within the window.',
        inconclusiveIf: 'Aggregators do not respond, so correctness cannot be attributed to the programme.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },

  // ═══════════════════════════ 8. COMPANY / SUPERSAVE / SOLOPAY VISIBILITY
  {
    id: 'OPP-08',
    category: 'Company / SuperSave / SoloPay flow visibility',
    title: 'Settlement and platform flow visibility',
    problem:
      'The company-side economics that would explain distribution and settlement behaviour are entirely outside external reach, so an entire causal limb of the investigation cannot be tested at all.',
    evidence: {
      summary:
        'H5 DATA UNAVAILABLE — no access to SoloPay, SuperSave, production systems or settlement records. The 2026-03-30 "Short-Term SUT Value Surge Strategy" (60% credit lock, lower weekly settlement) is a documented announcement that has never been verified as executed on-chain. The measured fan-out is consistent with a payout system but this is evidence, not identification.',
      evidenceIds: ['EV-904', 'EV-021'],
      hypothesisIds: ['H5'],
      strength: 'ABSENT',
    },
    currentBaseline: [
      na('n/a', 'Settlement records — no access (EV-904).'),
      na('n/a', 'SuperSave balances and conversion volumes — no access.'),
      na('n/a', 'Buyback execution evidence — announced but never verified on-chain.'),
      m(34349, 'transfers', 'EV-021', '2026-05-01/2026-05-25', 'Fan-out shape is consistent with a payout system — evidence, NOT identification of a company wallet'),
    ],
    missingOrWeak: [
      'No settlement, balance or conversion data of any kind',
      'No published company wallet map, so no address can be attributed',
      'Announced interventions have never been verified as executed on-chain',
    ],
    intervention:
      'Publish company-controlled addresses and a settlement-flow summary so that announced mechanisms can be checked against chain state.',
    primaryKpi: {
      name: 'Announced mechanisms verifiable on-chain',
      unit: 'percent',
      baseline: m(0, 'percent', 'EV-904', '2026-09-30', 'No announced mechanism has been verified on-chain'),
      successCriterion: 'A pre-registered share of announced mechanisms (locks, buybacks, settlement changes) independently verifiable against chain state.',
      measurableToday: false,
    },
    secondaryKpis: [
      { name: 'Company-attributable addresses disclosed', unit: 'count', baseline: m(0, 'count', 'EV-904', '2026-09-30', 'No company wallet map exists; all roles remain UNKNOWN'), successCriterion: 'Pre-registered number of disclosed addresses that reconcile against chain state.', measurableToday: false },
      { name: 'Settlement volume reported and reconcilable', unit: 'USD', baseline: na('USD', 'No settlement data (EV-904).'), successCriterion: 'Reported settlement volume reconciles with on-chain flow within a stated tolerance.', measurableToday: false },
    ],
    experimentPeriod: 'Blocked — cannot be scheduled until disclosure occurs',
    controlMethod: 'Not applicable while no data exists.',
    requiredData: ['Settlement records', 'SuperSave balances and conversions', 'Company wallet map', 'Buyback execution records'],
    dependencies: ['Company disclosure — entirely outside external reach'],
    risks: [
      'Attributing any observed address to the company without disclosure would violate the frozen wallet-role rule',
      'A published map is a claim until each entry reconciles against chain state',
      'The fan-out’s resemblance to a payout system is suggestive only and must never be stated as identification',
    ],
    evidenceRequiredBeforeExecution: [
      'Company disclosure of addresses and settlement summaries',
      'A reconciliation method agreed before any figure is published',
    ],
    status: 'DATA_REQUIRED',
    dataReadiness: 'BLOCKED',
    experimentReadiness: 'BLOCKED',
    experiment: {
      baseline: {
        description: 'Pre-disclosure state: zero announced mechanisms are verifiable on-chain and zero addresses are attributable.',
        windowDays: 0,
        measures: [m(0, 'percent', 'EV-904', '2026-09-30', 'Verifiable announced mechanisms')],
        blockers: ['No access to any company system', 'No disclosed addresses', 'H5 cannot be tested from outside'],
      },
      intervention: {
        description: 'Publish company-controlled addresses and a settlement-flow summary.',
        controlled: false,
        method: 'Disclosure intervention — not schedulable externally.',
        whatIsHeldConstant: ['Reconciliation method', 'Reporting cadence'],
      },
      measurement: {
        windowDays: 90,
        method: 'Reconcile each disclosed address and reported settlement figure against chain state.',
        controlMethod: 'Pre-disclosure state.',
        dataRequired: ['Disclosed addresses', 'Settlement summaries', 'Transfer logs'],
      },
      interpretation: {
        supportedIf: 'A pre-registered share of announced mechanisms reconciles against chain state within the stated tolerance.',
        rejectedIf: 'Disclosed figures do not reconcile with chain state.',
        inconclusiveIf: 'Disclosure is partial, or addresses cannot be independently checked.',
        result: null,
        resultRecordedBy: null,
      },
    },
  },
]

export const OPPORTUNITY_BY_ID = new Map(OPPORTUNITIES.map((o) => [o.id, o]))
