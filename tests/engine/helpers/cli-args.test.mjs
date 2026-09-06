// cli-args.test.mjs — unit regression for the shared argument guard.
// @impl CLE-001, CLE-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseGuardedArgs } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs';

const OPTIONS = {
  bundle: { type: 'string' },
  at: { type: 'string' },
  json: { type: 'boolean', default: false },
  root: { type: 'string', default: '/default/root' },
};
const USAGE = 'Usage: node DEEP_RESEARCH_HARNESS/cli/example.mjs --bundle <path>';

describe('parseGuardedArgs outcome classification', () => {
  it('classifies a --help token as a help request', () => {
    const parsed = parseGuardedArgs({ args: ['--help'], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'help');
    assert.equal(parsed.usage, USAGE);
  });

  it('classifies -h as a help request', () => {
    assert.equal(parseGuardedArgs({ args: ['-h'], options: OPTIONS, usage: USAGE }).kind, 'help');
  });

  it('treats a help token mixed with other options as help (before any -- separator)', () => {
    const parsed = parseGuardedArgs({ args: ['--bundle', 'x', '--help'], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'help');
  });

  it('does not treat a help token after a -- separator as help', () => {
    const parsed = parseGuardedArgs({ args: ['--', '--help'], options: OPTIONS, usage: USAGE });
    assert.notEqual(parsed.kind, 'help');
    assert.equal(parsed.kind, 'invalid');
  });

  it('classifies well-formed arguments as ok and forwards values verbatim', () => {
    const parsed = parseGuardedArgs({ args: ['--bundle', 'some/bundle', '--json'], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'ok');
    assert.equal(parsed.values.bundle, 'some/bundle');
    assert.equal(parsed.values.json, true);
    assert.deepEqual(parsed.positionals, []);
  });

  it('passes declared defaults through verbatim', () => {
    const parsed = parseGuardedArgs({ args: [], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'ok');
    assert.equal(parsed.values.root, '/default/root');
    assert.equal(parsed.values.json, false);
  });

  it('classifies an undeclared option as an invocation rejection carrying the parseArgs reason', () => {
    const parsed = parseGuardedArgs({ args: ['--nope'], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'invalid');
    assert.match(parsed.reason, /Unknown option/);
    assert.equal(parsed.usage, USAGE);
  });

  it('classifies a missing option value as an invocation rejection', () => {
    const parsed = parseGuardedArgs({ args: ['--bundle'], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'invalid');
    assert.ok(parsed.reason.length > 0);
  });

  it('rejects non-string-array arguments deterministically', () => {
    const parsed = parseGuardedArgs({ args: [42], options: OPTIONS, usage: USAGE });
    assert.equal(parsed.kind, 'invalid');
  });

  it('rejects a missing usage string deterministically', () => {
    const parsed = parseGuardedArgs({ args: [], options: OPTIONS });
    assert.equal(parsed.kind, 'invalid');
  });
});
