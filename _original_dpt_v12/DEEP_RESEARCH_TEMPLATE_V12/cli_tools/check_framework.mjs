#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECK_NAMES, CHECKS } from "./check_framework/checks/index.mjs";
import { detectGate } from "./check_framework/detect_gate.mjs";
import { helperNote } from "./check_framework/lib/finding.mjs";

function usage() {
  const gates = CHECK_NAMES.join(",");
  return `usage: check_framework.mjs [-h] [--gate {${gates}}] [target]

Read-only helper for Deep Research Progressive Plan V12 structural checks.

positional arguments:
  target                target path to check; defaults to current directory

options:
  -h, --help            show this help message and exit
  --gate {${gates}}     gate to run; template roots can be detected automatically`;
}

function parseArgs(argv) {
  const args = { target: ".", gate: null, help: false };
  const positionals = [];
  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === "-h" || arg === "--help") {
      args.help = true;
    } else if (arg === "--gate") {
      idx += 1;
      if (idx >= argv.length) {
        throw new Error("--gate requires a value");
      }
      args.gate = argv[idx];
    } else if (arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }
  if (positionals.length > 1) {
    throw new Error(`unexpected arguments: ${positionals.slice(1).join(" ")}`);
  }
  if (positionals.length === 1) {
    args.target = positionals[0];
  }
  if (args.gate && !CHECKS[args.gate]) {
    throw new Error(`invalid --gate: ${args.gate}`);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`error: ${error.message}`);
    console.error(usage());
    return 2;
  }

  if (args.help) {
    console.log(usage());
    return 0;
  }

  const root = resolve(args.target);
  if (!existsSync(root)) {
    console.log(`FAIL E002 missing target path: ${root}`);
    return 1;
  }

  const gate = args.gate || detectGate(root);
  if (gate === "unknown") {
    console.log(`FAIL E001 could not identify target layer: ${root}`);
    return 1;
  }

  const findings = CHECKS[gate](root);
  console.log(helperNote());
  if (findings.length > 0) {
    const [first, ...rest] = findings;
    console.log(`FAIL ${first.code} ${first.message}`);
    for (const finding of rest) {
      console.log(`NOTE ${finding.code} ${finding.message}`);
    }
    return 1;
  }

  console.log(`PASS ${gate} ${root}`);
  return 0;
}

function isDirectRun() {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
  }
}

if (isDirectRun()) {
  process.exitCode = main();
}
