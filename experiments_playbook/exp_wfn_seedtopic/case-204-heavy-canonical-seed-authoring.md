---
schema: command-experiment/v2
experiment: wfn-seedtopic
case: case-204-heavy-canonical-seed-authoring
case_goal: "Prove a real Subject Agent uses the structured canonical seed writer from a legal queued Seed Topics boundary."
verdict_mode: all
required_checks: [case-204-real-subject-execution, case-204-structured-writer, case-204-canonical-values, case-204-queue-complete, case-204-seed-gate-pass]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: CTS-003, STM-001, AGQ-002
not_run_if: "The independent authenticated Subject Agent runtime is unavailable."
---

# Case 204 - Canonical Seed Authoring

The Playbook Agent prepares only a legal Seed Topics entry with one queued card. The independent authenticated Subject Agent receives a minimal exact runbook for the existing production commands, then owns body authoring, retained `enrich_seed` input, writer invocation, queue completion, and the real Gate. No fixture or Playbook output can substitute for Subject evidence.

```bash
B=$(node experiments_env/shared/prepare-canonical-seed-authoring-canary.mjs --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node experiments_env/shared/run-iterative-interaction-subject.mjs 204 --bundle "$B" || printf '%s\n' unavailable > "$B/case-204-subject-unavailable.txt"
```

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA=()
if [ -f "$B/case-204-subject-unavailable.txt" ]; then
  EXTRA+=(--not-run-reason "independent authenticated Subject Agent runtime unavailable")
else
  node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2);
const setup = JSON.parse(readFileSync(join(bundle, 'case-204-setup.json'), 'utf8'));
const seed = readFileSync(join(bundle, `seed_topics/${setup.topic.slug}.md`), 'utf8');
const frontmatter = parseYaml(seed.match(/^---\n([\s\S]*?)\n---/)[1]);
const queue = JSON.parse(readFileSync(join(bundle, 'rb_queue.json'), 'utf8'));
const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const prompt = JSON.parse(readFileSync(join(bundle, 'case-204-subject-prompt.json'), 'utf8'));
const result = JSON.parse(readFileSync(join(bundle, 'case-204-subject-result.json'), 'utf8'));
const checks = [
  ['case-204-real-subject-execution', prompt.subject === '204' && result.status === 'completed'],
  ['case-204-structured-writer', frontmatter.hypothesis && frontmatter.search_guardrails && frontmatter.evidence_route],
  ['case-204-canonical-values', JSON.stringify(frontmatter.must_answer) === JSON.stringify(setup.topic.must_answer)],
  ['case-204-queue-complete', queue.terminal_history.some((row) => row.queue_item_id === 'case-204-seed' && row.terminal_status === 'done')],
  ['case-204-seed-gate-pass', trace.some((event) => event.event === 'gate_attempt' && event.gate === 'seed-topics-ready' && event.passed === true)],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
JS
  EXTRA+=(--evidence "subject_prompt=$B/case-204-subject-prompt.json" --evidence "subject_transcript=$B/case-204-subject-transcript.jsonl" --evidence "subject_result=$B/case-204-subject-result.json")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA[@]}"
```

Runtime unavailability is an honest `NOT_RUN`; it does not establish the real-Agent claim.
