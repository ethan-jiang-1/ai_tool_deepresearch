import { Finding } from "../../lib/finding.mjs";
import { parseBulletField } from "../../lib/markdown.mjs";
import { INST_STATE_EXPECTED } from "../../contracts/constants.mjs";
import { cleanField } from "../runtime-shared.mjs";
import { checkInstantiation } from "../check-instantiation.mjs";

export function instantiationCompleteGateFindings(root, files, texts) {
  const findings = [];
  const status = texts.status;
  for (const [field, expected] of Object.entries(INST_STATE_EXPECTED)) {
    const actual = cleanField(parseBulletField(status, field));
    if (actual !== expected) {
      findings.push(new Finding("E007", `instantiation_complete requires STATUS ${field}=${expected}; found ${actual || "missing"}`));
    }
  }
  const nextGate = cleanField(parseBulletField(status, "next_gate"));
  if (nextGate !== "setup_ready") {
    findings.push(new Finding("E007", `instantiation_complete requires STATUS next_gate=setup_ready; found ${nextGate || "missing"}`));
  }
  return findings;
}

export function checkGateInstantiationComplete(root) {
  return checkInstantiation(root);
}
