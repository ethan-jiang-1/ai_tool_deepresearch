## 0. 首次 target edit 前置检查

- [x] 0.1 doc-locks 盘点：对 5 个受影响文件逐一运行 `node scripts/list-doc-locks.mjs <repo-relative-path>`；盘点结果中受影响的断言在同一 change 内更新（当前规划期盘点：5 个文件的 tests 引用均为存在性/包含性断言，段落增补不受影响，无需更新既有断言）。验证：盘点输出已核对并记录结论。
- [x] 0.2 plan-mode 治理检查：`node openspec/governance/check-project-reqs.mjs --mode plan`、`node openspec/governance/check-verification-routing.mjs --change run-bundle-archive-zone --mode plan`、`node openspec/governance/check-semantic-closure.mjs --change run-bundle-archive-zone --mode plan` 全部 exit 0。验证：三条命令 exit 0。
- [x] 0.3 openspec-feedback:plan-review — 首次 target edit 前的 scoped plan review（于 polish 阶段执行，先于全部 target edit）：whole-change coherence 三 pass（修复：tasks.md 补收尾检查与前置检查、.gitignore 防御行事实同步 proposal/design）；verification-plan claim 证明边界审查（integration/deterministic_contract/node_test_exit，与 md contract 测试资产一致）；semantic-closure `not_applicable` 理由对照计划改动面核验成立；doc-locks 五文件盘点完成（均为存在性/包含性断言，段落增补不受影响）。无 open finding。验证：polish 报告在案，plan-mode 三检查 exit 0。

## 1. 指导文本增补（按 design.md D4 落点）

- [x] 1.1 在 `DEEP_RESEARCH_HARNESS/README.md`「目录性质」增补 `dpt_archive/` 段：活区（repo 根）vs 归档区、归档 = 平移不改名、复活 = 移回根目录再用、归档 ≠ `dpt_disp_*` disposable。验证：段落存在且与 design.md D1–D3 表述一致，无新 requirement 语汇。
- [x] 1.2 在 `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` 目标目录处增补一句：新 bundle 一律创建在 repo 根活区，`dpt_archive/` 内 bundle 不参与 sibling preflight 视野。验证：增补句存在且未改动既有 preflight 描述。
- [x] 1.3 在 `DEEP_RESEARCH_HARNESS/command_playbook/start-research.md` 增补同一落点政策一句。验证：与 1.2 措辞一致。
- [x] 1.4 在 `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` Entry Selection (canonical) 附近增补复活路径说明：用户指名 `dpt_archive/` 内可达 bundle → 先平移回 repo 根，再按既有规则选择；不改动 canonical 判定与 `unsupported_current_entry_contract` stop 定义。验证：grep 确认既有 canonical 条款原文未被修改，新增仅为复活路径说明。
- [x] 1.5 在根 `AGENTS.md` Do-Not-Read 段落显式点名 `dpt_archive/` 内的 run-bundle 目录适用既有规则。验证：一行内点名，未扩权未缩权（"anywhere in the repository" 措辞保留）。

## 2. Markdown contract 测试资产

- [x] 2.1 新建 `tests/integration/md/run-bundle-archive-zone-contract.test.mjs`（node:test + node:assert，镜像 tests/integration/md/ 惯例）：按 verification-plan.yaml 的 claim 断言五个指导面的归档区表述存在且彼此一致，并断言 continue-run-bundle.md 的既有 canonical 条款原文未被改动（negative assertion：归档段不得重写 Entry Selection 判定、不得混用 dpt_disp_* 概念）。验证：`node --test tests/integration/md/run-bundle-archive-zone-contract.test.mjs` 通过。

## 3. 一致性与运行时状态核验

- [x] 3.1 全库残留检查：`grep -rn "dpt_rb_" DEEP_RESEARCH_HARNESS/ AGENTS.md CONTEXT.md` 逐一核对，确认没有任何指导文本仍假设"所有 bundle 都在 repo 根下"（Entry Selection 路径无关表述与归档段共存即可）。验证：无残留冲突表述。
- [x] 3.2 运行时状态核验：`ls -d dpt_rb_* dpt_archive` 确认根目录只剩 2 个活 bundle + `dpt_archive/`；`git check-ignore dpt_archive/dpt_rb_ai-coding-evolution/rb_status.json` 非空（归档区仍被 ignore）；`git status --porcelain` 仅含本 change 的指导文件编辑。验证：三条命令输出符合预期。
- [x] 3.3 readiness 核验：`openspec validate run-bundle-archive-zone --strict` 通过（skip_specs 生效、零 delta 合法）；`git diff --check` 干净。验证：两条命令 exit 0。
- [x] 3.4 归档阶段前置核验：`node openspec/governance/check-semantic-closure.mjs --change run-bundle-archive-zone --mode assets` 与 `node openspec/governance/check-verification-routing.mjs --change run-bundle-archive-zone --mode assets` 在 archive 前通过。验证：两条命令 exit 0。

## 4. 收尾检查（归档前硬性 done condition）

- [x] 4.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change run-bundle-archive-zone` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。验证：命令 exit 0。
- [x] 4.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。验证：命令 exit 0。

## 5. 归档前置 review

- [x] 5.1 openspec-feedback:closeout-review — 归档前的 change-scoped closeout review：① 边界可判定——`git status --porcelain` 仅含本 change 文件（`.gitignore` 一行防御增补已由 proposal Impact 收编为 change 范围，另有 contract 测试与 change 目录）；② 实际 diff 与 design.md D4 落点表逐面吻合（5 个指导文件纯增补，continue-run-bundle.md canonical 条款 +5/-0 零删改）；③ semantic-closure `not_applicable` 理由对照实际 diff 复核成立（实际改动面 = 指导文本 + md contract 测试 + `.gitignore` 一行，零 Engine/schema/gate/trace/projection 改动）；④ 本 change 无 delta spec（skip_specs），无需 delta/main sync；⑤ 验证证据：contract test 6/6 pass、关联 doc-lock tests 21/21 pass、plan/assets 治理检查全 exit 0。无 open finding。验证：本行勾选即 review 完成，finalizer 机械核验随后执行。
