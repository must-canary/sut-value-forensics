import { PRE_REGISTRATION, EXPERIMENT_VERSION } from '../src/data/pre-registration'
import { REVIEWS, BASELINE_CAPTURES } from '../src/data/baseline-captures'
console.log('experiment version:', EXPERIMENT_VERSION)
for (const e of PRE_REGISTRATION) {
  console.log(`  ${e.standardisedSize.padEnd(22)} ${e.state.padEnd(20)} threshold=${e.successThreshold} author=${e.reviewerName} ts=${e.registrationTimestamp}`)
}
const runs = [...new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))]
console.log('baseline runs:', runs.join(', '))
console.log('reviews recorded:', REVIEWS.length)
console.log('approved captures:', BASELINE_CAPTURES.filter((c) => c.reviewerStatus === 'ACCEPTED').length)
