import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { Finding } from "../lib/finding.mjs";
import {
  controlFilesAtRunRootFindings,
  controlFilesOutsideFrameworkFindings,
  frameworkContentDriftFindings,
  frameworkPresenceFindings,
  frameworkSnapshotFindings,
  frameworkStateFindings,
  frameworkVersionFindings,
  commandEntrypointFindings,
  instancePathsOutsideFrameworkFindings,
  mutableRunDirectoryFindings,
  originalTopicLayoutFindings,
  pathIsInside,
  resolveRunPath,
  runRootAgentContractFindings,
  runRootFor,
  standardRunLayoutFindings,
} from "../lib/bundle.mjs";
import { readText } from "../lib/fs.mjs";
import { locateRunFiles, readRunTexts, basenamePresent } from "../lib/run_files.mjs";
import {
  firstMarkdownTable,
  hasPlaceholderResidue,
  hasSkeletonResidue,
  hierarchicalSectionText,
  markdownTables,
  parseBulletField,
  requiredColumnsMissing,
} from "../lib/markdown.mjs";
import {
  GATE_VALUES,
  INST_STATE_EXPECTED,
  MUST_ANSWER_INITIAL_PHASE_VALUES,
  RESEARCH_PROFILES,
  ROOT_MUST_ANSWER_COLUMNS,
  SEED_TOPIC_INTAKE_COLUMNS,
  WAVE_VALUES,
  TOPIC_REGISTRY_COLUMNS,
} from "../contracts/constants.mjs";
import { missingOriginalContextFields } from "./seed-topic-shape.mjs";

const EMPTY_VALUES = new Set([
  "",
  "none",
  "not_applicable",
  "not applicable",
  "not_started",
  "not started",
  "not_assessed",
  "not assessed",
  "unknown",
  "n/a",
]);

const RESEARCH_PROFILE_USER_CHOICES = new Set([
  "explicit_user_choice",
  "explicit_user_choice_after_clarification",
  "explicit_override",
]);

const SEARCH_PREFERENCE_INTAKE_STATUSES = new Set([
  "not_specified_use_profile_defaults",
  "recorded",
  "partial_recorded",
]);

const FLOOR_FIELDS = [
  ["wave0", "wave0_shared_doc_floor"],
  ["wave1_per_topic", "wave1_doc_floor_per_topic"],
  ["primary", "primary_source_floor"],
  ["secondary", "secondary_source_floor"],
  ["recent", "recent_source_floor"],
  ["limitation", "limitation_source_floor"],
];

function cleanField(value) {
  return String(value ?? "").trim().replace(/^`+|`+$/g, "").trim();
}

function normalizeName(value) {
  return cleanField(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function rowCell(row, candidates) {
  const wanted = candidates.map(normalizeName);
  for (const [key, value] of Object.entries(row)) {
    if (wanted.includes(normalizeName(key))) {
      return cleanField(value);
    }
  }
  return "";
}

function rowContainsPendingMarker(row) {
  return Object.values(row).some((value) => {
    const cleaned = cleanField(value).toLowerCase();
    return cleaned === "pending"
      || cleaned.includes("pending candidate")
      || cleaned.includes("pending_topic")
      || cleaned.includes("not confirmed");
  });
}

function fieldIsConcrete(value) {
  const cleaned = cleanField(value);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }
  return !EMPTY_VALUES.has(cleaned.toLowerCase());
}

function sectionText(text, sectionName) {
  return hierarchicalSectionText(text, sectionName);
}

function tableInSection(text, sectionName) {
  return firstMarkdownTable(sectionText(text, sectionName));
}

function missingSectionFindings(text, kind, sections) {
  const findings = [];
  for (const section of sections) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`^#{2,6}\\s+${escaped}\\s*$`, "m").test(text)) {
      findings.push(new Finding("E008", `${kind} missing required section: ${section}`));
    }
  }
  return findings;
}

function missingColumnFindings(text, sectionName, requiredColumns, code = "E011") {
  const tables = markdownTables(sectionText(text, sectionName));
  if (tables.length === 0) {
    return [new Finding(code, `${sectionName} missing required table`)];
  }
  const matchingTable = tables.find((table) => requiredColumnsMissing(table.headers, requiredColumns).length === 0);
  if (matchingTable) {
    return [];
  }
  const smallestMissing = tables
    .map((table) => requiredColumnsMissing(table.headers, requiredColumns))
    .sort((a, b) => a.length - b.length)[0] ?? requiredColumns;
  return [new Finding(code, `${sectionName} missing required columns: ${smallestMissing.join(", ")}`)];
}

function topicKey(id, slug) {
  return `${cleanField(id)}/${cleanField(slug)}`;
}

function parseTopicKey(value) {
  const cleaned = cleanField(value);
  const match = cleaned.match(/\b([^/\s`|]+)\/([^/\s`|]+)\b/);
  if (match) {
    return topicKey(match[1], match[2]);
  }
  return cleaned;
}

function topicRegistryRows(plan) {
  const table = tableInSection(plan, "Topic Registry");
  return table.rows
    .map((row) => ({
      id: rowCell(row, ["id", "topic_id"]),
      slug: rowCell(row, ["slug", "topic_slug"]),
      title: rowCell(row, ["title"]),
      seedFiles: rowCell(row, ["seed_files", "seed_file", "seed_paths", "seed_path"]),
      mustAnswer: rowCell(row, ["must_answer", "must answer"]),
      key: topicKey(rowCell(row, ["id", "topic_id"]), rowCell(row, ["slug", "topic_slug"])),
      raw: row,
    }))
    .filter((row) => fieldIsConcrete(row.id) || fieldIsConcrete(row.slug) || fieldIsConcrete(row.title) || fieldIsConcrete(row.mustAnswer));
}

function intakeRows(plan) {
  const table = tableInSection(plan, "Seed Topic Intake Matrix");
  return table.rows
    .map((row) => ({
      key: parseTopicKey(rowCell(row, ["topic", "id", "topic_id"])),
      mustAnswer: rowCell(row, ["must_answer", "must answer"]),
      whyNow: rowCell(row, ["why_now", "why now"]),
      boundary: rowCell(row, ["boundary"]),
      evidenceAnchors: rowCell(row, ["evidence_anchors", "evidence anchors"]),
      whyItMatters: rowCell(row, ["why_it_matters", "why it matters"]),
      intakeStatus: rowCell(row, ["intake_status", "intake status"]),
      intakeGap: rowCell(row, ["intake_gap", "intake gap"]),
      queueConsequence: rowCell(row, ["queue_consequence", "queue consequence"]),
    }))
    .filter((row) => fieldIsConcrete(row.key));
}

