## Why

新的 rich reference 仍可由模板和可选 evidence-extractor 示例写出 slug/id
`related_topic`，但已确认的 current policy 是以 UID 表达 one / all / exact
subset。Wave2 的 `00-cross-*` 当前可以覆盖选择的 Topic subset，不能被错误
扩大为 `all`，也不能继续依赖 legacy writer form。

来源：`_backlog/plans/current-contract-signal-cleanup/changes/C5a1-uid-only-current-reference-authoring.md`
与 `C5a1b-current-shared-cross-reference-binding.md` 的已确认 B policy。

## What Changes

- 为新的 rich-reference metadata 确立三个互斥的 current binding forms：一个
  `related_topic_uid`、`related_topic_uid: all`，或非空去重的
  `related_topic_uids: [uid, ...]` exact subset。
- 修改 shared canonical reference-binding adapter、Gate/inspect、file
  observability 与 index projection，使它们验证并消费该 UID-array form，保持
  single/all 的既有语义。
- 修改 current writer templates、Phase materialization guidance 和可选
  evidence-extractor reference example，使新的输出不再选择 `related_topic`。
- **BREAKING for new output only**：旧 `related_topic` 不再是新 writer/guidance
  的选择；它仍是现有历史 reference 的 reader input，直到 C5a-2 独立决定。
- 不重写既有 reference bytes，不增加 migration/conversion、version router，
  不将 selected subset 扩大为 `all`，也不把 `W2F-*` finding 变成 reference
  metadata 的必需 join。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `bundle/reference-flat-format`: 定义新的 current metadata binding forms、
  parser-aligned writer guidance 和 index 的 navigation projection。
- `research/canonical-topic-state`: 让纯 canonical layout resolver 验证
  UID-array reference binding，且继续作为历史 legacy binding 的唯一 reader。
- `bundle/file-observability`: 让 reference footprint inspection 通过 shared
  adapter 消费 exact UID subset。
- `engine/cli-inspect-output-conventions`: 让 Wave inspect 使用同一 adapter
  检验新的 current form，并给出一个直接 binding root。
- `workflow/rerun-topic-integration`: 让 rerun-produced rich references 与
  normal reference 的 three-form current contract 对齐。
- `research/research-wave-phase-content`: 让 Wave0/Wave1/Wave2 current
  materialization guidance 分别写 all、single UID、exact subset UID array。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/reference-flat-format` | `reference-flat-format/spec.md` 的 rich metadata、index、writer guidance requirements；shared template 与 index sync | Modify | 它拥有 new-output metadata presentation 与 index navigation row。 |
| `research/canonical-topic-state` | `canonical-topic-state/spec.md` 的 historical bindings requirement；`topic-layout.mjs` | Modify | shared adapter 在此把 metadata form 解析为 canonical UID set。 |
| `bundle/file-observability` | `file-observability/spec.md` canonical footprint requirement；`file-observability.mjs` | Modify | inspection must recognize the selected exact subset through the shared adapter. |
| `engine/cli-inspect-output-conventions` | Wave0/Wave1/Wave2 inspect requirements；shared gate helper | Modify | inspect is a verdict consumer and must report the same new-form validity/root. |
| `workflow/rerun-topic-integration` | rerun reference-format requirement | Modify | rerun output shares the reference document contract and cannot retain a second writer form. |
| `research/research-wave-phase-content` | Wave phase materialization and canonical-ref guidance requirements; `phase-wave*` docs | Modify | Wave0/Wave1/Wave2 own the distinct current writer facts and Phase timing. |
| `research/wave2-synthesis` | `finding-index.yaml#/affected_topics` requirement | Verify-only | It proves selected subset is current and supplies Wave2 semantic input, but reference metadata remains independently self-contained. |
| `agent/delegated-work-units` | delegated output and task-boundary specs; current Wave1 normal path | Excluded | normal rich-reference materialization is Phase-owned after submit; no current delegated rich-reference task is assigned. |
| `research/research-return-map` | Wave2 finding/backfill projection requirements | Verify-only | it consumes finding scope for seed projection, but does not own rich-reference metadata binding. |

## Impact

- Target code/guidance: `topic-layout.mjs`, gate/inspect and observability
  readers, index rendering, shared reference template, Wave phase Markdown,
  and the optional evidence-extractor example.
- Verification: reference-binding unit cases; index/observability and Wave
  inspect integrations; Wave0 one/all, Wave1 single UID, and Wave2 selected
  subset writer characterization.
- No new dependency, runtime state, command, migration, or historical-file
  rewrite. The current Engine remains a deterministic binding validator; the
  Agent remains responsible for selecting the semantically correct current
  Topic scope from its authoritative Phase facts.
