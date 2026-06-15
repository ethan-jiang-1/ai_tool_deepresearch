import { Finding } from "../../lib/finding.mjs";
import { GATE_REGISTRY } from "../../contracts/gates.mjs";
import { wave0CompleteGateFindings, checkGateWave0Complete } from "./check_gate_wave0_complete.mjs";
import { wave1CompleteGateFindings, checkGateWave1Complete } from "./check_gate_wave1_complete.mjs";
import { wave2CompleteGateFindings, checkGateWave2Complete } from "./check_gate_wave2_complete.mjs";
import { readinessPassedGateFindings, checkGateReadinessPassed } from "./check_gate_readiness_passed.mjs";
import { instantiationCompleteGateFindings, checkGateInstantiationComplete } from "./check_gate_instantiation_complete.mjs";
import { setupReadyRuntimeFindings, checkGateSetupReady } from "./check_gate_setup_ready.mjs";
import { currentGate, GATE_RANK } from "./check_gate_common.mjs";

export const GATE_CHECKS = {
  "check-gate-instantiation-complete": checkGateInstantiationComplete,
  "check-gate-setup-ready": checkGateSetupReady,
  "check-gate-wave0-complete": checkGateWave0Complete,
  "check-gate-wave1-complete": checkGateWave1Complete,
  "check-gate-wave2-complete": checkGateWave2Complete,
  "check-gate-readiness-passed": checkGateReadinessPassed,
};

export const GATE_RUNTIME_FINDINGS = {
  instantiation_complete: instantiationCompleteGateFindings,
  setup_ready: setupReadyRuntimeFindings,
  wave0_complete: wave0CompleteGateFindings,
  wave1_complete: wave1CompleteGateFindings,
  wave2_complete: wave2CompleteGateFindings,
  readiness_passed: readinessPassedGateFindings,
};

function uniqueFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.code}\0${finding.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function runtimeGateFindings(root, files, texts) {
  const activeGate = currentGate(texts);
  const activeRank = GATE_RANK[activeGate];
  if (activeRank === undefined) {
    return [];
  }

  const findings = [];
  for (const gate of GATE_REGISTRY) {
    if (gate.id === "instantiation_complete") {
      continue;
    }
    if ((GATE_RANK[gate.id] ?? Number.POSITIVE_INFINITY) > activeRank) {
      continue;
    }
    const gateFindings = GATE_RUNTIME_FINDINGS[gate.id];
    if (gateFindings) {
      findings.push(...gateFindings(root, files, texts));
    }
  }
  return uniqueFindings(findings);
}

export function gateRegistryIntegrityFindings() {
  return GATE_REGISTRY.flatMap((gate) => {
    const hasCheck = GATE_CHECKS[gate.cliName];
    const hasRuntime = GATE_RUNTIME_FINDINGS[gate.id];
    return [
      ...(hasCheck ? [] : [new Finding("E008", `gate registry cliName is not registered: ${gate.cliName}`)]),
      ...(hasRuntime ? [] : [new Finding("E008", `gate registry id is not registered for runtime findings: ${gate.id}`)]),
    ];
  });
}