function statusTopicBlocks(status) {
  const matches = [...status.matchAll(/^###\s+Topic\s+(.+?)\s*$/gm)];
  return matches.map((match, idx) => {
    const start = match.index;
    const nextTopic = idx + 1 < matches.length ? matches[idx + 1].index : status.length;
    const nextSection = status.indexOf("\n## ", start + match[0].length);
    const end = nextSection === -1 ? nextTopic : Math.min(nextTopic, nextSection);
    const text = status.slice(start, end);
    const id = cleanField(parseBulletField(text, "topic_id"));
    const slug = cleanField(parseBulletField(text, "topic_slug"));
    return { label: cleanField(match[1]), id, slug, key: topicKey(id, slug), text };
  }).filter((block) => fieldIsConcrete(block.id) || fieldIsConcrete(block.slug));
}

function topicRowsInAudit(status, sectionName) {
  return markdownTables(sectionText(status, sectionName)).flatMap((table) => table.rows)
    .map((row) => parseTopicKey(rowCell(row, ["topic", "id", "topic_id"])))
    .filter(fieldIsConcrete);
}

function normalizedWorkValue(value) {
  return cleanField(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function queueWorkItems(queue) {
  return queue.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*-\s*(action|candidate|slot_1_current|slot_2_next|slot_3_pending|slot_4_pending|slot_5_tail)\s*:\s*`?(.+?)`?\s*$/i);
    return match ? cleanField(match[2]) : "";
  }).filter(Boolean);
}

function genericPendingWorkValue(value) {
  const normalized = normalizedWorkValue(value);
  return normalized === "clarify seed topic intake gap"
    || normalized === "triage topology delta candidate";
}

function queueValueNamesConcretePendingWork(value) {
  if (!fieldIsConcrete(value) || genericPendingWorkValue(value)) {
    return false;
  }
  if (/\b(known topic|affected topic|pending_topic_candidates|topic_intake_gap|status_path|queue_path)\b/i.test(value)) {
    return false;
  }
  return /\b(decompose|split|seed topics?|clarif|intake|topology|candidate|formalize|original_topic|large topic)\b|待分解|澄清/i.test(value);
}

function pendingTopicCandidates(status) {
  const raw = parseBulletField(status, "pending_topic_candidates");
  if (!fieldIsConcrete(raw)) {
    return [];
  }
  return cleanField(raw).split(/[;,]/).map(cleanField).filter(fieldIsConcrete);
}

function originalTopicConfigured(plan) {
  return fieldIsConcrete(instanceConfigValue(plan, "original_topic_dir"));
}

function hasCurlyTemplatePlaceholderResidue(value) {
  return /\{[^{}\n]{2,}\}/.test(String(value ?? ""));
}

function hasNormalizedTopicMetadataFieldResidue(value) {
  return /(^|\n)\s*(?:[-*]\s*)?(?:user_confirmation_state|confirmation_state|verification_method|disambiguation_status|clarity_decision|normalized_question|final_must_answer|evidence_route|search_guardrails)\s*:/i.test(String(value ?? ""));
}

function originalTopicEntries(runRoot) {
  try {
    return readdirSync(join(runRoot, "original_topic"), { withFileTypes: true });
  } catch {
    return [];
  }
}

function normalizedTopicFiles(runRoot) {
  return originalTopicEntries(runRoot)
    .filter((entry) => entry.isFile() && entry.name.endsWith(".normalized.md"))
    .map((entry) => entry.name)
    .sort();
}

function englishNormalizedTopicFilename(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.normalized\.md$/.test(value);
}

export function normalizedOriginalTopicFindings(runRoot, texts) {
  const findings = [];
  if (!originalTopicConfigured(texts.plan)) {
    return findings;
  }
  const files = normalizedTopicFiles(runRoot);
  if (files.length !== 1) {
    findings.push(new Finding("E012", `original_topic must contain exactly one English-slug *.normalized.md before deriving seed topics from original_topic; found ${files.length || "none"}`));
    return findings;
  }

  const [filename] = files;
  if (!englishNormalizedTopicFilename(filename)) {
    findings.push(new Finding("E012", `normalized topic filename must be an English ASCII slug ending .normalized.md: ${filename}`));
  }

  const artifactPath = join(runRoot, "original_topic", filename);
  const text = readText(artifactPath);
  const stripped = text.replace(/```[\s\S]*?```/g, "");
  if (hasPlaceholderResidue(stripped) || hasSkeletonResidue(stripped) || hasCurlyTemplatePlaceholderResidue(stripped)) {
    findings.push(new Finding("E012", `original_topic/${filename} contains unresolved placeholder or template residue`));
  }
  if (hasNormalizedTopicMetadataFieldResidue(stripped)) {
    findings.push(new Finding("E012", `original_topic/${filename} must be lightweight normalized topic text, not a metadata field contract`));
  }
  if (!/^#\s+Normalized Original Topic\s*$/m.test(text)) {
    findings.push(new Finding("E012", `original_topic/${filename} missing title: # Normalized Original Topic`));
  }
  if (!/^Source:\s*`?original_topic\/(?![^`\n]*\.normalized\.md)[^`\n]+\.md`?\s*$/m.test(text)) {
    findings.push(new Finding("E012", `original_topic/${filename} must include Source: original_topic/<raw-file>.md`));
  }
  const body = stripped
    .replace(/^#\s+Normalized Original Topic\s*$/m, "")
    .replace(/^Source:\s*.*$/m, "")
    .trim();
  if (body.length < 180) {
    findings.push(new Finding("E012", `original_topic/${filename} is too thin to be a useful normalized topic (${body.length} chars)`));
  }
  return findings;
}

function pendingTopicWorkVisible(texts) {
  const candidates = pendingTopicCandidates(texts.status);
  const workItems = queueWorkItems(texts.queue);
  if (candidates.length > 0 && workItems.some((value) => {
    const lowered = value.toLowerCase();
    return /\b(triage|decompose|formalize|clarif|intake|seed|topic|candidate)\b|待分解|澄清/i.test(value)
      && (genericPendingWorkValue(value) || candidates.some((candidate) => lowered.includes(candidate.toLowerCase())));
  })) {
    return true;
  }
  if (originalTopicConfigured(texts.plan) && workItems.some((value) => {
    return !genericPendingWorkValue(value)
      && /\b(decompose|split|seed topics?)\b|待分解/i.test(value)
      && /\boriginal_topic\b|original topic|large topic|source material|upstream/i.test(value);
  })) {
    return true;
  }
  return workItems.some(queueValueNamesConcretePendingWork);
}

function citesNormalizedOriginalTopic(text) {
  return /\boriginal_topic\/[a-z0-9]+(?:-[a-z0-9]+)*\.normalized\.md\b/.test(String(text ?? ""));
}

function queueMentionsTopicRepair(queue, key) {
  const parsed = parseTopicKey(key);
  const parts = parsed.split("/");
  const candidates = parts.length > 1 ? parts : [parsed];
  const escaped = candidates
    .map((part) => cleanField(part))
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) {
    return false;
  }
  const topicPattern = new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
  const repairPattern = /\b(clarif|intake|seed|topic|repair|backfill|decompose|context|guardrail|original_topic)\b/i;
  return queue.split(/\r?\n/).some((line) => topicPattern.test(line) && repairPattern.test(line));
}

