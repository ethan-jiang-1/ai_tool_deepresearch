import { dirname } from "node:path";
import { locateRunFiles, readRunTexts } from "../lib/run_files.mjs";
import { hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import { seedIntakeFindings } from "./check-instantiation.mjs";
import { seedTopicShapeFindings } from "./seed-topic-shape.mjs";

function seedReadyStatus(status) {
  return parseBulletField(hierarchicalSectionText(status, "Setup Ready Transition"), "seed_topic_intake_ready");
}

export function checkSeedIntake(root) {
  const { files, findings } = locateRunFiles(root);
  if (findings.length > 0) {
    return findings;
  }
  const texts = readRunTexts(files);
  const currentGate = parseBulletField(texts.status, "current_gate");
  return [
    ...seedIntakeFindings(texts),
    ...seedTopicShapeFindings(dirname(files.status), texts, {
      allowQueueBackedSeedShapeGaps: currentGate === "setup_ready" && seedReadyStatus(texts.status) === "gap_queue_backed",
    }),
  ];
}
