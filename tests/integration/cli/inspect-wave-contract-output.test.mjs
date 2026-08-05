// @impl IOC-001, IOC-002, IOC-003, IOC-005, RWG-018
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { cleanupAll, createTempDir } from '../../helpers/temp-dirs.mjs';

const REPO_ROOT = process.cwd();
const CLIS = ['inspect-wave0-output.mjs', 'inspect-wave1-output.mjs', 'inspect-wave2-output.mjs'];
const TOPIC_UID = 'tp_11111111-1111-4111-8111-111111111111';

after(cleanupAll);

function writeBundle() {
  const bundle = createTempDir('inspect-wave-contract');
  for (const directory of [
    'reference',
    'seed_topics',
    'artifacts/wave0/topic-a',
    'artifacts/wave1/topic-a',
    'artifacts/wave2',
    '_logs',
    '_checkpoints',
    '_diagnostics',
    '_handoff',
  ]) mkdirSync(join(bundle, directory), { recursive: true });

  writeFileSync(join(bundle, 'rb_plan.md'), [
    '---',
    'plan_basename: inspect-contract',
    'derived_topic_count: 1',
    'topic_registry:',
    `  - topic_uid: ${TOPIC_UID}`,
    '    id: t1',
    '    slug: topic-a',
    '    title: Topic A',
    '---',
    '# Plan',
  ].join('\n'));
  writeFileSync(join(bundle, 'rb_profile.yaml'), 'research_style_params:\n  wave0_shared_ref_total: 1\n  wave0_per_topic_source_floor: 1\n  wave1_per_topic_ref_floor: 1\n  topic_unique_ratio: 1\n  p0p1_independent_backing: 2\n');
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({ bundle: 'inspect-contract', current_gate: 'wave0_complete', next_gate: 'wave1_complete' }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  writeFileSync(join(bundle, 'rb_output_declarations.jsonl'), '');
  writeFileSync(join(bundle, '_logs/run.log'), 'sentinel log\n');
  writeFileSync(join(bundle, '_checkpoints/sentinel.json'), '{"sentinel":true}\n');
  writeFileSync(join(bundle, '_diagnostics/sentinel.json'), '{"sentinel":true}\n');
  writeFileSync(join(bundle, '_handoff/witness.json'), '{"sentinel":true}\n');
  writeFileSync(join(bundle, 'reference/README.md'), '');
  writeFileSync(join(bundle, 'reference/_INDEX.md'), '| ref_file |\n| --- |\n');
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), 'not: an-array\n');
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), '# Topic A\n');
  return bundle;
}

function completeReference(bindingLine) {
  return [
    '- source_url: https://example.com/reference',
    '- acceptance_status: accepted',
    '- source_type: secondary',
    '- tier: Tier 2',
    '- evidence_role: foundation',
    '- trust_level: practitioner',
    '- why_it_matters: Shared contract coverage.',
    '- accessed_at: 2026-07-14',
    bindingLine,
    '',
    '## Key Facts',
    '- Fact',
    '## Core Content Capture',
    'Capture',
    '## Relevance To This Research',
    'Relevant',
    '## Quotable Terms / Concepts',
    'Concept',
    '## Risks And Limitations',
    'Risk',
  ].join('\n');
}

function snapshot(root) {
  const entries = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(directory, entry.name);
      const relPath = relative(root, path);
      if (entry.isDirectory()) {
        entries.push(`D:${relPath}`);
        walk(path);
      } else if (entry.isFile()) {
        const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
        entries.push(`F:${relPath}:${hash}`);
      }
    }
  }
  walk(root);
  return entries;
}

