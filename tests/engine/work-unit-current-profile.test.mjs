// @impl DEW-004, DEW-005, DEW-017, DEW-024, SNC-006

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  evaluateWorkUnitSupersessionEligibility,
  inspectWorkUnits,
  loadWorkUnitIndex,
  projectWorkUnitAttemptDisposition,
  submitWorkUnit,
  timeoutPreflightWorkUnit,
  workUnitIndexPath,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { readSubmittedWorkUnitDeclarations } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-readers.mjs';
import { classifyCompleteCurrentWorkUnitProfile } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-current-profile.mjs';
import { claimAndSubmitWorkUnit, cleanupWorkUnitBundle, tempWorkUnitBundle } from './work-unit-test-helpers.mjs';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function snapshotPath(targetPath) {
  if (!existsSync(targetPath)) return { type: 'missing' };
  const stats = statSync(targetPath);
  if (stats.isDirectory()) {
    return {
      type: 'dir',
      entries: Object.fromEntries(readdirSync(targetPath).sort().map((entry) => [
        entry,
        snapshotPath(path.join(targetPath, entry)),
      ])),
    };
  }
  return { type: 'file', content: readFileSync(targetPath, 'utf8') };
}

function authoritySnapshot(bundleDir, record) {
  const refs = [
    workUnitIndexPath(bundleDir),
    path.join(bundleDir, 'rb_queue.json'),
    path.join(bundleDir, 'rb_output_declarations.jsonl'),
    path.join(bundleDir, record.paths.status_ref),
    path.join(bundleDir, record.paths.result_ref),
    path.join(bundleDir, record.paths.runtime_receipt_ref),
    path.join(bundleDir, '_work_units', '_transactions'),
    path.join(bundleDir, 'rb_trace.jsonl'),
    path.join(bundleDir, '_logs'),
  ];
  return Object.fromEntries(refs.map((ref) => [path.relative(bundleDir, ref), snapshotPath(ref)]));
}

function mutateProfile(bundleDir, record, shape) {
  const indexPath = workUnitIndexPath(bundleDir);
  const index = readJson(indexPath);
  const current = index.work_units[record.work_id];
  const manifestPath = path.join(bundleDir, current.paths.manifest_ref);
  const beaconPath = path.join(bundleDir, current.paths.beacon_ref);
  const statusPath = path.join(bundleDir, current.paths.status_ref);
  const manifest = readJson(manifestPath);
  const beacon = readJson(beaconPath);
  const status = readJson(statusPath);
  const ledger = readFileSync(path.join(bundleDir, 'rb_output_declarations.jsonl'), 'utf8')
    .trim().split('\n').map((line) => JSON.parse(line));
  const [row] = ledger;

  if (shape === 'assignment-v1' || shape === 'assignment-v2') {
    const version = shape === 'assignment-v1'
      ? 'work-unit.assignment.v1'
      : 'work-unit.assignment.v2';
    for (const surface of [current, manifest, beacon]) surface.assignment_contract_version = version;
  } else if (shape === 'markerless-submission') {
    for (const surface of [current, manifest, beacon]) delete surface.submission_contract_version;
    delete current.accepted_ledger_record_hash;
    current.result_hash = row.result_hash;
    current.ledger_record_hash = row.ledger_record_hash;
    status.result_hash = row.result_hash;
    status.ledger_record_hash = row.ledger_record_hash;
  } else if (shape === 'actor-unrecorded') {
    for (const surface of [current, manifest, beacon]) {
      delete surface.actor_contract_version;
      delete surface.actor_execution;
    }
  } else if (shape === 'manifest-profile-drift') {
    manifest.assignment_contract_version = 'work-unit.assignment.v2';
  } else if (shape === 'beacon-profile-drift') {
    beacon.actor_execution = { execution_actor_class: 'phase_agent_fallback' };
  } else {
    throw new Error(`unknown profile fixture ${shape}`);
  }

  writeJson(indexPath, index);
  writeJson(manifestPath, manifest);
  writeJson(beaconPath, beacon);
  writeJson(statusPath, status);
  return loadWorkUnitIndex(bundleDir).work_units[record.work_id];
}

describe('complete current work-unit profile', () => {
  it('keeps the complete v3/submission-v1/actor-v1 profile on every protected current reader', () => {
    const bundleDir = tempWorkUnitBundle('wu-current-profile-current-');
    try {
      const { record, resultPath, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      const current = loadWorkUnitIndex(bundleDir).work_units[record.work_id];
      assert.deepEqual(classifyCompleteCurrentWorkUnitProfile(bundleDir, current), {
        ok: true,
        reason_code: null,
        work_id: current.work_id,
        queue_item_id: current.queue_item_id,
      });
      assert.equal(readSubmittedWorkUnitDeclarations(bundleDir).length, 1);
      assert.equal(projectWorkUnitAttemptDisposition(bundleDir, current).coverage.disposition, 'current');
      assert.equal(submitWorkUnit(bundleDir, { work_id: current.work_id, resultPath }).ok, true);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('rejects every retired or drifting profile before reader authority or submit mutation', () => {
    const cases = [
      ['assignment-v1', 'assignment_contract_version'],
      ['assignment-v2', 'assignment_contract_version'],
      ['markerless-submission', 'submission_contract_version'],
      ['actor-unrecorded', 'actor_contract_version'],
      ['manifest-profile-drift', 'profile_binding'],
      ['beacon-profile-drift', 'profile_binding'],
    ];

    for (const [shape, discriminator] of cases) {
      const bundleDir = tempWorkUnitBundle(`wu-current-profile-${shape}-`);
      try {
        const { record, resultPath, submitted } = claimAndSubmitWorkUnit(bundleDir);
        assert.equal(submitted.ok, true, shape);
        const retired = mutateProfile(bundleDir, record, shape);
        const before = authoritySnapshot(bundleDir, retired);

        const profile = classifyCompleteCurrentWorkUnitProfile(bundleDir, retired);
        assert.equal(profile.ok, false, shape);
        assert.equal(profile.reason_code, 'unsupported_current_contract', shape);
        assert.equal(profile.unsupported_discriminator, discriminator, shape);

        const disposition = projectWorkUnitAttemptDisposition(bundleDir, retired);
        assert.equal(disposition.coverage.disposition, 'unsupported_current_contract', shape);
        assert.equal(disposition.coverage.root_code, 'unsupported_current_contract', shape);
        assert.equal(disposition.identity.execution_actor_class, undefined, shape);

        const preflight = timeoutPreflightWorkUnit(bundleDir, { work_id: retired.work_id });
        assert.equal(preflight.recommended_action, 'block', shape);
        assert.match(preflight.inspect.join('\n'), /unsupported current work-unit contract/, shape);

        const supersession = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: retired.work_id });
        assert.equal(supersession.eligible, false, shape);
        assert.equal(supersession.reason_code, 'unsupported_current_contract', shape);

        assert.throws(
          () => readSubmittedWorkUnitDeclarations(bundleDir),
          /unsupported current work-unit contract/,
          shape,
        );
        const inspected = inspectWorkUnits(bundleDir);
        assert.equal(inspected.actor_projection.length, 0, shape);
        assert.match(inspected.inspect.join('\n'), /unsupported current work-unit contract/, shape);

        const rejected = submitWorkUnit(bundleDir, { work_id: retired.work_id, resultPath });
        assert.equal(rejected.ok, false, shape);
        assert.equal(rejected.reason_code, 'unsupported_current_contract', shape);
        assert.deepEqual(authoritySnapshot(bundleDir, retired), before, shape);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });
});
