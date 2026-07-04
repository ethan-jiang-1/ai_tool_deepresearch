// @impl FRE-004, SUD-001, SNC-001
// subagent-relay-stage.mjs — slot staging, task.md / schema / manifest / spawn prompt
// Source domain: L397–869

import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  MAX_CONCURRENT_SUBAGENTS,
  DispatchManifest,
  SubagentSlot,
  SlotConfig,
  ensureTrace,
  traceEntry,
  logEvent,
  logEventCliPath,
  nextWaveIndex,
  waveDirName,
  slotDirName,
} from './subagent-relay-schemas-trace.mjs';
import { classifyBranch, getDispatchMap } from './subagent-relay-fork-dispatch.mjs';

export function createSlot(slotConfig, waveIndex) {
  const parsed = SlotConfig.parse(slotConfig);
  const slotBase = `_subagents/${waveDirName(waveIndex)}/${slotDirName(parsed.slotIndex)}`;
  return SubagentSlot.parse({
    key: parsed.key,
    roleAgentKey: parsed.roleAgentKey,
    waveIndex,
    slotIndex: parsed.slotIndex,
    taskPath: `${slotBase}/task.md`,
    schemaPath: `${slotBase}/result.schema.json`,
    resultPath: `${slotBase}/result.json`,
    summaryPath: `${slotBase}/result.md`,
    statusPath: `${slotBase}/_status.json`,
    agentPath: `${slotBase}/_agent.json`,
    receiptPath: `${slotBase}/runtime-receipt.jsonl`,
    receiptNonce: randomUUID(),
    status: 'pending',
  });
}

function resultJsonSchemaForSlot(slotConfig) {
  const parsed = SlotConfig.parse(slotConfig);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `DPT subagent result for ${parsed.key}`,
    type: 'object',
    additionalProperties: false,
    required: [
      'slotKey',
      'roleAgentKey',
      'status',
      'summary',
      'evidenceCount',
      'references',
      'confidence',
      'notes',
      'output_files',
      'cache_trails',
    ],
    properties: {
      slotKey: { const: parsed.key },
      roleAgentKey: { const: parsed.roleAgentKey },
      status: { enum: ['done', 'failed'] },
      summary: { type: 'string' },
      evidenceCount: { type: 'integer', minimum: 0 },
      references: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'url', 'quote', 'relevance'],
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            quote: { type: 'string' },
            relevance: { type: 'string' },
          },
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      notes: { type: 'array', items: { type: 'string' } },
      output_files: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['path', 'role'],
          properties: {
            path: { type: 'string', minLength: 1 },
            role: {
              enum: ['reference', 'evidence_summary', 'question_list', 'source_yaml', 'index', 'other'],
            },
            source_url: { type: 'string' },
            source_slug: { type: 'string' },
          },
          allOf: [
            {
              if: { properties: { role: { const: 'reference' } }, required: ['role'] },
              then: { required: ['source_url'] },
            },
          ],
        },
      },
      cache_trails: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };
}

// ── Lifecycle logging instruction template (SNC-001/002) ──────────────────
// Single source of truth for the sub-agent lifecycle event set. Both the
// generated task.md (taskMarkdownForSlot) and the spawn prompt
// (buildSpawnPrompt) render from this table, so the two surfaces cannot
// drift apart (event names, detail fields, or prohibitions).

const LIFECYCLE_EVENT_SPECS = [
  { kind: 'search_start', when: 'when beginning a new search', detailExtra: '' },
  { kind: 'search_done', when: 'when a search completes', detailExtra: ',"result_count":<N>' },
  { kind: 'fetch_done', when: 'when a page fetch completes', detailExtra: ',"url":"<url>"' },
  { kind: 'file_written', when: 'when writing an artifact file', detailExtra: ',"path":"<bundle-relative-path>"' },
  { kind: 'error', when: 'when encountering an error', detailExtra: ',"reason":"<reason>"' },
  { kind: 'work_done', when: 'when all work is complete', detailExtra: ',"summary":"<summary>"' },
];

function lifecycleDetailJson(slotKey, roleAgentKey, spec) {
  return `{"kind":"${spec.kind}","slotKey":"${slotKey}","roleAgentKey":"${roleAgentKey}","receipt_nonce":"<receipt_nonce>"${spec.detailExtra}}`;
}

