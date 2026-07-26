---
node_type: shared
id: shared-seed-topic-authoring
shared_scope: seed-topic-authoring
authority: guidance-only
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context: []
---

# Shared: Seed Topic Authoring

## Purpose And Authority

Use this contract when materializing an initial seed or a sanctioned rerun-added seed. `rb_plan.md#/topic_registry` remains the canonical Topic identity and intent; `rb_profile.yaml` owns recorded HITL constraints and rerun count. This Markdown is an Agent-facing authoring mirror, not a state machine, evidence authority, or permission to directly mutate canonical files.

Topic-state is the only atomic plan/current-seed writer. Initial skeletons and layout-only mutation SHALL NOT prefill `## 本轮重跑方向`; that section is written only through a sanctioned rerun topic-state candidate grounded in recorded rationale.

## Initialization Frontmatter

The Engine copies canonical `topic_uid`, `id`, `slug`, `title`, `must_answer`, `scope_role`, and `depends_on_topic_uids` from the registry. The Agent retains and submits only this complete closed enrichment object:

```yaml
hypothesis: "pending — record an explicit gap when upstream facts are insufficient"
in_scope: "pending — define the research boundary"
out_of_scope: "pending — define excluded directions"
search_guardrails:
  required_terms: ["pending — identify required terms"]
  forbidden_broadening: ["pending — identify forbidden broadening"]
evidence_route:
  preferred_sources: ["pending — identify preferred source types"]
  noise_to_avoid: ["pending — identify likely source noise"]
```

Never invent missing semantic facts merely to make the presentation complete. Record an explicit `pending` gap instead.

## Authoring Loop

For one claimed Seed Topics queue card, edit only the Agent-owned Markdown body, retain one complete `enrich_seed` input, run `operate-topic-state apply`, then run the same `operate-queue complete` command. The input contains `context: "seed_topics"`, `action: "enrich_seed"`, the exact current `topic_uid`, and exactly the five fields above. The legal writer exists only in the route-bound `setup_ready|rerun_ready -> seed_topics_ready` window; generic inspect does not create it.

If apply reports `frontmatter_invalid`, repair only its exact syntax coordinate and immediately rerun the same writer. Do not author canonical values in YAML by hand. Parseable legacy body copies remain readable and are preserved as bytes, but are not structured authority.

## Initialization Body Skeleton

```markdown
# <topic title>

## 主题定位
<why this Topic matters and its research role>

## 初始假设、缺口或张力
**已知**：<recorded fact>
**缺口**：<what Wave0 must establish>
**张力**：<claim or bias requiring independent checking>

## why now
- <trigger, window, or milestone>

## 为什么对最终交付物重要
<concrete final-deliverable contribution>

## 下游位置（可选）
- <report location or explicit unassigned state>
```

## ═══ 研究轮次追加区 ═══

Later Waves replace only their owned token with return-map entries. The focused `shared-return-map-authoring` contract owns the full entry shape and ref hierarchy.

| Wave responsibility | Owning section | Initial token |
| --- | --- | --- |
| Wave0 new submitted evidence | `## 本轮新增证据` | Wave0 token |
| Wave1 mechanism understanding | `## 本轮新增机制理解` | Wave1 mechanism token |
| Wave1 trends/difficulties | `## 本轮新增趋势与难点` | Wave1 trends token |
| Wave2 current judgment | `## 当前判断` | Wave2 token |
| Every round pending-question status | `## 待验证问题` | pending-question token |

## 历史摘要

*(seed-topics: 本 topic 为新建，无历史轮次)*

## 本轮新增证据
__BACKFILL_WAVE0_EVIDENCE__

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__

## Sanctioned Rerun Direction

Only a retained topic-state input in the legal rerun window may add or replace this fragment. Do not direct-edit a seed, infer an affected Topic from old directions, or use a matching old section as a new-operation receipt.

```markdown
## 本轮重跑方向

- rerun_count: <current profile count + 1>
- action: <add|supplement>
- new_search_dimensions: <non-empty Agent-authored guidance>
- adjusted_depth: <non-empty Agent-authored guidance>
- search_guardrails: <non-empty Agent-authored guidance>
- rationale_excerpt: <non-empty excerpt grounded in recorded HITL2 rationale>
```

`add_topic` maps to `action: add`; `update_intent` and `set_rerun_direction` map to `action: supplement`. The Engine checks shape, count, and mapping only; direction semantics remain Agent judgment.
