/**
 * Governance-chain persistence: registration, baseline approval, intervention,
 * comparison, derived result and final review.
 *
 * Nothing here is app data. The comparison fixture below is a TEST FIXTURE used
 * to exercise the persistence path; no measured value is written into the
 * application's evidence, and the shipped app has no surface that creates one.
 */
import { describe, expect, it } from 'vitest'
import {
  activeRegistrations, approvalStatusFor, businessApprovalRegisters, checkRegistrationIntegrity,
  createExperimentVersion, derivedCalculation, effectiveApprovedRunIds, effectiveEntries,
  effectiveState, emptyGovernanceLedger, fingerprintRegistration, GOV_STORE_KEY, loadGovernanceLedger,
  MemoryStorage, persistenceAutoApproves, persistenceAutoRegisters, persistenceCreatesMeasurement,
  recordBaselineApproval, recordComparison, recordFinalReview, recordIntervention, registerThreshold,
  registrationHistory, saveGovernanceLedger,
  type GovernanceLedger,
} from '../src/core/governance-store'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS } from '../src/data/pre-registration'
import { BASELINE_FINGERPRINT } from '../src/data/governance'
import { KNOWN_EVIDENCE_IDS, baselineImpactValues, baselineRunIds } from '../src/data/governance-storage'
import { registrationSummary } from '../src/core/pre-registration'
import { CREATOR_ATTRIBUTION } from '../src/core/baseline-ops'

const T1 = '2026-10-01T09:00:00Z'
const T2 = '2026-10-01T10:00:00Z'
const T3 = '2026-10-02T10:00:00Z'

const SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']
const slotFor = (size: string) => PRE_REGISTRATION.find((e) => e.standardisedSize === size)!
const RUNS = baselineRunIds()

const proposal = (threshold: number, author = 'A. Human') => ({
  threshold, authorName: author, rationale: 'set from peer depth targets', independenceAttested: true,
})

function registerAll(ledger = emptyGovernanceLedger(), value = 8, author = 'A. Human'): GovernanceLedger {
  let l = ledger
  for (const size of SIZES) {
    const r = registerThreshold(l, slotFor(size), proposal(value, author),
      OBSERVED_BASELINE_IMPACTS[size] ?? [], T1)
    expect(r.problems, `${size}: ${r.problems.join('; ')}`).toEqual([])
    l = r.ledger
  }
  return l
}

function approveRun(ledger: GovernanceLedger, runId = 'RUN-001'): GovernanceLedger {
  const r = recordBaselineApproval(ledger,
    { runId, reviewer: 'B. Reviewer', action: 'APPROVE', note: 'capture accepted' }, RUNS, T2)
  expect(r.problems).toEqual([])
  return r.ledger
}

/** Round-trip through storage — what a browser reload actually does. */
function reload(l: GovernanceLedger): GovernanceLedger {
  const s = new MemoryStorage()
  saveGovernanceLedger(s, l)
  return loadGovernanceLedger(s)
}

