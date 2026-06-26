import { basename, dirname, join, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { resolveRunPath, seedTopicsRoot } from "../lib/bundle.mjs";
import { exists, isFile, readText } from "../lib/fs.mjs";
import { firstMarkdownTable, hierarchicalSectionText, markdownTables, parseBulletField, requiredColumnsMissing } from "../lib/markdown.mjs";
import {
  ACCEPTANCE_STATUS_VALUES,
  COMMERCIAL_INTENT_VALUES,
  CONTENT_RETENTION_DECISION_VALUES,
  COUNTED_FOR_FLOOR_VALUES,
  CROSS_VERIFICATION_REQUIRED_VALUES,
  CROSS_VERIFICATION_STATUS_VALUES,
  EVIDENCE_ROLE_VALUES,
  MARKETING_RISK_VALUES,
  SEED_BACKFILL_STATUS_VALUES,
  SYNTHESIS_MATRIX_COLUMNS,
  TIER_VALUES,
  TOPIC_UNIQUE_STATUS_VALUES,
  TRUST_LEVEL_VALUES,
  WAVE0_INVENTORY_COLUMNS,
  WAVE1_INVENTORY_COLUMNS,
  WEB_SUBSTANCE_VALUES,
} from "../contracts/constants.mjs";
import { cleanField, instanceConfigValue, pathIsInside, splitPathList } from "./runtime-shared.mjs";

function cell(row, name) {
  const wanted = cleanField(name).toLowerCase().replace(/[\s-]+/g, "_");
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanField(key).toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === wanted) {
      return cleanField(value);
    }
  }
  return "";
}

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

const ORIGINAL_CONTEXT_MARKERS = [
  ["source_anchor", /\bsource[_ -]?anchor\b|原始|出处|来源锚/i],
  ["in_scope", /\bin[_ -]?scope\b|范围内|纳入范围/i],
  ["out_of_scope", /\bout[_ -]?of[_ -]?scope\b|不包括|排除|范围外/i],
  ["search_guardrails", /\bsearch[_ -]?guardrails?\b|搜索护栏|检索护栏|禁止泛化/i],
  ["evidence_route", /\bevidence[_ -]?route\b|证据路径|来源路径|source route/i],
];

function fieldIsConcrete(value) {
  const cleaned = cleanField(value);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }
  return !EMPTY_VALUES.has(cleaned.toLowerCase());
}

function isNoneLike(value) {
  return ["none", "not_applicable", "not applicable", "n/a"].includes(cleanField(value).toLowerCase());
}

function topicKey(id, slug = "") {
  const idPart = cleanField(id);
  const slugPart = cleanField(slug);
  return slugPart ? `${idPart}/${slugPart}`.toLowerCase() : idPart.toLowerCase();
}

function parseTopicKey(value) {
  const cleaned = cleanField(value);
  const match = cleaned.match(/\b([^/\s`|]+)\/([^/\s`|]+)\b/);
  if (match) {
    return topicKey(match[1], match[2]);
  }
  return cleaned.toLowerCase();
}

function planTopicRows(plan) {
  return firstMarkdownTable(hierarchicalSectionText(plan, "Topic Registry")).rows
    .map((row) => ({
      id: cell(row, "id") || cell(row, "topic_id"),
      slug: cell(row, "slug") || cell(row, "topic_slug"),
      title: cell(row, "title"),
      mustAnswer: cell(row, "must_answer") || cell(row, "must answer"),
      key: topicKey(cell(row, "id") || cell(row, "topic_id"), cell(row, "slug") || cell(row, "topic_slug")),
    }))
    .filter((row) => fieldIsConcrete(row.id) || fieldIsConcrete(row.slug) || fieldIsConcrete(row.title) || fieldIsConcrete(row.mustAnswer));
}

function planIntakeRows(plan) {
  return firstMarkdownTable(hierarchicalSectionText(plan, "Seed Topic Intake Matrix")).rows
    .map((row) => ({
      key: parseTopicKey(cell(row, "topic") || cell(row, "id") || cell(row, "topic_id")),
      status: cell(row, "intake_status") || cell(row, "intake status"),
      gap: cell(row, "intake_gap") || cell(row, "intake gap"),
      queueConsequence: cell(row, "queue_consequence") || cell(row, "queue consequence"),
      boundary: cell(row, "boundary"),
      evidenceAnchors: cell(row, "evidence_anchors") || cell(row, "evidence anchors"),
    }))
    .filter((row) => fieldIsConcrete(row.key));
}

function intakeRowHasUnresolvedGap(row) {
  const status = cleanField(row?.status).toLowerCase();
  return status !== "ready"
    || (fieldIsConcrete(row?.gap) && !isNoneLike(row.gap))
    || (fieldIsConcrete(row?.queueConsequence) && !isNoneLike(row.queueConsequence));
}

function setupSeedReadyStatus(status) {
  return cleanField(parseBulletField(hierarchicalSectionText(status, "Setup Ready Transition"), "seed_topic_intake_ready"));
}

function originalTopicConfigured(plan) {
  return fieldIsConcrete(instanceConfigValue(plan, "original_topic_dir"));
}

function missingOriginalContextMarkers(text) {
  return ORIGINAL_CONTEXT_MARKERS
    .filter(([, pattern]) => !pattern.test(text))
    .map(([name]) => name);
}

function wave0TopicStartRows(status) {
  return sectionTables(status, "Wave 0 Foundation Gate Audit")
    .find((table) => table.headers.some((header) => cleanField(header).toLowerCase().replace(/[\s-]+/g, "_") === "topic")
      && table.headers.some((header) => cleanField(header).toLowerCase().replace(/[\s-]+/g, "_") === "wave1_start_point"))
    ?.rows ?? [];
}

function topicStartReady(value) {
  const cleaned = cleanField(value).toLowerCase();
  return fieldIsConcrete(cleaned) && !/\b(not_ready|not started|not_started|fail|gap|missing|pending|blocked)\b/i.test(cleaned);
}

