import { isAbsolute, join, relative, resolve } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { exists, isDirectory } from "../lib/fs.mjs";
import { firstMarkdownTable, hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import { RUNTIME_EMPTY_FIELD_VALUES } from "../contracts/constants.mjs";

export function cleanField(value) {
  return String(value ?? "").trim().replace(/^`+|`+$/g, "").trim();
}

export function isMeaningful(value) {
  return !RUNTIME_EMPTY_FIELD_VALUES.has(cleanField(value).toLowerCase());
}

export function fieldContainsAll(value, tokens) {
  const cleaned = cleanField(value).toLowerCase();
  return tokens.every((token) => cleaned.includes(token.toLowerCase()));
}

export function activeQueueSection(queue) {
  return hierarchicalSectionText(queue, "Active Queue");
}

export function operatorViewSection(status) {
  return hierarchicalSectionText(status, "Operator View");
}

export function blockedStateSection(queue) {
  return hierarchicalSectionText(queue, "Blocked State");
}

export function queueWorkSurface(queue) {
  const active = hierarchicalSectionText(queue, "Active Queue");
  const refill = hierarchicalSectionText(queue, "Refill Pool");
  return `${active}\n${refill}`;
}

export function instanceConfigValue(plan, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`\\|\\s*\`${escaped}\`\\s*\\|\\s*` + "`?" + `([^|\\n\`]+)` + "`?" + `\\s*\\|`));
  return match ? cleanField(match[1]) : null;
}

export function resolveCandidatePath(runRoot, root, rawPath) {
  const cleaned = cleanField(rawPath);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  const candidates = isAbsolute(cleaned) ? [cleaned] : [join(runRoot, cleaned), join(root, cleaned)];
  return candidates.find((candidate) => isDirectory(candidate)) ?? null;
}