describe('threshold registration persistence', () => {
  it('a registration survives a storage round-trip with all its metadata', () => {
    const back = reload(registerAll())
    const regs = activeRegistrations(back)
    expect(regs).toHaveLength(4)
    for (const r of regs) {
      expect(r.threshold).toBe(8)
      expect(r.authorName).toBe('A. Human')
      expect(r.rationale).toBe('set from peer depth targets')
      expect(r.independenceAttested).toBe(true)
      expect(r.registeredAt).toBe(T1)
      expect(r.experimentVersion).toBe('EXP-001/v1')
      expect(r.fingerprint).toMatch(/^TR-EXP-001\/v1-[0-9a-f]{8}$/)
      expect(r.integrity).toBe('OK')
    }
  })

  it('the restored state is REGISTERED, not AWAITING HUMAN ENTRY', () => {
    const entries = effectiveEntries(PRE_REGISTRATION, reload(registerAll()))
    const summary = registrationSummary(entries)
    expect(summary.registered).toBe(4)
    expect(summary.awaiting).toBe(0)
    expect(summary.complete).toBe(true)
    for (const e of entries.filter((x) => x.state !== 'NOT_REGISTERABLE')) {
      expect(e.state).toBe('REGISTERED')
      expect(e.successThreshold).toBe(8)
      expect(e.reviewerName).toBe('A. Human')
      expect(e.registrationTimestamp).toBe(T1)
      expect(e.attestedBy).toBe('A. Human')
    }
  })

  it('an empty or corrupt store yields no registration — never a silent one', () => {
    const s = new MemoryStorage()
    expect(loadGovernanceLedger(s).registrations).toHaveLength(0)
    s.setItem(GOV_STORE_KEY, 'not json')
    expect(loadGovernanceLedger(s).registrations).toHaveLength(0)
    s.setItem(GOV_STORE_KEY, JSON.stringify({ experimentId: 'OTHER', registrations: [], approvals: [] }))
    expect(loadGovernanceLedger(s).registrations).toHaveLength(0)
    expect(registrationSummary(effectiveEntries(PRE_REGISTRATION, loadGovernanceLedger(s))).registered).toBe(0)
  })

  it('every existing registration rule still applies', () => {
    const l = emptyGovernanceLedger()
    const slot = slotFor('$10,000 buy')
    const obs = OBSERVED_BASELINE_IMPACTS['$10,000 buy']!
    expect(registerThreshold(l, slot, { threshold: null, authorName: 'A', rationale: 'r', independenceAttested: true }, obs, T1)
      .problems.join(' ')).toMatch(/numeric threshold is required/)
    expect(registerThreshold(l, slot, proposal(8, ''), obs, T1)
      .problems.join(' ')).toMatch(/named human author is required/)
    expect(registerThreshold(l, slot, { ...proposal(8), rationale: '' }, obs, T1)
      .problems.join(' ')).toMatch(/written rationale is required/)
    expect(registerThreshold(l, slot, { ...proposal(8), independenceAttested: false }, obs, T1)
      .problems.join(' ')).toMatch(/selected independently/)
    expect(registerThreshold(l, slot, proposal(10.59), obs, T1)
      .problems.join(' ')).toMatch(/matches an observed baseline value/)
  })

  it('the creator attribution cannot register unless explicitly configured', () => {
    const r = registerThreshold(emptyGovernanceLedger(), slotFor('$10,000 buy'),
      proposal(8, CREATOR_ATTRIBUTION), OBSERVED_BASELINE_IMPACTS['$10,000 buy']!, T1)
    expect(r.problems.join(' ')).toMatch(/creator attribution must not be used/)
    expect(r.ledger.registrations).toHaveLength(0)
    const configured = registerThreshold(emptyGovernanceLedger(), slotFor('$10,000 buy'),
      proposal(8, CREATOR_ATTRIBUTION), OBSERVED_BASELINE_IMPACTS['$10,000 buy']!, T1, [CREATOR_ATTRIBUTION])
    expect(configured.problems).toEqual([])
  })

  it('a registered slot is immutable — re-registering is refused after reload', () => {
    const back = reload(registerAll())
    const again = registerThreshold(back, slotFor('$10,000 buy'), proposal(5, 'C. Other'),
      OBSERVED_BASELINE_IMPACTS['$10,000 buy']!, T3)
    expect(again.problems.join(' ')).toMatch(/already registered and is immutable/)
    expect(activeRegistrations(again.ledger)).toHaveLength(4)
    expect(activeRegistrations(again.ledger).every((r) => r.threshold === 8)).toBe(true)
  })

  it('$100K can never be registered, and an injected record is stripped on load', () => {
    const notReg = PRE_REGISTRATION.find((e) => e.state === 'NOT_REGISTERABLE')!
    const r = registerThreshold(emptyGovernanceLedger(), notReg, proposal(50), [], T1)
    expect(r.problems.join(' ')).toMatch(/NOT REGISTERABLE/)

    const s = new MemoryStorage()
    saveGovernanceLedger(s, registerAll())
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.registrations.push({
      ...raw.registrations[0]!, standardisedSize: '$100,000 (both sides)', threshold: 50,
    })
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    const back = loadGovernanceLedger(s)
    expect(back.registrations.map((x) => x.standardisedSize)).toEqual(SIZES)
    const entry = effectiveEntries(PRE_REGISTRATION, back).find((e) => e.standardisedSize === '$100,000 (both sides)')!
    expect(entry.state).toBe('NOT_REGISTERABLE')
    expect(entry.successThreshold).toBeNull()
  })
})

