# Plan: test-signal-and-guidance-wording-hygiene

> 状态: active | 创建: 2026-08-31
>
> 需求来源: 2026-08-31 coding-agent 全仓可读性评估会话（用户确认的摩擦点分级）。C1 对应摩擦点 #6（测试信号负载敏感）+ #5b（测试产物噪音）；C2 对应 #5a（Do-Not-Read 措辞张力）+ #4 的便宜变体（doc-locks preflight 工具化）。盘点结论（用户确认）：**只做两个 change，不合一个大 change，也不拆成五个**。

## 目标

把评估会话确认的两类低成本高价值摩擦修理掉，每个 C 项交付一个独立 OpenSpec change，走完 propose → polish → apply → archive 完整生命周期。

## 非目标（防 scope creep）

- **不做** #3 engine 大文件提取：它是独立长期轨（每次提取一个 change，验证性质是全量 `npm test` 等价性），不进本 plan，不与 C1/C2 混装。
- **不做** #4 的 governance checker 版（RET-012 型，照 `2026-08-31-add-code-impl-registry-guard` 模子）：C2 只落 config guidance 行；若将来认为需要确定性守卫，另建 change。
- **不做** 术语重命名、`enter-phase`/`advance-status` 顺序重设计、spec 深度削减：评估已判定为不可安全修/不该修。
- 不改任何 accepted behavior、不触碰任何 main spec 的既有 requirement。

---

## C1: test-lane signal hygiene（OpenSpec change 1）

主题：让全量测试信号在受限/满载环境下可信且便宜。全部落 `tests/` + `package.json`，无 accepted behavior 变更。

### 1.1 `tests/README.md` 增加 triage 操作规则

满载并行下 subprocess 密集套件可能超时级联；失败文件必须孤立复跑定性。判定规则：孤立通过 = 资源竞争伪影，不据此判回归、不据此"修"不坏的东西；孤立仍红 = 真回归信号。

实测依据（2026-08-31）：全量套件首跑（受压）2880 tests / 16 fail / 4 cancelled / ~2h04m；复跑（干净）2879 pass / 1 fail / ~155s（与 README 既有 ~139s 基线吻合）；唯一失败 `tests/integration/governance/check-all.test.mjs` 的 "check-all aggregation entry (RET-007)"，孤立重跑 3/3 pass。

### 1.2 `tests/integration/governance/check-all.test.mjs` deflake

方向：提高耗时容忍或减少重复 subprocess 工作（check-all 聚合会启动全部 ~15 个 checker）。**硬边界：该文件锁定的 RET-007 行为断言不得弱化或删除**——只动耗时容忍与进程开销，不动锁了什么。具体方案在 propose/explore 期实测后定，不预设数值。

### 1.3 `package.json` 增加 `test:clean` script

清理 `tests/.test-tmp/`、`tests/.test-bundles/` 等 `.test*` 一次性产物（口径与 `.gitignore` 的 `tests/**/.test*` 一致），不动 `tests/fixtures/`。`tests/README.md` 同步一行说明。

### C1 预判

- Capability Discovery：预期全部 Excluded / Verify-only（无 capability behavior 变更；`verification/integration-tests` 是否需要 delta 在 propose 期核实）。
- semantic-closure：大概率 `not_applicable`（无 cataloged deterministic fact family 触碰）。
- 验证：C1 落地后满载复跑全绿 + `test:clean` 行为用例（如加）+ 孤立/满载双跑定性演示。

---

## C2: agent-facing guidance wording（OpenSpec change 2）

主题：对齐 agent-facing 指令面措辞。共同点：均为 guidance 措辞、均碰 doc-locked 文件、均无行为契约变更。

### 2.1 Do-Not-Read 措辞对齐（root `AGENTS.md` + `README.md`）

现状张力：两文件写 "`.exp-bundles/`, including lowercase `dpt_rb_*/` run-bundle directories"，而 `DEEP_RESEARCH_HARNESS/README.md`「Run Bundle 外形」说 production run bundle 位于 repo root（repo 根确实有 4 个 `dpt_rb_*`，已 gitignore）。

