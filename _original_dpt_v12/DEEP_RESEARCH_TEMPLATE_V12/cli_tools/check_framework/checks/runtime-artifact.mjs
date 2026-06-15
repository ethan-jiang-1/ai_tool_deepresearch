import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { exists, readText } from "../lib/fs.mjs";
import { resolveRunPath, seedTopicsRoot } from "../lib/bundle.mjs";
import { markdownTables, parseBulletField, requiredColumnsMissing } from "../lib/markdown.mjs";
import { activeQueueSection, cleanField, isMeaningful, pathIsInside, queueWorkSurface } from "./runtime-shared.mjs";

export function topicBlocks(status) {
  const matches = [...status.matchAll(/^###\s+Topic\s+(.+?)\s*$/gm)];
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

function artifactProduced(value) {
  const cleaned = cleanField(value).toLowerCase();
  if (cleaned === "done") {
    return true;
  }
  const match = cleaned.match(/\bproduced_at_ref_count\s*=\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) >= 1 : false;
}

export function artifactProducedCount(value) {
  const cleaned = cleanField(value).toLowerCase();
  if (cleaned === "done") {
    return 1;
  }
  const match = cleaned.match(/\bproduced_at_ref_count\s*=\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function firstNumber(value) {
  const match = cleanField(value).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function resolveExistingPath(root, runRoot, rawPath) {
  const cleaned = cleanField(rawPath);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  const candidates = isAbsolute(cleaned) ? [cleaned] : [join(runRoot, cleaned), join(root, cleaned), cleaned];
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

function localReferenceCitations(text) {
  return [...String(text ?? "").matchAll(/(?:^|[\s`([])(?:REFERENCE_DIR\/|(?:[^`\s)]+\/)?seed_topics\/_reference\/)[^`\s)]+\.md\b/gm)]
    .map((match) => cleanField(match[0]));
}

function sectionByHeading(text, headingPattern) {
  const matches = [...String(text ?? "").matchAll(/^#{2,6}\s+(.+?)\s*$/gm)];
  for (let idx = 0; idx < matches.length; idx += 1) {
    const title = matches[idx][1];
    if (!headingPattern.test(title)) {
      continue;
    }
    const start = matches[idx].index + matches[idx][0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : text.length;
    return text.slice(start, end);
  }
  return "";
}

function headingIndex(text, headingPattern) {
  for (const match of String(text ?? "").matchAll(/^#{2,6}\s+(.+?)\s*$/gm)) {
    if (headingPattern.test(match[1])) {
      return match.index ?? -1;
    }
  }
  return -1;
}

function normalizeFieldName(value) {
  return cleanField(value).toLowerCase().replace(/\s+/g, "_");
}

export function hasCurlyTemplatePlaceholderResidue(value) {
  return /\{[^{}\n]{2,}\}/.test(String(value ?? ""));
}

function meaningfulLedgerValue(value) {
  const cleaned = cleanField(value);
  const lower = cleaned.toLowerCase();
  if (!cleaned || cleaned.includes("<") || hasCurlyTemplatePlaceholderResidue(cleaned)) {
    return false;
  }
  return Boolean(value)
    && !["not_started", "not_assessed", "tbd", "todo", "placeholder", "none"].includes(lower);
}

function ledgerFieldValues(section, token) {
  const values = [];
  const fieldPattern = new RegExp(`^\\s*-\\s*${token}\\s*:\\s*\`?([^\\n\`]+)\`?\\s*$`, "gim");
  for (const match of section.matchAll(fieldPattern)) {
    values.push(match[1]);
  }
  for (const table of markdownTables(section)) {
    const headerIndex = table.headers.findIndex((header) => normalizeFieldName(header) === token);
    if (headerIndex === -1) {
      continue;
    }
    const header = table.headers[headerIndex];
    for (const row of table.rows) {
      values.push(row[header]);
    }
  }
  return values;
}

function hasMeaningfulLedgerValue(section, token) {
  return ledgerFieldValues(section, token).some((value) => meaningfulLedgerValue(value));
}

function normalizedMirrorValue(value) {
  return cleanField(value).toLowerCase().replace(/\s+/g, " ");
}

function valuesMirror(statusValue, ledgerValues) {
  const status = normalizedMirrorValue(statusValue);
  if (!status || !isMeaningful(status)) {
    return false;
  }
  return ledgerValues
    .map((value) => normalizedMirrorValue(value))
    .filter((value) => value && isMeaningful(value))
    .some((value) => status === value || status.includes(value) || value.includes(status));
}

function hasDecisionValue(section) {
  const allowed = new Set([
    "continue",
    "exploit_current_line",
    "explore_new_line",
    "topology_candidate",
    "complete",
    "early_saturation_review",
    "suspend",
    "archive",
    "redirect",
  ]);
  return [
    ...ledgerFieldValues(section, "decision"),
    ...ledgerFieldValues(section, "exploration_exploitation_decision"),
  ].some((value) => allowed.has(cleanField(value).toLowerCase()));
}

function questionListDecisionSection(text) {
  return sectionByHeading(text, /Exploration\s*\/\s*Exploitation Decision/i);
}

function questionListStatusMirrorFindings(text, statusBlockText, topicLabel) {
  const findings = [];
  if (!statusBlockText) {
    return findings;
  }

  const decisionSection = questionListDecisionSection(text);
  const statusDecision = parseBulletField(statusBlockText, "exploration_exploitation_decision");
  const statusTriggerRefs = parseBulletField(statusBlockText, "exploration_trigger_refs");
  const statusQueueConsequence = parseBulletField(statusBlockText, "exploration_queue_consequence");

  if (!statusDecision || !isMeaningful(statusDecision)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_exploitation_decision is not mirrored from question-list`));
  } else if (decisionSection) {
    const ledgerDecisions = [
      ...ledgerFieldValues(decisionSection, "decision"),
      ...ledgerFieldValues(decisionSection, "exploration_exploitation_decision"),
    ];
    if (!ledgerDecisions.some((value) => normalizedMirrorValue(value) === normalizedMirrorValue(statusDecision))) {
      findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_exploitation_decision does not match question-list decision`));
    }
  }

  if (!statusTriggerRefs || !isMeaningful(statusTriggerRefs)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_trigger_refs is not mirrored from question-list`));
  } else if (decisionSection && !valuesMirror(statusTriggerRefs, ledgerFieldValues(decisionSection, "trigger_refs"))) {
    findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_trigger_refs does not match question-list trigger_refs`));
  }

  if (!statusQueueConsequence || !isMeaningful(statusQueueConsequence)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_queue_consequence is not mirrored from question-list`));
  } else if (decisionSection && !valuesMirror(statusQueueConsequence, ledgerFieldValues(decisionSection, "queue_consequence"))) {
    findings.push(new Finding("E013", `Topic ${topicLabel} STATUS exploration_queue_consequence does not match question-list queue_consequence`));
  }

  return findings;
}

export function questionListLedgerFindings(text, topicLabel, statusBlockText = "") {
  const findings = [];
  const orderedSections = [
    ["Topic Investigation Targets", /Topic Investigation Targets/i],
    ["Question Reconciliation", /Question Reconciliation/i],
    ["Emergent Question Protocol", /Emergent Question Protocol/i],
    ["Exploration / Exploitation Decision", /Exploration\s*\/\s*Exploitation Decision/i],
  ];
  let previousIndex = -1;
  for (const [sectionName, pattern] of orderedSections) {
    const index = headingIndex(text, pattern);
    if (index !== -1 && index < previousIndex) {
      findings.push(new Finding("E013", `Topic ${topicLabel} question-list sections are out of required Wave 1 ledger order at: ${sectionName}`));
      break;
    }
    if (index !== -1) {
      previousIndex = index;
    }
  }

  const targetSection = sectionByHeading(text, /Topic Investigation Targets/i);
  const reconciliationSection = sectionByHeading(text, /Question Reconciliation/i);
  const emergentSection = sectionByHeading(text, /Emergent Question Protocol/i);
  const decisionSection = sectionByHeading(text, /Exploration\s*\/\s*Exploitation Decision/i);

  if (!targetSection) {
    findings.push(new Finding("E013", `Topic ${topicLabel} question-list missing Topic Investigation Targets section`));
  } else {
    const targetTable = markdownTables(targetSection).find((table) => table.headers.length > 0);
    if (!targetTable) {
      findings.push(new Finding("E013", `Topic ${topicLabel} question-list Topic Investigation Targets missing table`));
    } else {
      const missing = requiredColumnsMissing(targetTable.headers, [
        "target_id",
        "target_question",
        "origin",
        "status",
        "profile_relevance",
        "evidence_refs",
        "next_action",
        "last_updated_ref_count",
      ]);
      for (const column of missing) {
        findings.push(new Finding("E013", `Topic ${topicLabel} question-list Topic Investigation Targets missing field: ${column}`));
      }
      if (targetTable.rows.length === 0) {
        findings.push(new Finding("E013", `Topic ${topicLabel} question-list Topic Investigation Targets must contain at least one target row`));
      }
    }
  }

  if (!reconciliationSection) {
    findings.push(new Finding("E013", `Topic ${topicLabel} question-list missing Question Reconciliation section`));
  } else if (!/\[(?:已解决|部分进展|仍开放|需内部数据|resolved|partial|open|internal)\]|\bno_prior_questions_to_reconcile\b/i.test(reconciliationSection)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} question-list Question Reconciliation must show reconciliation states or no_prior_questions_to_reconcile`));
  }

  if (!emergentSection) {
    findings.push(new Finding("E013", `Topic ${topicLabel} question-list missing Emergent Question Protocol section`));
  } else {
    for (const token of ["new_concept", "contradiction", "missing_information_gap", "noise_pattern"]) {
      if (!new RegExp(`\\b${token}\\b`, "i").test(emergentSection)) {
        findings.push(new Finding("E013", `Topic ${topicLabel} question-list Emergent Question Protocol missing check: ${token}`));
      }
    }
    if (!/\[涌现\]|\[emergent\]|\bno_new_questions_after_protocol\b/i.test(emergentSection)) {
      findings.push(new Finding("E013", `Topic ${topicLabel} question-list Emergent Question Protocol must record [涌现] questions or no_new_questions_after_protocol`));
    }
  }

  if (!decisionSection) {
    findings.push(new Finding("E013", `Topic ${topicLabel} question-list missing Exploration / Exploitation Decision section`));
  } else {
    if (!hasDecisionValue(decisionSection)) {
      findings.push(new Finding("E013", `Topic ${topicLabel} question-list Exploration / Exploitation Decision must record one canonical decision value`));
    }
    for (const token of ["trigger_refs", "unresolved_questions", "counterexample_failure_search", "queue_consequence", "next_action", "last_updated_ref_count"]) {
      if (!hasMeaningfulLedgerValue(decisionSection, token)) {
        findings.push(new Finding("E013", `Topic ${topicLabel} question-list Exploration / Exploitation Decision missing meaningful field: ${token}`));
      }
    }
  }

  findings.push(...questionListStatusMirrorFindings(text, statusBlockText, topicLabel));
  return findings;
}

