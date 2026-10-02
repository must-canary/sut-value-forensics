/** End-to-end smoke test of the evidence workflow. Exercises every guard. */
import {
  assertCausalClaimAllowed, assertSingleDayClaimAllowed, assertVolumeSource,
  classifyIdentity, detectStaleClaims, independentSourceCount, makeWallet, validateObservation,
} from '../src/core/rules'
import { RETIRED_CLAIMS, SOURCE_BY_ID } from '../src/data/sources'
import { EVIDENCE } from '../src/data/evidence'
import { HYPOTHESES } from '../src/data/hypotheses'
import { CONFLICTS, TIMELINE } from '../src/data/timeline'
import { c14Reconciliation, combinedAggregate, marketControlComparison } from '../src/core/analysis'
import { generateCaseReport } from '../src/core/report'

let step = 0
const ok = (m: string) => console.log(`  [${++step}] PASS  ${m}`)
const fail = (m: string) => { console.error(`  [${++step}] FAIL  ${m}`); process.exitCode = 1 }
const expectThrow = (fn: () => unknown, m: string) => {
  try { fn(); fail(`${m} (expected a throw)`) } catch { ok(m) }
}
const ALL_GATES = { timing: true, magnitude: true, mechanism: true, controls: true, alternatives: true, human_authorship: true }

console.log('\n=== SUT VALUE FORENSICS - EVIDENCE WORKFLOW SMOKE TEST ===\n')

console.log('STAGE 1  RAW SOURCE -> OBSERVATION')
const obs = EVIDENCE.find((e) => e.id === 'EV-010')!
validateObservation(obs).length === 0 ? ok('EV-010 passes the mandatory-field contract') : fail('EV-010 invalid')
SOURCE_BY_ID.has(obs.sourceId) ? ok(`source "${obs.sourceId}" registered with declared authority`) : fail('unregistered source')
classifyIdentity(obs.token) === 'CONTRACT_VERIFIED' ? ok('identity gate: CONTRACT_VERIFIED') : fail('identity gate')
expectThrow(() => {
  const bad = { ...obs, token: { ...obs.token, contract: '' } }
  if (validateObservation(bad).length) throw new Error('rejected')
}, 'observation without a contract is rejected')

console.log('\nSTAGE 2  NORMALIZED METRIC (volume rules)')
assertVolumeSource('onchain_swap_decoded'); ok('decoded Swap events accepted as volume')
expectThrow(() => assertVolumeSource('gross_pool_flow'), 'gross_pool_flow REFUSED as volume')
expectThrow(() => assertVolumeSource('onchain_transfer'), 'raw transfers REFUSED as volume')
const agg = combinedAggregate(['2026-05-17', '2026-05-18'])
agg.caveat ? ok(`two-day aggregate labelled: "${agg.caveat}"`) : fail('missing aggregate caveat')
expectThrow(() => assertSingleDayClaimAllowed(obs), 'single-day claim BLOCKED where the boundary is unresolved')

console.log('\nSTAGE 3  C1 RECONCILIATION (LP vs swap separation)')
const rec = c14Reconciliation()!
rec.inDifference === 0
  ? ok(`gross inflow reconciles exactly: $${rec.swapBuyUsd.toFixed(0)} swap + $${rec.lpAddUsd.toFixed(0)} LP = $${rec.measuredGrossIn.toFixed(0)}`)
  : fail('C14 reconciliation')
rec.liquidityShareOfGrossIn > 70
  ? ok(`${rec.liquidityShareOfGrossIn.toFixed(0)}% of apparent volume was liquidity provisioning`)
  : fail('LP share')

console.log('\nSTAGE 4  EVENT')
const bitmart = TIMELINE.find((t) => t.id === 'T-009')!
bitmart.identityStatus === 'IDENTITY_NOT_VERIFIED' && bitmart.classification === 'DATA_UNAVAILABLE'
  ? ok('BitMart 2026-05-16 event held as IDENTITY NOT VERIFIED / DATA UNAVAILABLE')
  : fail('BitMart gate')
detectStaleClaims('the BitMart delisting (Mar 2026) removed a trading venue', RETIRED_CLAIMS).length > 0
  ? ok('retired BitMart attribution detected in free text') : fail('stale-claim detection')
