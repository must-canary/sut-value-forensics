/**
 * Business Decision persistence — survives refresh, versioned, never bypasses governance.
 */
import { describe, expect, it } from 'vitest'
import {
  approveCurrent, blankVersion, checkIntegrity, createNewProposal, emptyLedger,
  isTrustworthyApproval, loadLedger, MemoryStorage, producesResult, registersThreshold,
  saveInput, saveLedger, STORE_KEY, unlocksIntervention, viewLedger,
  type DecisionLedger,
} from '../src/core/decision-store'
import { EXECUTABLE_SIZES, NOT_EXECUTABLE_SIZE } from '../src/core/business-decision'
import { governanceState } from '../src/data/governance'
import { currentGate } from '../src/core/governance'
import { registrationSummary } from '../src/core/pre-registration'
import { PRE_REGISTRATION } from '../src/data/pre-registration'

const T1 = '2026-10-01T10:00:00Z'
const T2 = '2026-10-01T11:00:00Z'
const T3 = '2026-10-01T12:00:00Z'

const filled = () => EXECUTABLE_SIZES.map((size) => ({ size, value: 8, rationale: 'tolerance' }))

/** Save → write → read back, i.e. a browser refresh. */
function refresh(storage: MemoryStorage): DecisionLedger {
  return loadLedger(storage)
}

function approvedLedger(storage: MemoryStorage) {
  let l = emptyLedger()
  l = saveInput(l, { thresholds: filled(), reviewer: 'B. Owner', decisionNote: 'EOD review', approvalConfirmed: true }, T1).ledger
  l = approveCurrent(l, T2).ledger
  saveLedger(storage, l)
  return l
}

describe('save and approval survive refresh', () => {
  it('saved input is restored', () => {
    const s = new MemoryStorage()
    const l = saveInput(emptyLedger(), { thresholds: filled(), reviewer: 'B. Owner', decisionNote: 'draft' }, T1).ledger
    saveLedger(s, l)
    const back = refresh(s)
    const v = back.versions[0]!
    expect(v.approvalStatus).toBe('BUSINESS_INPUT_SAVED')
    expect(v.reviewer).toBe('B. Owner')
    expect(v.decisionNote).toBe('draft')
    expect(v.thresholds.map((t) => t.value)).toEqual([8, 8, 8, 8])
  })

  it('approval, reviewer, timestamps and fingerprint are restored', () => {
    const s = new MemoryStorage()
    const before = approvedLedger(s).versions[0]!
    const after = refresh(s).versions[0]!
    expect(after.approvalStatus).toBe('BUSINESS_APPROVED')
    expect(after.reviewer).toBe('B. Owner')
    expect(after.createdAt).toBe(T1)
    expect(after.approvedAt).toBe(T2)
    expect(after.fingerprint).toBe(before.fingerprint)
    expect(after.fingerprint).toMatch(/^BA-EXP-001\/v1-[0-9a-f]{8}$/)
  })

  it('approved values are restored exactly', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const v = refresh(s).versions[0]!
    for (const t of v.thresholds) {
      expect(t.value).toBe(8)
      expect(t.rationale).toBe('tolerance')
      expect(t.direction).toBe('LOWER_IS_BETTER')
      expect(t.metric).toBeTruthy()
    }
  })

  it('locked state survives refresh', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const view = viewLedger(refresh(s))
    expect(view.locked).toBe(true)
    expect(view.approved).toBe(true)
  })

  it('an approved version cannot be edited after refresh', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const r = saveInput(refresh(s), { thresholds: filled() }, T3)
    expect(r.problems.join(' ')).toMatch(/approved and locked — create a new proposal/)
  })

  it('corrupt or foreign stored data yields an empty ledger, never a fake approval', () => {
    const s = new MemoryStorage()
    s.setItem(STORE_KEY, 'not json')
    expect(loadLedger(s).versions).toHaveLength(0)
    s.setItem(STORE_KEY, JSON.stringify({ experimentId: 'OTHER', versions: [] }))
    expect(loadLedger(s).versions).toHaveLength(0)
  })
})

