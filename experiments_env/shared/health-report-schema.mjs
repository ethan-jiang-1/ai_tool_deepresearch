// health-report-schema.mjs — Post-run bundle health report schema and profile table
// @impl EXO-001, EXO-002
// Canonical experiment helper location: experiments_env/shared/health-report-schema.mjs
//
// ## Role
// Defines the Zod schema for the experiment health report JSON contract,
// the four-valued section status semantics, and the Light/Standard/Heavy
// profile table. Imported by verify-bundle-health.mjs and by tests.
//
// ## Section Status Semantics
//   clean             — required section, no issues
//   issues            — required section, one or more problems found
//   not_applicable    — optional section, artifact absent
//   observed_optional — optional section, artifact present and valid

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// Section Status Enum
// ═══════════════════════════════════════════════════════════════════════════

export const SECTION_STATUS = {
  CLEAN: 'clean',
  ISSUES: 'issues',
  NOT_APPLICABLE: 'not_applicable',
  OBSERVED_OPTIONAL: 'observed_optional',
};

export const SectionStatusSchema = z.enum([
  SECTION_STATUS.CLEAN,
  SECTION_STATUS.ISSUES,
  SECTION_STATUS.NOT_APPLICABLE,
  SECTION_STATUS.OBSERVED_OPTIONAL,
]);

// ═══════════════════════════════════════════════════════════════════════════
// Section Schemas
// ═══════════════════════════════════════════════════════════════════════════

const TraceSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  present: z.boolean().optional(),
  event_count: z.number().int().nonnegative().optional(),
  by_event: z.record(z.string(), z.number().int().nonnegative()).optional(),
  parse_errors: z.number().int().nonnegative().optional(),
});

const GateAttemptsSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  count: z.number().int().nonnegative().optional(),
  pass: z.number().int().nonnegative().optional(),
  fail: z.number().int().nonnegative().optional(),
  by_gate: z.record(z.string(), z.number().int().nonnegative()).optional(),
  diagnostics: z.array(z.string()).optional(),
});

const BundleSchemaSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  validate_bundle: z.object({ passed: z.boolean(), error: z.string().optional() }).optional(),
  inspect_bundle: z.object({ passed: z.boolean(), error: z.string().optional() }).optional(),
});

const TimelineSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  trace_gate_attempts: z.number().int().nonnegative().optional(),
  log_gate_attempts: z.number().int().nonnegative().optional(),
  mismatches: z.number().int().nonnegative().optional(),
});

const LegacyTraceSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  paths: z.array(z.string()).optional(),
});

const LedgerSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  declarations: z.number().int().nonnegative().optional(),
  schema_errors: z.number().int().nonnegative().optional(),
});

const WorkUnitsSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  present: z.boolean().optional(),
  total: z.number().int().nonnegative().optional(),
  claimed: z.number().int().nonnegative().optional(),
  submitted: z.number().int().nonnegative().optional(),
  failed: z.number().int().nonnegative().optional(),
  timed_out: z.number().int().nonnegative().optional(),
  abandoned: z.number().int().nonnegative().optional(),
  expired: z.number().int().nonnegative().optional(),
  retries: z.number().int().nonnegative().optional(),
  submit_rejections: z.number().int().nonnegative().optional(),
  late_submit_rejections: z.number().int().nonnegative().optional(),
  nonterminal: z.number().int().nonnegative().optional(),
  by_wave: z.record(z.string(), z.number().int().nonnegative()).optional(),
  inspect_passed: z.boolean().optional(),
  inspect_issues: z.number().int().nonnegative().optional(),
  diagnostics: z.array(z.string()).optional(),
});

const CacheTrailsSectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  leaves: z.number().int().nonnegative().optional(),
  missing: z.number().int().nonnegative().optional(),
});

