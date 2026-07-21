// @impl DEW-002, SNC-008, WAI-008, WTS-010
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
      || typeof entry.descriptor.purpose !== 'string' || !Array.isArray(entry.descriptor.minimum_structure)) {
      throw new Error('actor delivery direct descriptor does not match the required output contract');
    }
    return Object.freeze({
      path: entry.path,
      role: entry.role,
      direct_contract: entry.direct_contract,
      descriptor: Object.freeze({
        purpose: entry.descriptor.purpose,
        minimum_structure: Object.freeze([...entry.descriptor.minimum_structure]),
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
    ...(actorDelivery.direct_output_descriptors.length > 0 ? [
      '## Required Output Authoring',
      '',
      'For each current required output, use these contract-owned minimum authoring requirements before returning `work_done`. The direct-output evaluator remains the only acceptance authority.',
      ...actorDelivery.direct_output_descriptors.flatMap((entry) => [
        `- \`${entry.path}\` (${entry.role}; \`${entry.direct_contract}\`): ${entry.descriptor.purpose}.`,
        ...entry.descriptor.minimum_structure.map((requirement) => `  - ${requirement}`),
      ]),
      '',
    ] : []),
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
    ...actorDelivery.direct_output_descriptors.flatMap((entry) => [
      `Required output authoring for ${entry.path} (${entry.direct_contract}): ${entry.descriptor.purpose}.`,
      ...entry.descriptor.minimum_structure.map((requirement) => `- ${requirement}`),
    ]),
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

function logDetailExample(manifest, lifecycleEvent) {
  return {
    lifecycle_event: lifecycleEvent,
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    kind: manifest.kind,
    receipt_nonce: manifest.receipt_nonce,
  };
}

function taskMarkdown(manifest, bundleDir, resultSchema, actorDelivery) {
  const logCli = logCliPath();
  const abs = absolutePathMap(manifest, bundleDir);
  const workStartedReceipt = lifecycleReceiptExample(manifest, 'work_started');
  const fileWrittenReceipt = lifecycleReceiptExample(manifest, 'file_written');
  const workDoneReceipt = lifecycleReceiptExample(manifest, 'work_done');
  const searchLog = logDetailExample(manifest, 'search_started');
  const fileLog = { ...logDetailExample(manifest, 'file_written'), path: '<bundle-relative-output-path>' };
  const errorLog = { ...logDetailExample(manifest, 'error'), reason: '<short-reason>' };
  const resultStarter = resultStarterFromSchema(resultSchema);
  let sourceRefLineage = { current_assigned_paths: [], eligible_prior_outputs: [] };
  if (manifest.output_contract.source_claims?.allowed === true) {
    try {
      sourceRefLineage = buildSourceRefLineage(bundleDir, manifest);
    } catch {
      // Claim guidance remains available; submit will report the exact authority conflict.
    }
  }
  const requiredResultFields = resultSchema.required.join(', ');
  const allowedResultFields = Object.keys(resultSchema.properties).join(', ');
  const allowedOutputRoles = manifest.output_contract.output_files.allowed_roles.join(', ');
  const requiredCacheLeafFiles = (manifest.cache_policy.leaf_files || []).join(', ');
  const requiredOutputs = manifest.output_contract.required_outputs || [];
  const requiredOutputLines = requiredOutputs.map((required) => (
    `- Required output: bundle-relative \`${required.path}\`; absolute \`${path.join(path.resolve(bundleDir), required.path)}\`; role \`${required.role}\`; direct contract \`${required.direct_contract}\`.`
  ));
  return [
    `# Work Unit ${manifest.work_id}`,
    '',
    manifest.task_brief,
    '',
    '## Binding',
    '',
    `- work_id: \`${manifest.work_id}\``,
    `- queue_item_id: \`${manifest.queue_item_id}\``,
    `- kind: \`${manifest.kind}\``,
    `- receipt_nonce: \`${manifest.receipt_nonce}\``,
    ...(manifest.assignment_contract_version
      ? [`- assignment_contract_version: \`${manifest.assignment_contract_version}\``]
      : []),
    ...(manifest.actor_contract_version ? [
      `- execution_actor_class: \`${manifest.actor_execution.execution_actor_class}\``,
      `- delegated_role_key: \`${manifest.actor_execution.delegated_role_key}\``,
    ] : []),
    `- bundle_dir: \`${path.resolve(bundleDir)}\``,
    `- deadline_at: \`${manifest.deadline_at}\``,
    `- work_unit_dir: \`${manifest.paths.work_unit_dir}\``,
    `- beacon: \`${manifest.paths.beacon_ref}\``,
    `- result_schema: \`${manifest.paths.result_schema_ref}\``,
    `- result_path: \`${manifest.paths.result_ref}\``,
    `- runtime_receipt: \`${manifest.paths.runtime_receipt_ref}\``,
    '',
    'Preserve these identity fields exactly in every lifecycle receipt event and in `result.json`.',
    ...(manifest.actor_execution?.execution_actor_class === 'phase_agent_fallback' ? [
      'This single work unit is assigned to the Phase Agent fallback actor. Execute it mechanically inside the same envelope, then submit or terminalize it before claiming another fallback.',
    ] : []),
    'This generated task returns files, receipts, result facts, and any failure boundary to the calling Phase Agent. It does not contact the user, wait for acknowledgement, or create interaction, checkpoint, permission, route, or lifecycle authority.',
    'Read `_beacon.json` before writing runtime files. Resolve every runtime write by joining the beacon `bundle_dir` with the bundle-relative path from this task.',
    'Returning research findings in chat without writing the required files is a work-unit failure, not completion.',
    '',
    ...actorGuidanceTaskLines(actorDelivery),
    '## Absolute Runtime Paths',
    '',
    'Use these absolute paths for file I/O; keep bundle-relative refs in result JSON and ledger-facing fields.',
    '',
    '```json',
    jsonBlock(abs),
    '```',
    '',
    '## Write-Before-Return Checklist',
    '',
    `- Required result fields: ${requiredResultFields}`,
    `- Allowed result fields: ${allowedResultFields}`,
    `- Allowed output roles: ${allowedOutputRoles}`,
    `- Required cache leaf files: ${requiredCacheLeafFiles || '<none>'}`,
    ...(manifest.assignment_contract_version
      ? [`- Assignment contract: \`${manifest.assignment_contract_version}\`.`]
      : []),
    ...(requiredOutputLines.length > 0
      ? requiredOutputLines
      : manifest.assignment_contract_version ? ['- Required direct outputs: none for this assignment.'] : []),
    ...(manifest.output_contract.output_files.reference_requires_source_url === true
      ? ['- Every output with role `reference` must declare its parseable `source_url`.']
      : []),
    ...(manifest.output_contract.source_claims?.allowed === true
      ? [
          '- `source_claims[]` must use the generated item fields and bind accepted URLs to declared cache trails or an explicit degraded capture.',
          '- `source_claims[].source_ref` may name a genuinely current path declared in this candidate `output_files[]`, or one exact prior submitted output listed below whose role is authorized by this kind contract. Do not redeclare or overwrite a prior file merely to cite it.',
        ]
      : []),
    '- Verify `_beacon.json`, `task.md`, and `result.schema.json` were read from the active `bundle_dir`.',
    '- Write every declared output file under `bundle_dir` only.',
    ...(requiredOutputs.length > 0
      ? ['- The actor must verify every assigned required output above at its exact path and canonical role before recording `work_done`.']
      : []),
    '- Write required cache leaves under `bundle_dir`; cache `page.md` must contain fetched page content or an explicit degraded/fetch-failure record, not an empty or placeholder header.',
    '- In `result.json`, declare `cache_trails` as bundle-relative cache leaf directory paths only, for example `_cache/wave0/primary/<queue_item_id>/<source_slug>`; do not list `websearch.json`, `page.md`, or `meta.json` file paths.',
    '- In written research outputs, include return-map cues for important evidence: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. These cues are diagnostic navigation only; submitted ledger rows and gate outputs remain authority.',
    '- Append lifecycle evidence directly as JSONL to the assigned `runtime-receipt.jsonl`, carrying the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.',
    '- `log-event.mjs` is optional diagnostic mirroring only; it never satisfies or replaces the assigned runtime receipt.',
    '- Before and after every slow bounded search, fetch, cache-write, output-write, or result-draft batch, append a concise progress event with those exact identity fields. Progress is diagnostic only and never replaces formal submit.',
    '- Write `result.json` at the declared result path and verify it preserves the exact identity fields.',
    '- If any required write or verification fails, return a failure summary and do not claim success.',
    '',
    '## Result JSON Starter',
    '',
    'Copy this JSON object to the assigned result path, replace semantic/output/cache values, and keep the binding fields exact. This block is guidance only; the Engine has not created `result.json`.',
    '',
    '```json',
    jsonBlock(resultStarter),
    '```',
    '',
    '## Output Contract',
    '',
    '```json',
    jsonBlock(manifest.output_contract),
    '```',
    '',
    ...(manifest.output_contract.source_claims?.allowed === true
      ? [
          '## Authorized Source-Ref Lineage',
          '',
          'These are bounded claim-time candidates, not a new authority. Formal submit reloads the current submitted ledger, index, manifest, queue, and canonical Topic binding before acceptance.',
          '',
          '```json',
          jsonBlock({
            current_assigned_paths: sourceRefLineage.current_assigned_paths,
            prior_submitted_output_roles: manifest.output_contract.source_claims.prior_submitted_output_roles || [],
            eligible_prior_outputs: sourceRefLineage.eligible_prior_outputs,
          }),
          '```',
          '',
        ]
      : []),
    ...(manifest.kind === 'wave1_topic_deepening' && requiredOutputs.length > 0
      ? [
          'For this primary Wave1 assignment, write every current required output together with structured `source_claims[]`, `accepted_source_urls[]`, and cache trails in `result.json`; prose links alone are not accepted source coverage.',
          'Do not treat canonical `reference/{topic}-<source>.md` Markdown as a required delegated receipt unless this task explicitly names that reference path in its output contract.',
        ]
      : manifest.kind === 'wave1_topic_deepening' && manifest.assignment_contract_version
        ? [
            'This supplementary Wave1 assignment has no current required outputs. Do not recreate, redeclare or overwrite a prior evidence-summary or question-list; use only the authorized source-ref lineage and current contract-authorized output, cache, source, result and receipt facts.',
          ]
      : []),
    ...(manifest.kind === 'wave2_targeted_evidence'
      ? [
          'For Wave2 targeted evidence, return bounded evidence/source URLs/cache trails and confidence/fills_gap payloads for the assigned finding. The Phase Agent updates finding-index.yaml, cross-topic-ledger.md, synthesis/backfill, and any `reference/00-cross-*.md` projection after submit.',
        ]
      : []),
    '',
    '## Cache Policy',
    '',
    '```json',
    jsonBlock(manifest.cache_policy),
    '```',
    '',
    '## Lifecycle Receipt',
    '',
    `Append JSONL events to \`${manifest.paths.runtime_receipt_ref}\`. Every event must carry \`work_id\`, \`queue_item_id\`, \`kind\`, and \`receipt_nonce\`.`,
    'For slow work, emit paired batch-level progress such as `search_batch_started` / `search_batch_done`, `fetch_batch_started` / `fetch_batch_done`, `cache_write_started` / `cache_written`, and `result_draft_started` / `result_draft_written`. Keep batches bounded if the receipt surface is temporarily unavailable.',
    'These progress events are timeout-preflight diagnostics only; they do not satisfy output, cache, source-claim, ledger, or gate authority.',
    '',
    '```jsonl',
    JSON.stringify(workStartedReceipt),
    JSON.stringify(fileWrittenReceipt),
    JSON.stringify(workDoneReceipt),
    '```',
    '',
    '## Diagnostic Logging',
    '',
    'Copy these examples only when useful. `log-event.mjs` is optional diagnostic mirroring; it never satisfies or replaces lifecycle JSONL in the assigned runtime receipt. Submit and gate authority come from Engine validation and the submitted ledger row.',
    '',
    '```bash',
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_search_started" --detail '${JSON.stringify(searchLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_file_written" --detail '${JSON.stringify(fileLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level error --msg "work_unit_error" --detail '${JSON.stringify(errorLog)}'`,
    '```',
    '',
    '## Work-Unit CLI Checkpoints',
    '',
    'Use the canonical absolute bundle root in every work-unit command, independent of the current working directory.',
    'The Phase Agent runs predictive `dry-submit` after the actor returns. Formal submit is the only normal first-acceptance and delegated success owner.',
    '',
    '```bash',
    `node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit "${path.resolve(bundleDir)}" --work-id "${manifest.work_id}" --result "${abs.result_ref}"`,
    `node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "${path.resolve(bundleDir)}" --work-id "${manifest.work_id}" --result "${abs.result_ref}"`,
    '```',
    '',
    'The Phase Agent reads every dry-submit violation, repairs the same candidate or assigned receipt at the exact `write_to` coordinate, and reruns the same dry-submit checkpoint before formal submit. Ordinary candidate/receipt repair stays with the Agent; a separate semantic, risk, permission, external-action, or missing-contract boundary returns to the Phase Agent, while the loaded lifecycle node remains the interaction-placement owner.',
    '',
    '## Runtime Refs',
    '',
    'Coding-agent runtime IDs, thread IDs, session IDs, spawn request IDs, and cancel refs are optional diagnostic `runtime_refs` only. They are not queue, submit, ledger, or gate authority.',
    '',
    'Write the assigned result to the declared result path, verify all declared files exist under the active bundle root, and preserve the identity fields exactly.',
    'Completion is accepted only when the main Agent submits this work unit through `operate-work-unit submit`.',
    '',
  ].join('\n');
}

export function spawnPromptForWorkUnit(manifest, bundleDir = null, { actorDelivery } = {}) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const normalizedActorDelivery = normalizeActorDelivery(parsed, actorDelivery);
  const resolvedBundleDir = bundleDir ? path.resolve(bundleDir) : null;
  const absResult = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.result_ref) : parsed.paths.result_ref;
  const absReceipt = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.runtime_receipt_ref) : parsed.paths.runtime_receipt_ref;
  const absBeacon = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.beacon_ref) : parsed.paths.beacon_ref;
  const absTask = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.task_ref) : parsed.paths.task_ref;
  const absSchema = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.result_schema_ref) : parsed.paths.result_schema_ref;
  const actorInstruction = parsed.actor_execution?.execution_actor_class === 'phase_agent_fallback'
    ? `You are the Phase Agent executing explicit fallback work unit ${parsed.work_id}.`
    : `You are executing delegated work unit ${parsed.work_id} as role ${parsed.actor_execution?.delegated_role_key || '<legacy-unrecorded>'}.`;
  return [
    actorInstruction,
    '',
    resolvedBundleDir ? `Active bundle_dir: ${resolvedBundleDir}` : 'Read bundle_dir from the assigned _beacon.json before writing files.',
    `Open task.md first: ${absTask}`,
    `Open _beacon.json first: ${absBeacon}`,
    `Open result schema: ${absSchema}`,
    ...actorGuidanceSpawnLines(normalizedActorDelivery),
    `Use exactly these identity fields in lifecycle receipts and result.json: work_id=${parsed.work_id}, queue_item_id=${parsed.queue_item_id}, kind=${parsed.kind}, receipt_nonce=${parsed.receipt_nonce}${parsed.actor_contract_version ? `, actor_contract_version=${parsed.actor_contract_version}, execution_actor_class=${parsed.actor_execution.execution_actor_class}` : ''}. Do not generate a new nonce.`,
    `Append lifecycle evidence directly as JSONL to the assigned receipt: ${absReceipt}.`,
    '`log-event.mjs` is optional diagnostic mirroring only and never satisfies or replaces the assigned runtime receipt.',
    'Before and after slow bounded search, fetch, cache, output, or result-draft batches, write concise progress events with the exact assigned identity fields. These events are diagnostic only; completion still requires formal submit.',
    `Write the final result JSON to ${absResult}.`,
    'Before returning, verify every declared output file, required cache leaf, runtime receipt, and result JSON exists under the active bundle_dir.',
    'In result.json, cache_trails must list cache leaf directory paths only; do not list websearch.json, page.md, or meta.json file paths.',
    'When writing evidence summaries, source notes, or backfill-ready content, include return-map fields: evidence_meaning, relationship, refs, status, next_hop. These cues are diagnostic navigation only; submitted ledger rows and gate outputs remain authority.',
    'If you cannot write or verify the files, return a failure summary instead of research text.',
    `Keep any coding-agent runtime IDs only under optional runtime_refs diagnostic metadata; they are not authority.`,
    'Do not mutate queue, work-unit index, output ledger, or gate state. Return the result path to the main Agent for operate-work-unit submit.',
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