// Compact form used in the generated task.md.
function lifecycleEventSummaryLines() {
  return [
    '   - `search_start` / `search_done` — around each bounded search',
    '   - `fetch_done` — when a page fetch completes (include `url`)',
    '   - `file_written` — when you write an artifact file (include bundle-relative `path`)',
    '   - `error` — when a fetch is blocked or the result is degraded',
    '   - `work_done` — once, when all your work is complete',
  ].join('\n');
}

// Itemized form (event + copyable detail JSON) used in the spawn prompt.
function lifecycleEventDetailLines(slotKey, roleAgentKey) {
  return LIFECYCLE_EVENT_SPECS
    .map((spec) => `- \`${spec.kind}\` — ${spec.when}:\n  ${lifecycleDetailJson(slotKey, roleAgentKey, spec)}`)
    .join('\n');
}

const LIFECYCLE_LOGGING_PROHIBITION = 'Do NOT log raw page content, full search result bodies, or private reasoning.';

function taskMarkdownForSlot(slotConfig) {
  const parsed = SlotConfig.parse(slotConfig);
  const cacheSection = parsed.cacheDir
    ? `## Cache Directory\n\nWrite raw intermediate products (search results, fetched pages, extraction notes) to:\n\n\`${parsed.cacheDir}\`\n\nFor each web source found, create a subdirectory \`sNN_{source-slug}/\` containing:\n- \`websearch.json\` — raw WebSearch result\n- \`page.md\` — fetched page content\n- \`meta.json\` — \`{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}\`\n\n`
    : '';
  return `# DPT Subagent Task: ${parsed.key}

## Role

${parsed.roleAgentKey}

## Task

${parsed.taskDescription}

## Inputs

- Read this slot's \`task.md\`.
- Read this slot's \`result.schema.json\`.
- Use only bounded information in this task and sources you inspect yourself.

${cacheSection}## Output

Return strict JSON to the parent agent. The JSON must match \`result.schema.json\`.

The parent performs Parent Relay: it validates your JSON and writes \`result.json\`, optional \`result.md\`, \`_status.json\`, and \`_agent.json\`.

## Lifecycle Logging (required)

You MUST leave a trace of your work so the parent can verify the relay actually ran. This directive travels with your slot task regardless of how you were spawned.

1. Read \`_beacon.json\` in the same directory as this \`task.md\`. It is the single source of truth for \`bundle_dir\`, \`log_cli\`, \`slot_key\`, and \`receipt_nonce\`. Do NOT rely on environment variables or inherited cwd for the bundle path.
2. Emit these lifecycle events via the logging CLI (the \`log_cli\` path from your beacon), carrying the beacon \`receipt_nonce\` in every event's \`--detail\` JSON:
${lifecycleEventSummaryLines()}

Example (substitute \`bundle_dir\`, \`log_cli\`, and \`receipt_nonce\` from your beacon):
  node <log_cli> --bundle <bundle_dir> --level info --msg "search_start" --detail '${lifecycleDetailJson(parsed.key, parsed.roleAgentKey, LIFECYCLE_EVENT_SPECS[0])}'

If \`_beacon.json\` is missing or unreadable, emit an \`error\` event and do NOT fabricate a nonce. ${LIFECYCLE_LOGGING_PROHIBITION} The logging CLI always exits 0 — diagnostics must not block your work.

## Forbidden Authority

- Do not mutate WorkflowState.
- Do not pass or fail gates.
- Do not repair queues.
- Do not decide queue integrity.
- Do not authorize stopping.
- Do not include raw search trails, large page dumps, or private reasoning.
`;
}

