import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_TEMPLATE_PATHS } from "../contracts/constants.mjs";
import { Finding } from "./finding.mjs";
import { exists, isDirectory, isFile, walkFiles } from "./fs.mjs";

export const FRAMEWORK_DIR_NAME = "_framework";
export const ORIGINAL_TOPIC_DIR_NAME = "original_topic";
export const SEED_TOPICS_DIR_NAME = "seed_topics";
export const RUN_ROOT_AGENT_FILES = ["AGENTS.md", "CLAUDE.md"];
export const RUN_ROOT_STOP_HOOK_SETTINGS = [".claude/settings.local.json", ".claude/settings.json"];

const RUN_ROOT_AGENT_REQUIRED_TOKENS = [
  "*.profile.md",
  "*.plan.md",
  "*.status.md",
  "*.queue.md",
  "*.trace.md",
  "_framework/output_templates/*.md",
  "QUEUE_PATH -> Active Queue",
  "stop_authorization_state=unauthorized_continue_required",
  "unauthorized_stop_next_action",
  "final_delivery",
  "decision_blocker",
  "empty_queue_after_refill",
  "human-decision-brief.md",
  "pending_user",
  "safe_to_interrupt=yes",
];

const ARTIFACT_SCAFFOLD_DIRS = ["wave1_topics", "wave2", "shared"];
const ARTIFACT_README_LIFECYCLE_MARKERS = [
  "topic_unique_ref_count",
  "topic_ref_count_changed",
];

function cleanPath(value) {
  return String(value ?? "").trim().replace(/^`+|`+$/g, "").trim();
}

function collectCommandValues(value, commands = []) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectCommandValues(entry, commands);
    }
    return commands;
  }
  if (!value || typeof value !== "object") {
    return commands;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === "command" && typeof entry === "string") {
      commands.push(entry);
    } else {
      collectCommandValues(entry, commands);
    }
  }
  return commands;
}

export function runRootFor(root, files = {}) {
  if (isDirectory(root)) {
    return root;
  }
  const firstFile = Object.values(files).find(Boolean);
  return firstFile ? dirname(firstFile) : dirname(root);
}

export function frameworkRoot(runRoot) {
  return join(runRoot, FRAMEWORK_DIR_NAME);
}

export function seedTopicsRoot(runRoot) {
  return join(runRoot, SEED_TOPICS_DIR_NAME);
}

export function originalTopicRoot(runRoot) {
  return join(runRoot, ORIGINAL_TOPIC_DIR_NAME);
}

export function pathIsInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveRunPath(runRoot, rawPath) {
  const cleaned = cleanPath(rawPath);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  return isAbsolute(cleaned) ? resolve(cleaned) : resolve(runRoot, cleaned);
}

export function frameworkPresenceFindings(runRoot) {
  const root = frameworkRoot(runRoot);
  return isDirectory(root)
    ? []
    : [new Finding("E017", `run bundle missing read-only ${FRAMEWORK_DIR_NAME} framework snapshot`)];
}

