## Context

当前 relay pipeline 的架构问题可以总结为一句话：**正道（relay path）比捷径（direct path）难走太多，而 gate 又无法可靠区分两条路径。** Phase Agent 面对 queue/relay 堵塞时，会自然选择直接搜索、直接写 artifact、再尝试修 gate 格式。

### Four Leaks

```
Queue 入口无校验（BUG-016）
  -> 上下文残留的 topic/work_id 能污染当前 bundle queue
  -> relay pipeline 的入口被错误 task card 堵住
         |
         v
Relay path 脆弱（BUG-014）
  -> queue/relay 不可用 + 静默纪律要求继续推进
  -> Phase Agent 走 direct WebSearch/WebFetch
         |
         v
Gate authority 边界不够清楚（BUG-015）
  -> 直接写出来的文件看起来像 relay 输出
  -> gate 一边拒绝格式/ledger/cache，一边无法准确诊断 bypass
         |
         v
Trace 三层断裂（BUG-017）
  -> rb_trace / _diagnostics / run.log 缺少可跳转链路
  -> 事后不看 chat transcript 很难复盘事故链
```

此前 BUG-006 和 harden-stop-contract 都主要在约束 Agent 行为。这个 change 的方向是改变系统结构：入口拒绝污染，workflow Markdown 让 relay path 更明确，gate 出口用 Engine provenance 堵住 direct path，trace 让失败可诊断。

## Goals / Non-Goals

**Goals:**

1. **拆掉 direct pass path**: Wave0/Wave1 evidence/search outputs must be gate-passable only when current-wave Engine-written output declaration coverage and successful current-wave relay slot binding exist. Wave2 only requires relay provenance for new search/evidence/reference outputs.
2. **保持 accepted authority boundary**: `count_floor`, `content_dedup`, `cache_coverage`, reference format/countability, and rerun quality rules keep their accepted semantics unless this change adds a matching delta.
3. **加固 queue ingress**: enqueue validates topic slug against current bundle topic registry; queue state carries bundle identity; stale queue entries can be repaired deterministically.
4. **打通 trace/diagnostics**: gate attempts include phase and diagnostic path; pass attempts also write lightweight diagnostics; bypass suspicion is detected by gate CLI.
5. **降低 relay path confusion**: workflow frontmatter declares execution surface and search delegation policy; subagent role specs are clearly Phase-Agent-loaded role guidance delivered via relay task files.
6. **对齐 Wave1/Wave2 phase semantics**: Wave1 is relay-driven topic deepening in this change, not the old foundation placeholder. Wave2 remains main-agent synthesis/backfill unless it creates new search/evidence/reference outputs.

**Non-Goals:**

- 不重写 queue-manager 或 subagent-relay 核心架构。
- 不移除现有 relay slot lifecycle、dispatch、collect 机制。
- 不改变 transition table 或 gate routing 机制。
- 不引入新的 npm 依赖。
- 不把 evidence quality policy 整体迁移到 `commitSlotResult()`。
- 不修改 accepted main specs in this round; all behavior changes are represented as active deltas.

### Cross-Capability Schema Dependencies

This change references fields from `artifacts/wave2/finding-index.yaml` (`decision`, `search_required`, `subagent_receipt_refs`). The canonical schema for that file is defined in the accepted `wave2-synthesis` capability (WTS-001 through WTS-009). This change does not modify the finding-index schema; it reads those fields as signals for Wave2 provenance gating.

## Decisions

### Decision 1: Gate provenance uses coverage plus successful current-wave slot binding

**选**: Add/extend standard gate check types:

- `output_declaration_ledger_exists`: scoped existence check for Engine-written output declaration records. It proves delegated `complete()` happened in the current wave, but it is not sufficient by itself.
- `output_declaration_coverage`: checks that current-phase artifacts/references evaluated by the gate are declared in scoped ledger `output_files[]`. Filesystem-only outputs are orphan/direct-written diagnostics, not pass authority.
- `subagent_slot_presence`: checks successful current-wave relay slot binding. It scans only the configured wave directory and, where possible, binds ledger records to `slot_result_ref`, `work_id`, `producer_rule`, and successful terminal slot status.