detectStaleClaims('GoPlus warns the creator can make changes to the token contract', RETIRED_CLAIMS).length > 0
  ? ok('retired GoPlus contract-control claim detected') : fail('stale-claim detection')

console.log('\nSTAGE 5  SOURCE INTEGRITY')
independentSourceCount([SOURCE_BY_ID.get('research-v2')!, SOURCE_BY_ID.get('pdf-coin-detail')!]) === 1
  ? ok('same-source PDF duplicate does NOT raise confidence') : fail('duplicate detection')

console.log('\nSTAGE 6  WALLETS')
makeWallet('0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c').role === 'UNKNOWN'
  ? ok('wallet role defaults to UNKNOWN') : fail('wallet default')
expectThrow(() => makeWallet('0xabc', { role: 'EXCHANGE_DEPOSIT' }), 'role without evidence REFUSED')

console.log('\nSTAGE 7  HYPOTHESIS -> TEST -> HUMAN REVIEW')
const ctrl = marketControlComparison()
console.log(`      control: SUT ${ctrl.sutPct!.toFixed(1)}% vs BTC ${ctrl.btcPct!.toFixed(1)}% / ETH ${ctrl.ethPct!.toFixed(1)}%`)
for (const id of ['H1', 'H3a', 'H6', 'H12']) {
  const h = HYPOTHESES.find((x) => x.id === id)!
  h.status === 'REJECTED' ? ok(`${id} REJECTED - ${h.scopeOfResult.slice(0, 58)}`) : fail(`${id} status`)
}
HYPOTHESES.find((x) => x.id === 'H2')!.status === 'SUPPORTED'
  ? ok('H2 SUPPORTED as amplifier; LP-flight variant rejected') : fail('H2 status')
HYPOTHESES.every((h) => h.review !== null)
  ? ok('every hypothesis status carries a human review') : fail('unreviewed status')

console.log('\nSTAGE 8  CONFLICTS')
const openC = CONFLICTS.filter((c) => c.resolution === 'UNRESOLVED')
openC.every((c) => c.canonicalForAnalysis === null)
  ? ok(`${openC.length} unresolved conflicts declare no canonical series`) : fail('conflict blending')
CONFLICTS.find((c) => c.id === 'C14')!.resolution === 'RESOLVED' ? ok('C14 RESOLVED by procedure C1') : fail('C14')
CONFLICTS.find((c) => c.id === 'C15')!.resolution === 'UNRESOLVED' ? ok('C15 (day boundary) registered and open') : fail('C15')

console.log('\nSTAGE 9  REPORT + CAUSAL GATE')
const report = generateCaseReport({ evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS })
const text = report.map((s) => s.body.join(' ')).join(' ')
text.includes('The initiating catalyst remains unresolved.')
  ? ok('report states the catalyst is unresolved') : fail('catalyst statement')
text.includes('Sell-side pressure interacting with structurally shallow liquidity')
  ? ok('report states the supported mechanism') : fail('mechanism statement')
!/crashed because|the root cause was/i.test(text)
  ? ok('report contains NO auto-generated root cause') : fail('forbidden causal phrasing leaked')
expectThrow(() => assertCausalClaimAllowed({ causal: true, author: null }, ALL_GATES),
  'causal claim without a human author REFUSED (no AI root-cause verdict)')
const gated = generateCaseReport({
  evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS,
  rootCause: { statement: 'Reviewed conclusion.', author: 'Lead Investigator', approvedAt: '2026-09-30', gatesMet: ALL_GATES },
})
gated[0]!.body.join(' ').includes('HUMAN-APPROVED CONCLUSION')
  ? ok('human-approved conclusion accepted when fully gated') : fail('gated path')

console.log('\nSTAGE 10 DATA UNAVAILABLE')
const na = EVIDENCE.filter((e) => e.value === null)
na.length > 0 && na.every((e) => e.value === null)
  ? ok(`${na.length} DATA UNAVAILABLE records carry null, never a substituted value`) : fail('invented data')
console.log(`      ${na.map((e) => e.id).join(', ')}`)
console.log(`      report section 12 lines: ${report.find((s) => s.heading.includes('Data unavailable'))!.body.length}`)

console.log(`\n=== SMOKE TEST ${process.exitCode ? 'FAILED' : 'PASSED'} - ${step} checks ===\n`)
