#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { locateRunFiles, readRunTexts } from "../check_framework/lib/run_files.mjs";
import { stopAuthorizationSnapshot } from "../check_framework/checks/runtime-stop-authorization.mjs";

function readStdinJson() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) {
    return {};
  }
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function candidateRoot(event) {
  const raw = process.env.DEEP_RESEARCH_RUN_ROOT
    || event.run_root
    || event.runRoot
    || event.cwd
    || event.workspace
    || event.transcript_cwd
    || process.cwd();
  return resolve(String(raw));
}

function safeReadDir(root) {
  try {
    return readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
}

function textFileIncludes(path, pattern) {
  if (!existsSync(path)) {
    return false;
  }
  try {
    return pattern.test(readFileSync(path, "utf8"));
  } catch {
    return false;
  }
}

function looksLikeV12Run(root) {
  const entries = safeReadDir(root);
  if (entries.some((entry) => entry.isDirectory() && (entry.name === "_framework" || entry.name === "seed_topics"))) {
    return true;
  }
  if (entries.some((entry) => entry.isFile() && /\.(profile|plan|status|queue|trace)\.md$/.test(entry.name))) {
    return true;
  }
  return textFileIncludes(join(root, "AGENTS.md"), /Active Deep Research Run|QUEUE_PATH -> Active Queue/)
    || textFileIncludes(join(root, "CLAUDE.md"), /Active Deep Research Run|Stop hook|QUEUE_PATH -> Active Queue/);
}

function hasRunControlFilesBelow(root, depth = 0) {
  if (depth > 4) {
    return false;
  }
  for (const entry of safeReadDir(root)) {
    const path = join(root, entry.name);
    if (entry.isFile() && /\.(profile|plan|status|queue|trace)\.md$/.test(entry.name)) {
      return true;
    }
    if (!entry.isDirectory()) {
      continue;
    }
    if (["_framework", "_artifacts", "_reference", "_cache", "final", "node_modules", ".git"].includes(entry.name)
      || entry.name.startsWith("final_")) {
      continue;
    }
    if (hasRunControlFilesBelow(path, depth + 1)) {
      return true;
    }
  }
  return false;
}

export function stopDecisionForRun(root) {
  const located = locateRunFiles(root);
  if (located.findings.length > 0) {
    if (looksLikeV12Run(root) || hasRunControlFilesBelow(root)) {
      return {
        decision: "block",
        reason: [
          "Deep Research stop guard could not identify exactly one complete V12 run root.",
          "Repair the run root control files, run from the instantiated run directory, or set DEEP_RESEARCH_RUN_ROOT to the exact run directory.",
        ].join(" "),
      };
    }
    return {
      decision: "approve",
      reason: `Deep Research stop guard found no complete run control-file set under ${root}; allowing stop.`,
    };
  }

  const texts = readRunTexts(located.files);
  const snapshot = stopAuthorizationSnapshot(texts);
  if (snapshot.authorized) {
    return {
      decision: "approve",
      reason: `Deep Research stop authorized: ${snapshot.expectedState}.`,
    };
  }

  return {
    decision: "block",
    reason: [
      "Deep Research stop not authorized.",
      "Do not report progress or ask the user to continue.",
      `Continue: ${snapshot.nextAction}.`,
    ].join(" "),
  };
}

export function stopDecisionForEvent(event) {
  if (event.stop_hook_active === true) {
    return {
      decision: "approve",
      reason: "stop_hook_active=true; allowing stop to avoid a Stop hook loop.",
    };
  }

  const root = candidateRoot(event);
  if (!existsSync(root)) {
    if (process.env.DEEP_RESEARCH_RUN_ROOT) {
      return {
        decision: "block",
        reason: `Deep Research stop guard DEEP_RESEARCH_RUN_ROOT does not exist: ${root}.`,
      };
    }
    return {
      decision: "approve",
      reason: `Deep Research stop guard target does not exist: ${root}; allowing stop.`,
    };
  }

  return stopDecisionForRun(root);
}

export function main() {
  const event = readStdinJson();
  process.stdout.write(JSON.stringify(stopDecisionForEvent(event)));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
