// work-unit-repair-vocabulary.mjs
// Single engine-owned export of the attempt-owned work-unit recovery
// recovery_action vocabulary. The RUN.md decision table and the decision-table
// regression derive their row set from this export.
//
// Test-lock exports: WORK_UNIT_RECOVERY_ACTIONS and RECOVERY_ACTION_CLI_VERB are
// consumed by the decision-table regression; production code consumes WORK_UNIT_RECOVERY_ACTION.
// @impl CHI-004

export const WORK_UNIT_RECOVERY_ACTION = Object.freeze({
  wait: "wait",
  recoverTransaction: "recover-transaction",
  recoverDeclaration: "recover-declaration",
  supersede: "supersede",
  missingContract: "missing_contract",
  waitForDelegatedCandidate: "wait_for_delegated_candidate",
  authorExactFallbackAttempt: "author_exact_fallback_attempt",
  semanticBoundary: "semantic_boundary",
  claimSuccessor: "claim_successor",
  inspectCurrentLineageLeaf: "inspect_current_lineage_leaf",
});

export const WORK_UNIT_RECOVERY_ACTIONS = Object.freeze(Object.values(WORK_UNIT_RECOVERY_ACTION));

// Matching operate-work-unit.mjs CLI verb per recovery action, or null for an
// explicit wait/stop boundary with no CLI verb.
export const RECOVERY_ACTION_CLI_VERB = Object.freeze({
  [WORK_UNIT_RECOVERY_ACTION.recoverTransaction]: "recover-transaction",
  [WORK_UNIT_RECOVERY_ACTION.recoverDeclaration]: "recover-declaration",
  [WORK_UNIT_RECOVERY_ACTION.supersede]: "supersede",
  [WORK_UNIT_RECOVERY_ACTION.claimSuccessor]: "claim",
  [WORK_UNIT_RECOVERY_ACTION.inspectCurrentLineageLeaf]: "inspect",
  [WORK_UNIT_RECOVERY_ACTION.wait]: null,
  [WORK_UNIT_RECOVERY_ACTION.missingContract]: null,
  [WORK_UNIT_RECOVERY_ACTION.waitForDelegatedCandidate]: null,
  [WORK_UNIT_RECOVERY_ACTION.authorExactFallbackAttempt]: null,
  [WORK_UNIT_RECOVERY_ACTION.semanticBoundary]: null,
});

// Backward-compatibility aliases during transition
export const WORK_UNIT_REPAIR_KIND = WORK_UNIT_RECOVERY_ACTION;
export const WORK_UNIT_REPAIR_KINDS = WORK_UNIT_RECOVERY_ACTIONS;
export const REPAIR_KIND_CLI_VERB = RECOVERY_ACTION_CLI_VERB;
