## Context

The project already has three environment-level verification methods in `openspec/config.yaml` and the root README:

1. `tests/` regression for deterministic code and CLI behavior.
2. `experiments_playbook/` controlled E2E over a real disposable bundle and trace verdict.
3. Real-environment E2E over an explicitly selected production bundle, currently deferred.

`_backlog/plans/tests-e2e-layer.md` discovers a useful missing proof shape, but expresses it as a fourth top-level `tests_e2e/` layer. That mixes two axes: a test's claim subject (Engine versus Agent) and its execution method. It also conflicts with the repository rule that all regression tests live under `tests/`.

The design must make future changes choose evidence deliberately without turning OpenSpec governance into a test runner or allowing a planning document to manufacture a PASS. It also needs to establish the missing rerun controlled-E2E asset without treating the checked-but-absent task in `seed-backfill-round-continuity` as evidence.

## Goals / Non-Goals

**Goals:**

- Establish three stable verification methods and make their asset, claim, and verdict boundaries executable as governance rules.
- Make every new change declare why each method is selected, deferred, or not applicable before apply.
- Give deterministic cross-phase CLI behavior a home inside `tests/`, while giving real Agent-flow claims a trace-backed controlled-E2E path.
- Make the initial rerun continuity route concrete enough to expose missing proof assets and prevent fixture-backed overclaims.
- Preserve the native authority of Node assertions, trace JSONL, and selected runtime bundle facts.

**Non-Goals:**

- Do not create `tests_e2e/`, a fourth project-level test method, a universal test runner, or a `test:all` command that pretends Agent playbooks are Node tests.
- Do not change `DPT_FRAMEWORK/` runtime behavior, schemas, CLI contracts, bundle data, test dependencies, or framework version.
- Do not retroactively force every archived or already-active change to gain a plan; the new requirement applies to changes created after this change is accepted.
- Do not execute a production bundle, invent a real-environment result, or use a user request as a production mutation permission.

## Decisions

### Decision 1: Model proof subject and verification method separately

Every plan records a proof claim and one verification method. The allowed mapping is intentionally small:

| Claim class | Primary method | Permitted exception | Forbidden overclaim |
| --- | --- | --- | --- |
| `deterministic_contract` | `regression` | `controlled_e2e` only when a real disposable-bundle boundary itself is under test; mark fixture distance | Agent or live-production behavior |
| `agent_flow` | `controlled_e2e` | none | fixture/scripted filesystem state as Agent proof |
| `production_behavior` | `real_environment_e2e` | none | disposable-bundle or static proof as production evidence |

This preserves the useful distinction in the backlog while avoiding the false implication that Engine E2E requires a new project-wide layer. A cross-phase CLI scenario remains a regression integration test because its subject is deterministic and its native evidence is a Node test result.

### Decision 2: Add a small change-owned `verification-plan.yaml`

Each new change will own a plan at `openspec/changes/<name>/verification-plan.yaml`. Its intended schema is:

```yaml
schema_version: verification-routing/v1
change: <kebab-case-change-name>
methods:
  regression:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
  controlled_e2e:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
  real_environment_e2e:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
    observation_trigger: <required for deferred or selected production claims>
claims:
  - id: <stable-kebab-case-id>
    class: deterministic_contract | agent_flow | production_behavior
    method: regression | controlled_e2e | real_environment_e2e
    asset:
      kind: regression_test | controlled_playbook | production_runtime
      path: <repository-relative test/playbook path when applicable>
      runtime_selector: <non-secret description for real environment when applicable>
    production_distance:
      fixture: none | fixture_backed
      agent_actor: none | real_agent | real_subagent
      external_calls: none | real | not_applicable
    verdict_authority: node_test_exit | trace_jsonl | runtime_bundle_facts
```

The plan describes planned evidence, not outcomes. It contains no `passed`, `result`, receipt, trace event, or mutable runtime field. During apply, an `implementation-evidence.md` records actual commands and observed outcomes only after they run; it remains a report, while native evidence stays authoritative.

### Decision 3: Use one read-only routing checker, split into plan and asset modes

