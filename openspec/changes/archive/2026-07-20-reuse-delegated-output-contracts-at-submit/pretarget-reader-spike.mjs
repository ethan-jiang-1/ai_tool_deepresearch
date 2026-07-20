#!/usr/bin/env node

import {
  constants,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { open } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const CAP = 4 * 1024 * 1024;
const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : mkdtempSync(path.join(os.tmpdir(), 'direct-output-reader-spike-'));
mkdirSync(root, { recursive: true });

function lexicalReason(target) {
  if (typeof target !== 'string' || target.length === 0) return 'empty';
  if (path.isAbsolute(target)) return 'absolute';
  if (target === '.') return 'dot';
  if (target.includes('\\')) return 'backslash';
  const segments = target.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return 'non_canonical_segment';
  if (path.posix.normalize(target) !== target) return 'non_canonical_normalization';
  return null;
}

function decodeSingleBom(bytes) {
  // Preserve BOM code points so the module, not TextDecoder defaults, owns the single-BOM rule.
  const decoded = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const text = decoded.startsWith('\uFEFF') ? decoded.slice(1) : decoded;
  if (text.includes('\uFEFF')) throw new Error('multiple_or_embedded_bom');
  return text;
}

async function boundedRead(target, { afterFstat = null } = {}) {
  const lexical = lexicalReason(target);
  if (lexical) throw new Error(`lexical:${lexical}`);
  const rootReal = realpathSync(root);
  const absolute = path.join(root, target);
  const before = lstatSync(absolute);
  if (before.isSymbolicLink()) throw new Error('stable_symlink');
  const targetReal = realpathSync(absolute);
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) throw new Error('realpath_escape');

  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW || 0);
  const handle = await open(absolute, flags);
  try {
    const initial = await handle.stat();
    if (!initial.isFile()) throw new Error('non_regular');
    if (initial.size > CAP) throw new Error('initial_oversize');
    if (afterFstat) await afterFstat({ absolute, handle });

    const buffer = Buffer.alloc(CAP + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    const observed = await handle.stat();
    if (total > CAP || observed.size > CAP) throw new Error('observed_oversize');
    return {
      bytes: buffer.subarray(0, total),
      initial_size: initial.size,
      observed_size: observed.size,
      bytes_read: total,
    };
  } finally {
    await handle.close();
  }
}

async function capture(name, operation) {
  try {
    const value = await operation();
    return { name, outcome: 'accepted', value };
  } catch (error) {
    return { name, outcome: 'rejected', reason: error.message || String(error) };
  }
}

const cases = [];
for (const target of ['', '.', '/tmp/escape', '../escape', 'a/../b', 'a\\b', 'a//b']) {
  cases.push({ name: `lexical:${JSON.stringify(target)}`, outcome: lexicalReason(target) ? 'rejected' : 'accepted', reason: lexicalReason(target) });
}

writeFileSync(path.join(root, 'regular.txt'), 'regular-content');
cases.push(await capture('regular_file', async () => {
  const result = await boundedRead('regular.txt');
  return { ...result, text: decodeSingleBom(result.bytes) };
}));

writeFileSync(path.join(root, 'shrink.txt'), Buffer.alloc(1024, 0x61));
cases.push(await capture('shorter_eof_after_fstat', async () => {
  const result = await boundedRead('shrink.txt', { afterFstat: () => truncateSync(path.join(root, 'shrink.txt'), 17) });
  return { initial_size: result.initial_size, observed_size: result.observed_size, bytes_read: result.bytes_read };
}));

writeFileSync(path.join(root, 'oversize.txt'), Buffer.alloc(CAP + 1, 0x61));
cases.push(await capture('initial_oversize', () => boundedRead('oversize.txt')));

writeFileSync(path.join(root, 'grow.txt'), Buffer.alloc(16, 0x61));
cases.push(await capture('growth_after_fstat', () => boundedRead('grow.txt', {
  afterFstat: () => writeFileSync(path.join(root, 'grow.txt'), Buffer.alloc(CAP + 1, 0x62)),
})));

