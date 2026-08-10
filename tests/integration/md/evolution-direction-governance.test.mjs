import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const GUIDELINES_ROOT = 'guidelines';
const CHARTER = 'guidelines/project-charter.md';
const SEMANTIC = 'guidelines/evolution-abstraction-semantic-precision.md';
const SIMPLE = 'guidelines/evolution-simple-reliable-control.md';
const HELPER = 'guidelines/evolution-helper-oriented-agent.md';
const TRIAD = [SEMANTIC, SIMPLE, HELPER];
const RETIRED_PATH = 'guidelines/simple-reliable-control.md';
const EXTERNAL_DEFERRED_AUTHORITIES = new Map([
  ['guidelines/change-feedback-loop.md', [
    'openspec/specs/governance/change-feedback-loop/spec.md',
    'openspec/governance/finalize-change-archive.mjs',
  ]],
]);
const CURRENT_CHANGE = 'openspec/changes/add-semantic-precision-evolution-direction';
const SELF = 'tests/integration/md/evolution-direction-governance.test.mjs';
const SCAN_ROOTS = [
  'guidelines',
  '_backlog/plans',
  '_backlog/bugs',
  'openspec/changes',
  'DEEP_RESEARCH_HARNESS',
  'tests',
];
const SCANNED_EXTENSIONS = new Set(['.md', '.mjs', '.js', '.json', '.yaml', '.yml']);
const COMPLETE_EWD_340_ARGUMENT_FOUR =
  'Argument four has to do with the way in which the amount of intellectual effort needed to design a program depends on the program length. It has been suggested that there is some kind of law of nature telling us that the amount of intellectual effort needed grows with the square of program length. But, thank goodness, no one has been able to prove this law. And this is because it need not be true. We all know that the only mental tool by means of which a very finite piece of reasoning can cover a myriad cases is called “abstraction”; as a result the effective exploitation of his powers of abstraction must be regarded as one of the most vital activities of a competent programmer. In this connection it might be worth-while to point out that the purpose of abstracting is not to be vague, but to create a new semantic level in which one can be absolutely precise. Of course I have tried to find a fundamental cause that would prevent our abstraction mechanisms from being sufficiently effective. But no matter how hard I tried, I did not find such a cause. As a result I tend to the assumption — up till now not disproved by experience — that by suitable application of our powers of abstraction, the intellectual effort needed to conceive or to understand a program need not grow more than proportional to program length. But a by-product of these investigations may be of much greater practical significance, and is, in fact, the basis of my fourth argument. The by-product was the identification of a number of patterns of abstraction that play a vital role in the whole process of composing programs. Enough is now known about these patterns of abstraction that you could devote a lecture to about each of them. What the familiarity and conscious knowledge of these patterns of abstraction imply dawned upon me when I realized that, had they been common knowledge fifteen years ago, the step from BNF to syntax-directed compilers, for instance, could have taken a few minutes instead of a few years. Therefore I present our recent knowledge of vital abstraction patterns as the fourth argument.';

function walk(relativePath, output = []) {
  if (relativePath === SELF || relativePath.startsWith(`${CURRENT_CHANGE}/`)) return output;
  if (relativePath.startsWith('openspec/changes/archive/')) return output;
  if (relativePath.startsWith('_backlog/_done/_closed_plans/')) return output;
  const absolutePath = join(REPO_ROOT, relativePath);
  if (!existsSync(absolutePath)) return output;
  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    if (SCANNED_EXTENSIONS.has(extname(relativePath))) output.push(relativePath);
    return output;
  }
  if (!stats.isDirectory()) return output;
  for (const entry of readdirSync(absolutePath)) {
    if (entry === '.git' || entry === 'node_modules' || entry.startsWith('.test-')) continue;
    walk(join(relativePath, entry), output);
  }
  return output;
}

