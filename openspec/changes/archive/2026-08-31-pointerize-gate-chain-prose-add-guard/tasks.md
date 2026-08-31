## 1. Plan review

- [x] 1.1 `openspec-feedback:plan-review` — 完成 plan review：对照 proposal/design/spec delta 与 `_backlog/plans/control-surface-drift-density-and-module-boundaries.md` §1，确认 scope 无漂移、无未决语义决定。Done condition: 本 task 勾选，review 结论在会话中留有记录。（2026-08-31 review PASS：scope 与 plan §1 一致；三个 plan 机检绿后才进入 target edit。）

## 2. Guard checker

- [x] 2.1 新增 `openspec/governance/check-gate-chain-prose.mjs`（实现 CHF-003 MODIFIED 的 gate-chain-prose 行为条款）：扫描 `DEEP_RESEARCH_HARNESS/**/*.md`；gate enum 集合运行时从 `workflows/manifest.json` gate keys 读取，自身不维护枚举清单；单行出现 ≥2 个不同 gate enum 且含 `→`/`->` 连接即 exit 1 并报告 file/line/匹配序列；manifest 缺失/不可解析 exit 1（fail-closed）；参数用法错误 exit 2。Done condition: 对当前真实树运行 exit 0。（✓ 真实树 PASS：52 md × 10 enums；落地首跑曾精确命中 L159 真实漂移，全树零误报）
- [x] 2.2 新增 `tests/governance/gate-chain-prose-guard.test.mjs`（node:test + node:assert）：①真实树 green；②错序链 fixture red（断言报告含 file/line/序列）；③pointer 句（只命名真相源文件、不枚举 gate 值）green；④enum 集合派生自 manifest（替换 fixture manifest 可改变判定）。Done condition: 该测试文件 node --test 全绿。（✓ 6/6 pass）

## 3. Finalizer 接入

- [x] 3.1 `openspec/governance/finalize-change-archive.mjs`：在 content-drift 检查之后插入 `check-gate-chain-prose.mjs` 步骤（错误码 `gate_chain_prose_failed`，与 4 个 drift-guard 检查同构）。Done condition: `npm run governance:check` 输出含新检查行且 PASS。（✓ 另按实现事实同步注册了 RootCodeSchema 与 CheckSchema 两个封闭 enum 的新 id——finalizer 结果契约的机器面要求；integration 暴露后修复）
- [x] 3.2 `tests/integration/governance/change-feedback-loop-archive.test.mjs`：fixture 拷贝清单加入 `check-gate-chain-prose.mjs`，FINALIZER_CHECKS 期望序列在 content-drift 之后插入 gate-chain-prose。Done condition: 该 integration test 绿。（✓ 1/1 pass）

## 4. COMMANDS.md prose 修正

- [x] 4.1 `DEEP_RESEARCH_HARNESS/COMMANDS.md` L159：删除「六大生命周期 gate 的 `check.next` 推进链：…」整句（含「六大」计数），替换为 pointer 句——gate 全集与推进序的单一真相源是 `workflows/manifest.json` + `workflows/transitions.chain.json`，`engine/ask-next.mjs` 的 `resolveNodeTransitionDetailed()` 提供详细查询；同行 `--current-node` 必带参数说明不变；顺带核查全文档无其他「X 大 gate」计数句。Done condition: L159 不含任何 gate enum 的箭头序列；guard 对真实树 exit 0。（✓ diff 恰一行；全文档无其他计数句）
- [x] 4.2 guard 红样本验证：临时在 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 插入一行故意错序链（如 `wave0-complete → wave1-complete → hitl1-recorded`），运行 guard 确认 exit 1 且报告正确坐标，然后移除样本恢复 exit 0。Done condition: 观察到一次真实 red 与恢复后 green；红样本不留痕（git diff 干净）。（✓ 观测 red @COMMANDS.md:236 精确坐标；移除后 diff 仅余 L159 修复一行）

## 5. 全量回归与归档前置

- [x] 5.1 运行全量 `npm test`。Done condition: 退出码 0、0 fail。（✓ 2877/2877 pass，0 fail）
- [x] 5.2 归档前置机检：`node openspec/governance/check-project-reqs.mjs --mode archive --change pointerize-gate-chain-prose-add-guard` PASS；`node openspec/governance/check-semantic-closure.mjs --change pointerize-gate-chain-prose-add-guard --mode assets` PASS；`openspec validate pointerize-gate-chain-prose-add-guard --strict` PASS。Done condition: 三命令退出码均为 0。（✓ 三项全绿）
- [x] 5.3 `openspec-feedback:closeout-review` — closeout review：对照 change-scoped 实际 diff 复核 §2–§4 产出（checker 判定形状、finalizer 序列位置、L159 终稿、红样本已清除），确认无未处理 finding；如有 finding 先按 CHF-001 记普通未完任务再修复。Done condition: 本 task 勾选，随后由 governed finalizer 完成归档。（✓ 2026-08-31 review PASS：8 个文件与 delta 行为条款一致；实现暴露的 CheckSchema/RootCodeSchema enum 与 mock 白名单事实已吸收进 3.1 注记；无未处理 finding）