function wave0SeedIntakeGateFindings(texts) {
  const findings = [];
  const status = texts.status;
  if (!yesPassSection(status, "Wave 0 Foundation Gate Audit", "wave1_entry_allowed")) {
    return findings;
  }

  const seedReady = setupSeedReadyStatus(status);
  if (seedReady !== "yes") {
    findings.push(new Finding("E007", `Wave 0 pass requires Setup Ready Transition.seed_topic_intake_ready=yes; found ${seedReady || "missing"}`));
  }

  const topics = planTopicRows(texts.plan);
  if (topics.length === 0) {
    findings.push(new Finding("E007", "Wave 0 pass requires derived_topic_count > 0 with at least one confirmed Topic Registry row"));
  }

  const intakeByKey = new Map(planIntakeRows(texts.plan).map((row) => [row.key, row]));
  for (const topic of topics) {
    const intake = intakeByKey.get(topic.key);
    if (!intake) {
      findings.push(new Finding("E007", `Wave 0 pass requires Seed Topic Intake Matrix row for confirmed topic ${topic.key}`));
    } else if (intakeRowHasUnresolvedGap(intake)) {
      findings.push(new Finding("E007", `Wave 0 pass cannot proceed while confirmed topic ${topic.key} has unresolved intake gap or queue consequence`));
    }
  }

  const topicStartByKey = new Map(wave0TopicStartRows(status).map((row) => [parseTopicKey(cell(row, "topic")), row]));
  for (const topic of topics) {
    const row = topicStartByKey.get(topic.key);
    if (!row) {
      findings.push(new Finding("E007", `Wave 0 pass requires topic-start audit row for confirmed topic ${topic.key}`));
      continue;
    }
    for (const field of ["wave1_start_point", "source_entry_points", "core_terms_ready"]) {
      if (!topicStartReady(cell(row, field))) {
        findings.push(new Finding("E007", `Wave 0 pass requires ${topic.key} ${field}=ready/pass; found ${cell(row, field) || "missing"}`));
      }
    }
    if (cell(row, "result").toLowerCase() !== "pass") {
      findings.push(new Finding("E007", `Wave 0 pass requires ${topic.key} topic-start result=pass; found ${cell(row, "result") || "missing"}`));
    }
  }
  return findings;
}

function wave1IntakeGapFindings(texts) {
  const findings = [];
  if (!yesPassSection(texts.status, "Wave 1 Source Floor Audit", "wave2_entry_allowed")) {
    return findings;
  }
  const intakeByKey = new Map(planIntakeRows(texts.plan).map((row) => [row.key, row]));
  for (const row of auditRows(texts.status, "Wave 1 Source Floor Audit")) {
    const topic = topicKeyFromRow(row);
    if (!topic || cell(row, "result").toLowerCase() !== "pass") {
      continue;
    }
    const intake = intakeByKey.get(topic);
    if (!intake) {
      findings.push(new Finding("E007", `Wave 1 pass requires Seed Topic Intake Matrix row for passed topic ${topic}`));
      continue;
    }
    if (intakeRowHasUnresolvedGap(intake)) {
      findings.push(new Finding("E007", `Wave 1 pass cannot include topic ${topic} while intake/context repair is unresolved or queue-backed`));
    }
    if (originalTopicConfigured(texts.plan)) {
      const missingMarkers = missingOriginalContextMarkers(`${intake.boundary}\n${intake.evidenceAnchors}`);
      if (missingMarkers.length > 0) {
        findings.push(new Finding("E007", `Wave 1 pass cannot include original_topic-derived topic ${topic} until PLAN intake context markers are repaired; missing ${missingMarkers.join(", ")}`));
      }
    }
  }
  return findings;
}

function isCountedInventoryRow(row) {
  const counted = cell(row, "counted_for_floor").toLowerCase();
  return counted === "yes";
}

function validEvidenceRoleList(value) {
  const roles = cleanField(value).toLowerCase().split(/[;,]/).map(cleanField).filter(Boolean);
  return roles.length > 0 && roles.every((role) => EVIDENCE_ROLE_VALUES.has(role));
}