function rowHasQueueBackedGap(row, queue = "") {
  const status = cleanField(row.intakeStatus).toLowerCase();
  const gap = cleanField(row.intakeGap);
  const queueConsequence = cleanField(row.queueConsequence);
  const gapStatus = status === "gap" || status === "assumption" || status === "gap_queue_backed";
  return gapStatus
    && fieldIsConcrete(gap)
    && !isNoneLike(gap)
    && fieldIsConcrete(queueConsequence)
    && !isNoneLike(queueConsequence)
    && queueMentionsTopicRepair(queue, row.key);
}

function searchPreferenceIntakeFindings(texts) {
  const findings = [];
  const profile = texts.profile ?? "";
  const section = sectionText(profile, "Search Preference Intake");
  if (!section) {
    findings.push(new Finding("E006", "PROFILE missing Search Preference Intake section"));
    return findings;
  }

  const status = cleanField(parseBulletField(section, "search_preference_intake_status"));
  if (!SEARCH_PREFERENCE_INTAKE_STATUSES.has(status)) {
    findings.push(new Finding("E006", `PROFILE search_preference_intake_status must be not_specified_use_profile_defaults / recorded / partial_recorded; found ${status || "missing"}`));
  }

  const userInput = cleanField(parseBulletField(section, "user_search_preference_input"));
  if (!fieldIsConcrete(userInput)) {
    findings.push(new Finding("E006", "PROFILE user_search_preference_input must record concrete optional guidance or not_specified_use_profile_defaults"));
  }
  if ((status === "recorded" || status === "partial_recorded") && userInput === "not_specified_use_profile_defaults") {
    findings.push(new Finding("E006", `PROFILE search_preference_intake_status=${status} requires concrete user_search_preference_input`));
  }

  const applicationRule = cleanField(parseBulletField(section, "source_preference_application_rule"));
  if (!fieldIsConcrete(applicationRule)) {
    findings.push(new Finding("E006", "PROFILE source_preference_application_rule must explain how optional preferences guide source intake"));
  }
  if (applicationRule && !/cannot weaken|must not weaken|不能降低/i.test(applicationRule)) {
    findings.push(new Finding("E006", "PROFILE source_preference_application_rule must state that preferences cannot weaken evidence gates"));
  }

  const projection = cleanField(parseBulletField(texts.plan ?? "", "search_preference_projection"));
  if (!fieldIsConcrete(projection)) {
    findings.push(new Finding("E006", "PLAN Research Profile Projection.search_preference_projection must mirror PROFILE Search Preference Intake"));
  }

  return findings;
}

function backlinkFindings(files, texts) {
  const findings = [];
  const pairs = [
    ["plan", "status"],
    ["plan", "queue"],
    ["plan", "trace"],
    ["status", "plan"],
    ["status", "queue"],
    ["status", "trace"],
    ["queue", "plan"],
    ["queue", "status"],
    ["queue", "trace"],
    ["trace", "plan"],
    ["trace", "status"],
  ];
  if (files.profile) {
    pairs.push(
      ["profile", "plan"],
      ["profile", "status"],
      ["profile", "queue"],
      ["profile", "trace"],
      ["plan", "profile"],
      ["status", "profile"],
      ["queue", "profile"],
      ["trace", "profile"],
    );
  }
  for (const [from, to] of pairs) {
    if (!basenamePresent(texts[from], files[to])) {
      findings.push(new Finding("E005", `${from} file does not backlink ${to} file basename: ${files[to]}`));
    }
  }
  return findings;
}

function residueFindings(texts) {
  const findings = [];
  for (const [kind, text] of Object.entries(texts)) {
    if (hasPlaceholderResidue(text)) {
      findings.push(new Finding("E004", `${kind} file contains unresolved <placeholder> residue`));
    }
    if (hasSkeletonResidue(text)) {
      findings.push(new Finding("E004", `${kind} file contains output skeleton/template residue`));
    }
  }
  return findings;
}

function stateFindings(texts) {
  const findings = [];
  const status = texts.status;
  for (const [field, expected] of Object.entries(INST_STATE_EXPECTED)) {
    const actual = parseBulletField(status, field);
    if (actual !== expected) {
      findings.push(new Finding("E006", `STATUS ${field} must be ${expected}; found ${actual || "missing"}`));
    }
  }
  const nextGate = parseBulletField(status, "next_gate");
  if (nextGate !== "setup_ready") {
    findings.push(new Finding("E006", `STATUS next_gate must be setup_ready at instantiation; found ${nextGate || "missing"}`));
  }
  const traceNone = /-\s*none_recorded_yet:\s*`?yes`?/m.test(texts.trace);
  if (!traceNone) {
    findings.push(new Finding("E006", "TRACE must start with none_recorded_yet: yes"));
  }
  if (!/-\s*execution_mode:\s*`?sequential`?/m.test(texts.queue)) {
    findings.push(new Finding("E006", "QUEUE must start with execution_mode: sequential"));
  }
  if (!texts.queue.includes("## Active Queue")) {
    findings.push(new Finding("E006", "QUEUE missing stable Active Queue anchor"));
  }
  const currentGate = parseBulletField(status, "current_gate");
  const currentWave = parseBulletField(status, "current_wave");
  if (currentGate && !GATE_VALUES.has(currentGate)) {
    findings.push(new Finding("E006", `invalid current_gate enum: ${currentGate}`));
  }
  if (currentWave && !WAVE_VALUES.has(currentWave)) {
    findings.push(new Finding("E006", `invalid current_wave enum: ${currentWave}`));
  }
  const lastVerified = parseBulletField(status, "last_verified_result");
  if (lastVerified && /\b(instantiation\s+qualified|qualification\s+(?:passed|pass)|check-instantiation\s+pass)\b/i.test(lastVerified)) {
    findings.push(new Finding("E006", "STATUS last_verified_result must not self-assert instantiation qualification before the independent verifier returns PASS"));
  }
  return findings;
}

