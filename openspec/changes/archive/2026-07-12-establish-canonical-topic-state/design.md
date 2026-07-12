## Context

Runtime 已广泛用 `topic_registry[].slug` 枚举 seed、Wave0/1 artifacts、queue validation与gates；PlanSchema只验证 `{id,slug,title}`。这足以运行初始 pipeline，却不足以证明一个 registry entry 在 rename/恢复前后仍是同一个 topic，也不能保存 must-answer、scope role和dependencies。BUG-079 的 registry-external addendum 说明：只要新 intent 没在工作前进入 registry+seed，后续真实文件也会对 Engine 隐形。

首次 C3 设计把原子 rename/renumber所有derived paths也纳入，导致一个 change 同时拥有 registry、seed、artifact、cache、reference、index与profile transaction。该控制层比被保护的 topic materialization 更复杂。因此本设计执行 C3A/C3B分割：先建立 immutable UID/intent与read model；等 stable identity存在后，再让独立 C3B 讨论 layout mutation。

## Goals / Non-Goals

**Goals:**

- `topic_registry` 成为 stable identity + minimum intent 的唯一 owner。
- new topic 在任何 queue/content work 前原子物化 registry entry + seed skeleton。
- legacy bundle通过显式 Agent intent input安全迁移，不从产物猜用户语义。
- existing topic可更新 semantic intent，但 UID/id/slug/layout保持不变。
- progress从现有 direct facts on-demand投影，不持久化第二份状态。
- reentry/rerun/style消费 committed canonical state与structured feedback。

**Non-Goals:**

- 不remove/retire/rename/renumber existing topic，不移动artifact/cache/reference/final paths，不改free prose。
- 不修改queue schema/queue state、work-unit/ledger、status、trace、gate/handoff或profile owner。
- 不开放post-final scope mutation、state jump或human override。
- 不创建progress DB/event store、global index、watcher、daemon、lock service或通用 transaction framework。

## Decisions

### 1. Registry entry is the only identity and intent owner

Canonical entry:

```yaml
topic_registry_version: "2" # top-level rb_plan frontmatter discriminator
topic_registry:
  - topic_uid: "tp_<uuid>"
    id: "01"
    slug: "01_descriptive-name"
    title: "..."
    must_answer:
      - "..."
    scope_role: "primary|synthesis|comparison|supporting"
    depends_on_topic_uids: []
```

`topic_uid` is immutable and Engine-generated. `id/slug` remain current layout coordinates and are immutable within C3A. `derived_topic_count` remains registry length, so existing wave/style count semantics do not acquire an active/retired filter in this change.

Rejected:

- new `rb_topic_state.json`: second registry and permanent synchronization;
- seed as owner: filesystem enumeration repeats BUG-079;
- slug as stable identity: future layout mutation would become identity replacement;
- removal/retirement in C3A: forces every gate/count consumer to add active filtering and re-expands scope.

Schema compatibility is explicit rather than implicit. Entry-shape unions are insufficient because an empty registry has no entry to discriminate, so canonical plans require top-level `topic_registry_version: "2"`:

- `LegacyPlanSchema` validates plans without `topic_registry_version: "2"` and the existing `{id,slug,title}` registry for read-only compatibility and migration input.
- `CanonicalPlanSchema` requires `topic_registry_version: "2"` and validates UID/intent invariants, including an empty pre-HITL1 registry.
- exported `PlanSchema` remains a discriminated/structural union so legacy bundles can still be inspected and migrated.
- topic-state mutation, new-run HITL1 completion and canonical-mode seed checks require `CanonicalPlanSchema`; legacy bundles may continue their existing read/gate path until a sanctioned rerun migration. Legacy compatibility is not permission for new topic mutation.

### 2. One helper, one three-operation CLI

Targets:

- `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs`
- `DPT_FRAMEWORK/cli/operate-topic-state.mjs`
- `_diagnostics/topic-state/<operation-id>/`

Operations:

- `inspect --bundle`: read-only canonical/legacy facts, progress projection and accepted-workspace blocker.
- `apply --bundle --plan <json>`: explicit actions `migrate_legacy`, `add_topic` and `update_intent`; existing UID/id/slug cannot change.
- `recover --bundle --operation-id <id>`: explicitly resume one inspect-reported accepted workspace using only its prepared manifest.

