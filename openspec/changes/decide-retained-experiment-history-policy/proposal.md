## Why

当前 Supervisor 会把 retained v1 batch report、audit event 和其中的 v1
selection observation 转为当前 prediction、qualification 与 launch selection
输入。用户已选择 current-only policy：历史记录可由人读取，损坏历史仍只产生
非致命 diagnostics，但旧格式不得参与当前 Supervisor 决策或触发 launch。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/experiment-run-strategy` | accepted spec; retained-observation reader; regression planner and strategy tests | Modify | 它定义 retained report/audit observation、`needs_qualification` 与 admission/selection。 |
| `verification/experiment-agent-autorun` | accepted spec; Supervisor entry; integration regression | Modify | 它仍将 fast historical v1 case 定义为可检查的 qualification candidate。 |
| `verification/experiment-observability` | accepted retained-report requirement and schema contracts | Modify | 它要求 readers 接受 v1 selection observation 与 retained v1/v2 envelopes。 |
| `workflow/playbook-runner` | accepted guidance requirement; host-tool README | Modify | 它仍要求 guidance 说明 v1 history 可以选择 qualification candidate。 |
| `verification/verification-routing` | accepted routing catalog and current test classes | Verify-only | 本 change 只选择已有 unit/integration deterministic evidence，不改变 test class 或 proof authority。 |

## What Changes

- **BREAKING** Retained `agent-experiment-batch-report/v1`、
  `agent-experiment-audit-event/v1` 和 v1 selection observation 不再是当前
  Supervisor observation input；它们不得影响 prediction、admission、
  `needs_qualification`、group gap reason 或任何 launch selection。
- Current retained input 仅接受完整的 v2 envelope 和 v2 selection observation。
  v2 source/execution-surface qualification 保持现有 explicit
  `--regression-qualification` 路径；此 change 不删除该 current v2 policy。
- 遇到 retained v1 或 malformed history 时，Supervisor 保持 no-launch safety：
  不把它转为 current observation，也不让它阻塞当前 dry-run 或 launch；它可作为
  diagnostics 事实出现。
- 删除只为 retained v1 current-input compatibility 而存在的 schema/reader/
  qualification projection、测试与 guidance；不创建 adapter、fallback、upgrade、
  version router、计数锁或迁移路径。
- 保留历史文件字节、当前 v2 writer/reader、当前 manifest/V2 playbook
  validation、native completion、health、audit、cleanup，以及仍有 current owner 的
  completion/health/run-context/manifest v1 discriminator。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `verification/experiment-run-strategy`: Current strategy input and regression
  admission accept only retained v2 observations; v1 history no longer creates
  prediction or qualification facts.
- `verification/experiment-agent-autorun`: Autorun regression behavior no
  longer exposes historical v1 as a qualification candidate while preserving
  current v2 qualification semantics.
- `verification/experiment-observability`: Retained current-observation reader
  accepts only the v2 report/audit/selection-observation contract and reports
  old/malformed records without turning them into launch input.
- `workflow/playbook-runner`: Runner guidance describes current-v2-only
  qualification and does not present v1 history as a valid selection path.

## Impact

- **Affected code:** retained-observation schema/reader and strategy projection,
  Supervisor-facing report selection, current Autorun guidance, and focused
  unit/integration tests.
- **Observable consequence:** a group previously represented only by a fast v1
  record becomes an explicit no-current-observation/ineligible gap; it is never
  silently substituted or launched from that record.
- **Authority boundary:** the user selected the historical-input policy; the
  Agent implements the bounded retirement and verifies callers; the existing
  Engine/Supervisor remains the deterministic authority for current v2 facts,
  selection feedback, and launch verdicts.