describe('registration integrity — stored bytes are not proof', () => {
  it('an edited threshold is TAMPERED and does not count as registered', () => {
    const s = new MemoryStorage()
    saveGovernanceLedger(s, registerAll())
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.registrations[0]!.threshold = 99
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    const back = loadGovernanceLedger(s)
    expect(back.registrations[0]!.integrity).toBe('TAMPERED')
    expect(activeRegistrations(back)).toHaveLength(3)
    const eff = effectiveState(back, PRE_REGISTRATION)
    expect(eff.state.thresholdsComplete).toBe(false)
    expect(eff.gate).toBe('THRESHOLDS_PENDING')
    expect(eff.tampered.join(' ')).toContain('$10,000 buy')
  })

  it('an edited author is TAMPERED', () => {
    const s = new MemoryStorage()
    saveGovernanceLedger(s, registerAll())
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.registrations[1]!.authorName = 'Someone Else'
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    expect(loadGovernanceLedger(s).registrations[1]!.integrity).toBe('TAMPERED')
  })

  it('an untouched record checks out and its fingerprint is stable', () => {
    const back = reload(registerAll())
    for (const r of back.registrations) {
      expect(checkRegistrationIntegrity(r)).toBe('OK')
      expect(fingerprintRegistration(r)).toBe(r.fingerprint)
    }
  })
})

describe('registration audit history and versioning', () => {
  it('a new experiment version preserves v1 and requires registration again', () => {
    const v1 = reload(registerAll(emptyGovernanceLedger(), 8))
    const bumped = createExperimentVersion(v1, SIZES, T3)
    expect(bumped.problems).toEqual([])
    expect(bumped.record).toBe('EXP-001/v2')
    const v2 = reload(bumped.ledger)

    expect(v2.activeVersion).toBe('EXP-001/v2')
    expect(v2.registrations).toHaveLength(4)                 // v1 records retained
    expect(activeRegistrations(v2)).toHaveLength(0)          // none registered in v2
    expect(registrationSummary(effectiveEntries(PRE_REGISTRATION, v2)).awaiting).toBe(4)
    expect(effectiveState(v2, PRE_REGISTRATION).gate).toBe('THRESHOLDS_PENDING')

    const v2full = reload(registerAll(v2, 7, 'D. Second'))
    const history = registrationHistory(v2full)
    expect(history).toHaveLength(8)
    const v1rows = history.filter((h) => h.experimentVersion === 'EXP-001/v1')
    expect(v1rows.every((h) => h.threshold === 8 && h.authorName === 'A. Human')).toBe(true)
    expect(v1rows.every((h) => h.status === 'SUPERSEDED VERSION')).toBe(true)
    const v2rows = history.filter((h) => h.experimentVersion === 'EXP-001/v2')
    expect(v2rows.every((h) => h.threshold === 7 && h.status === 'REGISTERED')).toBe(true)
    expect(new Set(history.map((h) => h.fingerprint)).size).toBe(8)
  })

  it('a new version is refused while the current one is incomplete', () => {
    const partial = registerThreshold(emptyGovernanceLedger(), slotFor('$10,000 buy'), proposal(8),
      OBSERVED_BASELINE_IMPACTS['$10,000 buy']!, T1).ledger
    expect(createExperimentVersion(partial, SIZES, T3).problems.join(' ')).toMatch(/not fully registered/)
  })

  it('history rows carry author, timestamp, fingerprint and integrity', () => {
    const h = registrationHistory(reload(registerAll()))
    expect(h).toHaveLength(4)
    for (const row of h) {
      expect(row.authorName).toBeTruthy()
      expect(row.registeredAt).toBe(T1)
      expect(row.fingerprint).toBeTruthy()
      expect(row.integrity).toBe('OK')
      expect(row.status).toBe('REGISTERED')
    }
  })
})

