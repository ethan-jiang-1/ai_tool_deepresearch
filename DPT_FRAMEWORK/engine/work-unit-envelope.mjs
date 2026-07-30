// @impl DEW-002, DEW-022, DEW-024, SNC-008, WAI-008, WTS-010
// Work-unit envelope: file refs, result schema, task markdown, spawn prompt, envelope write.

import {
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_REQUIRED_RECEIPT_FIELDS,
} from './work-unit-constants.mjs';
import {
  now,
  rel,
  writeJson,
  logCliPath,
  bundleName,
} from './work-unit-utils.mjs';
import {
  workUnitsRoot,
} from './work-unit-index.mjs';
import {
  buildSourceRefLineage,
} from './work-unit-validation.mjs';
import {
  WORK_UNIT_BEACON_SCHEMA_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitAgentFileSchema,
  WorkUnitManifestSchema,
  WorkUnitStatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import { describeCacheLeafAuthoringProjection } from './helpers/cache-leaf-contract.mjs';

export function refsForWorkUnit(bundleDir, { wave, work_id }) {
  const dir = path.join(workUnitsRoot(bundleDir), `wave${wave}`, work_id);
  return {
    abs_dir: dir,
    refs: {
      work_unit_dir: rel(bundleDir, dir),
      manifest_ref: rel(bundleDir, path.join(dir, 'manifest.json')),
      task_ref: rel(bundleDir, path.join(dir, 'task.md')),
      result_schema_ref: rel(bundleDir, path.join(dir, 'result.schema.json')),
      beacon_ref: rel(bundleDir, path.join(dir, '_beacon.json')),
      runtime_receipt_ref: rel(bundleDir, path.join(dir, 'runtime-receipt.jsonl')),
      status_ref: rel(bundleDir, path.join(dir, '_status.json')),
      result_ref: rel(bundleDir, path.join(dir, 'result.json')),
      agent_ref: rel(bundleDir, path.join(dir, '_agent.json')),
    },
  };
}

const BASE_RESULT_REQUIRED_FIELDS = Object.freeze(['work_id', 'queue_item_id', 'kind', 'receipt_nonce']);
const DEFAULT_RESULT_REQUIRED_FIELDS = Object.freeze([...BASE_RESULT_REQUIRED_FIELDS, 'output_files', 'cache_trails']);

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && value.length > 0))];
}

function requiredResultFields(outputContract) {
  const fromContract = uniqueStrings(outputContract?.required_result_fields);
  return fromContract.length > 0 ? fromContract : [...DEFAULT_RESULT_REQUIRED_FIELDS];
}

function outputFileItemSchema(outputContract) {
  const roles = uniqueStrings(outputContract?.output_files?.allowed_roles);
  const roleSchema = roles.length > 0
    ? { type: 'string', enum: roles }
    : { not: {} };
  const requiredOutputs = Array.isArray(outputContract?.required_outputs) ? outputContract.required_outputs : [];
  return {
    type: 'object',
    required: ['path', 'role'],
    properties: {
      path: { type: 'string', minLength: 1 },
      role: roleSchema,
      source_url: { type: 'string', format: 'uri' },
      source_slug: { type: 'string', minLength: 1 },
    },
    ...(requiredOutputs.length > 0 ? {
      allOf: requiredOutputs.map((required) => ({
        if: {
          properties: { path: { const: required.path } },
          required: ['path'],
        },
        then: {
          properties: { role: { const: required.role } },
        },
      })),
    } : {}),
    additionalProperties: false,
  };
}

function outputFilesSchema(outputContract) {
  const requiredOutputs = Array.isArray(outputContract?.required_outputs) ? outputContract.required_outputs : [];
  const defaultOutputs = requiredOutputs.map(({ path: outputPath, role }) => ({ path: outputPath, role }));
  return {
    type: 'array',
    items: outputFileItemSchema(outputContract),
    default: defaultOutputs,
    ...(requiredOutputs.length > 0 ? {
      allOf: requiredOutputs.map((required) => ({
        contains: {
          type: 'object',
          properties: {
            path: { const: required.path },
            role: { const: required.role },
          },
          required: ['path', 'role'],
        },
        minContains: 1,
        maxContains: 1,
      })),
    } : {}),
  };
}

