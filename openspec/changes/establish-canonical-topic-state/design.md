## Context

当前 accepted specs 已经多次声明 `rb_plan.md#/topic_registry` 是 topic 集合 Source of Record，但 registry entry 只有 `{id, slug, title}`，而实际 intent、依赖、seed skeleton、queue identity、artifact directory 与 rerun direction 分散在不同文件。C1 `runtime-reentry-debuggability` 能只读发现 registry-external topic 和 dangling identity；C2 `artifact-persistence-recovery` 只负责 supported content file durability，明确不拥有 control/identity transaction。

本 change 跨 schema、seed materialization、queue validation、rerun 与 reentry，需要在 apply 前固定一个 direct owner 与 mutation/recovery boundary。设计 paired-read `guidelines/evolution-simple-reliable-control.md` 和 `guidelines/evolution-helper-oriented-agent.md`：宁可让 Engine 提供一个短的 canonical mutation/check surface，也不让 Agent 继续跨 registry、seed、paths、indexes 手工同步；同时不把用户变成普通命令 runner，也不把 `human-directed` 当 override token。

## Goals / Non-Goals

**Goals:**

- 让 `topic_registry` 同时保存 stable identity 与 minimum durable intent，内容工作前即可从 disk 恢复“有哪些 topic、为什么存在、依赖什么”。
- 用 stable `topic_uid` 将 identity 与可变的 ordinal/slug/path 解耦。
- 为 register/rename/renumber 提供 fail-closed multi-file mutation，并为 crash 留下可判定 operation workspace。
- 从现有 direct runtime facts 投影 per-topic/per-wave progress，不新增第二份 blocking progress truth。
- 让 HITL1/HITL2 rerun guidance 走同一 CLI；用户决定语义，Agent 执行，Engine verdict 决定是否提交。

**Non-Goals:**

- 不开放 post-final reentry、status jump、trace rewrite 或 arbitrary human override。
- 不自动决定 topic title、must-answer、scope role、依赖或 conflict winner。
- 不迁移 work-unit submit、queue、gate、handoff、artifact persistence 或 delivery authority。
- 不建立 topic event store、global index、watcher、daemon、background reconciliation 或通用 filesystem transaction framework。
- 不承诺对未知自由文本做全仓字符串替换；未知引用一律 blocked。

## Decisions

### 1. `topic_registry` remains the only identity and intent owner

Canonical entry shape:

```yaml
topic_uid: "tp_<uuid>"
id: "01"
slug: "01_descriptive-name"
title: "..."
must_answer:
  - "..."
scope_role: "primary|synthesis|comparison|supporting"
depends_on_topic_uids: []
```

`topic_uid` is Engine-generated and immutable. `id` and numeric slug prefix are ordered presentation coordinates. `seed_topics/<slug>.md`, topic-scoped queue fields, artifact directories, reference metadata and indexes are projections or references to this owner.

Alternatives rejected:

- New `rb_topic_state.json`: creates a second registry and requires permanent two-way synchronization with `rb_plan.md`.
- Seed file as owner: makes enumeration filesystem-derived and repeats the BUG-079 failure mode.
- Slug as stable identity: rename/renumber necessarily changes identity and breaks recovery binding.

### 2. Progress is a derived read model, not a new durable ledger

`inspect` computes one topic/wave row from direct facts with closed precedence:

1. invalid/missing canonical registration or seed binding → `blocked`;
2. explicit deferred intent in canonical registry → `deferred`;
3. submitted work-unit/artifact completion facts satisfying the wave's accepted contract → `complete`;
4. claimed work unit, queued topic demand, or accepted phase-owned work marker → `in_progress`;
5. otherwise → `not_started`.

The result records `fact_refs[]`, `reason_code`, and at most one `recommended_action`. It does not persist the projection, infer from chat, use mtime, or treat trace/log as the primary fact.

Alternative rejected: a per-topic/per-wave mutable progress table. That would duplicate queue/work-unit/artifact truth, require another reconciliation loop, and make recovery depend on which copy was updated last.

### 3. One helper, one four-operation CLI, one operation workspace

Target files:

- `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs`
- `DPT_FRAMEWORK/cli/operate-topic-state.mjs`
- `_diagnostics/topic-state/<operation-id>/`

Operations:

- `register`: accept explicit intent JSON, generate `topic_uid`, append canonical registry entry, create seed skeleton, recompute derived count/style inputs.
- `rename`: change title/descriptive slug while preserving `topic_uid` and ordinal.
- `renumber`: accept explicit ordered `topic_uid[]`, recompute `id`/numeric slug prefixes and supported derived paths.
- `inspect`: side-effect-free read model and consistency check.

No `patch`, `force`, `repair-all`, `delete-unknown`, `set-progress`, `set-status`, or environment-variable configuration.

