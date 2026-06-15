import { join } from "node:path";
import { exists, isDirectory } from "./lib/fs.mjs";
import { locateRunFiles } from "./lib/run_files.mjs";

export function detectGate(root) {
  if (
    exists(join(root, "COMMANDS.md"))
    && exists(join(root, "command_playbooks/instantiate-run-bundle.md"))
    && exists(join(root, "specs/CHARTER.md"))
    && exists(join(root, "output_templates/PLAN.md"))
  ) {
    return "check-template";
  }
  const { findings } = locateRunFiles(root);
  if (
    findings.length === 0
    && isDirectory(join(root, "_framework"))
    && isDirectory(join(root, "seed_topics"))
  ) {
    return "check-runtime";
  }
  return "unknown";
}
