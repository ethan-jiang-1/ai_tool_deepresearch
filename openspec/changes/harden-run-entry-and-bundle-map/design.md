## Context

This project is an agentic framework, not a conventional app. The dangerous failure mode here is not only a missing file or stale doc string; it is an Agent selecting the wrong control surface or shortcut before the Engine can enforce anything.

Current state:

- `DPT_FRAMEWORK/RUN.md`, `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, and `DPT_FRAMEWORK/README.md` already warn against built-in research shortcuts.
- Repo-root `CLAUDE.md` and `AGENTS.md` do not mention `deep-research`, so a fresh session can match research intent to a built-in skill before it loads deeper framework behavior files.
- New bundles currently contain `START_FROM_HERE.md` from `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl`.
- Accepted specs and executable surfaces currently name `START_FROM_HERE.md` in instantiation, gate, inspect, reentry, file-observability, workflow directory, and command-surface guidance.
- `START_FROM_HERE.md` content mixes bundle coordinates, directory map, rules, stop authorization, delegated-output authority, and a resume口诀. That makes it read like an action entrypoint even though phase nodes and command playbooks are the actual Agent control surfaces.

Guideline constraints that shape this design:

- `DPT_FRAMEWORK/` remains reusable framework assets; active bundle root owns runtime truth.
- Markdown controls Agent Flow, but only phase nodes, command playbooks, task cards, and explicit projections should act as operating surfaces.
- `BUNDLE_MAP.md` must not become a second phase node, route authority, or deterministic state source.
- JS/CLI must continue deriving deterministic facts from explicit bundle paths and runtime files, not chat memory.

## Goals / Non-Goals

**Goals:**

- Ensure repo-root behavior files suppress built-in research shortcuts when `DPT_FRAMEWORK/` is the selected or relevant research entry.
- Rename the generated bundle root map from `START_FROM_HERE.md` to `BUNDLE_MAP.md` for new bundles.
- Reposition bundle-map content as passive navigation: research content, runtime control files, diagnostics, and reentry pointers.
- Keep legacy bundles with `START_FROM_HERE.md` readable through diagnostics and advice without making the old name primary for new bundles.
- Update accepted specs, implementation touchpoints, tests, and version metadata consistently.

**Non-Goals:**

- No platform-level tool/skill permission hook.
- No new dependency.
- No Python.
- No new JS-driven workflow loop.
- No change to gates beyond the instantiation surface name they check.
- No weakening of ledger, receipt, queue, work-unit, or trace authority.

## Decisions

### D1: Rename the generated primary file to `BUNDLE_MAP.md`

New bundle instantiation SHALL copy `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl` to `<bundle>/BUNDLE_MAP.md`.

Rationale: `START_FROM_HERE.md` implies "execute this file first." In the current architecture, the first active execution surface is `RUN.md` and then phase nodes loaded through gate/chain handoff. A bundle root file should help a human or Agent reload the bundle, not compete with lifecycle Markdown.

Alternative considered: keep the old file name and rewrite content. Rejected because the name itself preserves the wrong mental model and caused BUG-061.

### D2: Legacy compatibility is diagnostic, not primary

New bundles require `BUNDLE_MAP.md`. Existing bundles that only have `START_FROM_HERE.md` MAY remain readable by inspect/reentry tooling, but tools SHALL surface deprecation/migration advice.

Implementation posture:

- `instantiate-run-bundle.mjs` writes only `BUNDLE_MAP.md` for new bundles.
- `gate-instantiation-complete.definition.json` requires `BUNDLE_MAP.md` for the new instantiation contract.
- `inspect-bundle.mjs` accepts a legacy-only `START_FROM_HERE.md` bundle with warning/advice only if all other required surfaces are present.
- If both files exist, `BUNDLE_MAP.md` is authoritative for the map name. Divergence is not a gate authority question, but inspect should report that both exist and advise removing or migrating the legacy file.
- File-observability should classify `BUNDLE_MAP.md` as the expected root map. Legacy `START_FROM_HERE.md` should be nonblocking deprecated root debris unless an accepted legacy mode explicitly needs it for forensics.

Alternative considered: accept both names forever. Rejected because that makes the rename cosmetic and keeps docs/tests ambiguous.

### D3: `BUNDLE_MAP.md` content is a map, not an operating playbook

`BUNDLE_MAP.md` should contain four sections:

1. Research Content Map: `seed_topics/`, `reference/`, `artifacts/wave0/`, `artifacts/wave1/`, `artifacts/wave2/`, `final/`, `_cache/`.
2. Runtime Control Map: `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `_work_units/`.
3. Diagnostics Map: `_logs/`, `_diagnostics/`, `_checkpoints/`, `_cache/gate-results/`, `_cache/projections/` where present.
4. Reentry Pointers: use non-null `rb_status.json.current_node` as loaded phase coordinate, read trace/diagnostics, run reentry check if current node is absent, and do not infer phase completion from this map file.

