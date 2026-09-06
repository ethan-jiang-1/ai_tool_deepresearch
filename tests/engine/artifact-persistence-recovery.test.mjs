// @impl ARP-004, ARP-005 — presentation revision (--polish), retire-final-version, self-contained evidence-details URL admission.
// Unit-class deterministic contract tests (no network, no real agent).

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  publishFinalReport,
  retireFinalVersion,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  sourceYamlContent,
  writeWave0Scaffold,
} from '../../experiments_env/shared/work-unit-playbook-utils.mjs';

const roots = [];

function createSubmittedBundle() {
  const bundle = mkdtempSync(path.join(tmpdir(), 'dpt-polish-unit-'));
  roots.push(bundle);
  writeWave0Scaffold(bundle, { syntheticWave0Trace: false });
  mkdirSync(path.join(bundle, 'final'), { recursive: true });
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    queue_item_id: 'polish-unit-wave0-source',
    topic_slug: 'topic-a',
    output_path: sourcePath,
    role: 'source_yaml',
    source_url: 'https://evidence.example.test/polish-unit/source',
    source_slug: 'polish-unit-source',
    output_content: sourceYamlContent({
      source_url: 'https://evidence.example.test/polish-unit/source',
      topic_slug: 'topic-a',
    }),
  });
  if (!submitted.submit.ok) throw new Error(`fixture submit failed: ${JSON.stringify(submitted.submit)}`);
  return { bundle, sourcePath };
}

const EVIDENCE_MAP_HEAD = '## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n';

function reportWithBacking(body, backing) {
  return `${body}\n\n${EVIDENCE_MAP_HEAD}| W2F-021 | test finding | ${backing} |\n`;
}

function writePrimary(bundle, name, body, sourcePath) {
  writeFileSync(path.join(bundle, 'final', name), reportWithBacking(body, `[submitted source](../${sourcePath})`));
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('publish-final-report --polish (presentation revision)', () => {
  it('CAS-updates the current latest primary without allocating a new version', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1 original', sourcePath);

    const staging = path.join(bundle, '_logs', 'polish-staging.md');
    writeFileSync(staging, reportWithBacking('# v1 polished', `[submitted source](../${sourcePath})`));

    const result = publishFinalReport({ bundlePath: bundle, sourcePath: staging, polish: true });
    assert.equal(result.verdict, 'committed', result.reason);
    assert.equal(result.version, 1);
    assert.equal(result.target, 'final/final_v1.md');
    assert.equal(existsSync(path.join(bundle, 'final', 'final_v2.md')), false);
    assert.match(readFileSync(path.join(bundle, 'final', 'final_v1.md'), 'utf8'), /# v1 polished/);
    const revisions = readFileSync(path.join(bundle, 'final', 'final_v1', 'REVISIONS.md'), 'utf8');
    assert.match(revisions, /## Revision /);
    assert.match(revisions, /prior_sha256:/);
    assert.match(revisions, /new_sha256:/);
  });

  it('rejects polish when no latest primary exists', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    const staging = path.join(bundle, '_logs', 'polish-staging.md');
    writeFileSync(staging, reportWithBacking('# nothing yet', `[submitted source](../${sourcePath})`));
    const result = publishFinalReport({ bundlePath: bundle, sourcePath: staging, polish: true });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'polish_requires_latest');
  });

  it('rejects polish whose backing admission fails', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    const staging = path.join(bundle, '_logs', 'bad-staging.md');
    writeFileSync(staging, '# no evidence map at all\n');
    const result = publishFinalReport({ bundlePath: bundle, sourcePath: staging, polish: true });
    assert.equal(result.verdict, 'blocked');
    assert.match(result.reason_code, /final_backing_|evidence_map/);
  });
});

