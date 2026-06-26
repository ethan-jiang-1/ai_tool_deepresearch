import { isAbsolute, relative, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { isFile, readText } from "../lib/fs.mjs";
import { cleanCell, firstMarkdownTable, hierarchicalSectionText } from "../lib/markdown.mjs";
import { seedTopicsRoot } from "../lib/bundle.mjs";

export const REQUIRED_SEED_GROWTH_HEADINGS = [
  "历史摘要（保留，不修改）",
  "本轮新增证据",
  "本轮新增机制理解",
  "本轮新增趋势与难点",
  "当前判断（本轮综合后）",
  "待验证问题",
];

const UPPER_INTAKE_SURFACES = [
  ["slug", ["slug"]],
  ["must_answer", ["must_answer", "must answer", "必须回答", "核心问题"]],
  ["why_now", ["why_now", "why now", "为什么现在", "time window", "trigger", "触发", "窗口"]],
  ["boundary", ["boundary", "out_of_scope", "out of scope", "scope", "边界", "不包括", "排除"]],
  ["evidence_anchors", ["evidence_anchors", "evidence anchors", "source families", "preferred sources", "preferred source families", "证据锚", "证据路径", "来源", "source route"]],
  ["why_it_matters", ["why_it_matters", "why it matters", "重要性", "价值", "audience", "final deliverable", "受众"]],
];

const ORIGINAL_CONTEXT_FIELDS = [
  ["source_anchor", ["source_anchor", "source anchor", "来源锚", "出处"]],
  ["in_scope", ["in_scope", "in scope", "范围内", "纳入范围"]],
  ["out_of_scope", ["out_of_scope", "out of scope", "不包括", "排除", "范围外"]],
  ["search_guardrails", ["search_guardrails", "search guardrails", "搜索护栏", "检索护栏", "禁止泛化"]],
  ["evidence_route", ["evidence_route", "evidence route", "证据路径", "来源路径", "source route"]],
];

const QUEUE_BACKED_OPTIONAL_UPPER_FIELDS = new Set([
  "why_now",
  "boundary",
  "evidence_anchors",
  "why_it_matters",
]);

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

const SEED_FIELD_EMPTY_VALUES = new Set([
  ...EMPTY_VALUES,
  "tbd",
  "todo",
  "placeholder",
  "pending",
  "pending clarification",
  "pending user clarification",
  "needs clarification",
  "need clarification",
  "clarify",
  "to be clarified",
  "to be determined",
  "gap",
  "gap_queue_backed",
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

function hasCurlyTemplatePlaceholderResidue(value) {
  return /\{[^{}\n]{2,}\}/.test(String(value ?? ""));
}

function seedFieldIsMeaningful(value) {
  const cleaned = cleanField(value);
  const lower = cleaned.toLowerCase();
  if (!fieldIsConcrete(cleaned) || hasCurlyTemplatePlaceholderResidue(cleaned)) {
    return false;
  }
  if (SEED_FIELD_EMPTY_VALUES.has(lower)) {
    return false;
  }
  if (/\b(?:todo|tbd|placeholder|fill later|copy this skeleton|pending clarification|needs? clarification|to be (?:determined|clarified))\b/i.test(cleaned)) {
    return false;
  }
  return true;
}

function isNoneLike(value) {
  return ["none", "not_applicable", "not applicable", "n/a"].includes(cleanField(value).toLowerCase());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labelSource(label) {
  return String(label)
    .trim()
    .split(/[-_\s]+/)
    .map(escapeRegExp)
    .join("[-_ \\t]+");
}

function labelAlternation(labels) {
  return labels.map(labelSource).join("|");
}

function stripInlineMarkdown(value) {
  return cleanField(value)
    .replace(/^[:：]\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^#+\s+/, "")
    .replace(/^`+|`+$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

function concreteFieldValue(value) {
  const cleaned = stripInlineMarkdown(value)
    .split(/\r?\n/)
    .map((line) => stripInlineMarkdown(line))
    .filter(Boolean)
    .join(" ")
    .trim();
  return seedFieldIsMeaningful(cleaned) ? cleaned : "";
}

function extractBulletFieldValue(text, labels) {
  const source = labelAlternation(labels);
  const pattern = new RegExp(`^[ \\t]*(?:[-*+][ \\t]*)?(?:\`|\\*\\*)?(?:${source})(?:\`|\\*\\*)?[ \\t]*[:：][ \\t]*(.*)$`, "im");
  const match = text.match(pattern);
  return match ? concreteFieldValue(match[1]) : "";
}

function extractInlineFieldValue(text, labels) {
  const source = labelAlternation(labels);
  const pattern = new RegExp(`(?:^|[;\\n])[ \\t]*(?:\`|\\*\\*)?(?:${source})(?:\`|\\*\\*)?[ \\t]*(?:=|[:：])[ \\t]*([^;\\n]+)`, "im");
  const match = text.match(pattern);
  return match ? concreteFieldValue(match[1]) : "";
}

function extractHeadingFieldValue(text, labels) {
  const source = labelAlternation(labels);
  const pattern = new RegExp(`^(#{1,6})[ \\t]+(?:\`|\\*\\*)?(?:${source})(?:\`|\\*\\*)?[ \\t]*$`, "im");
  const match = text.match(pattern);
  if (!match || match.index === undefined) {
    return "";
  }
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.match(/\n#{1,6}\s+.+$/m);
  return concreteFieldValue(next && next.index !== undefined ? rest.slice(0, next.index) : rest);
}

function seedUpperFieldValue(text, labels) {
  return extractBulletFieldValue(text, labels) || extractHeadingFieldValue(text, labels);
}

function contextFieldValue(text, labels) {
  return extractBulletFieldValue(text, labels) || extractInlineFieldValue(text, labels);
}

function stripFencedCodeBlocks(value) {
  return String(value ?? "").replace(/```[\s\S]*?```/g, "");
}

function seedHeadingIndexes(text) {
  return REQUIRED_SEED_GROWTH_HEADINGS.map((heading) => {
    const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");
    const match = text.match(pattern);
    return { heading, index: match?.index ?? -1 };
  });
}

function seedHeadingFindings(text, label, repairHint) {
  const findings = [];
  const indexes = seedHeadingIndexes(text);
  for (const { heading, index } of indexes) {
    if (index === -1) {
      findings.push(new Finding("E018", `Topic ${label} seed file missing canonical growth heading line: ${heading}; ${repairHint}`));
    }
  }
  let previous = -1;
  for (const { heading, index } of indexes) {
    if (index === -1) {
      continue;
    }
    if (index < previous) {
      findings.push(new Finding("E018", `Topic ${label} seed file growth headings are out of canonical order at: ${heading}; ${repairHint}`));
      break;
    }
    previous = index;
  }
  return findings;
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

function splitPathList(value) {
  return cleanField(value)
    .split(/[;,]/)
    .map((part) => cleanField(part).replace(/^[`"']+|[`"']+$/g, "").trim())
    .filter((part) => part && !part.includes("<") && !part.includes(">"));
}

function pathIsInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function resolveCandidateFile(runRoot, topicRoot, rawPath) {
  const cleaned = cleanField(rawPath).split(/[?#]/)[0];
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  const candidates = isAbsolute(cleaned)
    ? [resolve(cleaned)]
    : [resolve(runRoot, cleaned), resolve(topicRoot, cleaned)];
  return candidates.find((candidate) => isFile(candidate) && pathIsInside(topicRoot, candidate)) ?? null;
}

function topicKey(id, slug) {
  return `${cleanField(id)}/${cleanField(slug)}`;
}

export function topicRegistryRows(plan) {
  const table = firstMarkdownTable(hierarchicalSectionText(plan, "Topic Registry"));
  return table.rows
    .map((row) => ({
      id: rowCell(row, ["id", "topic_id"]),
      slug: rowCell(row, ["slug", "topic_slug"]),
      title: rowCell(row, ["title"]),
      seedFiles: splitPathList(rowCell(row, ["seed_files", "seed_file", "seed_paths", "seed_path"])),
      mustAnswer: rowCell(row, ["must_answer", "must answer"]),
      raw: row,
    }))
    .filter((row) => fieldIsConcrete(row.id) || fieldIsConcrete(row.slug) || fieldIsConcrete(row.title) || row.seedFiles.length > 0);
}

function parseTopicKey(value) {
  const cleaned = cleanField(value);
  const slash = cleaned.match(/\b([^/\s`|]+)\/([^/\s`|]+)\b/);
  if (slash) {
    return { id: slash[1], slug: slash[2], key: topicKey(slash[1], slash[2]) };
  }
  return { id: cleaned, slug: "", key: cleaned };
}

export function seedIntakeRows(plan) {
  const table = firstMarkdownTable(hierarchicalSectionText(plan, "Seed Topic Intake Matrix"));
  return table.rows
    .map((row) => {
      const parsed = parseTopicKey(rowCell(row, ["topic", "id", "topic_id"]));
      return {
        ...parsed,
        mustAnswer: rowCell(row, ["must_answer", "must answer"]),
        whyNow: rowCell(row, ["why_now", "why now"]),
        boundary: rowCell(row, ["boundary"]),
        evidenceAnchors: rowCell(row, ["evidence_anchors", "evidence anchors"]),
        whyItMatters: rowCell(row, ["why_it_matters", "why it matters"]),
        intakeStatus: rowCell(row, ["intake_status", "intake status"]),
        intakeGap: rowCell(row, ["intake_gap", "intake gap"]),
        queueConsequence: rowCell(row, ["queue_consequence", "queue consequence"]),
      };
    })
    .filter((row) => fieldIsConcrete(row.id) || fieldIsConcrete(row.slug));
}

export function missingOriginalContextFields(text) {
  return ORIGINAL_CONTEXT_FIELDS
    .filter(([, labels]) => !contextFieldValue(text, labels))
    .map(([name]) => name);
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

function allowsQueuedSeedSemanticGap(options, label, id, slug) {
  return Boolean(options.allowQueueBackedSeedShapeGaps)
    && rowAllowsContextGap(options.intakeByKey?.get(label), options.queue ?? "", id, slug);
}

function queueMentionsTopicRepair(queue, id, slug) {
  const idPattern = id ? id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const slugPattern = slug ? slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  if (!idPattern && !slugPattern) {
    return false;
  }
  const topicPattern = new RegExp(`\\b(?:${[idPattern, slugPattern].filter(Boolean).join("|")})\\b`, "i");
  const repairPattern = /\b(clarif|intake|seed|topic|repair|backfill|decompose)\b/i;
  return String(queue ?? "").split(/\r?\n/).some((line) => topicPattern.test(line) && repairPattern.test(line));
}

function singleSeedFileShapeFindings(filePath, row, options = {}) {
  const findings = [];
  const text = readText(filePath);
  const stripped = stripFencedCodeBlocks(text);
  const label = topicKey(row.id, row.slug);
  const repairHint = "run command_playbooks/repair-seed-topic-shape.md before Wave 0";
  if (!text.trim()) {
    findings.push(new Finding("E018", `Topic ${label} seed file is empty: ${filePath}; ${repairHint}`));
    return findings;
  }
  if (/<[^>\n]+>/.test(text)) {
    findings.push(new Finding("E018", `Topic ${label} seed file contains unresolved placeholder residue: ${filePath}; ${repairHint}`));
  }
  if (hasCurlyTemplatePlaceholderResidue(stripped)) {
    findings.push(new Finding("E018", `Topic ${label} seed file contains unresolved template placeholder residue: ${filePath}; ${repairHint}`));
  }
  if (fieldIsConcrete(row.slug) && !new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(row.slug)}([^A-Za-z0-9_-]|$)`, "i").test(text)) {
    findings.push(new Finding("E018", `Topic ${label} seed file does not expose its slug: ${filePath}; ${repairHint}`));
  }
  const queueBackedSemanticGap = allowsQueuedSeedSemanticGap(options, label, row.id, row.slug);
  for (const [field, labels] of UPPER_INTAKE_SURFACES) {
    if (!seedUpperFieldValue(stripped, labels)) {
      if (queueBackedSemanticGap && QUEUE_BACKED_OPTIONAL_UPPER_FIELDS.has(field)) {
        continue;
      }
      findings.push(new Finding("E018", `Topic ${label} seed file missing concrete upper intake substance: ${field}; ${repairHint}`));
    }
  }
  findings.push(...seedHeadingFindings(stripped, label, repairHint));
  if (options.originalTopicActive) {
    const missingFields = missingOriginalContextFields(stripped);
    if (missingFields.length > 0 && !queueBackedSemanticGap) {
      findings.push(new Finding("E018", `Topic ${label} seed file derived from original_topic must expose meaningful original context fields or use a queue-backed intake gap; missing ${missingFields.join(", ")}; ${repairHint}`));
    }
    if (!citesNormalizedOriginalTopic(stripped) && !queueBackedSemanticGap) {
      findings.push(new Finding("E018", `Topic ${label} seed file derived from original_topic must cite original_topic/<english-slug>.normalized.md in source_anchor or use a queue-backed intake gap; ${repairHint}`));
    }
  }
  return findings;
}

function originalTopicConfigured(plan) {
  const match = plan.match(/\|\s*`original_topic_dir`\s*\|\s*`?([^|\n`]+)`?\s*\|/);
  return fieldIsConcrete(match ? match[1] : "");
}

export function seedTopicShapeFindings(runRoot, texts, options = {}) {
  const topicRoot = seedTopicsRoot(runRoot);
  const registryRows = topicRegistryRows(texts.plan);
  const intake = seedIntakeRows(texts.plan);
  const intakeByKey = new Map(intake.map((row) => [row.key, row]));
  const findings = [];
  const seen = new Set();
  for (const row of registryRows) {
    const label = topicKey(row.id, row.slug);
    for (const [field, value] of [
      ["id", row.id],
      ["slug", row.slug],
      ["title", row.title],
      ["must_answer", row.mustAnswer],
    ]) {
      if (!fieldIsConcrete(value)) {
        findings.push(new Finding("E018", `Topic Registry ${label || row.title || "row"} missing concrete ${field}; run command_playbooks/repair-seed-topic-shape.md before Wave 0`));
      }
    }
    if (row.seedFiles.length === 0) {
      findings.push(new Finding("E018", `Topic Registry ${label} missing concrete seed_files path; run command_playbooks/repair-seed-topic-shape.md before Wave 0`));
      continue;
    }
    for (const seedPath of row.seedFiles) {
      const resolved = resolveCandidateFile(runRoot, topicRoot, seedPath);
      if (!resolved) {
        findings.push(new Finding("E018", `Topic Registry ${label} seed file does not resolve under TOPIC_ROOT: ${seedPath}; run command_playbooks/repair-seed-topic-shape.md before Wave 0`));
        continue;
      }
      if (seen.has(resolved)) {
        findings.push(new Finding("E018", `seed file is assigned to more than one Topic Registry row: ${seedPath}; run command_playbooks/repair-seed-topic-shape.md before Wave 0`));
      }
      seen.add(resolved);
      findings.push(...singleSeedFileShapeFindings(resolved, row, {
        originalTopicActive: originalTopicConfigured(texts.plan),
        intakeByKey,
        queue: texts.queue,
        allowQueueBackedSeedShapeGaps: options.allowQueueBackedSeedShapeGaps,
      }));
    }
  }
  return findings;
}
