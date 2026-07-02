import { basename, join } from "node:path";
import { Finding } from "./finding.mjs";
import { exists, isDirectory, isFile, readText, walkFiles } from "./fs.mjs";

function runCandidateFiles(root) {
  if (isFile(root)) {
    return [root];
  }
  if (!isDirectory(root)) {
    return [];
  }
  return walkFiles(root, (filePath) => {
    return filePath.endsWith(".profile.md")
      || filePath.endsWith(".plan.md")
      || filePath.endsWith(".status.md")
      || filePath.endsWith(".queue.md")
      || filePath.endsWith(".trace.md");
  }, {
    skipDirs: ["_artifacts", "_framework", "_reference", "final", "original_topic", "seed_topics"],
    skipDirPrefixes: ["final_"],
  });
}

export function locateRunFiles(root) {
  const specs = [
    ["profile", ".profile.md"],
    ["plan", ".plan.md"],
    ["status", ".status.md"],
    ["queue", ".queue.md"],
    ["trace", ".trace.md"],
  ];
  const files = {};
  const findings = [];
  const candidates = runCandidateFiles(root);
  for (const [kind, suffix] of specs) {
    const matches = candidates.filter((filePath) => filePath.endsWith(suffix));
    if (matches.length === 0) {
      findings.push(new Finding("E002", `missing required run file with suffix ${suffix}`));
    } else if (matches.length > 1) {
      findings.push(new Finding("E001", `multiple ${kind} files found; pass a more specific target: ${matches.map((p) => basename(p)).join(", ")}`));
    } else {
      files[kind] = matches[0];
    }
  }
  return { files, findings };
}

export function readRunTexts(files) {
  return Object.fromEntries(Object.entries(files).map(([kind, path]) => [kind, readText(path)]));
}

export function basenamePresent(text, filePath) {
  return text.includes(basename(filePath));
}

export function pathFromStatusField(statusText, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = statusText.match(new RegExp(`^-\\s*${escaped}:\\s*\`?([^\`\\n]+)\`?\\s*$`, "m"));
  return match ? match[1].trim() : null;
}

export function existsFromRunRoot(root, rawPath) {
  const cleaned = String(rawPath ?? "").replace(/^`|`$/g, "").trim();
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }
  return exists(cleaned) || exists(join(root, cleaned));
}
