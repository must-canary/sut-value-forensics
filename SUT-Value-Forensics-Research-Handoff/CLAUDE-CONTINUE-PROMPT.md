# Claude continuation prompt

Read `SUT-Value-Forensics-Research-Handoff.md` completely before doing any work.

This is a frozen research handoff from previous work. **Do not restart research from zero.** Treat it as the current baseline and extend/reconcile it.

Your immediate deliverables are exactly these five files:

- `research-baseline.md`
- `data-source-contract.md`
- `hypothesis-matrix.md`
- `may-2026-investigation-plan.md`
- `evidence-model.md`

Before UI or feature implementation, do the following:

1. Read the handoff.
2. Validate each high-impact factual claim against its listed primary/independent source.
3. Mark facts as VERIFIED / SECONDARY / CLAIM / OPEN QUESTION.
4. Reconcile the SuperTrust SUT contract identity before using any market/exchange data.
5. Preserve provider-specific market-data differences instead of blending them.
6. Expand the remaining research only where a material unanswered question exists.
7. Define schemas, ingestion contracts, evidence lineage, hypothesis evaluation rules, and graph datasets.
8. Add tests for asset identity, source provenance, timestamp integrity, and evidence lineage.

The first product case remains:

**May 2026 Crash Forensics — May 1 to May 25, 2026.**

Do not turn this back into the old SUT Quality Sentinel / SoloPay product.

Do not add ABI tooling.
Do not create fake metrics.
Do not allow AI to determine root cause.
Do not call a wallet a whale/market maker/treasury/company wallet without evidence.
Do not call anything fraud/manipulation without evidence.
Do not use price prediction or trading automation.
Do not commit or push.

After creating the five files, report:

- what was already known from the handoff
- what you verified
- what you newly discovered
- what remains unknown
- exact data interfaces needed for the May crash investigation
- exact next implementation step