describe('baseline approval persistence', () => {
  it('an approval survives a round-trip and opens the next gate', () => {
    const back = reload(approveRun(registerAll()))
    expect(back.approvals).toHaveLength(1)
    const a = back.approvals[0]!
    expect(a.runId).toBe('RUN-001')
    expect(a.reviewer).toBe('B. Reviewer')
    expect(a.action).toBe('APPROVE')
    expect(a.at).toBe(T2)
    expect(a.integrity).toBe('OK')
    expect(effectiveApprovedRunIds(back)).toEqual(['RUN-001'])
    expect(approvalStatusFor(back, 'RUN-001')).toBe('APPROVED')
    expect(approvalStatusFor(back, 'RUN-002')).toBe('PENDING')
    expect(effectiveState(back, PRE_REGISTRATION).gate).toBe('INTERVENTION_PENDING')
  })

  it('the existing approval rules still apply', () => {
    const l = registerAll()
    expect(recordBaselineApproval(l, { runId: 'RUN-999', reviewer: 'R', action: 'APPROVE', note: '' }, RUNS, T2)
      .problems.join(' ')).toMatch(/unknown run/)
    expect(recordBaselineApproval(l, { runId: 'RUN-001', reviewer: '', action: 'APPROVE', note: '' }, RUNS, T2)
      .problems.join(' ')).toMatch(/approval is never automatic/)
    expect(recordBaselineApproval(l, { runId: 'RUN-001', reviewer: 'R', action: 'REJECT', note: '' }, RUNS, T2)
      .problems.join(' ')).toMatch(/rejection requires a stated reason/)
    expect(recordBaselineApproval(l, { runId: 'RUN-001', reviewer: CREATOR_ATTRIBUTION, action: 'APPROVE', note: '' }, RUNS, T2)
      .problems.join(' ')).toMatch(/creator attribution/)
  })

  it('a recorded review is immutable for the active version', () => {
    const back = reload(approveRun(registerAll()))
    const again = recordBaselineApproval(back,
      { runId: 'RUN-001', reviewer: 'C. Other', action: 'REJECT', note: 'changed my mind' }, RUNS, T3)
    expect(again.problems.join(' ')).toMatch(/already carries a recorded review/)
    expect(reload(again.ledger).approvals).toHaveLength(1)
  })

  it('a tampered approval is excluded and the gate closes again', () => {
    const s = new MemoryStorage()
    saveGovernanceLedger(s, approveRun(registerAll()))
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.approvals[0]!.action = 'APPROVE'
    raw.approvals[0]!.reviewer = 'Not The Reviewer'
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    const back = loadGovernanceLedger(s)
    expect(approvalStatusFor(back, 'RUN-001')).toBe('TAMPERED')
    expect(effectiveApprovedRunIds(back)).toEqual([])
    expect(effectiveState(back, PRE_REGISTRATION).gate).toBe('BASELINE_APPROVAL_PENDING')
  })

  it('a rejection does not approve', () => {
    const l = recordBaselineApproval(registerAll(),
      { runId: 'RUN-002', reviewer: 'B. Reviewer', action: 'REJECT', note: 'inventory shifted mid-capture' },
      RUNS, T2).ledger
    const back = reload(l)
    expect(approvalStatusFor(back, 'RUN-002')).toBe('REJECTED')
    expect(effectiveApprovedRunIds(back)).toEqual([])
    expect(effectiveState(back, PRE_REGISTRATION).gate).toBe('BASELINE_APPROVAL_PENDING')
  })
})

