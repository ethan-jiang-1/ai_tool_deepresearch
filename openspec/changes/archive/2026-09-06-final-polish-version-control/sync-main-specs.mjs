// Run-scoped helper: sync 6 MODIFIED delta requirements into main specs with delta-synced markers.
// Usage: node sync-main-specs.mjs <change-root> <specs-root>
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const changeRoot = process.argv[2];
const specsRoot = process.argv[3];
if (!changeRoot || !specsRoot) throw new Error('usage: node sync-main-specs.mjs <change-root> <specs-root>');

const changeName = '2026-09-06-final-polish-version-control';

// [capability, requirementTitle, deltaFilePath]
const targets = [
  ['bundle/artifact-persistence-recovery', 'Final publication SHALL emit strict results and protect the reserved primary namespace', 'bundle/artifact-persistence-recovery/spec.md'],
  ['bundle/artifact-persistence-recovery', 'Final auxiliary directories SHALL bind to their primary version', 'bundle/artifact-persistence-recovery/spec.md'],
  ['bundle/run-entry', 'Entry trigger hands control to Agent-run Harness execution', 'bundle/run-entry/spec.md'],
  ['research/content-delivery-experiments', 'Delivery tail and Final refinement playbooks', 'research/content-delivery-experiments/spec.md'],
  ['research/content-delivery-phase-content', 'Final delivery remains terminal while iterating in place', 'research/content-delivery-phase-content/spec.md'],
  ['research/content-delivery-phase-content', 'Final guidance SHALL bind auxiliary detail archives to their version and maintain the series index', 'research/content-delivery-phase-content/spec.md'],
  ['research/post-final-recovery', 'Post-final recovery SHALL expose one direct eligibility and request contract', 'research/post-final-recovery/spec.md'],
  ['workflow/workflow-node-contract', 'Final node terminal semantics', 'workflow/workflow-node-contract/spec.md'],
];

function splitDeltaRequirement(deltaText, title) {
  // Split into requirement blocks on '### Requirement:' boundaries
  const blocks = deltaText.split(/(?=^### Requirement:)/m);
  const block = blocks.find((b) => b.startsWith(`### Requirement: ${title}`));
  if (!block) throw new Error(`delta requirement not found: ${title}`);
  return block.trimEnd() + '\n';
}

function replaceMainRequirement(mainText, title, replacement) {
  const pattern = new RegExp(`(^### Requirement: ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n[\\s\\S]*?)(?=^### Requirement:|\\z)`, 'm');
  if (!pattern.test(mainText)) throw new Error(`main requirement not found: ${title}`);
  return mainText.replace(pattern, replacement + '\n');
}

function addSyncMarker(mainText, capability, reqHint) {
  if (mainText.includes('> delta-synced:')) return mainText;
  // Insert after the req line (first line starting with '> req:')
  const lines = mainText.split('\n');
  const idx = lines.findIndex((l) => l.startsWith('> req:'));
  if (idx === -1) return mainText;
  lines.splice(idx + 1, 0, `> delta-synced: ${changeName} (${reqHint})`);
  return lines.join('\n');
}

for (const [capability, title, deltaFile] of targets) {
  const mainPath = path.join(specsRoot, capability, 'spec.md');
  const deltaPath = path.join(changeRoot, 'specs', deltaFile);
  const mainText = readFileSync(mainPath, 'utf8');
  const deltaText = readFileSync(deltaPath, 'utf8');
  const replacement = splitDeltaRequirement(deltaText, title);
  const updated = replaceMainRequirement(mainText, title, replacement);
  const marked = addSyncMarker(updated, capability, title);
  writeFileSync(mainPath, marked);
  console.log(`synced ${capability}: ${title.slice(0, 50)}…`);
}
console.log('done');
