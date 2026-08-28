## Context

见 `proposal.md` 的 Why。本 change 是 document-only：只编辑 `DEEP_RESEARCH_HARNESS/cli/README.md`，把前一个 change 中 `COMMANDS.md` 已补的 `operate-queue` 生命周期平行补到 CLI surface 文档。无跨文件、无 schema/state/transition 变更、无测试变更、无 spec delta（`skip_specs: true`）。

## Goals / Non-Goals

**Goals:**

- Structure 图加 `operate-queue.mjs` 行。
- Exit-code inventory 加 `operate-queue.mjs` 生命周期入口。
- Selected Public Operation Parsing 表加 `operate-queue.mjs` 行。

**Non-Goals:**

- 不改 Engine 行为、exit code 语义、CLI 名称或测试。
- 不重复已在 `COMMANDS.md` 中存在的附录模板（queue result / projection / Evidence Map）——那是索引层内容，非 CLI 文档。
- 不新增 gets an EAGAIN/gate `--current-node` 重复（已在 `COMMANDS.md` 中覆盖）。

## Decisions

1. **Structure 图**：在 `operate-work-unit.mjs` 行后加 `operate-queue.mjs` 行，动词集与 `COMMANDS.md` 保持一致（`check/enqueue/claim/complete/fail/preempt/count/render/project/repair`）。
2. **Exit-code inventory**：在 `operate-work-unit.mjs` 条目后加 `operate-queue.mjs` 条目，描述生命周期动词 + exit 语义（0=empty/ok, 1=blocked/drained, 2=invocation）。
3. **Selected Public Operation Parsing 表**：在 `operate-topic-state.mjs` 行前加 `operate-queue.mjs` 行，列出 `check|enqueue|claim|complete|fail|preempt|count|render|project|repair` 及其 `--bundle --task --result --failure --actor` 参数。

## Risks / Trade-offs

无实质风险。`check-content-drift` 的 CLI verb 校验只扫描 `COMMANDS.md`，不扫描 `cli/README.md`，所以动词集准确性依赖手动把关。

## Migration Plan

无迁移。回滚即还原该文件改动。