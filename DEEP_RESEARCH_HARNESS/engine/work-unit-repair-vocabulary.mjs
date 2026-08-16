// work-unit-repair-vocabulary.mjs
// Single engine-owned export of the attempt-owned work-unit recovery
// repair_kind vocabulary. The RUN.md decision table and the decision-table
// regression derive their row set from this export.
//
// Test-lock exports: WORK_UNIT_REPAIR_KINDS and REPAIR_KIND_CLI_VERB are
// consumed only by the decision-table regression
// (tests/engine/work-unit-recovery-decision-table.test.mjs); production code
// consumes WORK_UNIT_REPAIR_KIND.
// @impl CHI-004

export const WORK_UNIT_REPAIR_KIND = Object.freeze({
  wait: 'wait',
  recoverTransaction: 'recover-transaction',
  recoverDeclaration: 'recover-declaration',
  supersede: 'supersede',
  missingContract: 'missing_contract',
  waitForDelegatedCandidate: 'wait_for_delegated_candidate',
  authorExactFallbackAttempt: 'author_exact_fallback_attempt',
  semanticBoundary: 'semantic_boundary',
  claimSuccessor: 'claim_successor',
  inspectCurrentLineageLeaf: 'inspect_current_lineage_leaf',
});

export const WORK_UNIT_REPAIR_KINDS = Object.freeze(Object.values(WORK_UNIT_REPAIR_KIND));

// Matching operate-work-unit.mjs CLI verb per repair kind, or null for an
// explicit wait/stop boundary with no CLI verb.
export const REPAIR_KIND_CLI_VERB = Object.freeze({
  [WORK_UNIT_REPAIR_KIND.recoverTransaction]: 'recover-transaction',
  [WORK_UNIT_REPAIR_KIND.recoverDeclaration]: 'recover-declaration',
  [WORK_UNIT_REPAIR_KIND.supersede]: 'supersede',
  [WORK_UNIT_REPAIR_KIND.claimSuccessor]: 'claim',
  [WORK_UNIT_REPAIR_KIND.inspectCurrentLineageLeaf]: 'inspect',
  [WORK_UNIT_REPAIR_KIND.wait]: null,
  [WORK_UNIT_REPAIR_KIND.missingContract]: null,
  [WORK_UNIT_REPAIR_KIND.waitForDelegatedCandidate]: null,
  [WORK_UNIT_REPAIR_KIND.authorExactFallbackAttempt]: null,
  [WORK_UNIT_REPAIR_KIND.semanticBoundary]: null,
});