**不选**: A weak pair of "any ledger entry + any slot". That would let one unrelated relay completion mask direct-written files. The key invariant is per-phase output coverage and current-wave binding.

**不选**: A separate provenance gate CLI. Provenance is part of the same gate pass so Agent receives one integrated check/inspect/advice result.

**Wave semantics:**

- Wave0/Wave1: provenance is a hard gate. The gate checks current-wave ledger existence, output declaration coverage for expected/evaluated outputs, and successful current-wave slot binding. Wave1 cannot pass from Wave0 slots.
- Wave2: no unconditional relay hard gate. Synthesis/backfill artifacts are main-agent queue work. Wave2 provenance becomes blocking only for new search/evidence/reference outputs such as `decision=exploit_search|explore_search`, supplementary gap-fill, or `reference/00-cross-*.md`.

### Decision 2: Check responsibilities stay layered; quality policy is not bulk-moved

**选**: Keep three boundaries clear:

- `commitSlotResult()` validates SlotResult schema, slot identity, path safety, declared output shape, and result status. It may emit slot-local deterministic diagnostics such as duplicate source URLs inside one slot.
- Delegated `complete()` remains the provenance boundary: committed slot result ref, runtime receipt, declared file existence, cache trail filtering, and Engine append to `rb_output_declarations.jsonl`.
- Gate executes structural/status/provenance checks and accepted ledger-authoritative quality/countability/cache rules. `count_floor` pass/fail still reads Engine-written ledger, not filesystem scans.

**不选**: Moving `reference_format`, `key_facts_min_lines`, `source_url_article_level`, `cache_coverage`, or Jaccard `content_dedup` wholesale into `commitSlotResult()`. Those rules belong to accepted capabilities and need explicit deltas if their semantics change.

**BUG-015 interpretation**: The fix is not "放宽所有质量规则". The fix is that non-relay output no longer gets a passable route, while relay/complete/gate failures become earlier and more diagnosable. If future work wants to loosen `isCountable()`, reference format, or rerun quality rules, it needs a dedicated capability delta.

### Decision 3: Queue validation uses explicit bundle and topic identity

**选**: `rb_queue.json` gains top-level `bundle_name`. Instantiation injects it, and `operate-queue` validates it against `rb_status.json.bundle` before mutating queue state. Legacy queues missing the field are populated on first operation.

**不选**: Hash-only identity. Human-readable mismatch diagnostics are more useful for cross-bundle contamination: `bundle_name mismatch: queue belongs to 'medical-ai', but bundle is 'chinese-football'`.

**选**: topic validation uses an explicit slug resolver. `payload.topic_slug` is the preferred declaration when present; `work_id` parsing is only a fallback for known topic-scoped templates such as `wave0-source-{topic.slug}`, `wave0-suppl-{topic.slug}-r{N}`, `wave1-deepen-{topic.slug}`, `wave1-suppl-{topic.slug}-r{N}`, `seed-topic-{topic.slug}`, `wave2-backfill-{topic.slug}`, `wave2-suppl-cross-{topic.slug}-r{N}`, and `wave2-suppl-emergent-{topic.slug}-r{N}`. If payload and derived slugs disagree, or a topic-scoped task has no resolvable slug, enqueue rejects the task instead of guessing. Finding-scoped Wave2 tasks such as `wave2-suppl-backing-{finding_id}-r{N}` do not get forced through `topic_registry`, but SHALL validate `finding_id` against the current bundle finding-index when that index exists.

**不选**: substring-based slug extraction from arbitrary `work_id`. That is too close to the original BUG-016 failure mode: a stale topic-shaped token in the Agent context could be parsed as authority.

**选**: Queue items keep a required `completion_receipt` property, but bounded supplementary tasks with `required_receipts: []` may set `completion_receipt: null`. This matches existing count-floor / quality refill task templates while preserving authority: null does not complete a task by itself, and delegated relay provenance plus downstream gates still decide whether outputs are valid.

**Also decided**: `operate-queue repair --remove-stale` is included in this change (QIV-004). It uses the same deterministic slug resolver as enqueue to identify and remove topic-stale task cards. A broader `--auto` mode for status-level repair remains an open question.

