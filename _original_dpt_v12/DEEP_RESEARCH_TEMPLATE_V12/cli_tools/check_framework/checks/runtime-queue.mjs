import { isAbsolute, relative, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { isFile } from "../lib/fs.mjs";
import { hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import {
  ACTIVE_QUEUE_TASK_SLOTS,
  CLOSED_TASK_VALUES,
  PLATFORM_TASK_PROJECTION_VALUES,
  PRE_RESPONSE_ALLOWED_STATES,
  PRE_RESPONSE_FORBIDDEN_STATES,
  REPORT_OR_WAIT_TASK_PATTERNS,
  SOURCE_INTAKE_RUNNER_MODE_VALUES,
  SOURCE_INTAKE_STATUS_VALUES,
  SOURCE_INTAKE_WAIT_STATE_VALUES,
  TASK_PROJECTION_STATES,
} from "../contracts/constants.mjs";
import { concreteDecisionBlocker, stopAuthorizationSnapshot } from "./runtime-stop-authorization.mjs";
import {
  activeQueueSection,
  cleanField,
  fieldContainsAll,
  instanceConfigValue,
  isMeaningful,
  operatorViewSection,
  pathIsInside,
  splitPathList,
  taskAction,
  taskSection,
} from "./runtime-shared.mjs";

const CURRENT_TASK_SLOT = ACTIVE_QUEUE_TASK_SLOTS[0];

export function queueFindings(texts) {
  const findings = [];
  const queue = texts.queue;
  const status = texts.status;
  const health = parseBulletField(queue, "queue_health");
  const executionMode = parseBulletField(queue, "execution_mode");
  const gate = parseBulletField(status, "current_gate");
  const closureReason = parseBulletField(queue, "closure_reason");
  if (!queue.includes("## Active Queue")) {
    findings.push(new Finding("E014", "QUEUE missing stable ## Active Queue anchor"));
  }
  if (health === "closed" && gate !== "readiness_passed") {
    findings.push(new Finding("E014", "queue_health=closed is valid only after current_gate=readiness_passed"));
  }
  if (health === "closed" && closureReason !== "readiness_passed") {
    findings.push(new Finding("E014", `closed queue must record closure_reason=readiness_passed; found ${closureReason || "missing"}`));
  }
  if (gate === "readiness_passed" && health !== "closed") {
    findings.push(new Finding("E014", `current_gate=readiness_passed requires queue_health=closed; found ${health || "missing"}`));
  }
  if (health === "closed") {
    findings.push(...closedQueueFindings(queue));
  }
  if (health !== "closed") {
    if (cleanField(executionMode) !== "sequential") {
      findings.push(new Finding("E014", `active queue execution_mode must be sequential; found ${executionMode || "missing"}`));
    }
    for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
      if (!taskSection(queue, taskName)) {
        findings.push(new Finding("E014", `active queue must contain ${taskName} when queue is not closed`));
      }
    }
  }
  findings.push(...sourceIntakeQueueFindings(texts));
  return findings;
}

function closedQueueFindings(queue) {
  const findings = [];
  for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
    const section = taskSection(queue, taskName);
    if (!section) {
      findings.push(new Finding("E014", `closed queue must keep ${taskName} section with a closed action value`));
      continue;
    }
    const action = taskAction(queue, taskName);
    if (!closedTaskValue(action)) {
      findings.push(new Finding("E014", `closed queue ${taskName}.action must be none or not_applicable_after_readiness_passed; found ${action || "missing"}`));
    }
  }
  return findings;
}

function executableTaskValue(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && !cleaned.includes("<") && !cleaned.includes(">");
}

function closedTaskValue(value) {
  return CLOSED_TASK_VALUES.has(cleanField(value).toLowerCase());
}

function taskMarkedComplete(section) {
  return /^-\s*(?:status|task_status|completion_status):\s*`?(?:done|complete|completed|closed)`?\s*$/im.test(section);
}

function runDirFor(texts) {
  return instanceConfigValue(texts.plan ?? "", "run_dir");
}

function directoryIntegrationSection(status) {
  return hierarchicalSectionText(status, "Directory / Integration State");
}

function concreteBatchId(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(cleaned);
}

function concreteBatchIdFinding(label, value) {
  return concreteBatchId(value) ? null : `${label} must be a concrete source-intake batch slug using only letters, digits, underscore, or hyphen; found ${value || "missing"}`;
}

function sourceIntakeCacheRelPath(target, runDir) {
  let normalized = cleanField(target).replace(/\\/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  if (/(^|\/)_framework\/_cache(\/|$)/.test(normalized)) {
    return { error: `source intake writes_to must not write mutable cache files inside _framework: ${target}` };
  }
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    return { error: `source intake writes_to must stay in exact run-local _cache staging paths until main-agent fan-in; found ${target}` };
  }
  if (normalized.startsWith("_cache/")) {
    return { relPath: normalized.slice("_cache/".length) };
  }

  const cleanedRunDir = cleanField(runDir).replace(/\\/g, "/").replace(/\/+$/, "");
  if (cleanedRunDir && !cleanedRunDir.includes("<") && !cleanedRunDir.includes(">")) {
    if (isAbsolute(normalized)) {
      const cacheRoot = resolve(cleanedRunDir, "_cache");
      const targetPath = resolve(normalized);
      if (pathIsInside(cacheRoot, targetPath)) {
        const relPath = relative(cacheRoot, targetPath).replace(/\\/g, "/");
        return { relPath };
      }
    } else if (normalized.startsWith(`${cleanedRunDir}/_cache/`)) {
      return { relPath: normalized.slice(`${cleanedRunDir}/_cache/`.length) };
    }
  }

  return { error: `source intake writes_to must stay in exact run-local _cache staging paths until main-agent fan-in; found ${target}` };
}

