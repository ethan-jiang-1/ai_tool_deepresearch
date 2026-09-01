# Tasks: carve-gate-helpers-core

- [x] 0.1 openspec-feedback:plan-review —— （2026-08-31）前两次回滚根因修复（export const + facade re-export）在案；validate --strict 绿。
- [x] 0.2 openspec-feedback:closeout-review —— （2026-08-31）diff 复核（4 新模块 + facade + 1 supersession import）；全量 0 fail；无 open finding。
- [x] 1.1 codemod 切割：invocation 284/result 186/attempt-audit 656/plan-progress 61 + facade。Done condition 达成：五文件加载 OK。
- [x] 1.2 facade re-exports 补齐（17 公开名分块）+ `__dirname`/`WORKFLOW_NODES_DIR` export + attempt-audit logger import。Done condition 达成：barrel 加载 OK；gate-dynamic-threshold 6/6 绿。
- [x] 2.1 归档转场与提交：本勾选表示 §1 全部就绪；勾选后立即执行 finalizer 与 git commit；快照 Post-W3b 追加至 plan §10。
