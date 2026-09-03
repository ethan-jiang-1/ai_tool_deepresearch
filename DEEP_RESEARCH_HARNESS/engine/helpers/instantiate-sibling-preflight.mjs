// @impl CMI-010: instantiate-sibling-preflight.mjs — Pure-function sibling preflight
// Scans target directory for dpt_rb_* siblings, applies name-prefix similarity
// and Final-status detection. Exported for both CLI wiring and unit tests.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FINAL_STATE = { state: 'completed', gate: 'readiness_passed' };

/**
 * @param {string} targetDir — directory to scan (repo root or --target-dir)
 * @param {string} requestedName — bare bundle name (without dpt_rb_ prefix)
 * @returns {{ flag: boolean, sibling: string|null, state: string|null, reason: string|null }}
 *   flag=true means sibling found and consent needed.
 *   An ack-worthy sibling is one whose name is prefix-related (e.g. x vs x-v2)
 *   OR whose status is non-Final (file missing, unreadable, or not completed/readiness_passed).
 */
export function siblingPreflight(targetDir, requestedName) {
  let entries;
  try {
    entries = readdirSync(targetDir, { withFileTypes: true });
  } catch {
    // targetDir itself unreadable — cannot scan, fail-closed non-Final
    return { flag: true, sibling: null, state: 'read_error', reason: 'Cannot read target directory' };
  }

  const siblings = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('dpt_rb_'))
    .map((e) => e.name);

  for (const sibling of siblings) {
    const siblingName = sibling.slice('dpt_rb_'.length);

    // Name-similarity: one is prefix of the other (independent of Final status)
    const nameSimilar = siblingName.startsWith(requestedName) || requestedName.startsWith(siblingName);

    // Final-status detection
    let isFinal = false;
    let stateLabel = 'unknown';
    let stateDetail = null;
    const statusPath = join(targetDir, sibling, 'rb_status.json');
    if (!existsSync(statusPath)) {
      stateLabel = 'no_status_file';
    } else {
      let status;
      try {
        status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      } catch {
        stateLabel = 'unreadable_status';
      }
      if (status) {
        stateLabel = status.state ?? 'absent_field';
        stateDetail = status.current_gate ?? null;
        isFinal = status.state === FINAL_STATE.state && status.current_gate === FINAL_STATE.gate;
      }
    }

    // Flag on name-similarity regardless of Final status (glm-5-3 vs glm-5-3-final)
    if (nameSimilar) {
      return {
        flag: true,
        sibling,
        state: stateLabel,
        reason: `Sibling ${sibling} exists (state=${stateLabel}) and is name-similar to requested '${requestedName}' — additional creation requires explicit user consent`,
      };
    }

    // Flag on non-Final independently (mid-run sibling with unrelated name)
    if (!isFinal) {
      return {
        flag: true,
        sibling,
        state: stateLabel,
        reason: `Sibling ${sibling} exists (state=${stateLabel}) and is not in Final terminal state — additional creation requires explicit user consent`,
      };
    }
  }

  return { flag: false, sibling: null, state: null, reason: null };
}