export function artifactBodyQualityFindings(filePath, artifactName, topicLabel, producedCount, statusBlockText = "") {
  const findings = [];
  const text = readText(filePath);
  const stripped = cleanField(text.replace(/```[\s\S]*?```/g, ""));
  if (stripped.length < 500) {
    findings.push(new Finding("E013", `Topic ${topicLabel} ${artifactName} artifact is too thin to be useful (${stripped.length} chars): ${filePath}`));
  }
  if (/\b(todo|tbd|placeholder|not_started|copy this skeleton)\b/i.test(stripped)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} ${artifactName} artifact contains placeholder or not-started residue: ${filePath}`));
  }
  if (hasCurlyTemplatePlaceholderResidue(stripped)) {
    findings.push(new Finding("E013", `Topic ${topicLabel} ${artifactName} artifact contains unresolved template placeholder residue: ${filePath}`));
  }
  const localRefCount = localReferenceCitations(text).length;
  const hasQueueConsequence = /\b(queue_consequence|queue consequence|repair|refill|blocked|synthesis_pending)\b|排队|修复|重跑|阻塞|待综合/i.test(text);
  if (producedCount > 0 && localRefCount === 0 && !hasQueueConsequence) {
    findings.push(new Finding("E013", `Topic ${topicLabel} ${artifactName} artifact must cite local reference paths, not only readable ref ids: ${filePath}`));
  }
  const textCount = firstNumber(text.match(/produced_at_ref_count:\s*`?(\d+)/i)?.[1] ?? "");
  if (producedCount > 0 && textCount !== null && textCount !== producedCount) {
    findings.push(new Finding("E013", `Topic ${topicLabel} ${artifactName} artifact produced_at_ref_count does not match STATUS: artifact=${textCount}, status=${producedCount}`));
  }
  if (artifactName === "evidence-summary") {
    for (const heading of ["Key Evidence", "Mechanism", "Current Judgment"]) {
      if (!new RegExp(`^#{2,4}\\s+.*${heading}`, "im").test(text)) {
        findings.push(new Finding("E013", `Topic ${topicLabel} evidence-summary missing expected synthesis section: ${heading}`));
      }
    }
    if (!/^#{2,4}\s+.*Topic Target Coverage/im.test(text)) {
      findings.push(new Finding("E013", `Topic ${topicLabel} evidence-summary missing Topic Target Coverage section`));
    }
    for (const token of ["target_ids", "coverage_status", "backing_refs", "queue_consequence", "last_updated_ref_count"]) {
      if (!new RegExp(`\\b${token}\\b`, "i").test(text)) {
        findings.push(new Finding("E013", `Topic ${topicLabel} evidence-summary Topic Target Coverage missing field: ${token}`));
      }
    }
  }
  if (artifactName === "question-list") {
    findings.push(...questionListLedgerFindings(text, topicLabel, statusBlockText));
  }
  return findings;
}

