// work-unit-transaction-primitives.mjs
// Layer 0: filesystem-transaction mechanics (C4 T5, move-only) — paths, hashing,
// before-image capture/restore, undeclared-mutation diff. No projection deps.
// @impl WUC-002, CHI-004

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { WORK_UNITS, WORK_UNIT_OUTPUT_LEDGER } from './work-unit-constants.mjs';
import { logToRun } from './logger.mjs';
import {
  now,
  readJson,
  traceWorkUnitEvent,
  writeJson,
} from './work-unit-utils.mjs';
import {
  WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionMutationManifestSchema,
  WorkUnitTransactionPairSchema,
  WorkUnitTransactionProjectionSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../schema/contracts/work-unit-transaction.mjs';
import { WORK_UNIT_REPAIR_KIND } from './work-unit-repair-vocabulary.mjs';
const LOCK_OWNER_BASENAME = 'owner.json';
const LEGACY_TRANSACTION_V1_SCHEMA_VERSION = 'work-unit.transaction.v1';

export function rootPath(bundleDir) {
  return path.resolve(bundleDir);
}

export function lockPath(bundleDir) {
  return path.join(rootPath(bundleDir), WORK_UNITS.LOCK);
}

export function transactionLockOwnerPath(bundleDir) {
  return path.join(lockPath(bundleDir), LOCK_OWNER_BASENAME);
}

export function transactionRoot(bundleDir) {
  return path.join(rootPath(bundleDir), WORK_UNITS.TRANSACTIONS);
}

export function journalPath(bundleDir, txId) {
  return path.join(transactionRoot(bundleDir), `${txId}.json`);
}

export function journalRef(txId) {
  return `${WORK_UNITS.TRANSACTIONS}/${txId}.json`;
}

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function canonicalTargetPath(bundleDir, target) {
  const parsed = WorkUnitTransactionMutationManifestSchema.parse({
    targets: [{ path: target, before_exists: false }],
  }).targets[0].path;
  const absolute = path.resolve(rootPath(bundleDir), parsed);
  const root = rootPath(bundleDir);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error(`transaction target escapes bundle root: ${target}`);
  }
  return { relative: parsed, absolute };
}

export function captureMutationTargets(bundleDir, targetPaths) {
  const snapshots = [];
  for (const targetPath of targetPaths) {
    const target = canonicalTargetPath(bundleDir, targetPath);
    if (!existsSync(target.absolute)) {
      snapshots.push({ ...target, before_exists: false, bytes: null });
      continue;
    }
    const stats = lstatSync(target.absolute);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`transaction target must be one exact regular file: ${target.relative}`);
    }
    const bytes = readFileSync(target.absolute);
    snapshots.push({
      ...target,
      before_exists: true,
      before_sha256: sha256Bytes(bytes),
      bytes,
    });
  }
  return snapshots;
}

export function mutationManifestFor(snapshots) {
  return WorkUnitTransactionMutationManifestSchema.parse({
    targets: snapshots.map((snapshot) => ({
      path: snapshot.relative,
      before_exists: snapshot.before_exists,
      ...(snapshot.before_exists ? { before_sha256: snapshot.before_sha256 } : {}),
    })),
  });
}

export function targetMatchesBeforeImage(snapshot) {
  if (!snapshot.before_exists) return !existsSync(snapshot.absolute);
  if (!existsSync(snapshot.absolute)) return false;
  const stats = lstatSync(snapshot.absolute);
  return stats.isFile() && !stats.isSymbolicLink()
    && sha256Bytes(readFileSync(snapshot.absolute)) === snapshot.before_sha256;
}

export function restoreMutationTargets(snapshots) {
  const failures = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (!snapshot.before_exists) {
        rmSync(snapshot.absolute, { recursive: true, force: true });
      } else {
        if (existsSync(snapshot.absolute) && !lstatSync(snapshot.absolute).isFile()) {
          rmSync(snapshot.absolute, { recursive: true, force: true });
        }
        mkdirSync(path.dirname(snapshot.absolute), { recursive: true });
        writeFileSync(snapshot.absolute, snapshot.bytes);
      }
    } catch (error) {
      failures.push(`${snapshot.relative}: ${error.message || String(error)}`);
    }
  }
  for (const snapshot of snapshots) {
    try {
      if (!targetMatchesBeforeImage(snapshot)) failures.push(`${snapshot.relative}: before-image mismatch`);
    } catch (error) {
      failures.push(`${snapshot.relative}: ${error.message || String(error)}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

export function listBundleFiles(bundleDir, currentJournalRef = null) {
  const root = rootPath(bundleDir);
  const files = new Map();
  if (!existsSync(root)) return files;
  const record = (absolute, relative) => {
    if (relative === currentJournalRef) return;
    files.set(relative, sha256Bytes(readFileSync(absolute)));
  };
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === WORK_UNITS.LOCK || relative.startsWith(`${WORK_UNITS.LOCK}/`)) continue;
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      record(absolute, relative);
    }
  };
  const workUnitsRoot = path.join(root, WORK_UNITS.ROOT);
  if (existsSync(workUnitsRoot)) visit(workUnitsRoot);
  const ledgerAbsolute = path.join(root, WORK_UNIT_OUTPUT_LEDGER);
  if (existsSync(ledgerAbsolute) && lstatSync(ledgerAbsolute).isFile()) {
    record(ledgerAbsolute, WORK_UNIT_OUTPUT_LEDGER);
  }
  return files;
}

export function changedFiles(before, after) {
  const all = new Set([...before.keys(), ...after.keys()]);
  return [...all].filter((entry) => before.get(entry) !== after.get(entry)).sort();
}

export function belongsToOtherWorkUnit(relativePath, targetWorkIds) {
  const segments = relativePath.split('/');
  if (segments.length < 3 || segments[0] !== WORK_UNITS.ROOT) return false;
  return !targetWorkIds.includes(segments[2]);
}

export function isExactIsoTimestamp(value) {
  return z.string().datetime().safeParse(value).success;
}

export function currentTargetsMatchManifest(bundleDir, journal) {
  try {
    const snapshots = journal.mutation_manifest.targets.map((target) => {
      const resolved = canonicalTargetPath(bundleDir, target.path);
      return { ...resolved, ...target };
    });
    return snapshots.every(targetMatchesBeforeImage);
  } catch {
    return false;
  }
}
