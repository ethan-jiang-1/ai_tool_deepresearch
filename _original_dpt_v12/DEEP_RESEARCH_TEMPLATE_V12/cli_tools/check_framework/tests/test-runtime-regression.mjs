import { runIfMain } from "./test-runtime-harness.mjs";
import { tests as inventoryTests } from "./test-runtime-regression-inventory.mjs";
import { tests as sourceIntakeTests } from "./test-runtime-regression-source-intake.mjs";
import { tests as fanInTests } from "./test-runtime-regression-fan-in.mjs";
import { tests as gateTests } from "./test-runtime-regression-gates.mjs";
import { tests as profileTests } from "./test-runtime-regression-profile.mjs";
import { tests as queueGateTests } from "./test-runtime-regression-queue-gates.mjs";
import { tests as queueReceiptTests } from "./test-runtime-regression-queue-receipts.mjs";
import { tests as stopAuthorizationTests } from "./test-runtime-regression-stop-authorization.mjs";

export const tests = [
  ...inventoryTests,
  ...sourceIntakeTests,
  ...fanInTests,
  ...gateTests,
  ...profileTests,
  ...queueGateTests,
  ...queueReceiptTests,
  ...stopAuthorizationTests,
];

runIfMain(import.meta.url, tests);
