// @impl BUM-003, BUM-005, WDC-004
// Direct, non-mutating admission check for the current bundle entry pair.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const CURRENT_ENTRY_FILES = Object.freeze([
  'BUNDLE_ENTRY.md',
  'BUNDLE_MAP.md',
]);

export const UNSUPPORTED_CURRENT_ENTRY_CONTRACT = 'unsupported_current_entry_contract';

/**
 * Answers only whether an explicitly selected root has the current entry pair.
 * It deliberately neither parses Markdown nor interprets legacy files.
 */
export function checkCurrentEntryContract(bundlePath) {
  const missingFiles = CURRENT_ENTRY_FILES.filter((file) => !existsSync(join(bundlePath, file)));

  return {
    passed: missingFiles.length === 0,
    code: missingFiles.length === 0 ? null : UNSUPPORTED_CURRENT_ENTRY_CONTRACT,
    required_files: [...CURRENT_ENTRY_FILES],
    missing_files: missingFiles,
  };
}
