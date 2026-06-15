import { dirname } from "node:path";
import { locateRunFiles, readRunTexts } from "../lib/run_files.mjs";
import { seedTopicShapeFindings } from "./seed-topic-shape.mjs";

export function checkSeedTopicShape(root) {
  const { files, findings } = locateRunFiles(root);
  if (findings.length > 0) {
    return findings;
  }
  const texts = readRunTexts(files);
  return seedTopicShapeFindings(dirname(files.status), texts);
}