function instanceConfigValue(plan, field) {
  const match = plan.match(new RegExp(`\\|\\s*\`${field}\`\\s*\\|\\s*([^|\\n]+)\\|`));
  return match ? match[1].trim().replace(/^`+|`+$/g, "").trim() : null;
}

function concreteNumber(value) {
  const cleaned = cleanField(value);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  const match = cleaned.match(/^\d+$/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function parseConfiguredFloors(value) {
  const floors = new Map();
  for (const part of cleanField(value).split(";")) {
    const match = part.trim().match(/^([a-z0-9_]+)\s*=\s*(\d+)$/i);
    if (match) {
      floors.set(match[1].toLowerCase(), Number.parseInt(match[2], 10));
    }
  }
  return floors;
}

function configuredFloorValue(floors, key) {
  if (floors.has(key)) {
    return floors.get(key);
  }
  if (key === "wave1_per_topic" && floors.has("wave1")) {
    return floors.get("wave1");
  }
  return null;
}

function expectedFloorsForProfile(profile, topicComplexity, crossTopicDependency) {
  if (profile === "quick_factual") {
    return new Map([
      ["wave0", Math.max(5, Math.min(12, 4 + Math.ceil(topicComplexity / 2) + Math.ceil(crossTopicDependency / 2)))],
      ["wave1_per_topic", 5],
      ["primary", 2],
      ["secondary", 1],
      ["recent", 1],
      ["limitation", 1],
    ]);
  }
  if (profile === "exploratory_map") {
    return new Map([
      ["wave0", Math.max(8, Math.min(18, 6 + topicComplexity + crossTopicDependency))],
      ["wave1_per_topic", 8],
      ["primary", 3],
      ["secondary", 2],
      ["recent", 1],
      ["limitation", 2],
    ]);
  }
  if (profile === "claim_verification") {
    return new Map([
      ["wave0", Math.max(10, Math.min(24, 8 + topicComplexity + crossTopicDependency))],
      ["wave1_per_topic", 10],
      ["primary", 4],
      ["secondary", 2],
      ["recent", 1],
      ["limitation", 2],
    ]);
  }
  return null;
}

function hasManualOverride(value) {
  const cleaned = cleanField(value).toLowerCase();
  return !["none", "not_applicable", "not applicable", "n/a"].includes(cleaned);
}

function tableMissingColumns(table, requiredColumns) {
  return requiredColumnsMissing(table.headers, requiredColumns);
}

function isNoneLike(value) {
  return ["none", "not_applicable", "not applicable", "n/a"].includes(cleanField(value).toLowerCase());
}

function rootMustAnswerRows(rootMustAnswer) {
  const table = firstMarkdownTable(rootMustAnswer);
  return table.rows.map((row) => ({
    id: rowCell(row, ["id"]),
    finalMustAnswer: rowCell(row, ["final_must_answer", "final must answer"]),
    intendedProfileHandling: rowCell(row, ["intended_profile_handling", "intended profile handling"]),
    initialAnswerPhase: rowCell(row, ["initial_answer_phase", "initial answer phase", "answer_phase", "answer phase"]),
    mappedTopics: rowCell(row, ["mapped_topics", "mapped topics"]),
    intakeStatus: rowCell(row, ["intake_status", "intake status"]),
    queueConsequence: rowCell(row, ["queue_consequence", "queue consequence"]),
    raw: row,
  }));
}

function rootMustAnswerTableFindings(rootMustAnswer, intakeStatus, researchProfile) {
  const findings = [];
  const table = firstMarkdownTable(rootMustAnswer);
  const missing = tableMissingColumns(table, ROOT_MUST_ANSWER_COLUMNS);
  if (missing.length > 0) {
    findings.push(new Finding("E006", `PROFILE Root Must-Answer Set table missing columns: ${missing.join(", ")}`));
    return findings;
  }

  const rows = rootMustAnswerRows(rootMustAnswer).filter((row) => {
    return Object.values(row.raw).some((value) => cleanField(value));
  });
  const concreteRows = rows.filter((row) => Object.values(row.raw).some((value) => fieldIsConcrete(value)));
  if (intakeStatus === "ready" && concreteRows.length === 0) {
    findings.push(new Finding("E006", "PROFILE final_must_answer_intake_status=ready requires at least one concrete Root Must-Answer table row"));
  }

  let hasGapQueueRow = false;
  let hasReadyRow = false;
  for (const [idx, row] of concreteRows.entries()) {
    const rowLabel = `PROFILE Root Must-Answer row ${idx + 1}`;
    const rowStatus = cleanField(row.intakeStatus).toLowerCase();
    const isGapRow = rowStatus === "gap" || rowStatus === "gap_queue_backed";
    const isReadyRow = rowStatus === "ready";
    if (isReadyRow) {
      hasReadyRow = true;
    }
    if (isGapRow && fieldIsConcrete(row.queueConsequence) && !isNoneLike(row.queueConsequence)) {
      hasGapQueueRow = true;
    }

    if (!/^FMA-\d+$/i.test(row.id)) {
      findings.push(new Finding("E006", `${rowLabel} id must be a stable FMA-N id; found ${row.id || "missing"}`));
    }
    if (!fieldIsConcrete(row.finalMustAnswer)) {
      findings.push(new Finding("E006", `${rowLabel} final_must_answer must be concrete`));
    }
    if (!cleanField(row.intendedProfileHandling).toLowerCase().includes(researchProfile)) {
      findings.push(new Finding("E006", `${rowLabel} intended_profile_handling must name the selected research_profile ${researchProfile}`));
    }
    const phase = cleanField(row.initialAnswerPhase).toLowerCase();
    if (!MUST_ANSWER_INITIAL_PHASE_VALUES.has(phase)) {
      findings.push(new Finding("E006", `${rowLabel} initial_answer_phase must be wave1_topic / wave2_synthesis / pending_decomposition; found ${phase || "missing"}`));
    }
    if (isReadyRow && phase === "pending_decomposition") {
      findings.push(new Finding("E006", `${rowLabel} intake_status=ready cannot use initial_answer_phase=pending_decomposition`));
    }
    if (isReadyRow && (!fieldIsConcrete(row.mappedTopics) || /\b(pending|gap|clarif(?:y|ication)|decompos)/i.test(row.mappedTopics))) {
      findings.push(new Finding("E006", `${rowLabel} intake_status=ready requires concrete mapped_topics, not pending or gap wording`));
    }
    if (!isReadyRow && !isGapRow) {
      findings.push(new Finding("E006", `${rowLabel} intake_status must be ready or gap; found ${row.intakeStatus || "missing"}`));
    }
    if (intakeStatus === "ready" && isGapRow) {
      findings.push(new Finding("E006", `${rowLabel} cannot remain gap while final_must_answer_intake_status=ready`));
    }
    if (isGapRow && (!fieldIsConcrete(row.queueConsequence) || isNoneLike(row.queueConsequence))) {
      findings.push(new Finding("E006", `${rowLabel} intake_status=gap requires concrete queue_consequence`));
    }
  }

  if (intakeStatus === "ready" && !hasReadyRow) {
    findings.push(new Finding("E006", "PROFILE final_must_answer_intake_status=ready requires at least one Root Must-Answer row with intake_status=ready"));
  }
  if (intakeStatus === "gap_queue_backed" && !hasGapQueueRow) {
    findings.push(new Finding("E006", "PROFILE final_must_answer_intake_status=gap_queue_backed requires a Root Must-Answer table row with intake_status=gap and concrete queue_consequence"));
  }
  return findings;
}

function sourceOfRecordBoundaryFindings(texts) {
  const findings = [
    ...(texts.profile ? missingSectionFindings(texts.profile, "PROFILE", [
      "File Role Snapshot",
      "Profile Binding",
      "Profile Contract",
      "Root Must-Answer Set",
      "Search Preference Intake",
      "Configured Profile Parameters",
      "Human Decision Checkpoints",
    ]) : []),
    ...missingSectionFindings(texts.plan, "PLAN", [
      "File Role Snapshot",
      "Instance Config",
      "Research Profile Projection",
      "Control Map",
      "Topic Registry",
      "Seed Topic Intake Matrix",
      "Output Contract",
      "Wave Design",
      "Topic Goals",
      "Topic Stop And Critical Claim Policy",
      "Local Execution Authorities",
      "Success State",
    ]),
    ...missingSectionFindings(texts.status, "STATUS", [
      "Operator View",
      "Current Execution Snapshot",
      "Gate State",
      "Setup Ready Transition",
      "Anti-Stall Budget",
      "Topology Delta",
      "Topology Drift Review",
      "Wave 0 Foundation Gate Audit",
      "Wave 0 Accepted Shared Reference Inventory",
      "Wave 1 Source Floor Audit",
      "Accepted Reference Inventory",
      "Wave 2 Synthesis Gate Audit",
      "Cross-Topic Conclusion Matrix",
      "Readiness Check",
      "Resume Checkpoint",
    ]),
    ...missingSectionFindings(texts.queue, "QUEUE", [
      "Operator View",
      "Active Queue",
      "Blocked State",
      "Refill Pool",
      "Promotion Rules",
      "Wave Gate Audit Rule",
      "No-Empty-Queue Rule",
      "Rolling Task Projection Rule",
      "Topic Seed Backfill Rule",
      "Anti-Stall Budget Rule",
      "Post-Readiness Maintenance Rule",
    ]),
    ...missingSectionFindings(texts.trace, "TRACE", [
      "File Role Snapshot",
      "Write Rules",
      "Trace Entries",
    ]),
  ];
  return findings;
}

export function profileInstantiationFindings(texts) {
  if (!texts.profile) {
    return [];
  }
  const findings = [];
  const profile = texts.profile;
  const binding = tableInSection(profile, "Profile Binding");
  const bindingRows = new Map(binding.rows.map((row) => [normalizeName(rowCell(row, ["field"])), rowCell(row, ["value"])]));
  const researchProfile = cleanField(bindingRows.get("research_profile"));
  if (!RESEARCH_PROFILES.has(researchProfile)) {
    findings.push(new Finding("E006", `PROFILE research_profile must be one of quick_factual / exploratory_map / claim_verification; found ${researchProfile || "missing"}`));
  }
  const userChoice = cleanField(bindingRows.get("research_profile_user_choice"));
  if (!RESEARCH_PROFILE_USER_CHOICES.has(userChoice)) {
    findings.push(new Finding("E006", `PROFILE research_profile_user_choice must be explicit_user_choice / explicit_user_choice_after_clarification / explicit_override; found ${userChoice || "missing"}`));
  }

  const planProfile = cleanField(instanceConfigValue(texts.plan, "research_profile"));
  const planUserChoice = cleanField(instanceConfigValue(texts.plan, "research_profile_user_choice"));
  if (planProfile !== researchProfile) {
    findings.push(new Finding("E006", `PLAN Instance Config research_profile must match PROFILE; plan=${planProfile || "missing"}, profile=${researchProfile || "missing"}`));
  }
  if (planUserChoice !== userChoice) {
    findings.push(new Finding("E006", `PLAN Instance Config research_profile_user_choice must match PROFILE; plan=${planUserChoice || "missing"}, profile=${userChoice || "missing"}`));
  }

  const planRunDir = instanceConfigValue(texts.plan, "run_dir");
  const planArtifactDir = instanceConfigValue(texts.plan, "artifact_dir");
  const profileArtifactDir = cleanField(bindingRows.get("artifact_dir"));
  let resolvedProfileArtifactDir = null;
  if (!fieldIsConcrete(profileArtifactDir)) {
    findings.push(new Finding("E006", "PROFILE Profile Binding.artifact_dir must be a concrete absolute path"));
  } else if (!isAbsolute(profileArtifactDir)) {
    findings.push(new Finding("E006", `PROFILE Profile Binding.artifact_dir must be an absolute path; found ${profileArtifactDir}`));
  } else if (!planRunDir || planRunDir.includes("<") || planRunDir.includes(">")) {
    findings.push(new Finding("E006", "PLAN Instance Config run_dir must be concrete before PROFILE artifact_dir can be validated"));
  } else {
    resolvedProfileArtifactDir = resolveRunPath(planRunDir, profileArtifactDir);
    const expectedArtifactDir = resolveRunPath(planRunDir, "seed_topics/_artifacts");
    const resolvedPlanArtifactDir = resolveRunPath(planRunDir, planArtifactDir);
    if (!resolvedProfileArtifactDir || !pathIsInside(expectedArtifactDir, resolvedProfileArtifactDir) || !pathIsInside(resolvedProfileArtifactDir, expectedArtifactDir)) {
      findings.push(new Finding("E006", `PROFILE Profile Binding.artifact_dir must resolve to RUN_DIR/seed_topics/_artifacts; found ${profileArtifactDir || "missing"}`));
    }
    if (resolvedPlanArtifactDir && (!pathIsInside(resolvedPlanArtifactDir, resolvedProfileArtifactDir) || !pathIsInside(resolvedProfileArtifactDir, resolvedPlanArtifactDir))) {
      findings.push(new Finding("E006", `PROFILE Profile Binding.artifact_dir must match PLAN Instance Config artifact_dir; profile=${profileArtifactDir}, plan=${planArtifactDir}`));
    }
  }

  const rootMustAnswer = sectionText(profile, "Root Must-Answer Set");
  const intakeStatus = cleanField(parseBulletField(rootMustAnswer, "final_must_answer_intake_status"));
  if (!["ready", "gap_queue_backed"].includes(intakeStatus)) {
    findings.push(new Finding("E006", `PROFILE final_must_answer_intake_status must be ready / gap_queue_backed; found ${intakeStatus || "missing"}`));
  }
  const finalInput = cleanField(parseBulletField(rootMustAnswer, "final_must_answer_user_input"));
  const rootLens = cleanField(parseBulletField(rootMustAnswer, "root_lens_for_wave2"));
  if (!fieldIsConcrete(finalInput)) {
    findings.push(new Finding("E006", "PROFILE final_must_answer_user_input must be concrete or explicitly unsure"));
  }
  if (intakeStatus === "ready" && /\b(unsure|unknown|unclear|assumption|gap_queue_backed|clarif(?:y|ication)|pending)\b|不确定|待澄清|先帮我拆|假设/i.test(finalInput)) {
    findings.push(new Finding("E006", "PROFILE final_must_answer_intake_status=ready cannot use unsure, pending, assumption, or clarification wording"));
  }
  if (!fieldIsConcrete(rootLens)) {
    findings.push(new Finding("E006", "PROFILE root_lens_for_wave2 must be concrete"));
  }
  findings.push(...rootMustAnswerTableFindings(rootMustAnswer, intakeStatus, researchProfile));
  findings.push(...searchPreferenceIntakeFindings(texts));

  const params = sectionText(profile, "Configured Profile Parameters");
  for (const field of ["active_wave0_formula", "configured_floors", "critical_claim_checks", "must_answer_policy", "cost_expectation"]) {
    if (!fieldIsConcrete(parseBulletField(params, field))) {
      findings.push(new Finding("E006", `PROFILE Configured Profile Parameters.${field} must be concrete at instantiation`));
    }
  }
  const overrides = cleanField(parseBulletField(params, "manual_parameter_overrides"));
  if (!overrides || overrides.includes("<") || overrides.includes(">")) {
    findings.push(new Finding("E006", "PROFILE Configured Profile Parameters.manual_parameter_overrides must be none or a concrete override rationale"));
  }
  const profileFloors = parseConfiguredFloors(parseBulletField(params, "configured_floors"));
  for (const [profileFloorKey, planField] of FLOOR_FIELDS) {
    const profileValue = configuredFloorValue(profileFloors, profileFloorKey);
    const planValue = concreteNumber(instanceConfigValue(texts.plan, planField));
    if (profileValue === null) {
      findings.push(new Finding("E006", `PROFILE configured_floors missing ${profileFloorKey}`));
    }
    if (planValue === null) {
      findings.push(new Finding("E006", `PLAN Instance Config ${planField} must be a concrete integer`));
    }
    if (profileValue !== null && planValue !== null && profileValue !== planValue) {
      findings.push(new Finding("E006", `PLAN ${planField} must match PROFILE configured_floors.${profileFloorKey}; plan=${planValue}, profile=${profileValue}`));
    }
  }
  const topicComplexity = concreteNumber(instanceConfigValue(texts.plan, "topic_complexity_factor"));
  const crossTopicDependency = concreteNumber(instanceConfigValue(texts.plan, "cross_topic_dependency_factor"));
  for (const [field, value] of [
    ["topic_complexity_factor", topicComplexity],
    ["cross_topic_dependency_factor", crossTopicDependency],
  ]) {
    if (value === null || value < 0 || value > 6) {
      findings.push(new Finding("E006", `PLAN Instance Config ${field} must be an integer from 0 to 6; found ${instanceConfigValue(texts.plan, field) || "missing"}`));
    }
  }
  if (topicComplexity !== null && crossTopicDependency !== null && !hasManualOverride(overrides)) {
    const expectedFloors = expectedFloorsForProfile(researchProfile, topicComplexity, crossTopicDependency);
    if (expectedFloors) {
      for (const [profileFloorKey] of FLOOR_FIELDS) {
        const actual = configuredFloorValue(profileFloors, profileFloorKey);
        const expected = expectedFloors.get(profileFloorKey);
        if (actual !== null && expected !== undefined && actual !== expected) {
          findings.push(new Finding("E006", `PROFILE configured_floors.${profileFloorKey} must match ${researchProfile} defaults without manual override; expected=${expected}, actual=${actual}`));
        }
      }
    }
  }

  const checkpoints = sectionText(profile, "Human Decision Checkpoints");
  const checkpointTable = firstMarkdownTable(checkpoints);
  const hitl1Row = checkpointTable.rows.find((row) => rowCell(row, ["checkpoint"]).includes("HITL1_profile_and_root_must_answer"));
  if (!hitl1Row) {
    findings.push(new Finding("E006", "PROFILE Human Decision Checkpoints missing HITL1_profile_and_root_must_answer row"));
  } else {
    const status = rowCell(hitl1Row, ["status"]);
    const userInput = rowCell(hitl1Row, ["user input", "user_input"]);
    if (status !== "recorded") {
      findings.push(new Finding("E006", `PROFILE HITL1_profile_and_root_must_answer must be recorded at instantiation; found ${status || "missing"}`));
    }
    if (!fieldIsConcrete(userInput) || /profile choice plus root must-answer set|profile choice|root must-answer set|placeholder|pending|not_started/i.test(userInput)) {
      findings.push(new Finding("E006", "PROFILE HITL1 row must record the concrete user profile choice and final must-answer input, not a generic placeholder"));
    }
  }
  if (!/HITL2_wave2_readiness_decision[\s\S]*not_started/i.test(checkpoints)) {
    findings.push(new Finding("E006", "PROFILE HITL2_wave2_readiness_decision must start as not_started at instantiation"));
  }
  const hitl2 = hierarchicalSectionText(profile, "HITL2 Wave 2 Readiness Decision");
  const expectedHITL2 = [
    ["hitl2_checkpoint_status", "not_started"],
    ["answerability_class", "not_assessed"],
    ["human_checkpoint_status", "not_started"],
    ["final_report_view", "not_started"],
    ["custom_final_report_view_label", "not_applicable"],
    ["custom_final_report_view_slug", "not_applicable"],
    ["final_output_dir", "not_started"],
    ["repair_recommendation", "not_started"],
    ["user_decision", "not_started"],
  ];
  for (const [field, expected] of expectedHITL2) {
    const actual = cleanField(parseBulletField(hitl2, field));
    if (actual !== expected) {
      findings.push(new Finding("E006", `PROFILE HITL2 ${field} must start as ${expected}; found ${actual || "missing"}`));
    }
  }
  const hitl2DecisionBriefPath = cleanField(parseBulletField(hitl2, "hitl2_decision_brief_path"));
  if (!fieldIsConcrete(hitl2DecisionBriefPath)) {
    findings.push(new Finding("E006", "PROFILE HITL2 hitl2_decision_brief_path must be a concrete absolute path"));
  } else if (!isAbsolute(hitl2DecisionBriefPath)) {
    findings.push(new Finding("E006", `PROFILE HITL2 hitl2_decision_brief_path must be an absolute path; found ${hitl2DecisionBriefPath}`));
  } else if (resolvedProfileArtifactDir) {
    const resolvedBriefPath = resolveRunPath(planRunDir, hitl2DecisionBriefPath);
    const expectedBriefPath = join(resolvedProfileArtifactDir, "wave2", "human-decision-brief.md");
    if (!resolvedBriefPath || !pathIsInside(expectedBriefPath, resolvedBriefPath) || !pathIsInside(resolvedBriefPath, expectedBriefPath)) {
      findings.push(new Finding("E006", `PROFILE HITL2 hitl2_decision_brief_path must resolve to PROFILE artifact_dir/wave2/human-decision-brief.md; found ${hitl2DecisionBriefPath}`));
    }
  }
  return findings;
}

function topicExpansionFindings(texts) {
  const findings = [];
  findings.push(...missingColumnFindings(texts.plan, "Topic Registry", TOPIC_REGISTRY_COLUMNS, "E012"));
  findings.push(...missingColumnFindings(texts.plan, "Seed Topic Intake Matrix", SEED_TOPIC_INTAKE_COLUMNS, "E012"));

  const registryRows = topicRegistryRows(texts.plan);
  if (registryRows.length === 0) {
    if (!pendingTopicWorkVisible(texts)) {
      findings.push(new Finding("E012", "Topic Registry has no confirmed topic rows and no visible decomposition/intake clarification work"));
    }
    const intake = intakeRows(texts.plan);
    const statusBlocks = statusTopicBlocks(texts.status);
    const wave1AuditKeys = topicRowsInAudit(texts.status, "Wave 1 Source Floor Audit");
    const wave2AuditKeys = topicRowsInAudit(texts.status, "Wave 2 Synthesis Gate Audit");
    if (intake.length > 0) {
      findings.push(new Finding("E012", "Seed Topic Intake Matrix must not contain concrete topic rows when Topic Registry has no confirmed topics"));
    }
    if (statusBlocks.length > 0) {
      findings.push(new Finding("E012", "STATUS must not contain concrete Wave 1 topic blocks when Topic Registry has no confirmed topics"));
    }
    if (wave1AuditKeys.length > 0 || wave2AuditKeys.length > 0) {
      findings.push(new Finding("E012", "Wave 1/Wave 2 audit tables must not contain concrete topic rows when Topic Registry has no confirmed topics"));
    }
    return findings;
  }

  const registryKeys = new Set(registryRows.map((row) => row.key).filter(fieldIsConcrete));
  for (const row of registryRows) {
    if (rowContainsPendingMarker(row.raw)) {
      findings.push(new Finding("E012", `Topic Registry row ${row.key || row.title || "unknown"} appears to be pending; pending candidates must stay outside Topic Registry until confirmed`));
    }
    for (const [field, value] of [
      ["id", row.id],
      ["slug", row.slug],
      ["title", row.title],
      ["must_answer", row.mustAnswer],
    ]) {
      if (!fieldIsConcrete(value)) {
        findings.push(new Finding("E012", `Topic Registry row ${row.key || row.title || "unknown"} missing concrete ${field}`));
      }
    }
  }

  const intakeByKey = new Set(intakeRows(texts.plan).map((row) => row.key));
  for (const key of registryKeys) {
    if (!intakeByKey.has(key)) {
      findings.push(new Finding("E012", `Seed Topic Intake Matrix missing row for Topic Registry entry: ${key}`));
    }
  }
  for (const row of intakeRows(texts.plan)) {
    for (const [field, value] of [
      ["must_answer", row.mustAnswer],
      ["why_now", row.whyNow],
      ["boundary", row.boundary],
      ["evidence_anchors", row.evidenceAnchors],
      ["why_it_matters", row.whyItMatters],
      ["intake_status", row.intakeStatus],
    ]) {
      if (!fieldIsConcrete(value)) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} missing concrete ${field}`));
      }
    }
    if (/^pending$/i.test(cleanField(row.intakeStatus))) {
      findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} has intake_status=pending for a confirmed Topic Registry row`));
    }
    const intakeStatus = cleanField(row.intakeStatus).toLowerCase();
    const gapStatus = ["gap", "assumption", "gap_queue_backed"].includes(intakeStatus);
    const hasIntakeGap = fieldIsConcrete(row.intakeGap) && !isNoneLike(row.intakeGap);
    const hasQueueConsequence = fieldIsConcrete(row.queueConsequence) && !isNoneLike(row.queueConsequence);
    if (gapStatus || hasIntakeGap || hasQueueConsequence) {
      if (!hasIntakeGap) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} has ${intakeStatus || "gap"} status/consequence but lacks concrete intake_gap`));
      }
      if (!hasQueueConsequence) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} has intake gap but no concrete queue_consequence`));
      }
      if (!queueMentionsTopicRepair(texts.queue, row.key)) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} has intake gap but QUEUE lacks concrete repair work for the affected topic`));
      }
    }
    if (originalTopicConfigured(texts.plan)) {
      const contextText = `${row.boundary}\n${row.evidenceAnchors}`;
      const missingFields = missingOriginalContextFields(contextText);
      if (missingFields.length > 0 && !rowHasQueueBackedGap(row, texts.queue)) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} derived from original_topic must preserve meaningful original context fields or use a queue-backed intake gap; missing ${missingFields.join(", ")}`));
      }
      if (!citesNormalizedOriginalTopic(contextText) && !rowHasQueueBackedGap(row, texts.queue)) {
        findings.push(new Finding("E012", `Seed Topic Intake Matrix row ${row.key} derived from original_topic must cite original_topic/<english-slug>.normalized.md in source_anchor or use a queue-backed intake gap`));
      }
    }
  }

  const statusKeys = new Set(statusTopicBlocks(texts.status).map((block) => block.key));
  for (const key of registryKeys) {
    if (!statusKeys.has(key)) {
      findings.push(new Finding("E012", `STATUS missing Wave 1 topic block for Topic Registry entry: ${key}`));
    }
  }

  const wave1AuditKeys = new Set(topicRowsInAudit(texts.status, "Wave 1 Source Floor Audit"));
  const wave2AuditKeys = new Set(topicRowsInAudit(texts.status, "Wave 2 Synthesis Gate Audit"));
  for (const key of registryKeys) {
    if (!wave1AuditKeys.has(key)) {
      findings.push(new Finding("E012", `Wave 1 Source Floor Audit missing row for topic: ${key}`));
    }
    if (!wave2AuditKeys.has(key)) {
      findings.push(new Finding("E012", `Wave 2 Synthesis Gate Audit missing row for topic: ${key}`));
    }
  }
  return findings;
}