### Decision 4: Trace links to diagnostics by path, not copied content

**选**: Gate trace entries include `phase` and `diagnostic_path` pointing to `_diagnostics/gates/<iso>-<gate>.json`. Failed gates and passed gates both get diagnostic artifacts; pass diagnostics are lightweight summaries.

**不选**: Copying full inspect/advice payloads into trace. Trace should be scan-friendly; diagnostics hold details.

### Decision 5: Bypass suspicion is automatic and phase-aware

**选**: Gate CLI detects bypass suspicion and writes `relay_bypass_suspected` trace events plus run.log WARN through existing logging surfaces.

- Wave0/Wave1: current-wave artifact/source/reference files without current-wave output declaration coverage or successful slot binding trigger suspicion.
- Wave2: synthesis/backfill alone does not trigger suspicion. `reference/00-cross-*.md`, search/gap-fill outputs, or finding-index search claims (`decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`) without Wave2 provenance trigger suspicion.

The event is diagnostic only. Blocking behavior comes from configured provenance gate rules.

**不选**: Requiring Agent to manually self-report bypass. A bypassing Agent is unlikely to report itself, and the point of this change is Engine-observable diagnosis.

### Decision 6: `execution_contract` describes execution surface, not provenance

**选**: Add workflow frontmatter `execution_contract`:

- `surface`: `phase-agent` / `relay-subagent-role` / `shared-guidance`
- `search_policy`: `no_search` / `relay_required` / `relay_required_for_new_evidence` / `subagent_performs_search`
- `delegated_role_keys`: lifecycle phases that may/must delegate through relay
- `loaded_by` and `delivered_via`: role specs are loaded by Phase Agent and delivered via relay `task.md`

The explicit mapping is:

- Wave0 lifecycle: `phase-agent`, `relay_required`, [`dpt-source-intake`]
- Wave1 lifecycle: `phase-agent`, `relay_required`, [`dpt-evidence-extractor`]
- Wave2 lifecycle: `phase-agent`, `relay_required_for_new_evidence`, [`dpt-topic-scout`, `dpt-evidence-extractor`]
- Wave0/Wave1/Wave2 subagent role specs: `relay-subagent-role`, `subagent_performs_search`, `loaded_by: phase-agent`, `delivered_via: relay_task_md`
- Other lifecycle nodes, including instantiation, HITL, setup, seed-topics, readiness, rerun, final: `phase-agent`, `no_search`
- Shared guidance touched here: `shared-guidance`, `no_search`

Relay-capable lifecycle nodes also load `shared/shared-subagent-protocol` and `shared/shared-anti-cheating-rules` via `requires`, not only `suggested_context`, so the Phase Agent sees the relay path and forbidden authority rules before the phase body.

**不选**: `execution_space: subagent`. It implies role spec files are directly lifecycle-loaded by Sub-agent actors. The actual path is Phase Agent reads role spec -> constructs relay task.md -> Sub-agent reads slot-local task/schema/files.

**Boundary**: `execution_contract` is Agent-readable + validator-enforceable. It does not make a filesystem-only artifact countable and does not replace receipt, ledger, slot marker, or gate provenance.

### Decision 7: RWP delta reconciles Wave1 and role-spec identity

**选**: Add an active `research-wave-phase-content` delta. Without it, this change would say Wave1 is relay-driven deepening while accepted RWP still describes Wave1 as a placeholder skeleton boundary.

The delta states:

- Wave1 now produces relay-backed evidence-summary, question-list, and rich reference files.
- The old "do not claim topic-specific deepening" placeholder prohibition is superseded by "do not claim deepening without relay-backed evidence and gate pass."
- Relay role spec files are loaded by Phase Agent, not manifest lifecycle phase execution surfaces.
- Wave2 keeps synthesis/backfill under Phase Agent control and only requires relay provenance for new search/evidence/reference outputs.

### Decision 8: Self-documenting node briefs are first-load orientation, not runtime authority

**选**: Add a final cleanup that makes the two workflow node classes self-identifying at cold load.

