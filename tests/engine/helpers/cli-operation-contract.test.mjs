// @impl CLE-001, CLE-003
// Focused contract coverage for the selected static invocation seam.

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parseOperationInvocation,
  validateBundleDirectory,
} from '../../../DPT_FRAMEWORK/engine/helpers/cli-operation-contract.mjs';

const dirs = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'dpt-cli-contract-'));
  dirs.push(dir);
  return dir;
}

const waveForm = {
  id: 'inspect-wave',
  positionals: [],
  options: { bundle: { required: true } },
};

describe('selected CLI operation contract', () => {
  after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('accepts only standalone help and one exact named Wave bundle form', () => {
    const help = parseOperationInvocation(['--help'], {
      usage: 'node inspect-wave --bundle <bundle-path>',
      forms: [waveForm],
    });
    assert.equal(help.kind, 'help');

    const parsed = parseOperationInvocation(['--bundle', '/tmp/bundle'], {
      usage: 'node inspect-wave --bundle <bundle-path>',
      forms: [waveForm],
    });
    assert.equal(parsed.kind, 'ok');
    assert.equal(parsed.form.id, 'inspect-wave');
    assert.equal(parsed.values.bundle, '/tmp/bundle');
  });

  it('rejects bare, duplicate, mixed-help, and option-looking invocation input before a caller reaches domain work', () => {
    const options = { usage: 'node inspect-wave --bundle <bundle-path>', forms: [waveForm] };
    for (const args of [
      ['/tmp/bundle'],
      ['--bundle', '/tmp/one', '--bundle', '/tmp/two'],
      ['--help', '--bundle', '/tmp/bundle'],
      ['--bundle', '--not-a-bundle'],
      ['--unknown', 'value'],
    ]) {
      const result = parseOperationInvocation(args, options);
      assert.equal(result.kind, 'invalid', args.join(' '));
      assert.match(result.reason, /(?:expected|unknown|duplicate|standalone|value)/i);
    }
  });

  it('accepts a resolved real bundle directory but never treats a missing path as a domain coordinate', () => {
    const bundle = tempDir();
    const valid = validateBundleDirectory(bundle);
    assert.equal(valid.ok, true);
    assert.equal(valid.path, bundle);

    const invalid = validateBundleDirectory(join(bundle, 'missing'));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.coordinate, '<bundle-path>');
  });
});
