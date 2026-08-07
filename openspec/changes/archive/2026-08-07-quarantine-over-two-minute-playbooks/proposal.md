## Why

本轮直接执行的 Case 224 与 Case 225 分别耗时约 600 秒和 532 秒（后者的后续尝试也在约 516 秒被停止）。它们继续留在 active manifest 会让 Autorun 或 Interactive 的普通选择误触发不可接受的等待和成本，因此需要立即从可运行 corpus 中隔离，直到其流程被重构。

## What Changes

- 新建 `experiments_playbook/exp_extrem_slow/` 隔离目录，并将已确认失控的 Case 224 与 Case 225 以 `case-…-extreme-slow-…` 名称移入其中。
- 从 active manifest 的机器表移除这两个路径；在机器表外记录隔离原因、重构前禁止 Autorun/Interactive 执行的规则和案例清单。
- 令 Autorun 的 runnable-corpus 发现显式忽略该隔离目录，并拒绝任何将其重新写入 active manifest 的尝试，使隔离资产不会阻断其他 active case 的 manifest 校验，也不会被任一 selector 发现或启动。
- 在 Headless 与 Interactive 的注入指令中写明隔离边界；更新 Case 225 的静态合同测试，使其验证“被隔离且未注册”，而非错误地要求活跃注册。
- 在 `experiments_playbook/README.md` 说明：隔离资产不是第四种可运行 cost tier；只能先重构并移回普通 runnable 路径后重新注册，或直接删除。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `verification/experiment-agent-autorun`: 添加 extreme-slow 隔离目录的非 runnable corpus 边界和 active-manifest 拒绝规则。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/experiment-agent-autorun` | `openspec/specs/verification/experiment-agent-autorun/spec.md`，特别是 manifest 单一可运行选择权威与 corpus drift 要求；`DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs` | Modify | 现有 runnable discovery 会把任何 `exp_*` 下的 case 当作必须注册的 active case；隔离目录必须有明确的非 runnable 例外。 |
| `verification/experiment-run-strategy` | `openspec/specs/verification/experiment-run-strategy/spec.md` | Verify-only | profile 仅投影 active manifest；本变更不新增 profile、预测、SLO、重试或调度。 |
| `workflow/playbook-runner` | `openspec/specs/workflow/playbook-runner/spec.md` | Verify-only | Playbook 执行和 native completion 边界不变；被隔离的资产不会被交给 Playbook Agent。 |

本变更修改的是现有 `verification/experiment-agent-autorun` 的 active runnable corpus 边界，因此需要该 capability 的最小 delta spec；不新增 capability 或 requirement ID。

### Semantic Precision

`exp_extrem_slow/` 只回答一个有界读者问题：某个 case 文件是否当前可被 Autorun 或 Interactive 选择。其目录、`extreme-slow` 文件名和 manifest 外的隔离清单共同给出明确答案：隔离中的 Case 224/225 不可运行，必须先重构后移回普通 runnable 命名，或直接删除；其他 case 仍由 manifest 表回答。它不把历史时长、健康、原生结果或重构完成状态伪装成新的运行时状态。

### Control Shape

直接在 runnable-corpus 发现处排除一个固定隔离目录，并由 manifest 外说明暴露原因。这避免了为每个 selector、profile、Headless/Interactive 入口分别增加 denylist、超时重试或第二张可运行表；active manifest 仍是唯一选择权威，控制链更短。

### Responsibility Boundary

用户已决定 Case 224/225 在重构前不得运行。Agent 负责移动资产、更新说明和运行静态验证；Engine 仍负责 manifest 解析、runnable-corpus 校验和 selector 的确定性拒绝/发现。此变更不把用户决定变成运行时 verdict，也不声称重构已完成。

## Impact

- `DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs` 的 active-corpus discovery 和其 JS-led regression test。
- `experiments_playbook/PLAYBOOK_MANIFEST.md`、两个 Agent instruction 文件，以及 Case 224/225 的资产路径。
- `tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` 的静态定位与隔离断言。
- 不改动 Framework 的 Agent Flow、native completion、预算、超时或 run-profile 行为；不启动真实 Agent 实验。
