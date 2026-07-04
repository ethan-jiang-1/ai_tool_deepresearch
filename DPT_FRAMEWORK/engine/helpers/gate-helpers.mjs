// gate-helpers.mjs — Barrel re-export for backward compatibility
//
// This file re-exports from the sub-modules. All existing imports of
// gate-helpers.mjs continue to work unchanged.
//
// Sub-modules:
//   gate-helpers-core.mjs       — Gate CLI lifecycle: args, routing, results, trace, checkpoints
//   gate-helpers-readers.mjs    — Bundle file readers: plan, profile, frontmatter, declarations
//   gate-helpers-checks.mjs     — Gate rule checks: reference validation, content_dedup, cache_coverage
//   gate-helpers-provenance.mjs — Relay provenance checks + bypass detection
//   gate-helpers-serial.mjs     — YAML/JSON safe readers with repair + template scan

// Core
export {
  parseGateCliArgs,
  loadGateDefinition,
  tryLoadGateDefinition,
  loadManifest,
  validateNodeGateBinding,
  resolveRouting,
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
  listMatchingBundleFiles,
  getDeclaredReferencePaths,
  validateState,
  validateRules,
  zodErrors,
} from './gate-helpers-readers.mjs';

// Checks
export {
  tokenizeForSimilarity,
  jaccardSimilarity,
  extractSection,
  isHomepageUrl,
  REQUIRED_REFERENCE_METADATA_FIELDS,
  REQUIRED_REFERENCE_SECTIONS,
  parseReferenceMetadata,
  checkReferenceFormatFiles,
  checkReferenceSourceUrls,
  checkReferenceKeyFactsMinLines,
  checkReferenceLedgerCoverage,
  checkContentDedup,
  checkCacheCoverage,
} from './gate-helpers-checks.mjs';

// Provenance
export {
  checkOutputDeclarationLedgerExists,
  checkOutputDeclarationCoverage,
  checkSubagentSlotPresence,
  detectRelayBypassSuspicion,
  runProvenanceForensics,
} from './gate-helpers-provenance.mjs';

// Serial
export {
  readYamlArraySafe,
  readJsonFileSafe,
  scanTemplateNotExpanded,
} from './gate-helpers-serial.mjs';