describe('intervention persistence', () => {
  const good = {
    description: 'Disclosed depth addition to the SUT/USDT pool',
    baselineRunId: 'RUN-001',
    startedAt: '2026-10-03T00:00:00Z',
    endedAt: null,
    recordedBy: 'E. Operator',
    methodFingerprint: BASELINE_FINGERPRINT,
    heldConstant: ['measurement method'],
    evidenceIds: ['EV-100'],
  }
  const ctx = {
    thresholdsComplete: true, baselineFingerprint: BASELINE_FINGERPRINT, knownEvidenceIds: KNOWN_EVIDENCE_IDS,
  }

  it('is refused before thresholds and baseline approval', () => {
    const empty = emptyGovernanceLedger()
    const r = recordIntervention(empty, good,
      { ...ctx, thresholdsComplete: false }, T3)
    expect(r.problems.join(' ')).toMatch(/thresholds must be registered/)
    expect(r.problems.join(' ')).toMatch(/approved baseline run must be named/)
    expect(r.ledger.intervention).toBeNull()
  })

  it('refuses evidence the project does not hold', () => {
    const l = approveRun(registerAll())
    const r = recordIntervention(l, { ...good, evidenceIds: ['EV-999999'] }, ctx, T3)
    expect(r.problems.join(' ')).toMatch(/unknown evidence reference/)
    expect(r.ledger.intervention).toBeNull()
  })

  it('refuses a changed measurement method', () => {
    const l = approveRun(registerAll())
    const r = recordIntervention(l, { ...good, methodFingerprint: 'something-else' }, ctx, T3)
    expect(r.problems.join(' ')).toMatch(/method fingerprint unchanged/)
  })

  it('survives a round-trip once both gates are open, and is immutable', () => {
    const l = recordIntervention(approveRun(registerAll()), good, ctx, T3)
    expect(l.problems).toEqual([])
    const back = reload(l.ledger)
    expect(back.intervention?.recordedBy).toBe('E. Operator')
    expect(back.intervention?.baselineRunId).toBe('RUN-001')
    expect(back.intervention?.startedAt).toBe('2026-10-03T00:00:00Z')
    expect(back.intervention?.methodFingerprint).toBe(BASELINE_FINGERPRINT)
    expect(back.intervention?.evidenceIds).toEqual(['EV-100'])
    expect(back.intervention?.integrity).toBe('OK')
    expect(effectiveState(back, PRE_REGISTRATION).gate).toBe('COMPARISON_PENDING')
    expect(recordIntervention(back, good, ctx, T3).problems.join(' ')).toMatch(/already recorded and is immutable/)
  })

  it('a tampered intervention is excluded from the gate', () => {
    const s = new MemoryStorage()
    saveGovernanceLedger(s, recordIntervention(approveRun(registerAll()), good, ctx, T3).ledger)
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.intervention!.description = 'something else entirely'
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    const back = loadGovernanceLedger(s)
    expect(back.intervention?.integrity).toBe('TAMPERED')
    expect(effectiveState(back, PRE_REGISTRATION).state.intervention).toBeNull()
    expect(effectiveState(back, PRE_REGISTRATION).gate).toBe('INTERVENTION_PENDING')
  })
})

