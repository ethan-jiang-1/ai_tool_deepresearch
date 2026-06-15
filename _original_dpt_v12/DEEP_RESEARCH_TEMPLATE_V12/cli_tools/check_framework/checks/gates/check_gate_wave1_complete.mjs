import { gateProgressionFindings } from "../runtime-readiness.mjs";
import { countedReferenceBodyFindings, wave1GatePassFindings } from "../runtime-inventory.mjs";
import { artifactFindings, wave1GateArtifactFindings } from "../runtime-artifact.mjs";
import { checkStandaloneGate } from "./check_gate_common.mjs";

export function wave1CompleteGateFindings(root, files, texts, options = {}) {
  return [
    ...gateProgressionFindings(texts),
    ...wave1GatePassFindings(texts),
    ...countedReferenceBodyFindings(texts, { root, files }),
    ...(options.standalone ? artifactFindings(root, files, texts) : []),
    ...wave1GateArtifactFindings(root, files, texts),
  ];
}

export function checkGateWave1Complete(root) {
  return checkStandaloneGate(root, "wave1_complete", wave1CompleteGateFindings);
}
