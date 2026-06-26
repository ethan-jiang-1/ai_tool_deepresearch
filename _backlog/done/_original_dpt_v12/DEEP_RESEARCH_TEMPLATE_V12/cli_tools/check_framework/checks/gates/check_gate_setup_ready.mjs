import { ACTIVE_QUEUE_TASK_SLOTS, CLOSED_TASK_VALUES } from "../../contracts/constants.mjs";
import { Finding } from "../../lib/finding.mjs";
import {
  commandEntrypointFindings,
  controlFilesAtRunRootFindings,
  controlFilesOutsideFrameworkFindings,
  frameworkContentDriftFindings,
  frameworkPresenceFindings,
  frameworkSnapshotFindings,
  frameworkStateFindings,
  frameworkVersionFindings,
  instancePathsOutsideFrameworkFindings,
  mutableRunDirectoryFindings,
  originalTopicLayoutFindings,
  runRootAgentContractFindings,
  runRootFor,
  standardRunLayoutFindings,
} from "../../lib/bundle.mjs";
import { firstMarkdownTable, hierarchicalSectionText, parseBulletField } from "../../lib/markdown.mjs";
import { seedIntakeFindings } from "../check-instantiation.mjs";
import { surfaceFindings } from "../check-surfaces.mjs";
import {
  activeQueueSection,
  cleanField,
  instanceConfigValue,
  isMeaningful,
  taskAction,
  taskSection,
} from "../runtime-shared.mjs";
import { sectionFieldFindings, checkStandaloneGate } from "./check_gate_common.mjs";

function executableAction(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned)
    && !cleaned.includes("<")
    && !cleaned.includes(">")
    && !CLOSED_TASK_VALUES.has(cleaned.toLowerCase());
}

function setupReadyQueueFindings(queue) {
  const findings = [];
  const active = activeQueueSection(queue);
  if (!active) {
    return [new Finding("E007", "setup_ready requires QUEUE ## Active Queue section")];
  }

  const health = cleanField(parseBulletField(active, "queue_health"));
  if (!["ready", "thin"].includes(health)) {
    findings.push(new Finding("E007", `setup_ready requires active QUEUE queue_health=ready or thin; found ${health || "missing"}`));
  }

  const executionMode = cleanField(parseBulletField(active, "execution_mode"));
  if (executionMode !== "sequential") {
    findings.push(new Finding("E007", `setup_ready requires QUEUE execution_mode=sequential; found ${executionMode || "missing"}`));
  }

  for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
    const section = taskSection(queue, taskName);
    if (!section) {
      findings.push(new Finding("E007", `setup_ready requires QUEUE ${taskName} section`));
      continue;
    }
    const action = taskAction(queue, taskName);
    if (!executableAction(action)) {
      findings.push(new Finding("E007", `setup_ready requires executable QUEUE ${taskName}.action; found ${action || "missing"}`));
    }
  }
  return findings;
}

function setupReadyStatusFindings(status) {
  const findings = sectionFieldFindings(status, "Setup Ready Transition", [
      ["setup_ready_status", "ready"],
      ["execution_workspace_ready", "yes"],
      ["navigation_stubs_ready", "yes"],
      ["topic_root_alignment_ready", "yes"],
      ["seed_growth_sections_ready", "yes"],
      ["status_queue_sync_ready", "yes"],
  ]);
  const section = hierarchicalSectionText(status, "Setup Ready Transition");
  const seedReady = cleanField(parseBulletField(section, "seed_topic_intake_ready"));
  if (!["yes", "gap_queue_backed"].includes(seedReady)) {
    findings.push(new Finding("E007", `Setup Ready Transition.seed_topic_intake_ready must be yes or gap_queue_backed; found ${seedReady || "missing"}`));
  }
  return findings;
}

function fieldIsConcrete(value) {
  const cleaned = cleanField(value);
  return Boolean(cleaned)
    && !cleaned.includes("<")
    && !cleaned.includes(">")
    && !["none", "not_applicable", "not applicable", "not_started", "not assessed", "not_assessed", "unknown", "n/a"].includes(cleaned.toLowerCase());
}