One apply plan is one complete semantic change set. It contains either one full `migrate_legacy` reconciliation or a non-empty ordered list of `add_topic`/`update_intent` actions; migration cannot be mixed with ordinary actions. The Engine validates dependencies, duplicate targets, lifecycle authorization and every staged plan/seed replacement before publishing one prepared manifest, so HITL1 or rerun does not expose a partially accepted topic set between actions.

There is no implicit recovery preflight. When an accepted workspace exists, `inspect` and new `apply` return one `recover --operation-id ...` action. The Agent runs that ordinary command without asking the user, then reruns inspect/apply. Recovery never chooses new semantics or a conflict winner.

### 3. Apply authorization reuses lifecycle authority

`inspect` is read-only and may run anywhere. `apply` takes an explicit declared context for stable JSON/audit, but the flag is not authority. Before workspace creation the Engine reuses existing handoff/status readers to prove:

- `hitl1`: `rb_status.json#/current_node` is `phases/phase-hitl1.md`, with `current_gate: hitl1_recorded` and `next_gate: setup_ready` in the existing bootstrap-compatible pre-gate window;
- `rerun`: `rb_status.json#/current_node` is `phases/phase-rerun.md`, the latest non-superseded route-bound HITL2→rerun load witness is valid, and the incoming window remains `current_gate: hitl2_recorded` / `next_gate: rerun_ready`.

`add_topic`/`update_intent` are allowed only in those proven contexts. `migrate_legacy` is allowed only in sanctioned rerun, because migration/adoption of an existing run's topic semantics is not a bootstrap schema write. Post-final or arbitrary maintenance invocation returns missing C5 authority without workspace creation.

`recover` does not re-decide lifecycle permission. The prepared manifest records the originally proven authorization facts and exact staged bytes; recover may run after crash/reentry solely to finish that already accepted operation. It cannot accept new input or widen scope.

This reuses the existing lifecycle authority interpretation rather than creating an `authorized: true`, user token, session flag or second permission validator.

### 4. Transaction surface is plan + listed seeds only

Prepared manifest binds:

- schema/operation id and `migrate|apply` type;
- declared context plus the proven current-node/status snapshot and, for rerun, the exact source-attempt/load-witness indexes used for authorization;
- expected SHA256 of `rb_plan.md` and touched existing seeds;
- exact old/new registry;
- complete staged `rb_plan.md` and complete staged new/updated seed files;
- input JSON digest and created time.

The accepted boundary is durable `prepared` publication after every staged file is fsynced. Commit rechecks hashes/path safety, atomically replaces `rb_plan.md`, then creates/replaces only listed seeds, fsyncs parents and cleans workspace. Crash recovery resumes exact staged-new bytes. If a current file matches neither expected-old nor staged-new digest, recovery blocks without overwrite.

The Agent SHALL write the approved apply JSON to a caller-owned retained staging file before invocation and keep it until commit. A crash before durable prepared publication is not an accepted recoverable topic-state operation; the workspace is cleaned when safe and the retained input supports a fresh apply. This is the explicit non-interception boundary: no chat hook or background listener is introduced.

This transaction does not include `rb_profile.yaml`. When registry length changes, successful result returns one `recompute_research_style` follow-up; the Agent runs the existing profile owner. This avoids hidden cross-owner rollback.

### 5. Legacy migration requires explicit semantic input

Legacy entries remain read-only. During a sanctioned rerun, an `apply` plan with action `migrate_legacy` provides one complete reconciliation set and publishes `topic_registry_version: "2"`. Every existing registry slug must appear, and any C1-detected registry-external slug remains blocked unless it appears as an explicit `adopt` entry. Each entry provides:

- non-empty `must_answer[]`;
- `scope_role`;
- dependency slugs, resolved to generated UIDs only after full-set validation;
- `source: registry|adopt` and, for adoption, whether an exact existing seed is bound or a new seed skeleton must be staged.