`openspec/governance/check-verification-routing.mjs` will be a narrow Node ESM checker using only approved `yaml` and Node built-ins.

- `--mode plan` parses the plan, checks its three method decisions, claim uniqueness, claim/method compatibility, non-empty rationales, and native verdict declarations. It runs before apply.
- `--mode assets` performs the same checks after implementation and additionally validates declared repository paths: regression files are under `tests/` and end in `.test.mjs`; controlled cases are under `experiments_playbook/`, use the `case-*.md` form, and pass the existing `validate-playbook.mjs` contract; deferred production claims do not name a repository fixture as live evidence.

The checker does not run tests or playbooks. It delegates playbook frontmatter validation to the existing canonical playbook validator rather than reimplementing that schema. It never writes a trace, bundle, receipt, result, or verdict. This keeps one direct route selector separate from the three actual verdict paths.

`openspec/config.yaml` will require the plan and both checker modes at the appropriate lifecycle points. Change tasks will name the same commands explicitly. The checker accepts `--change <name>` rather than scanning all history, so accepted archival records and pre-existing active changes are not retroactively reclassified.

### Decision 4: Route the rerun continuity proof by claim

The first plan uses three claims:

| Claim | Route | Asset | Evidence boundary |
| --- | --- | --- | --- |
| direction resolver and current-round CLI behavior | `regression` | focused helper test plus `tests/integration/cli/rerun-round-continuity.test.mjs` | actual CLI JSON/exit over an isolated temporary bundle |
| Phase Agent writes current direction and resumes the direction/profile interruption | `controlled_e2e` | `experiments_playbook/exp_wfn_rerun/case-305-heavy-rerun-direction-recovery.md` | real Agent execution over a fresh `dpt_disp_*`, verdict from `rb_trace.jsonl` |
| behavior under a selected production run and host conditions | `real_environment_e2e` | no committed fixture; explicit future runtime selector | direct production bundle facts, currently deferred |

The regression test will retain focused unit coverage where the helper itself is the contract. Its integration part will use `spawnSync` against the work-unit inspect CLI and relevant inspect/gate CLI, asserting their structured output rather than reproducing `eligible_rows` filtering in test code. It will create and clean temporary bundles beneath `os.tmpdir()`.

The controlled case will use the established command-experiment form: valid frontmatter, `new-disposable-bundle.mjs`, an explicit real-Agent dependency, actual phase instructions, trace checks, a trace verdict, and runner-manifest registration. It may construct a controlled interruption state only through real legal steps; an inline driver cannot write the Agent's direction and claim that Agent behavior was proven.

### Decision 5: Keep deferred real-environment E2E as a decision, not a blocker

For this change, `real_environment_e2e` is `deferred`. The plan names the trigger: a user-approved production bundle and a claim that depends on live host/Agent/external conditions. The user chooses that scope because it can consume real resources and touch a production run; once chosen, the Agent performs the legal observation and reports runtime facts. No new HITL mode, permission flag, runtime mutation route, or background watcher is introduced.

### Decision 6: One canonical taxonomy definition; knowledge surfaces become pointers (VER-005)

三方法 taxonomy 的 canonical 定义唯一存在于 `verification-routing` main spec。现有四处平行复述在 apply 时按下表收敛——每个面只保留它**拥有**的事实（目录归属、硬规则），routing/plan/validator 语义不复述：

| 现有表述 | 位置 | apply 后 |
| --- | --- | --- |
| 「第一层/第二层/第三层」全文复述 | `openspec/config.yaml` 测试分层节 | 三个 canonical method identifier + 各自资产归属边界 + 一句指向 `openspec/specs/verification-routing/` 的引用；删除层内 what/how 完整复述 |
| "Test layering: tests/ = regression …" | `AGENTS.md`、`CLAUDE.md` Hard Rules | 保留一行资产归属硬规则（它们拥有的边界事实），方法名改 canonical identifier，追加 pointer |
| 目录职责表 tests/experiments 行 | `guidelines/project-charter.md` | 行内容不变（只陈述目录归属），方法称谓统一为 canonical identifier |
| "Layer 1-4" | `_backlog/plans/tests-e2e-layer.md` | 不改写正文——归档时在文件头加一行 status 标注指向本 change（backlog 是历史输入，不是 current surface） |