describe('comparison, derived result and final review', () => {
  const iv = {
    description: 'Disclosed depth addition', baselineRunId: 'RUN-001',
    startedAt: '2026-10-03T00:00:00Z', endedAt: null, recordedBy: 'E. Operator',
    methodFingerprint: BASELINE_FINGERPRINT, heldConstant: ['measurement method'], evidenceIds: ['EV-100'],
  }
  const ctx = { thresholdsComplete: true, baselineFingerprint: BASELINE_FINGERPRINT, knownEvidenceIds: KNOWN_EVIDENCE_IDS }
  const ready = () => recordIntervention(approveRun(registerAll()), iv, ctx, T3).ledger

  // TEST FIXTURE ONLY — not application data, and the app has no surface that can create it.
  const fixtureReadings = [
    { standardisedSize: '$10,000 buy', value: 6, notExecutable: false, evidenceId: 'EV-104' },
    { standardisedSize: '$10,000 sell', value: -6, notExecutable: false, evidenceId: 'EV-105' },
    { standardisedSize: '$50,000 buy', value: 30, notExecutable: false, evidenceId: 'EV-106' },
    { standardisedSize: '$50,000 sell', value: -20, notExecutable: false, evidenceId: 'EV-107' },
  ]
  const capture = {
    runId: 'CMP-001', capturedAt: '2026-11-03T00:00:00Z', blockNumber: 1,
    methodFingerprint: BASELINE_FINGERPRINT, readings: fixtureReadings,
    measurementSource: 'off-chain measured run (test fixture)',
  }

  it('a comparison is refused without an intervention, a source or real evidence', () => {
    expect(recordComparison(registerAll(), capture, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3)
      .problems.join(' ')).toMatch(/no intervention has been recorded/)
    expect(recordComparison(ready(), { ...capture, measurementSource: '' }, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3)
      .problems.join(' ')).toMatch(/measurement source is required/)
    expect(recordComparison(ready(), {
      ...capture,
      readings: [{ standardisedSize: '$10,000 buy', value: 6, notExecutable: false, evidenceId: 'EV-999999' }],
    }, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3).problems.join(' ')).toMatch(/unknown evidence reference/)
    expect(recordComparison(ready(), { ...capture, methodFingerprint: 'other' }, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3)
      .problems.join(' ')).toMatch(/not comparable/)
  })

  it('a captured comparison survives a round-trip', () => {
    const r = recordComparison(ready(), capture, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3)
    expect(r.problems).toEqual([])
    const back = reload(r.ledger)
    expect(back.comparison?.runId).toBe('CMP-001')
    expect(back.comparison?.measurementSource).toContain('off-chain measured run')
    expect(back.comparison?.readings).toHaveLength(4)
    expect(back.comparison?.integrity).toBe('OK')
  })

  it('the result is derived from persisted inputs, never stored or typed', () => {
    const back = reload(recordComparison(ready(), capture, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3).ledger)
    expect(JSON.stringify(back)).not.toContain('provisionalResult')
    const baseline = baselineImpactValues('RUN-001')
    const entries = effectiveEntries(PRE_REGISTRATION, back)
    const { perKpi, calculation } = derivedCalculation(back, entries, baseline)
    expect(calculation).not.toBeNull()
    expect(perKpi).toHaveLength(4)
    const sell = perKpi.find((k) => k.standardisedSize === '$10,000 sell')!
    expect(sell.baselineValue).toBe(-9.57)                 // RUN-001 measured value
    expect(sell.comparisonMagnitude).toBe(6)               // compared by ABSOLUTE magnitude
    expect(sell.outcome).toBe('MET')                       // |6| <= 8
    const buy50 = perKpi.find((k) => k.standardisedSize === '$50,000 buy')!
    expect(buy50.outcome).toBe('NOT_MET')                  // |30| > 8
    expect(calculation!.provisionalResult).toBe('INCONCLUSIVE')
    expect(calculation!.rationale).toContain('Provisional only')
  })

  it('a tampered comparison produces no result at all', () => {
    const s = new MemoryStorage()
    saveGovernanceLedger(s, recordComparison(ready(), capture, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3).ledger)
    const raw = JSON.parse(s.getItem(GOV_STORE_KEY)!) as GovernanceLedger
    raw.comparison!.readings[0]!.value = -99
    s.setItem(GOV_STORE_KEY, JSON.stringify(raw))
    const back = loadGovernanceLedger(s)
    expect(back.comparison?.integrity).toBe('TAMPERED')
    const eff = effectiveState(back, PRE_REGISTRATION, baselineImpactValues('RUN-001'))
    expect(eff.state.calculation).toBeNull()
    expect(eff.gate).toBe('COMPARISON_PENDING')
  })

  it('a final review is refused without a calculated result and survives once recorded', () => {
    const measured = recordComparison(ready(), capture, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }, T3).ledger
    const noCalc = recordFinalReview(measured,
      { reviewer: 'F. Final', at: T3, result: 'INCONCLUSIVE', note: 'reviewed', evidenceIds: ['EV-100'] },
      null, { knownEvidenceIds: KNOWN_EVIDENCE_IDS })
    expect(noCalc.problems.join(' ')).toMatch(/no result has been calculated/)

    const { calculation } = derivedCalculation(measured, effectiveEntries(PRE_REGISTRATION, measured),
      baselineImpactValues('RUN-001'))
    expect(recordFinalReview(measured,
      { reviewer: CREATOR_ATTRIBUTION, at: T3, result: 'INCONCLUSIVE', note: 'n', evidenceIds: ['EV-100'] },
      calculation, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }).problems.join(' ')).toMatch(/creator attribution/)
    expect(recordFinalReview(measured,
      { reviewer: 'F. Final', at: T3, result: 'INCONCLUSIVE', note: 'n', evidenceIds: [] },
      calculation, { knownEvidenceIds: KNOWN_EVIDENCE_IDS }).problems.join(' ')).toMatch(/link to evidence/)

    const r = recordFinalReview(measured,
      { reviewer: 'F. Final', at: T3, result: 'INCONCLUSIVE', note: 'reviewed against pre-registered thresholds', evidenceIds: ['EV-100'] },
      calculation, { knownEvidenceIds: KNOWN_EVIDENCE_IDS })
    expect(r.problems).toEqual([])
    const back = reload(r.ledger)
    expect(back.finalReview?.reviewer).toBe('F. Final')
    expect(back.finalReview?.at).toBe(T3)
    expect(back.finalReview?.result).toBe('INCONCLUSIVE')
    expect(back.finalReview?.evidenceIds).toEqual(['EV-100'])
    expect(back.finalReview?.integrity).toBe('OK')
    expect(effectiveState(back, PRE_REGISTRATION, baselineImpactValues('RUN-001')).gate).toBe('COMPLETE')
  })
})

