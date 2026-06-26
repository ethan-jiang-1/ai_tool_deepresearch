import { Finding } from "../../lib/finding.mjs";
import { locateRunFiles, readRunTexts } from "../../lib/run_files.mjs";
import { hierarchicalSectionText, parseBulletField } from "../../lib/markdown.mjs";
import { GATE_REGISTRY } from "../../contracts/gates.mjs";
import { cleanField } from "../runtime-shared.mjs";

export const GATE_RANK = Object.fromEntries(GATE_REGISTRY.map((gate, idx) => [gate.id, idx]));

export function loadRun(root) {
  const { files, findings } = locateRunFiles(root);
  if (findings.length > 0) {
    return { files, texts: null, findings };
  }
  return { files, texts: readRunTexts(files), findings: [] };
}

export function currentGate(texts) {
  return cleanField(parseBulletField(texts.status, "current_gate"));
}

export function gateReached(texts, gateId) {
  const actual = currentGate(texts);
  return (GATE_RANK[actual] ?? -1) >= (GATE_RANK[gateId] ?? Number.POSITIVE_INFINITY);
}

export function gateReachedFindings(texts, gateId) {
  if (gateReached(texts, gateId)) {
    return [];
  }
  return [new Finding("E007", `${gateId} has not been reached; STATUS current_gate=${currentGate(texts) || "missing"}`)];
}

export function gateActiveOrReached(texts, gateId) {
  return gateReached(texts, gateId);
}

export function sectionFieldFindings(status, sectionName, fields) {
  const findings = [];
  const section = hierarchicalSectionText(status, sectionName);
  if (!section) {
    return [new Finding("E007", `STATUS missing ${sectionName}`)];
  }
  for (const [field, expected] of fields) {
    const actual = cleanField(parseBulletField(section, field));
    if (actual !== expected) {
      findings.push(new Finding("E007", `${sectionName}.${field} must be ${expected}; found ${actual || "missing"}`));
    }
  }
  return findings;
}

export function checkStandaloneGate(root, gateId, runtimeFindings) {
  const { files, texts, findings } = loadRun(root);
  if (findings.length > 0) {
    return findings;
  }
  return [
    ...gateReachedFindings(texts, gateId),
    ...runtimeFindings(root, files, texts, { standalone: true }),
  ];
}
