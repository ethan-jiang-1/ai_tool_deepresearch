## 1. Engine: 目录↔版本绑定分类（ARP-005）

- [x] 1.1 @impl ARP-005: 在 `DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs` 中，把 `InventoryEntrySchema.classification` enum 增加 `auxiliary`，把 `FinalReportSeriesBlockerSchema.code` enum 增加 `orphan_auxiliary_directory`。Done when `node --check DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs` 通过且 schema 枚举含新值。
- [x] 1.2 @impl ARP-005: 实现辅助目录语法识别与绑定——`final_v<N>/` 绑 `final_v<N>.md`、`final_<feature>_v<N>/` 绑 `final_<feature>_v<N>.md`（复用现有 revision 正则去 `.md`）；`classifyEntry` 对匹配目录返回 `{ classification:'auxiliary', version, feature }`，否则保持 `supplementary`。Done when 目录名分类逻辑只读 `name`/`kind`、不读 mtime/顺序/内容。
- [x] 1.3 @impl ARP-005: 在 `resolveFinalReportSeries` 收集 `auxiliary` 目录，对每个辅助目录在 primary revisions 里精确查同名主报告（同 version 同 feature）；查不到则加 `orphan_auxiliary_directory` blocker（命名该目录），且辅助目录不进入 `primary_entries`/`latest`/`next_version`/primary witness。Done when orphan 目录返回 `valid:false` 且合法绑定返回 `valid:true`。
- [x] 1.4 @impl ARP-005: grep `artifact-persistence.mjs`、`enter-phase`、`post-final-recovery.mjs`、`recovery-contract.mjs`、`check-reentry.mjs` 确认无对 `classification` 的穷举匹配会因新增 `auxiliary` 破裂（primary 判定只应看 `revision|modern_base|legacy_base`）。Done when 无消费方需要改动，或有改动且被记录。
- [x] 1.5 @impl ARP-005: 扩展 `tests/engine/helpers/final-report-series.test.mjs`，新增用例：unlabelled 绑定、labelled 绑定、孤儿辅助目录（含无精确同名主报告）、版本脱钩目录保持 supplementary、辅助目录不进 primary allocation。Done when 新增用例全部通过。

## 2. Final phase 纪律（CDP-008）

- [x] 2.1 @impl CDP-008: 更新 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md` §3/§4：版本 N = `final/final_v<N>.md` + `final/final_v<N>/`（或带 feature 同构）；辅助档案只进自身目录；主报告正文交叉引用只进自身目录且不是 Evidence Map backing；历史只读；`final/README.md` 作为系列索引/命名权威，经非 primary `persist-final-report` 维护并带 Evidence Map。Done when frontmatter（`gate:null`/`stop:yes`/无 `next`）不变且新增纪律只落在 body。
- [x] 2.2 @impl CDP-008: 扩展 `tests/integration/md/final-report-composition-contract.test.mjs`，断言 `phase-final.md` 含「同名辅助目录」「自包含/不引用他版目录」「历史只读」「README 经非 primary persist 且带 Evidence Map」的措辞。Done when `node --test` 通过且断言不依赖报告质量/用户满意度。

## 3. Verification

- [x] 3.1 @impl ARP-005, CDP-008: 运行 `node --test tests/engine/helpers/final-report-series.test.mjs tests/integration/md/final-report-composition-contract.test.mjs`。Done when 全部通过，覆盖 1.5 的 binding/labelled/orphan/decoupled/non-primary-allocation 用例与 2.2 的 phase-final md parity。
- [x] 3.2 @impl ARP-005, CDP-008: 运行 `node openspec/governance/check-verification-routing.mjs --change final-auxiliary-directory-contract --mode assets`。Done when 通过且 selected assets 存在。

## 4. 收尾检查（归档前硬性 done condition）

- [x] 4.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change final-auxiliary-directory-contract`。Done when PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，且 ARP-005 / CDP-008 已注册为 live identity 并出现在对应 main spec 的 `> req:` header）。
- [x] 4.2 运行 `node openspec/governance/check-project-specs.mjs`。Done when PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

## 5. 反馈生命周期 reviews

- [x] openspec-feedback:plan-review: 在首次 target edit 前完成 plan/whole-change coherence + risk review（polish Pass 1/2：proposal↔specs↔design↔tasks 一致、FDB 非全文扫描器边界、既有 fixture/consumer 兼容、孤儿规则收紧范围）。Done when review 完成且无未决 finding。
- [x] openspec-feedback:closeout-review: 归档前完成 closeout review：change-scoped diff（Engine 分类 + phase-final 纪律 + 测试 + main spec/req-registry 同步）逐面核对 semantic-closure 的 fact/resolver/established_by/consumers/overlap/verification；`#finalFacts` 与 `#buildRecoverySummary` fragment 均为实际符号；无 open finding，全部 ordinary 修复已完成。
