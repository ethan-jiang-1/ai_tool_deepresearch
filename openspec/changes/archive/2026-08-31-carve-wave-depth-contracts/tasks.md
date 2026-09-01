# Tasks: carve-wave-depth-contracts

- [x] 0.1 openspec-feedback:plan-review —— （2026-08-31）AUD-1 §3 地图 + 前两次 gate-helpers-core 回滚教训（export 前缀覆盖 const、verdicts 下沉消环）在案；validate --strict 绿。
- [x] 0.2 openspec-feedback:closeout-review —— （2026-08-31）diff 复核（4 新模块 + facade + 3 测试锚点）；全量 0 fail；无 open finding。
- [x] 1.1 行号定界 codemod 切割：verdicts 57/wave1-source-claim-mapping 192/wave1-depth-review 571/wave2 529 + facade。Done condition 达成：五文件加载 OK；全量 0 fail。
- [x] 1.2 运行时修正：`canonicalizeSubmittedWorkUnitRef`/`safeRel` 下沉 verdicts（消 verdicts↔wave1-source-claim-mapping 环）；双 export 语法修正。Done condition 达成：wave-depth 全族测试 26/26 + 全量 0 fail。
- [x] 2.1 归档转场与提交：本勾选表示 §1 全部就绪；勾选后立即执行 finalizer 与 git commit；快照 Post-W3a 追加至 plan §10。
