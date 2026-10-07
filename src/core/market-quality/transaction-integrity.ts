/**
 * TRANSACTION INTEGRITY QA — expected versus actual, field by field.
 *
 * The comparator is real and complete. What is missing in this project is the
 * EXPECTED side: an expected transaction is produced by an order, invoice or
 * payment system, and no such product telemetry is connected here. EXP-002
 * established this empirically against public sources — no public order ID,
 * payment reference or receipt exists for any SUT transaction examined, and no
 * address is publicly attributable to a product or merchant.
 *
 * So this dimension reports DATA UNAVAILABLE with that reason, and stays ready:
 * supply both sides and every field is compared for real. No expected value is
 * invented, and no transaction is ever generated.
 */
import { check, dimension, emptyEvidenceRef, type QaCheck, type QaDimension, type QaEvidenceRef } from './types'

/** The fields a transaction comparison covers. */
export const TX_FIELDS = [
  'sender', 'receiver', 'amount', 'token', 'transactionHash',
  'timestamp', 'status', 'chain', 'contract',
] as const

export type TxField = (typeof TX_FIELDS)[number]

export const TX_FIELD_LABELS: Record<TxField, string> = {
  sender: 'Sender',
  receiver: 'Receiver',
  amount: 'Amount',
  token: 'Token / symbol',
  transactionHash: 'Transaction hash',
  timestamp: 'Timestamp',
  status: 'Status',
  chain: 'Chain',
  contract: 'Contract',
}

/** One side of the comparison. Every field is optional: absence is reported. */
export type TxSnapshot = Partial<Record<TxField, string | number | null>>

export interface TxFieldResult {
  field: TxField
  label: string
  expected: string | null
  actual: string | null
  status: 'PASS' | 'FAIL' | 'DATA_UNAVAILABLE'
  reason: string | null
}

const show = (v: string | number | null | undefined): string | null =>
  v === null || v === undefined || v === '' ? null : String(v)

/**
 * Case-insensitive for hex identifiers (addresses, hashes, chain names) because
 * checksum casing is cosmetic; exact for amounts, which must match numerically.
 */
function fieldsMatch(field: TxField, expected: string, actual: string): boolean {
  if (field === 'amount') {
    const a = Number(expected), b = Number(actual)
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a === b
    return expected.trim() === actual.trim()
  }
  if (field === 'timestamp') {
    const a = Date.parse(expected), b = Date.parse(actual)
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a === b
    return expected.trim() === actual.trim()
  }
  return expected.trim().toLowerCase() === actual.trim().toLowerCase()
}

/**
 * The deterministic comparator. Pure, so it is unit-testable with fixtures and
 * carries no dependency on any store.
 */
export function compareTransaction(expected: TxSnapshot | null, actual: TxSnapshot | null): TxFieldResult[] {
  return TX_FIELDS.map((field) => {
    const e = show(expected?.[field])
    const a = show(actual?.[field])
    const label = TX_FIELD_LABELS[field]
    if (e === null && a === null) {
      return {
        field, label, expected: null, actual: null, status: 'DATA_UNAVAILABLE',
        reason: 'Neither side supplies this field.',
      }
    }
    if (e === null) {
      return {
        field, label, expected: null, actual: a, status: 'DATA_UNAVAILABLE',
        reason: 'An observed value exists but no expected value is available to compare it against.',
      }
    }
    if (a === null) {
      return {
        field, label, expected: e, actual: null, status: 'DATA_UNAVAILABLE',
        reason: 'An expected value exists but no observed value is available to compare it against.',
      }
    }
    return fieldsMatch(field, e, a)
      ? { field, label, expected: e, actual: a, status: 'PASS', reason: null }
      : {
        field, label, expected: e, actual: a, status: 'FAIL',
        reason: 'The observed value does not match the expected value.',
      }
  })
}

/**
 * The audit that established this position is referenced by DOCUMENT, not by
 * experiment id. `EXP-002` is already taken in the frozen experiment registry by
 * "Reproducible weekly active addresses", and the public utility audit was also
 * commissioned under that number. Reusing the id here would silently merge two
 * different experiments, so this module names the document instead and records
 * the collision explicitly in `EXPERIMENT_ID_COLLISION`.
 */
