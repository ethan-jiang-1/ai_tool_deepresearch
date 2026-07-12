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
  return {
    type: 'object',
    required: ['path', 'role'],
    properties: {
      path: { type: 'string', minLength: 1 },
      role: roleSchema,
      source_url: { type: 'string', format: 'uri' },
      source_slug: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
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
    output_files: { type: 'array', items: outputFileItemSchema(outputContract), default: [] },
    cache_trails: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
  };
  if (outputContract?.source_claims?.allowed === true) {
    properties.source_claims = { type: 'array', items: sourceClaimItemSchema(), default: [] };
    properties.accepted_source_urls = { type: 'array', items: { type: 'string', format: 'uri' }, default: [] };
  }
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

function taskMarkdown(manifest, bundleDir) {
  const logCli = logCliPath();
  const abs = absolutePathMap(manifest, bundleDir);
  const workStartedReceipt = lifecycleReceiptExample(manifest, 'work_started');
  const fileWrittenReceipt = lifecycleReceiptExample(manifest, 'file_written');
  const workDoneReceipt = lifecycleReceiptExample(manifest, 'work_done');
  const searchLog = logDetailExample(manifest, 'search_started');
  const fileLog = { ...logDetailExample(manifest, 'file_written'), path: '<bundle-relative-output-path>' };
  const errorLog = { ...logDetailExample(manifest, 'error'), reason: '<short-reason>' };
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
    'Read `_beacon.json` before writing runtime files. Resolve every runtime write by joining the beacon `bundle_dir` with the bundle-relative path from this task.',
    'Returning research findings in chat without writing the required files is a work-unit failure, not completion.',
    '',
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
    '- Verify `_beacon.json`, `task.md`, and `result.schema.json` were read from the active `bundle_dir`.',
    '- Write every declared output file under `bundle_dir` only.',
    '- Write required cache leaves under `bundle_dir`; cache `page.md` must contain fetched page content or an explicit degraded/fetch-failure record, not an empty or placeholder header.',
    '- In `result.json`, declare `cache_trails` as bundle-relative cache leaf directory paths only, for example `_cache/wave0/primary/<queue_item_id>/<source_slug>`; do not list `websearch.json`, `page.md`, or `meta.json` file paths.',
    '- In written research outputs, include return-map cues for important evidence: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. These cues are diagnostic navigation only; submitted ledger rows and gate outputs remain authority.',
    '- Append `runtime-receipt.jsonl` lifecycle events carrying the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.',
    '- Before and after every slow bounded search, fetch, cache-write, output-write, or result-draft batch, append a concise progress event with those exact identity fields. Progress is diagnostic only and never replaces formal submit.',
    '- Write `result.json` at the declared result path and verify it preserves the exact identity fields.',
    '- If any required write or verification fails, return a failure summary and do not claim success.',
    '',
    '## Output Contract',
    '',
    '```json',
    jsonBlock(manifest.output_contract),
    '```',
    '',
    ...(manifest.kind === 'wave1_topic_deepening'
      ? [
          'For Wave1 topic deepening, include structured `source_claims[]`, `accepted_source_urls[]`, evidence-summary output, question-list output, and cache trails in `result.json`; prose links alone are not accepted source coverage.',
          'Do not treat canonical `reference/{topic}-<source>.md` Markdown as a required delegated receipt unless this task explicitly names that reference path in its output contract.',
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
    'Copy these examples when useful. Logs are diagnostic only; submit and gate authority come from Engine validation and the submitted ledger row.',
    '',
    '```bash',
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_search_started" --detail '${JSON.stringify(searchLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_file_written" --detail '${JSON.stringify(fileLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level error --msg "work_unit_error" --detail '${JSON.stringify(errorLog)}'`,
    '```',
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

export function spawnPromptForWorkUnit(manifest, bundleDir = null) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
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
    `Use exactly these identity fields in lifecycle receipts and result.json: work_id=${parsed.work_id}, queue_item_id=${parsed.queue_item_id}, kind=${parsed.kind}, receipt_nonce=${parsed.receipt_nonce}${parsed.actor_contract_version ? `, actor_contract_version=${parsed.actor_contract_version}, execution_actor_class=${parsed.actor_execution.execution_actor_class}` : ''}. Do not generate a new nonce.`,
    `Write lifecycle JSONL events to ${absReceipt}.`,
    'Before and after slow bounded search, fetch, cache, output, or result-draft batches, write concise progress events with the exact assigned identity fields. These events are diagnostic only; completion still requires formal submit.',
    `Write the final result JSON to ${absResult}.`,
    'Before returning, verify every declared output file, required cache leaf, runtime receipt, and result JSON exists under the active bundle_dir.',
    'In result.json, cache_trails must list cache leaf directory paths only; do not list websearch.json, page.md, or meta.json file paths.',
    'When writing evidence summaries, source notes, or backfill-ready content, include return-map fields: evidence_meaning, relationship, refs, status, next_hop.',
    'If you cannot write or verify the files, return a failure summary instead of research text.',
    `Keep any coding-agent runtime IDs only under optional runtime_refs diagnostic metadata; they are not authority.`,
    'Do not mutate queue, work-unit index, output ledger, or gate state. Return the result path to the main Agent for operate-work-unit submit.',
  ].join('\n');
}

export function writeWorkUnitEnvelope(bundleDir, manifest) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const dir = path.join(bundleDir, parsed.paths.work_unit_dir);
  mkdirSync(dir, { recursive: true });
  writeJson(path.join(bundleDir, parsed.paths.manifest_ref), parsed);
  writeFileSync(path.join(bundleDir, parsed.paths.task_ref), taskMarkdown(parsed, bundleDir));
  writeJson(path.join(bundleDir, parsed.paths.result_schema_ref), resultSchemaDocument(parsed));
  writeJson(path.join(bundleDir, parsed.paths.beacon_ref), WorkUnitBeaconSchema.parse({
    schema_version: WORK_UNIT_BEACON_SCHEMA_VERSION,
    work_id: parsed.work_id,
    queue_item_id: parsed.queue_item_id,
    kind: parsed.kind,
    bundle: bundleName(bundleDir),
    bundle_dir: path.resolve(bundleDir),
    receipt_nonce: parsed.receipt_nonce,
    deadline_at: parsed.deadline_at,
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
