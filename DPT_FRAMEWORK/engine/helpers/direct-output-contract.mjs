// @impl DEW-005, RWG-018

import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  ReferenceMetadataArraySchema,
  referenceMetadataAuthoringFields,
} from '../../schema/contracts/reference.mjs';
import { parseMarkdownSemanticSections } from './gate-helpers-checks.mjs';
import { hashValue } from '../work-unit-utils.mjs';

const MAX_BYTES = 4 * 1024 * 1024;
const READ_BYTES = MAX_BYTES + 1;

// @impl DEW-021
export const DirectOutputAuthoringProjectionSchema = z.object({
  contract_id: z.string().min(1),
  purpose: z.string().min(1),
  root_shape: z.enum(['yaml_top_level_array', 'markdown_semantic_sections']),
  required_fields: z.array(z.string().min(1)),
  optional_fields: z.array(z.string().min(1)),
  bounded_requirements: z.array(z.string().min(1)).min(1),
}).strict();
function root({ code, contractId, coordinate, expected, observed, rootClass }) {
  return {
    code,
    contract_id: contractId,
    coordinate,
    expected,
    observed,
    root_class: rootClass,
  };
}

function failure(input, detail, snapshotMeta = null) {
  return { passed: false, snapshot_meta: snapshotMeta, roots: [root({ ...input, ...detail })] };
}

function isCanonicalTarget(target) {
  if (typeof target !== 'string' || target.length === 0 || target === '.' || path.posix.isAbsolute(target)) return false;
  if (target.includes('\\') || target.includes('//') || target.includes('{') || target.includes('}') || target.includes('*')) return false;
  const segments = target.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return path.posix.normalize(target) === target;
}

