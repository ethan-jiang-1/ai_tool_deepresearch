## Why

Case 225 的 Topic 绑定修复后，保留的 native batch
`301f8362-bb7e-43c0-9669-260392759c16` 已经执行到真实 Subject Agent、child、
formal submit、Phase closeout 和 inspect。但 case-owned observer 读取
`closeout.reference_refs`，而实际保留的 Phase-closeout index 将 materialized
reference 写在 `materialized_reference_refs`，所以 native 结果仍为 `FAIL`。
失败 check 报告 `submitted: true`、`closeout_paths: 3` 和 `backfilled: true`；
这是 reader-field 不匹配，不是 Actor 不可用、Queue 拒绝或 Phase closeout 失败。

## What Changes

- 让 Case 225 的 closeout observer 读取其已声明的 Phase-owned closeout 实际
  产生的 path-index 字段。
- 扩展现有 Case 225 Markdown contract test，防止 observer 再退回 stale field
  而在真实运行之前没有失败。
- 保留当前 setup-only、real-Agent、native-completion 和 health 边界。之后的
  rerun 仍可能得出 PASS、FAIL、NOT_RUN 或 host lifecycle outcome。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-wave-phase-content` | RWP-002 与现有 Wave1 submitted-backing/Phase-closeout requirements | Verify-only | Phase-owned closeout、submitted backing 和 inspect 不变；case observer 只消费其保留 index。 |
| `research/research-wave-experiments` | main-spec Wave experiment evidence requirements 与当前 Case 225 | Verify-only | 注册的 real-Agent playbook 和 native evidence boundary 不变。 |
| `agent/agent-testing` | Capability Catalog 中 experiment playbooks / trace evidence 的 ownership | Verify-only | 不改变 experiment authority 或 result interpretation。 |
| `verification/verification-routing` | 当前 integration 和 `agent_flow_e2e` route requirements | Verify-only | 现有两个 selected proof route 仍然正确；新的静态 assertion 不改变 routing semantics。 |
| `agent/queue-input-validation` | 现有 strict Topic admission 与保留的成功 Queue payload | Excluded | Queue admission 已正确接受修复后的 canonical Topic UID，不拥有 closeout-index reader。 |

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。这是 registered playbook/test reader alignment，不改变 accepted behavior，
所以 `.openspec.yaml` 声明 `skip_specs: true`。

## Design Review

没有新增 state、projection、command、evaluator 或 reader-facing concept。
有界 reader question 是：Case 225 observer 能否找到 real Phase-owned closeout
已经保留的 materialized reference paths。direct Source of Record 是该 path-only
closeout index，不是重建 reference list 或新增 Engine reader。

最短合法闭环为：

```text
existing Phase-owned closeout index
  -> Case 225 observer reads materialized_reference_refs
  -> existing path existence check
  -> existing native finalizer
```

它替换一个 stale property read，并避免第二个 closeout projection、permissive
fallback、Queue exception 或新的 retry controller。用户已授权机械修复及有界
rerun；Agent 编辑 playbook/test，已有 Engine/trace native completion 仍是唯一
verdict authority。

## Impact

- 受影响 target assets：一个注册的 Markdown playbook 和它现有的 integration-level
  Markdown contract test。
- 不修改 Queue、work-unit submit、Phase closeout implementation、schemas、
  accepted requirements、Subject runner、provider configuration 或 mutable runtime
  bundles。

## Supersession And Closeout

The user-directed extreme-slow quarantine moved Case 225 to
`experiments_playbook/exp_extrem_slow/case-225-extreme-slow-returned-work-closeout.md`
and removed it from active selection. Retained batch
`55d4273e-c0b1-4bcc-99b8-35ef55818a9c` remains the historical native `FAIL`
observation: the corrected closeout/inspect checks passed, while the required
child boundary failed independently. No new run is legal or needed for this
reader repair, and it does not establish a real-child PASS. Any future native
claim requires a separately proposed refactor, supported runnable relocation,
explicit manifest registration, and new evidence.