const SourceRecoverabilitySectionSchema = z.object({
  status: SectionStatusSchema,
  required: z.boolean(),
  references: z.number().int().nonnegative().optional(),
  parseable_source_urls: z.number().int().nonnegative().optional(),
  mapped_cache_trails: z.number().int().nonnegative().optional(),
  recoverable: z.number().int().nonnegative().optional(),
  issues: z.number().int().nonnegative().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// Top-Level Issue Entry
// ═══════════════════════════════════════════════════════════════════════════

const IssueEntrySchema = z.object({
  section: z.string(),
  detail: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════
// Full Health Report Schema
// ═══════════════════════════════════════════════════════════════════════════

export const HealthReportSchema = z.object({
  schema_version: z.literal('experiment_health.v1'),
  bundle_path: z.string(),
  profile: z.enum(['light', 'standard', 'heavy']),
  status: z.enum([SECTION_STATUS.CLEAN, SECTION_STATUS.ISSUES]),
  trace: TraceSectionSchema,
  gate_attempts: GateAttemptsSectionSchema,
  bundle_schema: BundleSchemaSectionSchema,
  timeline: TimelineSectionSchema,
  legacy_trace: LegacyTraceSectionSchema,
  work_units: WorkUnitsSectionSchema,
  ledger: LedgerSectionSchema,
  cache_trails: CacheTrailsSectionSchema,
  source_recoverability: SourceRecoverabilitySectionSchema,
  issues: z.array(IssueEntrySchema),
});

// ═══════════════════════════════════════════════════════════════════════════
// Profile Table — EXO-002
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profile table: which sections are required for each profile.
 *
 *   light    — trace parse/count, legacy trace absence, bundle validate/inspect
 *   standard — light + gate diagnostics, gate output/trace timeline consistency,
 *              work-unit lifecycle projection
 *   heavy    — standard + submitted ledger, output files, cache trails,
 *              source recoverability
 */
export const PROFILE_TABLE = {
  light: {
    required_sections: ['trace', 'legacy_trace', 'bundle_schema'],
  },
  standard: {
    required_sections: ['trace', 'legacy_trace', 'bundle_schema', 'gate_attempts', 'timeline', 'work_units'],
  },
  heavy: {
    required_sections: ['trace', 'legacy_trace', 'bundle_schema', 'gate_attempts', 'timeline', 'work_units', 'ledger', 'cache_trails', 'source_recoverability'],
  },
};

/**
 * Return the list of section keys required for a given profile.
 * @param {'light'|'standard'|'heavy'} profile
 * @returns {string[]}
 */
export function requiredSectionsFor(profile) {
  const entry = PROFILE_TABLE[profile];
  if (!entry) throw new Error(`Unknown profile: ${profile}`);
  return entry.required_sections;
}

/**
 * Check whether a section is required for a given profile.
 * @param {'light'|'standard'|'heavy'} profile
 * @param {string} sectionKey
 * @returns {boolean}
 */
export function isRequiredSection(profile, sectionKey) {
  return requiredSectionsFor(profile).includes(sectionKey);
}

// ═══════════════════════════════════════════════════════════════════════════
// Status Computation — EXO-001, EXO-002
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the top-level status and issues from a set of section results.
 *
 * Rules (EXO-001/EXO-002):
 *   - Top-level status is "issues" only when a REQUIRED section has status: "issues".
 *   - Optional section issues are section-level only and do NOT flip top-level status.
 *   - Top-level issues[] SHALL contain only required-section issues.
 *
 * @param {'light'|'standard'|'heavy'} profile
 * @param {Record<string, { status: string, sectionIssues?: Array<{detail: string}> }>} sections
 *        — keys are section names, values are { status, sectionIssues? }
 * @returns {{ topLevelStatus: 'clean'|'issues', topLevelIssues: Array<{section: string, detail: string}> }}
 */
export function computeHealthStatus(profile, sections) {
  const required = new Set(requiredSectionsFor(profile));
  const topLevelIssues = [];

  let hasRequiredIssue = false;

  for (const [key, section] of Object.entries(sections)) {
    if (required.has(key) && section.status === SECTION_STATUS.ISSUES) {
      hasRequiredIssue = true;
      if (section.sectionIssues && Array.isArray(section.sectionIssues)) {
        for (const si of section.sectionIssues) {
          topLevelIssues.push({ section: key, detail: si.detail });
        }
      }
    }
  }

  return {
    topLevelStatus: hasRequiredIssue ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
    topLevelIssues,
  };
}

/**
 * Validate that a required section's status is within the allowed range.
 * Required sections MUST be "clean" or "issues" — never "not_applicable" or "observed_optional".
 *
 * @param {string} status — the section status
 * @param {boolean} required — whether the section is required for the current profile
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSectionStatus(status, required) {
  if (required) {
    if (![SECTION_STATUS.CLEAN, SECTION_STATUS.ISSUES].includes(status)) {
      return {
        valid: false,
        error: `Required section status must be "clean" or "issues", got "${status}"`,
      };
    }
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Report Construction Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the section-level issues array from a list of detail strings.
 * @param {string} sectionKey
 * @param {string[]} details
 * @returns {Array<{section: string, detail: string}>}
 */
export function sectionIssues(sectionKey, details) {
  if (!details || details.length === 0) return [];
  return details.map(d => ({ section: sectionKey, detail: d }));
}

/**
 * Build a complete health report from section results.
 *
 * @param {object} opts
 * @param {string} opts.bundlePath
 * @param {'light'|'standard'|'heavy'} opts.profile
 * @param {Record<string, object>} opts.sections — section results keyed by section name
 * @returns {object} — report matching HealthReportSchema shape
 */
export function buildHealthReport({ bundlePath, profile, sections }) {
  const { topLevelStatus, topLevelIssues } = computeHealthStatus(profile, sections);

  const SECTION_KEYS = ['trace', 'gate_attempts', 'bundle_schema', 'timeline', 'legacy_trace', 'work_units', 'ledger', 'cache_trails', 'source_recoverability'];

  /** Build a section result, always injecting the `required` flag. */
  function section(k) {
    const provided = sections[k];
    const req = isRequiredSection(profile, k);
    if (provided) {
      return { required: req, ...provided };
    }
    return { status: SECTION_STATUS.NOT_APPLICABLE, required: req };
  }

  const result = {
    schema_version: 'experiment_health.v1',
    bundle_path: bundlePath,
    profile,
    status: topLevelStatus,
    issues: topLevelIssues,
  };

  for (const k of SECTION_KEYS) {
    result[k] = section(k);
  }

  return result;
}
