// Research-style projection feedback shared by topic-state and readiness Gates.
// @impl RES-002, RES-007, RES-008

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResearchStyleParamsSchema } from '../../schema/contracts/profile.mjs';
import { computeResearchStyleParams } from './research-style-params.mjs';

export const RESEARCH_STYLE_WRITER_PATH = 'DPT_FRAMEWORK/cli/apply-research-style.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const RESEARCH_STYLES_DIR = join(__dirname, '..', '..', 'schema', 'research-styles');

function shellArgument(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function completeObjectKeys(value, expected) {
  if (!isPlainObject(value)) return { missing: Object.keys(expected), unexpected: [] };
  const actualKeys = Object.keys(value);
  const expectedKeys = Object.keys(expected);
  return {
    missing: expectedKeys.filter((key) => !Object.hasOwn(value, key)),
    unexpected: actualKeys.filter((key) => !Object.hasOwn(expected, key)),
  };
}

export function buildResearchStyleApplyCommand({ bundlePath, selectedProfile } = {}) {
  if (typeof bundlePath !== 'string' || !bundlePath.trim()) {
    throw new TypeError('bundlePath must be a non-empty string');
  }
  if (typeof selectedProfile !== 'string' || !/^[a-z][a-z0-9_]*$/.test(selectedProfile)) {
    throw new TypeError('selectedProfile must be a canonical research profile name');
  }
  return `node ${RESEARCH_STYLE_WRITER_PATH} --bundle ${shellArgument(resolve(bundlePath))} --style ${shellArgument(selectedProfile)}`;
}

export function readResearchStyleDefinition(selectedProfile) {
  if (typeof selectedProfile !== 'string' || !/^[a-z][a-z0-9_]*$/.test(selectedProfile)) {
    throw new TypeError('selectedProfile must be a canonical research profile name');
  }
  return JSON.parse(readFileSync(join(RESEARCH_STYLES_DIR, `${selectedProfile}.json`), 'utf8'));
}

export function hasOnlyResearchStyleProjectionIssues(issues) {
  return Array.isArray(issues)
    && issues.length > 0
    && issues.every((issue) => issue?.path?.[0] === 'research_style_params');
}

// This evaluator deliberately receives only already-read facts. It neither
// reads a bundle nor chooses a profile or writes a projection.
export function evaluateResearchStyleProjectionFreshness({
  selectedProfile,
  styleDefinition,
  topicCount,
  researchStyleParams,
} = {}) {
  if (typeof selectedProfile !== 'string' || !selectedProfile.trim() || selectedProfile === 'not_selected') {
    return {
      passed: false,
      state: 'selected_profile_unusable',
      selected_profile: typeof selectedProfile === 'string' ? selectedProfile : null,
      topic_count: topicCount ?? null,
      expected_params: null,
      observed_params: researchStyleParams ?? null,
    };
  }

  let expectedParams;
  try {
    expectedParams = computeResearchStyleParams({ styleDefinition, topicCount });
  } catch (error) {
    return {
      passed: false,
      state: 'style_definition_invalid',
      selected_profile: selectedProfile,
      topic_count: topicCount ?? null,
      expected_params: null,
      observed_params: researchStyleParams ?? null,
      error: error.message || String(error),
    };
  }

  if (researchStyleParams === null || researchStyleParams === undefined) {
    return {
      passed: false,
      state: 'absent',
      selected_profile: selectedProfile,
      topic_count: topicCount,
      expected_params: expectedParams,
      observed_params: null,
      missing_fields: Object.keys(expectedParams),
      unexpected_fields: [],
    };
  }

  const parsed = ResearchStyleParamsSchema.safeParse(researchStyleParams);
  const keyShape = completeObjectKeys(researchStyleParams, expectedParams);
  if (!parsed.success || keyShape.missing.length > 0 || keyShape.unexpected.length > 0) {
    return {
      passed: false,
      state: 'partial',
      selected_profile: selectedProfile,
      topic_count: topicCount,
      expected_params: expectedParams,
      observed_params: researchStyleParams,
      missing_fields: keyShape.missing,
      unexpected_fields: keyShape.unexpected,
      schema_issues: parsed.success
        ? []
        : parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    };
  }

  const differingFields = Object.keys(expectedParams).filter((key) => (
    !Object.is(parsed.data[key], expectedParams[key])
  ));
  if (differingFields.length > 0) {
    return {
      passed: false,
      state: 'stale_or_wrong_profile',
      selected_profile: selectedProfile,
      topic_count: topicCount,
      expected_params: expectedParams,
      observed_params: parsed.data,
      differing_fields: differingFields,
      missing_fields: [],
      unexpected_fields: [],
    };
  }

  return {
    passed: true,
    state: 'fresh',
    selected_profile: selectedProfile,
    topic_count: topicCount,
    expected_params: expectedParams,
    observed_params: parsed.data,
    differing_fields: [],
    missing_fields: [],
    unexpected_fields: [],
  };
}