function inventoryRowQualityFindings(table, label) {
  const findings = [];
  table.rows.forEach((row, idx) => {
    if (!isCountedInventoryRow(row)) {
      return;
    }
    const rowLabel = `${label} row ${idx + 1}`;
    const localPath = cell(row, "local_ref_path");
    const acceptance = cell(row, "acceptance_status").toLowerCase();
    const sourceType = cell(row, "source_type");
    const tier = cell(row, "tier").toLowerCase();
    const evidenceRole = cell(row, "evidence_role").toLowerCase();
    const trustLevel = cell(row, "trust_level").toLowerCase();
    const topicUniqueStatus = cell(row, "topic_unique_status").toLowerCase();
    const seedBackfillStatus = cell(row, "seed_backfill_status").toLowerCase();
    const countedForFloor = cell(row, "counted_for_floor").toLowerCase();
    const webSubstance = cell(row, "web_substance").toLowerCase();
    const marketingRisk = cell(row, "marketing_risk").toLowerCase();
    const commercialIntent = cell(row, "commercial_intent").toLowerCase();
    const crossVerificationRequired = cell(row, "cross_verification_required").toLowerCase();
    const crossVerification = cell(row, "cross_verification_status").toLowerCase();
    const contentRetention = cell(row, "content_retention_decision").toLowerCase();

    if (!localPath || localPath.includes("<") || localPath.includes(">")) {
      findings.push(new Finding("E011", `${rowLabel} counted reference lacks concrete local_ref_path`));
    }
    if (/(^|\/)_cache(\/|$)/i.test(localPath)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference local_ref_path must point to promoted REFERENCE_DIR evidence, not _cache staging: ${localPath}`));
    }
    if (acceptance !== "accepted") {
      findings.push(new Finding("E011", `${rowLabel} counted_for_floor requires acceptance_status=accepted; found ${acceptance || "missing"}`));
    }
    if (!ACCEPTANCE_STATUS_VALUES.has(acceptance)) {
      findings.push(new Finding("E011", `${rowLabel} has invalid acceptance_status: ${acceptance || "missing"}`));
    }
    if (!COUNTED_FOR_FLOOR_VALUES.has(countedForFloor)) {
      findings.push(new Finding("E011", `${rowLabel} has invalid counted_for_floor: ${countedForFloor || "missing"}`));
    }
    if (!sourceType || sourceType.includes("<") || sourceType.includes(">")) {
      findings.push(new Finding("E011", `${rowLabel} counted reference lacks concrete source_type`));
    }
    if (!TIER_VALUES.has(tier)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference has invalid tier: ${tier || "missing"}`));
    }
    if (!validEvidenceRoleList(evidenceRole)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference has invalid evidence_role: ${evidenceRole || "missing"}`));
    }
    if (!TRUST_LEVEL_VALUES.has(trustLevel)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference has invalid trust_level: ${trustLevel || "missing"}`));
    }
    if (Object.keys(row).some((key) => cleanField(key).toLowerCase().replace(/[\s-]+/g, "_") === "topic_unique_status")
      && !TOPIC_UNIQUE_STATUS_VALUES.has(topicUniqueStatus)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference has invalid topic_unique_status: ${topicUniqueStatus || "missing"}`));
    }
    if (!SEED_BACKFILL_STATUS_VALUES.has(seedBackfillStatus)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference has invalid seed_backfill_status: ${seedBackfillStatus || "missing"}`));
    }
    if (webSubstance === "thin" || webSubstance === "none") {
      findings.push(new Finding("E012", `${rowLabel} cannot count with web_substance=${webSubstance}`));
    }
    if (!WEB_SUBSTANCE_VALUES.has(webSubstance)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid web_substance: ${webSubstance || "missing"}`));
    }
    if (!COMMERCIAL_INTENT_VALUES.has(commercialIntent)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid commercial_intent: ${commercialIntent || "missing"}`));
    }
    if (!MARKETING_RISK_VALUES.has(marketingRisk)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid marketing_risk: ${marketingRisk || "missing"}`));
    }
    if (contentRetention === "exclude_source") {
      findings.push(new Finding("E012", `${rowLabel} cannot count with content_retention_decision=exclude_source`));
    }
    if (!CONTENT_RETENTION_DECISION_VALUES.has(contentRetention)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid content_retention_decision: ${contentRetention || "missing"}`));
    }
    if (!CROSS_VERIFICATION_REQUIRED_VALUES.has(crossVerificationRequired)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid cross_verification_required: ${crossVerificationRequired || "missing"}`));
    }
    if (!CROSS_VERIFICATION_STATUS_VALUES.has(crossVerification)) {
      findings.push(new Finding("E012", `${rowLabel} counted reference has invalid cross_verification_status: ${crossVerification || "missing"}`));
    }
    if (crossVerificationRequired === "no" && crossVerification !== "not_required" && crossVerification !== "verified") {
      findings.push(new Finding("E012", `${rowLabel} cross_verification_required=no should use cross_verification_status=not_required or verified; found ${crossVerification || "missing"}`));
    }
    if ((marketingRisk === "high" || commercialIntent === "strong") && crossVerificationRequired === "yes" && crossVerification !== "verified") {
      findings.push(new Finding("E012", `${rowLabel} high-marketing-risk or strong-commercial-intent counted reference with cross_verification_required=yes requires cross_verification_status=verified`));
    }
  });
  return findings;
}

function contextRunRoot(context = {}) {
  return context.files?.status ? dirname(context.files.status) : null;
}

function referencePathInfo(row, context = {}) {
  const runRoot = contextRunRoot(context);
  if (!runRoot) {
    return null;
  }
  const rawPath = cell(row, "local_ref_path");
  const resolved = resolveRunPath(runRoot, rawPath);
  if (!resolved) {
    return { rawPath, resolved: null, referenceRoot: join(seedTopicsRoot(runRoot), "_reference") };
  }
  return {
    rawPath,
    resolved,
    referenceRoot: join(seedTopicsRoot(runRoot), "_reference"),
  };
}

function topicReferencePrefix(row) {
  const topic = cell(row, "topic");
  if (!topic) {
    return "00-shared";
  }
  const topicId = cleanField(topic).split(/[\/\s]+/)[0];
  const numeric = topicId.match(/^0*(\d+)$/);
  if (numeric) {
    return numeric[1].padStart(2, "0");
  }
  return topicId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function referenceFilenameFindings(row, rowLabel, info) {
  const findings = [];
  const fileName = basename(info.resolved ?? info.rawPath ?? "").toLowerCase();
  if (!fileName.endsWith(".md")) {
    findings.push(new Finding("E011", `${rowLabel} counted reference filename must be a markdown file: ${info.rawPath}`));
    return findings;
  }
  if (/^ref-\d+/i.test(fileName)) {
    findings.push(new Finding("E011", `${rowLabel} counted reference filename must use a readable scope prefix such as 00-shared-* or <topic-id>-*, not global ref-NNN sequencing: ${fileName}`));
  }
  const expectedPrefix = topicReferencePrefix(row);
  const topicUniqueStatus = cell(row, "topic_unique_status").toLowerCase();
  const allowedShared = topicUniqueStatus === "shared_foundation";
  if (expectedPrefix === "00-shared") {
    if (!fileName.startsWith("00-shared-")) {
      findings.push(new Finding("E011", `${rowLabel} Wave 0/shared reference filename must start with 00-shared-: ${fileName}`));
    }
  } else if (!fileName.startsWith(`${expectedPrefix}-`) && !(allowedShared && fileName.startsWith("00-shared-"))) {
    findings.push(new Finding("E011", `${rowLabel} topic reference filename must start with ${expectedPrefix}- so provenance is visible: ${fileName}`));
  }
  return findings;
}

function markdownSectionBody(text, sectionName) {
  const section = hierarchicalSectionText(text, sectionName);
  return cleanField(section.replace(/^#{2,6}\s+.+$/gm, ""));
}

function hardContentSignals(text) {
  const body = cleanField(text);
  const signals = [
    /\b\d{4}\b/,
    /\b\d+(?:\.\d+)?\s*(?:%|x|ms|s|sec|seconds|minutes|hours|days|weeks|months|years|k|m|b|usd|\$)\b/i,
    /\b(method|methodology|sample|dataset|benchmark|standard|regulation|filing|clause|version|threshold|definition|mechanism|constraint|limitation|risk|counterexample|failure|dispute)\b/i,
    /[.;:，。；：].{20,}/,
  ];
  return signals.filter((pattern) => pattern.test(body)).length;
}

function referenceBodyQualityFindings(row, rowLabel, context = {}) {
  const info = referencePathInfo(row, context);
  if (!info) {
    return [];
  }
  const findings = [];
  if (!info.resolved || !exists(info.resolved)) {
    findings.push(new Finding("E011", `${rowLabel} counted reference local_ref_path does not resolve to an existing local reference file: ${info.rawPath || "missing"}`));
    return findings;
  }
  if (!isFile(info.resolved)) {
    findings.push(new Finding("E011", `${rowLabel} counted reference local_ref_path is not a file: ${info.rawPath}`));
    return findings;
  }
  const referenceRoot = resolve(info.referenceRoot);
  const resolvedPath = resolve(info.resolved);
  if (!pathIsInside(referenceRoot, resolvedPath)) {
    findings.push(new Finding("E011", `${rowLabel} counted reference local_ref_path must resolve under REFERENCE_DIR: ${info.rawPath}`));
    return findings;
  }
  findings.push(...referenceFilenameFindings(row, rowLabel, info));

  const text = readText(info.resolved);
  const requiredSections = [
    "Key Facts",
    "Core Content Capture",
    "Relevance To This Research",
    "Risks And Limitations",
  ];
  for (const section of requiredSections) {
    if (!hierarchicalSectionText(text, section)) {
      findings.push(new Finding("E011", `${rowLabel} counted reference file missing required section: ${section} (${info.rawPath})`));
    }
  }

  const core = markdownSectionBody(text, "Core Content Capture");
  if (core.length < 160) {
    findings.push(new Finding("E011", `${rowLabel} Core Content Capture is too thin for a counted Authoritative Copy (${core.length} chars): ${info.rawPath}`));
  }
  if (/\b(summary only|thin summary|placeholder|todo|tbd|not captured|see url|see source)\b/i.test(core)) {
    findings.push(new Finding("E011", `${rowLabel} Core Content Capture appears summary-only or placeholder-backed: ${info.rawPath}`));
  }
  if (hardContentSignals(core) < 2) {
    findings.push(new Finding("E011", `${rowLabel} Core Content Capture lacks enough hard-content signals such as dates, numbers, methods, mechanisms, constraints, or limitations: ${info.rawPath}`));
  }

  const supportsClaims = cell(row, "supports_claims");
  if (!supportsClaims || supportsClaims.includes("<") || /^none$|^n\/a$|^not_applicable$/i.test(supportsClaims)) {
    findings.push(new Finding("E011", `${rowLabel} counted reference must name concrete supports_claims before it can count`));
  }
  return findings;
}

function sectionTable(text, sectionName) {
  return firstMarkdownTable(hierarchicalSectionText(text, sectionName));
}

function sectionTables(text, sectionName) {
  return markdownTables(hierarchicalSectionText(text, sectionName));
}

function profileRootMustAnswerRows(profile) {
  const table = firstMarkdownTable(hierarchicalSectionText(profile ?? "", "Root Must-Answer Set"));
  return table.rows.map((row) => ({
    id: cell(row, "id"),
    initialAnswerPhase: cell(row, "initial_answer_phase").toLowerCase(),
    intakeStatus: cell(row, "intake_status").toLowerCase(),
  })).filter((row) => row.id);
}

function fmaIdsFromValue(value) {
  return [...String(value ?? "").matchAll(/\bFMA-\d+\b/gi)].map((match) => match[0].toUpperCase());
}

function profileFmaCoverageFindings(texts) {
  const findings = [];
  if (!texts.profile) {
    return findings;
  }
  const profileRows = profileRootMustAnswerRows(texts.profile);
  const knownFmaIds = new Set(profileRows.flatMap((row) => fmaIdsFromValue(row.id)));
  const requiredWave2FmaIds = new Set(profileRows
    .filter((row) => row.intakeStatus === "ready" && row.initialAnswerPhase === "wave2_synthesis")
    .flatMap((row) => fmaIdsFromValue(row.id)));

  const matrixRows = auditRows(texts.status, "Cross-Topic Conclusion Matrix");
  const matrixFmaIds = new Set(matrixRows.flatMap((row) => fmaIdsFromValue(cell(row, "must_answer_ids"))));
  for (const fmaId of requiredWave2FmaIds) {
    if (!matrixFmaIds.has(fmaId)) {
      findings.push(new Finding("E007", `Wave 2 pass requires Cross-Topic Conclusion Matrix.must_answer_ids to cover PROFILE synthesis FMA id ${fmaId}`));
    }
  }
  for (const fmaId of matrixFmaIds) {
    if (!knownFmaIds.has(fmaId)) {
      findings.push(new Finding("E007", `Cross-Topic Conclusion Matrix references unknown PROFILE FMA id: ${fmaId}`));
    }
  }
  return findings;
}

export function inventoryFindings(texts) {
  const findings = [];
  const status = texts.status;
  const wave0 = sectionTable(status, "Wave 0 Accepted Shared Reference Inventory");
  const wave0Missing = requiredColumnsMissing(wave0.headers, WAVE0_INVENTORY_COLUMNS);
  if (wave0Missing.length > 0) {
    findings.push(new Finding("E011", `Wave 0 inventory missing columns: ${wave0Missing.join(", ")}`));
  }

  const accepted = sectionTable(status, "Accepted Reference Inventory");
  const acceptedMissing = requiredColumnsMissing(accepted.headers, WAVE1_INVENTORY_COLUMNS);
  if (acceptedMissing.length > 0) {
    findings.push(new Finding("E011", `Wave 1 accepted inventory missing columns: ${acceptedMissing.join(", ")}`));
  }

  const webpageColumns = [
    "web_substance",
    "commercial_intent",
    "marketing_risk",
    "cross_verification_required",
    "cross_verification_status",
    "content_retention_decision",
  ];
  const allHeaders = new Set([...wave0.headers, ...accepted.headers].map((h) => h.trim()));
  for (const column of webpageColumns) {
    if (!allHeaders.has(column)) {
      findings.push(new Finding("E012", `webpage diagnostic column missing from inventory sections: ${column}`));
    }
  }
  findings.push(...inventoryRowQualityFindings(wave0, "Wave 0 inventory"));
  findings.push(...inventoryRowQualityFindings(accepted, "Wave 1 accepted inventory"));
  return findings;
}

export function countedReferenceBodyFindings(texts, context = {}) {
  const findings = [];
  const status = texts.status;
  for (const [table, label] of [
    [sectionTable(status, "Wave 0 Accepted Shared Reference Inventory"), "Wave 0 inventory"],
    [sectionTable(status, "Accepted Reference Inventory"), "Wave 1 accepted inventory"],
  ]) {
    table.rows.forEach((row, idx) => {
      if (isCountedInventoryRow(row)) {
        findings.push(...referenceBodyQualityFindings(row, `${label} row ${idx + 1}`, context));
      }
    });
  }
  return findings;
}

export function synthesisFindings(texts) {
  const findings = [];
  const matrix = sectionTable(texts.status, "Cross-Topic Conclusion Matrix");
  const missing = requiredColumnsMissing(matrix.headers, SYNTHESIS_MATRIX_COLUMNS);
  if (missing.length > 0) {
    findings.push(new Finding("E007", `Cross-Topic Conclusion Matrix missing columns: ${missing.join(", ")}`));
  }
  return findings;
}

function localReferenceCitations(text) {
  const matches = [...String(text ?? "").matchAll(/(?:^|[\s`([])(?:REFERENCE_DIR\/|(?:[^`\s)]+\/)?seed_topics\/_reference\/)[^`\s)]+\.md\b/gm)]
    .map((match) => cleanField(match[0]));
  return [...new Set(matches)];
}

