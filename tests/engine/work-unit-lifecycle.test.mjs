// @impl DEW-002, DEW-004, FRE-005

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  WorkUnitBeaconSchema,
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
} from '../../DPT_FRAMEWORK/schema/contracts/work-unit.mjs';
import {
  createWorkUnit,
  loadWorkUnitIndex,
  saveWorkUnitIndex,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function queueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-source-topic-a',
    title: 'Source intake topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: 'topic-a' },
    ...overrides,
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function resultStarterFromTask(task) {
  const match = task.match(/### Result JSON Starter[\s\S]*?```json\s+([\s\S]*?)\s+```/);
  assert.ok(match, 'task must contain one Result JSON Starter block');
  return JSON.parse(match[1]);
}

function queueItemForKind(kind, overrides = {}) {
  if (kind === 'wave1_topic_deepening') {
    return queueItem({
      queue_item_id: 'wave1-topic-a',
      title: 'Deepen topic A',
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
      kind,
      producer_rule: 'topic_deepening',
      payload: { topic_slug: 'topic-a', wave: 1 },
      ...overrides,
    });
  }
  if (kind === 'wave2_targeted_evidence') {
    return queueItem({
      queue_item_id: 'wave2-targeted-finding-a',
      title: 'Targeted evidence finding A',
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-topic-scout', timeout_ms: 600000 } },
      kind,
      producer_rule: 'targeted_evidence_search',
      payload: { finding_id: 'W2F-001', wave: 2 },
      ...overrides,
    });
  }
  return queueItem(overrides);
}

const retiredAuthorityPattern = new RegExp([
  '_sub' + 'agents',
  'drive-' + 're' + 'lay' + '-sl' + 'ot',
  'Sl' + 'ot' + 'Result',
].join('|'));

describe('work-unit index and envelope', () => {
  it('projects one current assignment binding and one starter default across every envelope surface', () => {
    const currentCases = [
      {
        wave: 0,
        item: queueItem({
          required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
          writes_to: ['artifacts/wave0/topic-a/source.yaml'],
          payload: {
            wave: 0,
            topic_uid: 'tp_00000001-0000-4000-8000-000000000000',
            topic_slug: 'topic-a',
          },
        }),
        expected: [{
          path: 'artifacts/wave0/topic-a/source.yaml',
          role: 'source_yaml',
          direct_contract: 'wave0.source-metadata-array.v1',
        }],
      },
      {
        wave: 2,
        item: queueItemForKind('wave2_targeted_evidence', { required_receipts: [] }),
        expected: [],
      },
    ];

    for (const testCase of currentCases) {
      const dir = tempBundle();
      try {
        const { record, manifest } = createWorkUnit(dir, { queueItem: testCase.item, wave: testCase.wave });
        const beacon = readJson(path.join(dir, manifest.paths.beacon_ref));
        const schema = readJson(path.join(dir, manifest.paths.result_schema_ref));
        const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf8');
        const starter = resultStarterFromTask(task);

        assert.equal(record.assignment_contract_version, 'work-unit.assignment.v2');
        assert.equal(manifest.assignment_contract_version, 'work-unit.assignment.v2');
        assert.equal(beacon.assignment_contract_version, 'work-unit.assignment.v2');
        assert.deepEqual(manifest.output_contract.required_outputs, testCase.expected);
        assert.deepEqual(beacon.output_contract, manifest.output_contract);
        assert.deepEqual(schema.properties.output_files.default, testCase.expected.map(({ path: outputPath, role }) => ({ path: outputPath, role })));
        assert.deepEqual(starter.output_files, schema.properties.output_files.default);
        assert.doesNotThrow(() => WorkUnitResultSchema.parse(starter));

        const branches = schema.properties.output_files.allOf || [];
        const itemBranches = schema.properties.output_files.items.allOf || [];
        assert.equal(branches.length, testCase.expected.length);
        assert.equal(itemBranches.length, testCase.expected.length);
        testCase.expected.forEach((required, index) => {
          assert.deepEqual(branches[index], {
            contains: {
              type: 'object',
              properties: {
                path: { const: required.path },
                role: { const: required.role },
              },
              required: ['path', 'role'],
            },
            minContains: 1,
            maxContains: 1,
          });
          assert.deepEqual(itemBranches[index], {
            if: {
              properties: { path: { const: required.path } },
              required: ['path'],
            },
            then: {
              properties: { role: { const: required.role } },
            },
          });
        });
      } finally {
        cleanup(dir);
      }
    }
  });

  it('accepts genuine legacy marker absence but rejects partial or unknown current bindings', () => {
    const dir = tempBundle();
    try {
      const { manifest } = createWorkUnit(dir, {
        queueItem: queueItem({
          required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
          payload: {
            wave: 0,
            topic_uid: 'tp_00000001-0000-4000-8000-000000000000',
            topic_slug: 'topic-a',
          },
        }),
        wave: 0,
      });
      const beacon = readJson(path.join(dir, manifest.paths.beacon_ref));

      const legacyManifest = structuredClone(manifest);
      delete legacyManifest.assignment_contract_version;
      delete legacyManifest.output_contract.required_outputs;
      assert.ok(WorkUnitManifestSchema.safeParse(legacyManifest).success);

      const legacyBeacon = structuredClone(beacon);
      delete legacyBeacon.assignment_contract_version;
      delete legacyBeacon.output_contract.required_outputs;
      assert.ok(WorkUnitBeaconSchema.safeParse(legacyBeacon).success);

      const markerOnly = structuredClone(manifest);
      delete markerOnly.output_contract.required_outputs;
      assert.equal(WorkUnitManifestSchema.safeParse(markerOnly).success, false);

      const contractOnly = structuredClone(manifest);
      delete contractOnly.assignment_contract_version;
      assert.equal(WorkUnitManifestSchema.safeParse(contractOnly).success, false);

      assert.equal(WorkUnitBeaconSchema.safeParse({
        ...beacon,
        assignment_contract_version: 'work-unit.assignment.v999',
      }).success, false);
    } finally {
      cleanup(dir);
    }
  });

  it('allocates index record and writes envelope surfaces', () => {
    const dir = tempBundle();
    try {
      const { record, manifest } = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const canonicalBundleDir = path.resolve(dir);
      assert.match(record.work_id, /^wu-w0-b000-src-i0001$/);
      assert.equal(record.queue_item_id, 'queue-source-topic-a');
      assert.equal(record.status, 'claimed');
      assert.equal(record.queue_item_snapshot_hash, manifest.queue_item_snapshot_hash);
      for (const ref of [
        manifest.paths.manifest_ref,
        manifest.paths.task_ref,
        manifest.paths.result_schema_ref,
        manifest.paths.beacon_ref,
        manifest.paths.runtime_receipt_ref,
        manifest.paths.status_ref,
        manifest.paths.agent_ref,
      ]) {
        assert.ok(readFileSync(path.join(dir, ref), 'utf-8') !== undefined);
      }
      const index = loadWorkUnitIndex(dir);
      assert.equal(index.status_counts.claimed, 1);
      assert.equal(index.inspect_projection.total, 1);

      const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf-8');
      assert.match(task, /## Completion Contract/);
      assert.match(task, /### Binding And Result/);
      assert.match(task, /### Required Outputs/);
      assert.match(task, /### Cache And Source Facts/);
      assert.match(task, /### Lifecycle Receipt And Handoff/);
      assert.match(task, /### Verify Before Return/);
      assert.match(task, new RegExp(path.join(dir, manifest.paths.result_ref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(task, /page\.md must contain fetched page content or an explicit degraded\/fetch-failure record/);
      assert.match(task, /Declare cache_trails as bundle-relative cache leaf directory paths/);
      assert.match(task, /work_started/);
      assert.ok(task.includes(`bundle_dir: \`${canonicalBundleDir}\``));
      assert.ok(task.includes(`operate-work-unit.mjs dry-submit "${canonicalBundleDir}"`));
      assert.match(task, new RegExp(record.work_id));
      assert.match(task, new RegExp(record.queue_item_id));
      assert.doesNotMatch(task, retiredAuthorityPattern);

      const beacon = JSON.parse(readFileSync(path.join(dir, manifest.paths.beacon_ref), 'utf-8'));
      assert.equal(beacon.work_id, record.work_id);
      assert.equal(beacon.queue_item_id, record.queue_item_id);
      assert.equal(beacon.kind, record.kind);
      assert.equal(beacon.receipt_nonce, record.receipt_nonce);
      assert.equal(beacon.bundle_dir, canonicalBundleDir);
      assert.equal(beacon.runtime_refs_authority, 'diagnostic_only');
      assert.deepEqual(beacon.required_receipt_fields, ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']);
      assert.ok(beacon.output_contract.output_files.required);
      assert.equal(beacon.cache_policy.authority, 'verified_during_submit');
    } finally {
      cleanup(dir);
    }
  });

  it('generates a spawn prompt from manifest bindings and kind contract', () => {
    const dir = tempBundle();
    try {
      const { record, manifest, spawn_prompt } = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      assert.ok(spawn_prompt.includes(`Active bundle_dir: ${path.resolve(dir)}`));
      assert.match(spawn_prompt, new RegExp(record.work_id));
      assert.match(spawn_prompt, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(spawn_prompt, new RegExp(manifest.paths.task_ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(spawn_prompt, /begin at ## Completion Contract/);
      assert.match(spawn_prompt, /sole attempt-bound authoring entry/);
      assert.doesNotMatch(spawn_prompt, /runtime-receipt\.jsonl/);
      assert.doesNotMatch(spawn_prompt, /result\.schema\.json/);
      assert.doesNotMatch(spawn_prompt, /runtime_refs diagnostic metadata/);
      assert.doesNotMatch(spawn_prompt, retiredAuthorityPattern);
    } finally {
      cleanup(dir);
    }
  });

  it('carries a queue-owned local-only task brief into the immutable envelope', () => {
    const dir = tempBundle();
    try {
      const localOnlyBrief = 'Use only _fixtures/case-406-local-source.md. Do not invoke WebSearch or WebFetch.';
      const { manifest } = createWorkUnit(dir, {
        queueItem: queueItem({ payload: { topic_slug: 'topic-a', wave: 0, task_brief: localOnlyBrief } }),
        wave: 0,
      });
      const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf-8');
      assert.equal(manifest.task_brief, localOnlyBrief);
      assert.match(task, /Use only _fixtures\/case-406-local-source\.md/);
      assert.match(task, /Do not invoke WebSearch or WebFetch/);
    } finally {
      cleanup(dir);
    }
  });

  it('generates truthful result schemas for wave0, wave1, and wave2 kind contracts', () => {
    const cases = [
      {
        wave: 0,
        kind: 'wave0_source_intake',
        roles: ['source_yaml'],
        sourceClaimsAllowed: false,
      },
      {
        wave: 1,
        kind: 'wave1_topic_deepening',
        roles: ['reference', 'evidence_summary', 'question_list', 'other'],
        sourceClaimsAllowed: true,
      },
      {
        wave: 2,
        kind: 'wave2_targeted_evidence',
        roles: ['reference', 'evidence_summary', 'other'],
        sourceClaimsAllowed: false,
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        const { record, manifest, spawn_prompt } = createWorkUnit(dir, {
          queueItem: queueItemForKind(testCase.kind),
          wave: testCase.wave,
        });
        const schema = readJson(path.join(dir, manifest.paths.result_schema_ref));
        const beacon = readJson(path.join(dir, manifest.paths.beacon_ref));
        const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf-8');

        assert.equal(schema.properties.work_id.const, record.work_id, testCase.kind);
        assert.equal(schema.properties.queue_item_id.const, record.queue_item_id, testCase.kind);
        assert.equal(schema.properties.kind.const, record.kind, testCase.kind);
        assert.equal(schema.properties.receipt_nonce.const, record.receipt_nonce, testCase.kind);
        assert.deepEqual(schema.required, manifest.output_contract.required_result_fields, testCase.kind);
        assert.equal(schema.required.includes('summary'), false, testCase.kind);
        assert.equal(schema.properties.summary.default, '', testCase.kind);

        assert.deepEqual(schema.properties.output_files.items.required, ['path', 'role'], testCase.kind);
        assert.equal(schema.properties.output_files.items.additionalProperties, false, testCase.kind);
        assert.deepEqual(Object.keys(schema.properties.output_files.items.properties).sort(), ['path', 'role', 'source_slug', 'source_url'], testCase.kind);
        assert.deepEqual(schema.properties.output_files.items.properties.role.enum, testCase.roles, testCase.kind);
        assert.deepEqual(manifest.output_contract.output_files.allowed_roles, testCase.roles, testCase.kind);

        assert.deepEqual(beacon.output_contract, manifest.output_contract, testCase.kind);
        assert.deepEqual(beacon.cache_policy, manifest.cache_policy, testCase.kind);
        assert.match(task, new RegExp(record.work_id), testCase.kind);
        assert.match(task, new RegExp(record.queue_item_id), testCase.kind);
        assert.match(task, new RegExp(record.receipt_nonce.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), testCase.kind);
        assert.match(spawn_prompt, new RegExp(record.work_id), testCase.kind);
        assert.match(spawn_prompt, /Completion Contract/, testCase.kind);

        if (testCase.sourceClaimsAllowed) {
          assert.ok(schema.properties.source_claims, testCase.kind);
          assert.ok(schema.properties.accepted_source_urls, testCase.kind);
          const claimSchema = schema.properties.source_claims.items;
          assert.equal(claimSchema.additionalProperties, false, testCase.kind);
          assert.deepEqual(Object.keys(claimSchema.properties).sort(), [
            'acceptance_status',
            'cache_trail_refs',
            'degraded_capture_ref',
            'is_new_vs_wave0',
            'source_ref',
            'url',
          ], testCase.kind);
          assert.deepEqual(claimSchema.required, ['url', 'source_ref', 'acceptance_status', 'is_new_vs_wave0'], testCase.kind);
          assert.match(task, /source_claims\[\]/, testCase.kind);
        } else {
          assert.equal(Object.hasOwn(schema.properties, 'source_claims'), false, testCase.kind);
          assert.equal(Object.hasOwn(schema.properties, 'accepted_source_urls'), false, testCase.kind);
          assert.doesNotMatch(task, /source_claims\[\]|accepted_source_urls\[\]/, testCase.kind);
        }
      } finally {
        cleanup(dir);
      }
    }
  });

  it('derives one copy-ready Result JSON Starter and checklist from the active schema and kind contract', () => {
    const cases = [
      { wave: 0, kind: 'wave0_source_intake', roleKey: 'dpt-source-intake' },
      { wave: 1, kind: 'wave1_topic_deepening', roleKey: 'dpt-evidence-extractor' },
      { wave: 2, kind: 'wave2_targeted_evidence', roleKey: 'dpt-topic-scout' },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        const { record, manifest } = createWorkUnit(dir, {
          queueItem: queueItemForKind(testCase.kind),
          wave: testCase.wave,
          actor_execution: {
            execution_actor_class: 'delegated_subagent',
            delegated_role_key: testCase.roleKey,
            observation: {
              outcome: 'available',
              source: 'native_probe',
              role_key: testCase.roleKey,
              reason_code: 'probe_succeeded',
              recorded_at: '2026-07-14T00:00:00.000Z',
            },
            policy_decision: 'normal_allowed',
            fallback_from: null,
          },
        });
        const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf-8');
        const schema = readJson(path.join(dir, manifest.paths.result_schema_ref));
        const starter = resultStarterFromTask(task);

        assert.deepEqual(Object.keys(starter).sort(), Object.keys(schema.properties).sort(), testCase.kind);
        assert.equal(starter.schema_version, schema.properties.schema_version.const, testCase.kind);
        assert.equal(starter.work_id, record.work_id, testCase.kind);
        assert.equal(starter.queue_item_id, record.queue_item_id, testCase.kind);
        assert.equal(starter.kind, record.kind, testCase.kind);
        assert.equal(starter.receipt_nonce, record.receipt_nonce, testCase.kind);
        assert.equal(starter.actor_contract_version, record.actor_contract_version, testCase.kind);
        assert.equal(starter.execution_actor_class, record.actor_execution.execution_actor_class, testCase.kind);
        assert.equal(Object.hasOwn(starter, 'actor_execution'), false, testCase.kind);
        assert.doesNotThrow(() => WorkUnitResultSchema.parse(starter), testCase.kind);
        assert.equal(existsSync(path.join(dir, manifest.paths.result_ref)), false, testCase.kind);

        assert.ok(task.includes(`Result schema requires: ${schema.required.join(', ')}`), testCase.kind);
        assert.ok(task.includes(`Allowed fields: ${Object.keys(schema.properties).join(', ')}`), testCase.kind);
        assert.match(task, /Required cache leaves: `websearch\.json`, `page\.md`, `meta\.json`/, testCase.kind);
        assert.match(task, /Formal submit is the only normal first-acceptance owner/, testCase.kind);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('fails envelope generation before assigned files when the current output contract cannot generate the enforced result schema', () => {
    const dir = tempBundle();
    try {
      assert.throws(() => createWorkUnit(dir, {
        queueItem: queueItem({
          payload: {
            topic_slug: 'topic-a',
            output_contract: {
              required_result_fields: ['work_id', 'unknown_result_field'],
              output_files: { required: true, allowed_roles: [] },
            },
          },
        }),
        wave: 0,
      }), /output contract|unknown_result_field|allowed_roles/i);
      assert.equal(existsSync(path.join(dir, '_work_units', 'wave0')), false);
    } finally {
      cleanup(dir);
    }
  });

  it('validates prior submitted source roles as a unique allowed subset on source-claim contracts', () => {
    const validDir = tempBundle();
    try {
      const valid = createWorkUnit(validDir, {
        queueItem: queueItemForKind('wave1_topic_deepening'),
        wave: 1,
      });
      assert.deepEqual(valid.manifest.output_contract.source_claims.prior_submitted_output_roles, ['evidence_summary']);

      for (const [label, roles, sourceClaimsAllowed = true] of [
        ['duplicate', ['evidence_summary', 'evidence_summary'], true],
        ['not-allowed-output-role', ['source_yaml'], true],
        ['source-claims-disabled', ['evidence_summary'], false],
      ]) {
        const dir = tempBundle();
        try {
          assert.throws(() => createWorkUnit(dir, {
            queueItem: queueItemForKind('wave1_topic_deepening', {
              payload: {
                topic_slug: 'topic-a',
                output_contract: {
                  required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
                  output_files: {
                    required: true,
                    allowed_roles: ['reference', 'evidence_summary', 'question_list', 'other'],
                    reference_requires_source_url: true,
                  },
                  source_claims: {
                    allowed: sourceClaimsAllowed,
                    accepted_requires_cache_or_degraded: true,
                    prior_submitted_output_roles: roles,
                  },
                },
              },
            }),
            wave: 1,
          }), new RegExp(`prior_submitted_output_roles|${label}`, 'i'));
          assert.equal(existsSync(path.join(dir, '_work_units', 'wave1')), false, label);
        } finally {
          cleanup(dir);
        }
      }
    } finally {
      cleanup(validDir);
    }
  });

  it('increments attempt_index for retry of the same queue demand', () => {
    const dir = tempBundle();
    try {
      const first = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const index = loadWorkUnitIndex(dir);
      index.work_units[first.record.work_id].status = 'timed_out';
      saveWorkUnitIndex(dir, index);
      const second = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      assert.equal(second.record.attempt_index, 2);
      assert.equal(second.record.claim_index, 2);
      assert.notEqual(second.record.work_id, first.record.work_id);
    } finally {
      cleanup(dir);
    }
  });
});
