// @impl DEW-002, DEW-004, DEW-013, DEW-014, FRE-005, SDC-001, SDC-002, SDC-003, EXO-001, FIO-001, SNC-005, REF-006, WAI-008, WTS-010
// Work-unit core barrel: re-exports from submodules. All public API preserved.

// Constants (5)
export {
  WORK_UNITS,
  WORK_UNIT_OUTPUT_LEDGER,
  DEFAULT_KIND_REGISTRY,
  WORK_UNIT_REQUIRED_RECEIPT_FIELDS,
  DEFAULT_KIND_CONTRACTS,
} from './work-unit-constants.mjs';

// Index / state management (15)
export {
  workUnitsRoot,
  workUnitIndexPath,
  transactionDir,
  parseWorkId,
  resolveKindCode,
  resolveKind,
  validateWorkIdBinding,
  createEmptyWorkUnitIndex,
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  allocateWorkId,
  transactionPath,
  withWorkUnitTransaction,
} from './work-unit-index.mjs';

// Envelope (2)
export {
  spawnPromptForWorkUnit,
  writeWorkUnitEnvelope,
} from './work-unit-envelope.mjs';

// Lifecycle (4)
export {
  createWorkUnit,
  closeWorkUnitAttempt,
  openWorkUnitBatch,
  claimWorkUnits,
} from './work-unit-lifecycle.mjs';

// Submit (3)
export {
  drySubmitWorkUnit,
  submitWorkUnit,
} from './work-unit-submit.mjs';

// Timeout preflight (1)
export {
  timeoutPreflightWorkUnit,
} from './work-unit-timeout-preflight.mjs';

// Ledger (2)
export {
  computeWorkUnitLedgerRecordHash,
  readWorkUnitLedgerRows,
} from './work-unit-utils.mjs';

// Inspect (1)
export {
  inspectWorkUnits,
} from './work-unit-inspect.mjs';
