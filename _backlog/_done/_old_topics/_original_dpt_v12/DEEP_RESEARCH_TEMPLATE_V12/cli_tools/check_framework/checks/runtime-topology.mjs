import { dirname } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import {
  TOPOLOGY_DELTA_DISPOSITION_VALUES,
  TOPOLOGY_SYNC_STATE_VALUES,
} from "../contracts/constants.mjs";
import {
  appendOnlyTopicIdFindings,
  cleanField,
  decisionWords,
  extractTopicIds,
  gateRepairGroups,
  hasConcreteTopicQueueWork,
  hasGateRepairQueueWork,
  instanceConfigValue,
  isMeaningful,
  queueWorkSurface,
  resolveCandidatePath,
  seedFileExistsUnderTopicRoot,
  splitTopologyEntries,
  topicIdPattern,
  topicRegistrySeedFiles,
} from "./runtime-shared.mjs";

export function topologyDeltaFindings(root, files, texts) {
  const findings = [];
  const status = texts.status;
  const plan = texts.plan;
  const queue = texts.queue;
  const trace = texts.trace;
  const queueWork = queueWorkSurface(queue);
  const requiredStatusFields = [
    "pending_topic_candidates",
    "candidate_dispositions",
    "trigger_refs",
    "affected_gates",
    "new_topic_ids",
    "reopen_consequence",
    "formalization_sync_note",
  ];

  for (const field of requiredStatusFields) {
    if (parseBulletField(status, field) === null) {
      findings.push(new Finding("E015", `STATUS Topology Delta missing field: ${field}`));
    }
  }

  const pendingCandidates = parseBulletField(status, "pending_topic_candidates");
  const dispositions = parseBulletField(status, "candidate_dispositions");
  const triggerRefs = parseBulletField(status, "trigger_refs");
  const affectedGates = parseBulletField(status, "affected_gates");
  const newTopicIds = parseBulletField(status, "new_topic_ids");
  const reopenConsequence = parseBulletField(status, "reopen_consequence");
  const syncState = parseBulletField(status, "topology_sync_state");
  const formalizationSyncNote = parseBulletField(status, "formalization_sync_note");
  const currentGate = parseBulletField(status, "current_gate");
  const gateReopenState = parseBulletField(status, "gate_reopen_state");
  const reopenedFromGate = parseBulletField(status, "reopened_from_gate");
  const reopenReason = parseBulletField(status, "reopen_reason");
  const invalidatedClaims = parseBulletField(status, "invalidated_claims");
  const unresolvedDriftCandidates = parseBulletField(status, "unresolved_new_topic_candidates");

  const hasPendingCandidate = isMeaningful(pendingCandidates);
  const hasDisposition = isMeaningful(dispositions);
  const candidateEntries = splitTopologyEntries(pendingCandidates);
  const dispositionEntries = splitTopologyEntries(dispositions);
  if (hasPendingCandidate && !hasDisposition) {
    findings.push(new Finding("E015", "pending topology candidate has no disposition; triage must choose merge_existing, formalize_new_topic, suspend, archive, or redirect"));
  }
  if (isMeaningful(unresolvedDriftCandidates) && !hasPendingCandidate) {
    findings.push(new Finding("E015", "Topology Drift Review has unresolved_new_topic_candidates but STATUS Topology Delta.pending_topic_candidates is empty"));
  }
  if (syncState === null) {
    findings.push(new Finding("E015", "STATUS Plan / Status Sync missing topology_sync_state"));
  } else if (!TOPOLOGY_SYNC_STATE_VALUES.has(cleanField(syncState))) {
    findings.push(new Finding("E015", `STATUS topology_sync_state has invalid enum value: ${syncState}`));
  }

  const decisions = decisionWords(dispositions);
  const finalDecisions = decisions.filter((decision) => TOPOLOGY_DELTA_DISPOSITION_VALUES.has(decision));
  if (hasDisposition && finalDecisions.length === 0) {
    findings.push(new Finding("E015", `candidate_dispositions has no valid topology decision: ${dispositions}`));
  }
  if (hasDisposition && dispositionEntries.length !== finalDecisions.length) {
    findings.push(new Finding("E015", "each candidate_dispositions entry must contain exactly one final topology decision"));
  }
  if (hasPendingCandidate && hasDisposition && candidateEntries.length !== finalDecisions.length) {
    findings.push(new Finding("E015", `pending topology candidate count does not match final disposition count: candidates=${candidateEntries.length}, decisions=${finalDecisions.length}`));
  }

  const formalized = finalDecisions.includes("formalize_new_topic") || isMeaningful(newTopicIds);
  const topicIds = extractTopicIds(newTopicIds);
  const formalizeDecisionCount = finalDecisions.filter((decision) => decision === "formalize_new_topic").length;
  if (finalDecisions.includes("formalize_new_topic") && topicIds.length === 0) {
    findings.push(new Finding("E015", "formalize_new_topic disposition requires STATUS new_topic_ids"));
  }
  if (!finalDecisions.includes("formalize_new_topic") && topicIds.length > 0) {
    findings.push(new Finding("E015", "STATUS new_topic_ids is populated but candidate_dispositions has no formalize_new_topic decision"));
  }
  if (formalizeDecisionCount > 0 && topicIds.length !== formalizeDecisionCount) {
    findings.push(new Finding("E015", `formalize_new_topic decision count does not match new_topic_ids count: decisions=${formalizeDecisionCount}, new_topic_ids=${topicIds.length}`));
  }

  if (formalized) {
    if (!isMeaningful(triggerRefs)) {
      findings.push(new Finding("E015", "formalized topology delta requires trigger_refs"));
    }
    if (!isMeaningful(affectedGates)) {
      findings.push(new Finding("E015", "formalized topology delta requires affected_gates"));
    }
    if (!isMeaningful(reopenConsequence)) {
      findings.push(new Finding("E015", "formalized topology delta requires reopen_consequence"));
    }
    if (!/topology_formalization|topology formalization/i.test(trace)) {
      findings.push(new Finding("E015", "formalized topology delta requires TRACE topology_formalization entry"));
    }
    if (syncState !== "synced") {
      findings.push(new Finding("E015", `formalized topology delta cannot pass runtime check until topology_sync_state=synced; found ${syncState || "missing"}`));
    }
    if (!isMeaningful(formalizationSyncNote)) {
      findings.push(new Finding("E015", "formalized topology delta requires formalization_sync_note"));
    }

    const runRoot = dirname(files.status);
    const topicRoot = resolveCandidatePath(runRoot, root, instanceConfigValue(plan, "topic_root"));
    findings.push(...appendOnlyTopicIdFindings(plan, topicIds));
    for (const topicId of topicIds) {
      const idPattern = topicIdPattern(topicId);
      const planSurfaces = [
        ["PLAN Topic Registry", hierarchicalSectionText(plan, "Topic Registry")],
        ["PLAN Seed Topic Intake Matrix", hierarchicalSectionText(plan, "Seed Topic Intake Matrix")],
        ["PLAN Topic Goals", hierarchicalSectionText(plan, "Topic Goals")],
      ];
      for (const [surface, text] of planSurfaces) {
        if (!idPattern.test(text)) {
          findings.push(new Finding("E015", `formalized topic id missing from ${surface}: ${topicId}`));
        }
      }
      if (!hasConcreteTopicQueueWork(queueWork, topicId)) {
        findings.push(new Finding("E015", `formalized topic lacks concrete QUEUE active/refill work for intake, evidence, seed backfill, artifact, or repair: ${topicId}`));
      }
      const seedFiles = topicRegistrySeedFiles(plan, topicId);
      if (seedFiles.length === 0) {
        findings.push(new Finding("E015", `formalized topic missing concrete seed_files entry in PLAN Topic Registry: ${topicId}`));
      } else if (!seedFiles.some((seedPath) => seedFileExistsUnderTopicRoot(runRoot, topicRoot, seedPath))) {
        findings.push(new Finding("E015", `formalized topic seed_files do not resolve under TOPIC_ROOT: ${topicId} (${seedFiles.join(", ")})`));
      }
    }
  }

  const reopenActive = [gateReopenState, reopenedFromGate, reopenReason, invalidatedClaims].some(isMeaningful);
  if (reopenActive) {
    for (const [field, value] of [
      ["gate_reopen_state", gateReopenState],
      ["reopened_from_gate", reopenedFromGate],
      ["reopen_reason", reopenReason],
      ["invalidated_claims", invalidatedClaims],
    ]) {
      if (!isMeaningful(value)) {
        findings.push(new Finding("E015", `gate reopen is active but STATUS ${field} is missing or empty`));
      }
    }
    const repairGroups = gateRepairGroups(reopenedFromGate, affectedGates, reopenConsequence);
    if (repairGroups.length === 0) {
      findings.push(new Finding("E015", "gate reopen is recorded but STATUS does not name a concrete affected gate or wave"));
    } else if (!hasGateRepairQueueWork(queueWork, repairGroups)) {
      findings.push(new Finding("E015", "gate reopen is recorded but QUEUE active/refill work lacks affected-wave repair or refill work"));
    }
  }

  if (currentGate === "readiness_passed" && (hasPendingCandidate || formalized) && !reopenActive) {
    findings.push(new Finding("E015", "readiness_passed cannot carry substantive topology delta without reopening the affected earlier gate"));
  }

  return findings;
}