export function buildSpawnPrompt(slot, baseDir, platform = 'codex', cacheDir = null) {
  const s = SubagentSlot.parse(slot);
  const cacheLine = cacheDir ? `Cache directory: ${cacheDir}\n` : '';
  const slotDir = path.join(baseDir, path.dirname(s.taskPath));

  // SUD-006: beacon mode. The spawn prompt hands the sub-agent ONLY its slot
  // directory absolute path plus a directive to read _beacon.json. The bundle
  // path, logger path, and nonce are NOT inlined as the sole channel — they
  // are read from the beacon (cross-checkable, single source of truth).
  return `You are being launched as DPT role ${s.roleAgentKey} for slot ${s.key}.

Platform: ${platform}
Slot directory: ${slotDir}
${cacheLine}
## First step: read your beacon

Open \`${slotDir}/_beacon.json\` before doing any work. It is the single source of truth for your runtime coordinates:
- \`bundle_dir\` — absolute bundle root. Use it for every \`log-event.mjs --bundle\` call and to resolve bundle-relative artifact paths.
- \`log_cli\` — absolute path to the logging CLI \`log-event.mjs\`.
- \`slot_key\` — your slot key (use in every event and runtime-receipt detail).
- \`receipt_nonce\` — a UUID nonce you MUST carry in every lifecycle event and every runtime-receipt event.

Do NOT rely on environment variables or inherited cwd for the bundle path — read it from \`_beacon.json\`.

## Inputs (all in your slot directory)

- Read \`${slotDir}/task.md\`.
- Read \`${slotDir}/result.schema.json\`.
- Use only bounded information in your task and sources you inspect yourself.

## Runtime receipt (required)

Write two JSONL events to \`${slotDir}/runtime-receipt.jsonl\`, substituting the \`receipt_nonce\` from your beacon:
- first line before doing task work: {"event":"agent_runtime_started","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","receiptNonce":"<your beacon receipt_nonce>"}
- second line immediately before returning: {"event":"agent_result_ready","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","receiptNonce":"<your beacon receipt_nonce>"}

## Output

Return strict JSON to the parent agent. The JSON must match \`result.schema.json\`.

The parent performs Parent Relay: it validates your JSON and writes \`result.json\`, optional \`result.md\`, \`_status.json\`, and \`_agent.json\`.

## Diagnostic logging

Write lifecycle events to the parent bundle run log via the \`log_cli\` (\`log-event.mjs\`) from your beacon. Every event MUST carry your beacon \`receipt_nonce\`:

  node <log_cli> --bundle <bundle_dir> --level <info|warn|error> --msg "<event>" --detail '<json>'

Log these events (substitute \`<bundle_dir>\`, \`<log_cli>\`, and \`<receipt_nonce>\` from your beacon; \`<url>\`, \`<path>\`, \`<N>\`, \`<summary>\`, \`<reason>\` from your work):
${lifecycleEventDetailLines(s.key, s.roleAgentKey)}

Use lowercase CLI levels: \`--level <info|warn|error>\` — \`info\` for normal progress, \`warn\` for blocked fetches or degraded results, and \`error\` for failures that prevent completion.

${LIFECYCLE_LOGGING_PROHIBITION}

## Forbidden Authority

- Do not mutate WorkflowState.
- Do not pass or fail gates.
- Do not repair queues.
- Do not decide queue integrity.
- Do not authorize stopping.
- Do not include raw search trails, large page dumps, or private reasoning.

Perform the bounded work in your isolated agent context. Return strict JSON only. Do not write workflow state. The parent will validate your JSON and write durable slot files.`;
}

// Write the per-slot file contract (task.md, result.schema.json, _status.json,
// _beacon.json) into a slot directory. Shared by full-wave staging
// (createDispatchManifest) and replacement staging (stageReplacementSlot) so the
// slot file set is always engine-produced, never driver-hand-written.
function materializeSlotDir(baseDir, waveDir, slot, config, cacheDir = null) {
  const slotDir = path.join(baseDir, `_subagents/${waveDir}/${slotDirName(slot.slotIndex)}`);
  mkdirSync(slotDir, { recursive: true });
  // Replacement re-stage into a previously occupied slotIndex: remove the prior
  // occupant's execution artifacts so a stale nonce/receipt/result cannot pollute
  // the new slot's provenance chain (forensics would cross-check the old nonce).
  for (const stale of ['runtime-receipt.jsonl', 'result.json', 'result.md', '_agent.json']) {
    const stalePath = path.join(slotDir, stale);
    if (existsSync(stalePath)) unlinkSync(stalePath);
  }
  const configWithCache = cacheDir ? { ...config, cacheDir } : config;
  writeFileSync(path.join(slotDir, 'task.md'), taskMarkdownForSlot(configWithCache));
  writeFileSync(path.join(slotDir, 'result.schema.json'), JSON.stringify(resultJsonSchemaForSlot(config), null, 2));
  writeFileSync(path.join(slotDir, '_status.json'), JSON.stringify({
    status: 'pending',
    updated: new Date().toISOString(),
  }, null, 2));
  // SUD-004: per-slot beacon = single source of truth the sub-agent reads to
  // locate the bundle, logger, slot key, and nonce. Absolute paths so a
  // sub-agent in an isolated context needs nothing else.
  writeFileSync(path.join(slotDir, '_beacon.json'), JSON.stringify({
    bundle_dir: path.resolve(baseDir),
    log_cli: logEventCliPath(),
    slot_key: slot.key,
    receipt_nonce: slot.receiptNonce,
  }, null, 2));
}