function sourceClaimItemSchema() {
  return {
    type: 'object',
    required: ['url', 'source_ref', 'acceptance_status', 'is_new_vs_wave0'],
    properties: {
      url: { type: 'string', format: 'uri' },
      source_ref: { type: 'string', minLength: 1 },
      acceptance_status: { type: 'string', minLength: 1 },
      is_new_vs_wave0: { type: 'boolean' },
      cache_trail_refs: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
      degraded_capture_ref: {
        anyOf: [
          { type: 'string', minLength: 1 },
          { type: 'null' },
        ],
      },
    },
    additionalProperties: false,
  };
}

function validateEnvelopeContract(manifest, properties) {
  const outputContract = manifest.output_contract;
  const cachePolicy = manifest.cache_policy;
  if (!outputContract || typeof outputContract !== 'object' || Array.isArray(outputContract)) {
    throw new Error(`work-unit output contract is invalid for ${manifest.kind}: expected an object`);
  }
  const configuredRequired = outputContract.required_result_fields;
  if (!Array.isArray(configuredRequired) || configuredRequired.length === 0) {
    throw new Error(`work-unit output contract is invalid for ${manifest.kind}: required_result_fields must be a non-empty array`);
  }
  const required = uniqueStrings(configuredRequired);
  if (required.length !== configuredRequired.length) {
    throw new Error(`work-unit output contract is invalid for ${manifest.kind}: required_result_fields must contain unique non-empty strings`);
  }
  for (const identityField of BASE_RESULT_REQUIRED_FIELDS) {
    if (!required.includes(identityField)) {
      throw new Error(`work-unit output contract is invalid for ${manifest.kind}: required_result_fields must include ${identityField}`);
    }
  }
  const unknownRequired = required.filter((field) => !Object.hasOwn(properties, field));
  if (unknownRequired.length > 0) {
    throw new Error(`work-unit output contract is invalid for ${manifest.kind}: unknown required result field(s) ${unknownRequired.join(', ')}`);
  }

  const roles = outputContract.output_files?.allowed_roles;
  if (!Array.isArray(roles) || roles.length === 0 || uniqueStrings(roles).length !== roles.length) {
    throw new Error(`work-unit output contract is invalid for ${manifest.kind}: output_files.allowed_roles must contain unique non-empty roles`);
  }
  const sourceClaims = outputContract.source_claims || {};
  const priorRoles = sourceClaims.prior_submitted_output_roles;
  if (priorRoles !== undefined) {
    if (sourceClaims.allowed !== true) {
      throw new Error(`work-unit output contract is invalid for ${manifest.kind}: prior_submitted_output_roles requires source_claims.allowed=true`);
    }
    if (!Array.isArray(priorRoles) || priorRoles.length === 0 || uniqueStrings(priorRoles).length !== priorRoles.length) {
      throw new Error(`work-unit output contract is invalid for ${manifest.kind}: prior_submitted_output_roles must contain unique non-empty roles`);
    }
    const unknownPriorRoles = priorRoles.filter((role) => !roles.includes(role));
    if (unknownPriorRoles.length > 0) {
      throw new Error(`work-unit output contract is invalid for ${manifest.kind}: prior_submitted_output_roles must be a subset of output_files.allowed_roles (${unknownPriorRoles.join(', ')})`);
    }
  }
  if (!cachePolicy || typeof cachePolicy !== 'object' || Array.isArray(cachePolicy)) {
    throw new Error(`work-unit cache policy is invalid for ${manifest.kind}: expected an object`);
  }
  if (cachePolicy.required === true) {
    const leafFiles = cachePolicy.leaf_files;
    if (!Array.isArray(leafFiles) || leafFiles.length === 0 || uniqueStrings(leafFiles).length !== leafFiles.length) {
      throw new Error(`work-unit cache policy is invalid for ${manifest.kind}: required leaf_files must contain unique non-empty paths`);
    }
  }
}