Existing seed content may be preserved, but it is not used to invent missing intent. An adopted slug may bind one exact orphan seed or stage one new seed skeleton; it does not move or authorize existing artifact/cache/reference/final files. Unaccounted registry entries, duplicate/adopted slugs, ambiguous seeds or registry-external findings return one blocker; Agent repairs the explicit reconciliation input and reruns apply. If semantic intent is genuinely absent or conflicting, only then does the Agent request that decision from the user.

### 6. Apply supports add and intent update only

`add_topic` input supplies title, descriptive slug stem, must-answer, scope role and dependency UIDs. Engine allocates next never-reused ordinal/id, constructs numeric slug, generates UID, stages registry+seed, then commits.

`update_intent` may change title, must-answer, scope role and dependency UIDs for one UID; it updates registry and matching seed metadata/body intent section. UID/id/slug and historical artifacts remain unchanged.

`migrate_legacy` and `update_intent` SHALL block when the touched existing slug has queued or claimed/in-flight work. The result identifies the direct queue/work-unit owner and one nearest drain/submit/terminalize action; the Agent performs that mechanical work and reruns inspect/apply. The Engine does not ask the user unless the blocker is a genuine semantic conflict.

`remove|retire|rename|renumber|move` requests return `layout_mutation_not_supported` before workspace creation, pointing to C3B rather than suggesting manual multi-file repair.

### 7. Progress is a direct-fact read model

Per canonical UID/wave precedence:

1. legacy/unbound registry-seed or accepted topic-state workspace → `blocked`;
2. accepted submitted ledger + required artifact facts for that wave → `complete`;
3. existing queued/claimed topic work resolved through current canonical slug → `in_progress`;
4. otherwise → `not_started`.

Each row returns `fact_refs[]`, `reason_code` and at most one `recommended_action`. Wave2/final phase-wide facts are reported separately, not fabricated as per-topic completion. Trace/log may support diagnostics but are never the primary fact.

### 8. Existing integrations remain additive

- HITL1 still owns semantic preview and user review. After the user answers, the Agent writes original-topic body content, then runs topic-state apply for the approved initial topics, then runs the existing research-style CLI. HITL1 gate requires canonical plan+seed binding; it does not accept a legacy registry as recorded completion.
- Seed phase stops being the first intent writer for new canonical runs. It verifies/enriches UID-bound seeds. Legacy bundles retain the accepted slug-only seed/gate path until sanctioned rerun migration; that compatibility path cannot create new canonical topics and is retired only after C5-backed migration/reentry coverage exists.
- Queue schema stays unchanged; current canonical slug deterministically resolves queue/work-unit facts to UID. Topic-scoped enqueue reuses the shared registry/seed/workspace evaluator and rejects while an accepted workspace exists or the seed binding is absent. C3B must add stronger UID fields before layout mutation.
- Rerun add/refine uses topic-state apply. Remove/rename/renumber reports the missing C3B capability rather than direct edit.
- Research style recomputation already owns registry-length-dependent profile updates; topic-state merely returns that existing follow-up after add.
- C1 reentry groups same-UID registry/seed/queue/artifact symptoms into one root.

### 9. Responsibility boundary

- User/HITL decides semantic new topic or intent refinement.
- Agent prepares explicit apply JSON, runs inspect/recover and existing style follow-up, repairs one named mechanical blocker, reruns the same command.
- Engine generates UID/ordinal, validates CAS/path/schema and commits deterministic plan+seed mutation.

`human-directed` identifies decision source only; it does not authorize post-final entry, layout mutation, status/trace changes or overwrite conflict.

### 10. Paired Evolution Direction review

Shortest legal loop and direct Source of Record:

```text
rb_plan topic_registry + matching seed + existing queue/work-unit/ledger/artifact facts
  -> operate-topic-state inspect
  -> one root with apply or recover command
  -> Agent executes the ordinary command
  -> existing style owner when named
  -> rerun inspect
```

