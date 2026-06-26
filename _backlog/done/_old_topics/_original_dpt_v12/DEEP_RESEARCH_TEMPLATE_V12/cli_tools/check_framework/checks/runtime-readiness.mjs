import { basename, dirname, join, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { firstMarkdownTable, hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import { resolveRunPath, seedTopicsRoot } from "../lib/bundle.mjs";
import { exists, isFile } from "../lib/fs.mjs";
import {
  ANSWERABILITY_CLASS_VALUES,
  FINAL_REPORT_VIEW_VALUES,
  HITL2_USER_DECISION_VALUES,
  HUMAN_CHECKPOINT_STATUS_VALUES,
  READINESS_ITEM_FIELDS,
} from "../contracts/constants.mjs";
import { activeQueueSection, cleanField, isMeaningful, pathIsInside, splitPathList } from "./runtime-shared.mjs";

function sectionOverallPass(status, sectionName) {
  const section = hierarchicalSectionText(status, sectionName);
  return cleanField(parseBulletField(section, "overall_result")).toLowerCase() === "pass";
}

function sectionEntryAllowed(status, sectionName, entryField) {
  const section = hierarchicalSectionText(status, sectionName);
  return cleanField(parseBulletField(section, entryField)).toLowerCase() === "yes";
}

function gateProgressionRequirementFindings(status, label, sectionName, entryField) {
  const findings = [];
  if (!sectionOverallPass(status, sectionName)) {
    findings.push(new Finding("E007", `${label} requires ${sectionName}.overall_result=pass`));
  }
  if (!sectionEntryAllowed(status, sectionName, entryField)) {
    findings.push(new Finding("E007", `${label} requires ${sectionName}.${entryField}=yes`));
  }
  return findings;
}

export function gateProgressionFindings(texts) {
  const findings = [];
  const status = texts.status;
  const currentGate = cleanField(parseBulletField(status, "current_gate"));
  const currentWave = cleanField(parseBulletField(status, "current_wave"));
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
  const gateAtLeast = (gate) => (gateRank[currentGate] ?? -1) >= gateRank[gate];
  const waveAtLeast = (wave) => (waveRank[currentWave] ?? -1) >= waveRank[wave];

  if (gateAtLeast("wave0_complete") || waveAtLeast("Wave 1")) {
    findings.push(...gateProgressionRequirementFindings(
      status,
      "Wave 0 completion or Wave 1 entry",
      "Wave 0 Foundation Gate Audit",
      "wave1_entry_allowed",
    ));
  }
  if (gateAtLeast("wave1_complete") || waveAtLeast("Wave 2")) {
    findings.push(...gateProgressionRequirementFindings(
      status,
      "Wave 1 completion or Wave 2 entry",
      "Wave 1 Source Floor Audit",
      "wave2_entry_allowed",
    ));
  }
  if (gateAtLeast("wave2_complete") || waveAtLeast("Readiness Check")) {
    findings.push(...gateProgressionRequirementFindings(
      status,
      "Wave 2 completion or Readiness entry",
      "Wave 2 Synthesis Gate Audit",
      "readiness_entry_allowed",
    ));
    if (waveAtLeast("Readiness Check")) {
      const requireHumanCheckpoint = Boolean(texts.profile) || statusRequiresHumanCheckpoint(status);
      findings.push(...humanCheckpointFindings(texts, { requireHumanCheckpoint }));
    }
  }
  return findings;
}

function traceEntryLabels(trace) {
  return [...String(trace ?? "").matchAll(/^###\s+(?:Trace\s+)?([A-Za-z]?\d{1,4}|T\d{3,})\b.*$/gm)]
    .map((match) => match[1]);
}

export function traceContinuityFindings(texts) {
  const findings = [];
  const status = texts.status;
  const trace = texts.trace ?? "";
  const currentGate = cleanField(parseBulletField(status, "current_gate"));
  const currentWave = cleanField(parseBulletField(status, "current_wave"));
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
  const entries = traceEntryLabels(trace);
  const requiresCheckpoint = (gateRank[currentGate] ?? -1) >= gateRank.wave0_complete
    || (waveRank[currentWave] ?? -1) >= waveRank["Wave 1"];
  if (requiresCheckpoint && entries.length === 0) {
    findings.push(new Finding("E021", "TRACE must contain at least one diagnostic checkpoint after Wave 0 completion or Wave 1+ entry"));
  }

  const tracePointer = hierarchicalSectionText(status, "Trace Pointer");
  const lastTraceEntry = cleanField(parseBulletField(tracePointer, "last_trace_entry"));
  if (entries.length > 0 && (!isMeaningful(lastTraceEntry) || lastTraceEntry === "not_started")) {
    findings.push(new Finding("E021", "STATUS Trace Pointer.last_trace_entry must name the latest TRACE checkpoint when TRACE has entries"));
  }
  if (lastTraceEntry && isMeaningful(lastTraceEntry) && lastTraceEntry !== "not_started") {
    const normalizedPointer = lastTraceEntry.toLowerCase();
    const known = entries.some((entry) => normalizedPointer.includes(entry.toLowerCase()));
    if (!known) {
      findings.push(new Finding("E021", `STATUS Trace Pointer.last_trace_entry does not match any TRACE entry label: ${lastTraceEntry}`));
    }
  }
  return findings;
}

const READINESS_ELIGIBLE_ANSWERABILITY = new Set([
  "ready_substantive",
  "ready_insufficient_judgment",
]);

const READINESS_BLOCKING_DECISIONS = new Set([
  "request_view_revision",
  "repair_and_rerun",
  "stop_blocked",
]);

function statusRequiresHumanCheckpoint(status, options = {}) {
  if (typeof options.requireHumanCheckpoint === "boolean") {
    return options.requireHumanCheckpoint;
  }
  return /\b(profile_path|Human Decision Checkpoints|human_checkpoint_check)\b/i.test(status);
}

function readinessItemFields(status, options = {}) {
  if (statusRequiresHumanCheckpoint(status, options)) {
    return READINESS_ITEM_FIELDS;
  }
  return READINESS_ITEM_FIELDS.filter((field) => field !== "human_checkpoint_check");
}

function directSectionText(text, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = text.match(new RegExp(`^(#{2,6})\\s+${escaped}\\s*$`, "m"));
  if (!heading || heading.index === undefined) {
    return "";
  }
  const start = heading.index + heading[0].length;
  const rest = text.slice(start);
  const next = rest.match(/\n#{2,6}\s+.+$/m);
  return next && next.index !== undefined ? rest.slice(0, next.index) : rest;
}

function hitl2FieldValues(text, sectionName) {
  const section = directSectionText(text, sectionName);
  return {
    hitl2CheckpointStatus: cleanField(parseBulletField(section, "hitl2_checkpoint_status")),
    hitl2DecisionStatus: cleanField(parseBulletField(section, "hitl2_wave2_readiness_decision_status")),
    answerabilityClass: cleanField(parseBulletField(section, "answerability_class")),
    humanCheckpointStatus: cleanField(parseBulletField(section, "human_checkpoint_status")),
    finalReportView: cleanField(parseBulletField(section, "final_report_view")),
    customFinalReportViewLabel: cleanField(parseBulletField(section, "custom_final_report_view_label")),
    customFinalReportViewSlug: cleanField(parseBulletField(section, "custom_final_report_view_slug")),
    finalOutputDir: cleanField(parseBulletField(section, "final_output_dir")),
    repairRecommendation: cleanField(parseBulletField(section, "repair_recommendation")),
    userDecision: cleanField(parseBulletField(section, "user_decision")),
  };
}

const HITL2_SYNC_FIELDS = [
  ["answerability_class", "answerabilityClass"],
  ["human_checkpoint_status", "humanCheckpointStatus"],
  ["final_report_view", "finalReportView"],
  ["custom_final_report_view_label", "customFinalReportViewLabel"],
  ["custom_final_report_view_slug", "customFinalReportViewSlug"],
  ["final_output_dir", "finalOutputDir"],
  ["repair_recommendation", "repairRecommendation"],
  ["user_decision", "userDecision"],
];

function finalReportViewDirName(hitl2) {
  const view = cleanField(hitl2.finalReportView).toLowerCase();
  if (view === "profile_default") {
    return "final";
  }
  if (["executive_brief", "evidence_map", "claim_judgment", "technical_deep_dive"].includes(view)) {
    return `final_${view}`;
  }
  if (view === "custom") {
    const slug = cleanField(hitl2.customFinalReportViewSlug).toLowerCase();
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return `final_custom_${slug}`;
    }
  }
  return null;
}

function finalReportViewFindings(hitl2, label) {
  const findings = [];
  const view = cleanField(hitl2.finalReportView).toLowerCase();
  if (!FINAL_REPORT_VIEW_VALUES.has(view) || view === "not_started") {
    findings.push(new Finding("E007", `${label} requires concrete HITL2 final_report_view; found ${hitl2.finalReportView || "missing"}`));
    return findings;
  }

  if (view === "custom") {
    if (!isMeaningful(hitl2.customFinalReportViewLabel) || hitl2.customFinalReportViewLabel.includes("<")) {
      findings.push(new Finding("E007", `${label} final_report_view=custom requires concrete custom_final_report_view_label`));
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanField(hitl2.customFinalReportViewSlug).toLowerCase())) {
      findings.push(new Finding("E007", `${label} final_report_view=custom requires custom_final_report_view_slug as a lowercase slug`));
    }
  }

  const expectedDir = finalReportViewDirName(hitl2);
  const rawDir = cleanField(hitl2.finalOutputDir).replace(/\/+$/g, "");
  if (!expectedDir) {
    return findings;
  }
  if (!rawDir || rawDir.includes("<") || rawDir.includes(">")) {
    findings.push(new Finding("E007", `${label} requires final_output_dir for final_report_view=${view}; expected directory ${expectedDir}`));
    return findings;
  }
  if (basename(rawDir) !== expectedDir) {
    findings.push(new Finding("E007", `${label} final_report_view=${view} requires final_output_dir ending in ${expectedDir}; found ${hitl2.finalOutputDir}`));
  }
  return findings;
}

function tableCell(row, candidateNames) {
  const normalizedCandidates = candidateNames.map((name) => cleanField(name).toLowerCase().replace(/[\s-]+/g, "_"));
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanField(key).toLowerCase().replace(/[\s-]+/g, "_");
    if (normalizedCandidates.includes(normalized)) {
      return cleanField(value);
    }
  }
  return "";
}

function humanCheckpointFindings(texts, options = {}) {
  const status = texts.status;
  if (!statusRequiresHumanCheckpoint(status, options)) {
    return [];
  }
  const findings = [];
  const statusHITL2 = hitl2FieldValues(status, "Human Decision Checkpoints");
  if (statusHITL2.hitl2DecisionStatus && !HUMAN_CHECKPOINT_STATUS_VALUES.has(statusHITL2.hitl2DecisionStatus)) {
    findings.push(new Finding("E007", `Readiness HITL2 hitl2_wave2_readiness_decision_status has invalid enum value: ${statusHITL2.hitl2DecisionStatus}`));
  }
  if (statusHITL2.answerabilityClass && !ANSWERABILITY_CLASS_VALUES.has(statusHITL2.answerabilityClass)) {
    findings.push(new Finding("E007", `Readiness HITL2 answerability_class has invalid enum value: ${statusHITL2.answerabilityClass}`));
  }
  if (statusHITL2.humanCheckpointStatus && !HUMAN_CHECKPOINT_STATUS_VALUES.has(statusHITL2.humanCheckpointStatus)) {
    findings.push(new Finding("E007", `Readiness HITL2 human_checkpoint_status has invalid enum value: ${statusHITL2.humanCheckpointStatus}`));
  }
  if (statusHITL2.userDecision && !HITL2_USER_DECISION_VALUES.has(statusHITL2.userDecision)) {
    findings.push(new Finding("E007", `Readiness HITL2 user_decision has invalid enum value: ${statusHITL2.userDecision}`));
  }
  if (!READINESS_ELIGIBLE_ANSWERABILITY.has(statusHITL2.answerabilityClass)) {
    findings.push(new Finding("E007", `Readiness requires HITL2 answerability_class=ready_substantive or ready_insufficient_judgment; found ${statusHITL2.answerabilityClass || "missing"}`));
  }
  if (statusHITL2.hitl2DecisionStatus !== "recorded") {
    findings.push(new Finding("E007", `Readiness requires STATUS hitl2_wave2_readiness_decision_status=recorded; found ${statusHITL2.hitl2DecisionStatus || "missing"}`));
  }
  if (statusHITL2.humanCheckpointStatus !== "recorded") {
    findings.push(new Finding("E007", `Readiness requires HITL2 human_checkpoint_status=recorded; found ${statusHITL2.humanCheckpointStatus || "missing"}`));
  }
  if (statusHITL2.userDecision !== "proceed_to_readiness") {
    findings.push(new Finding("E007", `Readiness requires HITL2 user_decision=proceed_to_readiness; found ${statusHITL2.userDecision || "missing"}`));
  }
  if (READINESS_BLOCKING_DECISIONS.has(statusHITL2.userDecision)) {
    findings.push(new Finding("E007", `Readiness cannot pass with HITL2 user_decision=${statusHITL2.userDecision}`));
  }
  if (statusHITL2.userDecision === "request_view_revision") {
    const queueSurface = `${activeQueueSection(texts.queue)}\n${hierarchicalSectionText(texts.queue, "Refill Pool")}`;
    if (!/\b(final report view|report view|view revision|view clarification|final lens|synthesis lens)\b|报告视角|最终报告视角|视角澄清/i.test(queueSurface)) {
      findings.push(new Finding("E007", "HITL2 user_decision=request_view_revision requires concrete queue-backed final report view clarification work before Readiness"));
    }
  }
  findings.push(...finalReportViewFindings(statusHITL2, "Readiness"));

  if (texts.profile) {
    const profileHITL2 = hitl2FieldValues(texts.profile, "HITL2 Wave 2 Readiness Decision");
    if (profileHITL2.hitl2CheckpointStatus && !HUMAN_CHECKPOINT_STATUS_VALUES.has(profileHITL2.hitl2CheckpointStatus)) {
      findings.push(new Finding("E007", `PROFILE HITL2 hitl2_checkpoint_status has invalid enum value: ${profileHITL2.hitl2CheckpointStatus}`));
    }
    if (profileHITL2.hitl2CheckpointStatus !== "recorded") {
      findings.push(new Finding("E007", `Readiness requires PROFILE hitl2_checkpoint_status=recorded; found ${profileHITL2.hitl2CheckpointStatus || "missing"}`));
    }
    for (const [field, prop] of HITL2_SYNC_FIELDS) {
      const statusValue = statusHITL2[prop];
      const profileValue = profileHITL2[prop];
      if (statusValue !== profileValue) {
        findings.push(new Finding("E007", `PROFILE and STATUS HITL2 ${field} must match before Readiness; status=${statusValue || "missing"}, profile=${profileValue || "missing"}`));
      }
    }
    for (const sectionName of ["Wave 2", "Wave 2 Human Decision Brief"]) {
      const projectedHITL2 = hitl2FieldValues(status, sectionName);
      for (const [field, prop] of HITL2_SYNC_FIELDS) {
        const projectedValue = projectedHITL2[prop];
        const profileValue = profileHITL2[prop];
        if (projectedValue !== profileValue) {
          findings.push(new Finding("E007", `PROFILE and STATUS ${sectionName} HITL2 ${field} must match before Readiness; status=${projectedValue || "missing"}, profile=${profileValue || "missing"}`));
        }
      }
    }
    const checkpointTable = firstMarkdownTable(hierarchicalSectionText(texts.profile, "Human Decision Checkpoints"));
    const hitl2Row = checkpointTable.rows.find((row) => tableCell(row, ["checkpoint"]).includes("HITL2_wave2_readiness_decision"));
    if (!hitl2Row) {
      findings.push(new Finding("E007", "PROFILE Human Decision Checkpoints must include HITL2_wave2_readiness_decision row before Readiness"));
    } else if (tableCell(hitl2Row, ["status"]) !== "recorded") {
      findings.push(new Finding("E007", `PROFILE HITL2_wave2_readiness_decision checkpoint row must be recorded when HITL2 detail fields are recorded; found ${tableCell(hitl2Row, ["status"]) || "missing"}`));
    }
  }
  return findings;
}

function readinessPassRequirementMessages(status, options = {}) {
  const findings = [];
  const readiness = hierarchicalSectionText(status, "Readiness Check");
  const runtimeQualification = hierarchicalSectionText(status, "Runtime Qualification Result");
  if (!readiness) {
    return ["readiness_passed requires STATUS Readiness Check section"];
  }
  for (const field of readinessItemFields(status, options)) {
    const value = cleanField(parseBulletField(readiness, field)).toLowerCase();
    if (value !== "pass") {
      findings.push(`readiness_passed requires Readiness Check.${field}=pass; found ${value || "missing"}`);
    }
  }
  const overall = cleanField(parseBulletField(readiness, "overall_status")).toLowerCase();
  if (overall !== "pass") {
    findings.push(`readiness_passed requires Readiness Check.overall_status=pass; found ${overall || "missing"}`);
  }
  const closeoutPhase = cleanField(parseBulletField(readiness, "closeout_phase")).toLowerCase();
  if (closeoutPhase !== "closed") {
    findings.push(`readiness_passed requires Readiness Check.closeout_phase=closed; found ${closeoutPhase || "missing"}`);
  }
  const runtimeResult = cleanField(parseBulletField(runtimeQualification, "result")).toLowerCase();
  if (runtimeResult !== "pass") {
    findings.push(`readiness_passed requires Runtime Qualification Result.result=pass; found ${runtimeResult || "missing"}`);
  }
  const state = cleanField(parseBulletField(status, "state")).toLowerCase();
  if (state !== "completed") {
    findings.push(`readiness_passed requires STATUS state=completed; found ${state || "missing"}`);
  }
  const nextGate = cleanField(parseBulletField(status, "next_gate")).toLowerCase();
  if (nextGate !== "none") {
    findings.push(`readiness_passed requires STATUS next_gate=none; found ${nextGate || "missing"}`);
  }
  return findings;
}

export function readinessPassed(status) {
  return readinessPassRequirementMessages(status).length === 0;
}

function readinessRunRoot(context = {}) {
  return context.files?.status ? dirname(context.files.status) : null;
}

function readinessRoutePathFindings(status, context = {}) {
  const findings = [];
  const runRoot = readinessRunRoot(context);
  const retrieval = hierarchicalSectionText(status, "30-Second Local Evidence Retrieval Test");
  if (!retrieval) {
    return [new Finding("E007", "readiness_passed requires 30-Second Local Evidence Retrieval Test section")];
  }

  const route = cleanField(parseBulletField(retrieval, "route"));
  if (!isMeaningful(route) || route.includes("<")) {
    findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test.route must be concrete before readiness_passed; found ${route || "missing"}`));
  }

  const result = cleanField(parseBulletField(retrieval, "result")).toLowerCase();
  if (result !== "pass") {
    findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test.result must be pass before readiness_passed; found ${result || "missing"}`));
  }

  const elapsedRaw = cleanField(parseBulletField(retrieval, "elapsed_seconds"));
  const elapsed = elapsedRaw.match(/\d+(?:\.\d+)?/) ? Number.parseFloat(elapsedRaw.match(/\d+(?:\.\d+)?/)[0]) : null;
  if (elapsed === null || elapsed > 30) {
    findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test.elapsed_seconds must be a concrete value <= 30; found ${elapsedRaw || "missing"}`));
  }

  const gaps = cleanField(parseBulletField(retrieval, "gaps_found")).toLowerCase();
  if (!gaps || gaps.includes("<") || !["none", "no gaps", "not_applicable"].includes(gaps)) {
    findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test.gaps_found must be none before readiness_passed; found ${gaps || "missing"}`));
  }

  const checkedRaw = parseBulletField(retrieval, "route_paths_checked");
  const checkedPaths = splitPathList(checkedRaw);
  if (checkedPaths.length === 0) {
    findings.push(new Finding("E007", "30-Second Local Evidence Retrieval Test.route_paths_checked must list concrete run-local markdown paths before readiness_passed"));
    return findings;
  }
  if (!runRoot) {
    return findings;
  }

  const resolvedPaths = [];
  for (const rawPath of checkedPaths) {
    const withoutAnchor = rawPath.split("#")[0];
    if (!withoutAnchor.endsWith(".md")) {
      findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test route path must be a markdown file: ${rawPath}`));
      continue;
    }
    const resolvedPath = resolveRunPath(runRoot, withoutAnchor);
    if (!resolvedPath || !pathIsInside(runRoot, resolvedPath)) {
      findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test route path must resolve under RUN_DIR: ${rawPath}`));
      continue;
    }
    if (!exists(resolvedPath) || !isFile(resolvedPath)) {
      findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test route path does not exist as a file: ${rawPath}`));
      continue;
    }
    resolvedPaths.push(resolve(resolvedPath));
  }

  const resolvedSet = new Set(resolvedPaths);
  for (const [kind, filePath] of Object.entries(context.files ?? {})) {
    if (filePath && !resolvedSet.has(resolve(filePath))) {
      findings.push(new Finding("E007", `30-Second Local Evidence Retrieval Test.route_paths_checked must include ${kind} control file: ${filePath}`));
    }
  }

  const referenceIndex = resolve(join(seedTopicsRoot(runRoot), "_reference", "_INDEX.md"));
  if (exists(referenceIndex) && !resolvedSet.has(referenceIndex)) {
    findings.push(new Finding("E007", "30-Second Local Evidence Retrieval Test.route_paths_checked must include seed_topics/_reference/_INDEX.md"));
  }
  return findings;
}

export function readinessFindings(texts, context = {}) {
  const findings = [];
  const status = texts.status;
  const queue = texts.queue;
  const readiness = hierarchicalSectionText(status, "Readiness Check");
  if (!readiness) {
    return findings;
  }

  const currentGate = cleanField(parseBulletField(status, "current_gate"));
  const state = cleanField(parseBulletField(status, "state"));
  const nextGate = cleanField(parseBulletField(status, "next_gate"));
  const queueHealth = cleanField(parseBulletField(queue, "queue_health"));
  const overall = cleanField(parseBulletField(readiness, "overall_status")).toLowerCase();
  const closeoutClaimed = currentGate === "readiness_passed"
    || state === "completed"
    || nextGate === "none"
    || queueHealth === "closed";
  const requireHumanCheckpoint = Boolean(texts.profile) || statusRequiresHumanCheckpoint(status);

  if (overall === "pass" || closeoutClaimed) {
    findings.push(...readinessPassRequirementMessages(status, { requireHumanCheckpoint }).map((message) => new Finding("E007", message)));
    findings.push(...humanCheckpointFindings(texts, { requireHumanCheckpoint }));
    findings.push(...readinessRoutePathFindings(status, context));
  }

  const activeItemValues = readinessItemFields(status, { requireHumanCheckpoint }).map((field) => [
    field,
    cleanField(parseBulletField(readiness, field)).toLowerCase(),
  ]);
  const failingItems = activeItemValues.filter(([, value]) => ["partial", "fail", "not_started", "not started", ""].includes(value));
  if (overall === "pass" && failingItems.length > 0) {
    findings.push(new Finding(
      "E007",
      `Readiness Check.overall_status=pass conflicts with non-pass readiness items: ${failingItems.map(([field, value]) => `${field}=${value || "missing"}`).join(", ")}`,
    ));
  }
  if (closeoutClaimed && failingItems.length > 0) {
    findings.push(new Finding(
      "E007",
      `completion/readiness closeout is claimed while readiness items remain non-pass: ${failingItems.map(([field, value]) => `${field}=${value || "missing"}`).join(", ")}`,
    ));
  }

  const activeAndRefill = `${activeQueueSection(queue)}\n${hierarchicalSectionText(queue, "Refill Pool")}`;
  if (failingItems.length > 0 && /\b(await(?:ing)?\s+(?:only\s+)?(?:the\s+)?user\s+review|ready\s+for\s+final\s+handoff|complete(?:d)?\s+run)\b/i.test(activeAndRefill)) {
    findings.push(new Finding("E007", "queue cannot claim only user review, final handoff, or run completion while readiness items are partial/fail/not_started"));
  }

  return findings;
}
