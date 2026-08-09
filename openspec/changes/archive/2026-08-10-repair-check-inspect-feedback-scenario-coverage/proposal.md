## Why

已接受的 `engine/check-inspect-feedback` main spec 在第六个已解析
requirement（`CHI-005`）的 `authori` 处截断；它没有可见的 Scenario blocks，
且 `openspec validate` 报告 `requirements.6.scenarios`。已归档的 CHI-005 delta
保留完整的既有 contract 和三个 scenarios；当前 Engine surfaces 与既有 regression
evidence 只为部分例子提供恢复佐证，不构成本 change 对全部运行时行为的验证。本 change
恢复该已接受 contract，使 main spec 重新完整，并清除唯一剩余的 repository-wide spec
validation failure。

## What Changes

- 在 `openspec/specs/engine/check-inspect-feedback/spec.md` 恢复完整的既有
  CHI-005 requirement text 及其三个 scenarios。
- 为恢复的既有 requirement 建立完整的 `MODIFIED` delta。
- 验证 target spec 和完整 main-spec inventory；修正 tracker，使其区分第六个
  已解析 requirement 与它的登记 ID `CHI-005`。
- 不改变 Engine behavior、feedback semantics、tests、runtime state、已接受的
  requirement IDs 或 Semantic Fact Closure runtime families。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/check-inspect-feedback` | `openspec/specs/README.md`；current main spec；`openspec/governance/req-registry.yaml`；已归档 `2026-08-08-make-feedback-name-contract-roots` 的 CHI-005 delta | Modify | 它拥有被截断的 CHI-005 text 及其脱落的 Scenario coverage。 |
| `bundle/reference-flat-format` | current main spec 与 target validation | Verify-only | REF-009 与 REF-010 已修复；其通过状态只是 inventory context，不是 edit surface。 |
| `verification/verification-routing` | accepted main spec | Verify-only | 静态 main-spec repair 的 required route record 没有 native test-class claims。 |
| `governance/semantic-fact-closure` | accepted main spec 与 current fact-family catalog | Verify-only | required record 适用，但没有 Harness deterministic runtime fact 或 verdict consumer 改变。 |

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `engine/check-inspect-feedback`：恢复完整、parser-visible 的 CHI-005
  feedback-contract Scenario coverage。

## Impact

- 只改 main spec：`openspec/specs/engine/check-inspect-feedback/spec.md`。
- change-local planning/governance records，以及用户明确追踪的 named-debt ledger。
- 不改 Harness code、runtime bundle、API、dependency、release 或 Agent workflow。

## Boundaries And Reviews

current main spec 是 accepted behavior 的 Source of Record；截断是它自身的 defect。
archived delta 只是恢复精确既有 text 的 historical recovery evidence。current Engine
surfaces 与 existing regressions 只对其中的部分例子作局部佐证；本 change 不重新验证或
声称全部 runtime behavior。最短合法闭环是一次 requirement-block restoration -> target
validator -> full-spec inventory；它避免新增 checker、runtime state、recovery branch 或
alternate feedback authority。

没有引入或实质改变 named runtime state、projection、status、concept、module、command 或
reader-facing view。用户已选择此 named debt；Agent 只能在明确的 Apply phase 执行这项可逆
spec repair；OpenSpec validator 仍是 deterministic grammar verdict owner。