function isNoneLike(value) {
  return ["none", "not_applicable", "not applicable", "n/a"].includes(cleanField(value).toLowerCase());
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

function tableRows(text, sectionName) {
  return firstMarkdownTable(hierarchicalSectionText(text, sectionName)).rows;
}

function confirmedTopicRows(plan) {
  return tableRows(plan, "Topic Registry").filter((row) => {
    return fieldIsConcrete(rowCell(row, ["id", "topic_id"]))
      || fieldIsConcrete(rowCell(row, ["slug", "topic_slug"]))
      || fieldIsConcrete(rowCell(row, ["title"]))
      || fieldIsConcrete(rowCell(row, ["must_answer", "must answer"]));
  });
}

function intakeRows(plan) {
  return tableRows(plan, "Seed Topic Intake Matrix").filter((row) => {
    return fieldIsConcrete(rowCell(row, ["topic", "id", "topic_id"]));
  });
}

function rowHasIntakeGap(row) {
  const status = rowCell(row, ["intake_status", "intake status"]).toLowerCase();
  const gap = rowCell(row, ["intake_gap", "intake gap"]).toLowerCase();
  const queueConsequence = rowCell(row, ["queue_consequence", "queue consequence"]).toLowerCase();
  return status !== "ready"
    || (fieldIsConcrete(gap) && !["none", "not_applicable", "not applicable"].includes(gap))
    || (fieldIsConcrete(queueConsequence) && !["none", "not_applicable", "not applicable"].includes(queueConsequence));
}

function parseTopicKey(value) {
  const cleaned = cleanField(value);
  const match = cleaned.match(/\b([^/\s`|]+)\/([^/\s`|]+)\b/);
  if (match) {
    return { id: match[1], slug: match[2], label: `${match[1]}/${match[2]}` };
  }
  return { id: cleaned, slug: "", label: cleaned };
}

function queueMentionsTopicRepair(queue, id, slug) {
  const idPattern = id ? id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const slugPattern = slug ? slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  if (!idPattern && !slugPattern) {
    return false;
  }
  const topicPattern = new RegExp(`\\b(?:${[idPattern, slugPattern].filter(Boolean).join("|")})\\b`, "i");
  const repairPattern = /\b(clarif|intake|seed|topic|repair|backfill|decompose|context|guardrail|original_topic)\b/i;
  return queue.split(/\r?\n/).some((line) => topicPattern.test(line) && repairPattern.test(line));
}

function setupIntakeGapBackingFindings(texts) {
  const findings = [];
  for (const row of intakeRows(texts.plan)) {
    const status = rowCell(row, ["intake_status", "intake status"]).toLowerCase();
    const gap = rowCell(row, ["intake_gap", "intake gap"]);
    const queueConsequence = rowCell(row, ["queue_consequence", "queue consequence"]);
    const hasGapStatus = ["gap", "assumption", "gap_queue_backed"].includes(status);
    const hasGap = fieldIsConcrete(gap) && !isNoneLike(gap);
    const hasConsequence = fieldIsConcrete(queueConsequence) && !isNoneLike(queueConsequence);
    if (!hasGapStatus && !hasGap && !hasConsequence) {
      continue;
    }
    const topic = parseTopicKey(rowCell(row, ["topic", "id", "topic_id"]));
    if (!hasGap) {
      findings.push(new Finding("E007", `Setup Ready Transition intake row ${topic.label || "unknown"} has ${status || "gap"} status/consequence but lacks concrete intake_gap`));
    }
    if (!hasConsequence) {
      findings.push(new Finding("E007", `Setup Ready Transition intake row ${topic.label || "unknown"} has intake gap but lacks concrete queue_consequence`));
    }
    if (!queueMentionsTopicRepair(texts.queue, topic.id, topic.slug)) {
      findings.push(new Finding("E007", `Setup Ready Transition intake row ${topic.label || "unknown"} has intake gap but QUEUE lacks concrete repair work for the affected topic`));
    }
  }
  return findings;
}

function setupSeedIntakeConsistencyFindings(texts) {
  const findings = [];
  const section = hierarchicalSectionText(texts.status, "Setup Ready Transition");
  const seedReady = cleanField(parseBulletField(section, "seed_topic_intake_ready"));
  const topics = confirmedTopicRows(texts.plan);
  const intakes = intakeRows(texts.plan);
  const hasIntakeGap = intakes.some(rowHasIntakeGap);

  if (seedReady === "yes") {
    if (topics.length === 0) {
      findings.push(new Finding("E007", "Setup Ready Transition.seed_topic_intake_ready=yes requires at least one confirmed Topic Registry row"));
    }
    if (hasIntakeGap) {
      findings.push(new Finding("E007", "Setup Ready Transition.seed_topic_intake_ready=yes requires every confirmed topic intake row to be ready with no intake_gap or queue_consequence"));
    }
  }
  if (seedReady === "gap_queue_backed" && topics.length > 0 && !hasIntakeGap) {
    findings.push(new Finding("E007", "Setup Ready Transition.seed_topic_intake_ready=gap_queue_backed requires a visible topic intake gap, assumption, or queue consequence"));
  }
  return [...findings, ...setupIntakeGapBackingFindings(texts)];
}

function setupGapQueueFindings(queue) {
  const findings = [];
  const active = activeQueueSection(queue);
  if (!active) {
    return [new Finding("E007", "setup_ready gap_queue_backed requires QUEUE ## Active Queue section")];
  }
  const sourceMode = cleanField(parseBulletField(active, "source_intake_runner_mode"));
  const sourceWaitState = cleanField(parseBulletField(active, "source_intake_wait_state"));
  const slotOne = taskSection(queue, "slot_1_current") ?? "";
  const action = taskAction(queue, "slot_1_current");
  const currentTaskText = `${slotOne}\n${action}`;
  const prohibitedActionPattern = /\b(source intake|web search|native search|exa search|retrieval|retrieve|fetch|candidate cards?|promote accepted|promotion|wave\s*0\s+(?:source|evidence)|wave\s*1\s+(?:deepening|source|evidence)|evidence search)\b/i;
  if (sourceMode && sourceMode !== "not_applicable") {
    findings.push(new Finding("E007", `setup_ready gap_queue_backed must not start source intake; source_intake_runner_mode=${sourceMode}`));
  }
  if (sourceWaitState && sourceWaitState !== "not_started") {
    findings.push(new Finding("E007", `setup_ready gap_queue_backed must keep source_intake_wait_state=not_started; found ${sourceWaitState}`));
  }
  for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
    const taskActionValue = taskAction(queue, taskName);
    if (prohibitedActionPattern.test(taskActionValue)) {
      findings.push(new Finding("E007", `setup_ready gap_queue_backed ${taskName}.action must repair seed intake/decomposition before source intake, retrieval, Wave 0 evidence, or Wave 1 deepening work; found ${taskActionValue || "missing"}`));
    }
  }
  if (!/\b(decompose|split|seed topics?|clarif|intake gap|topic intake|original_topic|pending topic|repair)\b|待分解|澄清/i.test(currentTaskText)) {
    findings.push(new Finding("E007", `setup_ready gap_queue_backed requires slot_1_current to name concrete decomposition/intake repair work; found ${action || "missing"}`));
  }
  return findings;
}

