import { runIfMain } from "./test-runtime-harness.mjs";
import { tests as fanInPromotionTests } from "./test-runtime-regression-fan-in-promotion.mjs";
import { tests as fanInTerminalTests } from "./test-runtime-regression-fan-in-terminal.mjs";

export const tests = [
  ...fanInPromotionTests,
  ...fanInTerminalTests,
];

runIfMain(import.meta.url, tests);
