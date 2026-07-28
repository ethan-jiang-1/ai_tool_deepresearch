## 1. Contract Preparation

- [x] 1.1 Run the verification-plan routing check before target edits and preserve the existing `GSK-004`/`RWG-021` requirement ownership.
- [x] 1.2 Confirm the affected normal Wave formal-evaluation path begins after existing invocation, definition, node-binding, and handoff-preflight envelopes; preserve those early shared Gate contracts. (`GSK-004`, `RWG-021`)

## 2. Verdict Projection

- [x] 2.1 Implement one pure Wave public-verdict projection that partitions existing direct findings into blocking `failed_rule_ids` or carried `degraded_rules` without I/O, routing, trace writes, eligibility inference, or mutation. (`GSK-004`, `RWG-021`)
- [x] 2.2 Apply that projection to Wave0, Wave1, and Wave2 while retaining each wrapper's evaluator, attempt count, route lookup, receipt validation, and strict trace-write ownership. (`GSK-004`, `RWG-021`)
- [x] 2.3 Make strict trace/routing failures emit exactly one blocking envelope with no consumable clean or degraded handoff, and retain carried rules as attempt-trend comparison input without adding a public field. (`GSK-004`)

## 3. Consumer And Guidance Alignment

- [x] 3.1 Audit and adjust existing `gate_attempt`, attempt diagnostics, `enter-phase`, `advance-status`, diagnostics, and handoff readers so a legal degraded route retains debt without being represented as a clean quality pass. (`GSK-004`, `RWG-021`)
- [x] 3.2 Update only the affected Wave/command guidance to require reading degraded context before consuming the existing `check.next`; add no user interaction, controller, or authority mutation path. (`RWG-021`)

## 4. Focused Evidence

- [x] 4.1 Add unit coverage for the clean, blocking, and degraded public summary matrix, raw diagnostic finding preservation, and carried-debt attempt-trend continuity. (`GSK-004`)
- [x] 4.2 Extend Wave CLI integration coverage for Wave0 eligible degradation, Wave1/Wave2 ineligible roots, trace-write/routing failure, trace fields, handoff propagation, and unchanged early preflight envelopes. (`GSK-004`, `RWG-021`)
- [x] 4.3 Add focused Wave guidance contract coverage for checking degraded context before consuming `check.next` without a user interaction branch. (`RWG-021`)
- [x] 4.4 Extend the disposable deterministic E2E degradation chain through Gate, `enter-phase`, and status synchronization; run one current-head disposable degradation observation and retain its evidence coordinate. (`RWG-021`)
  - Evidence: `node --test tests/e2e/wave-gate-degradation-policy.test.mjs` on current head, 2026-07-29 Asia/Shanghai.

## 5. Release And Verification

- [x] 5.1 Update `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` version banner for `v0.59`. (`GSK-004`, `RWG-021`)
- [x] 5.2 Run the verification-routing asset check and every selected unit, integration, and deterministic E2E claim from `verification-plan.yaml`.
- [x] 5.3 Run `openspec validate make-wave-gate-verdict-unambiguous --strict`, `node openspec/governance/check-project-reqs.mjs`, and `node openspec/governance/check-project-specs.mjs` with zero violations before archive.
