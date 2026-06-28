// health-report-schema.test.mjs — Unit tests for health report schema and profile table
// @impl EXO-001, EXO-002
// Location: tests/schema/health-report-schema.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import {
  HealthReportSchema,
  SectionStatusSchema,
  SECTION_STATUS,
  PROFILE_TABLE,
  requiredSectionsFor,
  isRequiredSection,
  computeHealthStatus,
  validateSectionStatus,
  buildHealthReport,
} from '../../experiments_env/shared/health-report-schema.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Section Status Enum
// ═══════════════════════════════════════════════════════════════════════════

describe('SectionStatusSchema', () => {
  it('accepts all four valid status values', () => {
    for (const s of Object.values(SECTION_STATUS)) {
      assert.doesNotThrow(() => SectionStatusSchema.parse(s));
    }
  });

  it('rejects invalid status strings', () => {
    assert.throws(() => SectionStatusSchema.parse('invalid'));
    assert.throws(() => SectionStatusSchema.parse(''));
    assert.throws(() => SectionStatusSchema.parse('error'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Profile Table — EXO-002
// ═══════════════════════════════════════════════════════════════════════════

describe('Profile Table', () => {
  it('light requires only trace, legacy_trace, bundle_schema', () => {
    const required = requiredSectionsFor('light');
    assert.deepStrictEqual(required, ['trace', 'legacy_trace', 'bundle_schema']);
  });

  it('standard requires light checks + gate_attempts + timeline', () => {
    const required = requiredSectionsFor('standard');
    assert.ok(required.includes('trace'));
    assert.ok(required.includes('legacy_trace'));
    assert.ok(required.includes('bundle_schema'));
    assert.ok(required.includes('gate_attempts'));
    assert.ok(required.includes('timeline'));
    assert.strictEqual(required.length, 5);
  });

  it('heavy requires standard checks + ledger + receipts + cache_trails + dedup', () => {
    const required = requiredSectionsFor('heavy');
    assert.ok(required.includes('ledger'));
    assert.ok(required.includes('receipts'));
    assert.ok(required.includes('cache_trails'));
    assert.ok(required.includes('dedup'));
    assert.strictEqual(required.length, 9);
  });

  it('isRequiredSection returns correct values', () => {
    assert.strictEqual(isRequiredSection('light', 'trace'), true);
    assert.strictEqual(isRequiredSection('light', 'ledger'), false);
    assert.strictEqual(isRequiredSection('standard', 'gate_attempts'), true);
    assert.strictEqual(isRequiredSection('standard', 'ledger'), false);
    assert.strictEqual(isRequiredSection('heavy', 'ledger'), true);
  });

  it('throws for unknown profile', () => {
    assert.throws(() => requiredSectionsFor('unknown'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section Status Validation
// ═══════════════════════════════════════════════════════════════════════════

describe('validateSectionStatus', () => {
  it('required section accepts clean or issues', () => {
    assert.deepStrictEqual(validateSectionStatus('clean', true), { valid: true });
    assert.deepStrictEqual(validateSectionStatus('issues', true), { valid: true });
  });

  it('required section rejects not_applicable or observed_optional', () => {
    const r1 = validateSectionStatus('not_applicable', true);
    assert.strictEqual(r1.valid, false);
    assert.ok(r1.error.includes('Required'));

    const r2 = validateSectionStatus('observed_optional', true);
    assert.strictEqual(r2.valid, false);
    assert.ok(r2.error.includes('Required'));
  });

  it('optional section accepts any valid status', () => {
    for (const s of Object.values(SECTION_STATUS)) {
      assert.deepStrictEqual(validateSectionStatus(s, false), { valid: true });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Top-Level Status Computation — EXO-001/EXO-002
// ═══════════════════════════════════════════════════════════════════════════

describe('computeHealthStatus', () => {
  it('returns clean when all required sections are clean', () => {
    const sections = {
      trace: { status: 'clean', sectionIssues: [] },
      legacy_trace: { status: 'clean', sectionIssues: [] },
      bundle_schema: { status: 'clean', sectionIssues: [] },
    };
    const result = computeHealthStatus('light', sections);
    assert.strictEqual(result.topLevelStatus, 'clean');
    assert.deepStrictEqual(result.topLevelIssues, []);
  });

  it('returns issues when a required section has issues', () => {
    const sections = {
      trace: { status: 'issues', sectionIssues: [{ detail: 'trace file missing' }] },
      legacy_trace: { status: 'clean', sectionIssues: [] },
      bundle_schema: { status: 'clean', sectionIssues: [] },
    };
    const result = computeHealthStatus('light', sections);
    assert.strictEqual(result.topLevelStatus, 'issues');
    assert.strictEqual(result.topLevelIssues.length, 1);
    assert.strictEqual(result.topLevelIssues[0].section, 'trace');
    assert.strictEqual(result.topLevelIssues[0].detail, 'trace file missing');
  });

  it('optional section issues do not flip top-level status', () => {
    const sections = {
      trace: { status: 'clean', sectionIssues: [] },
      legacy_trace: { status: 'clean', sectionIssues: [] },
      bundle_schema: { status: 'clean', sectionIssues: [] },
      ledger: { status: 'issues', sectionIssues: [{ detail: 'ledger missing' }] },
    };
    const result = computeHealthStatus('light', sections);
    assert.strictEqual(result.topLevelStatus, 'clean');  // ledger is optional in light
    assert.deepStrictEqual(result.topLevelIssues, []);
  });

  it('optional section issues are excluded from top-level issues', () => {
    const sections = {
      trace: { status: 'clean', sectionIssues: [] },
      legacy_trace: { status: 'clean', sectionIssues: [] },
      bundle_schema: { status: 'issues', sectionIssues: [{ detail: 'validate failed' }] },
      ledger: { status: 'issues', sectionIssues: [{ detail: 'ledger missing' }] },
    };
    const result = computeHealthStatus('light', sections);
    assert.strictEqual(result.topLevelStatus, 'issues'); // bundle_schema is required
    assert.strictEqual(result.topLevelIssues.length, 1);
    assert.strictEqual(result.topLevelIssues[0].section, 'bundle_schema');
  });

  it('heavy profile aggregates all required-section issues', () => {
    const sections = {
      trace: { status: 'issues', sectionIssues: [{ detail: 'trace missing' }] },
      legacy_trace: { status: 'clean', sectionIssues: [] },
      bundle_schema: { status: 'clean', sectionIssues: [] },
      gate_attempts: { status: 'issues', sectionIssues: [{ detail: 'no gate attempts' }] },
      timeline: { status: 'clean', sectionIssues: [] },
      ledger: { status: 'issues', sectionIssues: [{ detail: 'ledger empty' }] },
      receipts: { status: 'clean', sectionIssues: [] },
      cache_trails: { status: 'clean', sectionIssues: [] },
      dedup: { status: 'clean', sectionIssues: [] },
    };
    const result = computeHealthStatus('heavy', sections);
    assert.strictEqual(result.topLevelStatus, 'issues');
    assert.strictEqual(result.topLevelIssues.length, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Health Report Schema Validation — EXO-001
// ═══════════════════════════════════════════════════════════════════════════

describe('HealthReportSchema', () => {
  function makeReport(overrides = {}) {
    const base = buildHealthReport({
      bundlePath: 'dpt_disp_test_a',
      profile: 'light',
      sections: {
        trace: { status: 'clean', sectionIssues: [], present: true, event_count: 5, by_event: { check: 3 }, parse_errors: 0 },
        legacy_trace: { status: 'clean', sectionIssues: [], paths: [] },
        bundle_schema: { status: 'clean', sectionIssues: [], validate_bundle: { passed: true }, inspect_bundle: { passed: true } },
      },
    });
    return { ...base, ...overrides };
  }

  it('accepts a valid light report', () => {
    const report = makeReport();
    assert.doesNotThrow(() => HealthReportSchema.parse(report));
    assert.strictEqual(report.schema_version, 'experiment_health.v1');
    assert.strictEqual(report.profile, 'light');
    assert.strictEqual(report.status, 'clean');
  });

  it('accepts a valid heavy report', () => {
    const report = makeReport({
      profile: 'heavy',
      status: 'clean',
      gate_attempts: { status: 'clean', required: true, count: 2, pass: 2, fail: 0, by_gate: { 'wave0-complete': 2 }, diagnostics: [] },
      timeline: { status: 'clean', required: true, trace_gate_attempts: 2, log_gate_attempts: 2, mismatches: 0 },
      ledger: { status: 'clean', required: true, declarations: 2, schema_errors: 0 },
      receipts: { status: 'clean', required: true, slots: 2, missing: 0, incomplete: 0 },
      cache_trails: { status: 'clean', required: true, leaves: 2, missing: 0 },
      dedup: { status: 'clean', required: true, checks: 2, issues: 0 },
    });
    assert.doesNotThrow(() => HealthReportSchema.parse(report));
  });

  it('rejects a report missing required fields', () => {
    assert.throws(() => HealthReportSchema.parse({}));
    assert.throws(() => HealthReportSchema.parse({ schema_version: 'experiment_health.v1' }));
  });

  it('rejects an invalid schema_version', () => {
    const report = makeReport({ schema_version: 'v2' });
    assert.throws(() => HealthReportSchema.parse(report));
  });

  it('rejects an invalid profile', () => {
    const report = makeReport({ profile: 'extreme' });
    assert.throws(() => HealthReportSchema.parse(report));
  });

  it('rejects an invalid top-level status', () => {
    const report = makeReport({ status: 'not_applicable' });
    assert.throws(() => HealthReportSchema.parse(report));
  });

  it('accepts a report with top-level issues status', () => {
    const report = makeReport({
      status: 'issues',
      issues: [{ section: 'trace', detail: 'trace file missing' }],
      trace: { status: 'issues', required: true, present: false },
    });
    assert.doesNotThrow(() => HealthReportSchema.parse(report));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildHealthReport — EXO-001
// ═══════════════════════════════════════════════════════════════════════════

describe('buildHealthReport', () => {
  it('fills all 9 sections with defaults when not provided', () => {
    const report = buildHealthReport({
      bundlePath: 'dpt_disp_obs_light_a',
      profile: 'light',
      sections: {
        trace: { status: 'clean', sectionIssues: [] },
        legacy_trace: { status: 'clean', sectionIssues: [] },
        bundle_schema: { status: 'clean', sectionIssues: [] },
      },
    });

    // All 9 sections present
    assert.ok('trace' in report);
    assert.ok('gate_attempts' in report);
    assert.ok('bundle_schema' in report);
    assert.ok('timeline' in report);
    assert.ok('legacy_trace' in report);
    assert.ok('ledger' in report);
    assert.ok('receipts' in report);
    assert.ok('cache_trails' in report);
    assert.ok('dedup' in report);

    // Heavy-only sections are not_applicable in light profile
    assert.strictEqual(report.ledger.status, 'not_applicable');
    assert.strictEqual(report.ledger.required, false);
    assert.strictEqual(report.receipts.status, 'not_applicable');
    assert.strictEqual(report.receipts.required, false);
    assert.strictEqual(report.cache_trails.status, 'not_applicable');
    assert.strictEqual(report.cache_trails.required, false);
    assert.strictEqual(report.dedup.status, 'not_applicable');
    assert.strictEqual(report.dedup.required, false);

    // Top-level is clean
    assert.strictEqual(report.status, 'clean');
    assert.strictEqual(report.schema_version, 'experiment_health.v1');
  });

  it('sets required flags correctly for each profile', () => {
    const light = buildHealthReport({ bundlePath: 'b', profile: 'light', sections: { trace: { status: 'clean' }, legacy_trace: { status: 'clean' }, bundle_schema: { status: 'clean' } } });
    assert.strictEqual(light.trace.required, true);
    assert.strictEqual(light.gate_attempts.required, false);
    assert.strictEqual(light.ledger.required, false);

    const heavy = buildHealthReport({ bundlePath: 'b', profile: 'heavy', sections: { trace: { status: 'clean' }, legacy_trace: { status: 'clean' }, bundle_schema: { status: 'clean' }, gate_attempts: { status: 'clean' }, timeline: { status: 'clean' }, ledger: { status: 'clean' }, receipts: { status: 'clean' }, cache_trails: { status: 'clean' }, dedup: { status: 'clean' } } });
    assert.strictEqual(heavy.ledger.required, true);
    assert.strictEqual(heavy.cache_trails.required, true);
  });

  it('reports status as clean when no required sections have issues', () => {
    const report = buildHealthReport({
      bundlePath: 'b',
      profile: 'standard',
      sections: {
        trace: { status: 'clean' },
        legacy_trace: { status: 'clean' },
        bundle_schema: { status: 'clean' },
        gate_attempts: { status: 'clean' },
        timeline: { status: 'clean' },
      },
    });
    assert.strictEqual(report.status, 'clean');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Profile Table Guard: standard does not redefine agent-testing weight
// ═══════════════════════════════════════════════════════════════════════════

describe('Profile Table — standard profile scoping', () => {
  it('standard profile exists as an observability profile', () => {
    assert.ok('standard' in PROFILE_TABLE);
    assert.ok(Array.isArray(PROFILE_TABLE.standard.required_sections));
  });

  it('standard is a superset of light', () => {
    const lightRequired = new Set(PROFILE_TABLE.light.required_sections);
    for (const section of PROFILE_TABLE.standard.required_sections) {
      if (lightRequired.has(section)) continue;
      // Standard adds gate_attempts + timeline (which are NOT in light)
      assert.ok(['gate_attempts', 'timeline'].includes(section), `Unexpected standard-only section: ${section}`);
    }
  });

  it('heavy is a superset of standard', () => {
    const standardRequired = new Set(PROFILE_TABLE.standard.required_sections);
    for (const section of PROFILE_TABLE.heavy.required_sections) {
      if (standardRequired.has(section)) continue;
      assert.ok(['ledger', 'receipts', 'cache_trails', 'dedup'].includes(section), `Unexpected heavy-only section: ${section}`);
    }
  });
});
