import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { exists, isDirectory, isFile, readText } from "../lib/fs.mjs";
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
  resolveRunPath,
  runRootFor,
  seedTopicsRoot,
  standardRunLayoutFindings,
} from "../lib/bundle.mjs";
import { locateRunFiles, readRunTexts } from "../lib/run_files.mjs";
import { cleanCell, firstMarkdownTable, hierarchicalSectionText, markdownSections, parseBulletField } from "../lib/markdown.mjs";
import { missingOriginalContextFields, seedIntakeRows, seedTopicShapeFindings, topicRegistryRows } from "./seed-topic-shape.mjs";

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

function cleanField(value) {
  return cleanCell(value).replace(/^`+|`+$/g, "").trim();
}

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

function concreteFieldValue(value) {
  const cleaned = cleanField(value)
    .split(/\r?\n/)
    .map((line) => cleanField(line).replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return fieldIsConcrete(cleaned) ? cleaned : "";
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

function pathIsInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function instanceConfigValue(plan, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`\\|\\s*\`${escaped}\`\\s*\\|\\s*` + "`?" + `([^|\\n\`]+)` + "`?" + `\\s*\\|`));
  return match ? cleanField(match[1]) : null;
}

function resolveExistingRunPath(runRoot, rawPath) {
  const cleaned = cleanField(rawPath).split(/[?#]/)[0];
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  const resolved = isAbsolute(cleaned) ? resolve(cleaned) : resolve(runRoot, cleaned);
  return exists(resolved) ? resolved : null;
}

function topicKey(id, slug) {
  return `${cleanField(id)}/${cleanField(slug)}`;
}

function parseTopicKey(value) {
  const cleaned = cleanField(value);
  const slash = cleaned.match(/\b([^/\s`|]+)\/([^/\s`|]+)\b/);
  if (slash) {
    return { id: slash[1], slug: slash[2], key: topicKey(slash[1], slash[2]) };
  }
  return { id: cleaned, slug: "", key: cleaned };
}

function topicBlocks(status) {
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

function sectionTable(text, sectionName) {
  const sections = markdownSections(text);
  return firstMarkdownTable(sections[sectionName] ?? "");
}

function countedInventoryRows(status) {
  const tables = [
    sectionTable(status, "Wave 0 Accepted Shared Reference Inventory"),
    sectionTable(status, "Accepted Reference Inventory"),
  ];
  return tables.flatMap((table) => table.rows.filter((row) => {
    const counted = rowCell(row, ["counted_for_floor"]).toLowerCase();
    return counted === "yes";
  }));
}

function citesNormalizedOriginalTopic(text) {
  return /\boriginal_topic\/[a-z0-9]+(?:-[a-z0-9]+)*\.normalized\.md\b/.test(String(text ?? ""));
}

function rowAllowsContextGap(intakeRow, queue, id, slug) {
  if (!intakeRow) {
    return false;
  }
  const status = cleanField(intakeRow.intakeStatus).toLowerCase();
  const gap = cleanField(intakeRow.intakeGap);
  const queueConsequence = cleanField(intakeRow.queueConsequence);
  const gapStatus = status === "gap" || status === "assumption" || status === "gap_queue_backed";
  return gapStatus
    && fieldIsConcrete(gap)
    && !isNoneLike(gap)
    && fieldIsConcrete(queueConsequence)
    && !isNoneLike(queueConsequence)
    && queueMentionsTopicRepair(queue, id, slug);
}

function normalizedWorkValue(value) {
  return cleanField(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function queueWorkItems(queue) {
  return queue.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*-\s*(action|candidate|slot_1_current|slot_2_next|slot_3_pending|slot_4_pending|slot_5_tail)\s*:\s*`?(.+?)`?\s*$/i);
    return match ? concreteFieldValue(match[2]) : "";
  }).filter(Boolean);
}

function genericPendingWorkValue(value) {
  const normalized = normalizedWorkValue(value);
  return normalized === "clarify seed topic intake gap"
    || normalized === "triage topology delta candidate";
}

function queueValueNamesConcreteTarget(value) {
  if (!fieldIsConcrete(value) || genericPendingWorkValue(value)) {
    return false;
  }
  if (/\b(known topic|affected topic|pending_topic_candidates|topic_intake_gap|status_path|queue_path)\b/i.test(value)) {
    return false;
  }
  return /\b(decompose|split|seed topic|clarif|intake|topology|candidate|formalize)\b|待分解|澄清/i.test(value);
}

function pendingTopicCandidates(status) {
  const raw = parseBulletField(status, "pending_topic_candidates");
  if (!fieldIsConcrete(raw)) {
    return [];
  }
  return cleanField(raw)
    .split(/[;,]/)
    .map(concreteFieldValue)
    .filter(Boolean);
}

function queueHasPendingCandidateWork(queue, candidates) {
  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase());
  return queueWorkItems(queue).some((value) => {
    const lowered = value.toLowerCase();
    if (!/\b(triage|decompose|formalize|clarif|intake|seed|topic|candidate)\b|待分解|澄清/i.test(value)) {
      return false;
    }
    if (genericPendingWorkValue(value)) {
      return candidates.length > 0;
    }
    return loweredCandidates.some((candidate) => lowered.includes(candidate))
      || queueValueNamesConcreteTarget(value);
  });
}

function originalTopicConfigured(plan) {
  return fieldIsConcrete(instanceConfigValue(plan, "original_topic_dir"));
}

function queueHasOriginalTopicDecompositionWork(queue) {
  return queueWorkItems(queue).some((value) => {
    return !genericPendingWorkValue(value)
      && /\b(decompose|split|seed topics?)\b|待分解/i.test(value)
      && /\boriginal_topic\b|original topic|large topic|source material|upstream/i.test(value);
  });
}

function pendingTopicWorkVisible(texts) {
  const candidates = pendingTopicCandidates(texts.status);
  if (candidates.length > 0 && queueHasPendingCandidateWork(texts.queue, candidates)) {
    return true;
  }
  if (originalTopicConfigured(texts.plan) && queueHasOriginalTopicDecompositionWork(texts.queue)) {
    return true;
  }
  return queueWorkItems(texts.queue).some(queueValueNamesConcreteTarget);
}

function registryIntakeStatusFindings(registryRows, intake, statusBlocks, texts) {
  const findings = [];
  const intakeByKey = new Map(intake.map((row) => [row.key, row]));
  const statusByKey = new Map(statusBlocks.map((block) => [block.key, block]));
  const registryKeys = new Set(registryRows.map((row) => topicKey(row.id, row.slug)));
  const originalTopicActive = originalTopicConfigured(texts.plan);
  if (registryRows.length === 0) {
    if (!pendingTopicWorkVisible(texts)) {
      findings.push(new Finding("E018", "no confirmed Topic Registry rows and no visible decomposition/intake-gap queue work"));
    }
    return findings;
  }
  for (const row of registryRows) {
    const key = topicKey(row.id, row.slug);
    const intakeRow = intakeByKey.get(key);
    if (!intakeRow) {
      findings.push(new Finding("E018", `Topic ${key} missing matching PLAN Seed Topic Intake Matrix row`));
    } else {
      for (const [field, value] of [
        ["must_answer", intakeRow.mustAnswer],
        ["why_now", intakeRow.whyNow],
        ["boundary", intakeRow.boundary],
        ["evidence_anchors", intakeRow.evidenceAnchors],
        ["why_it_matters", intakeRow.whyItMatters],
        ["intake_status", intakeRow.intakeStatus],
      ]) {
        if (!fieldIsConcrete(value)) {
          findings.push(new Finding("E018", `Topic ${key} intake matrix missing concrete ${field}`));
        }
      }
      const intakeStatus = cleanField(intakeRow.intakeStatus).toLowerCase();
      const gapStatus = ["gap", "assumption", "gap_queue_backed"].includes(intakeStatus);
      const hasGap = fieldIsConcrete(intakeRow.intakeGap) && !isNoneLike(intakeRow.intakeGap);
      const hasQueueConsequence = fieldIsConcrete(intakeRow.queueConsequence) && !isNoneLike(intakeRow.queueConsequence);
      if (gapStatus || hasGap || hasQueueConsequence) {
        if (!hasGap) {
          findings.push(new Finding("E018", `Topic ${key} intake gap status/consequence lacks concrete intake_gap`));
        }
        if (!hasQueueConsequence) {
          findings.push(new Finding("E018", `Topic ${key} intake gap lacks concrete queue_consequence`));
        }
        if (!queueMentionsTopicRepair(texts.queue, row.id, row.slug)) {
          findings.push(new Finding("E018", `Topic ${key} intake gap lacks visible QUEUE repair or clarification work`));
        }
      }
      if (originalTopicActive) {
        const contextText = `${intakeRow.boundary}\n${intakeRow.evidenceAnchors}`;
        const missingFields = missingOriginalContextFields(contextText);
        if (missingFields.length > 0 && !rowAllowsContextGap(intakeRow, texts.queue, row.id, row.slug)) {
          findings.push(new Finding("E018", `Topic ${key} intake matrix derived from original_topic must preserve meaningful original context fields or use a queue-backed intake gap; missing ${missingFields.join(", ")}`));
        }
        if (!citesNormalizedOriginalTopic(contextText) && !rowAllowsContextGap(intakeRow, texts.queue, row.id, row.slug)) {
          findings.push(new Finding("E018", `Topic ${key} intake matrix derived from original_topic must cite original_topic/<english-slug>.normalized.md in source_anchor or use a queue-backed intake gap`));
        }
      }
    }
    if (!statusByKey.has(key)) {
      findings.push(new Finding("E018", `Topic ${key} missing matching STATUS topic block`));
    }
  }
  for (const row of intake) {
    if (!registryKeys.has(row.key)) {
      findings.push(new Finding("E018", `PLAN Seed Topic Intake Matrix has topic absent from Topic Registry: ${row.key}`));
    }
  }
  for (const block of statusBlocks) {
    if (!registryKeys.has(block.key)) {
      findings.push(new Finding("E018", `STATUS topic block absent from Topic Registry: ${block.key}`));
    }
  }
  return findings;
}

function queueMentionsTopicRepair(queue, id, slug) {
  const idPattern = id ? id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const slugPattern = slug ? slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  if (!idPattern && !slugPattern) {
    return false;
  }
  const topicPattern = new RegExp(`\\b(?:${[idPattern, slugPattern].filter(Boolean).join("|")})\\b`, "i");
  const repairPattern = /\b(clarif|intake|seed|topic|repair|backfill|decompose)\b/i;
  return queue.split(/\r?\n/).some((line) => topicPattern.test(line) && repairPattern.test(line));
}

function executionSurfacesRequired(status) {
  const gate = parseBulletField(status, "current_gate");
  const wave = parseBulletField(status, "current_wave");
  const mode = parseBulletField(status, "current_mode");
  return !(gate === "instantiation_complete" && wave === "Instantiation" && mode === "instantiation_only");
}

function referenceSurfaceFindings(runRoot, referenceRoot, status) {
  const findings = [];
  if (!isDirectory(referenceRoot)) {
    findings.push(new Finding("E017", `REFERENCE_DIR missing: ${referenceRoot}`));
    return findings;
  }
  if (executionSurfacesRequired(status)) {
    for (const rel of ["README.md", "_INDEX.md"]) {
      if (!isFile(join(referenceRoot, rel))) {
        findings.push(new Finding("E019", `REFERENCE_DIR missing navigation file after setup/execution started: ${rel}`));
      }
    }
  }
  for (const row of countedInventoryRows(status)) {
    const rawPath = rowCell(row, ["local_ref_path"]);
    const resolved = resolveExistingRunPath(runRoot, rawPath);
    if (!resolved) {
      findings.push(new Finding("E019", `counted reference path does not exist: ${rawPath || "missing"}`));
      continue;
    }
    if (!pathIsInside(referenceRoot, resolved)) {
      findings.push(new Finding("E019", `counted reference path must resolve under REFERENCE_DIR: ${rawPath}`));
    }
  }
  return findings;
}

function artifactProduced(value) {
  const cleaned = cleanField(value).toLowerCase();
  if (cleaned === "done") {
    return true;
  }
  const match = cleaned.match(/\bproduced_at_ref_count\s*=\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) > 0 : false;
}

function localRefCitations(text) {
  const citations = [];
  for (const match of text.matchAll(/\bseed_topics\/_reference\/[^)\]\s`]+\.md\b/g)) {
    citations.push({ raw: match[0], rel: match[0] });
  }
  for (const match of text.matchAll(/(^|[\/\s`([])_reference\/([^)\]\s`]+\.md)\b/g)) {
    citations.push({ raw: `_reference/${match[2]}`, rel: `seed_topics/_reference/${match[2]}` });
  }
  return citations;
}

function artifactCitationFindings(runRoot, artifactPath, label, options = {}) {
  const findings = [];
  const text = readText(artifactPath);
  const citations = localRefCitations(text);
  if (citations.length === 0) {
    const hasQueueConsequence = /\b(queue_consequence|queue consequence|repair|refill|blocked|synthesis_pending)\b|排队|修复|重跑|阻塞|待综合/i.test(text);
    if (!options.allowQueueConsequence || !hasQueueConsequence) {
      findings.push(new Finding("E020", `${label} artifact must cite local reference paths, not URL-only evidence`));
    }
    return findings;
  }
  for (const citation of citations) {
    const resolved = resolve(runRoot, citation.rel);
    if (!isFile(resolved)) {
      findings.push(new Finding("E020", `${label} artifact cites missing local reference path: ${citation.raw}`));
    }
  }
  return findings;
}

function artifactSurfaceFindings(runRoot, artifactRoot, status, queue) {
  const findings = [];
  if (!isDirectory(artifactRoot)) {
    findings.push(new Finding("E017", `ARTIFACT_DIR missing: ${artifactRoot}`));
    return findings;
  }
  if (executionSurfacesRequired(status) && !isFile(join(artifactRoot, "README.md"))) {
    findings.push(new Finding("E020", "ARTIFACT_DIR missing README.md after setup/execution started"));
  }
  const blocks = topicBlocks(status);
  for (const block of blocks) {
    const expectedDir = join(artifactRoot, "wave1_topics", `${block.id}-${block.slug}`);
    for (const [stateField, pathField, filename] of [
      ["evidence_summary", "evidence_summary_path", "evidence-summary.md"],
      ["question_list", "question_list_path", "question-list.md"],
    ]) {
      const state = parseBulletField(block.text, stateField);
      const rawPath = parseBulletField(block.text, pathField);
      if (!fieldIsConcrete(rawPath)) {
        findings.push(new Finding("E020", `Topic ${block.key} missing concrete ${pathField}`));
        continue;
      }
      const resolved = resolveRunPath(runRoot, rawPath);
      const expectedPath = join(expectedDir, filename);
      if (!resolved || resolve(resolved) !== resolve(expectedPath)) {
        findings.push(new Finding("E020", `Topic ${block.key} ${pathField} must be canonical ${expectedPath}; found ${rawPath}`));
        continue;
      }
      if (artifactProduced(state) && !isFile(resolved)) {
        findings.push(new Finding("E020", `Topic ${block.key} claims ${stateField} produced but artifact file is missing: ${rawPath}`));
      }
      if (artifactProduced(state) && isFile(resolved)) {
        findings.push(...artifactCitationFindings(runRoot, resolved, `Topic ${block.key} ${stateField}`));
      }
      const acceptedCount = Number.parseInt(cleanField(parseBulletField(block.text, "accepted_topic_ref_count")), 10);
      const produced = cleanField(state).match(/\bproduced_at_ref_count\s*=\s*(\d+)/);
      const producedCount = produced ? Number.parseInt(produced[1], 10) : null;
      if (Number.isFinite(acceptedCount) && producedCount !== null && producedCount > 0 && acceptedCount - producedCount >= 2 && !queueMentionsTopicArtifact(queue, block.id, block.slug)) {
        findings.push(new Finding("E020", `Topic ${block.key} artifact is stale by ${acceptedCount - producedCount} refs and QUEUE lacks refresh work`));
      }
    }
  }
  return findings;
}

function queueMentionsTopicArtifact(queue, id, slug) {
  const idPattern = id ? id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const slugPattern = slug ? slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  if (!idPattern && !slugPattern) {
    return false;
  }
  const topicPattern = new RegExp(`\\b(?:${[idPattern, slugPattern].filter(Boolean).join("|")})\\b`, "i");
  const artifactPattern = /\b(artifact|evidence summary|question list|refresh|produce)\b/i;
  return queue.split(/\r?\n/).some((line) => topicPattern.test(line) && artifactPattern.test(line));
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

export function seedTopicFileSurfaceFindings(root, files, texts, options = {}) {
  const runRoot = dirname(files.status);
  return seedTopicShapeFindings(runRoot, texts, options);
}

export function surfaceFindings(root, files, texts, options = {}) {
  const runRoot = dirname(files.status);
  const topicRoot = seedTopicsRoot(runRoot);
  const referenceRoot = join(topicRoot, "_reference");
  const artifactRoot = join(topicRoot, "_artifacts");
  const registryRows = topicRegistryRows(texts.plan);
  const intake = seedIntakeRows(texts.plan);
  const statusBlocks = topicBlocks(texts.status);
  const topicRootNavigationFindings = executionSurfacesRequired(texts.status) && !isFile(join(topicRoot, "README.md"))
    ? [new Finding("E018", "TOPIC_ROOT missing README.md after setup/execution started")]
    : [];
  return [
    ...topicRootNavigationFindings,
    ...seedTopicFileSurfaceFindings(root, files, texts, options),
    ...registryIntakeStatusFindings(registryRows, intake, statusBlocks, texts),
    ...referenceSurfaceFindings(runRoot, referenceRoot, texts.status),
    ...artifactSurfaceFindings(runRoot, artifactRoot, texts.status, texts.queue),
  ];
}

export function checkSurfaces(root) {
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
  ];
}
