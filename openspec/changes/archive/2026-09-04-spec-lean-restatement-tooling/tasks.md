# Tasks: spec-lean-restatement-tooling

## 1. 复述候选扫描器（scan-restatement-candidates.mjs）

- [x] 1.1 实现共享单元解析模块 `openspec/governance/spec-unit-parse.mjs`（requirement 块切分、散文段/场景单元解析——扫描器与装配工具唯一共用实现），并在 `openspec/governance/scan-restatement-candidates.mjs` 内实现锚点词表常量、Zod candidate/anchors schema；单测 `tests/governance/scan-restatement-candidates.test.mjs` 覆盖段落切分与命中提取（fixture spec 片段），done = 测试绿
- [x] 1.2 实现 CLI 包装（`--spec` 必选 / `--anchors` 可选 / `--format table|json` / exit 0 扫描完成、2 调用错误），输出候选表按类别分组并标注 "candidates ≠ verdicts"；done = `node openspec/governance/scan-restatement-candidates.mjs --spec openspec/specs/agent/delegated-work-units/spec.md` 输出合法表且 exit 0
- [x] 1.3 校准：对 DWU spec 活体运行，命中集合与主 plan §1.5 实测锚点（36 处）交叉比对，比对结论写入 `openspec/changes/spec-lean-restatement-tooling/calibration-dwu.md`（随 change 归档），锚点词表按结果定稿；done = calibration-dwu.md 落盘且重跑一致
- [x] 1.4 负向测试：不可读文件 exit 2 + 根因输出；done = 测试绿

## 2. 通用装配工具（assemble-spec-delta.mjs）

- [x] 2.1 定义分组 YAML 的 Zod schema + `.refine()` 跨字段校验（`spec` 与 `--spec` 一致、`block_title` 唯一命中、units 覆盖完备无重叠、场景相对顺序保持）；单测覆盖 schema 接受/拒绝两路；done = 测试绿
- [x] 2.2 实现三重断言纯函数：declared==actual（段/场景重算比对，报首个 mismatch）、覆盖完备、多重集合守恒（唯一净增 = unit 标题行；失败报首个 缺行/多行/被改行 根因）；单测含每类失败的最小根因断言；done = 测试绿
- [x] 2.3 实现变换与 CLI（dry-run 缺省、`--out` 显式写出、exit 0/1/2 对齐 design D3）；done = 对 fixture spec 的 dry-run 与写出双路测试绿，写出文件再读回重跑守恒断言通过
- [x] 2.4 负向测试：守恒失败 exit 1 + 首根因、YAML schema 拒绝 exit 2、块不唯一 exit 2；done = 测试绿

## 3. 集成验证与收尾

- [x] 3.1 实战预演固化为 `tests/integration/spec-lean-tooling-rehearsal.test.mjs`（基于冻结 fixture，见 design D5）：①把 DWU 扫描样本与 rerun-incremental-node 目标块快照进 `tests/fixtures/`（记录来源 commit）；②装配工具以深挖 §11 K1/K2 分组 fixture 对快照 dry-run，declared==actual + 守恒全过、无写出；done = 测试绿并纳入全量 npm test
- [x] 3.2 全量 `npm test` + `governance:check` 全绿；done = 两命令 0 fail
- [x] 3.3 归档收尾检查：`node openspec/governance/check-project-reqs.mjs --mode archive --change spec-lean-restatement-tooling` PASS（本 change 无 ID/reservation 变更，0 duplicate / 0 orphan）；done = PASS
- [x] 3.4 归档收尾检查：`node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）；done = PASS

## 4. Feedback lifecycle reviews

- [x] 4.1 openspec-feedback:plan-review — 对 proposal/design/tasks 与已实现面做计划复审：D5 共享解析器（spec-unit-parse.mjs 唯一实现）与冻结 fixture 策略均已按设计落地；跳过项仅 specs（skip_specs: true，理由已在 proposal 声明）；复审中发现的一致性问题（Capability Discovery 表头精确格式、candidate path 形态、Decision 值不加粗）已当场修复并重跑 governance 全绿；无遗留 actionable finding
- [x] 4.2 openspec-feedback:closeout-review — 归档前语义收尾复审：①三套测试（scanner 6 / assembler 9 / rehearsal 4）全绿且 evidence 与 verification-plan 三条 claim 一一对应；②calibration-dwu.md 记录 13/13 散文域基线覆盖、23 处场景命中按 §2.2 刻意排除；③无 registry/ID/reservation 变更（check-project-reqs --mode archive PASS 佐证）；④主 specs 零触碰（check-project-specs PASS 佐证）；无未关闭 finding
