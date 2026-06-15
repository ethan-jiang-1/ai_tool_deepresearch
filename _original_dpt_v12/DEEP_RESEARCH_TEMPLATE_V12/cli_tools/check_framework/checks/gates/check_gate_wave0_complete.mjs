import { gateProgressionFindings } from "../runtime-readiness.mjs";
import { countedReferenceBodyFindings, wave0GatePassFindings } from "../runtime-inventory.mjs";
import { checkStandaloneGate } from "./check_gate_common.mjs";

export function wave0CompleteGateFindings(root, files, texts) {
  return [
    ...gateProgressionFindings(texts),
    ...wave0GatePassFindings(texts),
    ...countedReferenceBodyFindings(texts, { root, files }),
  ];
}

export function checkGateWave0Complete(root) {
  return checkStandaloneGate(root, "wave0_complete", wave0CompleteGateFindings);
}
