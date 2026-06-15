export const GATE_REGISTRY = [
  {
    id: "instantiation_complete",
    label: "Instantiation Complete",
    currentWave: "Instantiation",
    specPath: "specs/gates/instantiation-complete.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_instantiation_complete.mjs",
    cliName: "check-gate-instantiation-complete",
  },
  {
    id: "setup_ready",
    label: "Setup Ready",
    currentWave: "Wave 0",
    specPath: "specs/gates/setup-ready.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_setup_ready.mjs",
    cliName: "check-gate-setup-ready",
  },
  {
    id: "wave0_complete",
    label: "Wave 0 Complete",
    currentWave: "Wave 1",
    specPath: "specs/gates/wave0-complete.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_wave0_complete.mjs",
    cliName: "check-gate-wave0-complete",
  },
  {
    id: "wave1_complete",
    label: "Wave 1 Complete",
    currentWave: "Wave 2",
    specPath: "specs/gates/wave1-complete.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_wave1_complete.mjs",
    cliName: "check-gate-wave1-complete",
  },
  {
    id: "wave2_complete",
    label: "Wave 2 Complete",
    currentWave: "Readiness Check",
    specPath: "specs/gates/wave2-complete.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_wave2_complete.mjs",
    cliName: "check-gate-wave2-complete",
  },
  {
    id: "readiness_passed",
    label: "Readiness Passed",
    currentWave: "Readiness Check",
    specPath: "specs/gates/readiness-passed.md",
    checkerPath: "cli_tools/check_framework/checks/gates/check_gate_readiness_passed.mjs",
    cliName: "check-gate-readiness-passed",
  },
];

export const GATE_IDS = GATE_REGISTRY.map((gate) => gate.id);
export const GATE_CLI_NAMES = GATE_REGISTRY.map((gate) => gate.cliName);

export function gateById(id) {
  return GATE_REGISTRY.find((gate) => gate.id === id) ?? null;
}

export function gateByCliName(cliName) {
  return GATE_REGISTRY.find((gate) => gate.cliName === cliName) ?? null;
}
