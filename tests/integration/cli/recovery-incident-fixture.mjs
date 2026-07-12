import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function addCanonicalRecoveryIncident(bundlePath, { identity = 'topic-x' } = {}) {
  const files = {
    [`artifacts/wave1/${identity}/evidence-summary.md`]: `# ${identity} evidence\n`,
    [`reference/${identity}-source.md`]: `- related_topic: ${identity}\n\n## Key Facts\n- Durable registry-external result.\n`,
    [`artifacts/addendum/${identity}/result.md`]: `- topic_slug: ${identity}\n\n## Result\nParallel durable output.\n`,
  };
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(bundlePath, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
  const statusPath = join(bundlePath, 'rb_status.json');
  const existingStatus = JSON.parse(readFileSync(statusPath, 'utf8'));
  writeFileSync(statusPath, JSON.stringify({
    ...existingStatus,
    current_gate: 'readiness_passed',
    next_gate: 'none',
    current_node: 'phases/phase-final.md',
  }, null, 2));
}