function backingReferenceFindings(row, rowLabel, context = {}) {
  const runRoot = contextRunRoot(context);
  if (!runRoot) {
    return [];
  }
  const findings = [];
  const referenceRoot = resolve(join(seedTopicsRoot(runRoot), "_reference"));
  for (const rawPath of splitPathList(cell(row, "backing_refs"))) {
    const resolved = resolveRunPath(runRoot, rawPath);
    if (!resolved || !exists(resolved)) {
      findings.push(new Finding("E007", `${rowLabel} backing_ref does not resolve to an existing local reference file: ${rawPath || "missing"}`));
      continue;
    }
    if (!isFile(resolved)) {
      findings.push(new Finding("E007", `${rowLabel} backing_ref is not a file: ${rawPath}`));
      continue;
    }
    if (!pathIsInside(referenceRoot, resolve(resolved))) {
      findings.push(new Finding("E007", `${rowLabel} backing_ref must resolve under REFERENCE_DIR: ${rawPath}`));
    }
  }
  return findings;
}

export function synthesisBackingReferenceFindings(texts, context = {}) {
  const findings = [];
  const matrixRows = auditRows(texts.status, "Cross-Topic Conclusion Matrix");
  matrixRows.forEach((row, idx) => {
    findings.push(...backingReferenceFindings(row, `Cross-Topic Conclusion Matrix row ${idx + 1}`, context));
  });
  return findings;
}

