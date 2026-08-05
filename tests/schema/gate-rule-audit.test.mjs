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
});