function createDispatchManifest(slotConfigs, state, baseDir, waveIndex, cacheDirBySlotKey = null) {
  ensureTrace(baseDir);
  const configs = z.array(SlotConfig).parse(slotConfigs);
  if (configs.length > MAX_CONCURRENT_SUBAGENTS) {
    throw new Error(`Subagent concurrency cap exceeded: ${configs.length} > ${MAX_CONCURRENT_SUBAGENTS}`);
  }

  const waveDir = waveDirName(waveIndex);
  const wavePath = path.join(baseDir, '_subagents', waveDir);
  mkdirSync(wavePath, { recursive: true });

  const slots = [];
  for (const config of configs) {
    const slot = createSlot(config, waveIndex);
    slots.push(slot);

    const perSlotCacheDir = cacheDirBySlotKey?.[config.key] || null;
    materializeSlotDir(baseDir, waveDir, slot, config, perSlotCacheDir);

    traceEntry('slot_create', {
      source: 'gs-slot',
      key: config.key,
      roleAgentKey: config.roleAgentKey,
      slotIndex: config.slotIndex,
      waveIndex,
      receiptNonce: slot.receiptNonce,
    });
    logEvent('info', 'slot_create', { key: config.key, roleAgentKey: config.roleAgentKey, slotIndex: config.slotIndex });
  }

  const manifest = {
    wave: `wave-${waveIndex}`,
    waveIndex,
    created: new Date().toISOString(),
    concurrencyCap: MAX_CONCURRENT_SUBAGENTS,
    // SUD-005: persist each slot's engine-generated UUID receipt_nonce so
    // forensics can bind receipts/ledger entries back to a staged slot from
    // dispatch.json alone (no in-memory slot object needed).
    slots: configs.map((config, i) => ({ ...config, receipt_nonce: slots[i].receiptNonce })),
  };
  DispatchManifest.parse(manifest);
  writeFileSync(path.join(wavePath, 'dispatch.json'), JSON.stringify(manifest, null, 2));

  traceEntry('dispatch_create', {
    source: 'gs-dispatch',
    waveIndex,
    slotCount: slots.length,
    // SUD-007: nonce-anchor the staging trace so the full chain (staging →
    // ingest → commit) is cross-checkable end-to-end by RPG-012.
    slots: slots.map((s) => ({ key: s.key, roleAgentKey: s.roleAgentKey, receiptNonce: s.receiptNonce })),
  });
  logEvent('info', 'dispatch', { waveIndex, slotCount: slots.length });

  return slots;
}

/**
 * Entry point: classify state, resolve slot configs for the branch, and write
 * task.md, result.schema.json, _status.json, and dispatch.json to disk.
 *
 * Returns the created slot objects. Non-pass branches return an empty array
 * (no slots dispatched — the caller should run convergeRepair instead).
 *
 * @param {object}   state             - workflow state
 * @param {string}   baseDir           - bundle root directory
 * @param {Map}      [customDispatchMap] - override the built-in dispatch map
 * @returns {object[]} array of slot objects (empty if branch !== 'pass')
 * @throws {Error} if concurrency cap is exceeded
 */
export function stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex) {
  ensureTrace(baseDir);
  const map = customDispatchMap || getDispatchMap();
  const branch = classifyBranch(state);
  logEvent('info', 'relay_stage_attempt', { kind: 'queue_enqueue', branch });

  try {
    const slotConfigs = map.get(branch);
    if (!slotConfigs) {
      logEvent('warn', 'relay_stage_empty', { kind: 'queue_enqueue', branch: branch });
      return [];
    }
    // @impl SDC-003: explicitWaveIndex (from drive-relay-slot --wave) places logical
    // wave N into wave_{NN} (0-based, matching canonical convention + gate wave field).
    // Default (legacy direct callers / unit tests) still uses nextWaveIndex(state).
    const waveIndex = explicitWaveIndex ?? nextWaveIndex(state);
    const slots = createDispatchManifest(slotConfigs, state, baseDir, waveIndex);
    logEvent('info', 'relay_stage_done', { kind: 'queue_enqueue', slotCount: slots.length, waveIndex });
    return slots;
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'relay_stage_exception', { kind: 'queue_enqueue', reason: safeMsg });
    throw err;
  }
}