function setupReadyBundleFindings(root, files, texts) {
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
  return findings;
}

function setupReadyCompositeFindings(root, files, texts) {
  const seedReady = cleanField(parseBulletField(hierarchicalSectionText(texts.status, "Setup Ready Transition"), "seed_topic_intake_ready"));
  return [
    ...setupReadyBundleFindings(root, files, texts),
    ...setupSeedIntakeConsistencyFindings(texts),
    ...(seedReady === "gap_queue_backed" ? setupGapQueueFindings(texts.queue) : []),
    ...seedIntakeFindings(texts),
    ...surfaceFindings(root, files, texts, {
      allowQueueBackedSeedShapeGaps: seedReady === "gap_queue_backed",
    }),
  ];
}

export function setupReadyGateFindings(root, files, texts) {
  return [
    ...setupReadyStatusFindings(texts.status),
    ...setupReadyQueueFindings(texts.queue),
    ...setupReadyCompositeFindings(root, files, texts),
  ];
}

export function setupReadyRuntimeFindings(root, files, texts) {
  const gate = cleanField(parseBulletField(texts.status, "current_gate"));
  return [
    ...setupReadyStatusFindings(texts.status),
    ...(gate === "setup_ready" ? setupReadyQueueFindings(texts.queue) : []),
    ...(gate === "setup_ready" ? setupReadyCompositeFindings(root, files, texts) : []),
  ];
}

export function checkGateSetupReady(root) {
  return checkStandaloneGate(root, "setup_ready", setupReadyGateFindings);
}
