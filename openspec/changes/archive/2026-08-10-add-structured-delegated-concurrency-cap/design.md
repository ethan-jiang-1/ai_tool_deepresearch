## Context

See [proposal.md](proposal.md) for motivation and the two delta specs for the behavioral contract. Today the profile schema has no delegated-concurrency field, while Wave0/Wave1/Wave2 and the shared protocol retain a prose-only conservative default. The existing claim transaction already accepts a requested count, performs actor/admission/queue checks, and retains `phase_agent_fallback = 1`.

## Goals / Non-Goals

**Goals:**

- Give each run one schema-validated, visible delegated fan-out policy input.
- Make every delegated phase calculate the same bounded top-up count and permit seven independent claims under the default policy.
- Preserve the Engine's existing allocation, admission, fallback, receipt, and transaction authority.
- Produce deterministic contract evidence for the profile control, guidance, and existing claim path without overstating it as proof of host capacity or physical concurrency.

**Non-Goals:**

- No Engine scheduler, slot model, queue-state migration, daemon, host probe, CLI flag, or environment-variable override.
- No allocation of work IDs by sub-agents and no change to `operate-work-unit claim`'s default count behavior.
- No assertion that a schema value, claim response, or fixture test proves host capacity, actor liveness, or physical native concurrency.

## Decisions

### One profile-owned policy value

The `ProfileSchema`-parsed `rb_profile.yaml` profile is the direct Source of Record. An explicit `rb_profile.yaml#/delegated_concurrency_cap` is its persisted override; `ProfileSchema` will define the effective value as `z.number().int().min(1).max(20).default(12)` when that key is omitted, and `rb_profile.yaml.tmpl` will render `delegated_concurrency_cap: 12` for new bundles. No cross-field relationship exists, so a `.refine()` is not warranted; the bounded scalar's own Zod contract is the complete deterministic validation.

The parsed default preserves readability of legacy profiles that omit the field. Explicit run-profile values are the only override mechanism. The upper bound is the existing `active_window` limit of 20, not a statement that a host can execute 20 actors.

**Alternative rejected:** a CLI/env cap creates competing configuration precedence and makes a bundle's policy non-reproducible. A new scheduler would duplicate the existing claim, queue, and actor-preflight authority.

### One formula, projected by existing phase guidance

Wave0, Wave1, Wave2, and the shared protocol will use:

```text
claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)
```

`remaining_free_capacity` is reconstructed from current normal delegated in-flight work. The Agent passes the resulting explicit value to the existing `claim --count` command. Engine acceptance remains conditional on its current contiguous-prefix, role, actor, admission, and transaction-drift checks. The existing fallback branch remains one claim.

**Alternative rejected:** placing this calculation in the Engine would turn Agent execution guidance into a second scheduling controller and would unnecessarily change the existing CLI contract.

### Quarantine the unbounded seven-actor canary

`experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md` is the only active playbook that attempts a seven-real-actor batch. It has been designated extreme-slow: the seven distinct Actor handoffs, external search/fetch capability, lifecycle evidence, and native finalization make it unsuitable for routine or budget-bounded verification. No active lighter playbook can make the same Actor-behavior claim, so substituting one would misstate the proof boundary.

Move the playbook to `experiments_playbook/exp_extrem_slow/case-221-extreme-slow-batch-subagent.md`, remove its active manifest registration and case-specific deterministic contract test, and record it in the explicit quarantine lists. The quarantine directory is excluded from Autorun and Interactive selection. This change consequently selects no `agent_flow_e2e` evidence: the schema, claim-path, and Markdown tests prove their stated deterministic contracts only. A future separately approved change may refactor and explicitly re-register a bounded real-actor canary; it must not infer a PASS from the quarantined case or a fixture substitute.

### Design review

**Semantic precision:** the new field answers one bounded reader question: “what policy ceiling constrains this Phase Agent's next normal delegated top-up?” It preserves the distinctions among eligible demand, policy cap, free capacity, Engine allocation, and actual host concurrency. Reasoning stops after deriving a proposed count; the Engine then owns whether that claim is legal.

**Simple reliable control:** one profile field replaces four prose defaults. The shortest loop is profile parse -> Agent chooses explicit count -> existing claim feedback -> existing prompt/submit path. This removes phase-local default selection and avoids a scheduler, slot state, probe, retry controller, or second queue.

**Helper-oriented responsibility:** the user selects the policy and accepts host-risk implications through the run profile; the Agent executes the ordinary legal claim/handoff loop; the Engine alone returns deterministic admission, actor, lifecycle, receipt, and trace verdicts. No user choice creates Engine permission or host-liveness evidence.

## Risks / Trade-offs

- [A default of 12 exceeds actual host capacity] -> Treat the value as policy only, retain native actor fallback and honest `NOT_RUN`/failure evidence, and do not claim capacity from deterministic tests.
- [Legacy profile omission silently changes the documented normal default] -> Make the default explicit in the schema/template, release notes, and Wave guidance; users can pin `1..20` in their existing profile.
- [Phase documents drift apart] -> Cover Wave0/Wave1/Wave2/shared wording with integration tests that assert the single field, formula, top-up behavior, and fallback boundary.
- [Deterministic evidence is mistaken for physical concurrency proof] -> Keep `agent_flow_e2e` explicitly not applicable and retain the existing no-host-proof wording in tests and guidance.
- [The quarantined case is selected incidentally] -> Remove its active manifest registration and list its new path under the explicit extreme-slow quarantine inventories, which are outside Autorun and Interactive selection.

## Migration Plan

1. Add the profile field/default and template entry; existing profiles without the key parse to `12`.
2. Replace the phase-local conservative-default wording with the single formula and unchanged Engine constraints.
3. Remove the seven-actor evidence path from the active corpus, retain deterministic evidence only, then run the revised selected verification routes.
4. Release as `v0.83` with matching `CHANGELOG.md` and `RUN.md` banner.

Rollback is a release revert of the schema/template/guidance change. Explicit keys in existing YAML remain harmless to prior permissive readers but are ignored by the prior guidance; no queue migration or runtime-state repair is needed.