describe('retire-final-version (human-controlled correction)', () => {
  it('retires only the current latest version and recomputes latest', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    writePrimary(bundle, 'final_v2.md', '# v2', sourcePath);

    const rejected = retireFinalVersion({ bundlePath: bundle, version: 1, requestedBy: 'user', userConfirmation: 'please retire version 1' });
    assert.equal(rejected.verdict, 'blocked');
    assert.equal(rejected.reason_code, 'retire_requires_latest');

    const ok = retireFinalVersion({ bundlePath: bundle, version: 2, requestedBy: 'user', userConfirmation: 'please retire version 2', reason: 'polish churn' });
    assert.equal(ok.verdict, 'committed', ok.reason);
    assert.equal(ok.latest_target, 'final/final_v1.md');
    assert.equal(existsSync(path.join(bundle, 'final', 'final_v2.md')), false);
    assert.equal(existsSync(path.join(bundle, 'final', 'attic', 'final_v2.md')), true);
    assert.equal(existsSync(path.join(bundle, 'final', 'attic', 'final_v2.retired.json')), true);

    const staging = path.join(bundle, '_logs', 'next.md');
    writeFileSync(staging, reportWithBacking('# v2 new', `[submitted source](../${sourcePath})`));
    const next = publishFinalReport({ bundlePath: bundle, sourcePath: staging });
    assert.equal(next.verdict, 'committed', next.reason);
    assert.equal(next.version, 2);
    assert.equal(next.target, 'final/final_v2.md');
    assert.equal(existsSync(path.join(bundle, 'final', 'attic', 'final_v2.md')), true);
  });

  it('rejects an Agent-initiated retire without an explicit user request', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    const result = retireFinalVersion({ bundlePath: bundle, version: 1, requestedBy: 'agent' });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'retire_requires_user_request');
  });

  it('rejects a user-flagged retire without a non-empty user confirmation', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    for (const userConfirmation of [null, undefined, '', '   ']) {
      const result = retireFinalVersion({ bundlePath: bundle, version: 1, requestedBy: 'user', userConfirmation });
      assert.equal(result.verdict, 'blocked');
      assert.equal(result.reason_code, 'retire_requires_user_request');
      assert.equal(existsSync(path.join(bundle, 'final', 'final_v1.md')), true, 'bundle must stay untouched');
    }
  });

  it('validates the retire request schema at the engine entry', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    assert.throws(
      () => retireFinalVersion({ bundlePath: bundle, version: 0, requestedBy: 'user', userConfirmation: 'retire it' }),
      (error) => error.name === 'ZodError',
    );
    assert.equal(existsSync(path.join(bundle, 'final', 'final_v1.md')), true, 'bundle must stay untouched');
  });

  it('blocks an auxiliary-directory collision with zero bundle mutation', () => {
    const { bundle, sourcePath } = createSubmittedBundle();
    writePrimary(bundle, 'final.md', '# v0', sourcePath);
    writePrimary(bundle, 'final_v1.md', '# v1', sourcePath);
    writePrimary(bundle, 'final_v2.md', '# v2', sourcePath);
    mkdirSync(path.join(bundle, 'final', 'final_v2'), { recursive: true });
    writeFileSync(path.join(bundle, 'final', 'final_v2', '07-evidence-details.md'), 'details\n');
    // A stale attic entry for the auxiliary directory forces the collision.
    mkdirSync(path.join(bundle, 'final', 'attic'), { recursive: true });
    writeFileSync(path.join(bundle, 'final', 'attic', 'final_v2'), 'stale\n');

    const before = bundleSnapshot(bundle);
    const result = retireFinalVersion({ bundlePath: bundle, version: 2, requestedBy: 'user', userConfirmation: 'retire version 2' });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'retire_aux_collision');
    assert.deepEqual(bundleSnapshot(bundle), before, 'a blocked retire must be zero-mutation');
    assert.equal(existsSync(path.join(bundle, 'final', 'final_v2.md')), true, 'primary stays in place');
  });

  function bundleSnapshot(bundle) {
    const entries = {};
    const visit = (absolute, relative) => {
      for (const entry of readdirSync(absolute, { withFileTypes: true })) {
        const childAbsolute = path.join(absolute, entry.name);
        const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) visit(childAbsolute, childRelative);
        else entries[childRelative] = readFileSync(childAbsolute).toString('base64');
      }
    };
    visit(bundle, '');
    return entries;
  }
});

describe('self-contained evidence-details URL admission', () => {
  it('rejects fabricated external URLs in auxiliary evidence-details', async () => {
    const { bundle } = createSubmittedBundle();
    writeFileSync(path.join(bundle, 'reference', 'r1.md'), '---\nsource_url: "https://www.cinn.cn/2025/08-28/xDLe9nOk.html"\nacceptance_status: accepted\n---\n');
    const { evaluateSelfContainedEvidenceDetails } = await import('../../DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs');
    const bad = evaluateSelfContainedEvidenceDetails({
      bundlePath: bundle,
      target: 'final/final_v1/details.md',
      markdown: '# Details\n\n- https://fabricated.example.com/not-real\n',
    });
    assert.equal(bad.check.passed, false);
    assert.equal(bad.inspect[0].code, 'evidence_details_url_unbacked');
    const good = evaluateSelfContainedEvidenceDetails({
      bundlePath: bundle,
      target: 'final/final_v1/details.md',
      markdown: '# Details\n\n- https://www.cinn.cn/2025/08-28/xDLe9nOk.html\n',
    });
    assert.equal(good.check.passed, true);
  });
});