function topicArtifactQueueWork(queue, block, expectedDir, mode, { activeOnly = false } = {}) {
  const topicId = cleanField(parseBulletField(block.text, "topic_id"));
  const topicSlug = cleanField(parseBulletField(block.text, "topic_slug"));
  const queueText = activeOnly ? activeQueueSection(queue) : queueWorkSurface(queue);
  const chunks = queueText.split(/^###\s+/m).map((chunk) => cleanField(chunk)).filter(Boolean);
  const topicPattern = new RegExp(`${topicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${topicSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${expectedDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  const artifactPattern = mode === "refresh"
    ? /\b(refresh|update|reconcile)\b[\s\S]{0,160}\b(evidence[- ]summary|question[- ]list|artifact)\b/i
    : /\b(produce|create|write)\b[\s\S]{0,160}\b(evidence[- ]summary|question[- ]list|artifact)\b/i;
  return chunks.some((chunk) => topicPattern.test(chunk) && artifactPattern.test(chunk));
}

function expectedTopicArtifactDir(block) {
  const topicId = cleanField(parseBulletField(block.text, "topic_id"));
  const topicSlug = cleanField(parseBulletField(block.text, "topic_slug"));
  if (!topicId || !topicSlug || topicId.includes("<") || topicSlug.includes("<")) {
    return null;
  }
  return `${topicId}-${topicSlug}`;
}

function canonicalArtifactPath(runRoot, rawPath, artifactName, expectedDir) {
  const cleaned = cleanField(rawPath).split(/[?#]/)[0];
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }
  const resolved = resolveRunPath(runRoot, cleaned);
  if (!resolved) {
    return false;
  }
  const topicArtifacts = join(seedTopicsRoot(runRoot), "_artifacts", "wave1_topics");
  const rel = relative(resolve(topicArtifacts), resolve(resolved)).split(/[\\/]/);
  return pathIsInside(topicArtifacts, resolved)
    && rel.length === 2
    && rel[0].length > 0
    && (!expectedDir || rel[0] === expectedDir)
    && rel[1] === `${artifactName}.md`;
}

function validateTopicArtifact({
  root,
  runRoot,
  block,
  stateField,
  pathField,
  artifactName,
  requiredProducedCount = null,
  requireProduced = false,
}) {
  const findings = [];
  const state = parseBulletField(block.text, stateField);
  const producedCount = artifactProducedCount(state) ?? 0;
  if (!artifactProduced(state)) {
    if (requireProduced) {
      findings.push(new Finding("E013", `Topic ${block.label} ${stateField} must be produced for Wave 1 gate passage`));
    }
    return findings;
  }
  if (requiredProducedCount !== null && producedCount !== requiredProducedCount) {
    findings.push(new Finding("E013", `Topic ${block.label} ${stateField} produced_at_ref_count must equal accepted_topic_ref_count at Wave 1 gate: artifact=${producedCount}, accepted=${requiredProducedCount}`));
  }

  const rawPath = parseBulletField(block.text, pathField);
  if (!rawPath) {
    findings.push(new Finding("E013", `Topic ${block.label} ${stateField} completion claim lacks ${pathField}`));
    return findings;
  }
  const cleanedPath = cleanField(rawPath);
  if (cleanedPath.includes("<") || cleanedPath.includes(">")) {
    findings.push(new Finding("E013", `Topic ${block.label} ${pathField} contains unresolved placeholder: ${cleanedPath}`));
    return findings;
  }
  const expectedDir = expectedTopicArtifactDir(block);
  if (!expectedDir) {
    findings.push(new Finding("E013", `Topic ${block.label} must expose concrete topic_id and topic_slug before artifact completion can be validated`));
    return findings;
  }
  if (!canonicalArtifactPath(runRoot, cleanedPath, artifactName, expectedDir)) {
    findings.push(new Finding("E013", `Topic ${block.label} ${pathField} is not canonical seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/${artifactName}.md path: ${cleanedPath}`));
    return findings;
  }
  const existingPath = resolveExistingPath(root, runRoot, cleanedPath);
  if (!existingPath) {
    findings.push(new Finding("E013", `Topic ${block.label} artifact completion claim path does not exist: ${cleanedPath}`));
    return findings;
  }
  findings.push(...artifactBodyQualityFindings(existingPath, artifactName, block.label, producedCount, block.text));
  return findings;
}

function auditCell(row, candidateNames) {
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanField(key).toLowerCase().replace(/[\s-]+/g, "_");
    if (candidateNames.includes(normalized)) {
      return value;
    }
  }
  return "";
}

function topicKeyFromBlock(block) {
  const topicId = cleanField(parseBulletField(block.text, "topic_id"));
  const topicSlug = cleanField(parseBulletField(block.text, "topic_slug"));
  return topicId && topicSlug ? `${topicId}/${topicSlug}` : "";
}

function topicBlockByKey(status) {
  const map = new Map();
  for (const block of topicBlocks(status)) {
    const key = topicKeyFromBlock(block);
    if (key) {
      map.set(key, block);
    }
  }
  return map;
}

export function wave1GateArtifactFindings(root, files, texts) {
  const findings = [];
  if (!files?.status) {
    return findings;
  }
  const status = texts.status;
  const auditSection = sectionByHeading(status, /Wave 1 Source Floor Audit/i);
  if (!/\bwave2_entry_allowed\s*:\s*`?yes`?/i.test(auditSection)) {
    return findings;
  }

  const runRoot = dirname(files.status);
  const blocksByKey = topicBlockByKey(status);
  const auditTable = markdownTables(auditSection).find((table) => table.headers.length > 0);
  for (const row of auditTable?.rows ?? []) {
    const topic = cleanField(auditCell(row, ["topic"]));
    if (!topic || auditCell(row, ["result"]).toLowerCase() !== "pass") {
      continue;
    }
    const block = blocksByKey.get(topic);
    if (!block) {
      findings.push(new Finding("E013", `Wave 1 gate pass for ${topic} requires a matching STATUS Topic block with artifact paths`));
      continue;
    }
    const acceptedCount = firstNumber(parseBulletField(block.text, "accepted_topic_ref_count"))
      ?? firstNumber(auditCell(row, ["accepted_topic_refs"]));
    for (const artifact of [
      ["evidence_summary", "evidence_summary_path", "evidence-summary"],
      ["question_list", "question_list_path", "question-list"],
    ]) {
      const [stateField, pathField, artifactName] = artifact;
      findings.push(...validateTopicArtifact({
        root,
        runRoot,
        block,
        stateField,
        pathField,
        artifactName,
        requiredProducedCount: acceptedCount,
        requireProduced: true,
      }));
    }
  }
  return findings;
}

export function artifactFindings(root, files, texts) {
  const findings = [];
  const status = texts.status;
  const runRoot = dirname(files.status);
  const artifactPathPattern = /(^|[\/\s`])seed_topics\/_artifacts\/wave1_topics\/[^/\s`]+\/(?:evidence-summary|question-list)\.md/g;
  if (!artifactPathPattern.test(status)) {
    findings.push(new Finding("E013", "STATUS does not expose canonical topic artifact path shape under seed_topics/_artifacts/wave1_topics"));
  }

  for (const block of topicBlocks(status)) {
    for (const artifact of [
      ["evidence_summary", "evidence_summary_path", "evidence-summary"],
      ["question_list", "question_list_path", "question-list"],
    ]) {
      const [stateField, pathField, artifactName] = artifact;
      findings.push(...validateTopicArtifact({
        root,
        runRoot,
        block,
        stateField,
        pathField,
        artifactName,
      }));
    }

    const acceptedCount = firstNumber(parseBulletField(block.text, "accepted_topic_ref_count"));
    const uniqueCount = firstNumber(parseBulletField(block.text, "topic_unique_ref_count"));
    const seedBackfillStatus = cleanField(parseBulletField(block.text, "topic_seed_backfill_status")).toLowerCase();
    const expectedDir = expectedTopicArtifactDir(block);
    if (expectedDir && (uniqueCount ?? 0) >= 1 && ["current", "complete", "done"].includes(seedBackfillStatus)) {
      const evidenceCount = artifactProducedCount(parseBulletField(block.text, "evidence_summary")) ?? 0;
      const questionCount = artifactProducedCount(parseBulletField(block.text, "question_list")) ?? 0;
      if ((evidenceCount === 0 || questionCount === 0)
        && !topicArtifactQueueWork(texts.queue ?? "", block, expectedDir, "produce", { activeOnly: true })) {
        findings.push(new Finding("E013", `Topic ${block.label} has topic-unique refs and current seed backfill but no produced topic artifacts or active-window artifact production work`));
      }
      const minProducedCount = Math.min(evidenceCount, questionCount);
      if (acceptedCount !== null && minProducedCount > 0 && acceptedCount - minProducedCount >= 2
        && !topicArtifactQueueWork(texts.queue ?? "", block, expectedDir, "refresh")) {
        findings.push(new Finding("E013", `Topic ${block.label} topic artifacts are stale by >=2 refs and no queued artifact refresh work is visible`));
      }
    }
  }
  return findings;
}