function readRelative(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function readGuideline(relativePath) {
  const raw = readRelative(relativePath);
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(frontmatter, `${relativePath} must have YAML frontmatter`);
  return { raw, frontmatter: parseYaml(frontmatter[1]) };
}

function activeGuidelinePaths() {
  return readdirSync(join(REPO_ROOT, GUIDELINES_ROOT))
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .map((entry) => `${GUIDELINES_ROOT}/${entry}`);
}

function assertOrdered(items, expected, label) {
  let previousIndex = -1;
  for (const item of expected) {
    const index = items.indexOf(item);
    assert.ok(index >= 0, `${label} must include ${item}`);
    assert.ok(index > previousIndex, `${label} must order ${expected.join(' → ')}`);
    previousIndex = index;
  }
}

function assertIncreasing(indices, label) {
  let previousIndex = -1;
  for (const index of indices) {
    assert.ok(index >= 0, `${label} must include every current Evolution Direction`);
    assert.ok(index > previousIndex, `${label} must order semantic precision → simple control → helper responsibility`);
    previousIndex = index;
  }
}

function section(source, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm'));
  return match?.[1] ?? '';
}

function assertSameLayerNavigation(relativePath, source, heading) {
  const content = section(source, heading);
  if (!content) return;
  for (const forbidden of [
    /AGENTS\.md/,
    /openspec\/config\.yaml/,
    /openspec\/specs\//,
    /DEEP_RESEARCH_HARNESS\//,
    /experiments_(?:env|playbook)\//,
    /dpt_(?:rb|disp)_/,
  ]) assert.doesNotMatch(content, forbidden, `${relativePath} ${heading} must stay inside guidelines/`);

  for (const [, target] of content.matchAll(/\]\(([^)]+)\)/g)) {
    assert.match(target, /^[^/]+\.md(?:#.*)?$/, `${relativePath} ${heading} must link only to a same-layer Markdown file`);
  }
}

describe('Evolution Direction governance', () => {
  it('keeps the retired simple-control path out of active material', () => {
    assert.equal(existsSync(join(REPO_ROOT, RETIRED_PATH)), false);
    for (const path of [SEMANTIC, SIMPLE, HELPER]) assert.equal(existsSync(join(REPO_ROOT, path)), true);

    const violations = SCAN_ROOTS.flatMap((root) => walk(root)).filter((relativePath) =>
      readRelative(relativePath).includes(RETIRED_PATH));
    assert.deepEqual(violations, []);
  });

  it('preserves Dijkstra source context and a separate project interpretation', () => {
    const { raw, frontmatter } = readGuideline(SEMANTIC);
    assert.equal(frontmatter.title, 'Evolution Direction: Abstraction as Semantic Precision');
    assert.deepEqual(frontmatter.defers_to, [CHARTER]);
    assert.ok(raw.includes(COMPLETE_EWD_340_ARGUMENT_FOUR));
    assert.match(raw, /https:\/\/www\.cs\.utexas\.edu\/~EWD\/transcriptions\/EWD03xx\/EWD340\.html/);
    assert.match(raw, /### 这在本项目意味着什么/);
    assert.match(raw, /下文是本项目对原文的工程解读，不是 Dijkstra 的原话。/);
    assert.match(raw, /## 引入一个新东西之前，先退后一步/);
    assert.match(raw, /unknown|unresolved/);
  });

  it('keeps every effective guideline under one Charter root and ordered companion route', () => {
    const paths = activeGuidelinePaths();
    assert.ok(paths.length >= 12, 'the active suite should contain its full guidance set');

    const charter = readGuideline(CHARTER).frontmatter;
    assert.equal(Object.hasOwn(charter, 'defers_to'), false, 'Project Charter must not defer to another document');
    assertOrdered(charter.siblings, TRIAD, 'Project Charter siblings');

    for (const path of paths.filter((path) => path !== CHARTER)) {
      const { frontmatter } = readGuideline(path);
      const expectedDefersTo = [CHARTER, ...(EXTERNAL_DEFERRED_AUTHORITIES.get(path) || [])];
      assert.deepEqual(frontmatter.defers_to, expectedDefersTo, `${path} must defer only to its declared authorities`);
      if (EXTERNAL_DEFERRED_AUTHORITIES.has(path)) {
        assert.equal(Object.hasOwn(frontmatter, 'siblings'), false, `${path} is an external lifecycle route, not a companion guideline`);
        continue;
      }
      assert.equal(frontmatter.siblings[0], CHARTER, `${path} must put Project Charter first in siblings`);
      assertOrdered(
        frontmatter.siblings,
        TRIAD.filter((companion) => companion !== path),
        `${path} siblings`,
      );
    }
  });

  it('keeps constitutional navigation in the guidance suite', () => {
    for (const path of activeGuidelinePaths()) {
      const { raw } = readGuideline(path);
      for (const heading of ['Reading Order', 'Related Guidance', 'Decision Routes', 'Guidance Map']) {
        assertSameLayerNavigation(path, raw, heading);
      }
    }
  });

  it('routes relevant design through semantic precision, simple control, then helper responsibility', () => {
    const charter = readRelative(CHARTER);
    const index = readRelative('guidelines/README.md');
    const config = parseYaml(readRelative('openspec/config.yaml'));
    const configContext = String(config.context);

    for (const [label, source] of [['Charter', charter], ['Guidelines Index', index], ['OpenSpec config', configContext]]) {
      assertIncreasing([SEMANTIC, SIMPLE, HELPER].map((path) => source.indexOf(path)), `${label} triad`);
    }

    assert.ok(config.rules.proposal.some((rule) => String(rule).includes('semantic-precision reflection')));
    assert.ok(config.rules.design.some((rule) => String(rule).includes('semantic precision → simple reliable control → helper-oriented responsibility')));
    assert.doesNotMatch(`${charter}\n${index}\n${configContext}`, /exactly three|永久(?:固定|只有)三/);
  });
});
