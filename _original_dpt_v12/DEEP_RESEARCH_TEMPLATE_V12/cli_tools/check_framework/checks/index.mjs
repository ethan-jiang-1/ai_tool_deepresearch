import { checkInstantiation } from "./check-instantiation.mjs";
import { checkRuntime } from "./check-runtime.mjs";
import { checkQueueReceipts } from "./check-queue-receipts.mjs";
import { checkSeedIntake } from "./check-seed-intake.mjs";
import { checkSeedTopicShape } from "./check-seed-topic-shape.mjs";
import { checkSurfaces } from "./check-surfaces.mjs";
import { checkTemplate } from "./check-template.mjs";
import { GATE_CHECKS } from "./gates/index.mjs";

export const CHECKS = {
  "check-template": checkTemplate,
  "check-instantiation": checkInstantiation,
  "check-seed-intake": checkSeedIntake,
  "check-seed-topic-shape": checkSeedTopicShape,
  "check-surfaces": checkSurfaces,
  "check-queue-receipts": checkQueueReceipts,
  "check-runtime": checkRuntime,
  ...GATE_CHECKS,
};

export const CHECK_NAMES = Object.keys(CHECKS).sort();
