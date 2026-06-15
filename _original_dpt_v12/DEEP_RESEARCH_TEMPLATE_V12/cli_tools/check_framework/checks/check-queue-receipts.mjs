import { locateRunFiles, readRunTexts } from "../lib/run_files.mjs";
import { queueReceiptFindings } from "./runtime-queue-receipts.mjs";

export function checkQueueReceipts(root) {
  const { files, findings } = locateRunFiles(root);
  if (findings.length > 0) {
    return findings;
  }
  const texts = readRunTexts(files);
  return queueReceiptFindings(files, texts);
}