describe('wave inspect output and purity', () => {
  for (const cli of CLIS) {
    it(`${cli} preserves structured fields and writes nothing`, () => {
      const bundle = writeBundle();
      const before = snapshot(bundle);
      const result = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli', cli), '--bundle', bundle], { encoding: 'utf8', timeout: 10000 });
      assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
      const output = JSON.parse(result.stdout);
      assert.equal(typeof output.check.passed, 'boolean');
      assert.match(output.check.wave, /^wave[012]$/);
      assert.equal(typeof output.check.checks_run, 'number');
      assert.equal(typeof output.check.checks_failed, 'number');
      assert.ok(['blocking', 'diagnostic-only'].includes(output.check.return_map_classification));
      assert.ok(Array.isArray(output.check.failed_rule_ids));
      assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('configuration_integrity:')), false, JSON.stringify(output));
      assert.ok(Array.isArray(output.check.finding_classification.blocking));
      assert.ok(Array.isArray(output.inspect));
      assert.ok(Array.isArray(output.advice));
      assert.ok(Array.isArray(output.hints));
      if (!output.check.passed) {
        assert.ok(output.hints.length > 0, JSON.stringify(output));
        for (const hint of output.hints) {
          assert.equal(typeof hint.rule_id, 'string');
          assert.equal(typeof hint.repair_kind, 'string');
          assert.equal(typeof hint.missing_fact, 'string');
          assert.equal(typeof hint.write_to, 'string');
          assert.match(hint.rerun, new RegExp(cli.replaceAll('.', '\\.')));
          assert.match(hint.rerun, new RegExp(bundle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        }
      }
      assert.equal(Object.hasOwn(output, 'routing'), false);
      assert.deepEqual(snapshot(bundle), before);
    });

    it(`${cli} uses exit code 2 when --bundle has no value`, () => {
      const result = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli', cli), '--bundle'], { encoding: 'utf8' });
      assert.equal(result.status, 2);
      const output = JSON.parse(result.stdout);
      assert.equal(output.check.passed, false);
      assert.equal(Object.hasOwn(output, 'routing'), false);
      assert.equal(output.hints.length, 1);
      assert.match(output.hints[0].missing_fact, /--bundle/);
      assert.match(output.hints[0].rerun, /--bundle <bundle-path>$/);
    });

    it(`${cli} treats standalone help and malformed bundle grammar as side-effect-free invocation handling`, () => {
      const bundle = writeBundle();
      const before = snapshot(bundle);
      const help = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli', cli), '--help'], { encoding: 'utf8', timeout: 10000 });
      assert.equal(help.status, 0, help.stderr || help.stdout);
      assert.match(help.stdout, /Usage:/);
      assert.deepEqual(snapshot(bundle), before);

      const bare = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli', cli), bundle], { encoding: 'utf8', timeout: 10000 });
      assert.equal(bare.status, 2, bare.stderr || bare.stdout);
      const output = JSON.parse(bare.stdout);
      assert.equal(output.check.passed, false);
      assert.equal(output.hints.length, 1);
      assert.match(output.hints[0].rerun, /--bundle <bundle-path>$/);
      assert.doesNotMatch(output.hints[0].rerun, new RegExp(bundle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.deepEqual(snapshot(bundle), before);
    });
  }

  it('Wave0 inspect accepts UID-only shared-reference binding without legacy-field advice', () => {
    const bundle = writeBundle();
    writeFileSync(join(bundle, 'reference/00-shared-topic-a.md'), completeReference(`- related_topic_uid: ${TOPIC_UID}`));
    const result = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs'), '--bundle', bundle], { encoding: 'utf8', timeout: 10000 });
    assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.inspect.some((line) => line.includes("missing required key 'related_topic'")), false, JSON.stringify(output));
  });

  it('Wave2 inspect accepts UID-only cross-reference binding without legacy-field advice', () => {
    const bundle = writeBundle();
    writeFileSync(join(bundle, 'reference/00-cross-topic-a.md'), completeReference(`- related_topic_uid: ${TOPIC_UID}`));
    const result = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs'), '--bundle', bundle], { encoding: 'utf8', timeout: 10000 });
    assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.inspect.some((line) => line.includes("missing expected key 'related_topic'")), false, JSON.stringify(output));
  });
});
