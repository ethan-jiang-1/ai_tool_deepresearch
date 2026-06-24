## Context

`guidelines/` now defines the terminology canon: `MD controller mode` is a control mode / control surface, while `Phase Agent`, `Sub-agent`, and `Agent actor` are actor-role terms. Active specs and framework-facing docs still contain older prose that treats `main-agent` or `MD controller` as conceptual identities.

The risky surfaces are `openspec/specs/` and `DPT_FRAMEWORK/`: specs are accepted behavior, and framework code/docs are read directly by Agents during execution. This change therefore treats wording as a controlled migration, not a broad cleanup.

The current working tree is intentionally proposal-only: active `openspec/specs/` and `DPT_FRAMEWORK/` edits are not applied until this change is reviewed and explicitly implemented.

## Goals / Non-Goals

**Goals:**

- Align active prose with the charter terminology canon.
- Preserve all current executable strings and runtime behavior.
- Fix only verified fact drift that can mislead an Agent, such as stale gate schema filenames or non-canonical queue state filenames.
- Resolve or explicitly handle duplicate accepted requirement sections before editing so the same capability does not retain conflicting old/new prose.
- Make the later apply step auditable: classification must happen before edits, and duplicate requirement consolidation must be explicit rather than inferred by a tool.
- Leave archives and backlog files untouched unless separately requested.

**Non-Goals:**

- No schema enum migration from `"main-agent"` to a new value.
- No CLI flag or argument migration.
- No engine behavior change.
- No formatter pass or unrelated spec refactor.
- No attempt to make targeted searches return zero hits; remaining hits may be wire/API examples or explicit compat notes.

## Decisions

1. **Use conceptual terms in prose and wire values only in executable contexts.**

   Conceptual role prose will say `Phase Agent` or `Sub-agent`. JSON examples, CLI examples, schema enums, and compatibility notes keep `main-agent` / `sub-agent`.

2. **Classify every hit before editing.**

   Search hits are handled as one of: current wire/API example, explicit compat note, conceptual prose to align, verified runtime fact drift, parent runtime/protocol term, duplicate requirement, DPT allowlist candidate, or historical archive/backlog to ignore.

3. **Keep `rb_queue.json` canonical.**

   Previous `_backlog` suggestions around alternate queue state filenames are stale. This pass must not introduce queue-file compatibility or backup behavior.

4. **Fix fact drift only when verified from current code.**

   For example, `DPT_FRAMEWORK/schema/contracts/gate.mjs` exists and is the current gate transition-table contract; `gate-definition.mjs` does not exist. Gate definition JSON files remain under `DPT_FRAMEWORK/schema/gate_definitions/` and are loaded by gate helpers / per-gate CLIs. This correction retires stale accepted prose about a non-existent gate-definition Zod contract; it does not rename such a contract to `gate.mjs`, and it does not claim `gate.mjs` validates gate definition JSON.

5. **Treat duplicate accepted requirements as a first-class review item.**

   `openspec/specs/agentic-queue/spec.md` currently contains repeated same-name requirements from prior accepted changes, including `Queue state and item schema are structured`, `Producer rule source_intake_fan_in`, and `Producer rule seed_topic_materialize`. During apply, each duplicate must be classified: canonical copy to update, stale duplicate to consolidate, or intentionally retained variant wording with an active-spec rationale. Do not update only one duplicate and leave another active duplicate saying the opposite.

6. **Keep parent runtime terminology separate from conceptual actor terminology.**

   `parent` can be a runtime/trace term in the subagent relay path (`parentRuntimeAgentId`, `actor: "parent"`, Parent Relay acceptance language). Those values are not migrated in this change. Only Agent-facing conceptual prose that uses "parent agent" as the Phase Agent role should be aligned, and any remaining `parent` hits must be classified as runtime/trace compatibility or intentionally retained protocol language.

7. **Use a narrow DPT_FRAMEWORK allowlist.**

   Allowed edits are Agent-facing README / CLI README prose, active workflow-node Markdown that an Agent reads during execution, and short comments that explicitly use retired conceptual terminology such as `MD controller` as an actor identity. During apply, list candidate files before editing and keep the final edited file set inside that allowlist. Do not edit executable logic, schema, parser behavior, generated role templates, fixtures, runtime metadata comments, or trace values in this change.

8. **Do not rely on automatic sync for duplicate same-name requirements.**

   OpenSpec delta `MODIFIED Requirement` sections are name-based. Because `agentic-queue` currently has duplicate same-name producer-rule requirements, the apply step must manually inspect and consolidate those sections in the accepted spec. A blind sync that updates only the first matching section is not acceptable.

## Risks / Trade-offs

- **Risk: Over-normalizing wire examples into conceptual prose.** Mitigation: preserve JSON/CLI examples exactly where they describe current schema or CLI contract, and add short notes only where needed.
- **Risk: Accepted specs look semantically changed.** Mitigation: restrict edits to terminology and verified current facts; do not add or remove requirements.
- **Risk: DPT_FRAMEWORK comments accidentally imply behavior changes.** Mitigation: edit comments and markdown only; leave schema, parser, queue manager behavior, and tests unchanged.
- **Risk: Parent Relay runtime terms are over-normalized.** Mitigation: preserve `parent` where it is a runtime/trace/protocol compatibility term; only align conceptual actor prose.
- **Risk: Duplicate accepted requirements leave contradictory prose.** Mitigation: classify duplicate sections before editing and document any duplicate intentionally retained in active specs with a current rationale.
- **Risk: Historical files keep old language.** Mitigation: accepted only for archive / backlog history. Search review checks active surfaces, not archive cleanup.
