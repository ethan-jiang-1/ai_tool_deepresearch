import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLifecycleLines,
  lifecycleNonceIsolated,
  runLogHasWorkUnitSubmitRejected,
  runLogHasWorkUnitSubmitted,
  splitRunLogLines,
} from '../../../experiments_env/shared/run-log-lifecycle-utils.mjs';

const SAMPLE = `[2026-07-04T02:07:48.312Z] INFO work_unit_claimed bundle=sub_log {"kind":"work_unit_claim","work_id":"wu-w0-b000-src-i0001","queue_item_id":"q-src-a","receipt_nonce":"36844205-0135-4790-9a93-6280b3aad92a"}
[2026-07-04T02:08:13.763Z] INFO search_start bundle=sub_log {"kind":"search_start","work_id":"wu-w0-b000-src-i0002","queue_item_id":"q-src-b","receipt_nonce":"46844205-0135-4790-9a93-6280b3aad92b"}
[2026-07-04T02:08:13.821Z] INFO work_done bundle=sub_log {"kind":"work_done","work_id":"wu-w0-b000-src-i0002","queue_item_id":"q-src-b","receipt_nonce":"46844205-0135-4790-9a93-6280b3aad92b","summary":"source intake complete"}
[2026-07-04T02:08:20.000Z] INFO work_unit_submitted bundle=sub_log {"work_id":"wu-w0-b000-src-i0002","queue_item_id":"q-src-b"}
[2026-07-04T02:08:21.000Z] WARN work_unit_submit_rejected bundle=sub_log {"work_id":"wu-w0-b000-src-i0003","queue_item_id":"q-src-c","reason":"missing_runtime_receipt"}
`;

describe('run-log-lifecycle-utils', () => {
  it('filterLifecycleLines filters by lifecycle message and work-unit identity', () => {
    const lines = splitRunLogLines(SAMPLE);
    assert.equal(filterLifecycleLines(lines).length, 2);
    assert.equal(filterLifecycleLines(lines, { workId: 'wu-w0-b000-src-i0002' }).length, 2);
    assert.equal(filterLifecycleLines(lines, { workId: 'wu-w0-b000-src-i0001' }).length, 0);
    assert.equal(filterLifecycleLines(lines, { queueItemId: 'q-src-b' }).length, 2);
  });

  it('work-unit submit helpers match production log levels only', () => {
    assert.equal(runLogHasWorkUnitSubmitted(SAMPLE), true);
    assert.equal(runLogHasWorkUnitSubmitRejected(SAMPLE, 'wu-w0-b000-src-i0003'), true);
    assert.equal(runLogHasWorkUnitSubmitted(
      '[2026-07-04T02:08:21.000Z] WARN work_unit_submit_rejected bundle=x {"reason":"not submitted"}'
    ), false);
  });

  it('lifecycleNonceIsolated requires receipt_nonce on every lifecycle line', () => {
    const lines = splitRunLogLines(SAMPLE);
    assert.equal(
      lifecycleNonceIsolated(lines, 'wu-w0-b000-src-i0002', '46844205-0135-4790-9a93-6280b3aad92b'),
      true
    );
  });
});