序数命名（第一/二/三层、Layer N）退役，不再作为方法标识符。这是 projection discipline 的应用：一处 authority，多处短引用，消除四处 prose 各自漂移成 competing truth 的可能。若不更新这些知识面，路由机制只活在 governance 而未来 Agent 读到的仍是旧 prose——知识面传播是本 change 的一等目标。

### Decision 7: Backlog asset absorption — per-scenario routing and explicit rejections

`_backlog/plans/tests-e2e-layer.md` 的场景与约定有真实价值，逐条落点如下（全部 `deterministic_contract` class 除注明外）：

| Backlog 场景 | 落点 | 现状 |
| --- | --- | --- |
| 场景 2/5（round-2 supplement、eligible-rows 过滤 + legacy exclusion） | `tests/integration/cli/rerun-round-continuity.test.mjs` 重构为真实 CLI consumer：断言 `operate-work-unit inspect --eligible-rows` 结构化输出与 warnings，删除测试内自行实现的过滤 | 已有文件但手写状态+自行过滤，不合格 |
| 场景 3/4（stale direction、crash recovery 的 resolver 判定） | 已由 direction resolver focused unit tests 覆盖（8/8）；plan 中登记为既有 asset，不重写 | 合格 |
| 场景 6（per-row authority check：blocking finding + 修复后同检通过） | 扩充同一 integration test：负例（work_id 缺失 → blocking）+ 补 disposition 后 rerun same inspect 通过 | 缺负例 |
| 场景 1（正常 run 三 gate 连续通过） | **不收编**——`check-gate-wave{0,1,2}-complete.test.mjs` 已各自覆盖 pass/fail；串联版是重复覆盖，违反 One Truth Path | — |
| §4.4 强制约定（tmpdir、after 清理、spawnSync、不 import 内部函数、自包含） | 核对 `tests/integration/README.md` 既有约定，缺则补——属 regression method 的资产纪律，不进 verification-routing spec | 部分已有 |
| §5 playbook 重定位（playbook 只测 Agent 行为） | 由 claim-class 矩阵自然成立（`agent_flow` → `controlled_e2e`），无需独立条款 | — |

**明确拒绝**（记录以防回潮）：顶层 `tests_e2e/` 目录；`package.json` 的 `test:e2e`/`test:all` scripts；`tests_e2e/helpers/bundle-fixture.mjs` 独立共享 helper 层（`tests/integration/` 已有 fixture 惯例，新开一套违反 One Rule Source）。

## Complexity Burden Of Proof（六问短答）

对两个新增物——plan 文件与 routing checker：

1. **捕获哪个现有 check 无法捕获的真实故障？** 已发生实例：task 10.7 勾选但引用的 playbook 不存在（幽灵资产）；round-continuity test 手写状态自行过滤冒充 CLI 证明（fixture 冒充）。现有两个 governance check 只看 requirement ID 与 spec 结构，不看证明资产。
2. **读取/拥有哪个 Source of Record？** 拥有 `verification-plan.yaml`（路由决定——作者意图，无法从代码反推；change-owned，随归档失效）。只读 plan、`tests/` 与 `experiments_playbook/` 存在性、runner manifest 行。不触碰任何 runtime authority。
3. **为什么不能复用现有 checkpoint？** `check-project-reqs.mjs` 的 authority 是 ID 三态，`check-project-specs.mjs` 是 main spec 结构；路由是第三种 authority（claim→method→asset）。塞进现有脚本会让一个脚本持有两种不相关 truth。三脚本并列、同一调用形状、同一 archive gate——复用既有模式而非新模式。
4. **删除、合并或降级了哪份旧逻辑？** 删除：四处 taxonomy 复述→一处 canonical + pointers（Decision 6）；测试内自行实现的 eligible-rows 过滤；「记得核对 task 引用的资产存在」这条隐性记忆规则。避免：第四层套件、第二 runner、混跑 scripts。
5. **失败时给 Agent 的唯一最近动作？** 每条 FAIL 按 contract-lineage 三要素输出：claim id + missing_fact（违反哪条矩阵规则）+ write_to（plan 的哪个字段/哪个资产路径）+ rerun（同一 checker 同一 mode）。一根因一动作，same-check repair。
6. **哪个 focused test 证明控制本身不误阻塞？** `tests/governance/check-verification-routing.test.mjs`：合法 plan PASS（不误阻塞）；矩阵外组合 FAIL 且报对 claim id；deferred 缺 trigger FAIL；assets mode 对存在/缺失资产双向断言；运行前后无写入副作用（read-only 验证）。

