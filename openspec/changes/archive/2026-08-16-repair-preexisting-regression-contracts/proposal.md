## Why

`npm test` 中有五组失败来自已接受行为之后没有同步更新的测试断言、fixture
或生成式入口文案预期。它们错误地把历史实现细节当成当前契约，阻碍全量回归，
也不能作为 `iterate-final-delivery-in-place` 的修复项混入其范围。

## What Changes

- 将 Wave1 Gate CLI 集成测试改为断言当前的 Gate 输入、提交 backing 与语义段落
  边界，而不回退到旧的 submit-time 语义验证或旧 canonical role 假设。
- 将 Gate-definition 规则数测试改为由当前 Gate 定义的已命名规则得出预期，保留对
  实际规则集合变化的可见失败。
- 更新 CLI exit-code 测试的受管命令库存，使其包含现有
  `operate-composition-handoff.mjs`，并保持该库存与当前命令目录一致。
- 为 handoff-witnessing 生命周期 fixture 写入当前 required
  `composition_handoff`，以便它能到达其本来要验证的 Final 生命周期边界。
- 修正 feedback-finalizer 生成入口的测试预期：稳定 `.agents`/`.claude` entry
  只需要取得当前 operation guidance；`openspec-feedback:` 标记属于 change
  `tasks.md`，不是入口技能正文的事实。
- 不修改 Harness runtime、CLI 可观察行为、Gate 语义、OpenSpec feedback lifecycle
  或任何已接受 requirement；本变更只恢复测试和 fixture 对当前行为的准确观察。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` and the Wave1 CLI test | Verify-only | Gate implementation and accepted rule semantics remain unchanged; only historical assertions are stale. |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md` and exit-code inventory test | Verify-only | The command's exit behavior is unchanged; the test inventory omitted an existing CLI. |
| `research/content-delivery-gate-implementation` | `openspec/specs/research/content-delivery-gate-implementation/spec.md`, composition-handoff helper, and handoff fixture | Verify-only | `CDG-001` keeps the current HITL2 composition-handoff prerequisite; the fixture must supply it before exercising later lifecycle behavior. |
| `governance/change-feedback-loop` | `openspec/specs/governance/change-feedback-loop/spec.md` and finalizer test | Verify-only | The contract assigns feedback markers to change task ledgers and treats entry surfaces as guidance consumers; no governance behavior changes. |
| `verification/integration-tests` | verification-routing contract and affected test files | Excluded | Test placement and class remain correct; no routing rule changes. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change repairs regression test and fixture expectations without
changing accepted behavior, so `skip_specs: true` is intentional.

## Impact

- Affected files are the five failing tests and their local fixtures/assertions.
- No production Harness source, public CLI arguments, persistent runtime facts,
  dependencies, or OpenSpec requirements change.
- Completion requires focused test evidence followed by canonical `npm test`.