- Lifecycle phase nodes are exactly the files listed in `manifest.phases[].node`. Each lifecycle phase gets `## 0. Execution Brief` immediately after the H1 and before the existing 9-section body.
- Relay role specs are Phase-Agent-loaded role guidance used to construct relay slot `task.md`. They are renamed to role-key-first filenames (`subagent-dpt-source-intake.md`, `subagent-dpt-evidence-extractor.md`, `subagent-dpt-topic-scout.md`) and get `## 0. Role Brief` plus a shared role-oriented body structure.

**不选**: Inferring lifecycle status from filename, directory, `node_type`, `gate`, `stop`, or `execution_contract.surface`. Manifest membership remains the lifecycle source of truth.

**不选**: Adding role specs to `manifest.phases[]` or `manifest.shared[]`. Their contract inventory is defined by active role-spec requirements, enforced by validator/tests, and referenced by phase `suggested_context`.

**Boundary**: `Execution Brief` and `Role Brief` orient the Agent. They do not replace schema, queue state, relay receipts, output declarations, trace, gate CLI verdicts, or transition routing as deterministic authority.

**Dependency policy**: This cleanup updates stale `shared-gate-rules.md` prose but does not blanket-add `shared/shared-gate-rules` to every phase `requires`. Preserve existing `suggested_context`, add Wave2's required role-spec suggested context, and require any new suggested context to document its phase-specific reason.

## Risks / Trade-offs

- **[Risk] Provenance still is not cryptographic.** A malicious actor could forge ledger and slot files. Mitigation: out of scope for this change; current goal is preventing accidental/shortcut bypass by making the legitimate relay path easier and the direct path visibly fail. Future ledger signing can harden this further.

- **[Risk] Phase-aware rules could accidentally block Wave2 synthesis.** Mitigation: Wave2 has no unconditional relay hard gate; only search/evidence/reference outputs trigger provenance requirements.

- **[Risk] Simplification could erode accepted authority boundaries.** Mitigation: specs and tasks explicitly preserve `count_floor` ledger authority, cache Phase 1 policy, reference format/countability, and rerun quality contracts.

- **[Risk] Queue validation could block legitimate new topics.** Mitigation: validation checks current `topic_registry`; add-topic/rerun flows update registry before enqueue.

- **[Risk] Jaccard false positives remain possible.** Mitigation: this change does not expand Jaccard into slot hard validation. Any future downgrade to warning requires a `gate-content-dedup` delta.

- **[Risk] `execution_contract` could be misread as authority.** Mitigation: WNC delta states it is guidance + validator input only; gate provenance remains Engine-ledger/slot based.

- **[Risk] Brief headings could be mistaken for a second control plane.** Mitigation: WNC/RWP deltas state `Execution Brief` and `Role Brief` are first-load orientation only. Runtime truth remains in manifest membership, schemas, queue/relay state, trace, transition table, and gate outputs.

- **[Risk] Wave2 bypass detection glob is name-pattern dependent.** The current Wave2 detection uses `reference/00-cross-*.md` as the primary glob for promoted cross references. A Phase Agent could write search outputs under a different naming pattern and evade the glob-based detection. Mitigation: this is an accepted limitation in the current non-cryptographic provenance model; the finding-index-based detection path (`decision: exploit_search`, `search_required`, `subagent_receipt_refs`) provides a second detection surface. Future changes may expand glob coverage or add content-based detection.

- **[Risk] Sub-agent runtime activity is not yet logged.** BUG-017 describes a 22-minute gap in run.log during sub-agent execution. This change enriches gate-time trace (diagnostic_path, phase context, bypass_suspected, pass diagnostics) but does not add sub-agent lifecycle events (spawn, running, completed) to the trace or log. A reader can now see that bypass happened and which gate failed, but still cannot see what the sub-agent did during execution. Mitigation: gate-time trace enrichment is the first step; sub-agent activity logging is deferred to a future change.

## Open Questions

- **Should `operate-queue repair --auto` exist?** The `repair --remove-stale` variant is decided and specified in QIV-004. `--auto` would extend repair to broader automatic status correction (e.g., stuck slots, inconsistent slot state). This can be decided during implementation if real use shows repeated status drift beyond stale topic slugs.