export const PUBLIC_UTILITY_AUDIT_DOC =
  'docs/EXP-002-PUBLIC-SUT-UTILITY-VALUE-CAPTURE.md (public utility and value-capture evidence audit)'

export const EXPERIMENT_ID_COLLISION =
  'Identifier collision, unresolved and not resolved here: the frozen experiment registry already uses '
  + 'EXP-002 for "Reproducible weekly active addresses", and the public utility and value-capture audit was '
  + 'also commissioned as EXP-002. This module therefore references the audit by document path rather than '
  + 'by experiment id, so neither is renamed or overwritten. Renumbering the audit is a governance decision '
  + 'for a named human.'

export const EXPECTED_CONTEXT_UNAVAILABLE =
  'Expected transaction context is not available from the current public evidence layer. An expected '
  + 'transaction is produced by an order, invoice or payment system, and no product telemetry is connected '
  + 'to this project. The public utility and value-capture audit confirmed the public position: no public '
  + 'order ID, payment reference or receipt exists for any SUT transaction examined, and no address is '
  + 'publicly attributable to a product or merchant. Supplying approved internal telemetry would make this '
  + 'dimension evaluable.'

export const TRANSACTION_PURPOSE =
  'Validates that an observed blockchain transaction matches its expected transaction data, field by field, '
  + 'whenever both sides of the comparison are actually available.'

export interface TransactionCase {
  id: string
  label: string
  expected: TxSnapshot | null
  actual: TxSnapshot | null
  /** Where the expected side came from; null when there is none. */
  expectedSource: string | null
  /** Where the observed side came from; null when there is none. */
  actualSource: string | null
  evaluatedAt?: string | null
}

export function transactionIntegrity(cases: TransactionCase[]): QaDimension & { cases: Array<{
  c: TransactionCase; fields: TxFieldResult[]
}> } {
  if (cases.length === 0) {
    const checks: QaCheck[] = [check({
      id: 'tx-no-case',
      label: 'Expected vs actual transaction comparison',
      status: 'DATA_UNAVAILABLE',
      reason: EXPECTED_CONTEXT_UNAVAILABLE,
      evidence: {
        ...emptyEvidenceRef(),
        source: PUBLIC_UTILITY_AUDIT_DOC,
        metric: 'expected_transaction_context_availability',
        // Deliberately null: see EXPERIMENT_ID_COLLISION. The audit is named by
        // document above rather than claiming the frozen EXP-002 identity.
        relatedExperiment: null,
        provenance: 'public utility and value-capture evidence audit — 0 of 399 mainnet SUT transactions '
          + 'resolved to a product record against the only first-party public verification endpoint',
      },
    })]
    return {
      ...dimension({
        id: 'transaction-integrity',
        title: 'Transaction Integrity QA',
        purpose: TRANSACTION_PURPOSE,
        checks,
      }),
      cases: [],
    }
  }

  const evaluated = cases.map((c) => ({ c, fields: compareTransaction(c.expected, c.actual) }))
  const checks: QaCheck[] = evaluated.flatMap(({ c, fields }) =>
    fields.map((f) => {
      const evidence: QaEvidenceRef = {
        ...emptyEvidenceRef(),
        metric: `tx_${f.field}`,
        source: c.actualSource,
        value: f.actual,
        provenance: c.expectedSource
          ? `expected from ${c.expectedSource}; observed from ${c.actualSource ?? 'no observed source'}`
          : 'no expected-side source is connected',
      }
      return check({
        id: `tx-${c.id}-${f.field}`,
        label: `${c.label} — ${f.label}`,
        status: f.status,
        reason: f.status === 'DATA_UNAVAILABLE' && !c.expectedSource
          ? EXPECTED_CONTEXT_UNAVAILABLE
          : f.reason,
        expected: f.expected,
        actual: f.actual,
        evidence,
        evaluatedAt: f.status === 'DATA_UNAVAILABLE' ? null : (c.evaluatedAt ?? null),
      })
    }),
  )
  return {
    ...dimension({
      id: 'transaction-integrity',
      title: 'Transaction Integrity QA',
      purpose: TRANSACTION_PURPOSE,
      checks,
    }),
    cases: evaluated,
  }
}