export function frameworkSnapshotFindings(runRoot) {
  const findings = [];
  const root = frameworkRoot(runRoot);
  if (!isDirectory(root)) {
    return findings;
  }
  for (const relPath of REQUIRED_TEMPLATE_PATHS) {
    if (!exists(join(root, relPath))) {
      findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot missing required framework path: ${relPath}`));
    }
  }
  return findings;
}

function templateIdentity(root) {
  const constantsPath = join(root, "specs", "CONSTANTS.md");
  if (!isFile(constantsPath)) {
    return { constantsPath, family: null, version: null };
  }
  const text = readFileSync(constantsPath, "utf8");
  return {
    constantsPath,
    family: text.match(/^- template_family: `([^`]+)`$/m)?.[1] ?? null,
    version: text.match(/^- current_version: `(v\d+\.\d+)`$/m)?.[1] ?? null,
  };
}

function verifierFrameworkRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

function sameRealPath(left, right) {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return resolve(left) === resolve(right);
  }
}

function instanceTemplateVersion(planText) {
  if (!planText) {
    return null;
  }
  const match = planText.match(/\|\s*`template_version`\s*\|\s*`?([^`|\n]+)`?\s*\|/);
  return match ? cleanPath(match[1]) : null;
}

export function frameworkVersionFindings(runRoot, planText = "") {
  const findings = [];
  const root = frameworkRoot(runRoot);
  if (!isDirectory(root)) {
    return findings;
  }

  const snapshot = templateIdentity(root);
  if (!snapshot.family) {
    findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot specs/CONSTANTS.md missing template_family`));
  }
  if (!snapshot.version) {
    findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot specs/CONSTANTS.md missing current_version`));
  }

  const verifier = templateIdentity(verifierFrameworkRoot());
  if (snapshot.family && verifier.family && snapshot.family !== verifier.family) {
    findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot template_family=${snapshot.family} differs from verifier template_family=${verifier.family}; explicit framework migration required`));
  }
  if (snapshot.version && verifier.version && snapshot.version !== verifier.version) {
    findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot current_version=${snapshot.version} differs from verifier current_version=${verifier.version}; explicit framework migration required`));
  }

  const planVersion = instanceTemplateVersion(planText);
  if (planText && !planVersion) {
    findings.push(new Finding("E017", `PLAN Instance Config missing template_version; explicit framework migration required`));
  }
  if (planVersion && snapshot.version && planVersion !== snapshot.version) {
    findings.push(new Finding("E017", `PLAN Instance Config template_version=${planVersion} differs from ${FRAMEWORK_DIR_NAME} current_version=${snapshot.version}; explicit framework migration required`));
  }

  return findings;
}

export function frameworkContentDriftFindings(runRoot) {
  const findings = [];
  const root = frameworkRoot(runRoot);
  if (!isDirectory(root)) {
    return findings;
  }

  const verifierRoot = verifierFrameworkRoot();
  if (sameRealPath(root, verifierRoot)) {
    return findings;
  }

  const snapshot = templateIdentity(root);
  const verifier = templateIdentity(verifierRoot);
  if (!snapshot.family || !snapshot.version || !verifier.family || !verifier.version) {
    return findings;
  }
  if (snapshot.family !== verifier.family || snapshot.version !== verifier.version) {
    return findings;
  }

  for (const relPath of REQUIRED_TEMPLATE_PATHS) {
    const snapshotPath = join(root, relPath);
    const verifierPath = join(verifierRoot, relPath);
    if (!isFile(snapshotPath) || !isFile(verifierPath)) {
      continue;
    }
    if (readFileSync(snapshotPath, "utf8") !== readFileSync(verifierPath, "utf8")) {
      findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} snapshot existing file content drift for ${relPath}; explicit framework migration required`));
    }
  }
  return findings;
}

export function mutableRunDirectoryFindings(runRoot) {
  const findings = [];
  const seedRoot = seedTopicsRoot(runRoot);
  const referenceRoot = join(seedRoot, "_reference");
  const artifactRoot = join(seedRoot, "_artifacts");
  if (!isDirectory(seedRoot)) {
    findings.push(new Finding("E017", `run bundle missing required mutable ${SEED_TOPICS_DIR_NAME} directory`));
  }
  if (!isDirectory(referenceRoot)) {
    findings.push(new Finding("E017", `run bundle missing required ${SEED_TOPICS_DIR_NAME}/_reference directory`));
  }
  if (!isDirectory(artifactRoot)) {
    findings.push(new Finding("E017", `run bundle missing required ${SEED_TOPICS_DIR_NAME}/_artifacts directory`));
  } else {
    findings.push(...artifactScaffoldFindings(artifactRoot));
  }
  if (pathIsInside(frameworkRoot(runRoot), seedRoot)) {
    findings.push(new Finding("E017", `${SEED_TOPICS_DIR_NAME} must live outside ${FRAMEWORK_DIR_NAME}: ${seedRoot}`));
  }
  const originalRoot = originalTopicRoot(runRoot);
  if (isDirectory(originalRoot) && pathIsInside(frameworkRoot(runRoot), originalRoot)) {
    findings.push(new Finding("E017", `${ORIGINAL_TOPIC_DIR_NAME} must live outside ${FRAMEWORK_DIR_NAME}: ${originalRoot}`));
  }
  for (const legacyName of ["topics", "_reference", "_artifacts"]) {
    const legacyPath = join(runRoot, legacyName);
    if (isDirectory(legacyPath)) {
      findings.push(new Finding("E017", `${legacyName} is not allowed at RUN_DIR root; V12 uses ${SEED_TOPICS_DIR_NAME}/ with nested _reference and _artifacts`));
    }
  }
  return findings;
}