| New surface | Irreplaceable fact / owner | Why existing path is insufficient | Complexity removed or avoided | Failure's one nearest action | Required control proof |
|---|---|---|---|---|---|
| `topic_uid` + minimum intent fields | Topic identity/intent owned only by `rb_plan.md#/topic_registry` | Slug/path cannot survive future layout change; chat/artifacts cannot prove never-started intent | Removes seed/path/chat identity inference; avoids `rb_topic_state.json` | Prepare explicit migration/apply input and rerun apply | Legacy/canonical schema, orphan/duplicate/dependency negative tests |
| UID-bound seed projection | Materialized Agent-readable intent projection | Current seed can exist without stable binding | Removes seed-only authority and reverse inference | Repair the one registry/seed binding then rerun inspect | Bidirectional binding, no filesystem inference, no unintended write tests |
| Direct progress read model | Existing queue/work-unit/ledger/artifact owners | No single current surface answers recovery question without copying truth | Avoids progress DB, event store and reconciliation | Repair/finish the exact direct fact owner then rerun inspect | Precedence, short-circuit, one-action and no-persistence tests |
| Topic-state workspace | Accepted plan+seed transaction only | C2 explicitly excludes control/identity and cannot atomically bind plan plus seeds | Avoids generic transaction framework and manual multi-file repair | Run exact `recover --operation-id` then rerun inspect | Every crash boundary, late drift, repeat recovery and authority snapshot tests |
| Queue/HITL1 eligibility reuse | Same registry/seed/workspace evaluator used by inspect | Without decision-point enforcement, plan-first crash could enqueue work before seed commit | Avoids a second queue validator and closes the half-commit window at the actual decision point | Recover/repair binding, then rerun the same enqueue/HITL1 gate | Shared-result identity, no queue mutation on failure, legacy-vs-canonical gate tests |
| Apply authorization reuse | Existing `current_node` + route-bound handoff/status facts | A caller context flag or user insistence cannot prove mutation authority | Avoids permission token/session state and post-final bypass | Enter the sanctioned HITL1/rerun path; otherwise stop at missing C5 | Authorized HITL1/rerun, forged flag, stale witness, post-final no-write tests |

Helper-oriented responsibility audit:

- The user supplies only genuinely new or ambiguous semantic intent, conflict choice, risk acceptance, or host permission.
- The Agent constructs input JSON from recorded intent, runs inspect/apply/recover/style commands, performs reversible file/owner repair, and reruns the same checkpoint without asking the user to co-run the pipeline.
- The Engine owns schema/CAS/path/workspace verdicts and never chooses topic semantics, conflict winner, lifecycle route or permission.
- Missing remove/rename/renumber/post-final capability is reported as a direct contract boundary; user insistence or `human-directed` context does not turn it into an available command.

## Risks / Trade-offs

- [Plan commits before all seeds] → Accepted manifest resumes exact staged seed bytes; workspace blocks topic work until resolved.
- [Crash before apply acceptance] → Do not overclaim recovery; retain caller input and retry the same apply before dependent work.
- [Legacy/external intent is incomplete] → Agent/user supplies explicit reconciliation semantics; Engine never reverse-engineers must-answer or adoption choice from artifacts.
- [Queue remains slug-bound] → Safe within C3A because existing slugs are immutable; C3B must introduce UID binding before rename/renumber.
- [Legacy compatibility becomes a second permanent success path] → It is read/gate compatibility only, cannot mutate/add; retirement condition is C5-backed migration/reentry coverage plus migrated supported fixtures.
- [Profile can be stale after add] → Result returns one existing-owner follow-up; inspect/reentry reports count drift until repaired.
- [Progress rules differ by wave] → Reuse existing submitted/artifact evaluators; do not create a parallel completion validator.
- [Remove/rename still unsolved] → Intentional split. Stable UID and canonical migration produced here are prerequisites for smaller C3B.

## Migration Plan

1. Register CTS plus additive modified-capability IDs during apply.
2. Add canonical/legacy schemas and read-only inspect first.
3. Implement bounded plan+seed workspace and explicit migration.
4. Implement add/update apply and seed/rerun/style/reentry integrations.
5. Run focused/full regression and existing-family controlled crash/migration case.
6. Update backlog: close P2/P3 identity/intent/progress slice, mark Human A partial; Human B and removal/layout mutation become C3B. Bump v0.24.

Rollback removes mutation guidance/CLI only after workspaces are clean. Additive UIDs/intent remain valid data; rollback must not strip them or reconstruct identity from slugs.

## Open Questions

None. Remove/rename/renumber/layout migration is explicitly deferred to C3B rather than left as apply-time ambiguity.