describe('integrity — persisted state is not proof of approval', () => {
  it('a tampered threshold invalidates the approval', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const raw = JSON.parse(s.getItem(STORE_KEY)!) as DecisionLedger
    raw.versions[0]!.thresholds[0]!.value = 99        // local manipulation
    s.setItem(STORE_KEY, JSON.stringify(raw))
    const back = refresh(s)
    expect(back.versions[0]!.integrity).toBe('TAMPERED')
    expect(isTrustworthyApproval(back.versions[0]!)).toBe(false)
    expect(viewLedger(back).approved).toBe(false)
    expect(viewLedger(back).locked).toBe(false)
  })

  it('a swapped reviewer invalidates the approval', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const raw = JSON.parse(s.getItem(STORE_KEY)!) as DecisionLedger
    raw.versions[0]!.reviewer = 'Someone Else'
    s.setItem(STORE_KEY, JSON.stringify(raw))
    expect(refresh(s).versions[0]!.integrity).toBe('TAMPERED')
  })

  it('an approval claimed with no fingerprint is TAMPERED', () => {
    const v = { ...blankVersion(emptyLedger(), T1), approvalStatus: 'BUSINESS_APPROVED' as const }
    expect(checkIntegrity(v)).toBe('TAMPERED')
  })

  it('an untouched approval checks out', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    expect(refresh(s).versions[0]!.integrity).toBe('OK')
  })
})

describe('versioning and audit history', () => {
  it('a new proposal does not overwrite the old approval', () => {
    const s = new MemoryStorage()
    let l = approvedLedger(s)
    l = createNewProposal(l, T3).ledger
    saveLedger(s, l)
    const back = refresh(s)
    expect(back.versions).toHaveLength(2)
    expect(back.versions[0]!.version).toBe('v1')
    expect(back.versions[0]!.approvalStatus).toBe('BUSINESS_APPROVED')
    expect(back.versions[0]!.fingerprint).toBeTruthy()
    expect(back.versions[1]!.version).toBe('v2')
    expect(back.versions[1]!.approvalStatus).toBe('PROPOSED')
  })

  it('a new version requires approval again', () => {
    const s = new MemoryStorage()
    let l = createNewProposal(approvedLedger(s), T3).ledger
    expect(viewLedger(l).approved).toBe(false)
    expect(viewLedger(l).locked).toBe(false)
    expect(approveCurrent(l, T3).problems.length).toBeGreaterThan(0)   // empty values
    l = saveInput(l, { thresholds: filled(), reviewer: 'B. Owner', decisionNote: 'v2', approvalConfirmed: true }, T3).ledger
    expect(approveCurrent(l, T3).problems).toEqual([])
  })

  it('v1 and v2 fingerprints differ', () => {
    const s = new MemoryStorage()
    let l = createNewProposal(approvedLedger(s), T3).ledger
    l = saveInput(l, { thresholds: filled(), reviewer: 'B. Owner', decisionNote: 'v2', approvalConfirmed: true }, T3).ledger
    l = approveCurrent(l, T3).ledger
    expect(l.versions[1]!.fingerprint).not.toBe(l.versions[0]!.fingerprint)
    expect(l.versions[0]!.approvalStatus).toBe('BUSINESS_APPROVED')
  })

  it('a new proposal is refused while the current version is unapproved', () => {
    const l = saveInput(emptyLedger(), { thresholds: filled() }, T1).ledger
    expect(createNewProposal(l, T2).problems.join(' ')).toMatch(/not approved yet/)
  })

  it('history exposes every version for audit', () => {
    const s = new MemoryStorage()
    const l = createNewProposal(approvedLedger(s), T3).ledger
    const h = viewLedger(l).history
    expect(h.map((v) => v.version)).toEqual(['v1', 'v2'])
    for (const v of h) {
      expect(v.createdAt).toBeTruthy()
      expect(v.approvalStatus).toBeTruthy()
    }
  })
})

