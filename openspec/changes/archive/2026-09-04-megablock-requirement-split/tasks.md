# Tasks: megablock-requirement-split

## 1. 分组(4 路并行人审,装配器 dry-run 兜底)——已完成于 /tmp/c3{a,b,c,d}-*/grouping.yaml

- [x] 1.1 post-final-recovery(×6,深挖×4 因粒度拆两档)/ CDP(×3,含场景-only lead)/ CPT(×3)分组绿
- [x] 1.2 RWP(I1-I3)/ semantic-fact-closure(E1-E3)/ workflow-directory-contract(G1-G2)分组绿
- [x] 1.3 seed-topic-materialization(H1-H2)/ runtime-reentry-debuggability(D1-D2)/ artifact-persistence-recovery(A1-A2)分组绿
- [x] 1.4 hitl-ux(H1-H2, HITL2-CONFIRM 保留)/ rerun(K1-K2, 冻结分组活体复验绿)分组绿

## 2. Delta 生成 + 主 spec 落地(逐块)

- [x] 2.1 11 个 spec delta(REMOVED 原块 + ADDED 子块全文)生成于 change specs/ 树;验证 = openspec validate --strict
- [x] 2.2 逐块 apply:装配器 `--out` 替换主 spec 对应块;验证 = 逐块守恒(装配器内建)+ megablock-split.test.mjs 断言绿
- [x] 2.3 header/registry 零触碰验证(D3:纯文本重构;megablock-split.test.mjs header/registry-untouched 断言绿)
- [x] 2.4 RWP 复述甄别定案:零指针化(scratch/rwp-restatement-triage.md,normative 判据同 R1c)

## 3. 集成验证与收尾

- [x] 3.1 megablock-split.test.mjs 绿(守恒+尺寸+场景 1:1+header/registry 不动)(守恒+尺寸+场景零丢失+header/registry 同步)
- [x] 3.2 全量 `npm test` + `governance:check` 全绿;before/after 度量(11 块 max 358 → 全库无块 >190)
- [x] 3.5 归档收尾:check-project-reqs --mode archive PASS + check-project-specs PASS

## 4. Feedback lifecycle reviews

- [x] 4.1 openspec-feedback:plan-review — 分组/标题与深挖表一致性复审(11 块分组全部装配器 dry-run 绿;post-final 因 >160 由 ×4 扩 ×6 并在 C3 记录;HITL2-CONFIRM 按 REVIEW 保留两段;lead 机制为场景-only unit 的必需扩展并加 C1 工具测试)
- [x] 4.2 openspec-feedback:closeout-review — 11 spec 拆分完整性 + header/registry 零触碰复审(openspec validate --strict 绿 + megablock-split.test.mjs 3 claims 绿 + governance 19/19)
