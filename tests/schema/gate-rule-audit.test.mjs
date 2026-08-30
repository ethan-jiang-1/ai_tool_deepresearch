// Derived active Gate contract audit.
// @impl GSK-003, GSK-011
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseGateDefinitionBytes,
  readGateDefinitionSnapshot,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FRAMEWORK_ROOT = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');
const DEFINITIONS_ROOT = join(FRAMEWORK_ROOT, 'schema', 'gate_definitions');
const CLI_ROOT = join(FRAMEWORK_ROOT, 'cli', 'gates');

function walk(root) {
  const files = [];
  for (const name of readdirSync(root).sort()) {
    const absolute = join(root, name);
    if (statSync(absolute).isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function activeDefinitions() {
  return readdirSync(DEFINITIONS_ROOT)
    .filter((name) => /^gate-.+\.definition\.json$/.test(name))
    .sort()
    .map((name) => {
      const gateKey = name.slice('gate-'.length, -'.definition.json'.length);
      const path = join(DEFINITIONS_ROOT, name);
      const snapshot = readGateDefinitionSnapshot(path);
      return { gateKey, name, path, ...snapshot };
    });
}

function activeGateClis() {
  return readdirSync(CLI_ROOT)
    .filter((name) => /^check-gate-.+\.mjs$/.test(name))
    .sort()
    .map((name) => ({
      gateKey: name.slice('check-gate-'.length, -'.mjs'.length),
      name,
      path: join(CLI_ROOT, name),
    }));
}

describe('derived active Gate audit', () => {
  it('keeps active definitions and independent Gate CLIs bijective', () => {
    const definitions = activeDefinitions();
    const clis = activeGateClis();
    assert.deepEqual(
      definitions.map(({ gateKey }) => gateKey),
      clis.map(({ gateKey }) => gateKey),
    );
    assert.ok(definitions.some(({ gateKey }) => gateKey === 'rerun-ready'));

    for (const definition of definitions) {
      assert.equal(definition.definition.gate, definition.gateKey, definition.name);
      const cli = clis.find(({ gateKey }) => gateKey === definition.gateKey);
      const source = readFileSync(cli.path, 'utf8');
      assert.ok(
        source.includes(`tryLoadGateDefinition('${definition.gateKey}'`),
        `${cli.name} must load its matching definition through the shared safe loader`,
      );
    }
  });

  it('parses every active rule through the shared schema and paired raw snapshot', () => {
    for (const snapshot of activeDefinitions()) {
      const reparsed = parseGateDefinitionBytes(snapshot.rawBytes, { sourcePath: snapshot.path });
      assert.deepEqual(reparsed, snapshot.definition, snapshot.name);
      assert.ok(snapshot.rawBytes.length > 0, `${snapshot.name} raw bytes must be retained`);
      for (const rule of snapshot.definition.rules) {
        assert.ok(rule.id);
        assert.ok(['definition', 'checker'].includes(rule.finding.source));
        if (rule.finding.source === 'definition') {
          assert.ok(rule.finding.blocking_basis);
          assert.ok(rule.repair?.kind);
          assert.ok(rule.repair?.write_to);
        } else {
          assert.equal(rule.repair, undefined);
        }
      }
    }
  });

  it('derives typed semantic-section descriptor facts from active definitions', () => {
    const typedRules = activeDefinitions().flatMap((snapshot) => snapshot.definition.rules)
      .filter((rule) => rule.check === 'semantic_sections');
    assert.ok(typedRules.length > 0);
    for (const rule of typedRules) {
      assert.ok(Array.isArray(rule.required_sections));
      assert.ok(rule.required_sections.length > 0);
      assert.equal(new Set(rule.required_sections).size, rule.required_sections.length);
      assert.equal(Object.hasOwn(rule, 'pattern'), false);
      assert.equal(Object.hasOwn(rule, 'negate'), false);
    }
  });

  it('routes every production Gate-definition semantic read through the shared reader', () => {
    const productionFiles = walk(FRAMEWORK_ROOT).filter((file) => file.endsWith('.mjs'));
    const consumers = productionFiles.filter((file) => readFileSync(file, 'utf8').includes('gate_definitions'));
    assert.ok(consumers.length > 0);

    for (const file of consumers) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(REPO_ROOT, file);
      assert.match(source, /readGateDefinitionSnapshot/, `${rel} must import/use the shared reader`);
      assert.doesNotMatch(source, /readFileSync\s*\(\s*(?:defPath|RERUN_RULE_PATH)\b/, `${rel} must not read definition bytes separately`);
      assert.doesNotMatch(source, /const\s+definition\s*=\s*JSON\.parse/, `${rel} must not keep a semantic JSON.parse bypass`);
      assert.doesNotMatch(source, /JSON\.parse\s*\(\s*raw\.toString/, `${rel} must not parse a second raw snapshot`);
    }
  });

  it('does not retain the retired rule-granular audit catalogs', () => {
    const source = readFileSync(import.meta.filename, 'utf8');
    const retiredNames = [
      ['CHECK', 'IMPLEMENTATION', 'ROUTES'].join('_'),
      ['GATE', 'RULE', 'INVENTORY', 'GROUPS'].join('_'),
    ];
    for (const name of retiredNames) assert.equal(source.includes(name), false);
  });

  // ---- 2026-08-31-extend-derived-gate-audit-coverage ----
  // 分工：本审计是静态前置防线（发现式派生，无永久目录，符合 GSK-011 姿态）；
  // wave-contract-evaluators 对未知 check 的 configuration_integrity 运行时
  // fail-closed 仍是精确裁决的第二道防线。

  function implementationCorpus() {
    return walk(FRAMEWORK_ROOT)
      .filter((file) => file.endsWith('.mjs'))
      .map((file) => readFileSync(file, 'utf8'));
  }

  it('derives check-name presence: every active definition check appears in the implementation corpus', () => {
    const corpus = implementationCorpus();
    const checks = new Set(
      activeDefinitions().flatMap(({ definition }) => definition.rules.map((rule) => rule.check)),
    );
    assert.ok(checks.size > 0);
    const missing = [...checks].filter(
      (name) => !corpus.some((source) => source.includes(`'${name}'`) || source.includes(`"${name}"`)),
    );
    assert.deepEqual(missing, [], `checks with no implementation-corpus presence: ${missing.join(', ')}`);
  });

  it('dispatch-presence derivation is not vacuous (sentinel and known names)', () => {
    const corpus = implementationCorpus();
    const known = 'count_floor';
    const sentinel = 'definitely_not_a_gate_check_sentinel';
    assert.ok(corpus.some((source) => source.includes(`'${known}'`)), 'known check must be present in corpus');
    assert.ok(
      !corpus.some((source) => source.includes(`'${sentinel}'`)),
      'sentinel must be absent so the presence check can fail',
    );
  });

  it('keeps wave fatigue degradation policy single-sourced across wave wrappers', () => {
    const policyPath = join(FRAMEWORK_ROOT, 'engine', 'helpers', 'gate-degradation-policy.mjs');
    const policy = readFileSync(policyPath, 'utf8');
    assert.match(policy, /export const WAVE_FATIGUE_PHASE_NODES/);
    assert.match(policy, /export const FATIGUE_ATTEMPT_THRESHOLD = 3/);
    assert.equal(
      policy.match(/FATIGUE_ATTEMPT_THRESHOLD = 3/g)?.length,
      1,
      'threshold must be defined exactly once',
    );

    for (const wave of ['wave0', 'wave1', 'wave2']) {
      const cli = activeGateClis().find(({ gateKey }) => gateKey === `${wave}-complete`);
      const source = readFileSync(cli.path, 'utf8');
      assert.ok(
        source.includes('gate-degradation-policy.mjs'),
        `${cli.name} must import the shared degradation policy`,
      );
      assert.ok(
        !source.includes("DEGRADATION_FATIGUE_THRESHOLD"),
        `${cli.name} must not reference the retired local threshold name`,
      );
      assert.ok(
        !source.includes("['phases/phase-wave0.md', 'phases/phase-wave1.md', 'phases/phase-wave2.md']"),
        `${cli.name} must not keep a local node-list copy`,
      );
      assert.ok(
        source.includes('WAVE_FATIGUE_PHASE_NODES') && source.includes('FATIGUE_ATTEMPT_THRESHOLD'),
        `${cli.name} must consume both shared constants`,
      );
    }
  });
});
