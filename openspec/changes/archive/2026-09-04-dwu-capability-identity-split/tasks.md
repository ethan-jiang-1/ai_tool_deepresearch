# Tasks: dwu-capability-identity-split

## 1. 测绘交付（已完成，r1a-mapping.md）

- [x] 1.1 39 块新家判定 + ID 分配表（16 母体 / 8 WSU / 6 WUP / 9 WUC，DEW-032/033 补注册；r1a-mapping.md）
- [x] 1.2 引用网清单（65 处/12 文件，T1.3 实测）与 `@impl` 清单（21 个 DEW ID，DEEP_RESEARCH_HARNESS 全扫）
- [x] 1.3 doc-lock 清单（delegated-queue-spec-text-locks / dwu-slim-structure-locks / residual-spec-drift-text-locks 现状定位）

## 2. Apply：4 spec 落地 + registry + catalog

- [x] 2.1 母体瘦身：主 spec 删除 23 个迁移块；16 保留块 2 个补内联 `> req: DEW-032/033`；头行 ID 枚举改 16 个；验证 = 迁移守恒脚本 PASS（tests/integration/migration/dwu-identity-migration.test.mjs 绿）
- [x] 2.2 三新 canonical spec：`work-unit-submission`（8 块）`/work-unit-preflight`（6 块）`/work-unit-correction`（9 块）从 delta 落地，各自 `## Purpose` + 完整 requirements；验证 = 每 spec 块数/内联 1:1 断言绿
- [x] 2.3 registry：prefixes +3（WSU/WUP/WUC → 新路径）；新 ID 注册 WSU-001..008 / WUP-001..006 / WUC-001..009 / DEW-032/033；17 旧 DEW 行标 `[DEPRECATED]` + 后继指针（migrated to <新ID> (<新path>)）；验证 = `check-project-reqs --mode archive --change dwu-capability-identity-split` PASS
- [x] 2.4 catalog：README.md DWU 行 Purpose 改写为 assignment & briefing + 3 新行 + 四能力 Related 交叉链接 + 引用 DWU 的邻居行（9 行）逐条重织；验证 = catalog 语义引用断言（no-half-migration claim）绿
- [x] 2.5 RUN.md 委派表等入口文档路径引用改写（引用网清单内）；验证 = grep 旧路径引用只剩 capability map 导航指针

## 3. Apply：engine `@impl` 对齐 + doc-lock

- [x] 3.1 `@impl` 换新 ID：engine/schema 注释中 17 个迁移 ID 的标签逐文件按 r1a-mapping old→new 表**仅替换迁移 ID**（同文件内的保留 DEW ID 与非 DEW ID 如 SNC/WAI/AGQ 原样保留），模块零移动；验证 = `check-code-impl-ids` 全绿（旧 ID 仍注册期不断）
- [x] 3.2 doc-lock 重写：delegated-queue-spec-text-locks 按四新家重写计数（母体 16/16 + 各新家实数），timeout-note 测试改读对应新家文件；dwu-slim-structure-locks 标题断言（15 标题在 MAIN，@impl DEW-004/013/023）失效 → 退休并留后继指针注释；**residual-spec-drift-text-locks 的 DEW-012 测试改读新家（work-unit-submission）或随退休锁重定向**；验证 = 三文件更新版测试绿
- [x] 3.3 `list-doc-locks` 全量核对无遗漏 lock；验证 = 无失配 lock

## 4. Apply：R1c 迁移后指针化（G2 已拍板并入）

- [x] 4.1 用 C1 扫描器对母体瘦身 + 三新 spec 出候选表，按 §2.1 三条件人审定稿（REVIEW 已过判据）；验证 = calibration 记录随 change
- [x] 4.2 指针化落笔（仅审定的复述段 → owner 指针）；验证 = 各批 before/after 度量 + 守恒断言

## 5. 集成验证与收尾

- [x] 5.1 迁移守恒 + no-half-migration 断言测试全绿；全量 `npm test` + `governance:check` 全绿；before/after 度量（母体 2448 → ~N 行、四文件总行数）随提交
- [x] 5.2 openspec-feedback:plan-review — 首次 target edit 前 plan review（D1–D6 + r1a-mapping 与 delta 一致性）
- [x] 5.3 openspec-feedback:closeout-review — 归档前 closeout review（四文件边界、registry、catalog、@impl 完整性）
- [x] 5.4 归档收尾检查：`node openspec/governance/check-project-reqs.mjs --mode archive --change dwu-capability-identity-split` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，reservation→live 全转）
- [x] 5.5 归档收尾检查：`node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
