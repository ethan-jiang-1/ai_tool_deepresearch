## 0. Apply Preconditions And Durable Review

- [x] 0.1 Complete the change plan review before any target edit (openspec-feedback:plan-review).
  Review the proposal, delta spec, design, tasks, and
  verification plan against the touched governance/entry surfaces. Done when any actionable
  finding has become an ordinary unchecked task naming its affected requirement or reader
  question, authoritative owner, smallest repair, and observable done condition; otherwise this
  marker records only that the scoped review occurred. (CHF-001)
- [ ] 0.2 Register `CHF-001` through `CHF-004` under a new alphabetically placed
  `change-feedback-loop` group and `CHF: change-feedback-loop` prefix in
  `openspec/governance/req-registry.yaml`, then run
  `node openspec/governance/check-project-reqs.mjs`,
  `node openspec/governance/check-project-specs.mjs`,
  `node openspec/governance/check-verification-routing.mjs --change establish-openspec-change-feedback-loop --mode plan`,
  and `openspec validate establish-openspec-change-feedback-loop --strict` before target edits.
  Done when each command exits zero and the registry descriptions match the four delta
  requirements. (CHF-001, CHF-002, CHF-003, CHF-004)

## 1. Guidance And Durable Lifecycle Contract

- [ ] 1.1 Add `guidelines/change-feedback-loop.md` as the sole advisory review posture and add
  `rules.tasks` plus `operations.apply/archive.guidance` in `openspec/config.yaml`. Generate the
  two exact checkbox markers as first-class lifecycle tasks; make the operation entries include
  the stable `change-feedback-loop/apply` and `change-feedback-loop/archive` identifiers and
  preserve the separation of task ledger, Agent review, and deterministic verdict. Done when a
  fresh temporary change's task instructions expose one pending marker of each kind and native
  operation instructions return the corresponding non-empty guidance entry. (CHF-001, CHF-002)
- [ ] 1.2 Update `AGENTS.md`, `CLAUDE.md`, `.codex/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/openspec-apply-change/SKILL.md`,
  `.agents/skills/source-command-opsx-apply/SKILL.md`, and `.codex/prompts/opsx-apply.md` so
  every supported apply route retrieves and presents valid current apply guidance, stops before
  target edits on an invalid/missing lookup, directs plan review and pending feedback tasks, and
  does not treat guidance as proof. Done when the shared conformance test can identify the same
  required lookup/retry behavior at every declared apply entry. (CHF-001, CHF-002)
- [ ] 1.3 Update `.codex/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/openspec-archive-change/SKILL.md`,
  `.agents/skills/source-command-opsx-archive/SKILL.md`, and `.codex/prompts/opsx-archive.md`
  so every supported archive route retrieves valid current archive guidance, performs the
  Agent-owned closeout/sync/re-comparison steps, stops on a failed lookup, and uses only the
  finalizer for the final mechanical transition. Remove raw move and alternate direct native
  archive success instructions. Done when each declared archive entry preserves change identity
  and exposes the finalizer command after semantic work. (CHF-002, CHF-004)

## 2. Governed Archive Finalizer

- [ ] 2.1 Create `openspec/governance/finalize-change-archive.mjs` with its small
  `--change <active-change>` CLI, safe selection parsing, exported Zod result schemas, exact
  marker/task parser, stable rerun coordinate, and one owned inventory of supported apply/archive
  entry paths. Done when unit tests distinguish missing, duplicate, pending, completed, and
  ordinary incomplete task lines without treating prose or a review marker as semantic proof.
  (CHF-001, CHF-003, CHF-004)
- [ ] 2.2 Implement the finalizer's read-only short-circuit path: native status-derived active
  paths and artifact states; resolved task-file checks; unique completed markers and zero other
  pending tasks; strict OpenSpec validation; then requirement, main-spec, and verification-routing
  asset checks in that order. Map the first direct failure to root-first structured JSON with
  observed fact, owner, legal repair coordinate only when one exists, and the unchanged finalizer
  rerun. Done when injected command/file boundary tests prove no later check or native archive
  call occurs after every earlier root. (CHF-003)
