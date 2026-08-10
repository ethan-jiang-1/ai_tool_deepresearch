import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const CONSTITUTION_ROOT = 'openspec/constitution';
const CHARTER = `${CONSTITUTION_ROOT}/project-charter.md`;
const SEMANTIC = `${CONSTITUTION_ROOT}/evolution/abstraction-semantic-precision.md`;
const SIMPLE = `${CONSTITUTION_ROOT}/evolution/simple-reliable-control.md`;
const HELPER = `${CONSTITUTION_ROOT}/evolution/helper-oriented-agent.md`;
const TRIAD = [SEMANTIC, SIMPLE, HELPER];
const MODEL_PATHS = [
  'openspec/guidance/models/framework-runtime-boundary.md',
  'openspec/guidance/models/agentic-execution-model.md',
  'openspec/guidance/models/agentic-workflow-mechanism.md',
  'openspec/guidance/models/agentic-queue-mechanism.md',
  'openspec/guidance/models/agentic-subagent-mechanism.md',
];
const OPERATION_DEFERRED_AUTHORITIES = new Map([
  ['openspec/operations/change-feedback-loop.md', [
    CHARTER,
    'openspec/specs/governance/change-feedback-loop/spec.md',
    'openspec/governance/finalize-change-archive.mjs',
  ]],
  ['openspec/operations/command-experiments.md', [CHARTER]],
  ['openspec/operations/logging-conventions.md', [CHARTER]],
]);
const LEGACY_GUIDANCE_ROOT = ['guide', 'lines'].join('');
const RETIRED_SIMPLE_PATH = `${CONSTITUTION_ROOT}/evolution/${['evolution', 'simple-reliable-control.md'].join('-')}`;
const COMPLETE_EWD_340_ARGUMENT_FOUR =
  'Argument four has to do with the way in which the amount of intellectual effort needed to design a program depends on the program length. It has been suggested that there is some kind of law of nature telling us that the amount of intellectual effort needed grows with the square of program length. But, thank goodness, no one has been able to prove this law. And this is because it need not be true. We all know that the only mental tool by means of which a very finite piece of reasoning can cover a myriad cases is called “abstraction”; as a result the effective exploitation of his powers of abstraction must be regarded as one of the most vital activities of a competent programmer. In this connection it might be worth-while to point out that the purpose of abstracting is not to be vague, but to create a new semantic level in which one can be absolutely precise. Of course I have tried to find a fundamental cause that would prevent our abstraction mechanisms from being sufficiently effective. But no matter how hard I tried, I did not find such a cause. As a result I tend to the assumption — up till now not disproved by experience — that by suitable application of our powers of abstraction, the intellectual effort needed to conceive or to understand a program need not grow more than proportional to program length. But a by-product of these investigations may be of much greater practical significance, and is, in fact, the basis of my fourth argument. The by-product was the identification of a number of patterns of abstraction that play a vital role in the whole process of composing programs. Enough is now known about these patterns of abstraction that you could devote a lecture to about each of them. What the familiarity and conscious knowledge of these patterns of abstraction imply dawned upon me when I realized that, had they been common knowledge fifteen years ago, the step from BNF to syntax-directed compilers, for instance, could have taken a few minutes instead of a few years. Therefore I present our recent knowledge of vital abstraction patterns as the fourth argument.';

function walk(relativePath, output = []) {
  const absolutePath = join(REPO_ROOT, relativePath);
  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    if (extname(relativePath) === '.md') output.push(relativePath);
    return output;
  }
  for (const entry of readdirSync(absolutePath)) walk(join(relativePath, entry), output);
  return output;
}