symlinkSync('regular.txt', path.join(root, 'stable-link.txt'));
cases.push(await capture('stable_symlink', () => boundedRead('stable-link.txt')));

const outside = mkdtempSync(path.join(os.tmpdir(), 'direct-output-reader-outside-'));
writeFileSync(path.join(outside, 'outside.txt'), 'outside');
symlinkSync(outside, path.join(root, 'outside-dir'));
cases.push(await capture('realpath_escape_via_parent_symlink', () => boundedRead('outside-dir/outside.txt')));

const socketPath = path.join(root, 'special.sock');
const server = createServer();
await new Promise((resolve, reject) => server.once('error', reject).listen(socketPath, resolve));
cases.push(await capture('special_unix_socket', () => boundedRead('special.sock')));
await new Promise((resolve) => server.close(resolve));
if (lstatSync(socketPath, { throwIfNoEntry: false })) unlinkSync(socketPath);

writeFileSync(path.join(outside, 'hardlink-source.txt'), 'hardlink-content');
linkSync(path.join(outside, 'hardlink-source.txt'), path.join(root, 'hardlink.txt'));
cases.push(await capture('hardlink_alias', async () => {
  const result = await boundedRead('hardlink.txt');
  return { accepted_text: decodeSingleBom(result.bytes), link_count: lstatSync(path.join(root, 'hardlink.txt')).nlink };
}));

writeFileSync(path.join(root, 'replace.txt'), 'opened-original');
cases.push(await capture('concurrent_path_replacement', async () => {
  const result = await boundedRead('replace.txt', {
    afterFstat: () => {
      renameSync(path.join(root, 'replace.txt'), path.join(root, 'replace-opened.txt'));
      writeFileSync(path.join(root, 'replace.txt'), 'replacement-path-bytes');
    },
  });
  return {
    opened_handle_text: decodeSingleBom(result.bytes),
    current_path_text: readFileSync(path.join(root, 'replace.txt'), 'utf8'),
  };
}));

cases.push(await capture('one_leading_bom', async () => decodeSingleBom(Buffer.from('\uFEFFvalid'))));
cases.push(await capture('multiple_bom', async () => decodeSingleBom(Buffer.from('\uFEFF\uFEFFinvalid'))));
cases.push(await capture('embedded_bom', async () => decodeSingleBom(Buffer.from('a\uFEFFb'))));
cases.push(await capture('invalid_utf8', async () => decodeSingleBom(Buffer.from([0xc3, 0x28]))));

const expected = {
  regular_file: 'accepted',
  shorter_eof_after_fstat: 'accepted',
  initial_oversize: 'rejected',
  growth_after_fstat: 'rejected',
  stable_symlink: 'rejected',
  realpath_escape_via_parent_symlink: 'rejected',
  special_unix_socket: 'rejected',
  hardlink_alias: 'accepted',
  concurrent_path_replacement: 'accepted',
  one_leading_bom: 'accepted',
  multiple_bom: 'rejected',
  embedded_bom: 'rejected',
  invalid_utf8: 'rejected',
};

const mismatches = cases
  .filter((item) => Object.hasOwn(expected, item.name) && item.outcome !== expected[item.name])
  .map((item) => ({ name: item.name, expected: expected[item.name], observed: item.outcome, reason: item.reason || null }));

process.stdout.write(`${JSON.stringify({
  schema_version: 'pretarget-reader-spike.v1',
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  root,
  cap_bytes: CAP,
  cases,
  mismatches,
  passed: mismatches.length === 0,
  residual_risks: [
    'A hardlink can alias an inode outside the bundle while presenting a regular in-bundle pathname.',
    'Same-handle reads remain internally consistent after pathname replacement but do not prove the opened inode was always bundle-owned.',
    'The spike observes supported-platform behavior; it is not production implementation or cross-platform proof.',
  ],
}, null, 2)}\n`);
