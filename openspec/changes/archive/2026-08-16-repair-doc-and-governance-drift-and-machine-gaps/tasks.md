# Tasks: repair-doc-and-governance-drift-and-machine-gaps

## 0. Feedback lifecycle reviews

- [x] 0.1 Plan review（openspec-feedback:plan-review）：按 `openspec/operations/change-feedback-loop.md` Apply Review 完成——whole-change coherence + semantic-closure.yaml（not_applicable，reason 对实际 surface 仍成立）+ 三个 delta 与 main spec 对应 requirement 块 header 匹配 + Capability Discovery 表与实际读取证据一致。无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。
- [x] 0.2 Polish gate（polish-openspec-change ≥2 passes，最后一轮无 edits）：`openspec validate "repair-doc-and-governance-drift-and-machine-gaps" --strict` 通过 + `git diff --check` clean。Done condition：polish 报告 `ready for apply`。

## 1. Spec delta 验证（规划面 → apply 前）

- [x] 1.1 `openspec validate "repair-doc-and-governance-drift-and-machine-gaps" --strict` 通过，且三个 delta 的 MODIFIED requirement header 与 main spec 对应块 header 精确匹配（whitespace-insensitive）。Done condition：validate 0 error、无 delta 格式告警。

## 2. 文档面：chain/入口/命令形态（F-01/F-02/F-04/F-06）

- [x] 2.1 `workflows/README.md` 按 design D1 替换 chain 表述（删「只编码 `passed` 分支」过期句）。Done condition：过期句移除、D1 新表述存在。
- [x] 2.2 `RUN.md:38` 注解按 design D2 替换（删「CLI-verb spelling」失真实词）；`RUN.md:59` 插入 D2 反 fallback 句。Done condition：两处文本与 design 逐字一致。
- [x] 2.3 `DEEP_RESEARCH_HARNESS/README.md:31` 插入 D3 反 fallback 句。Done condition：与 RUN.md:59 新句逐字一致。
- [x] 2.4 `command_playbook/persist-artifact.md:76-80` 按 design D5 替换为两个完整命令形态。Done condition：两个完整行存在、`(A | B)` 记法在该文件移除。

## 3. 文档面：retire/清单/语言（F-05/F-07/F-08）

- [x] 3.1 删除孤儿 playbook `command_playbook/plan-hostfile-sections.md`（apply 前重新验证全仓库无指针）。Done condition：文件不存在，`grep -rn "plan-hostfile-sections.md"` 零命中。
- [x] 3.2 `COMMANDS.md:89` verb 清单插入 `` `timeout-preflight` ``；`cli/operate-work-unit.mjs:3` 头注释删除过期句并按当前 verb 全集改写。Done condition：清单含该 verb；头注释无「later apply sections」句。
- [x] 3.3 根 `README.md` 加 design D7 语言约定 bullet；Rules In One Screen 补「No TypeScript / No Python.」行（D13 三面一致性修复）；`command_playbook/post-final-recovery.md:69` 句末中文句并入主语言（英文）。Done condition：bullet 与硬规则行存在；该文件无中文残留句。

## 4. 治理机制（F-12~F-14、F-16~F-19）

- [x] 4.1 新增 `openspec/governance/check-all.mjs`（design D10 契约）+ `package.json` `"governance:check"` script。Done condition：`node openspec/governance/check-all.mjs` 输出逐 checker 行且 exit 0（当前全绿）。
- [x] 4.2 新增 `openspec/governance/check-guidance-requirement-ids.mjs`（design D11 契约），并注册进 `finalize-change-archive.mjs` 的 `CheckSchema`（位于 spec-req-ids 之后）；同步更新 `tests/governance/change-feedback-finalizer.test.mjs` 的 checker 调用序列/计数断言。Done condition：真实树 exit 0；finalizer 序列含该步；finalizer 测试绿。
- [x] 4.3 `check-project-specs.mjs` 加 `missingH1`/`duplicateH1` 检查（design D12）。Done condition：对无 H1 的 main spec 文件报 `missingH1`。
- [x] 4.4 `openspec/specs/README.md` 头部加 design D14 catalog 声明段。Done condition：声明段存在。
- [x] 4.5 main spec 结构卫生（design D15）：`bundle/run-entry/spec.md` 首行前加 `# run-entry`；`governance/version-management/spec.md` 首行前加 `# version-management`；RET-001 块 `--check-prefix` 段落重排到「silently broadening…」句之后（纯重排，无语义变化）。Done condition：两个 H1 存在；断句已连；`check-project-specs.mjs` 不再报 missingH1。
- [x] 4.6 `openspec/guidance/models/` 全部 5 个含 MUST 的 model 文档（agentic-execution-model / agentic-queue-mechanism / agentic-subagent-mechanism / agentic-workflow-mechanism / framework-runtime-boundary）按 design D8 改写（描述性术语纪律 + 效力声明，保留路径引用与原事实内容）。Done condition：`openspec/guidance/models/*.md` 无 MUST token。