function sourceIntakeCachePathInfo(target, batchId, runDir) {
  const { relPath, error } = sourceIntakeCacheRelPath(target, runDir);
  if (error) {
    return { error };
  }
  const cleanedBatchId = cleanField(batchId);
  const cacheRel = relPath;
  const intakeMatch = cacheRel.match(/^intake\/([^/]+)\/(?:intake-request|retrieval-results|candidate-cards|capture-manifest)\.md$/i);
  if (intakeMatch) {
    if (intakeMatch[1] !== cleanedBatchId) {
      return { error: `source intake _cache intake path batch id must match source_intake_batch_id=${cleanedBatchId}; found ${target}` };
    }
    const kind = cacheRel.endsWith("/intake-request.md")
      ? "intake-request"
      : cacheRel.endsWith("/retrieval-results.md")
        ? "retrieval-results"
        : cacheRel.endsWith("/candidate-cards.md")
          ? "candidate-cards"
          : "capture-manifest";
    return { relPath: cacheRel, kind, batchId: intakeMatch[1] };
  }
  const excludedMatch = cacheRel.match(/^excluded\/([^/]+)-excluded\.md$/i);
  if (excludedMatch) {
    if (excludedMatch[1] !== cleanedBatchId) {
      return { error: `source intake _cache excluded path batch id must match source_intake_batch_id=${cleanedBatchId}; found ${target}` };
    }
    return { relPath: cacheRel, kind: "excluded", batchId: excludedMatch[1] };
  }
  if (/^promote-log\.md$/i.test(cacheRel)) {
    return { relPath: cacheRel, kind: "promote-log" };
  }
  if (/^captures\/[^/]+\.md$/i.test(cacheRel)) {
    return { relPath: cacheRel, kind: "capture" };
  }
  return { error: `source intake writes_to must be an exact source-intake _cache .md file path, not a directory or arbitrary file: ${target}` };
}

function sourceIntakeSpecificPathInfo(target, batchId, runDir, allowedKinds, label) {
  const info = sourceIntakeCachePathInfo(target, batchId, runDir);
  if (info.error) {
    return { finding: info.error };
  }
  if (!allowedKinds.has(info.kind)) {
    return { finding: `${label} must name ${[...allowedKinds].join(" / ")} for source_intake_batch_id=${cleanField(batchId)}; found ${target}` };
  }
  return { info };
}

