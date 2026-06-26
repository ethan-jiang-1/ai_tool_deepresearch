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
  runRootAgentContractFindings,
  runRootFor,
  standardRunLayoutFindings,
} from "../lib/bundle.mjs";
import { locateRunFiles, readRunTexts } from "../lib/run_files.mjs";
import { surfaceFindings } from "./check-surfaces.mjs";
import { artifactFindings } from "./runtime-artifact.mjs";
import {
  countedReferenceBodyFindings,
  inventoryFindings,
  synthesisArtifactFindings,
  synthesisBackingReferenceFindings,
  synthesisFindings,
} from "./runtime-inventory.mjs";
import { runtimeGateFindings } from "./gates/index.mjs";
import { preResponseGateFindings, queueFindings, rollingTaskProjectionFindings } from "./runtime-queue.mjs";
import { queueReceiptFindings } from "./runtime-queue-receipts.mjs";
import { stopAuthorizationFindings } from "./runtime-stop-authorization.mjs";
import { topologyDeltaFindings } from "./runtime-topology.mjs";
import { readinessFindings, traceContinuityFindings } from "./runtime-readiness.mjs";
import {
  blockedStateSection,
  instanceConfigValue,
} from "./runtime-shared.mjs";
import {
  hasPlaceholderResidue,
  hasSkeletonResidue,
  hierarchicalSectionText,
  parseBulletField,
} from "../lib/markdown.mjs";
import {
  CURRENT_MODE_VALUES,
  EXECUTION_MODE_VALUES,
  GATE_VALUES,
  INTERRUPT_CONDITION_VALUES,
  QUEUE_HEALTH_VALUES,
  STATE_VALUES,
  WAVE_VALUES,
} from "../contracts/constants.mjs";

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

function enumFindings(texts) {
  const findings = [];
  const status = texts.status;
  const queue = texts.queue;
  const checks = [
    ["STATUS current_mode", parseBulletField(status, "current_mode"), CURRENT_MODE_VALUES],
    ["STATUS state", parseBulletField(status, "state"), STATE_VALUES],
    ["STATUS current_wave", parseBulletField(status, "current_wave"), WAVE_VALUES],
    ["STATUS current_gate", parseBulletField(status, "current_gate"), GATE_VALUES],
    ["QUEUE execution_mode", parseBulletField(queue, "execution_mode"), EXECUTION_MODE_VALUES],
    ["QUEUE queue_health", parseBulletField(queue, "queue_health"), QUEUE_HEALTH_VALUES],
    ["QUEUE Blocked State interrupt_condition_matched", parseBulletField(blockedStateSection(queue), "interrupt_condition_matched"), INTERRUPT_CONDITION_VALUES],
  ];
  for (const [label, value, allowed] of checks) {
    if (!value || !allowed.has(value)) {
      findings.push(new Finding("E006", `${label} has invalid or missing enum value: ${value || "missing"}`));
    }
  }
  return findings;
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

export function checkRuntime(root) {
  const { files, findings } = locateRunFiles(root);
  const preFindings = bundleFindings(root, files);
  if (findings.length > 0) {
    return [...preFindings, ...findings];
  }
  const texts = readRunTexts(files);
  const currentGate = parseBulletField(texts.status, "current_gate");
  const seedReady = parseBulletField(hierarchicalSectionText(texts.status, "Setup Ready Transition"), "seed_topic_intake_ready");
  return [
    ...bundleFindings(root, files, texts),
    ...surfaceFindings(root, files, texts, {
      allowQueueBackedSeedShapeGaps: currentGate === "setup_ready" && seedReady === "gap_queue_backed",
    }),
    ...residueFindings(texts),
    ...enumFindings(texts),
    ...queueFindings(texts),
    ...queueReceiptFindings(files, texts),
    ...rollingTaskProjectionFindings(texts),
    ...preResponseGateFindings(texts),
    ...stopAuthorizationFindings(texts),
    ...inventoryFindings(texts),
    ...countedReferenceBodyFindings(texts, { root, files }),
    ...synthesisFindings(texts),
    ...synthesisBackingReferenceFindings(texts, { root, files }),
    ...synthesisArtifactFindings(texts, { root, files }),
    ...artifactFindings(root, files, texts),
    ...readinessFindings(texts, { root, files }),
    ...runtimeGateFindings(root, files, texts),
    ...topologyDeltaFindings(root, files, texts),
    ...traceContinuityFindings(texts),
  ];
}