function resultSchemaDocument(manifest) {
  const outputContract = manifest.output_contract || {};
  const properties = {
    schema_version: { const: 'work-unit.result.v1', default: 'work-unit.result.v1' },
    work_id: { const: manifest.work_id },
    queue_item_id: { const: manifest.queue_item_id },
    kind: { const: manifest.kind },
    receipt_nonce: { const: manifest.receipt_nonce },
    ...(manifest.actor_contract_version ? {
      actor_contract_version: { const: manifest.actor_contract_version },
      execution_actor_class: { const: manifest.actor_execution.execution_actor_class },
    } : {}),
    summary: { type: 'string', default: '' },
    output_files: outputFilesSchema(outputContract),
    cache_trails: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
  };
  if (outputContract?.source_claims?.allowed === true) {
    properties.source_claims = { type: 'array', items: sourceClaimItemSchema(), default: [] };
    properties.accepted_source_urls = { type: 'array', items: { type: 'string', format: 'uri' }, default: [] };
  }
  validateEnvelopeContract(manifest, properties);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `Work-unit result for ${manifest.kind}`,
    type: 'object',
    required: [
      ...requiredResultFields(outputContract),
      ...(manifest.actor_contract_version ? ['actor_contract_version', 'execution_actor_class'] : []),
    ],
    properties,
    additionalProperties: false,
  };
}

function resultStarterFromSchema(schema) {
  return Object.fromEntries(Object.entries(schema.properties).map(([field, contract]) => {
    if (Object.hasOwn(contract, 'const')) return [field, contract.const];
    if (Object.hasOwn(contract, 'default')) return [field, contract.default];
    if (contract.type === 'array') return [field, []];
    return [field, ''];
  }));
}

function jsonBlock(value) {
  return JSON.stringify(value, null, 2);
}

function absolutePathMap(manifest, bundleDir) {
  const refs = {
    bundle_dir: path.resolve(bundleDir),
    work_unit_dir: manifest.paths.work_unit_dir,
    manifest_ref: manifest.paths.manifest_ref,
    task_ref: manifest.paths.task_ref,
    result_schema_ref: manifest.paths.result_schema_ref,
    beacon_ref: manifest.paths.beacon_ref,
    runtime_receipt_ref: manifest.paths.runtime_receipt_ref,
    status_ref: manifest.paths.status_ref,
    result_ref: manifest.paths.result_ref,
    agent_ref: manifest.paths.agent_ref,
  };
  return Object.fromEntries(Object.entries(refs).map(([key, value]) => [
    key,
    key === 'bundle_dir' ? value : path.join(path.resolve(bundleDir), value),
  ]));
}

function isCanonicalRef(ref) {
  if (typeof ref !== 'string' || ref.length === 0 || path.posix.isAbsolute(ref)) return false;
  if (ref.includes('\\') || ref.includes('//')) return false;
  const segments = ref.split('/');
  return !segments.some((segment) => segment === '' || segment === '.' || segment === '..')
    && path.posix.normalize(ref) === ref;
}

function normalizeActorDelivery(manifest, actorDelivery) {
  if (actorDelivery === undefined || actorDelivery === null) return null;
  if (!manifest.actor_execution) throw new Error('actor delivery requires an actor-bound work-unit manifest');
  if (!actorDelivery || typeof actorDelivery !== 'object' || Array.isArray(actorDelivery)) {
    throw new Error('actor delivery projection must be an object');
  }
  const guidance = actorDelivery.role_guidance;
  if (!guidance || typeof guidance !== 'object' || Array.isArray(guidance)) {
    throw new Error('actor delivery requires role guidance');
  }
  if (guidance.role_key !== manifest.actor_execution.delegated_role_key) {
    throw new Error('actor delivery role guidance does not match the bound actor role');
  }
  if (!isCanonicalRef(guidance.role_ref) || typeof guidance.role_path !== 'string' || !path.isAbsolute(guidance.role_path)) {
    throw new Error('actor delivery role guidance paths are invalid');
  }
  if (!Array.isArray(guidance.shared_guidance_refs)) throw new Error('actor delivery shared guidance refs are invalid');
  const sharedGuidanceRefs = guidance.shared_guidance_refs.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || typeof entry.id !== 'string' || typeof entry.shared_scope !== 'string'
      || !isCanonicalRef(entry.ref) || typeof entry.path !== 'string' || !path.isAbsolute(entry.path)) {
      throw new Error('actor delivery shared guidance ref is invalid');
    }
    return Object.freeze({
      id: entry.id,
      shared_scope: entry.shared_scope,
      ref: entry.ref,
      path: entry.path,
    });
  });
  const requiredOutputs = manifest.output_contract.required_outputs || [];
  const suppliedDescriptors = actorDelivery.direct_output_descriptors;
  if (!Array.isArray(suppliedDescriptors) || suppliedDescriptors.length !== requiredOutputs.length) {
    throw new Error('actor delivery direct descriptors must match every required output');
  }
  const directOutputDescriptors = suppliedDescriptors.map((entry, index) => {
    const required = requiredOutputs[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || entry.path !== required.path || entry.role !== required.role || entry.direct_contract !== required.direct_contract
      || !entry.descriptor || typeof entry.descriptor !== 'object' || Array.isArray(entry.descriptor)
      || entry.descriptor.contract_id !== required.direct_contract
      || typeof entry.descriptor.purpose !== 'string'
      || !Array.isArray(entry.descriptor.bounded_requirements)
      || !Array.isArray(entry.descriptor.required_fields)
      || !Array.isArray(entry.descriptor.optional_fields)) {
      throw new Error('actor delivery direct descriptor does not match the required output contract');
    }
    return Object.freeze({
      path: entry.path,
      role: entry.role,
      direct_contract: entry.direct_contract,
      descriptor: Object.freeze({
        contract_id: entry.descriptor.contract_id,
        purpose: entry.descriptor.purpose,
        root_shape: entry.descriptor.root_shape,
        required_fields: Object.freeze([...entry.descriptor.required_fields]),
        optional_fields: Object.freeze([...entry.descriptor.optional_fields]),
        bounded_requirements: Object.freeze([...entry.descriptor.bounded_requirements]),
      }),
    });
  });
  return Object.freeze({
    role_guidance: Object.freeze({
      role_key: guidance.role_key,
      role_ref: guidance.role_ref,
      role_path: guidance.role_path,
      shared_guidance_refs: Object.freeze(sharedGuidanceRefs),
    }),
    direct_output_descriptors: Object.freeze(directOutputDescriptors),
  });
}