- [ ] 2.3 Implement the finalizer's only mutating step as
  `openspec archive <name> --json --skip-specs`, without `--yes` or `--no-validate`, after all
  direct preconditions pass. Parse the native result and report success only when change identity,
  `specsUpdated: false`, resolved archive descent/existence, and active-path absence agree;
  otherwise report the observed native or post-move boundary without raw move, merge, retry, or
  rollback. Done when focused tests cover invalid native JSON, nonzero native exit, and a valid
  result/path match. (CHF-003)

## 3. Deterministic Proof

- [ ] 3.1 Add `tests/governance/change-feedback-finalizer.test.mjs` for the importable finalizer
  contracts: strict marker parsing, result-schema rejection, earliest-root mapping, and command
  ordering. Done when it uses no OpenSpec fixture root or native archive move and proves the
  parser accepts only task-line markers. (CHF-001, CHF-003)
- [ ] 3.2 Add `tests/integration/governance/change-feedback-finalizer.test.mjs` for temporary
  OpenSpec fixture roots and production command boundaries. Cover operation-guidance delivery,
  missing/incomplete prerequisites before native archive, each existing governance-check
  short-circuit, and the exported supported-entry inventory's apply/archive conformance including
  rejection of raw/direct archive bypass text. Done when the test does not claim Agent review
  quality or execute an unrelated repository archive. (CHF-002, CHF-003, CHF-004)
- [ ] 3.3 Add `tests/e2e/change-feedback-loop-archive.test.mjs` that builds one isolated valid
  temporary OpenSpec fixture after explicitly simulating only planning artifacts and completed
  task evidence, synchronizes the fixture main spec in setup, invokes the real finalizer/native
  archive path, and proves the active-to-archive move plus `specsUpdated: false`. Done when no
  test hand-writes a finalizer success result, no main spec is written by the finalizer, and the
  test leaves no fixture outside its temporary root. (CHF-003, CHF-004)

## 4. Closeout And Archive

- [ ] 4.1 Synchronize the `change-feedback-loop` delta into
  `openspec/specs/change-feedback-loop/spec.md` through the Agent-owned OpenSpec sync flow, then
  re-compare every delta requirement/scenario with the resulting main spec. Done when all four
  CHF requirements are present with their scenarios intact and the finalizer can use
  `--skip-specs` without owning a spec merge. (CHF-002, CHF-003)
- [ ] 4.2 Run the selected unit, integration, and deterministic E2E tests plus
  `node openspec/governance/check-verification-routing.mjs --change establish-openspec-change-feedback-loop --mode assets`.
  Done when all selected deterministic claims have native passing evidence, no `agent_flow_e2e`
  result is asserted, and any failure becomes an ordinary repair task before closeout. (CHF-001,
  CHF-002, CHF-003, CHF-004)
- [ ] 4.3 Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports zero
  duplicate, unregistered, orphan, and reused-retired requirement IDs after registry and main-spec
  synchronization. (CHF-001, CHF-002, CHF-003, CHF-004)
- [ ] 4.4 Run `node openspec/governance/check-project-specs.mjs`,
  `openspec validate establish-openspec-change-feedback-loop --strict`, and `git diff --check`.
  Done when main specs have no delta-format/required-header defects, all planning artifacts remain
  strict-valid, and the scoped diff has no whitespace errors. (CHF-001, CHF-002, CHF-003, CHF-004)
- [ ] 4.5 Complete the change-scoped actual-diff closeout review (openspec-feedback:closeout-review).
  Review the selected verification evidence and main-spec re-comparison. Done
  when any finding is an ordinary pending repair task and this marker remains open until that
  work plus a subsequent review completes; if no finding remains, all tasks are complete and the
  next lifecycle action is exactly
  `node openspec/governance/finalize-change-archive.mjs --change establish-openspec-change-feedback-loop`.
  (CHF-001, CHF-002, CHF-003, CHF-004)
