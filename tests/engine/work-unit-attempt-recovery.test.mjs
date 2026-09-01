// @impl DEW-022, DEW-023, DEW-024, CHI-004

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = path.resolve('.');

function source(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('work-unit attempt-recovery implementation inventory', () => {
  it('routes every work-unit authority mutation through an exact-target v2 transaction', () => {
    const callers = {
      'DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs': [
        "'create_work_unit'",
        "'open_work_unit_batch'",
        "'claim_work_units'",
        "'work_unit_replace'",
        '`work_unit_${status}`',
      ],
      'DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs': [
        "'reject_work_unit_submit'",
        "'submit_work_unit'",
      ],
      'DEEP_RESEARCH_HARNESS/engine/work-unit-submit-late-retry.mjs': [
        "'late_submit_work_unit'",
      ],
      'DEEP_RESEARCH_HARNESS/engine/work-unit-submit-declaration-recovery.mjs': [
        "'recover_work_unit_declaration'",
      ],
      'DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs': ["'supersede_work_unit'"],
      'DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs': ["'recover_work_unit_transaction'"],
    };

    for (const [relativePath, operations] of Object.entries(callers)) {
      const contents = source(relativePath);
      for (const operation of operations) {
        const call = new RegExp(
          `withWorkUnitTransaction\\(bundleDir,\\s*${escapeRegExp(operation)},\\s*\\{[\\s\\S]{0,1800}?mutationTargets\\s*:\\s*\\[`,
        );
        assert.match(contents, call, `${relativePath} must declare exact mutationTargets for ${operation}`);
      }
    }

    const productionSources = Object.keys(callers).map(source).join('\n');
    assert.doesNotMatch(productionSources, /mutationTargets\s*:\s*\[[^\]]*['"`][^'"`\n]*\*[^'"`\n]*['"`]/s);
  });

  it('keeps transaction metadata outside rollback targets and releases the lock last', () => {
    const transaction = source('DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs');
    assert.match(transaction, /requires at least one exact mutation target/);
    assert.match(transaction, /The lock is ours but has no owner yet/);
    assert.match(transaction, /Final action: no transaction-owned target or audit write may follow this release\.\s*rmSync\(ownerDir/s);

    const helperStart = transaction.indexOf('export function withWorkUnitTransaction');
    const helperEnd = transaction.indexOf('export function recoverWorkUnitTransaction');
    assert.ok(helperStart !== -1, 'withWorkUnitTransaction anchor missing');
    assert.ok(helperEnd > helperStart, 'recoverWorkUnitTransaction anchor missing or out of order');
    const helper = transaction.slice(helperStart, helperEnd);
    const release = helper.lastIndexOf('rmSync(ownerDir');
    assert.ok(release > 0);
    assert.doesNotMatch(helper.slice(release), /writeJson\(|writeFileSync\(|restoreMutationTargets\(/);
  });

  it('writes submitted hashes only through the ledger-first current profile', () => {
    const snapshotSource = source('DEEP_RESEARCH_HARNESS/engine/work-unit-submit-snapshot.mjs');
    const writerStart = snapshotSource.indexOf('function writeSubmittedStatusAndHashes');
    const writerEnd = snapshotSource.indexOf('function verifySubmitDurablePostcondition');
    const writer = snapshotSource.slice(writerStart, writerEnd);

    assert.match(writer, /delete record\.result_hash/);
    assert.match(writer, /delete record\.ledger_record_hash/);
    assert.match(writer, /record\.accepted_ledger_record_hash = ledgerRecordHash/);
    assert.match(writer, /WorkUnitSubmissionV1StatusFileSchema\.parse/);
    assert.doesNotMatch(writer, /result_hash:\s*resultHash|ledger_record_hash:\s*ledgerRecordHash/);
  });

  it('keeps submit-integrity preflight out of Phase Gate evaluators', () => {
    const integrity = source('DEEP_RESEARCH_HARNESS/engine/work-unit-submit-integrity.mjs');
    const importRefs = [...integrity.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    assert.equal(importRefs.some((ref) => /gate/i.test(ref)), false);
    assert.doesNotMatch(integrity, /evaluateGate|checkGate|work_unit_output_coverage|cross_work_unit/i);
    assert.match(integrity, /submit_owned_only:\s*true/);
    assert.match(integrity, /gate_evaluated:\s*false/);

    const submit = source('DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs');
    // exact call-site count post-C4: outerIntegrity + lockedIntegrity + one
    // dry/preflight shared derivation. Update deliberately if the flow changes.
    assert.ok((submit.match(/evaluateWorkUnitSubmitIntegrity\(/g) || []).length >= 3);
    assert.match(submit, /outerIntegrity[\s\S]{0,2400}withWorkUnitTransaction[\s\S]{0,3200}lockedIntegrity/);
  });
});