function actorGuidanceTaskLines(actorDelivery) {
  if (!actorDelivery) return [];
  const guidance = actorDelivery.role_guidance;
  return [
    '## Actor Guidance',
    '',
    'Read these Engine-derived guidance files before search, fetch or output authoring. They explain the assigned role but do not expand this assignment, lifecycle authority, required output set or contract selection.',
    `- Role guidance: bundle-independent ref \`${guidance.role_ref}\`; read path \`${guidance.role_path}\`.`,
    ...guidance.shared_guidance_refs.map((entry) => (
      `- Shared guidance: \`${entry.id}\` (${entry.shared_scope}); bundle-independent ref \`${entry.ref}\`; read path \`${entry.path}\`.`
    )),
    '',
  ];
}

function actorGuidanceSpawnLines(actorDelivery) {
  if (!actorDelivery) return [];
  const guidance = actorDelivery.role_guidance;
  return [
    `Read canonical role guidance before search, fetch or output authoring: ${guidance.role_ref} (${guidance.role_path}).`,
    ...guidance.shared_guidance_refs.map((entry) => (
      `Read shared actor guidance before that work: ${entry.id} (${entry.ref}; ${entry.path}).`
    )),
  ];
}

function logicalAttemptGuidanceLines(manifest, abs) {
  if (!manifest.actor_execution) return [];
  const actorClass = manifest.actor_execution.execution_actor_class;
  const common = [
    `- Logical actor route: \`${actorClass}\`; exact attempt: work_id \`${manifest.work_id}\`, receipt_nonce \`${manifest.receipt_nonce}\`.`,
    `- Assigned candidate coordinate: \`${abs.result_ref}\`; assigned receipt coordinate: \`${abs.runtime_receipt_ref}\`.`,
    '- This logical binding guides the Agent Flow only. It does not authenticate a physical writer or prove host/sub-agent liveness.',
  ];
  if (actorClass === 'phase_agent_fallback') {
    return [
      ...common,
      '- The Phase Agent may author candidate content only for this exact fallback attempt. It gains no write authority over any separately claimed delegated-subagent attempt.',
    ];
  }
  return [
    ...common,
    '- Only the selected delegated-subagent route authors candidate content for this coordinate. The Phase Agent may wait, inspect, dry-submit, formally submit the returned candidate, or use an existing terminal/supersession operation; it must not author substitute content under this binding.',
  ];
}

