# Apply Verification Results

## Passed Direct Evidence

- `node --test tests/integration/md/seed-topic-projection-document-contract.test.mjs tests/integration/md/seed-topic-authoring-contract.test.mjs`: 8/8. This verifies the pure `templates/` document boundary, exact card/heading placement, direct phase loading, and command-playbook-only packet/repair/rerun mechanics.
- `node --test tests/engine/helpers/seed-topic-projection.test.mjs`: 9/9. This verifies slot-map parity, authority-bound packet admission, atomic writer behavior, legacy-layout handling, recovery, and read-side readiness behavior.
- `node --test tests/integration/cli/operate-topic-state-projection.test.mjs`: 3/3. This verifies public-CLI packet application in the loaded Wave window and pre-write rejection outside it or with raw Markdown control input.
- `node --test tests/e2e/seed-topic-projection-materialization.test.mjs`: 2/2. This verifies the deterministic Wave0 -> Wave1 -> Wave2 authority -> packet -> writer -> same-inspect -> completion -> gate chain, including no-demand and degradation-ineligible failures.
- `npm test`: passed.
- `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`: passed.
- `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook`: 102 passed, 0 failed.
- `node openspec/governance/check-verification-routing.mjs --change fix-seed-topic-projection-materialization --mode assets`, `node openspec/governance/check-project-reqs.mjs`, `node openspec/governance/check-project-specs.mjs`, `openspec validate fix-seed-topic-projection-materialization --strict`, and `git diff --check`: passed.

## Native Agent Evidence

No native Agent-flow claim is selected. The attempted heavy case took 283
seconds across 40 Agent turns; the attempted light replacement still timed out
before its nested Subject could begin because the Playbook Agent and Subject
Agent are serial runtimes. These diagnostic runs are not acceptance evidence.
The change instead relies on static document/protocol contracts and the
production-CLI deterministic Wave chain, which directly proves the behavior
this bug changes.
