# Design: registry-hygiene-and-guard-extensions

## Context

动机见 proposal.md;R3 预研(2026-09-04)已定案 0 行需修,本 change 实质 = R4 两个 guard 扩展 + 对账表归档。扩展点实读:§-guard(现只扫 specs→nodes 的 `<file>.md §X.Y`)、nav 注释格式(`// Navigation: public API — <symbols>` 于 return-map.mjs 顶部,单文件测试 rrm-spec-truth-sync-text-locks)。

## Goals / Non-Goals

**Goals:**
- workflows 树(phase 节点/playbook)内自引用与跨文件 `§X.Y` 引用解析被机器断言。
- `// Navigation:` 注释声明的符号在同文件真实声明(引擎全库 0 幽灵)。
- old→new 对账表(17 迁移对 + 15 死前缀回声)归档。

**Non-Goals:** 不改 registry 行(0 需修)、不改 main specs、不加新 CLI 退出码面、不做裸段名引用正则化。

## Decisions

### D1. §-guard 扩展 = workflows 树内引用解析(规则 3)
在既有扫描上:对 `DEEP_RESEARCH_HARNESS/workflows/**/*.md` 与 `command_playbook/**/*.md`:
- 裸 `§X.Y`(无 `.md` 前缀)→ 必须在**同文件**存在该编号标题(自引用);
- 形如 `<file>.md §X.Y` → 目标文件(workflows 树内)必须存在(跨文件)。
首扫定标:若历史 prose 有无法解析引用 → 修复文档(权威=目标文件标题)或按基线豁免清单记录;优先修复。
风险:误报含数字的普通文本(如 "§3.1" 出现在规则散文里但非引用语义)→ 引用形态限定 `§\s?\d+(\.\d+)+` 且排除代码/表格行;首扫后人工复核每一条 FAIL 再定夺(不静默豁免)。

### D2. nav 符号 checker(新 check-engine-nav-symbols.mjs)
- 扫描 `DEEP_RESEARCH_HARNESS/**/*.mjs`(engine/cli/schema/helpers 全树)。
- 提取 `// Navigation: public API — a, b, c`(或 `；`/`;` 分隔)符号清单;同一文件内解析声明:正则匹配 `export (const|function|class|async function) NAME` / `^export { NAME` / `^const NAME` / `function NAME` / `^export default`(单值) / `class NAME` / `const NAME =` / `let NAME =` 出现于非注释行;命中即存在。
- fail-closed:第一个幽灵符号给 file:line:symbol;exit 1。接入 check-all(check- 前缀自动)。
- 对齐 cli-exit-code-conventions 精神:结果细节走 stdout,exit code 粗信号。

### D3. 对账表 = 归档文档(非权威)
old→new 表唯一权威 = req-registry 后继指针(机器可查);归档文档仅作考古导航(F3 回声数据 + C2 17 对映射),不复制权威。

## Risks / Trade-offs

- [§-guard 误报普通数字文本] → 引用形态限定 + 首扫逐条人工复核再落地。
- [nav 符号声明正则漏真声明] → 正则覆盖 export/const/function/class 全形态;漏报方向 = 幽灵漏检(保守,不误杀);测试含全形态 fixture。
- [首扫历史漂移需修文档] → 修文档(权威=目标),不改 checker 迁就。

## Migration Plan

apply 序:两 checker 实现 + 单测 → §-guard 首扫定标(修文档到 0 FAIL)→ 全量 governance:check → 对账表归档 → finalizer。回滚:单 change 还原。

## Open Questions

(无)