function resolveWave2ArtifactPath(status, context = {}) {
  const runRoot = contextRunRoot(context);
  const rawPath = parseBulletField(hierarchicalSectionText(status, "Wave 2"), "synthesis_artifact_path");
  if (!runRoot) {
    return { rawPath, resolved: null, expected: null };
  }
  const expected = resolve(join(seedTopicsRoot(runRoot), "_artifacts", "wave2", "cross-topic-synthesis.md"));
  const resolvedPath = resolveRunPath(runRoot, rawPath);
  return { rawPath, resolved: resolvedPath ? resolve(resolvedPath) : null, expected };
}

export function synthesisArtifactFindings(texts, context = {}) {
  const findings = [];
  const status = texts.status;
  if (!yesPassSection(status, "Wave 2 Synthesis Gate Audit", "readiness_entry_allowed")) {
    return findings;
  }

  const matrixRows = auditRows(status, "Cross-Topic Conclusion Matrix");
  const wave2 = hierarchicalSectionText(status, "Wave 2");
  const highLeverageCount = firstNumber(parseBulletField(wave2, "high_leverage_judgments_identified"));
  if (highLeverageCount !== null && matrixRows.length < highLeverageCount) {
    findings.push(new Finding("E007", `Wave 2 pass requires Cross-Topic Conclusion Matrix rows to cover identified high-leverage judgments: matrix=${matrixRows.length}, identified=${highLeverageCount}`));
  }

  const artifact = resolveWave2ArtifactPath(status, context);
  const rawPath = cleanField(artifact.rawPath);
  if (!rawPath || rawPath.includes("<") || rawPath === "not_started") {
    findings.push(new Finding("E007", "Wave 2 pass requires concrete synthesis_artifact_path"));
    return findings;
  }
  if (!artifact.resolved) {
    findings.push(new Finding("E007", `Wave 2 synthesis_artifact_path does not resolve: ${rawPath}`));
    return findings;
  }
  if (artifact.expected && artifact.resolved !== artifact.expected) {
    findings.push(new Finding("E007", `Wave 2 synthesis artifact must be ARTIFACT_DIR/wave2/cross-topic-synthesis.md: ${rawPath}`));
  }
  if (!exists(artifact.resolved) || !isFile(artifact.resolved)) {
    findings.push(new Finding("E007", `Wave 2 synthesis artifact file does not exist: ${rawPath}`));
    return findings;
  }

  const text = readText(artifact.resolved);
  const stripped = cleanField(text.replace(/```[\s\S]*?```/g, ""));
  if (stripped.length < 1500) {
    findings.push(new Finding("E007", `Wave 2 synthesis artifact is too thin to justify wave2_complete (${stripped.length} chars): ${rawPath}`));
  }
  if (/\b(todo|tbd|placeholder|not_started|copy this skeleton)\b/i.test(stripped)) {
    findings.push(new Finding("E007", `Wave 2 synthesis artifact contains placeholder or not-started residue: ${rawPath}`));
  }
  for (const heading of ["High-Leverage Judgments", "Cross-Topic Conclusion Matrix"]) {
    if (!new RegExp(`^#{2,4}\\s+.*${heading}`, "im").test(text)) {
      findings.push(new Finding("E007", `Wave 2 synthesis artifact missing expected section: ${heading}`));
    }
  }
  if (!/^#{2,4}\s+.*(?:Conflict|Contradiction|Tension)/im.test(text)) {
    findings.push(new Finding("E007", "Wave 2 synthesis artifact must include conflict/tension reconciliation, not only positive conclusions"));
  }

  const localRefs = localReferenceCitations(text);
  const minimumLocalRefs = Math.min(3, Math.max(1, matrixRows.length));
  if (localRefs.length < minimumLocalRefs) {
    findings.push(new Finding("E007", `Wave 2 synthesis artifact must cite local reference paths, not only short ref ids: found ${localRefs.length}, required >= ${minimumLocalRefs}`));
  }
  return findings;
}