/**
 * Stage a single replacement SlotConfig into a wave's freed slotIndex (SUD-003
 * replacement dispatch). Materializes the slot file set and updates dispatch.json
 * in place — replacing any existing entry with the same slotIndex, else appending
 * — WITHOUT clobbering other in-flight slots in the wave.
 *
 * The runtime driver calls this to refill a slot freed by a completed sub-agent
 * when the current queue task still has undispatched batch items.
 *
 * @param {string} baseDir     - bundle root directory
 * @param {object} slotConfig  - { key, slotIndex, roleAgentKey, taskDescription, modelHint?, timeoutMs? }
 * @param {number} waveIndex   - existing wave index to stage into (1-based)
 * @param {string|null} [cacheDir=null] - per-slot cache directory
 * @returns {object} slot object (engine-produced, with persisted nonce + files)
 */
export function stageReplacementSlot(baseDir, slotConfig, waveIndex, cacheDir = null) {
  ensureTrace(baseDir);
  const config = SlotConfig.parse(slotConfig);
  const waveDir = waveDirName(waveIndex);
  const wavePath = path.join(baseDir, '_subagents', waveDir);
  mkdirSync(wavePath, { recursive: true });

  const slot = createSlot(config, waveIndex);
  materializeSlotDir(baseDir, waveDir, slot, config, cacheDir);

  traceEntry('slot_create', {
    source: 'gs-slot',
    key: config.key,
    roleAgentKey: config.roleAgentKey,
    slotIndex: config.slotIndex,
    waveIndex,
    receiptNonce: slot.receiptNonce,
    replacement: true,
  });
  logEvent('info', 'slot_create', { key: config.key, roleAgentKey: config.roleAgentKey, slotIndex: config.slotIndex, replacement: true });

  // Update dispatch.json in place — replace same-slotIndex entry, else append.
  // Other in-flight slots are preserved untouched.
  const dispatchPath = path.join(wavePath, 'dispatch.json');
  const entry = { ...config, receipt_nonce: slot.receiptNonce };
  let manifest;
  if (existsSync(dispatchPath)) {
    manifest = JSON.parse(readFileSync(dispatchPath, 'utf-8'));
    const idx = manifest.slots.findIndex((s) => s.slotIndex === config.slotIndex);
    if (idx >= 0) manifest.slots[idx] = entry;
    else manifest.slots.push(entry);
  } else {
    manifest = {
      wave: `wave-${waveIndex}`,
      waveIndex,
      created: new Date().toISOString(),
      concurrencyCap: MAX_CONCURRENT_SUBAGENTS,
      slots: [entry],
    };
  }
  DispatchManifest.parse(manifest);
  writeFileSync(dispatchPath, JSON.stringify(manifest, null, 2));

  return slot;
}

/**
 * Reconstruct a slot object from its dispatch.json entry, preserving the
 * persisted engine-generated nonce. Used by the runtime driver to load a slot
 * for ingest/commit/merge without an in-memory slot object, and by provenance
 * forensics to read a slot's nonce straight from the on-disk record.
 *
 * @param {string} baseDir   - bundle root directory
 * @param {number} waveIndex - wave index (1-based)
 * @param {string} slotKey   - slot key to look up in dispatch.json
 * @returns {object} slot object (nonce = dispatch.json receipt_nonce)
 * @throws {Error} if dispatch.json is missing or the slot key is not recorded
 */
export function loadSlotByManifestEntry(baseDir, waveIndex, slotKey) {
  const waveDir = waveDirName(waveIndex);
  const dispatchPath = path.join(baseDir, '_subagents', waveDir, 'dispatch.json');
  if (!existsSync(dispatchPath)) {
    throw new Error(`dispatch.json missing: _subagents/${waveDir}/dispatch.json`);
  }
  const manifest = JSON.parse(readFileSync(dispatchPath, 'utf-8'));
  const entry = (manifest.slots || []).find((s) => s.key === slotKey);
  if (!entry) {
    throw new Error(`slot key not found in dispatch.json: ${slotKey}`);
  }
  const slotBase = `_subagents/${waveDir}/${slotDirName(entry.slotIndex)}`;
  return SubagentSlot.parse({
    key: entry.key,
    roleAgentKey: entry.roleAgentKey,
    waveIndex,
    slotIndex: entry.slotIndex,
    taskPath: `${slotBase}/task.md`,
    schemaPath: `${slotBase}/result.schema.json`,
    resultPath: `${slotBase}/result.json`,
    summaryPath: `${slotBase}/result.md`,
    statusPath: `${slotBase}/_status.json`,
    agentPath: `${slotBase}/_agent.json`,
    receiptPath: `${slotBase}/runtime-receipt.jsonl`,
    receiptNonce: entry.receipt_nonce,
    status: 'pending',
  });
}