## 5. 验证资产（verification-routing integration）

- [x] 5.1 新建 `tests/integration/md/doc-governance-drift-locks.test.mjs`：静态断言 D1/D2/D3/D5/D6/D7/D8/D14 各 canonical 表述存在、过期句移除。Done condition：`node --test` 该文件绿。
- [x] 5.1b 新建 `tests/integration/md/spec-sync-locks.test.mjs`：断言主 spec sync 后 transition-table structure 以 node ref 为 key、RET-006 为 finalizer 指针版、GCO-009 存在、两个 H1 已补、`> req:` 头含 RET-007..010/GCO-009、registry 含新 ID。Done condition：绿。
- [x] 5.2 新建 `tests/integration/md/model-docs-normative-language.test.mjs`：`openspec/guidance/models/*.md` 出现 MUST token 即失败。Done condition：绿。
- [x] 5.3 新建 `tests/integration/md/root-hard-rule-surface-sync.test.mjs`（design D13）。Done condition：绿。
- [x] 5.4 新建/扩展 `tests/integration/governance/`：`check-all.test.mjs`（聚合+只读）、`check-guidance-requirement-ids.test.mjs`（真实树 PASS + 注入单处违规 FAIL）、`check-project-specs.mjs` 的 H1 覆盖；更新 `tests/governance/README.md` 索引。Done condition：相关测试绿。
- [x] 5.5 `npm test` 全量绿（基线 2913 只增不减）。Done condition：0 fail。
- [x] 5.6 `node openspec/governance/check-semantic-closure.mjs --change repair-doc-and-governance-drift-and-machine-gaps --mode plan` PASS；`node openspec/governance/check-verification-routing.mjs --change repair-doc-and-governance-drift-and-machine-gaps --mode assets` PASS。Done condition：均 exit 0。

## 6. Delta → 主 spec 同步 + registry（apply 内）

- [x] 6.1 主 spec sync：三个 delta 同步到 `engine/transition-table`、`governance/requirement-traceability`、`governance/guidance-constitution` 主 spec；`> req:` 头更新为 RET-001..RET-010、GCO-001..GCO-009。Done condition：sync 完成、main spec 含新 requirement 块。
- [x] 6.2 `req-registry.yaml` 注册新 ID：RET-007（Aggregated read-only governance health entry）、RET-008（Capability catalog declares current-accepted scope）、RET-009（Main spec files carry a level-one title）、RET-010（Requirement IDs in guidance prose resolve against the registry）、GCO-009（Model documents do not present normative rules）。Done condition：注册行存在、命名与 requirement 标题对应。

## 7. 收尾检查（归档前硬性）

- [x] 7.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-doc-and-governance-drift-and-machine-gaps` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。Done condition：exit 0。
- [x] 7.2 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader / 0 missingH1）。Done condition：exit 0。

## 8. Closeout review（archive 前置）

- [x] 8.1 Closeout review（openspec-feedback:closeout-review）：按 `openspec/operations/change-feedback-loop.md` Closeout Review 完成——change-scoped diff 边界可建立；semantic-closure.yaml（not_applicable）对实际 diff 重新核验仍成立；三个 delta 与 main spec 逐块语义等价；无 change 内 open finding。Done condition：review 已执行、无未闭合 finding、spec sync 已完成。