function instanceConfigNumber(plan, field) {
  const raw = instanceConfigValue(plan, field);
  const match = cleanField(raw).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function firstNumber(value) {
  const match = cleanField(value).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function yesPassSection(status, sectionName, entryField) {
  const section = hierarchicalSectionText(status, sectionName);
  return /-\s*overall_result:\s*`?pass`?/i.test(section)
    || (entryField && new RegExp(`-\\s*${entryField}:\\s*\`?yes\`?`, "i").test(section));
}

function inventoryRows(status, sectionName) {
  return sectionTable(status, sectionName).rows;
}

function countedAcceptedRows(rows) {
  return rows.filter((row) => isCountedInventoryRow(row) && cell(row, "acceptance_status").toLowerCase() === "accepted");
}

function normalizedTopicKey(value) {
  return cleanField(value).toLowerCase().replace(/^`+|`+$/g, "").trim();
}

function topicKeyFromRow(row) {
  return normalizedTopicKey(cell(row, "topic"));
}

function rowHasStopException(row) {
  const stopException = cell(row, "stop_exception").toLowerCase();
  if (stopException && !["none", "not_applicable", "n/a"].includes(stopException)) {
    return true;
  }
  return /\b(scarcity|unavailable_after_search|early_saturation|suspend|archive|redirect)\b/i.test(Object.values(row).map(cleanField).join(" "));
}

function fieldHasScarcity(value) {
  const cleaned = cleanField(value).toLowerCase();
  return !["", "none", "not_applicable", "n/a", "no", "yes", "exception", "scarcity"].includes(cleaned)
    && /\b(scarcity|unavailable_after_search|unavailable-after-search|exception|limited|no independent|not found)\b/i.test(cleaned)
    && cleaned.length >= 16;
}

function auditRows(status, sectionName) {
  return sectionTable(status, sectionName).rows;
}

function wave2GlobalAuditRows(status) {
  return sectionTables(status, "Wave 2 Synthesis Gate Audit")[0]?.rows ?? [];
}

function wave2TopicAuditRows(status) {
  return sectionTables(status, "Wave 2 Synthesis Gate Audit")
    .find((table) => table.headers.some((header) => cleanField(header).toLowerCase().replace(/[\s-]+/g, "_") === "topic")
      && table.headers.some((header) => cleanField(header).toLowerCase().replace(/[\s-]+/g, "_") === "synthesis_must_answer_status"))
    ?.rows ?? [];
}

function sectionRows(status, sectionName) {
  return sectionTable(status, sectionName).rows;
}

function concreteCellValue(row, names) {
  return names.some((name) => {
    const value = cell(row, name);
    return value && !value.includes("<") && !/^none$|^not_applicable$|^n\/a$|^no$|^not_started$|^not_assessed$|^unknown$/i.test(value);
  });
}

function concreteAuditCell(row, name) {
  return concreteCellValue(row, [name]);
}

function hasStructuredUnavailableRecord(status, itemPattern) {
  return sectionRows(status, "Unavailable-After-Search Records").some((row) => {
    const item = `${cell(row, "item")} ${cell(row, "gate_item")}`;
    return itemPattern.test(item)
      && concreteCellValue(row, ["attempted_search_route"])
      && concreteCellValue(row, ["attempted_queries_or_sources", "attempted_queries", "source_routes"])
      && concreteCellValue(row, ["excluded_inventory_refs", "excluded_refs", "excluded_source_notes"])
      && concreteCellValue(row, ["queue_consequence"]);
  });
}

function hasStructuredWave1ExceptionRecord(status, topic) {
  const normalizedTopic = normalizedTopicKey(topic);
  return sectionRows(status, "Scarcity / Stop Exception Records").some((row) => {
    const rowTopic = normalizedTopicKey(cell(row, "topic"));
    return rowTopic === normalizedTopic
      && concreteCellValue(row, ["exception_type", "stop_exception"])
      && concreteCellValue(row, ["reason"])
      && concreteCellValue(row, ["attempted_routes", "attempted_search_route", "attempted_queries_or_sources"])
      && concreteCellValue(row, ["unresolved_questions"])
      && concreteCellValue(row, ["confidence_effect"])
      && concreteCellValue(row, ["queue_consequence"]);
  });
}

function countedRowsByTopic(status) {
  const counted = countedAcceptedRows(inventoryRows(status, "Accepted Reference Inventory"));
  const countedByTopic = new Map();
  for (const row of counted) {
    const topic = topicKeyFromRow(row);
    countedByTopic.set(topic, [...(countedByTopic.get(topic) ?? []), row]);
  }
  return countedByTopic;
}

function countPrimaryRows(rows) {
  return rows.filter((row) => {
    const sourceType = cell(row, "source_type").toLowerCase();
    return /\b(primary|official|filing|standard|regulation|dataset|primary_dataset)\b/.test(sourceType)
      || ["official"].includes(cell(row, "trust_level").toLowerCase())
      || cell(row, "tier").toLowerCase() === "tier_1";
  }).length;
}

function countSecondaryRows(rows) {
  return rows.filter((row) => {
    const sourceType = cell(row, "source_type").toLowerCase();
    return /\b(secondary|analyst|media|review|report|research|industry)\b/.test(sourceType)
      || cell(row, "tier").toLowerCase() === "tier_2";
  }).length;
}

function countRecentRows(rows) {
  return rows.filter((row) => /\b(20\d{2}|recent|current|latest)\b/i.test(cell(row, "source_date_scope"))).length;
}

function countLimitationRows(rows) {
  return rows.filter((row) => /^yes$/i.test(cell(row, "supports_limitation"))
    || /\b(limitation|difficulty|risk|failure|dispute)\b/i.test(cell(row, "evidence_role"))).length;
}

function auditFloorNumber(row, field) {
  return firstNumber(cell(row, field));
}

export function wave0GatePassFindings(texts) {
  const findings = [];
  const status = texts.status;
  const plan = texts.plan;
  const wave0Floor = instanceConfigNumber(plan, "wave0_shared_doc_floor");

  if (yesPassSection(status, "Wave 0 Foundation Gate Audit", "wave1_entry_allowed")) {
    findings.push(...wave0SeedIntakeGateFindings(texts));
    const counted = countedAcceptedRows(inventoryRows(status, "Wave 0 Accepted Shared Reference Inventory"));
    if (wave0Floor !== null && counted.length < wave0Floor) {
      findings.push(new Finding("E007", `Wave 0 pass requires at least ${wave0Floor} counted accepted shared references; found ${counted.length}`));
    }
    const highTrust = counted.filter((row) => ["official", "academic"].includes(cell(row, "trust_level").toLowerCase()));
    if (wave0Floor !== null) {
      const requiredHighTrust = Math.floor(wave0Floor / 2) + 1;
      if (highTrust.length < requiredHighTrust) {
        findings.push(new Finding("E007", `Wave 0 pass requires high-trust shared reference majority >= ${requiredHighTrust}; found ${highTrust.length}`));
      }
    }
    const hasConstraint = counted.some((row) => /^yes$/i.test(cell(row, "supports_constraints_or_risks"))
      || /\b(limitation|risk)\b/i.test(cell(row, "evidence_role")));
    if (!hasConstraint) {
      findings.push(new Finding("E007", "Wave 0 pass requires at least one counted constraint, limitation, or risk reference"));
    }
    const hasComparison = counted.some((row) => /^yes$/i.test(cell(row, "supports_comparison_practice_failure"))
      || /\b(comparison)\b/i.test(cell(row, "evidence_role")));
    if (!hasComparison && !hasStructuredUnavailableRecord(status, /comparison|practice|failure/i)) {
      findings.push(new Finding("E007", "Wave 0 pass requires comparison/practice/failure evidence or an unavailable-after-search record"));
    }
  }
  return findings;
}

export function wave1GatePassFindings(texts) {
  const findings = [];
  const status = texts.status;
  const plan = texts.plan;
  const wave1Floor = instanceConfigNumber(plan, "wave1_doc_floor_per_topic");

  if (yesPassSection(status, "Wave 1 Source Floor Audit", "wave2_entry_allowed")) {
    findings.push(...wave1IntakeGapFindings(texts));
    const countedByTopic = countedRowsByTopic(status);
    for (const row of auditRows(status, "Wave 1 Source Floor Audit")) {
      const topic = topicKeyFromRow(row);
      if (!topic) {
        continue;
      }
      const result = cell(row, "result").toLowerCase();
      const hasStopException = rowHasStopException(row);
      const hasStructuredException = hasStructuredWave1ExceptionRecord(status, topic);
      if (result && result !== "pass" && !hasStopException) {
        findings.push(new Finding("E007", `Wave 1 pass cannot include non-pass topic row without stop exception: ${topic} result=${result}`));
      }
      if (hasStopException && !hasStructuredException) {
        findings.push(new Finding("E007", `Wave 1 topic ${topic} stop/scarcity exception requires a structured Scarcity / Stop Exception Records row`));
      }
      const topicRows = countedByTopic.get(topic) ?? [];
      const auditCount = firstNumber(cell(row, "accepted_topic_refs"));
      const hasAcceptedTopicEvidence = topicRows.length > 0 || (auditCount !== null && auditCount > 0);
      if (auditCount !== null && topicRows.length !== auditCount) {
        findings.push(new Finding("E007", `Wave 1 topic ${topic} audit count does not match counted accepted inventory rows: audit=${auditCount}, inventory=${topicRows.length}`));
      }
      if (hasAcceptedTopicEvidence || result === "pass") {
        for (const field of [
          "must_answer_set_status",
          "wave1_topic_answers",
          "wave2_synthesis_pending",
          "question_reconciliation",
          "emergent_question_protocol",
          "exploration_decision",
        ]) {
          if (!concreteAuditCell(row, field)) {
            findings.push(new Finding("E007", `Wave 1 topic ${topic} cannot pass with ${field} unset after topic evidence lands`));
          }
        }
      }
      if (!hasStopException && wave1Floor !== null && topicRows.length < wave1Floor) {
        findings.push(new Finding("E007", `Wave 1 pass for ${topic} requires at least ${wave1Floor} counted accepted topic references; found ${topicRows.length}`));
      }
      const topicUnique = topicRows.filter((refRow) => ["topic_unique", "both"].includes(cell(refRow, "topic_unique_status").toLowerCase())).length;
      const requiredUnique = wave1Floor === null ? null : Math.ceil(wave1Floor / 2);
      if (!hasStopException && requiredUnique !== null && topicUnique < requiredUnique) {
        findings.push(new Finding("E007", `Wave 1 pass for ${topic} requires topic-unique references >= ${requiredUnique} or a scarcity exception; found ${topicUnique}`));
      }
      if (hasStopException && requiredUnique !== null && topicUnique < requiredUnique && !hasStructuredException) {
        findings.push(new Finding("E007", `Wave 1 pass for ${topic} uses a topic-unique scarcity exception but lacks structured exception evidence`));
      }
      const sourceCounts = [
        ["primary", countPrimaryRows(topicRows)],
        ["secondary", countSecondaryRows(topicRows)],
        ["recent", countRecentRows(topicRows)],
        ["limitation", countLimitationRows(topicRows)],
      ];
      for (const [field, inventoryCount] of sourceCounts) {
        const auditCount = auditFloorNumber(row, field);
        if (auditCount !== null && auditCount !== inventoryCount) {
          findings.push(new Finding("E007", `Wave 1 topic ${topic} ${field} audit count does not match counted accepted inventory rows: audit=${auditCount}, inventory=${inventoryCount}`));
        }
      }
    }
  }
  return findings;
}

export function wave2GatePassFindings(texts) {
  const findings = [];
  const status = texts.status;

  if (yesPassSection(status, "Wave 2 Synthesis Gate Audit", "readiness_entry_allowed")) {
    const globalRows = wave2GlobalAuditRows(status);
    const synthesisMustAnswerRow = globalRows.find((row) => cell(row, "item").toLowerCase() === "synthesis_phase_must_answers");
    if (!synthesisMustAnswerRow) {
      findings.push(new Finding("E007", "Wave 2 pass requires synthesis_phase_must_answers global audit row"));
    } else if (cell(synthesisMustAnswerRow, "result").toLowerCase() !== "pass") {
      findings.push(new Finding("E007", `Wave 2 pass requires synthesis_phase_must_answers.result=pass; found ${cell(synthesisMustAnswerRow, "result") || "missing"}`));
    }
    const synthesisRequired = synthesisMustAnswerRow
      && !/\b(0\s*\/\s*0|none_required|not_applicable|no[-_ ]synthesis[-_ ]required)\b/i.test(`${cell(synthesisMustAnswerRow, "actual")} ${cell(synthesisMustAnswerRow, "gap")}`);
    for (const [idx, row] of wave2TopicAuditRows(status).entries()) {
      const topic = topicKeyFromRow(row) || `row ${idx + 1}`;
      if (!concreteAuditCell(row, "synthesis_must_answer_status")) {
        findings.push(new Finding("E007", `Wave 2 topic ${topic} cannot pass with synthesis_must_answer_status unset`));
      }
      const result = cell(row, "result").toLowerCase();
      if (result && result !== "pass" && !rowHasStopException(row)) {
        findings.push(new Finding("E007", `Wave 2 pass cannot include non-pass topic synthesis row without stop exception: ${topic} result=${result}`));
      }
    }
    const matrixRows = auditRows(status, "Cross-Topic Conclusion Matrix");
    if (matrixRows.length === 0) {
      findings.push(new Finding("E007", "Wave 2 pass requires concrete Cross-Topic Conclusion Matrix rows"));
    }
    let matrixRowsWithMustAnswerIds = 0;
    for (const [idx, row] of matrixRows.entries()) {
      const rowLabel = `Cross-Topic Conclusion Matrix row ${idx + 1}`;
      const mustAnswerIds = cell(row, "must_answer_ids");
      if (!mustAnswerIds || mustAnswerIds.includes("<")) {
        findings.push(new Finding("E007", `${rowLabel} lacks concrete must_answer_ids`));
      } else if (!/^not_applicable$|^n\/a$/i.test(mustAnswerIds)) {
        matrixRowsWithMustAnswerIds += 1;
      }
      const backingRefs = splitPathList(cell(row, "backing_refs"));
      if (backingRefs.length === 0) {
        findings.push(new Finding("E007", `${rowLabel} lacks concrete backing_refs`));
      }
      const severity = cell(row, "severity").toUpperCase();
      const independentRefCount = firstNumber(cell(row, "independent_ref_count")) ?? backingRefs.length;
      const scarcityException = cell(row, "scarcity_exception");
      const confidence = cell(row, "confidence").toLowerCase();
      if ((severity === "P0" || severity === "P1")
        && independentRefCount < 2
        && !fieldHasScarcity(scarcityException)) {
        findings.push(new Finding("E007", `${rowLabel} ${severity} judgment requires independent_ref_count >= 2 or a scarcity exception`));
      }
      if ((severity === "P0" || severity === "P1")
        && independentRefCount < 2
        && fieldHasScarcity(scarcityException)
        && confidence !== "low") {
        findings.push(new Finding("E007", `${rowLabel} ${severity} scarcity exception requires confidence=low`));
      }
    }
    if (synthesisRequired && matrixRowsWithMustAnswerIds === 0) {
      findings.push(new Finding("E007", "Wave 2 pass requires at least one Cross-Topic Conclusion Matrix row with must_answer_ids covering synthesis-phase entries"));
    }
    findings.push(...profileFmaCoverageFindings(texts));
  }
  return findings;
}

export function gatePassFindings(texts) {
  return [
    ...wave0GatePassFindings(texts),
    ...wave1GatePassFindings(texts),
    ...wave2GatePassFindings(texts),
  ];
}