function sourceIntakeCachePathsInText(text, filePattern) {
  return [...String(text ?? "").matchAll(/(?:^|[\s`])([^`\s;]*_cache\/[^\s`;]+\.md)\b/gi)]
    .map((match) => cleanField(match[1]))
    .filter((path) => filePattern.test(path.replace(/\\/g, "/")));
}

function sourceIntakeFilePattern(allowedKinds) {
  return new RegExp(`(?:${[...allowedKinds].map((kind) => {
    if (kind === "candidate-cards") return "candidate-cards\\.md";
    if (kind === "retrieval-results") return "retrieval-results\\.md";
    if (kind === "capture-manifest") return "capture-manifest\\.md";
    if (kind === "excluded") return "[^/]+-excluded\\.md";
    if (kind === "promote-log") return "promote-log\\.md";
    return `${kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.md`;
  }).join("|")})$`, "i");
}

function sourceIntakeEvidencePathInfos(text, batchId, runDir, allowedKinds, label) {
  const paths = sourceIntakeCachePathsInText(text, sourceIntakeFilePattern(allowedKinds));
  const infos = [];
  for (const path of paths) {
    const { finding, info } = sourceIntakeSpecificPathInfo(path, batchId, runDir, allowedKinds, label);
    if (finding) {
      return { finding };
    }
    infos.push(info);
  }
  return { infos };
}

function requiredSourceIntakeEvidencePathInfo(text, batchId, runDir, allowedKinds, label) {
  const { finding, infos } = sourceIntakeEvidencePathInfos(text, batchId, runDir, allowedKinds, label);
  if (finding) {
    return { finding };
  }
  if (infos.length === 0) {
    return { finding: `${label} must name an exact run-local _cache path for source_intake_batch_id=${cleanField(batchId)}` };
  }
  return { info: infos[0], infos };
}

function sourceIntakeCacheFilesExistFinding(infos, runDir, label) {
  for (const info of infos ?? []) {
    const existsFinding = sourceIntakeCacheFileExistsFinding(info, runDir, label);
    if (existsFinding) {
      return existsFinding;
    }
  }
  return null;
}

function requiredSourceIntakeEvidencePathFinding(text, batchId, runDir, allowedKinds, label, { requireExisting = false } = {}) {
  const result = requiredSourceIntakeEvidencePathInfo(text, batchId, runDir, allowedKinds, label);
  if (result.finding) {
    return result.finding;
  }
  if (requireExisting) {
    return sourceIntakeCacheFilesExistFinding(result.infos, runDir, label);
  }
  return null;
}

function optionalCandidateCardStatusPathFinding(pathValue, batchId, runDir, label, { requireExisting = false } = {}) {
  if (!isMeaningful(pathValue)) {
    return null;
  }
  const { finding, info } = sourceIntakeSpecificPathInfo(pathValue, batchId, runDir, new Set(["candidate-cards"]), label);
  if (finding) {
    return finding;
  }
  return requireExisting ? sourceIntakeCacheFileExistsFinding(info, runDir, label) : null;
}

function promoteLogPathFinding(pathValue, runDir, label) {
  const { finding } = promoteLogPathInfo(pathValue, runDir, label);
  return finding ?? null;
}

function promoteLogPathInfo(pathValue, runDir, label) {
  const info = sourceIntakeCachePathInfo(pathValue, "not_applicable", runDir);
  if (info.error) {
    return { finding: info.error };
  }
  return info.kind === "promote-log" ? { info } : { finding: `${label} must point to exact run-local _cache/promote-log.md; found ${pathValue}` };
}

function concreteRunDir(runDir) {
  const cleaned = cleanField(runDir).replace(/\\/g, "/").replace(/\/+$/, "");
  return cleaned && !cleaned.includes("<") && !cleaned.includes(">") ? cleaned : "";
}

function sourceIntakeCacheFileExistsFinding(info, runDir, label) {
  const cleanedRunDir = concreteRunDir(runDir);
  if (!cleanedRunDir || !info?.relPath) {
    return null;
  }
  const filePath = resolve(cleanedRunDir, "_cache", info.relPath);
  return isFile(filePath) ? null : `${label} cache file does not exist: _cache/${info.relPath}`;
}

function sourceIntakeTaskText(text) {
  const value = String(text ?? "");
  if (/\b(?:query|ask|clarif(?:y|ication)|confirm|request)\s+(?:the\s+)?user\b/i.test(value)
    && /\b(?:final report view|report view|view revision|view clarification|final lens|synthesis lens)\b/i.test(value)) {
    return false;
  }
  const explicitSourceIntake = /\b(?:source intake (?:search|retrieval|lookup|fetch|triage|batch)|source retrieval|web search|source search|search batch|local lookup|database(?:\/api)? query|database query|api query|webpage triage|page triage|find (?:next )?(?:authoritative )?source|discover (?:next )?(?:authoritative )?source|look up (?:next )?(?:authoritative )?source|inspect (?:url|page|webpage)|open (?:url|page|webpage)|collect (?:next )?(?:authoritative )?source|capture (?:next )?(?:authoritative )?source)\b/i;
  const retrievalTarget = /\b(?:source|reference|evidence|web|webpage|website|page|url|uri|https?|site|database|api|doi|paper|article|report|document|publication|publisher|dataset|repository|repo)\b/i;
  const sourceQualifiedRetrievalVerb = /\b(?:fetch|browse|download|query)\b.{0,80}\b(?:source|reference|evidence|web|webpage|website|page|url|uri|https?|site|database|api|doi|paper|article|report|document|publication|publisher|dataset|repository|repo)\b/i;
  const retrievalTargetQualifiedVerb = /\b(?:source|reference|evidence|web|webpage|website|page|url|uri|https?|site|database|api|doi|paper|article|report|document|publication|publisher|dataset|repository|repo)\b.{0,80}\b(?:fetch|browse|download|query)\b/i;
  return explicitSourceIntake.test(value)
    || (retrievalTarget.test(value) && (sourceQualifiedRetrievalVerb.test(value) || retrievalTargetQualifiedVerb.test(value)));
}

function positiveSourceIntakeTaskText(text) {
  const withoutNegatedIntake = String(text ?? "")
    .replace(/\bno\s+(?:retrieval|search|fetch)\b/gi, "")
    .replace(/\bwithout\s+(?:retrieval|search|fetch)\b/gi, "")
    .replace(/\b(?:retrieval|search|fetch)\s+(?:was\s+)?not\s+used\b/gi, "");
  return sourceIntakeTaskText(withoutNegatedIntake);
}

function taskWriteTargets(taskText) {
  return splitPathList(parseBulletField(taskText, "writes_to"));
}

function hasPromoteLogWriteTarget(writeTargets, runDir) {
  return writeTargets.some((target) => !promoteLogPathFinding(target, runDir, "fan-in writes_to"));
}

function referenceIndexWriteTarget(target) {
  const normalized = cleanField(target).replace(/\\/g, "/");
  return /\bREFERENCE_DIR\/_INDEX\.md\b/.test(target)
    || /(^|\/)seed_topics\/_reference\/_INDEX\.md\b/i.test(normalized)
    || /(^|\/)_reference\/_INDEX\.md\b/i.test(normalized);
}

function statusOrQueueWriteTarget(target) {
  return /\b(?:STATUS_PATH|QUEUE_PATH)\b/.test(target);
}

function fanInPromotionWriteTarget(target) {
  return directReferenceWriteTarget(target)
    || referenceIndexWriteTarget(target)
    || statusOrQueueWriteTarget(target);
}

function fanInPromotionTaskFinding(text, batchId, runDir, label = `fan-in ${CURRENT_TASK_SLOT}`) {
  const batchFinding = concreteBatchIdFinding("source_intake_batch_id", batchId);
  if (batchFinding) {
    return batchFinding;
  }
  const writeTargets = taskWriteTargets(text);
  if (!hasPromoteLogWriteTarget(writeTargets, runDir)) {
    return `${label} must write _cache/promote-log.md during main-agent fan-in/promotion`;
  }
  if (!writeTargets.some(fanInPromotionWriteTarget)) {
    return `${label} must write at least one promoted reference, reference index, STATUS_PATH, or QUEUE_PATH target`;
  }
  if (!/\b(fan[- ]in|review|promot(?:e|ion)|candidate[- ]cards?)\b/i.test(text)
    || !/\b(candidate[- ]cards?|promot(?:e|ion)|accepted material)\b/i.test(text)) {
    return `${label} must review candidate cards and promote accepted material from the concrete source-intake batch`;
  }
  return requiredSourceIntakeEvidencePathFinding(text, batchId, runDir, new Set(["candidate-cards"]), label, { requireExisting: true });
}

function fanInPromotionTaskText(text, batchId, runDir) {
  return !fanInPromotionTaskFinding(text, batchId, runDir);
}

function closingFanInTaskFinding(text, batchId, runDir, waitState) {
  const batchFinding = concreteBatchIdFinding("source_intake_batch_id", batchId);
  if (batchFinding) {
    return batchFinding;
  }
  if (!hasPromoteLogWriteTarget(taskWriteTargets(text), runDir)) {
    return `${waitState} source-intake closeout must write _cache/promote-log.md`;
  }
  if (!/\b(close|closing|finali[sz]e|record|sync|writeback|complete)\b/i.test(text)) {
    return `terminal source-intake ${CURRENT_TASK_SLOT} must be closing fan-in for source_intake_batch_id=${cleanField(batchId)}`;
  }
  if (waitState === "integrated") {
    if (!/\b(fan[- ]in|review|promot(?:e|ion)|candidate[- ]cards?|accepted material)\b/i.test(text)) {
      return "integrated source-intake closeout must record candidate-card review or promotion evidence";
    }
    return requiredSourceIntakeEvidencePathFinding(text, batchId, runDir, new Set(["candidate-cards"]), "integrated source-intake closeout", { requireExisting: true });
  }
  if (!/\b(fail(?:ed|ure)?|suspend(?:ed)?|retrieval[- ]results?|excluded|candidate[- ]cards?|fan[- ]in|record)\b/i.test(text)) {
    return `${waitState} source-intake closeout must record failure/suspension evidence for the concrete batch`;
  }
  return requiredSourceIntakeEvidencePathFinding(text, batchId, runDir, new Set(["retrieval-results", "candidate-cards", "excluded"]), `${waitState} source-intake closeout`, { requireExisting: true });
}

function closingFanInTaskText(text, batchId, runDir, waitState) {
  return !closingFanInTaskFinding(text, batchId, runDir, waitState);
}

function directReferenceWriteTarget(target) {
  const normalized = cleanField(target).replace(/\\/g, "/");
  if (/(^|\/)(?:README|_INDEX)\.md$/i.test(normalized)) {
    return false;
  }
  return /\bREFERENCE_DIR\b/.test(target)
    || /(^|\/)seed_topics\/_reference\/.+\.md\b/i.test(normalized)
    || /(^|\/)_reference\/.+\.md\b/i.test(normalized);
}

function referenceAcquisitionTaskText(text) {
  return /\b(?:land|add|capture|create|write|store|save|record|import)\b.{0,80}\b(?:reference|source|authoritative copy)\b/i.test(text)
    || /\b(?:reference|source|authoritative copy)\b.{0,80}\b(?:land|add|capture|create|write|store|save|record|import)\b/i.test(text);
}

function directReferenceExceptionText(text) {
  const knownSource = /\b(already[- ]known|known local|known source|user[- ]provided|provided by user|local source supplied|local file supplied|local\/user[- ]provided)\b/i.test(text);
  const noRetrieval = /\b(no retrieval|without retrieval|retrieval not used|retrieval was not used)\b/i.test(text);
  const noSearch = /\b(no search|without search|search not used|search was not used)\b/i.test(text);
  const noFetch = /\b(no fetch|without fetch|fetch not used|fetch was not used)\b/i.test(text);
  return knownSource && noRetrieval && noSearch && noFetch;
}

function directRetrievalReferenceWriteFindings(taskText) {
  const findings = [];
  if (!sourceIntakeTaskText(taskText) && !referenceAcquisitionTaskText(taskText)) {
    return findings;
  }
  const writeTargets = splitPathList(parseBulletField(taskText, "writes_to"));
  if (writeTargets.some(directReferenceWriteTarget)) {
    const action = parseBulletField(taskText, "action") ?? "";
    const doneCondition = parseBulletField(taskText, "done_condition") ?? "";
    const exceptionSurface = `${action}\n${doneCondition}`;
    if (!positiveSourceIntakeTaskText(action) && directReferenceExceptionText(exceptionSurface)) {
      return findings;
    }
    findings.push(new Finding("E014", `reference acquisition ${CURRENT_TASK_SLOT} must write source-intake cache outputs first; direct REFERENCE_DIR writes are valid only for already-known local/user-provided sources with no retrieval/search/fetch`));
  }
  return findings;
}

function sourceIntakeQueueIsReset(mode, batchId, waitState) {
  return cleanField(mode) === "not_applicable"
    && cleanField(batchId) === "not_applicable"
    && cleanField(waitState) === "not_started";
}

function sourceIntakeStatusFieldFindings(directory) {
  const findings = [];
  const fields = {
    status: parseBulletField(directory, "source_intake_status"),
    runnerMode: parseBulletField(directory, "source_intake_runner_mode"),
    batchId: parseBulletField(directory, "source_intake_batch_id"),
    waitState: parseBulletField(directory, "source_intake_wait_state"),
    latestCandidateCards: parseBulletField(directory, "latest_cache_candidate_cards"),
    cachePromoteLog: parseBulletField(directory, "cache_promote_log"),
  };
  const hasStatusContract = Object.values(fields).some((value) => value !== null);
  if (!directory) {
    findings.push(new Finding("E014", "STATUS Directory / Integration State missing source-intake contract fields"));
    return { fields, hasStatusContract, findings };
  }
  if (!hasStatusContract) {
    findings.push(new Finding("E014", "STATUS Directory / Integration State must record source_intake_status, runner mode, batch id, wait state, latest candidate cards, and promote log"));
    return { fields, hasStatusContract, findings };
  }
  for (const [field, value] of Object.entries({
    source_intake_status: fields.status,
    source_intake_runner_mode: fields.runnerMode,
    source_intake_batch_id: fields.batchId,
    source_intake_wait_state: fields.waitState,
    latest_cache_candidate_cards: fields.latestCandidateCards,
    cache_promote_log: fields.cachePromoteLog,
  })) {
    if (value === null) {
      findings.push(new Finding("E014", `STATUS Directory / Integration State missing source-intake field: ${field}`));
    }
  }
  const cleanedStatus = cleanField(fields.status);
  const cleanedMode = cleanField(fields.runnerMode);
  const cleanedWait = cleanField(fields.waitState);
  if (fields.status !== null && !SOURCE_INTAKE_STATUS_VALUES.has(cleanedStatus)) {
    findings.push(new Finding("E014", `STATUS source_intake_status must be not_started, running, fan_in_ready, integrated, failed, or suspended; found ${fields.status || "missing"}`));
  }
  if (fields.runnerMode !== null && !SOURCE_INTAKE_RUNNER_MODE_VALUES.has(cleanedMode)) {
    findings.push(new Finding("E014", `STATUS source_intake_runner_mode must be inline_main_agent, foreground_subagent_runner, or not_applicable; found ${fields.runnerMode || "missing"}`));
  }
  if (fields.waitState !== null && !SOURCE_INTAKE_WAIT_STATE_VALUES.has(cleanedWait)) {
    findings.push(new Finding("E014", `STATUS source_intake_wait_state must be not_started, running, fan_in_ready, integrated, failed, or suspended; found ${fields.waitState || "missing"}`));
  }
  return { fields, hasStatusContract, findings };
}

function statusCandidateCardsInfo(fields, batchId, runDir, findings, label, { requireExisting = false } = {}) {
  const latest = fields.latestCandidateCards;
  if (!isMeaningful(latest)) {
    findings.push(new Finding("E014", `${label} must set latest_cache_candidate_cards to _cache/intake/${cleanField(batchId)}/candidate-cards.md`));
    return null;
  }
  const { finding, info } = sourceIntakeSpecificPathInfo(latest, batchId, runDir, new Set(["candidate-cards"]), label);
  if (finding) {
    findings.push(new Finding("E014", finding));
    return null;
  }
  if (requireExisting) {
    const existsFinding = sourceIntakeCacheFileExistsFinding(info, runDir, label);
    if (existsFinding) {
      findings.push(new Finding("E014", existsFinding));
    }
  }
  return info;
}

function compareStatusAndCurrentCandidatePath(fields, currentTaskText, batchId, runDir, findings, label, options = {}) {
  const statusInfo = statusCandidateCardsInfo(fields, batchId, runDir, findings, label, options);
  const currentInfo = requiredSourceIntakeEvidencePathInfo(currentTaskText, batchId, runDir, new Set(["candidate-cards"]), `${label} ${CURRENT_TASK_SLOT}`);
  if (currentInfo.finding) {
    findings.push(new Finding("E014", currentInfo.finding));
    return;
  }
  const matchingCurrentPath = (currentInfo.infos ?? []).some((info) => info.relPath === statusInfo?.relPath);
  if (statusInfo && !matchingCurrentPath) {
    findings.push(new Finding("E014", `${label} latest_cache_candidate_cards must match the candidate-card path named by QUEUE ${CURRENT_TASK_SLOT}`));
  }
}

function sourceIntakeStatusQueueFindings(texts, queueFields, currentTaskText, hasQueueContract) {
  const findings = [];
  const runDir = runDirFor(texts);
  const directory = directoryIntegrationSection(texts.status);
  const { fields, hasStatusContract, findings: fieldFindings } = sourceIntakeStatusFieldFindings(directory);
  findings.push(...fieldFindings);
  if (!hasStatusContract) {
    return findings;
  }

  const status = cleanField(fields.status);
  const statusMode = cleanField(fields.runnerMode);
  const statusBatch = cleanField(fields.batchId);
  const statusWait = cleanField(fields.waitState);
  const queueMode = cleanField(queueFields.runnerMode);
  const queueBatch = cleanField(queueFields.batchId);
  const queueWait = cleanField(queueFields.waitState);
  const activeStates = new Set(["running", "fan_in_ready"]);
  const terminalStates = new Set(["integrated", "failed", "suspended"]);
  const queueReset = sourceIntakeQueueIsReset(queueFields.runnerMode, queueFields.batchId, queueFields.waitState);
  const queueActiveOrClosing = activeStates.has(queueWait) || terminalStates.has(queueWait);
  if (!hasQueueContract) {
    findings.push(new Finding("E014", "QUEUE Active Queue missing source-intake active control fields: source_intake_runner_mode, source_intake_batch_id, source_intake_wait_state"));
  }

  if (status === "not_started") {
    if (statusMode !== "not_applicable" || statusBatch !== "not_applicable" || statusWait !== "not_started") {
      findings.push(new Finding("E014", "STATUS source_intake_status=not_started requires source_intake_runner_mode=not_applicable, source_intake_batch_id=not_applicable, and source_intake_wait_state=not_started"));
    }
    if (cleanField(fields.latestCandidateCards) !== "not_applicable") {
      findings.push(new Finding("E014", "initial STATUS source intake state must keep latest_cache_candidate_cards=not_applicable"));
    }
    if (cleanField(fields.cachePromoteLog) !== "not_applicable") {
      findings.push(new Finding("E014", "initial STATUS source intake state must keep cache_promote_log=not_applicable"));
    }
  }

  if (activeStates.has(queueWait)) {
    if (terminalStates.has(status)) {
      findings.push(new Finding("E014", "terminal STATUS source-intake outcome requires QUEUE active fields reset to not_applicable / not_applicable / not_started after closeout"));
    }
    if (status !== queueWait || statusMode !== queueMode || statusBatch !== queueBatch || statusWait !== queueWait) {
      findings.push(new Finding("E014", `STATUS source-intake fields must mirror QUEUE while source_intake_wait_state=${queueWait}`));
    }
    const batchFinding = concreteBatchIdFinding("source_intake_batch_id", queueFields.batchId);
    if (batchFinding) {
      findings.push(new Finding("E014", batchFinding));
    } else {
      compareStatusAndCurrentCandidatePath(fields, currentTaskText, queueFields.batchId, runDir, findings, `STATUS/QUEUE ${queueWait}`, { requireExisting: queueWait === "fan_in_ready" });
    }
    if (isMeaningful(fields.cachePromoteLog)) {
      findings.push(new Finding("E014", `STATUS cache_promote_log must remain not_applicable until main-agent fan-in/promotion closes; found ${fields.cachePromoteLog}`));
    }
    return findings;
  }

  if (terminalStates.has(queueWait) && !queueReset) {
    if (status !== queueWait || statusMode !== queueMode || statusBatch !== queueBatch || statusWait !== queueWait) {
      findings.push(new Finding("E014", `STATUS source-intake fields must mirror QUEUE while closing terminal source_intake_wait_state=${queueWait}`));
    }
    if (queueWait === "integrated") {
      statusCandidateCardsInfo(fields, queueFields.batchId, runDir, findings, "STATUS integrated source-intake closeout", { requireExisting: true });
    }
    const promoteInfo = isMeaningful(fields.cachePromoteLog)
      ? promoteLogPathInfo(fields.cachePromoteLog, runDir, `STATUS ${queueWait} source-intake closeout`)
      : `STATUS ${queueWait} source-intake closeout must set cache_promote_log to _cache/promote-log.md`;
    const promoteFinding = typeof promoteInfo === "string" ? promoteInfo : promoteInfo.finding;
    if (promoteFinding) {
      findings.push(new Finding("E014", promoteFinding));
    } else {
      const existsFinding = sourceIntakeCacheFileExistsFinding(promoteInfo.info, runDir, `STATUS ${queueWait} source-intake closeout`);
      if (existsFinding) {
        findings.push(new Finding("E014", existsFinding));
      }
    }
    return findings;
  }

  if (activeStates.has(status) && !queueActiveOrClosing) {
    findings.push(new Finding("E014", `STATUS source_intake_status=${status} requires QUEUE active source-intake fields to mirror it`));
  }

  if (terminalStates.has(status)) {
    if (!queueReset && !terminalStates.has(queueWait)) {
      findings.push(new Finding("E014", `terminal STATUS source-intake outcome requires QUEUE active fields reset to not_applicable / not_applicable / not_started unless ${CURRENT_TASK_SLOT} is still closing fan-in`));
    }
    const batchFinding = concreteBatchIdFinding("STATUS source_intake_batch_id", fields.batchId);
    if (batchFinding) {
      findings.push(new Finding("E014", batchFinding));
    }
    if (statusMode !== "not_applicable") {
      findings.push(new Finding("E014", `terminal STATUS source_intake_status=${status} requires source_intake_runner_mode=not_applicable; found ${fields.runnerMode || "missing"}`));
    }
    if (statusWait !== "not_started") {
      findings.push(new Finding("E014", `terminal STATUS source_intake_status=${status} requires source_intake_wait_state=not_started after closeout; found ${fields.waitState || "missing"}`));
    }
    if (status === "integrated") {
      statusCandidateCardsInfo(fields, fields.batchId, runDir, findings, "STATUS integrated source-intake outcome", { requireExisting: true });
    } else {
      if (isMeaningful(fields.latestCandidateCards)) {
        const candidateFinding = optionalCandidateCardStatusPathFinding(fields.latestCandidateCards, fields.batchId, runDir, `STATUS ${status} source-intake outcome`, { requireExisting: true });
        if (candidateFinding) {
          findings.push(new Finding("E014", candidateFinding));
        }
      }
    }
    const promoteInfo = isMeaningful(fields.cachePromoteLog)
      ? promoteLogPathInfo(fields.cachePromoteLog, runDir, `STATUS ${status} source-intake outcome`)
      : `STATUS ${status} source-intake outcome must set cache_promote_log to _cache/promote-log.md`;
    const promoteFinding = typeof promoteInfo === "string" ? promoteInfo : promoteInfo.finding;
    if (promoteFinding) {
      findings.push(new Finding("E014", promoteFinding));
    } else {
      const existsFinding = sourceIntakeCacheFileExistsFinding(promoteInfo.info, runDir, `STATUS ${status} source-intake outcome`);
      if (existsFinding) {
        findings.push(new Finding("E014", existsFinding));
      }
    }
  }

  return findings;
}

function sourceIntakeTaskFindings(taskLabel, taskText, batchId, runDir) {
  const findings = [];
  const writeTargets = splitPathList(parseBulletField(taskText, "writes_to"));
  if (writeTargets.length === 0) {
    findings.push(new Finding("E014", `${taskLabel} source-intake task must assign exact _cache writes_to paths`));
    return findings;
  }
  const requiredKinds = new Map([
    ["intake-request", `_cache/intake/${cleanField(batchId)}/intake-request.md`],
    ["retrieval-results", `_cache/intake/${cleanField(batchId)}/retrieval-results.md`],
    ["candidate-cards", `_cache/intake/${cleanField(batchId)}/candidate-cards.md`],
    ["capture-manifest", `_cache/intake/${cleanField(batchId)}/capture-manifest.md`],
    ["excluded", `_cache/excluded/${cleanField(batchId)}-excluded.md`],
  ]);
  const seenKinds = new Set();
  for (const target of writeTargets) {
    const normalized = target.replace(/\\/g, "/");
    if (/\b(STATUS_PATH|QUEUE_PATH|TRACE_PATH|PLAN_PATH|REFERENCE_DIR|ARTIFACT_DIR|TOPIC_ROOT)\b/.test(target)
      || /(^|\/)seed_topics\/_reference\//.test(normalized)
      || /(^|\/)_reference\//.test(normalized)
      || /(^|\/)seed_topics\/_artifacts\//.test(normalized)) {
      findings.push(new Finding("E014", `${taskLabel} source-intake writes_to must stay in exact _cache staging paths until main-agent fan-in; found ${target}`));
      continue;
    }
    const info = sourceIntakeCachePathInfo(target, batchId, runDir);
    if (info.error) {
      findings.push(new Finding("E014", info.error));
      continue;
    }
    if (info.kind === "promote-log") {
      findings.push(new Finding("E014", `source intake runner must not write _cache/promote-log.md before main-agent fan-in: ${target}`));
      continue;
    }
    if (info.kind === "capture") {
      findings.push(new Finding("E014", `source intake runner must write _cache/intake/${cleanField(batchId)}/capture-manifest.md instead of predeclaring _cache/captures paths: ${target}`));
      continue;
    }
    seenKinds.add(info.kind);
  }
  for (const [kind, expectedPath] of requiredKinds) {
    if (!seenKinds.has(kind)) {
      findings.push(new Finding("E014", `${taskLabel} source-intake task must write ${expectedPath}`));
    }
  }
  return findings;
}

function sourceIntakeQueueFindings(texts) {
  const findings = [];
  const queue = texts.queue;
  const runDir = runDirFor(texts);
  const active = activeQueueSection(queue);
  const runnerMode = parseBulletField(active, "source_intake_runner_mode");
  const batchId = parseBulletField(active, "source_intake_batch_id");
  const waitState = parseBulletField(active, "source_intake_wait_state");
  const hasQueueContract = runnerMode !== null || batchId !== null || waitState !== null;
  const currentTask = taskSection(queue, CURRENT_TASK_SLOT);
  const currentAction = taskAction(queue, CURRENT_TASK_SLOT);
  const currentTaskText = `${currentAction}\n${currentTask}`;
  const currentTaskHasDirectReferenceException = directReferenceExceptionText(currentTaskText);
  const currentTaskIsSourceIntake = sourceIntakeTaskText(currentTaskText) && !currentTaskHasDirectReferenceException;
  const fanInFinding = fanInPromotionTaskFinding(currentTaskText, batchId, runDir);
  const currentTaskIsFanInPromotion = !fanInFinding;
  const closingFanInFinding = closingFanInTaskFinding(currentTaskText, batchId, runDir, cleanField(waitState));
  const currentTaskIsClosingFanIn = !closingFanInFinding;
  findings.push(...sourceIntakeStatusQueueFindings(
    texts,
    { runnerMode, batchId, waitState },
    currentTaskText,
    hasQueueContract,
  ));
  if (!hasQueueContract) {
    if (currentTaskIsSourceIntake) {
      findings.push(new Finding("E014", `source-intake ${CURRENT_TASK_SLOT} must record source_intake_runner_mode, source_intake_batch_id, and source_intake_wait_state`));
    }
    if (!currentTaskIsFanInPromotion && !currentTaskIsClosingFanIn) {
      findings.push(...directRetrievalReferenceWriteFindings(currentTaskText));
    }
    return findings;
  }
  const cleanedMode = cleanField(runnerMode);
  const cleanedWaitState = cleanField(waitState);
  if (!SOURCE_INTAKE_RUNNER_MODE_VALUES.has(cleanedMode)) {
    findings.push(new Finding("E014", `source_intake_runner_mode must be inline_main_agent, foreground_subagent_runner, or not_applicable; found ${runnerMode || "missing"}`));
  }
  if (!SOURCE_INTAKE_WAIT_STATE_VALUES.has(cleanedWaitState)) {
    findings.push(new Finding("E014", `source_intake_wait_state must be not_started, running, fan_in_ready, integrated, failed, or suspended; found ${waitState || "missing"}`));
  }
  if (cleanedMode === "not_applicable") {
    if (currentTaskIsSourceIntake) {
      findings.push(new Finding("E014", `source-intake ${CURRENT_TASK_SLOT} must use inline_main_agent or foreground_subagent_runner, not source_intake_runner_mode=not_applicable`));
    }
    if (cleanedWaitState === "running") {
      findings.push(new Finding("E014", "source_intake_runner_mode=not_applicable cannot use source_intake_wait_state=running"));
    }
    if (cleanedWaitState === "not_started" && cleanField(batchId) !== "not_applicable") {
      findings.push(new Finding("E014", `source_intake_runner_mode=not_applicable with source_intake_wait_state=not_started requires source_intake_batch_id=not_applicable exactly; found ${batchId || "missing"}`));
    }
    if (cleanedWaitState === "fan_in_ready") {
      const batchFinding = concreteBatchIdFinding("source_intake_batch_id", batchId);
      if (batchFinding) {
        findings.push(new Finding("E014", "source_intake_wait_state=fan_in_ready requires a concrete source_intake_batch_id"));
      }
      if (!currentTaskIsFanInPromotion) {
        findings.push(new Finding("E014", fanInFinding));
      }
    }
    if (["integrated", "failed", "suspended"].includes(cleanedWaitState) && !currentTaskIsClosingFanIn) {
      findings.push(new Finding("E014", `terminal source_intake_wait_state=${cleanedWaitState} must reset active queue fields to not_applicable / not_applicable / not_started unless ${CURRENT_TASK_SLOT} is closing fan-in for a concrete batch`));
      if (closingFanInFinding) {
        findings.push(new Finding("E014", closingFanInFinding));
      }
    }
    if (!currentTaskIsFanInPromotion && !currentTaskIsClosingFanIn) {
      findings.push(...directRetrievalReferenceWriteFindings(currentTaskText));
    }
    return findings;
  }
  if (cleanedMode === "inline_main_agent") {
    if (!currentTaskIsSourceIntake) {
      findings.push(new Finding("E014", "inline_main_agent source intake must be the current queue-visible source-intake task"));
    }
    const batchFinding = concreteBatchIdFinding("source_intake_batch_id", batchId);
    if (batchFinding) {
      findings.push(new Finding("E014", "inline_main_agent source intake requires a concrete source_intake_batch_id"));
    }
    if (cleanedWaitState !== "running") {
      findings.push(new Finding("E014", `inline_main_agent current source-intake task must use source_intake_wait_state=running until cache outputs or failure move the queue to fan-in; found ${waitState || "missing"}`));
    }
    findings.push(...sourceIntakeTaskFindings("inline_main_agent", currentTask, batchId, runDir));
    return findings;
  }
  if (cleanedMode !== "foreground_subagent_runner") {
    return findings;
  }
  if (cleanedWaitState !== "running") {
    findings.push(new Finding("E014", `foreground_subagent_runner current source-intake task must use source_intake_wait_state=running until candidate cards/exclusions or failure move the queue to fan-in; found ${waitState || "missing"}`));
  }
  const executionMode = parseBulletField(active, "execution_mode");
  if (cleanField(executionMode) !== "sequential") {
    findings.push(new Finding("E014", `foreground_subagent_runner is queue-visible source intake inside execution_mode=sequential; found ${executionMode || "missing"}`));
  }
  const batchFinding = concreteBatchIdFinding("source_intake_batch_id", batchId);
  if (batchFinding) {
    findings.push(new Finding("E014", "foreground_subagent_runner requires a concrete source_intake_batch_id"));
  }
  if (!currentTaskIsSourceIntake) {
    findings.push(new Finding("E014", "foreground_subagent_runner must be the current queue-visible source intake task"));
  }
  findings.push(...sourceIntakeTaskFindings("foreground_subagent_runner", currentTask, batchId, runDir));
  return findings;
}

function sequentialRollingWindowFindings(queue) {
  const findings = [];
  for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
    const section = taskSection(queue, taskName);
    if (!section) {
      findings.push(new Finding("E014", `Rolling Task Projection requires ${taskName} when execution_mode=sequential and queue is not closed`));
      continue;
    }
    const action = taskAction(queue, taskName);
    if (!executableTaskValue(action)) {
      findings.push(new Finding("E014", `Rolling Task Projection requires executable ${taskName}.action; found ${action || "missing"}`));
      continue;
    }
    if (taskMarkedComplete(section)) {
      findings.push(new Finding("E014", `${taskName} is marked complete; promote/refill the rolling window before runtime PASS`));
    }
    findings.push(...taskLineageFindings(taskName, section));
  }
  return findings;
}

function concreteTaskField(section, field) {
  const value = parseBulletField(section, field);
  return isMeaningful(value) && !cleanField(value).includes("<") && !cleanField(value).includes(">");
}

function taskLineageFindings(taskName, section) {
  const findings = [];
  const lineageFields = ["source_gap", "status_gap", "gate_gap", "plan_target", "trigger"];
  if (!lineageFields.some((field) => concreteTaskField(section, field))) {
    findings.push(new Finding("E014", `${taskName} must name the STATUS gap, gate gap, PLAN target, or trigger that produced this queue task`));
  }
  for (const field of ["done_condition", "writes_to", "status_sync"]) {
    if (!concreteTaskField(section, field)) {
      findings.push(new Finding("E014", `${taskName} must include concrete ${field} so execution can write back instead of drifting`));
    }
  }
  return findings;
}

export function rollingTaskProjectionFindings(texts) {
  const findings = [];
  const queue = texts.queue;
  const status = texts.status;
  const active = activeQueueSection(queue);
  const operatorView = operatorViewSection(status);
  const health = parseBulletField(queue, "queue_health");
  const executionMode = parseBulletField(queue, "execution_mode");
  const currentMode = parseBulletField(status, "current_mode");
  const projectionFields = [
    ["task_window_mode", "rolling_execution_window"],
    ["platform_task_projection", PLATFORM_TASK_PROJECTION_VALUES],
    ["projection_authority", ["QUEUE_PATH", "owns native projection state", "projection"]],
    ["projection_surfaces", ["claude_native_todo_or_task_tools_when_available", "codex_native_plan_or_todo_surface_when_available", "queue_only_fallback"]],
    ["active_window", ["sequential", "slot_1_current", "slot_2_next", "slot_3_pending", "slot_4_pending", "slot_5_tail"]],
    ["projection_minimum", ["one in_progress executable task", "four pending executable tasks"]],
    ["completion_requires", ["write result", "sync STATUS/QUEUE", "promote/refill window", "Pre-Response Gate"]],
    ["slash_command_boundary", ["slash commands", "/goal", "not framework-controlled queue actions"]],
  ];

  for (const [field, expected] of projectionFields) {
    const value = parseBulletField(active, field);
    if (!value) {
      findings.push(new Finding("E014", `QUEUE Active Queue missing Rolling Task Projection field: ${field}`));
      continue;
    }
    if (expected instanceof Set) {
      if (!expected.has(cleanField(value))) {
        findings.push(new Finding("E014", `QUEUE Active Queue ${field} has invalid value: ${value}`));
      }
    } else if (Array.isArray(expected)) {
      for (const token of expected) {
        if (!fieldContainsAll(value, [token])) {
          findings.push(new Finding("E014", `QUEUE Active Queue ${field} missing token: ${token}`));
        }
      }
    } else if (cleanField(value) !== expected) {
      findings.push(new Finding("E014", `QUEUE Active Queue ${field} must be ${expected}; found ${value}`));
    }
  }

  const taskProjectionState = parseBulletField(operatorView, "task_projection_state");
  if (!taskProjectionState || !TASK_PROJECTION_STATES.has(cleanField(taskProjectionState))) {
    findings.push(new Finding("E014", `STATUS Operator View task_projection_state must be active, unavailable_queue_only, or needs_sync; found ${taskProjectionState || "missing"}`));
  }
  if (cleanField(taskProjectionState) === "active" && cleanField(parseBulletField(active, "platform_task_projection")) === "unavailable_queue_only") {
    findings.push(new Finding("E014", "STATUS task_projection_state=active conflicts with QUEUE platform_task_projection=unavailable_queue_only"));
  }
  if (cleanField(taskProjectionState) === "needs_sync" && currentMode === "execution" && health !== "closed") {
    findings.push(new Finding("E014", "STATUS task_projection_state=needs_sync must be resolved to active or unavailable_queue_only during execution"));
  }

  if (health === "closed") {
    return findings;
  }

  if (cleanField(executionMode) !== "sequential") {
    findings.push(new Finding("E014", `Rolling Task Projection supports execution_mode=sequential only; found ${executionMode || "missing"}`));
    return findings;
  }

  findings.push(...sequentialRollingWindowFindings(queue));
  return findings;
}

function queueTaskActionEntries(queue) {
  const entries = [];
  const active = activeQueueSection(queue);
  const refill = hierarchicalSectionText(queue, "Refill Pool");
  const target = `${active}\n${refill}`;
  let currentHeading = "Active Queue";
  for (const line of target.split(/\r?\n/)) {
    const heading = line.match(/^#{3,6}\s+(.+?)\s*$/);
    if (heading) {
      currentHeading = cleanField(heading[1]);
      continue;
    }
    const bullet = line.match(/^\s*-\s*(action|candidate|slot_1_current|slot_2_next|slot_3_pending|slot_4_pending|slot_5_tail)\s*:\s*`?(.+?)`?\s*$/i);
    if (bullet) {
      entries.push({
        section: currentHeading,
        field: cleanField(bullet[1]),
        value: cleanField(bullet[2]),
      });
    }
  }
  return entries;
}

function proposedAssistantResponse(texts) {
  return texts.response
    || texts.proposedResponse
    || texts.proposed_response
    || texts.assistantResponse
    || texts.assistant_response
    || "";
}

export function preResponseGateFindings(texts) {
  const findings = [];
  const queue = texts.queue;
  const status = texts.status;
  const active = activeQueueSection(queue);
  const operatorView = operatorViewSection(status);
  const expectedFields = [
    ["autonomy_mode", "strict_silent_autonomous"],
    ["pre_response_gate", "required"],
    ["allowed_output_states", PRE_RESPONSE_ALLOWED_STATES],
    ["default_if_gate_fails", "continue_with_next_tool_or_file_action"],
    ["batch_boundary_rule", ["queue promotion", "next action", "not a user report"]],
    ["forbidden_output_states", PRE_RESPONSE_FORBIDDEN_STATES],
  ];

  for (const [field, expected] of expectedFields) {
    const value = parseBulletField(active, field);
    if (!value) {
      findings.push(new Finding("E014", `QUEUE Active Queue missing Pre-Response Gate field: ${field}`));
      continue;
    }
    if (Array.isArray(expected)) {
      for (const token of expected) {
        if (!fieldContainsAll(value, [token])) {
          findings.push(new Finding("E014", `QUEUE Active Queue ${field} missing token: ${token}`));
        }
      }
    } else if (cleanField(value) !== expected) {
      findings.push(new Finding("E014", `QUEUE Active Queue ${field} must be ${expected}; found ${value}`));
    }
  }

  const userVisible = parseBulletField(operatorView, "user_visible_output_authorized");
  if (!userVisible || !PRE_RESPONSE_ALLOWED_STATES.every((state) => userVisible.includes(state))) {
    findings.push(new Finding("E014", "STATUS Operator View must state user_visible_output_authorized is no until final_delivery, decision_blocker, or empty_queue_after_refill"));
  }
  const routineProgress = parseBulletField(operatorView, "routine_progress_location");
  if (!routineProgress || !/STATUS\/QUEUE\/TRACE\/local artifacts, not chat/i.test(routineProgress)) {
    findings.push(new Finding("E014", "STATUS Operator View must route routine progress to STATUS/QUEUE/TRACE/local artifacts, not chat"));
  }

  const authorized = stopAuthorizationSnapshot(texts).authorized;
  for (const entry of queueTaskActionEntries(queue)) {
    for (const [label, pattern, allowedWhenAuthorized] of REPORT_OR_WAIT_TASK_PATTERNS) {
      if (pattern.test(entry.value) && (!authorized || !allowedWhenAuthorized)) {
        findings.push(new Finding(
          "E014",
          `QUEUE ${entry.section}.${entry.field} is forbidden routine user-output work${allowedWhenAuthorized ? " without final delivery, concrete blocker, or empty_queue_after_refill" : ""}: ${label} (${entry.value})`,
        ));
      }
    }
  }

  const responseText = proposedAssistantResponse(texts);
  if (responseText && !authorized) {
    for (const [label, pattern] of REPORT_OR_WAIT_TASK_PATTERNS) {
      if (pattern.test(responseText)) {
        findings.push(new Finding(
          "E014",
          `proposed assistant response is forbidden while user-visible output is unauthorized: ${label}`,
        ));
      }
    }
  }

  if (parseBulletField(queue, "queue_health") === "blocked" && !concreteDecisionBlocker(status, queue, texts.profile ?? "")) {
    findings.push(new Finding("E014", "queue_health=blocked must sync a concrete Blocked State and STATUS blocking_issue before user-visible interruption is authorized"));
  }

  return findings;
}