function isInside(candidate, rootDir) {
  const relative = path.relative(rootDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function readBoundedSnapshot(bundleDir, target, contractId) {
  const common = { contractId, coordinate: target };
  if (!isCanonicalTarget(target)) {
    return failure(common, {
      code: 'direct_target_path_unsafe',
      expected: 'A canonical concrete bundle-relative target path.',
      observed: 'The supplied target path is not canonical and safe.',
      rootClass: 'contract_integrity',
    });
  }

  let bundleReal;
  try {
    bundleReal = realpathSync(bundleDir);
  } catch {
    return failure(common, {
      code: 'direct_bundle_root_unreadable',
      expected: 'A readable active bundle root.',
      observed: 'The active bundle root could not be resolved.',
      rootClass: 'contract_integrity',
    });
  }

  const absoluteTarget = path.join(bundleReal, target);
  let targetStat;
  let targetReal;
  try {
    targetStat = lstatSync(absoluteTarget);
    if (targetStat.isSymbolicLink()) {
      return failure(common, {
        code: 'direct_target_symlink_unsafe',
        expected: 'A regular non-symlink target inside the active bundle.',
        observed: 'The target is a symbolic link.',
        rootClass: 'contract_integrity',
      });
    }
    targetReal = realpathSync(absoluteTarget);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return failure(common, {
        code: 'direct_target_missing',
        expected: 'The assigned direct output exists.',
        observed: 'The assigned target is missing.',
        rootClass: 'semantic_content',
      });
    }
    return failure(common, {
      code: 'direct_target_unreadable',
      expected: 'A readable regular target inside the active bundle.',
      observed: 'The target path could not be inspected.',
      rootClass: 'contract_integrity',
    });
  }

  if (!isInside(targetReal, bundleReal)) {
    return failure(common, {
      code: 'direct_target_realpath_escape',
      expected: 'A target whose realpath remains inside the active bundle.',
      observed: 'The target realpath escapes the active bundle.',
      rootClass: 'contract_integrity',
    });
  }
  if (!targetStat.isFile()) {
    return failure(common, {
      code: 'direct_target_not_regular',
      expected: 'A regular file target.',
      observed: 'The target is not a regular file.',
      rootClass: 'contract_integrity',
    });
  }

  let handle = null;
  try {
    handle = openSync(absoluteTarget, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
    const openedStat = fstatSync(handle);
    const snapshotMeta = {
      bytes_read: 0,
      initial_size: openedStat.size,
      device: String(openedStat.dev),
      inode: String(openedStat.ino),
    };
    if (!openedStat.isFile()) {
      return failure(common, {
        code: 'direct_target_not_regular',
        expected: 'A regular opened file.',
        observed: 'The opened target is not a regular file.',
        rootClass: 'contract_integrity',
      }, snapshotMeta);
    }
    if (openedStat.size > MAX_BYTES) {
      return failure(common, {
        code: 'direct_target_oversize',
        expected: `At most ${MAX_BYTES} raw bytes.`,
        observed: `The opened file reports ${openedStat.size} bytes.`,
        rootClass: 'contract_integrity',
      }, snapshotMeta);
    }

    const buffer = Buffer.allocUnsafe(READ_BYTES);
    let offset = 0;
    while (offset < READ_BYTES) {
      const bytesRead = readSync(handle, buffer, offset, READ_BYTES - offset, null);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    snapshotMeta.bytes_read = offset;
    if (offset > MAX_BYTES) {
      return failure(common, {
        code: 'direct_target_oversize',
        expected: `At most ${MAX_BYTES} raw bytes.`,
        observed: `The bounded read observed more than ${MAX_BYTES} bytes.`,
        rootClass: 'contract_integrity',
      }, snapshotMeta);
    }
    return { bytes: buffer.subarray(0, offset), snapshotMeta };
  } catch {
    return failure(common, {
      code: 'direct_target_read_failed',
      expected: 'One complete bounded read from a regular target.',
      observed: 'The target could not be opened or read safely.',
      rootClass: 'contract_integrity',
    });
  } finally {
    if (handle !== null) {
      try { closeSync(handle); } catch { /* evaluation already owns a complete bounded snapshot or read root */ }
    }
  }
}

function decodeSnapshot(bytes, common, snapshotMeta) {
  let content;
  try {
    content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return failure(common, {
      code: 'direct_target_invalid_utf8',
      expected: 'Valid UTF-8 content.',
      observed: 'The bounded snapshot is not valid UTF-8.',
      rootClass: 'contract_integrity',
    }, snapshotMeta);
  }
  if (content.startsWith('\uFEFF')) content = content.slice(1);
  if (content.includes('\uFEFF')) {
    return failure(common, {
      code: 'direct_target_invalid_bom',
      expected: 'At most one leading UTF-8 BOM and no embedded BOM.',
      observed: 'The decoded content contains an additional or embedded BOM.',
      rootClass: 'contract_integrity',
    }, snapshotMeta);
  }
  return { content };
}

function evaluateWave0(content, common, snapshotMeta) {
  let parsed;
  try {
    parsed = parseYaml(content);
  } catch {
    return failure(common, {
      code: 'source_metadata_yaml_parse_invalid',
      expected: 'Parseable YAML with a top-level array.',
      observed: 'YAML parsing failed.',
      rootClass: 'semantic_content',
    }, snapshotMeta);
  }
  if (!Array.isArray(parsed)) {
    return failure(common, {
      code: 'source_metadata_top_level_array_missing',
      expected: 'A top-level YAML array.',
      observed: `The top-level YAML value is ${parsed === null ? 'null' : typeof parsed}.`,
      rootClass: 'semantic_content',
    }, snapshotMeta);
  }
  const result = ReferenceMetadataArraySchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return failure(common, {
      code: 'source_metadata_schema_invalid',
      expected: 'Every array entry satisfies ReferenceMetadataArraySchema.',
      observed: `The earliest invalid entry field is ${first?.path?.join('.') || '<root>'}.`,
      rootClass: 'semantic_content',
    }, snapshotMeta);
  }
  return {
    passed: true,
    snapshot_meta: {
      ...snapshotMeta,
      validated_array_length: result.data.length,
    },
    validated_value: result.data,
    roots: [],
  };
}

export function semanticOrderedArrayDigest(value) {
  return hashValue(ReferenceMetadataArraySchema.parse(value));
}

function evaluateEvidenceSummary(content, common, snapshotMeta) {
  const section = parseMarkdownSemanticSections(content).get('key findings') || '';
  const hasContent = section.split(/\r?\n/).some((line) => line.trim() && !/^<!--/.test(line.trim()));
  if (!hasContent) {
    return failure(common, {
      code: 'key_findings_missing_or_empty',
      expected: 'A non-empty Key Findings semantic section.',
      observed: 'The Key Findings semantic section is missing or empty.',
      rootClass: 'semantic_content',
    }, snapshotMeta);
  }
  return { passed: true, snapshot_meta: snapshotMeta, roots: [] };
}

function evaluateQuestionList(content, common, snapshotMeta) {
  const sections = parseMarkdownSemanticSections(content);
  const required = [
    'topic investigation targets',
    'question reconciliation',
    'emergent question protocol',
    'exploration / exploitation decision',
  ];
  const missing = required.filter((section) => !(sections.get(section) || '').trim());
  if (missing.length > 0) {
    return failure(common, {
      code: 'question_list_sections_missing_or_empty',
      expected: 'All four required question-list semantic sections are non-empty.',
      observed: `Missing or empty semantic section(s): ${missing.join(', ')}.`,
      rootClass: 'semantic_content',
    }, snapshotMeta);
  }
  return { passed: true, snapshot_meta: snapshotMeta, roots: [] };
}

const DIRECT_OUTPUT_CONTRACTS = Object.freeze({
  'wave0.source-metadata-array.v1': Object.freeze({
    evaluate: evaluateWave0,
    root_shape: 'yaml_top_level_array',
    descriptor: Object.freeze({
      purpose: 'Source metadata array',
      minimum_structure: Object.freeze([
        'Write a parseable top-level YAML array.',
        'Ensure every entry satisfies the assigned source metadata contract.',
      ]),
    }),
  }),
  'wave1.evidence-summary.v1': Object.freeze({
    evaluate: evaluateEvidenceSummary,
    root_shape: 'markdown_semantic_sections',
    descriptor: Object.freeze({
      purpose: 'Wave1 evidence summary',
      minimum_structure: Object.freeze([
        'Write a non-empty Key Findings semantic section supported by the assigned research.',
      ]),
    }),
  }),
  'wave1.question-list.v1': Object.freeze({
    evaluate: evaluateQuestionList,
    root_shape: 'markdown_semantic_sections',
    descriptor: Object.freeze({
      purpose: 'Wave1 question list',
      minimum_structure: Object.freeze([
        'Write non-empty Topic Investigation Targets and Question Reconciliation semantic sections.',
        'Write non-empty Emergent Question Protocol and Exploration / Exploitation Decision semantic sections.',
      ]),
    }),
  }),
});

const DIRECT_OUTPUT_CONTRACT_IDS = Object.freeze(Object.keys(DIRECT_OUTPUT_CONTRACTS));

export function directOutputContractIds() {
  return DIRECT_OUTPUT_CONTRACT_IDS;
}

export function describeDirectOutputContract(contractId) {
  const descriptor = DIRECT_OUTPUT_CONTRACTS[contractId]?.descriptor;
  if (!descriptor) throw new Error(`unknown direct contract ${String(contractId)}`);
  return descriptor;
}

export function describeDirectOutputAuthoringProjection(contractId) {
  const definition = DIRECT_OUTPUT_CONTRACTS[contractId];
  if (!definition) throw new Error(`unknown direct contract ${String(contractId)}`);
  const metadataFields = contractId === 'wave0.source-metadata-array.v1'
    ? referenceMetadataAuthoringFields()
    : { required_fields: [], optional_fields: [] };
  return DirectOutputAuthoringProjectionSchema.parse({
    contract_id: contractId,
    purpose: definition.descriptor.purpose,
    root_shape: definition.root_shape,
    required_fields: metadataFields.required_fields,
    optional_fields: metadataFields.optional_fields,
    bounded_requirements: definition.descriptor.minimum_structure,
  });
}

export function evaluateDirectOutputTarget({ bundleDir, target, contractId } = {}) {
  const common = { contractId, coordinate: typeof target === 'string' ? target : String(target ?? '') };
  const definition = DIRECT_OUTPUT_CONTRACTS[contractId];
  if (!definition) {
    return failure(common, {
      code: 'direct_contract_unknown',
      expected: 'A supported closed direct-output contract ID.',
      observed: `Unsupported direct contract ${String(contractId)}.`,
      rootClass: 'contract_integrity',
    });
  }
  const snapshot = readBoundedSnapshot(bundleDir, target, contractId);
  if (snapshot.roots) return snapshot;
  const decoded = decodeSnapshot(snapshot.bytes, common, snapshot.snapshotMeta);
  if (decoded.roots) return decoded;
  return definition.evaluate(decoded.content, common, snapshot.snapshotMeta);
}