export function artifactScaffoldFindings(artifactRoot) {
  const findings = [];
  const readmePath = join(artifactRoot, "README.md");
  if (!isFile(readmePath)) {
    findings.push(new Finding("E017", `ARTIFACT_DIR missing README.md scaffold file: ${readmePath}`));
  } else {
    const readme = readFileSync(readmePath, "utf8");
    for (const marker of ARTIFACT_SCAFFOLD_DIRS) {
      if (!readme.includes(marker)) {
        findings.push(new Finding("E017", `ARTIFACT_DIR README missing scaffold marker: ${marker}`));
      }
    }
    for (const marker of ARTIFACT_README_LIFECYCLE_MARKERS) {
      if (!readme.includes(marker)) {
        findings.push(new Finding("E017", `ARTIFACT_DIR README missing artifact lifecycle marker: ${marker}`));
      }
    }
    if (!/(not evidence|does not count|not counted|source floors|不是证据|不计入|不计|不能计入)/i.test(readme)) {
      findings.push(new Finding("E017", "ARTIFACT_DIR README must state scaffold is not evidence and does not count toward source floors"));
    }
  }
  for (const dirname of ARTIFACT_SCAFFOLD_DIRS) {
    const dirPath = join(artifactRoot, dirname);
    if (!isDirectory(dirPath)) {
      findings.push(new Finding("E017", `ARTIFACT_DIR missing scaffold directory: ${dirname}`));
    }
  }
  return findings;
}

export function controlFilesOutsideFrameworkFindings(runRoot, files) {
  const findings = [];
  const root = frameworkRoot(runRoot);
  for (const [kind, filePath] of Object.entries(files)) {
    if (filePath && pathIsInside(root, filePath)) {
      findings.push(new Finding("E017", `${kind} control file must live outside ${FRAMEWORK_DIR_NAME}: ${filePath}`));
    }
  }
  return findings;
}

export function controlFilesAtRunRootFindings(runRoot, files) {
  const findings = [];
  for (const [kind, filePath] of Object.entries(files)) {
    if (filePath && resolve(dirname(filePath)) !== resolve(runRoot)) {
      findings.push(new Finding("E017", `${kind} control file must live directly under RUN_DIR: ${filePath}`));
    }
  }
  return findings;
}

function walkDirs(root) {
  if (!isDirectory(root)) {
    return [];
  }
  const dirs = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const fullPath = join(current, entry.name);
      dirs.push(fullPath);
      stack.push(fullPath);
    }
  }
  return dirs.sort();
}