describe('persistence never skips a gate', () => {
  it('loading a ledger registers, approves and measures nothing by itself', () => {
    const l = emptyGovernanceLedger()
    expect(persistenceAutoRegisters(l)).toBe(false)
    expect(persistenceAutoApproves(l)).toBe(false)
    expect(persistenceCreatesMeasurement(l)).toBe(false)
    expect(businessApprovalRegisters()).toBe(false)
    const eff = effectiveState(reload(l), PRE_REGISTRATION)
    expect(eff.state.thresholdsRegistered).toBe(0)
    expect(eff.state.approvedBaselineRuns).toEqual([])
    expect(eff.state.intervention).toBeNull()
    expect(eff.state.comparison).toBeNull()
    expect(eff.state.calculation).toBeNull()
    expect(eff.state.finalReview).toBeNull()
    expect(eff.gate).toBe('THRESHOLDS_PENDING')
  })

  it('registration alone does not approve a baseline or unlock an intervention', () => {
    const eff = effectiveState(reload(registerAll()), PRE_REGISTRATION)
    expect(eff.state.thresholdsComplete).toBe(true)
    expect(eff.state.approvedBaselineRuns).toEqual([])
    expect(eff.gate).toBe('BASELINE_APPROVAL_PENDING')
  })

  it('the static research data is never written to', () => {
    expect(PRE_REGISTRATION.every((e) => e.successThreshold === null)).toBe(true)
    expect(PRE_REGISTRATION.every((e) => e.reviewerName === null)).toBe(true)
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(baselineRunIds()).toEqual(['RUN-001', 'RUN-002', 'RUN-003'])
    expect(baselineImpactValues('RUN-001')['$10,000 buy']).toBe(10.59)
    expect(baselineImpactValues('RUN-001')['$100,000 both sides']).toBeNull()
  })
})
