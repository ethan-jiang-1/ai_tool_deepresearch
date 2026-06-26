import { runIfMain } from "./test-runtime-harness.mjs";
import { tests as instantiationGateTests } from "./test-runtime-regression-gates-instantiation.mjs";
import { tests as waveGateTests } from "./test-runtime-regression-gates-wave.mjs";

export const tests = [
  ...instantiationGateTests,
  ...waveGateTests,
];

runIfMain(import.meta.url, tests);