export function seedIntakeFindings(texts) {
  const runRoot = cleanField(instanceConfigValue(texts.plan, "run_dir"));
  return [
    ...(fieldIsConcrete(runRoot) ? normalizedOriginalTopicFindings(runRoot, texts) : []),
    ...topicExpansionFindings(texts),
  ];
}

function bundleFindings(root, files, texts = null) {
  const runRoot = runRootFor(root, files);
  const findings = [
    ...frameworkPresenceFindings(runRoot),
    ...frameworkSnapshotFindings(runRoot),
    ...frameworkVersionFindings(runRoot, texts?.plan ?? ""),
    ...frameworkContentDriftFindings(runRoot),
    ...mutableRunDirectoryFindings(runRoot),
    ...frameworkStateFindings(runRoot),
    ...runRootAgentContractFindings(runRoot),
    ...controlFilesAtRunRootFindings(runRoot, files),
    ...controlFilesOutsideFrameworkFindings(runRoot, files),
  ];
  if (texts) {
    const mutablePathFields = [
      "run_dir",
      "profile_path",
      "plan_path",
      "status_path",
      "queue_path",
      "trace_path",
      "original_topic_dir",
      "topic_root",
      "reference_dir",
      "artifact_dir",
    ];
    const layoutPathFields = [
      "run_dir",
      "framework_dir",
      "topic_root",
      "reference_dir",
      "artifact_dir",
    ];
    findings.push(...instancePathsOutsideFrameworkFindings(
      runRoot,
      mutablePathFields.map((field) => [field, instanceConfigValue(texts.plan, field)]),
    ));
    findings.push(...standardRunLayoutFindings(
      runRoot,
      layoutPathFields.map((field) => [field, instanceConfigValue(texts.plan, field)]),
    ));
    findings.push(...originalTopicLayoutFindings(
      runRoot,
      instanceConfigValue(texts.plan, "original_topic_dir"),
    ));
    findings.push(...commandEntrypointFindings(
      runRoot,
      files,
      [
        ["framework_command_index", instanceConfigValue(texts.plan, "framework_command_index")],
        ["framework_cli_check", instanceConfigValue(texts.plan, "framework_cli_check")],
        ...(files.profile ? [["runtime_profile", instanceConfigValue(texts.plan, "runtime_profile")]] : []),
        ["runtime_plan", instanceConfigValue(texts.plan, "runtime_plan")],
        ["runtime_status", instanceConfigValue(texts.plan, "runtime_status")],
        ["runtime_queue", instanceConfigValue(texts.plan, "runtime_queue")],
        ["runtime_trace", instanceConfigValue(texts.plan, "runtime_trace")],
      ],
      texts.plan,
    ));
  }
  return findings;
}

export function checkInstantiation(root) {
  const { files, findings } = locateRunFiles(root);
  const preFindings = bundleFindings(root, files);
  if (findings.length > 0) {
    return [...preFindings, ...findings];
  }
  const texts = readRunTexts(files);
  return [
    ...bundleFindings(root, files, texts),
    ...backlinkFindings(files, texts),
    ...residueFindings(texts),
    ...stateFindings(texts),
    ...sourceOfRecordBoundaryFindings(texts),
    ...normalizedOriginalTopicFindings(runRootFor(root, files), texts),
    ...profileInstantiationFindings(texts),
  ];
}