## Simple Reliable Control Review

- **Direct Source of Record / shortest loop:** `verification-plan.yaml` is direct route-selection authority; the selected native test mechanism supplies the only outcome authority. The loop is plan -> static route check -> one selected execution path -> native verdict.
- **Net simplification:** this rejects the proposed top-level `tests_e2e/`, eliminates the need for `test:e2e`/`test:all` parallel semantics, prevents the same claim from being described as both fixture proof and Agent proof, and collapses four parallel taxonomy restatements into one canonical definition plus pointers (Decision 6). It adds one static checker only because no existing checker owns a cross-method route contract.
- **Failure action:** a failed routing check names the claim and the nearest legal method/asset boundary. A failed test remains handled by its existing CLI, test, or trace feedback path.

## Helper-Oriented Responsibility Review

- **User decision:** only the selection of a production `dpt_rb_*` observation and acceptance of its external cost/risk.
- **Agent execution:** create the plan, run route checks, execute regression commands and controlled playbooks, repair ordinary asset mistakes, and return to the same checkpoint.
- **Engine verdict:** preserve existing CLI/test/trace results. The governance checker judges plan structure only and creates no runtime authority.

## Risks / Trade-offs

- **A plan validator becomes a second runner** -> Limit it to static shape and asset-boundary checks; it does not execute or aggregate evidence.
- **The three-method table forces costly E2E for every small change** -> `not_applicable` and `deferred` require rationale but do not force execution.
- **Fixture evidence is accidentally promoted to Agent proof** -> Require claim class, production-distance fields, and a real Agent actor for `agent_flow`.
- **A production result is implied by a deferred row** -> Ban PASS/FAIL fields in the plan and require an explicit observation trigger.
- **Existing task checkmarks continue to look like proof** -> The rerun controlled case is accepted only when the runnable asset, runner entry, trace execution, and implementation evidence all exist; the old checkbox is not a verdict source.
- **Current runner documentation has drift (`RUN.md` versus `RUN_EXPS.md`)** -> Update the active runner surface identified by the accepted runner contract without expanding this change into a runner redesign.

## Migration Plan

1. Add `verification-routing` requirements, reserve `VER-*` IDs during apply, and create this change's own verification plan.
2. Implement the read-only governance checker and focused tests; update OpenSpec rules so future changes invoke it before apply and before archive.
3. Converge knowledge surfaces per Decision 6: `openspec/config.yaml` 测试分层节, `AGENTS.md`/`CLAUDE.md` test-layering rules, `guidelines/project-charter.md` directory rows — canonical identifiers plus pointers, no restatement.
4. Upgrade the rerun regression scenario to consume production CLIs (Decision 7 absorption table) and add the real-Agent controlled-E2E case plus active runner registration.
5. Record real command and trace evidence in `implementation-evidence.md`; preserve the real-environment row as deferred unless a user selects a production run.
6. Run routing, regression, controlled-E2E, and existing governance checks before archive; annotate the backlog plan header only after its replacement assets are genuinely proven.

Rollback is local and configuration-only: removing the new governance route check and its plan files does not change framework code or any run bundle. No runtime state migration is required.

## Open Questions

None. The production method is intentionally deferred rather than left ambiguous; an actual bundle selection is a later user decision, not missing design work.
