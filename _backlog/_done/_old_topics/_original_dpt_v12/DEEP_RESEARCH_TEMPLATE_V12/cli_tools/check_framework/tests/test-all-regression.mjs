import { runIfMain } from "./test-runtime-harness.mjs";
import { tests as templateTests } from "./test-template-regression.mjs";
import { tests as runtimeTests } from "./test-runtime-regression.mjs";
import { tests as stopGuardTests } from "./test-stop-guard.mjs";
import { tests as exaSourceIntakeTests } from "./test-exa-source-intake.mjs";

export const tests = [
  ...templateTests,
  ...runtimeTests,
  ...exaSourceIntakeTests,
  ...stopGuardTests,
];

runIfMain(import.meta.url, tests);
