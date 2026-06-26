import { gateProgressionFindings } from "../runtime-readiness.mjs";
import { synthesisArtifactFindings, synthesisBackingReferenceFindings, wave2GatePassFindings } from "../runtime-inventory.mjs";
import { checkStandaloneGate } from "./check_gate_common.mjs";

export function wave2CompleteGateFindings(root, files, texts) {
  return [
    ...gateProgressionFindings(texts),
    ...wave2GatePassFindings(texts),
    ...synthesisBackingReferenceFindings(texts, { root, files }),
    ...synthesisArtifactFindings(texts, { root, files }),
  ];
}

export function checkGateWave2Complete(root) {
  return checkStandaloneGate(root, "wave2_complete", wave2CompleteGateFindings);
}