export function frameworkStateFindings(runRoot) {
  const findings = [];
  const root = frameworkRoot(runRoot);
  if (!isDirectory(root)) {
    return findings;
  }

  const runControlFiles = walkFiles(root, (filePath) => {
    return filePath.endsWith(".profile.md")
      || filePath.endsWith(".plan.md")
      || filePath.endsWith(".status.md")
      || filePath.endsWith(".queue.md")
      || filePath.endsWith(".trace.md");
  });
  for (const filePath of runControlFiles) {
    findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} must not contain run control file: ${filePath}`));
  }

  for (const dirPath of walkDirs(root)) {
    const name = basename(dirPath);
    if (
      name === "_reference"
      || name === "_artifacts"
      || name === "_cache"
      || name === "topics"
      || name === SEED_TOPICS_DIR_NAME
      || name === ORIGINAL_TOPIC_DIR_NAME
      || name === "final"
      || name.startsWith("final_")
    ) {
      findings.push(new Finding("E017", `${FRAMEWORK_DIR_NAME} must not contain mutable run data directory: ${dirPath}`));
    }
  }

  return findings;
}

export function runRootAgentContractFindings(runRoot) {
  const findings = [];
  for (const filename of RUN_ROOT_AGENT_FILES) {
    const path = join(runRoot, filename);
    if (!exists(path)) {
      findings.push(new Finding("E017", `run bundle missing run-root agent instruction file: ${filename}`));
      continue;
    }
    if (pathIsInside(frameworkRoot(runRoot), path)) {
      findings.push(new Finding("E017", `run-root agent instruction file must live outside ${FRAMEWORK_DIR_NAME}: ${path}`));
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const token of RUN_ROOT_AGENT_REQUIRED_TOKENS) {
      if (!text.includes(token)) {
        findings.push(new Finding("E017", `${filename} missing run-root agent contract marker: ${token}`));
      }
    }
    if (filename === "CLAUDE.md" && !/Stop hook/i.test(text)) {
      findings.push(new Finding("E017", "CLAUDE.md missing Claude Stop hook continuation guidance"));
    }
  }
  findings.push(...runRootStopHookSettingsFindings(runRoot));
  return findings;
}

export function runRootStopHookSettingsFindings(runRoot) {
  const findings = [];
  const settingsPath = RUN_ROOT_STOP_HOOK_SETTINGS
    .map((relPath) => join(runRoot, relPath))
    .find((path) => isFile(path));
  if (!settingsPath) {
    findings.push(new Finding("E017", "run bundle missing run-root Claude Stop hook settings file: .claude/settings.local.json"));
    return findings;
  }
  if (pathIsInside(frameworkRoot(runRoot), settingsPath)) {
    findings.push(new Finding("E017", `Claude Stop hook settings file must live outside ${FRAMEWORK_DIR_NAME}: ${settingsPath}`));
    return findings;
  }
  const text = readFileSync(settingsPath, "utf8");
  if (/<RUN_DIR>|<ABSOLUTE_RUN_DIR>|\bRUN_DIR\/_framework\b|\bDEEP_RESEARCH_RUN_ROOT=["']?RUN_DIR\b/.test(text)) {
    findings.push(new Finding("E017", "Claude Stop hook settings must not contain RUN_DIR placeholders"));
  }
  if (!text.includes("DEEP_RESEARCH_RUN_ROOT")) {
    findings.push(new Finding("E017", "Claude Stop hook settings must set DEEP_RESEARCH_RUN_ROOT to the concrete run directory"));
  }
  if (!text.includes(resolve(runRoot))) {
    findings.push(new Finding("E017", "Claude Stop hook settings must bind the absolute run root"));
  }
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    findings.push(new Finding("E017", "Claude Stop hook settings must be valid JSON"));
    return findings;
  }
  if (!text.includes('"Stop"')) {
    findings.push(new Finding("E017", "Claude Stop hook settings missing Stop hook"));
  }
  const commands = collectCommandValues(parsed);
  const guardCommands = commands.filter((command) => /claude-stop-guard\.mjs/.test(command));
  if (guardCommands.length === 0) {
    findings.push(new Finding("E017", "Claude Stop hook settings missing claude-stop-guard.mjs command"));
    return findings;
  }
  const expectedGuard = join(resolve(runRoot), "_framework", "cli_tools", "stop_guard", "claude-stop-guard.mjs");
  if (!guardCommands.some((command) => command.includes(expectedGuard))) {
    findings.push(new Finding("E017", "Claude Stop hook command must use the run-local _framework stop guard path"));
  }
  if (!guardCommands.some((command) => command.includes(`DEEP_RESEARCH_RUN_ROOT="${resolve(runRoot)}"`)
    || command.includes(`DEEP_RESEARCH_RUN_ROOT='${resolve(runRoot)}'`)
    || command.includes(`DEEP_RESEARCH_RUN_ROOT=${resolve(runRoot)}`))) {
    findings.push(new Finding("E017", "Claude Stop hook command must export DEEP_RESEARCH_RUN_ROOT for this exact run"));
  }
  return findings;
}

export function instancePathsOutsideFrameworkFindings(runRoot, pathEntries) {
  const findings = [];
  const root = frameworkRoot(runRoot);
  if (!isDirectory(root)) {
    return findings;
  }

  for (const [field, rawPath] of pathEntries) {
    const cleaned = cleanPath(rawPath);
    if (cleaned && cleaned !== "not_applicable" && !isAbsolute(cleaned)) {
      findings.push(new Finding("E017", `Instance Config ${field} must be an absolute path; found ${rawPath}`));
    }
    const resolved = resolveRunPath(runRoot, rawPath);
    if (resolved && pathIsInside(root, resolved)) {
      findings.push(new Finding("E017", `Instance Config ${field} must point outside ${FRAMEWORK_DIR_NAME}: ${rawPath}`));
    }
  }
  return findings;
}

export function standardRunLayoutFindings(runRoot, pathEntries) {
  const findings = [];
  const expected = new Map([
    ["run_dir", runRoot],
    ["framework_dir", frameworkRoot(runRoot)],
    ["topic_root", seedTopicsRoot(runRoot)],
    ["reference_dir", join(seedTopicsRoot(runRoot), "_reference")],
    ["artifact_dir", join(seedTopicsRoot(runRoot), "_artifacts")],
  ]);
  const actual = new Map(pathEntries);

  for (const [field, expectedPath] of expected.entries()) {
    const rawPath = actual.get(field);
    const resolved = resolveRunPath(runRoot, rawPath);
    if (!resolved) {
      findings.push(new Finding("E017", `Instance Config ${field} must be ${expectedPath}; found ${rawPath || "missing"}`));
      continue;
    }
    if (resolve(resolved) !== resolve(expectedPath)) {
      findings.push(new Finding("E017", `Instance Config ${field} must be ${expectedPath}; found ${rawPath}`));
    }
  }

  return findings;
}

export function originalTopicLayoutFindings(runRoot, rawPath) {
  const findings = [];
  const cleaned = cleanPath(rawPath);
  const expectedPath = originalTopicRoot(runRoot);
  const originalExists = isDirectory(expectedPath);
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    findings.push(new Finding("E017", `Instance Config original_topic_dir must be ${originalExists ? expectedPath : "not_applicable"}; found ${rawPath || "missing"}`));
    return findings;
  }
  if (!originalExists) {
    if (cleaned !== "not_applicable") {
      findings.push(new Finding("E017", `Instance Config original_topic_dir must be not_applicable when RUN_DIR/original_topic is absent; found ${rawPath}`));
    }
    return findings;
  }
  const resolved = resolveRunPath(runRoot, cleaned);
  if (!resolved || resolve(resolved) !== resolve(expectedPath)) {
    findings.push(new Finding("E017", `Instance Config original_topic_dir must be ${expectedPath}; found ${rawPath}`));
  }
  return findings;
}

function expectedRuntimeControlPath(files, kind) {
  return files?.[kind] ? resolve(files[kind]) : null;
}

function planMentionsSourceTemplate(rawPath, runRoot) {
  const raw = String(rawPath ?? "");
  if (!/\bDEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V\d+\b/.test(raw)) {
    return false;
  }
  const resolved = resolveRunPath(runRoot, rawPath);
  return !(resolved && pathIsInside(runRoot, resolved));
}

export function commandEntrypointFindings(runRoot, files, pathEntries, planText = "") {
  const findings = [];
  const entries = new Map(pathEntries);

  if (planText && !planText.includes("## Runtime Command Entrypoint")) {
    findings.push(new Finding("E017", "PLAN missing Runtime Command Entrypoint section"));
  }
  if (planText && !planText.includes("Snapshot vs Instantiated Control Files")) {
    findings.push(new Finding("E017", "PLAN missing Snapshot vs Instantiated Control Files rule"));
  }

  const frameworkChecks = [
    ["framework_command_index", join(frameworkRoot(runRoot), "COMMANDS.md")],
    ["framework_cli_check", join(frameworkRoot(runRoot), "cli_tools", "check_framework.mjs")],
  ];
  for (const [field, expectedPath] of frameworkChecks) {
    const rawPath = entries.get(field);
    const cleaned = cleanPath(rawPath);
    if (cleaned && !isAbsolute(cleaned)) {
      findings.push(new Finding("E017", `Instance Config ${field} must be an absolute path; found ${rawPath}`));
      continue;
    }
    const resolved = resolveRunPath(runRoot, rawPath);
    if (planMentionsSourceTemplate(rawPath, runRoot)) {
      findings.push(new Finding("E017", `Instance Config ${field} must point to run-local _framework, not source template package: ${rawPath}`));
      continue;
    }
    if (!resolved || resolve(resolved) !== resolve(expectedPath)) {
      findings.push(new Finding("E017", `Instance Config ${field} must be ${expectedPath}; found ${rawPath || "missing"}`));
      continue;
    }
    if (!exists(resolved)) {
      findings.push(new Finding("E017", `Instance Config ${field} points to missing framework file: ${rawPath}`));
    }
  }

  for (const [field, kind] of [
    ["runtime_profile", "profile"],
    ["runtime_plan", "plan"],
    ["runtime_status", "status"],
    ["runtime_queue", "queue"],
    ["runtime_trace", "trace"],
  ]) {
    const rawPath = entries.get(field);
    const cleaned = cleanPath(rawPath);
    if (cleaned && !isAbsolute(cleaned)) {
      findings.push(new Finding("E017", `Instance Config ${field} must be an absolute path; found ${rawPath}`));
      continue;
    }
    const resolved = resolveRunPath(runRoot, rawPath);
    const expected = expectedRuntimeControlPath(files, kind);
    if (planMentionsSourceTemplate(rawPath, runRoot) || /_framework[\\/]+output_templates[\\/]+/i.test(String(rawPath ?? ""))) {
      findings.push(new Finding("E017", `Instance Config ${field} must point to instantiated root control file, not framework output skeleton: ${rawPath}`));
      continue;
    }
    if (!resolved || !expected || resolve(resolved) !== expected) {
      findings.push(new Finding("E017", `Instance Config ${field} must point to instantiated ${kind} file ${expected || "unknown"}; found ${rawPath || "missing"}`));
    }
  }

  return findings;
}
