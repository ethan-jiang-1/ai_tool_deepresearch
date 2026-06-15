import { dirname, isAbsolute, join, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { exists, isDirectory, isFile, readText } from "../lib/fs.mjs";
import { resolveRunPath } from "../lib/bundle.mjs";
import { hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import {
  ACTIVE_QUEUE_TASK_SLOTS,
  CLOSED_TASK_VALUES,
  QUEUE_PRODUCER_RULE_VALUES,
  RECEIPT_CHECK_PHASE_VALUES,
  TOPOLOGY_DELTA_DISPOSITION_VALUES,
} from "../contracts/constants.mjs";
import {
  activeQueueSection,
  cleanField,
  decisionWords,
  isMeaningful,
  splitTopologyEntries,
  taskAction,
  taskSection,
} from "./runtime-shared.mjs";
import { traceContinuityFindings } from "./runtime-readiness.mjs";

const ACTIVE_REQUIRED_FIELDS = [
  "work_id",
  "action",
  "producer_rule",
  "why_this_matters",
  "impact_scope",
  "required_receipts",
  "done_condition",
  "verification",
  "writes_to",
  "status_sync",
  "completion_receipt",
  "failure_route",
];

const CANDIDATE_REQUIRED_FIELDS = [
  "work_id",
  "candidate",
  "priority_class",
  "producer_rule",
  "why_this_matters",
  "impact_scope",
  "required_receipts",
  "prerequisite",
  "promotion_trigger",
  "done_condition",
  "verification",
  "writes_to",
  "status_sync",
  "completion_receipt",
  "failure_route",
  "preempted_from_slot",
  "restore_priority",
];

const LINEAGE_FIELDS = [
  "source_gap",
  "status_gap",
  "gate_gap",
  "plan_target",
  "trigger",
];

function concreteField(section, field) {
  const value = parseBulletField(section, field);
  const cleaned = cleanField(value);
  if ((field === "required_receipts" || field === "preempted_from_slot") && /^not[_ ]applicable$/i.test(cleaned)) {
    return true;
  }
  return isMeaningful(cleaned) && !cleaned.includes("<") && !cleaned.includes(">");
}

function contractFieldFindings(label, section, requiredFields) {
  const findings = [];
  for (const field of requiredFields) {
    if (!concreteField(section, field)) {
      findings.push(new Finding("E022", `${label} missing concrete Queue Work Unit Contract field: ${field}`));
    }
  }
  if (!LINEAGE_FIELDS.some((field) => concreteField(section, field))) {
    findings.push(new Finding("E022", `${label} must include one lineage field: source_gap / status_gap / gate_gap / plan_target / trigger`));
  }
  const producerRule = cleanField(parseBulletField(section, "producer_rule"));
  if (producerRule && !QUEUE_PRODUCER_RULE_VALUES.has(producerRule)) {
    findings.push(new Finding("E022", `${label} has invalid producer_rule: ${producerRule}`));
  }
  return findings;
}

function activeSlotContractFindings(queue) {
  const findings = [];
  if (cleanField(parseBulletField(queue, "queue_health")) === "closed") {
    return findings;
  }
  for (const slot of ACTIVE_QUEUE_TASK_SLOTS) {
    const section = taskSection(queue, slot);
    if (!section) {
      findings.push(new Finding("E022", `QUEUE missing active slot section for receipt check: ${slot}`));
      continue;
    }
    if (CLOSED_TASK_VALUES.has(cleanField(taskAction(queue, slot)).toLowerCase())) {
      continue;
    }
    findings.push(...contractFieldFindings(slot, section, ACTIVE_REQUIRED_FIELDS));
  }
  return findings;
}

function refillCandidateBlocks(queue) {
  const refill = hierarchicalSectionText(queue, "Refill Pool");
  const matches = [...refill.matchAll(/^###\s+Candidate Block\s*$/gm)];
  return matches.map((match, idx) => {
    const start = match.index + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : refill.length;
    return refill.slice(start, end);
  }).filter((block) => block.trim().length > 0);
}

function refillCandidateContractFindings(queue) {
  const findings = [];
  const blocks = refillCandidateBlocks(queue);
  blocks.forEach((block, idx) => {
    findings.push(...contractFieldFindings(`Refill Pool Candidate Block #${idx + 1}`, block, CANDIDATE_REQUIRED_FIELDS));
  });
  return findings;
}

function runRootFor(files) {
  return dirname(files.queue ?? files.status ?? files.plan);
}

function replaceRuntimePathTokens(pathValue, files, runRoot) {
  const replacements = {
    RUN_DIR: runRoot,
    PROFILE_PATH: files.profile,
    PLAN_PATH: files.plan,
    STATUS_PATH: files.status,
    QUEUE_PATH: files.queue,
    TRACE_PATH: files.trace,
    TOPIC_ROOT: join(runRoot, "seed_topics"),
    REFERENCE_DIR: join(runRoot, "seed_topics", "_reference"),
    ARTIFACT_DIR: join(runRoot, "seed_topics", "_artifacts"),
  };
  return Object.entries(replacements).reduce((value, [key, replacement]) => {
    return value.replaceAll(`<${key}>`, replacement ?? `<${key}>`);
  }, pathValue);
}

function resolveReceiptPath(rawPath, files, runRoot) {
  const cleaned = replaceRuntimePathTokens(cleanField(rawPath), files, runRoot);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  return isAbsolute(cleaned) ? resolve(cleaned) : resolveRunPath(runRoot, cleaned);
}

function numericFieldValue(text, field) {
  const exact = fieldValue(text, field);
  const match = cleanField(exact).match(/-?\d+/);
  if (match) {
    return Number.parseInt(match[0], 10);
  }
  return null;
}

function fieldNameCandidates(field) {
  const cleaned = cleanField(field);
  const candidates = [cleaned];
  if (cleaned.includes(".")) {
    candidates.push(cleaned.split(".").pop());
  }
  return [...new Set(candidates.filter(Boolean))];
}

function fieldValue(text, field) {
  for (const candidate of fieldNameCandidates(field)) {
    const value = parseBulletField(text, candidate);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function expectedValueAlternatives(expected) {
  const cleaned = cleanField(expected);
  if (cleaned === "*") {
    return ["*"];
  }
  return cleaned.split("_or_").map((part) => cleanField(part)).filter(Boolean);
}

function textHasFieldValue(text, field, expected) {
  const value = cleanField(fieldValue(text, field));
  if (value) {
    const alternatives = expectedValueAlternatives(expected);
    return alternatives.includes("*") ? isMeaningful(value) : alternatives.includes(value);
  }
  return false;
}

function compareStatusOrQueue(text, expr) {
  const cleaned = cleanField(expr);
  const comparison = cleaned.match(/^(.+?)\s*(>=|>|=)\s*(.+)$/);
  if (!comparison) {
    return new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text);
  }
  const [, rawField, op, rawExpected] = comparison;
  const field = cleanField(rawField);
  const expected = cleanField(rawExpected);
  if (op === "=") {
    return textHasFieldValue(text, field, expected);
  }
  const left = numericFieldValue(text, field);
  const right = Number.parseInt(expected, 10);
  if (left === null || Number.isNaN(right)) {
    return false;
  }
  return op === ">=" ? left >= right : left > right;
}

function topicKeyParts(rawValue) {
  const cleaned = cleanField(rawValue);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">") || cleaned.includes("{") || cleaned.includes("}")) {
    return null;
  }
  const [id, slug = ""] = cleaned.split("/");
  return { id: cleanField(id), slug: cleanField(slug), label: cleaned };
}

function topicBlockForReceipt(status, rawValue) {
  const key = topicKeyParts(rawValue);
  if (!key?.id && !key?.slug) {
    return null;
  }
  const idPattern = key.id ? new RegExp(`(^|[^A-Za-z0-9_-])${key.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_-]|$)`, "i") : null;
  const slugPattern = key.slug ? new RegExp(`(^|[^A-Za-z0-9_-])${key.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_-]|$)`, "i") : null;
  return topicBlocks(status).find((block) => {
    const { topicId, topicSlug } = topicIdAndSlug(block);
    return (key.id && cleanField(topicId) === key.id)
      || (key.slug && cleanField(topicSlug) === key.slug)
      || (idPattern?.test(block.label) && (!slugPattern || slugPattern.test(block.label)));
  }) ?? null;
}

function artifactSteeringCurrent(files, texts, rawValue) {
  const block = topicBlockForReceipt(texts.status ?? "", rawValue);
  if (!block) {
    return false;
  }
  const acceptedCount = firstNumber(parseBulletField(block.text, "accepted_topic_ref_count")) ?? 0;
  const uniqueCount = firstNumber(parseBulletField(block.text, "topic_unique_ref_count")) ?? 0;
  const expectedCount = acceptedCount > 0 ? acceptedCount : uniqueCount;
  if (expectedCount <= 0) {
    return false;
  }
  const evidenceCount = producedCount(parseBulletField(block.text, "evidence_summary"));
  const questionCount = producedCount(parseBulletField(block.text, "question_list"));
  return evidenceCount >= expectedCount
    && questionCount >= expectedCount
    && artifactPathExists(parseBulletField(block.text, "evidence_summary_path"), files)
    && artifactPathExists(parseBulletField(block.text, "question_list_path"), files);
}

function artifactRefreshNotDue(files, texts, rawValue) {
  const block = topicBlockForReceipt(texts.status ?? "", rawValue);
  if (!block) {
    return false;
  }
  const acceptedCount = firstNumber(parseBulletField(block.text, "accepted_topic_ref_count")) ?? 0;
  const uniqueCount = firstNumber(parseBulletField(block.text, "topic_unique_ref_count")) ?? 0;
  const expectedCount = acceptedCount > 0 ? acceptedCount : uniqueCount;
  if (expectedCount <= 0) {
    return false;
  }
  const evidenceCount = producedCount(parseBulletField(block.text, "evidence_summary"));
  const questionCount = producedCount(parseBulletField(block.text, "question_list"));
  if (evidenceCount <= 0 || questionCount <= 0) {
    return false;
  }
  if (!artifactPathExists(parseBulletField(block.text, "evidence_summary_path"), files)
    || !artifactPathExists(parseBulletField(block.text, "question_list_path"), files)) {
    return false;
  }
  return expectedCount - Math.min(evidenceCount, questionCount) < 2;
}

function queuedArtifactRepair(texts, rawValue) {
  const block = topicBlockForReceipt(texts.status ?? "", rawValue);
  if (!block) {
    return false;
  }
  const evidenceCount = producedCount(parseBulletField(block.text, "evidence_summary"));
  const questionCount = producedCount(parseBulletField(block.text, "question_list"));
  if (evidenceCount <= 0 || questionCount <= 0) {
    return queueHasArtifactWork(texts.queue ?? "", block, "produce", { scope: "first_two_active" });
  }
  return queueHasArtifactWork(texts.queue ?? "", block, "produce", { scope: "active" })
    || queueHasArtifactWork(texts.queue ?? "", block, "refresh", { scope: "all" });
}

function directReferenceException(queue) {
  const current = taskSection(queue, ACTIVE_QUEUE_TASK_SLOTS[0]);
  const text = `${taskAction(queue, ACTIVE_QUEUE_TASK_SLOTS[0]) ?? ""}\n${current}`;
  return /\b(already[- ]known|local|user[- ]provided)\b/i.test(text)
    && /\bno retrieval\b/i.test(text)
    && /\bno search\b/i.test(text)
    && /\bno fetch\b/i.test(text);
}

function activeWindowContractComplete(queue) {
  return activeSlotContractFindings(queue).length === 0;
}

function topologyDeltaDisposed(status) {
  const pendingCandidates = fieldValue(status, "pending_topic_candidates");
  const dispositions = fieldValue(status, "candidate_dispositions");
  const candidateEntries = splitTopologyEntries(pendingCandidates);
  const dispositionEntries = splitTopologyEntries(dispositions);
  if (candidateEntries.length === 0 || dispositionEntries.length === 0) {
    return false;
  }
  const finalDecisions = decisionWords(dispositions)
    .filter((decision) => TOPOLOGY_DELTA_DISPOSITION_VALUES.has(decision));
  return finalDecisions.length > 0
    && dispositionEntries.length === finalDecisions.length
    && candidateEntries.length === finalDecisions.length;
}

function statusFieldFromSections(status, field, sectionNames = []) {
  for (const sectionName of sectionNames) {
    const value = parseBulletField(hierarchicalSectionText(status, sectionName), field);
    if (value !== null) {
      return cleanField(value);
    }
  }
  return cleanField(fieldValue(status, field));
}

function queueActiveField(queue, field) {
  return cleanField(parseBulletField(activeQueueSection(queue), field));
}

function concreteRuntimeValue(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && !cleaned.includes("<") && !cleaned.includes(">");
}

function hitl2BriefExists(files, texts, runRoot) {
  const status = texts.status ?? "";
  const profile = texts.profile ?? "";
  const rawCandidates = [
    statusFieldFromSections(status, "brief_path", ["Wave 2 Human Decision Brief"]),
    statusFieldFromSections(status, "hitl2_decision_brief_path", ["Human Decision Checkpoints", "Wave 2", "Wave 2 Human Decision Brief"]),
    statusFieldFromSections(profile, "hitl2_decision_brief_path", ["HITL2 Wave 2 Readiness Decision"]),
    "seed_topics/_artifacts/wave2/human-decision-brief.md",
  ];
  return rawCandidates.some((rawPath) => {
    if (!concreteRuntimeValue(rawPath)) {
      return false;
    }
    const resolved = resolveReceiptPath(rawPath, files, runRoot);
    return Boolean(resolved && isFile(resolved));
  });
}

function hitl2PendingOrRecordedReady(files, texts, runRoot) {
  const status = texts.status ?? "";
  const queue = texts.queue ?? "";
  const statusSections = ["Human Decision Checkpoints", "Wave 2", "Wave 2 Human Decision Brief"];
  const decisionStatus = statusFieldFromSections(status, "hitl2_wave2_readiness_decision_status", statusSections);
  const humanCheckpointStatus = statusFieldFromSections(status, "human_checkpoint_status", statusSections);
  const userDecision = statusFieldFromSections(status, "user_decision", statusSections);
  const finalReportView = statusFieldFromSections(status, "final_report_view", statusSections);
  const finalOutputDir = statusFieldFromSections(status, "final_output_dir", statusSections);
  const queueHealth = cleanField(parseBulletField(queue, "queue_health"));
  const stopState = queueActiveField(queue, "stop_authorization_state");
  const nextAction = queueActiveField(queue, "unauthorized_stop_next_action");
  const safeToInterrupt = cleanField(parseBulletField(status, "safe_to_interrupt"));
  const briefExists = hitl2BriefExists(files, texts, runRoot);

  const pendingUserReady = decisionStatus === "pending_user"
    && humanCheckpointStatus === "pending_user"
    && briefExists
    && queueHealth === "blocked"
    && stopState === "decision_blocker"
    && nextAction === "not_applicable"
    && safeToInterrupt === "yes";

  const recordedReady = decisionStatus === "recorded"
    && humanCheckpointStatus === "recorded"
    && userDecision === "proceed_to_readiness"
    && briefExists
    && concreteRuntimeValue(finalReportView)
    && finalReportView !== "not_started"
    && concreteRuntimeValue(finalOutputDir)
    && stopState === "unauthorized_continue_required"
    && concreteRuntimeValue(nextAction)
    && safeToInterrupt === "no";

  return pendingUserReady || recordedReady;
}

function checkOneReceipt(part, files, texts, runRoot) {
  const cleaned = cleanField(part);
  if (!cleaned || /^not[_ ]applicable$/i.test(cleaned)) {
    return { ok: true };
  }

  const fileMatch = cleaned.match(/^file:(.+)$/i);
  if (fileMatch) {
    const path = resolveReceiptPath(fileMatch[1], files, runRoot);
    return { ok: Boolean(path && isFile(path)), message: `missing required file receipt: ${cleaned}` };
  }

  const dirMatch = cleaned.match(/^dir:(.+)$/i);
  if (dirMatch) {
    const path = resolveReceiptPath(dirMatch[1], files, runRoot);
    return { ok: Boolean(path && isDirectory(path)), message: `missing required directory receipt: ${cleaned}` };
  }

  const statusMatch = cleaned.match(/^status:(.+)$/i);
  if (statusMatch) {
    return {
      ok: compareStatusOrQueue(texts.status ?? "", statusMatch[1]),
      message: `missing required STATUS receipt: ${cleaned}`,
    };
  }

  const queueMatch = cleaned.match(/^queue:(.+)$/i);
  if (queueMatch) {
    return {
      ok: compareStatusOrQueue(texts.queue ?? "", queueMatch[1]),
      message: `missing required QUEUE receipt: ${cleaned}`,
    };
  }

  const traceMatch = cleaned.match(/^trace:(.+)$/i);
  if (traceMatch) {
    const required = cleanField(traceMatch[1]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      ok: new RegExp(required, "i").test(texts.trace ?? ""),
      message: `missing required TRACE receipt: ${cleaned}`,
    };
  }

  const indexMatch = cleaned.match(/^index:(.+?)\s+contains\s+(.+)$/i);
  if (indexMatch) {
    const path = resolveReceiptPath(indexMatch[1], files, runRoot);
    const needle = cleanField(indexMatch[2]);
    return {
      ok: Boolean(path && isFile(path) && readText(path).includes(needle)),
      message: `missing required index receipt: ${cleaned}`,
    };
  }

  const indexExistsMatch = cleaned.match(/^index:(.+?)\s+exists$/i);
  if (indexExistsMatch) {
    const path = resolveReceiptPath(indexExistsMatch[1], files, runRoot);
    return { ok: Boolean(path && isFile(path)), message: `missing required index receipt: ${cleaned}` };
  }

  const artifactSteeringMatch = cleaned.match(/^artifact_steering_current:(.+)$/i);
  if (artifactSteeringMatch) {
    return {
      ok: artifactSteeringCurrent(files, texts, artifactSteeringMatch[1]),
      message: `missing artifact steering current receipt: ${cleaned}`,
    };
  }

  const artifactRefreshNotDueMatch = cleaned.match(/^artifact_refresh_not_due:(.+)$/i);
  if (artifactRefreshNotDueMatch) {
    return {
      ok: artifactRefreshNotDue(files, texts, artifactRefreshNotDueMatch[1]),
      message: `missing artifact refresh-not-due receipt: ${cleaned}`,
    };
  }

  const queuedArtifactRepairMatch = cleaned.match(/^queued_artifact_repair:(.+)$/i);
  if (queuedArtifactRepairMatch) {
    return {
      ok: queuedArtifactRepair(texts, queuedArtifactRepairMatch[1]),
      message: `missing queued artifact repair receipt: ${cleaned}`,
    };
  }

  if (cleaned === "direct_reference_exception") {
    return {
      ok: directReferenceException(texts.queue ?? ""),
      message: "missing direct_reference_exception receipt: current task must be an already-known local/user-provided source and state no retrieval, no search, and no fetch",
    };
  }

  if (cleaned === "active_window_contract_complete") {
    return {
      ok: activeWindowContractComplete(texts.queue ?? ""),
      message: "missing active_window_contract_complete receipt: active window still has Queue Work Unit Contract gaps",
    };
  }

  if (cleaned === "topology_delta_disposed") {
    return {
      ok: topologyDeltaDisposed(texts.status ?? ""),
      message: "missing topology_delta_disposed receipt: pending topology candidates must each have exactly one final legal disposition",
    };
  }

  if (cleaned === "hitl2_pending_or_recorded_ready") {
    return {
      ok: hitl2PendingOrRecordedReady(files, texts, runRoot),
      message: "missing hitl2_pending_or_recorded_ready receipt: HITL2 must be either pending-user decision_blocker or recorded proceed_to_readiness continuation",
    };
  }

  const prefix = cleaned.match(/^([A-Za-z0-9_-]+):/);
  return {
    ok: false,
    message: prefix
      ? `unsupported receipt prefix: ${prefix[1]} in ${cleaned}`
      : `unsupported receipt form: ${cleaned}`,
  };
}

function receiptAlternatives(part) {
  return cleanField(part)
    .split(/\s+\bor\b\s+/i)
    .map((candidate) => cleanField(candidate))
    .filter(Boolean);
}

function splitReceipts(value) {
  return cleanField(value)
    .split(/[;\n]/)
    .map((part) => cleanField(part))
    .filter(Boolean);
}

function receiptFieldFindings(files, texts, field, label) {
  const findings = [];
  const runRoot = runRootFor(files);
  const current = taskSection(texts.queue ?? "", ACTIVE_QUEUE_TASK_SLOTS[0]);
  if (!current) {
    return findings;
  }
  const required = parseBulletField(current, field);
  if (!isMeaningful(required)) {
    return findings;
  }
  for (const part of splitReceipts(required)) {
    const alternatives = receiptAlternatives(part);
    const results = alternatives.map((candidate) => checkOneReceipt(candidate, files, texts, runRoot));
    if (results.length > 0 && !results.some((result) => result.ok)) {
      findings.push(new Finding("E022", results[0].message ?? `missing ${label} receipt: ${part}`));
    }
  }
  return findings;
}

function receiptCheckPhaseFindings(texts) {
  const findings = [];
  const phase = cleanField(parseBulletField(activeQueueSection(texts.queue ?? ""), "receipt_check_phase"));
  if (!phase) {
    findings.push(new Finding("E022", "QUEUE Active Queue missing receipt_check_phase"));
    return findings;
  }
  if (!RECEIPT_CHECK_PHASE_VALUES.has(phase)) {
    findings.push(new Finding("E022", `QUEUE Active Queue receipt_check_phase must be preflight or closeout; found ${phase}`));
  }
  return findings;
}

function activeReceiptFindings(files, texts) {
  const phase = cleanField(parseBulletField(activeQueueSection(texts.queue ?? ""), "receipt_check_phase"));
  if (phase === "closeout") {
    return receiptFieldFindings(files, texts, "completion_receipt", "completion");
  }
  return receiptFieldFindings(files, texts, "required_receipts", "required");
}

function firstNumber(value) {
  const match = cleanField(value).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function producedCount(value) {
  const cleaned = cleanField(value).toLowerCase();
  if (cleaned === "done" || cleaned === "complete") {
    return 1;
  }
  const match = cleaned.match(/\bproduced_at_ref_count\s*=\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function topicBlocks(status) {
  const matches = [...String(status ?? "").matchAll(/^###\s+Topic\s+(.+?)\s*$/gm)];
  return matches.map((match, idx) => {
    const start = match.index;
    const nextTopic = idx + 1 < matches.length ? matches[idx + 1].index : status.length;
    const nextSection = status.indexOf("\n## ", start + match[0].length);
    const end = nextSection === -1 ? nextTopic : Math.min(nextTopic, nextSection);
    return {
      label: cleanField(match[1]),
      text: status.slice(start, end),
    };
  });
}

function topicIdAndSlug(block) {
  const topicId = cleanField(parseBulletField(block.text, "topic_id"));
  const topicSlug = cleanField(parseBulletField(block.text, "topic_slug"));
  return { topicId, topicSlug };
}

function artifactPathExists(rawPath, files) {
  const runRoot = runRootFor(files);
  const cleaned = cleanField(rawPath);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }
  const resolved = resolveReceiptPath(cleaned, files, runRoot);
  return Boolean(resolved && isFile(resolved));
}

function topicPattern(topicId, topicSlug, label) {
  const tokens = [topicId, topicSlug, label].filter((value) => isMeaningful(value) && !value.includes("<"));
  if (tokens.length === 0) {
    return /$a/;
  }
  return new RegExp(tokens.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
}

function activeQueueWindowChunks(queue, slotLimit = ACTIVE_QUEUE_TASK_SLOTS.length) {
  return ACTIVE_QUEUE_TASK_SLOTS
    .slice(0, slotLimit)
    .map((slot) => `${taskAction(queue, slot) ?? ""}\n${taskSection(queue, slot) ?? ""}`)
    .filter((chunk) => chunk.trim().length > 0);
}

function artifactWorkChunks(queue, scope) {
  if (scope === "first_two_active") {
    return activeQueueWindowChunks(queue, 2);
  }
  if (scope === "active") {
    return activeQueueWindowChunks(queue);
  }
  return [
    ...activeQueueWindowChunks(queue),
    ...refillCandidateBlocks(queue),
  ];
}

function queueHasArtifactWork(queue, block, mode, { scope = "all" } = {}) {
  const { topicId, topicSlug } = topicIdAndSlug(block);
  const pattern = topicPattern(topicId, topicSlug, block.label);
  const modePattern = mode === "refresh"
    ? /\b(refresh|update|reconcile|repair)\b/i
    : /\b(produce|create|write|repair)\b/i;
  const artifactPattern = /\b(evidence[-_ ]summary|question[-_ ]list|artifact|artifact_steering)\b/i;
  return artifactWorkChunks(queue, scope).some((chunk) => pattern.test(chunk) && modePattern.test(chunk) && artifactPattern.test(chunk));
}

function currentTaskIsSourceOrDeepening(queue) {
  const current = `${taskAction(queue, ACTIVE_QUEUE_TASK_SLOTS[0]) ?? ""}\n${taskSection(queue, ACTIVE_QUEUE_TASK_SLOTS[0])}`;
  return /\b(source[- ]intake|source search|source retrieval|web search|reference intake|evidence intake|deepen(?:ing)?|Wave\s*1 deepening|topic evidence)\b/i.test(current);
}

function artifactSteeringFindings(files, texts) {
  const findings = [];
  const queue = texts.queue ?? "";
  const sourceOrDeepeningActive = currentTaskIsSourceOrDeepening(queue);
  for (const block of topicBlocks(texts.status ?? "")) {
    const acceptedCount = firstNumber(parseBulletField(block.text, "accepted_topic_ref_count")) ?? 0;
    const uniqueCount = firstNumber(parseBulletField(block.text, "topic_unique_ref_count")) ?? 0;
    const refCount = uniqueCount > 0 ? uniqueCount : acceptedCount;
    if (refCount <= 0) {
      continue;
    }

    const evidenceCount = producedCount(parseBulletField(block.text, "evidence_summary"));
    const questionCount = producedCount(parseBulletField(block.text, "question_list"));
    const evidenceExists = evidenceCount > 0 && artifactPathExists(parseBulletField(block.text, "evidence_summary_path"), files);
    const questionExists = questionCount > 0 && artifactPathExists(parseBulletField(block.text, "question_list_path"), files);
    const hasInitialRepair = queueHasArtifactWork(queue, block, "produce", { scope: "first_two_active" });

    if (!evidenceExists && (sourceOrDeepeningActive || !hasInitialRepair)) {
      findings.push(new Finding("E022", `Topic ${block.label} has topic refs but missing evidence-summary receipt before continuation`));
    }
    if (!questionExists && (sourceOrDeepeningActive || !hasInitialRepair)) {
      findings.push(new Finding("E022", `Topic ${block.label} has topic refs but missing question-list receipt before continuation`));
    }

    const minProduced = Math.min(evidenceCount, questionCount);
    if (acceptedCount > 0 && minProduced > 0 && acceptedCount - minProduced >= 2
      && !queueHasArtifactWork(queue, block, "refresh")) {
      findings.push(new Finding("E022", `Topic ${block.label} artifact steering is stale by >=2 refs and no queued refresh receipt repair is visible`));
    }
  }
  return findings;
}

function traceEntryExists(trace) {
  return /^###\s+.+$/m.test(String(trace ?? ""));
}

function waveTransitionReceiptFindings(texts) {
  const findings = [];
  const status = texts.status ?? "";
  const gate = cleanField(parseBulletField(status, "current_gate"));
  const wave = cleanField(parseBulletField(status, "current_wave"));
  const gateRank = {
    instantiation_complete: 0,
    setup_ready: 1,
    wave0_complete: 2,
    wave1_complete: 3,
    wave2_complete: 4,
    readiness_passed: 5,
  };
  const waveRank = {
    Instantiation: 0,
    "Wave 0": 1,
    "Wave 1": 2,
    "Wave 2": 3,
    "Readiness Check": 4,
  };
  const requiresTrace = (gateRank[gate] ?? -1) >= gateRank.wave0_complete
    || (waveRank[wave] ?? -1) >= waveRank["Wave 1"];
  if (requiresTrace && !traceEntryExists(texts.trace ?? "")) {
    findings.push(new Finding("E022", "Wave transition is claimed but TRACE has no checkpoint receipt"));
  }
  return findings;
}

function searchProviderBoundaryFindings(texts) {
  const findings = [];
  const queue = texts.queue ?? "";
  const workSurface = `${activeQueueSection(queue)}\n${hierarchicalSectionText(queue, "Refill Pool")}`;
  const exaMentionLines = workSurface.split(/\r?\n/)
    .filter((line) => /\bexa\b/i.test(line));
  for (const line of exaMentionLines) {
    if (!/\b(explicit(?:ly)?|user[_ -]?explicit|selected|requested|exa[- ]specific|required|must rely|justif(?:y|ied|ication)|capability)\b/i.test(line)) {
      findings.push(new Finding("E022", `Queue mentions Exa without explicit user selection or Exa-specific capability justification: ${cleanField(line)}`));
    }
  }
  return findings;
}

function nativeProjectionAuthorityFindings(texts) {
  const findings = [];
  const active = activeQueueSection(texts.queue ?? "");
  const value = cleanField(parseBulletField(active, "projection_authority"));
  if (!value) {
    return findings;
  }
  const invalidTruthPhrase = ["source", "of", "truth"].join(" ");
  if (new RegExp(`\\b${invalidTruthPhrase}\\b`, "i").test(value)) {
    findings.push(new Finding("E022", "projection_authority must not use source-of-truth wording; native surfaces are projections of QUEUE_PATH only"));
  } else if (/\bnative\b/i.test(value) && !/\bQUEUE_PATH\b[\s\S]*\bprojection\b/i.test(value)) {
    findings.push(new Finding("E022", "native todo/task/plan authority is invalid; native surfaces are projections of QUEUE_PATH only"));
  }
  return findings;
}

export function queueReceiptFindings(files, texts) {
  return [
    ...activeSlotContractFindings(texts.queue ?? ""),
    ...refillCandidateContractFindings(texts.queue ?? ""),
    ...receiptCheckPhaseFindings(texts),
    ...activeReceiptFindings(files, texts),
    ...artifactSteeringFindings(files, texts),
    ...waveTransitionReceiptFindings(texts),
    ...traceContinuityFindings(texts),
    ...searchProviderBoundaryFindings(texts),
    ...nativeProjectionAuthorityFindings(texts),
  ];
}
