// @impl AGQ-013, DEW-004, DEW-014, DEW-025, SNC-006, RWG-018, WAI-007

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { makeItem } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { createWorkUnit } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

const ROOT = process.cwd();
const WHITELIST = [
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-schemas.md',
  'DEEP_RESEARCH_HARNESS/COMMANDS.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-evidence-extractor.md',
];

function text(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('generated direct-output guidance', () => {
  it('projects exact assignment facts and keeps dry-submit with the Phase Agent', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'work-unit-guidance-'));
    try {
      const queueItem = makeItem({
        queue_item_id: 'queue-source-topic-a',
        title: 'Source intake topic A',
        targets: {
          controller: 'main-agent',
          delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 },
        },
        kind: 'wave0_source_intake',
        producer_rule: 'source_intake_fan_in',
        payload: {
          wave: 0,
          topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
          topic_slug: 'topic-a',
        },
        required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
        writes_to: ['artifacts/wave0/topic-a/source.yaml'],
      });
      const { manifest } = createWorkUnit(dir, { queueItem, wave: 0 });
      const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf8');
      assert.match(task, /assignment_contract_version:\s*`?work-unit\.assignment\.v3/);
      assert.match(task, /artifacts\/wave0\/topic-a\/source\.yaml/);
      assert.match(task, /source_yaml/);
      assert.match(task, /wave0\.source-metadata-array\.v1/);
      assert.doesNotMatch(task, /reference\/00-shared-/);
      assert.doesNotMatch(task, /"role": "reference"/);
      assert.match(task, /verify every assigned required output.*before.*work_done/is);
      assert.match(task, /Phase Agent.*dry-submit.*after.*actor.*return/is);
      assert.match(task, /formal submit.*only.*acceptance|formal submit.*success owner/is);
      assert.doesNotMatch(task, /edit.*direct_contract|choose.*direct_contract|actor.*select.*contract/is);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('approved production Markdown owners', () => {
  it('phase-wave1 authors explicit primary and supplementary assignment intent', () => {
    const content = text(WHITELIST[0]);
    assert.match(content, /assignment_mode.*primary/is);
    assert.match(content, /assignment_mode.*supplementary/is);
    assert.match(content, /primary.*evidence-summary\.md.*question-list\.md/is);
    assert.match(content, /supplementary.*required_receipts.*empty|supplementary.*`required_receipts`.*\[\]/is);
    assert.match(content, /semantic_contract:<primary_root_code>/);
    assert.match(content, /fresh.*queue_item_id|new.*queue_item_id/is);
  });

  it('shared protocol preserves actor provenance and the candidate checkpoint boundary', () => {
    const content = text(WHITELIST[1]);
    assert.match(content, /required_outputs/);
    assert.match(content, /direct_contract/);
    assert.match(content, /work_done/);
    assert.match(content, /dry-submit/);
    assert.match(content, /formal submit.*acceptance|submit.*success authority/is);
    assert.match(content, /fail_and_replace|fail.*replacement/is);
    assert.doesNotMatch(content, /Phase Agent[^.\n]*author[^.\n]*missing[^.\n]*semantic/i);
  });

  it('shared schemas document assignment fields without making them actor-fillable', () => {
    const content = text(WHITELIST[2]);
    assert.match(content, /assignment_contract_version/);
    assert.match(content, /required_outputs/);
    assert.match(content, /direct_contract/);
    assert.match(content, /assignment_mode/);
    assert.match(content, /Engine-owned|read-only|not actor-fillable/is);
  });

  it('COMMANDS exposes the narrow repair and existing candidate loop', () => {
    const content = text(WHITELIST[3]);
    assert.match(content, /operate-queue\.mjs repair.*--queue-item-id.*--set-assignment-mode/is);
    assert.match(content, /operate-work-unit\.mjs dry-submit/);
    assert.match(content, /formal submit.*success|submit.*acceptance/is);
    assert.match(content, /mode-absent|missing.*assignment_mode/is);
  });
});

describe('direct-contract inventory whitelist', () => {
  it('keeps every other phase, role, and shared node free of duplicated closed inventory outside the canonical rich Wave1 role template', async () => {
    const { readdir } = await import('node:fs/promises');
    const nodeRoot = path.join(ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes');
    const files = await readdir(nodeRoot, { recursive: true });
    const forbidden = /assignment_contract_version|required_outputs|direct_contract|set-assignment-mode|wave0\.source-metadata-array\.v1|wave1\.evidence-summary\.v1|wave1\.question-list\.v1/;
    const violations = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join('DEEP_RESEARCH_HARNESS/workflows/nodes', file))
      .filter((file) => !WHITELIST.includes(file))
      .filter((file) => forbidden.test(text(file)));
    assert.deepEqual(violations, []);
  });
});
