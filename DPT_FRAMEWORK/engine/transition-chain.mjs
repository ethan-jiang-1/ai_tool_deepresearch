// transition-chain.mjs — Node-keyed chain transition lookup (pure, stateless)
// @impl TRT-001, TRT-002, TRT-003
// Canonical engine location: DPT_FRAMEWORK/engine/transition-chain.mjs
//
// ## Role
// Pure chain transition lookup — no state, no side effects, no tracker cursor.
// The chain backend is stateless. Current node progression is owned by the
// caller that already knows `currentNodeRef`.
//
// ## Exports
//   ChainDefinition, loadChain, resolveTransition

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ─── Chain Schema ───────────────────────────────────────────────────────

/** @impl TRT-001, TRT-002 */
export const ChainDefinition = z.record(
  z.string().min(1),
  z.record(z.string().min(1), z.string().nullable())
);

// ─── Chain Loading ──────────────────────────────────────────────────────

/**
 * Read and validate a .chain.json file.
 *
 * @param {string} path — absolute path to .chain.json file
 * @returns {object} validated chain definition
 * @throws {Error} if file unreadable, JSON invalid, or schema mismatch
 *
 * @impl TRT-003
 */
export function loadChain(path) {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw);
  return ChainDefinition.parse(parsed);
}

// ─── Transition Resolution ─────────────────────────────────────────────

/**
 * Consult the chain table to determine the next node.
 *
 * Pure function — no side effects, no state mutations.
 *
 * @param {object} chain — validated chain definition
 * @param {string} currentNodeRef — canonical node file reference (e.g. 'phases/phase-wave0.md')
 * @param {string} outcome — public outcome vocabulary: 'passed' or 'failed'
 * @returns {{ next: string|null, found: boolean }}
 *
 * @impl TRT-002, TRT-003
 */
export function resolveTransition(chain, currentNodeRef, outcome) {
  const node = chain[currentNodeRef];
  if (!node) {
    return { next: null, found: false };
  }
  const next = node[outcome];
  if (next === undefined) {
    return { next: null, found: false };
  }
  return { next, found: true };
}