function readRelative(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function readGuidance(relativePath) {
  const raw = readRelative(relativePath);
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(frontmatter, `${relativePath} must have YAML frontmatter`);
  return { raw, frontmatter: parseYaml(frontmatter[1]) };
}

function assertOrdered(items, expected, label) {
  let previousIndex = -1;
  for (const item of expected) {
    const index = items.indexOf(item);
    assert.ok(index >= 0, `${label} must include ${item}`);
    assert.ok(index > previousIndex, `${label} must order ${expected.join(' -> ')}`);
    previousIndex = index;
  }
}

function assertIncreasing(indices, label) {
  let previousIndex = -1;
  for (const index of indices) {
    assert.ok(index >= 0, `${label} must include every current Evolution Direction`);
    assert.ok(index > previousIndex, `${label} must order semantic precision -> simple control -> helper responsibility`);
    previousIndex = index;
  }
}

function section(source, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm'));
  return match?.[1] ?? '';
}

function assertConstitutionNavigation(relativePath, source, heading) {
  const content = section(source, heading);
  if (!content) return;
  for (const [, targetWithFragment] of content.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^[a-z]+:\/\//i.test(targetWithFragment)) continue;
    const target = targetWithFragment.split('#')[0];
    const resolved = normalize(join(relativePath, '..', target));
    assert.ok(
      resolved === CONSTITUTION_ROOT || resolved.startsWith(`${CONSTITUTION_ROOT}/`),
      `${relativePath} ${heading} must stay within ${CONSTITUTION_ROOT}`,
    );
  }
}

describe('Evolution Direction governance', () => {
  it('uses the canonical constitution role without a duplicate legacy root', () => {
    assert.equal(existsSync(join(REPO_ROOT, LEGACY_GUIDANCE_ROOT)), false);
    assert.equal(existsSync(join(REPO_ROOT, RETIRED_SIMPLE_PATH)), false);
    assert.deepEqual(walk(CONSTITUTION_ROOT).sort(), [CHARTER, ...TRIAD].sort());
  });

  it('preserves Dijkstra source context and a separate project interpretation', () => {
    const { raw, frontmatter } = readGuidance(SEMANTIC);
    assert.equal(frontmatter.title, 'Evolution Direction: Abstraction as Semantic Precision');
    assert.deepEqual(frontmatter.defers_to, [CHARTER]);
    assert.ok(raw.includes(COMPLETE_EWD_340_ARGUMENT_FOUR));
    assert.match(raw, /https:\/\/www\.cs\.utexas\.edu\/~EWD\/transcriptions\/EWD03xx\/EWD340\.html/);
    assert.match(raw, /### 这在本项目意味着什么/);
    assert.match(raw, /下文是本项目对原文的工程解读，不是 Dijkstra 的原话。/);
    assert.match(raw, /## 引入一个新东西之前，先退后一步/);
    assert.match(raw, /unknown|unresolved/);
  });

  it('keeps the Charter triad constitutional and separates models and operations', () => {
    const charter = readGuidance(CHARTER).frontmatter;
    assert.equal(Object.hasOwn(charter, 'defers_to'), false, 'Project Charter must not defer to another document');
    assert.deepEqual(charter.siblings, TRIAD, 'Charter siblings must be exactly the ordered triad');

    for (const path of TRIAD) {
      const { frontmatter } = readGuidance(path);
      assert.deepEqual(frontmatter.defers_to, [CHARTER], `${path} must defer only to Charter`);
      assert.equal(frontmatter.siblings[0], CHARTER, `${path} must put Charter first in siblings`);
      assertOrdered(frontmatter.siblings, TRIAD.filter((companion) => companion !== path), `${path} siblings`);
    }

    for (const path of MODEL_PATHS) {
      const { frontmatter } = readGuidance(path);
      assert.match(frontmatter.role, /^non-authoritative system-understanding .*model/);
      assert.deepEqual(frontmatter.defers_to, [CHARTER]);
      assert.equal(Object.hasOwn(frontmatter, 'siblings'), false, `${path} must not be a constitutional peer`);
    }

    for (const [path, authorities] of OPERATION_DEFERRED_AUTHORITIES) {
      const { frontmatter } = readGuidance(path);
      assert.match(frontmatter.role, /operation guidance|review posture/);
      assert.deepEqual(frontmatter.defers_to, authorities, `${path} must retain its actual authority routes`);
      assert.equal(Object.hasOwn(frontmatter, 'siblings'), false, `${path} must not be a constitutional peer`);
    }
  });

  it('keeps constitutional navigation within the constitution role', () => {
    for (const path of walk(CONSTITUTION_ROOT)) {
      const { raw } = readGuidance(path);
      for (const heading of ['Reading Order', 'Related Guidance', 'Decision Routes', 'Guidance Map']) {
        assertConstitutionNavigation(path, raw, heading);
      }
    }
  });

  it('routes relevant design through semantic precision, simple control, then helper responsibility', () => {
    const charter = readRelative(CHARTER);
    const index = readRelative('openspec/README.md');
    const config = parseYaml(readRelative('openspec/config.yaml'));
    const configContext = String(config.context);

    assertIncreasing([SEMANTIC, SIMPLE, HELPER].map((path) => charter.indexOf(path)), 'Charter triad');
    assertIncreasing(
      [SEMANTIC, SIMPLE, HELPER]
        .map((path) => path.replace(/^openspec\//, ''))
        .map((path) => index.indexOf(path)),
      'OpenSpec Control Map triad',
    );
    assertIncreasing([SEMANTIC, SIMPLE, HELPER].map((path) => configContext.indexOf(path)), 'OpenSpec config triad');

    assert.ok(config.rules.proposal.some((rule) => String(rule).includes('semantic-precision reflection')));
    assert.ok(config.rules.design.some((rule) => String(rule).includes('semantic precision → simple reliable control → helper-oriented responsibility')));
    assert.doesNotMatch(`${charter}\n${index}\n${configContext}`, /exactly three|永久(?:固定|只有)三/);
  });
});
