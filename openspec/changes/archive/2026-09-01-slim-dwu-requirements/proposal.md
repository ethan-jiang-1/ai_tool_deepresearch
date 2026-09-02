# Proposal: 2026-09-01-slim-dwu-requirements

## Why

`agent/delegated-work-units`（2487 行）含七条 123–260 行巨无霸 requirement，是 C3 批次中最大的一块（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.4；M4/M5 顺手项）。

## What Changes

- **七个巨无霸拆为十五个主题 requirement**（全部文本逐字节保留，仅换标题；supersession 137 行 ≤160 保留不动）：
  envelope→2（index/claim profile | readers/projections）；submit-only→2（完成权威 | queue demand+contribution 边界）；tasks-paths→2（绝对路径+beacon | 验证+role 契约）；drift-canonicalize→2（窄规范化阶段 | canonical 持久化）；dry-submit→2（只读预检 | provenance 严格+中性 target 模块）；timeout→2（progress-aware 预检 | 同一 guard 终态化+审计）；integrity→3（共享只读事务事实 | journal disposition 闭集 | 无锁恢复）。
- **142 个场景全数保留**，按主题归组、组内原相对顺序；各块顶部 `> req:` 行随首组保留。
- **header `> req:` 不变**（DEW-001..029）；M4/M5（journal_disposition 措辞精确化、L1102 场景标题注记）按 mild 项登记不强制，本批不改写文本。
- **不产出**：无 normative 语义变更、无行为变更、无代码变更、无新 capability。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/delegated-work-units` | 主 spec 全文（2487 行）+ 七块结构勘察（29 散文段+142 场景，准确边界修正后） | Modify | requirement 结构重组（7→15），文本逐字保持；无行为变更。 |
| `agent/subagent-dispatch` | catalog 行 | Excluded | claim/dispatch 面无涉。 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | 反馈词汇无涉。 |

## Impact

- `openspec/specs/agent/delegated-work-units/spec.md`：REM（7 旧块）+ ADD（15 新块）。
- 零代码触点；新增一个 unit 结构锁；`delegated-queue-spec-text-locks` 的 DEW body 计数断言（29）不受影响（29→29+8=37，apply 后若断言失配则同 change 更新——AGQ 先例）。
- 文本锁面：apply 前 `list-doc-locks` 复核。

## Source of Record 与责任边界

- Source of Record 不变：同一组 work-unit engine 模块行为。最短合法闭环：纯结构。Net simplification：DWU 全部巨无霸清零，审阅粒度回归常态。
- Semantic-precision reflection：15 标题各对应一个有界问题（与 engine 模块缝对应：envelope/submit/drift/dry-submit/timeout/integrity/recovery）；停止点不变。
- 责任边界：无 user decision、无 permission 变化；Engine verdict 面零触碰。