### 4. Mutation uses a closed manifest and staged replacements

Before canonical publication, the helper builds a Zod-validated manifest containing operation id/type, expected hashes for every existing owned file, exact old/new topic records, exact supported path moves, and staged replacement files. Unsupported or ambiguous refs block before mutation.

The accepted boundary is durable publication of `prepared` manifest after every staged file is fsynced. Commit rechecks expected hashes and path safety, applies ordered same-filesystem renames/replacements, fsyncs parents, writes a committed marker, then cleans the workspace. Sweep/finalization is intentionally not a public fifth operation: invoking any mutation first runs recovery for the single selected bundle and returns `blocked` if an accepted workspace cannot be deterministically completed or rolled back. `inspect` reports accepted workspace blockers but never mutates them.

This is not C2 workspace reuse: C2 owns one-file content persistence and excludes control/identity surfaces. C3 reuses its durability posture—explicit acceptance, hash binding, atomic rename, retained recovery evidence—without broadening C2 authority.

### 5. Supported derived surfaces are allowlisted

Initial mutation surface is limited to:

- `rb_plan.md` frontmatter canonical registry and `derived_topic_count`;
- `seed_topics/<slug>.md` filename/frontmatter and known body topic refs;
- topic-scoped `artifacts/wave0/<slug>/`, `artifacts/wave1/<slug>/`, `_cache/wave0|wave1/.../<slug>/` paths when exact ownership is provable;
- `reference/*.md` accepted metadata fields and `reference/_INDEX.md` rows that parse to the old canonical slug;
- accepted seed/backfill Markdown links that resolve to a moved supported path;
- `rb_profile.yaml` research-style recomputation through the existing owner after canonical commit.

Queue/work-unit/ledger entries with active or submitted topic-bound attempts are not rewritten. Rename/renumber blocks and returns the exact attempt refs until the Agent drains or terminalizes them through existing owners. Free prose, final report narrative, trace history and historical receipts are not rewritten; they remain historical facts or diagnostics.

### 6. Legacy migration is explicit and fail closed

Existing registry entries without `topic_uid` remain readable for diagnostics but cannot be mutated. `register --migrate-existing` is not provided. Apply will add a narrow `migrate` step inside the first `inspect`/mutation preflight only if every legacy entry has a unique valid slug, matching seed file, and no canonical drift; otherwise the CLI returns a migration plan/blocker and makes no changes. The final operation vocabulary remains four user-facing operations.

### 7. Responsibility boundary stays helper-oriented

- User/HITL decides the semantic topic intent, rename, removal/reorder preference, or conflict winner.
- Agent prepares explicit arguments, runs ordinary inspect/mutation commands, drains active work through existing CLIs, repairs one named blocker, and reruns the same command.
- Engine validates identity, CAS hashes, allowlisted refs and transaction completion.

`human-directed` is recorded context only. It does not bypass active work blockers, invent host permission, authorize post-final reentry, or permit arbitrary mutation.

## Risks / Trade-offs

- [Multi-file rename can cross many supported paths] → Bind an exact manifest and block unknown/active-owner surfaces; do not use recursive string replacement.
- [Legacy bundles lack stable uid] → Permit read-only diagnosis; migrate only when registry/seed binding is already unambiguous and fully hash-bound.
- [Derived progress may be computationally heavier] → Keep it on-demand and bundle-local; avoid a cache until measurement proves a need.
- [Progress precedence may mask nuance] → Return underlying `fact_refs[]` and direct reason, while keeping one primary state/action.
- [Crash after some renames] → Accepted manifest records old/new hashes and exact moves; recovery completes or rolls back only deterministic steps, otherwise blocks with workspace intact.
- [Final narrative may contain old labels] → Historical/free prose is not authority and is not rewritten; Agent may revise presentation separately after successful canonical mutation.
- [Scope is still large] → Apply target manifest must remain one helper/CLI/workspace. If exploration proves atomic rename and registration cannot share this closed manifest without a second owner, split before apply rather than adding controllers.

## Migration Plan

1. Register CTS and additive IDs for modified capabilities during apply.
2. Add schemas/characterization for legacy/current topic surfaces and progress direct facts.
3. Implement helper schemas plus side-effect-free inspect first.
4. Implement register, then rename/renumber on the same manifest/transaction adapters.
5. Integrate seed, queue, rerun, style and reentry guidance/checks.
6. Run focused/full regression and an existing-family controlled crash/rename case.
7. Update backlog and bump to v0.24.

Rollback removes mutation guidance/CLI only after all topic-state workspaces are clean. Stable `topic_uid` fields are additive and remain readable; rollback must not strip them or reconstruct identity from paths.

## Open Questions

None for proposal. Exploration must validate the allowlisted path inventory and legacy migration feasibility before apply; failure to keep one closed manifest is a split trigger, not permission to add a second state system.