export function splitPathList(value) {
  return cleanField(value)
    .split(/[;,]/)
    .map((part) => cleanField(part).replace(/^[`"']+|[`"']+$/g, "").trim())
    .filter((part) => part && !part.includes("<") && !part.includes(">"));
}

export function rowValue(row, candidateNames) {
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanField(key).toLowerCase().replace(/[\s-]+/g, "_");
    if (candidateNames.includes(normalized)) {
      return value;
    }
  }
  return null;
}

export function topicRegistrySeedFiles(plan, topicId) {
  const registry = firstMarkdownTable(hierarchicalSectionText(plan, "Topic Registry"));
  const idPattern = topicIdPattern(topicId);
  for (const row of registry.rows) {
    const idValue = rowValue(row, ["id", "topic_id", "topic"]);
    if (idPattern.test(cleanField(idValue))) {
      return splitPathList(rowValue(row, ["seed_files", "seed_file", "seed_paths", "seed_path"]));
    }
  }
  return [];
}

export function topicRegistryRows(plan) {
  const registry = firstMarkdownTable(hierarchicalSectionText(plan, "Topic Registry"));
  return registry.rows.map((row) => ({
    id: cleanField(rowValue(row, ["id", "topic_id", "topic"])),
  }));
}

export function pathIsInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function seedFileExistsUnderTopicRoot(runRoot, topicRoot, seedPath) {
  if (!topicRoot) {
    return false;
  }
  const candidates = isAbsolute(seedPath)
    ? [resolve(seedPath)]
    : [resolve(runRoot, seedPath), resolve(topicRoot, seedPath)];
  return candidates.some((candidate) => exists(candidate) && pathIsInside(topicRoot, candidate));
}

export function extractTopicIds(value) {
  const cleaned = cleanField(value);
  if (!isMeaningful(cleaned)) {
    return [];
  }
  return cleaned
    .split(/[;,]/)
    .map((part) => {
      const slashId = part.match(/\b([A-Za-z0-9_-]+)\/[A-Za-z0-9_-]+\b/);
      if (slashId) {
        return slashId[1];
      }
      const numericId = part.match(/\b([A-Za-z]?\d{1,4}[A-Za-z0-9_-]*)\b/);
      if (numericId) {
        return numericId[1];
      }
      return part.trim().split(/\s+/)[0]?.replace(/^[`"'(]+|[`"'),.]+$/g, "") ?? "";
    })
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitTopologyEntries(value) {
  const cleaned = cleanField(value);
  if (!isMeaningful(cleaned)) {
    return [];
  }
  return cleaned
    .split(";")
    .map((part) => cleanField(part))
    .filter(isMeaningful);
}

export function decisionWords(value) {
  return [...String(value ?? "").matchAll(/\b(merge_existing|formalize_new_topic|suspend|archive|redirect|pending)\b/g)]
    .map((match) => match[1]);
}

export function topicIdPattern(topicId) {
  return new RegExp(`(^|[^A-Za-z0-9_-])${topicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_-]|$)`);
}

export function hasConcreteTopicQueueWork(queueWork, topicId) {
  const idPattern = topicIdPattern(topicId);
  const workPattern = /\b(intake|clarif(?:y|ication)?|wave\s*1|evidence|reference|ref|source|seed|backfill|artifact|summary|question[- ]list|synthesis|repair|refill)\b/i;
  return queueWork.split(/\r?\n/).some((line) => idPattern.test(line) && workPattern.test(line));
}

export function gateRepairGroups(...values) {
  const text = values.map((value) => cleanField(value)).filter(isMeaningful).join(" ");
  const groups = [];
  if (/\b(setup_ready|setup|wave0_complete|Wave\s*0|wave0)\b/i.test(text)) {
    groups.push(["setup_ready", "wave0_complete", "Wave\\s*0", "wave0"]);
  }
  if (/\b(wave1_complete|Wave\s*1|wave1)\b/i.test(text)) {
    groups.push(["wave1_complete", "Wave\\s*1", "wave1"]);
  }
  if (/\b(wave2_complete|Wave\s*2|wave2)\b/i.test(text)) {
    groups.push(["wave2_complete", "Wave\\s*2", "wave2"]);
  }
  if (/\b(readiness_passed|Readiness|readiness)\b/i.test(text)) {
    groups.push(["readiness_passed", "Readiness", "readiness"]);
  }
  return groups;
}

export function hasGateRepairQueueWork(queueWork, groups) {
  const repairPattern = /\b(repair|refill|reopen|reopened|same-wave)\b/i;
  const concreteWorkPattern = /\b(audit|evidence|reference|ref|source|seed|backfill|artifact|summary|question[- ]list|synthesis|retrieval|inventory|topic|queue|intake|clarif(?:y|ication)?)\b/i;
  const lines = queueWork.split(/\r?\n/);
  return groups.length > 0 && groups.every((group) => {
    const gatePattern = new RegExp(`\\b(?:${group.join("|")})\\b`, "i");
    return lines.some((line) => repairPattern.test(line) && gatePattern.test(line) && concreteWorkPattern.test(line));
  });
}

export function numericTopicIdInfo(topicId) {
  const match = cleanField(topicId).match(/^(0*)(\d+)$/);
  return match ? { value: Number.parseInt(match[2], 10) } : null;
}

export function appendOnlyTopicIdFindings(plan, topicIds) {
  const findings = [];
  const registryRows = topicRegistryRows(plan);
  const uniqueTopicIds = new Set(topicIds);
  if (uniqueTopicIds.size !== topicIds.length) {
    findings.push(new Finding("E015", `formalized topic ids contain duplicates: ${topicIds.join(", ")}`));
    return findings;
  }
  if (topicIds.length === 0) {
    return findings;
  }
  if (registryRows.length < topicIds.length) {
    findings.push(new Finding("E015", `Topic Registry has fewer rows than formalized topic ids: ${topicIds.join(", ")}`));
    return findings;
  }

  for (const topicId of topicIds) {
    const idPattern = topicIdPattern(topicId);
    const matches = registryRows.filter((row) => idPattern.test(row.id));
    if (matches.length > 1) {
      findings.push(new Finding("E015", `Topic Registry has duplicate rows for formalized topic id: ${topicId}`));
    }
  }

  const suffix = registryRows.slice(registryRows.length - topicIds.length);
  for (let idx = 0; idx < topicIds.length; idx += 1) {
    const topicId = topicIds[idx];
    const row = suffix[idx];
    if (!row || !topicIdPattern(topicId).test(row.id)) {
      findings.push(new Finding("E015", `formalized topic id is not append-only at the end of PLAN Topic Registry: ${topicId}`));
    }
  }

  const priorRows = registryRows.slice(0, registryRows.length - topicIds.length);
  const priorNumeric = priorRows.map((row) => numericTopicIdInfo(row.id)).filter(Boolean);
  const newNumeric = topicIds.map((topicId) => numericTopicIdInfo(topicId));
  if (priorNumeric.length > 0 && newNumeric.every(Boolean)) {
    const maxPrior = Math.max(...priorNumeric.map((info) => info.value));
    for (let idx = 0; idx < newNumeric.length; idx += 1) {
      const expected = maxPrior + idx + 1;
      if (newNumeric[idx].value !== expected) {
        findings.push(new Finding("E015", `formalized numeric topic id is not the next stable id: expected ${expected}, found ${topicIds[idx]}`));
      }
    }
  }
  return findings;
}

export function taskSection(queue, taskName) {
  return hierarchicalSectionText(queue, taskName);
}

export function taskAction(queue, taskName) {
  return parseBulletField(taskSection(queue, taskName), "action");
}
