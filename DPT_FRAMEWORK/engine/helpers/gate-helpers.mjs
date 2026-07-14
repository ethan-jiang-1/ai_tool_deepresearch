// gate-helpers.mjs — Barrel re-export for backward compatibility
//
// This file re-exports from the sub-modules. All existing imports of
// gate-helpers.mjs continue to work unchanged.
//
// Sub-modules:
//   gate-helpers-core.mjs       — Gate CLI lifecycle: args, routing, results, trace, checkpoints
//   gate-helpers-readers.mjs    — Bundle file readers: plan, profile, frontmatter, declarations
//   gate-helpers-checks.mjs     — Gate rule checks: reference validation, cache_coverage
//   gate-helpers-provenance.mjs — Work-unit provenance checks + bypass diagnostics
//   gate-helpers-serial.mjs     — YAML/JSON safe readers with repair + template scan
//   handoff-helpers.mjs         — Trace-backed lifecycle handoff validation

// Core
export {
  parseGateCliArgs,
  loadGateDefinition,
  tryLoadGateDefinition,
  loadManifest,
  checkNodeGateBinding,
  validateNodeGateBinding,
  resolveRouting,
  projectGateHints,
  buildGateResult,
  emitGateResult,
  derivePhaseFromGate,
  writeGateAttempt,
  writeCheckpointManifest,
  writeGateFailureDiagnostic,
  writeGatePassDiagnostic,
  writePlanProgress,
  readTraceEvents,
} from './gate-helpers-core.mjs';

// Readers
export {
  parseMdFrontmatter,
  stripMdFrontmatter,
  readBundlePlan,
  readBundleProfile,
  resolveThreshold,
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
  listMatchingBundleFiles,
  getDeclaredReferencePaths,
  validateState,
  validateRules,
  zodErrors,
} from './gate-helpers-readers.mjs';

// Checks
export {
  extractSection,
  parseMarkdownSemanticSections,
  REQUIRED_REFERENCE_METADATA_FIELDS,
  REFERENCE_TOPIC_BINDING_FIELDS,
  REQUIRED_REFERENCE_SECTIONS,
  parseReferenceMetadata,
  classifyReferenceAuthority,
  checkReferenceFormatFiles,
  checkReferenceSourceUrls,
  checkReferenceLedgerCoverage,
  checkReferenceIndexCoverage,
  checkCacheCoverage,
} from './gate-helpers-checks.mjs';

// Provenance
export {
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  checkDelegatedBypassSuspected,
  detectDelegatedBypassSuspicion,
  emitDelegatedBypassDiagnostic,
  scanDelegatedBypassSuspicion,
} from './gate-helpers-provenance.mjs';

// Serial
export {
  readYamlArraySafe,
  readJsonFileSafe,
  scanTemplateNotExpanded,
} from './gate-helpers-serial.mjs';

// Handoff
export {
  BOOTSTRAP_TARGET_NODES,
  COVERED_ENTRY_TARGET_NODES,
  COVERED_PREFLIGHT_TARGET_NODES,
  COVERED_SOURCE_NODES,
  gateKeyToEnum,
  gateEnumToKey,
  loadHandoffTopology,
  readTraceEventsWithIndex,
  validateEnterPhaseTarget,
  validateSourceGateStatusSync,
  checkPhaseHandoffPreflight,
} from './handoff-helpers.mjs';

// Wave depth contracts
export {
  checkSourceClaimCacheMapping,
  checkWave1DepthReviewContract,
  checkWave2FindingIndexContract,
  deriveWave1NewSourceFloor,
  exactUrlKey,
  normalizeUrlForCacheMapping,
  readWave0SourceUrls,
  topicSlugFromDepthReviewTarget,
} from './wave-depth-contracts.mjs';