- **已拍板语义（2026-08-31 用户确认）**：任意位置的小写 `dpt_rb_*/` / `dpt_disp_*/` run-bundle 目录都不得作为 task context 读取；"用户显式指名具体路径"的既有豁免条款保持不变（与 entry selection 的 "explicitly supplied" 语义一致）。
- `CLAUDE.md` 是 `AGENTS.md` 的 symlink，锁测试要求两文件硬规则行一致——改 AGENTS.md 一处即同步，须确认。

已核事实：grep `openspec/specs/` 无任何 requirement 锁 Do-Not-Read 措辞（提到 `dpt_rb_` 的 spec 全是 bundle 行为面：`bundle/cmd-bundle-instantiation`、`bundle/bundle-data-isolation`）；预期 delta-free，走 Verify-only。`list-doc-locks` 实测是 propose 第一步（这个动作本身即 2.2 要固化的）。

### 2.2 `openspec/config.yaml` `operations.apply.guidance` 增加 doc-locks preflight 行

加一条 guidance：change 若 reword governed document，首次 target edit 前运行 `node scripts/list-doc-locks.mjs <repo-relative-doc-path>`，受影响锁在同一 change 内更新。依据：`tests/README.md` 已有此纪律的文字版，本项把它升格为 apply-phase 指令。注意 `config.yaml` 在 `verification-routing-knowledge-surfaces` 测试清单内（其断言是"引用 verification-routing"，本项不碰该行）。

### C2 预判

- Capability Discovery：预期 Excluded / Verify-only（无 spec owner 的 guidance 措辞 + lifecycle 指令）。
- 锁更新工作量：预期接近零（既有锁断言不落在 Do-Not-Read 段），以 propose 期 `list-doc-locks` 实测为准。
- 验证：entry-doc 契约测试（`tests/integration/deep-research-harness-entry-contract.test.mjs` 等）全绿 + 知识面测试全绿。

---

## 统一执行协议（用户指定，每个 change 一律照走，不得跳步）

1. `/opsx:propose` —— 在 `openspec/changes/<name>/` 产出全部 planning artifacts。
2. propose 完成后**立刻** `/polish-openspec-change` —— ≥2 passes（Pass 1 whole-change coherence + risk-led pass），直到 `openspec validate "<name>" --strict` 与 `git diff --check` 全过、`ready for apply`。
3. `/opsx:apply` —— 按 approved tasks 实施；首次 target edit 前照 `config.yaml operations.apply.guidance` 跑三条 plan-mode 检查（check-project-reqs / check-verification-routing / check-semantic-closure）。
4. 收尾两条硬性 task（`check-project-reqs.mjs --mode archive` PASS、`check-project-specs.mjs` PASS）→ `/opsx:archive` → `node openspec/governance/finalize-change-archive.mjs --change <name>` 作为唯一归档终态。
5. 全量 `npm test`（满载 flake 按 C1.1 triage 规则定性）+ `npm run governance:check` PASS。

两个 change 无 capability 交集，可并行 propose；执行顺序默认 C1 → C2（C1 日常价值最高、风险最低）。

## 前置条件 / 风险

- 工作树含未提交的已归档 change `2026-08-31-add-code-impl-registry-guard`（含 `req-registry.yaml`、`requirement-traceability/spec.md`、两个新测试等）。**建议在本 plan 首个 change apply 前先 commit**，避免 closeout review 的 change-scoped diff 混入无关面。
- 全量测试在受压环境下有超时级联前科（16 fail/4 cancelled 一例）；验收判定一律按 C1.1 的孤立复跑规则定性。

## 完成判定

两个 change 均 archive（finalizer 全绿）+ 全量 `npm test` / `governance:check` 绿，然后按 `_backlog/plans/README.md`「完成一个 plan 的步骤」移入 `_done/_closed_plans/` 并同步三处 README。
