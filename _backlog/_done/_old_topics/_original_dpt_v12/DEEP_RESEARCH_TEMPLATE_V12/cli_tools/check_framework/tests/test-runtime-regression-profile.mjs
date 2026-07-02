import { runIfMain } from "./test-runtime-harness.mjs";
import { tests as profileInstantiationTests } from "./test-runtime-regression-profile-instantiation.mjs";
import { tests as profileRuntimeTests } from "./test-runtime-regression-profile-runtime.mjs";

export const tests = [
  ...profileInstantiationTests,
  ...profileRuntimeTests,
];

runIfMain(import.meta.url, tests);