It SHALL NOT duplicate detailed run commands from `RUN.md`, command playbooks, or phase nodes. It MAY point to those surfaces by name.

Alternative considered: leave stop authorization and delegated ledger rules in the map because they are useful reminders. Rejected in their current form because rule lists turn the map into a pseudo-controller. The map can name the authority surfaces and point to canonical docs, but detailed operating rules stay in phase/shared nodes and command playbooks.

### D4: Root shortcut suppression is a repo-level rule

Repo-root `CLAUDE.md` and `AGENTS.md` SHALL add a short high-priority Deep Research routing rule:

- If the user expresses research/deep-research intent and this repo's `DPT_FRAMEWORK/` is selected or relevant, do not invoke built-in `deep-research` or equivalent shortcuts.
- Use `DPT_FRAMEWORK/RUN.md` and the framework workflow.

Rationale: BUG-045 is about loading order. The existing framework-local suppression works only after the Agent has already chosen to read framework-local files. Root files are loaded earlier and must carry the same routing invariant.

Alternative considered: only strengthen `DPT_FRAMEWORK/RUN.md` again. Rejected because `RUN.md` already has the warning and the remaining hole is earlier session-level routing.

### D5: Specs must move the contract, not only implementation strings

This change touches accepted behavior in multiple specs because the root bundle file name is part of gate, instantiation, directory, reentry, and Agent-command contracts.

Spec migration shape:

- Add `bundle-map` as the new positive capability.
- Remove/deprecate old `bundle-start-from-here` requirements.
- Modify affected capability deltas that currently name `START_FROM_HERE.md`.
- During apply, register new `BUM-*` IDs and mark `BUS-*` as deprecated in place.

Alternative considered: implement code/doc rename and rely on archive sync later. Rejected because this repo treats OpenSpec as the execution backbone; target behavior must be visible before apply.

## Risks / Trade-offs

- [Risk] Legacy bundles fail hard when inspected after the rename. -> Mitigation: inspect/reentry provide legacy fallback and deprecation advice; only new instantiation gate requires `BUNDLE_MAP.md`.
- [Risk] Accepting legacy files weakens the rename. -> Mitigation: compatibility is diagnostic-only and new templates/gates/docs/tests use `BUNDLE_MAP.md`.
- [Risk] `BUNDLE_MAP.md` becomes another command playbook. -> Mitigation: spec requires passive-map content and forbids detailed lifecycle command duplication.
- [Risk] Root shortcut suppression still cannot stop platform routing before repo instructions are loaded. -> Mitigation: proposal explicitly does not claim platform-level interception; root files are the earliest repo-controlled surface.
- [Risk] Broad string rename misses archived or old-run references. -> Mitigation: apply tasks scope current framework, tests, active specs, and docs; `_old_topics` stays unread/untouched, and historical archived changes are not rewritten except through accepted spec sync/archive.

## Migration Plan

1. Register requirement IDs for `bundle-map` and deprecate old `BUS-*` registry entries during apply task 0.
2. Add `BUNDLE_MAP.md.tmpl`, migrate content, and remove/stop using `START_FROM_HERE.md.tmpl` for new bundles.
3. Update instantiation, inspect, reentry, file-observability, gate definition, phase-instantiation, docs, and tests.
4. Update root `CLAUDE.md` / `AGENTS.md` shortcut suppression.
5. Update CHANGELOG and RUN.md banner to `v0.11`.
6. Run targeted tests and governance checks.

Rollback strategy:

- If implementation proves too broad, keep spec intent but split apply into two sequential implementation tasks: first root shortcut suppression, then bundle map rename. Do not partially ship new templates without gate/inspect/test alignment.

## Open Questions

- Should `inspect-bundle.mjs` expose legacy deprecation as plain text only, or should it gain a structured warning mode for tooling? Recommended default: plain text warning for default inspect, because this change does not introduce a new inspect JSON contract.
- Should `experiments_env/shared/new-disposable-bundle.mjs` switch to `BUNDLE_MAP.md` immediately? Recommended default: yes, because disposable bundles should mirror current canonical bundle shape unless a playbook explicitly tests legacy behavior.
