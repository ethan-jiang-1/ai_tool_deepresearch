import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLifecycleLines,
  lifecycleNonceIsolated,
  runLogHasRelayCommitDone,
  splitRunLogLines,
} from '../../../experiments_env/shared/run-log-lifecycle-utils.mjs';

const SAMPLE = `[2026-07-04T02:07:48.312Z] INFO relay_spawn_requested bundle=sub_log {"kind":"queue_enqueue","slotKey":"logger_a","roleAgentKey":"dpt-source-intake"}
[2026-07-04T02:08:13.763Z] INFO search_start bundle=sub_log {"kind":"search_start","slotKey":"logger_b","roleAgentKey":"dpt-source-intake","receipt_nonce":"36844205-0135-4790-9a93-6280b3aad92a"}
[2026-07-04T02:08:13.821Z] INFO work_done bundle=sub_log {"kind":"work_done","slotKey":"logger_b","roleAgentKey":"dpt-source-intake","receipt_nonce":"36844205-0135-4790-9a93-6280b3aad92a","summary":"logger_b complete"}
[2026-07-04T02:08:20.000Z] INFO relay_commit_done bundle=sub_log {"slotKey":"source_intake"}
[2026-07-04T02:08:21.000Z] WARN relay_commit_missing bundle=sub_log {"slotKey":"source_intake","reason":"relay_commit_done not found in run.log"}
`;

describe('run-log-lifecycle-utils', () => {
  it('filterLifecycleLines ignores staging lines that also carry slotKey', () => {
    const lines = splitRunLogLines(SAMPLE);
    assert.equal(filterLifecycleLines(lines).length, 2);
    assert.equal(filterLifecycleLines(lines, { slotKey: 'logger_b' }).length, 2);
    assert.equal(filterLifecycleLines(lines, { slotKey: 'logger_a' }).length, 0);
  });

  it('runLogHasRelayCommitDone matches production INFO line only', () => {
    assert.equal(runLogHasRelayCommitDone(SAMPLE), true);
    assert.equal(
      runLogHasRelayCommitDone(
        '[2026-07-04T02:08:21.000Z] WARN relay_commit_missing bundle=x {"reason":"relay_commit_done not found"}'
      ),
      false
    );
  });

  it('lifecycleNonceIsolated requires receipt_nonce on every lifecycle line', () => {
    const lines = splitRunLogLines(SAMPLE);
    assert.equal(
      lifecycleNonceIsolated(lines, 'logger_b', '36844205-0135-4790-9a93-6280b3aad92a'),
      true
    );
  });
});