describe('approval requirements are enforced at the store layer', () => {
  it('refuses incomplete values, reviewer, note or confirmation', () => {
    const base = saveInput(emptyLedger(), { thresholds: filled() }, T1).ledger
    expect(approveCurrent(base, T2).problems.join(' ')).toMatch(/reviewer name is required/)
    const noNote = saveInput(base, { reviewer: 'R', approvalConfirmed: true }, T1).ledger
    expect(approveCurrent(noNote, T2).problems.join(' ')).toMatch(/decision note/)
    const noConfirm = saveInput(base, { reviewer: 'R', decisionNote: 'n' }, T1).ledger
    expect(approveCurrent(noConfirm, T2).problems.join(' ')).toMatch(/explicitly confirm/)
  })

  it('refuses a non-positive threshold', () => {
    let l = saveInput(emptyLedger(), {
      thresholds: EXECUTABLE_SIZES.map((size, i) => ({ size, value: i === 0 ? -1 : 8, rationale: 'r' })),
      reviewer: 'R', decisionNote: 'n', approvalConfirmed: true,
    }, T1).ledger
    expect(approveCurrent(l, T2).problems.join(' ')).toMatch(/must be a positive number/)
    void l
  })

  it('an already-approved version cannot be re-approved', () => {
    const s = new MemoryStorage()
    expect(approveCurrent(approvedLedger(s), T3).problems.join(' ')).toMatch(/already approved/)
  })
})

describe('$100K is never persisted', () => {
  it('writing a $100K threshold is refused', () => {
    const r = saveInput(emptyLedger(), {
      thresholds: [{ size: NOT_EXECUTABLE_SIZE as never, value: 50, rationale: 'x' }],
    }, T1)
    expect(r.problems.join(' ')).toMatch(/not an executable size and cannot be persisted/)
  })

  it('a $100K entry injected into storage is stripped on load', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    const raw = JSON.parse(s.getItem(STORE_KEY)!) as DecisionLedger
    raw.versions[0]!.thresholds.push({
      size: NOT_EXECUTABLE_SIZE as never, value: 50, rationale: 'x',
      metric: 'm', direction: 'LOWER_IS_BETTER',
    })
    s.setItem(STORE_KEY, JSON.stringify(raw))
    const back = refresh(s)
    expect(back.versions[0]!.thresholds.map((t) => t.size)).toEqual([...EXECUTABLE_SIZES])
  })

  it('a saved ledger never contains the $100K size', () => {
    const s = new MemoryStorage()
    approvedLedger(s)
    expect(s.getItem(STORE_KEY)).not.toContain('$100,000')
  })
})

describe('persistence cannot bypass governance', () => {
  const s = new MemoryStorage()
  const l = approvedLedger(s)

  it('cannot register a threshold', () => {
    expect(registersThreshold(l)).toBe(false)
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(registrationSummary(PRE_REGISTRATION).complete).toBe(false)
    for (const e of PRE_REGISTRATION) expect(e.successThreshold, e.standardisedSize).toBeNull()
  })

  it('cannot unlock an intervention', () => {
    expect(unlocksIntervention(l)).toBe(false)
    expect(currentGate(governanceState())).toBe('THRESHOLDS_PENDING')
    expect(governanceState().intervention).toBeNull()
  })

  it('cannot produce an experiment result', () => {
    expect(producesResult(l)).toBe(false)
    expect(governanceState().comparison).toBeNull()
    expect(governanceState().calculation).toBeNull()
    expect(governanceState().finalReview).toBeNull()
  })

  it('a stale approved ledger still leaves governance untouched', () => {
    const back = refresh(s)
    expect(viewLedger(back).approved).toBe(true)
    expect(governanceState().thresholdsRegistered).toBe(0)
    expect(governanceState().approvedBaselineRuns).toHaveLength(0)
  })
})
