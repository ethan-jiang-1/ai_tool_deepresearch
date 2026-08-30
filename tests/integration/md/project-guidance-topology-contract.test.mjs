// @impl GCO-008
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CHARTER = 'openspec/constitution/project-charter.md';
const TRIAD = [
  'openspec/constitution/evolution/abstraction-semantic-precision.md',
  'openspec/constitution/evolution/simple-reliable-control.md',
  'openspec/constitution/evolution/helper-oriented-agent.md',
];
const MODELS = [
  'openspec/guidance/models/framework-runtime-boundary.md',
  'openspec/guidance/models/agentic-execution-model.md',
  'openspec/guidance/models/agentic-workflow-mechanism.md',
  'openspec/guidance/models/agentic-queue-mechanism.md',
  'openspec/guidance/models/agentic-subagent-mechanism.md',
];
const OPERATIONS = new Map([
  ['openspec/operations/change-feedback-loop.md', [
    CHARTER,
    'openspec/specs/governance/change-feedback-loop/spec.md',
    'openspec/governance/finalize-change-archive.mjs',
  ]],
  ['openspec/operations/command-experiments.md', [CHARTER]],
  ['openspec/operations/logging-conventions.md', [CHARTER]],
]);
const LINK_SURFACES = [
  CHARTER,
  'CONTEXT.md',
  'openspec/README.md',
  ...OPERATIONS.keys(),
];
const CURRENT_GUIDANCE_SURFACES = [
  ...LINK_SURFACES,
  ...MODELS,
  'AGENTS.md',
  'CLAUDE.md',
  'DEEP_RESEARCH_HARNESS/AGENTS.md',
  'DEEP_RESEARCH_HARNESS/CLAUDE.md',
  'openspec/config.yaml',
];
const LEGACY_ROOT = ['guide', 'lines'].join('');

function read(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function frontmatter(relativePath) {
  const match = read(relativePath).match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${relativePath} must retain YAML frontmatter`);
  return parseYaml(match[1]);
}

function section(relativePath, heading) {
  const source = read(relativePath);
  const marker = `## ${heading}\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${relativePath} must retain ${marker.trim()}`);
  const end = source.indexOf('\n## ', start + marker.length);
  return source.slice(start, end === -1 ? undefined : end);
}

function assertOrdered(source, relativePath, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `${relativePath} must retain ${marker}`);
    assert.ok(index > previous, `${relativePath} must order ${markers.join(' -> ')}`);
    previous = index;
  }
}

function assertInternalLinksResolve(relativePath) {
  const source = read(relativePath);
  for (const [, targetWithFragment] of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(?:[a-z]+:|#)/i.test(targetWithFragment)) continue;
    const target = targetWithFragment.split('#')[0].trim();
    if (!target) continue;
    const resolved = resolve(dirname(join(REPO_ROOT, relativePath)), target);
    const projectRelative = relative(REPO_ROOT, resolved);
    assert.ok(
      projectRelative === '' || (!projectRelative.startsWith(`..${sep}`) && projectRelative !== '..'),
      `${relativePath} links outside the repository: ${target}`,
    );
    assert.equal(existsSync(resolved), true, `${relativePath} has broken current link: ${target}`);
  }
}

describe('project guidance topology contract', () => {
  it('keeps the three canonical guidance role roots and their authority coordinates', () => {
    for (const path of [
      'openspec/constitution',
      'openspec/guidance/models',
      'openspec/operations',
      CHARTER,
      ...TRIAD,
      ...MODELS,
      ...OPERATIONS.keys(),
    ]) {
      assert.equal(existsSync(join(REPO_ROOT, path)), true, `${path} is the owned current guidance coordinate`);
    }

    const charter = frontmatter(CHARTER);
    assert.equal(Object.hasOwn(charter, 'defers_to'), false, `${CHARTER} must remain the constitutional root`);
    assert.deepEqual(charter.siblings, TRIAD, `${CHARTER} must retain the ordered constitutional triad`);

    for (const path of TRIAD) {
      const metadata = frontmatter(path);
      assert.deepEqual(metadata.defers_to, [CHARTER], `${path} must defer only to the Charter`);
    }
    for (const path of MODELS) {
      const metadata = frontmatter(path);
      assert.match(metadata.role, /^non-authoritative system-understanding .*model/, `${path} owns a model role`);
      assert.deepEqual(metadata.defers_to, [CHARTER], `${path} must retain its Charter authority coordinate`);
    }
    for (const [path, authorities] of OPERATIONS) {
      const metadata = frontmatter(path);
      assert.match(metadata.role, /operation guidance|review posture/, `${path} owns an operation role`);
      assert.deepEqual(metadata.defers_to, authorities, `${path} must retain its declared authority route`);
    }
  });

  it('keeps selected current Markdown links at their declared owner', () => {
    for (const path of LINK_SURFACES) assertInternalLinksResolve(path);
  });

  it('keeps paired entry pre-reads synchronized and Charter before Context', () => {
    const rootBlocks = ['AGENTS.md', 'CLAUDE.md'].map((path) => section(path, '0. Execution Brief'));
    assert.equal(rootBlocks[0], rootBlocks[1], 'root adapter pre-read block drift: repair AGENTS.md and CLAUDE.md together');
    for (const source of rootBlocks) assertOrdered(source, 'root adapter pre-read', [CHARTER, 'CONTEXT.md']);

    const harnessBlocks = ['DEEP_RESEARCH_HARNESS/AGENTS.md', 'DEEP_RESEARCH_HARNESS/CLAUDE.md']
      .map((path) => section(path, '共享项目上下文'));
    assert.equal(harnessBlocks[0], harnessBlocks[1], 'Harness adapter pre-read drift: repair the paired Harness entries');
    for (const source of harnessBlocks) {
      assertOrdered(source, 'Harness adapter pre-read', ['../openspec/constitution/project-charter.md', '../CONTEXT.md']);
    }
  });

  it('has no current legacy guidance mirror or selected live old-path reference', () => {
    assert.equal(existsSync(join(REPO_ROOT, LEGACY_ROOT)), false, 'retired guidance root must not return');
    assert.equal(existsSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/CONTEXT.md')), false, 'Harness must not gain a Context mirror');
    assert.equal(existsSync(join(REPO_ROOT, 'openspec/guidance/project-charter.md')), false, 'Charter must not gain a model mirror');

    const oldReference = new RegExp(`${LEGACY_ROOT}/`);
    for (const path of CURRENT_GUIDANCE_SURFACES) {
      assert.doesNotMatch(read(path), oldReference, `${path} retains a live old-path reference`);
    }
  });
});