function lifecycleReceiptExample(manifest, event) {
  return {
    schema_version: 'work-unit.receipt-event.v1',
    event,
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    kind: manifest.kind,
    receipt_nonce: manifest.receipt_nonce,
    ...(manifest.actor_contract_version ? {
      actor_contract_version: manifest.actor_contract_version,
      execution_actor_class: manifest.actor_execution.execution_actor_class,
    } : {}),
    ts: '<ISO8601>',
  };
}

// @impl DEW-021
function taskMarkdown(manifest, bundleDir, resultSchema, actorDelivery) {
  const abs = absolutePathMap(manifest, bundleDir);
  const resultStarter = resultStarterFromSchema(resultSchema);
  const requiredOutputs = manifest.output_contract.required_outputs || [];
  const authoringOutputs = actorDelivery?.direct_output_descriptors || [];
  const cache = describeCacheLeafAuthoringProjection(manifest.cache_policy);
  let sourceRefLineage = { current_assigned_paths: [], eligible_prior_outputs: [] };
  if (manifest.output_contract.source_claims?.allowed === true) {
    try {
      sourceRefLineage = buildSourceRefLineage(bundleDir, manifest);
    } catch {
      // Claim delivery stays a projection; submit owns any current authority conflict.
    }
  }
  const receiptSkeleton = ['work_started', 'file_written', 'work_done']
    .map((event) => JSON.stringify(lifecycleReceiptExample(manifest, event)));
  const floorDeficit = manifest.kind === 'wave1_topic_deepening'
    && manifest.queue_item?.payload?.assignment_mode === 'supplementary'
    && Number.isInteger(manifest.queue_item.payload.reference_floor_deficit)
    && manifest.queue_item.payload.reference_floor_deficit > 0
    ? manifest.queue_item.payload.reference_floor_deficit
    : null;
  return [
    `# Work Unit ${manifest.work_id}`,
    '',
    manifest.task_brief,
    '',
    '## Completion Contract',
    '',
    'This is an Engine-generated authoring view of existing attempt authority. It guides the next legal work only; manifest, beacon, result schema, receipt, validators, and submit remain authoritative.',
    '',
    '### Binding And Result',
    '',
    `- work_id: \`${manifest.work_id}\`; queue_item_id: \`${manifest.queue_item_id}\`; kind: \`${manifest.kind}\`; receipt_nonce: \`${manifest.receipt_nonce}\`.`,
    ...(manifest.assignment_contract_version ? [`- assignment_contract_version: \`${manifest.assignment_contract_version}\`.`] : []),
    ...(manifest.actor_contract_version ? [`- execution_actor_class: \`${manifest.actor_execution.execution_actor_class}\`; delegated_role_key: \`${manifest.actor_execution.delegated_role_key}\`.`] : []),
    ...logicalAttemptGuidanceLines(manifest, abs),
    `- bundle_dir: \`${path.resolve(bundleDir)}\`; work_unit_dir: \`${manifest.paths.work_unit_dir}\`.`,
    `- Authority refs: manifest \`${manifest.paths.manifest_ref}\`; beacon \`${manifest.paths.beacon_ref}\`; result schema \`${manifest.paths.result_schema_ref}\`; result \`${manifest.paths.result_ref}\`; runtime receipt \`${manifest.paths.runtime_receipt_ref}\`.`,
    `- Result schema requires: ${resultSchema.required.join(', ')}. Allowed fields: ${Object.keys(resultSchema.properties).join(', ')}.`,
    ...(floorDeficit === null ? [] : [
      `- Read-only acquisition objective: the bound queue snapshot recorded a remaining gap of ${floorDeficit} countable current-canonical references for this Topic. This is not a required output, result field, receipt condition, source-acceptance claim, or Wave1 Gate pass assertion; the Phase reruns convergence from current direct facts after submit.`,
    ]),
    '',
    '### Result JSON Starter',
    '',
    'Copy this object to the assigned result path and replace only actor-produced content. The Engine has not created `result.json`.',
    '',
    '```json',
    jsonBlock(resultStarter),
    '```',
    '',
    '### Required Outputs',
    '',
    ...(requiredOutputs.length === 0
      ? ['- Required direct outputs: none for this assignment.']
      : requiredOutputs.flatMap((required, index) => {
        const authoring = authoringOutputs[index]?.descriptor;
        const lines = [
          `- \`${required.path}\` (role \`${required.role}\`; direct contract \`${required.direct_contract}\`; absolute \`${path.join(path.resolve(bundleDir), required.path)}\`).`,
        ];
        if (authoring) {
          lines.push(`  - Root shape: \`${authoring.root_shape}\`. ${authoring.purpose}.`);
          if (authoring.required_fields.length > 0) lines.push(`  - Required metadata fields: ${authoring.required_fields.map((field) => `\`${field}\``).join(', ')}.`);
          if (authoring.optional_fields.length > 0) lines.push(`  - Optional metadata fields: ${authoring.optional_fields.map((field) => `\`${field}\``).join(', ')}.`);
          lines.push(...authoring.bounded_requirements.map((requirement) => `  - ${requirement}`));
        }
        return lines;
      })),
    ...(manifest.output_contract.output_files.reference_requires_source_url === true
      ? ['- Every `reference` output requires its parseable `source_url`.']
      : []),
    '',
    '### Cache And Source Facts',
    '',
    `- Required cache leaves: ${cache.required_leaves.map((leaf) => `\`${leaf}\``).join(', ')}.`,
    `- ${cache.page_rule}`,
    `- Allowed meta.json source-mapping fields: ${cache.allowed_meta_mapping_fields.map((field) => `\`${field}\``).join(', ')}.`,
    `- ${cache.cache_trail_declaration}`,
    ...(manifest.output_contract.source_claims?.allowed === true
      ? [
          '- `source_claims[]` binds accepted URLs to declared cache trails or an explicit degraded capture; `source_ref` may name only a current declared output or an authorized prior submitted output.',
          `- Claim-time source lineage: current assigned paths ${sourceRefLineage.current_assigned_paths.map((entry) => `\`${entry}\``).join(', ') || '<none>'}; eligible prior outputs ${sourceRefLineage.eligible_prior_outputs.map((entry) => `\`${entry.path}\``).join(', ') || '<none>'}.`,
        ]
      : []),
    '',
    '### Lifecycle Receipt And Handoff',
    '',
    `- Append lifecycle evidence as JSONL to the assigned runtime receipt \`${manifest.paths.runtime_receipt_ref}\`; every event carries work_id, queue_item_id, kind, and receipt_nonce. \`log-event.mjs\` is optional diagnostic mirroring only and never satisfies or replaces the assigned receipt.`,
    '- Progress events are diagnostics only; they do not satisfy output, cache, source-claim, ledger, or gate authority.',
    '',
    '```jsonl',
    ...receiptSkeleton,
    '```',
    '',
    '### Verify Before Return',
    '',
    '- Write every output, cache leaf, receipt event, and result under the active bundle root. Do not mutate queue, index, ledger, beacon, or Gate state.',
    '- Verify every assigned required output against its listed direct contract before recording `work_done`.',
    `- The Phase Agent runs the existing same claimed attempt dry-submit after the actor returns: \`node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit "${path.resolve(bundleDir)}" --work-id "${manifest.work_id}" --result "${abs.result_ref}"\`.`,
    '- Return any later `busy`, `suspect_transaction`, `recover-declaration`, or `supersede` feedback to the Phase Agent. The selected actor does not edit ledger/index/status/queue/lock/journal/hash authority or create a successor.',
    '- Return the result path to the Phase Agent. Formal submit is the only normal first-acceptance owner.',
    '',
    ...actorGuidanceTaskLines(actorDelivery),
    '## Diagnostic Logging',
    '',
    'Use optional diagnostic logging only when useful. It never substitutes for the runtime receipt or formal submit.',
    '',
    '## Runtime Refs',
    '',
    'Coding-agent runtime IDs, thread IDs, session IDs, spawn request IDs, and cancel refs are optional diagnostic `runtime_refs`; they are not queue, submit, ledger, or Gate authority.',
    '',
  ].join('\n');
}

export function spawnPromptForWorkUnit(manifest, bundleDir = null, { actorDelivery } = {}) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const normalizedActorDelivery = normalizeActorDelivery(parsed, actorDelivery);
  const resolvedBundleDir = bundleDir ? path.resolve(bundleDir) : null;
  const absTask = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.task_ref) : parsed.paths.task_ref;
  const actorInstruction = parsed.actor_execution?.execution_actor_class === 'phase_agent_fallback'
    ? `You are the Phase Agent executing explicit fallback work unit ${parsed.work_id}.`
    : `You are executing delegated work unit ${parsed.work_id} as role ${parsed.actor_execution?.delegated_role_key || '<legacy-unrecorded>'}.`;
  const routeBoundary = parsed.actor_execution?.execution_actor_class === 'phase_agent_fallback'
    ? `Author only this exact fallback attempt (${parsed.work_id}, receipt_nonce ${parsed.receipt_nonce}); this grants no authority over another delegated attempt.`
    : `Only this delegated route authors candidate content for ${parsed.work_id}; the Phase Agent may inspect or submit the returned candidate but must not author substitute content under the same binding.`;
  return [
    actorInstruction,
    '',
    resolvedBundleDir ? `Active bundle_dir: ${resolvedBundleDir}` : 'Read bundle_dir from the assigned _beacon.json before writing files.',
    `Open task.md and begin at ## Completion Contract: ${absTask}`,
    'The task Completion Contract is the sole attempt-bound authoring entry. Do not infer, duplicate, or replace it with a separate result, receipt, cache, or identity instruction set.',
    routeBoundary,
    'The binding is logical guidance, not physical actor authentication or liveness proof.',
    'Append lifecycle evidence as JSONL to the assigned receipt named by the task Completion Contract; log-event.mjs is optional diagnostic mirroring only and never satisfies or replaces that receipt.',
    ...actorGuidanceSpawnLines(normalizedActorDelivery),
    'Use no authority outside the task Completion Contract. Return the result path to the Phase Agent after the task-directed verification.',
  ].join('\n');
}

export function writeWorkUnitEnvelope(bundleDir, manifest, { actorDelivery } = {}) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const normalizedActorDelivery = normalizeActorDelivery(parsed, actorDelivery);
  const resultSchema = resultSchemaDocument(parsed);
  const dir = path.join(bundleDir, parsed.paths.work_unit_dir);
  mkdirSync(dir, { recursive: true });
  writeJson(path.join(bundleDir, parsed.paths.manifest_ref), parsed);
  writeFileSync(path.join(bundleDir, parsed.paths.task_ref), taskMarkdown(parsed, bundleDir, resultSchema, normalizedActorDelivery));
  writeJson(path.join(bundleDir, parsed.paths.result_schema_ref), resultSchema);
  writeJson(path.join(bundleDir, parsed.paths.beacon_ref), WorkUnitBeaconSchema.parse({
    schema_version: WORK_UNIT_BEACON_SCHEMA_VERSION,
    work_id: parsed.work_id,
    queue_item_id: parsed.queue_item_id,
    kind: parsed.kind,
    bundle: bundleName(bundleDir),
    bundle_dir: path.resolve(bundleDir),
    receipt_nonce: parsed.receipt_nonce,
    deadline_at: parsed.deadline_at,
    ...(parsed.assignment_contract_version ? { assignment_contract_version: parsed.assignment_contract_version } : {}),
    ...(parsed.submission_contract_version ? { submission_contract_version: parsed.submission_contract_version } : {}),
    work_unit_dir: parsed.paths.work_unit_dir,
    manifest_ref: parsed.paths.manifest_ref,
    task_ref: parsed.paths.task_ref,
    result_schema_ref: parsed.paths.result_schema_ref,
    result_ref: parsed.paths.result_ref,
    runtime_receipt_ref: parsed.paths.runtime_receipt_ref,
    log_cli: logCliPath(),
    output_contract: parsed.output_contract,
    cache_policy: parsed.cache_policy,
    required_receipt_fields: [...WORK_UNIT_REQUIRED_RECEIPT_FIELDS],
    runtime_refs: parsed.runtime_refs || {},
    runtime_refs_authority: 'diagnostic_only',
    ...(parsed.actor_contract_version ? {
      actor_contract_version: parsed.actor_contract_version,
      actor_execution: parsed.actor_execution,
    } : {}),
  }));
  writeFileSync(path.join(bundleDir, parsed.paths.runtime_receipt_ref), '');
  writeJson(path.join(bundleDir, parsed.paths.status_ref), WorkUnitStatusFileSchema.parse({
    work_id: parsed.work_id,
    status: 'claimed',
    updated_at: now(),
  }));
  writeJson(path.join(bundleDir, parsed.paths.agent_ref), WorkUnitAgentFileSchema.parse({
    work_id: parsed.work_id,
    runtime_refs: parsed.runtime_refs || {},
    updated_at: now(),
  }));
  return parsed;
}
