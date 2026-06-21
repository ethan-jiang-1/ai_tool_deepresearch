## 实施顺序

```
Section 1 (Shared Nodes) ──┐
                           ├──> Section 4 (Phase Nodes)
Section 2 (Gate Definitions)│
  └──> Section 3 (Gate CLIs)┘
                                  └──> Section 5 (Tests)
                                           └──> ⏸️ REVIEW #1
                                                    └──> Section 6 (Req Registry)
                                                             └──> Section 7 (Experiments)
                                                                      ├── ⏸️ REVIEW #2 (playbook 设计)
                                                                      ├── ⏸️ REVIEW #3 (heavy playbook)
                                                                      └── ⏸️ REVIEW #4 (全部跑完)
```

---

## 1. Shared Node Content

> 依赖：无。产出 5 个 Markdown 文件，纯 content writing。

- [x] **1.1** `shared-profile.md`（SHC-001）— 覆盖字段组：`plan_basename`、`research_profile`、`root_must_answer_set`、`hitl1.*`、`hitl2.*`，附示例值 + Source of Record 指向
  - verify: body 包含 Authority Boundary section，`research_profile` 标注为 enum field，HITL1 路径指向 `human_decision_checkpoints.hitl1.*`

- [x] **1.2** `shared-gate-rules.md`（SHC-002）— 8 个 gate 各一句话 purpose + 检查方向 + repair posture，标注 `authority: generated-summary`
  - verify: body 声明 "deterministic truth 以 CLI output 为准"，不含完整 rule-by-rule 列表

- [x] **1.3** `shared-schemas.md`（SHC-003）— 摘要 profile/status/queue/plan/trace/gate schema surface，区分 `rb_status.json`（无 `phases.*` 树）和 `_trace.jsonl`（experiment only）
  - verify: body 指向 `DPT_FRAMEWORK/schema/contracts/` 下各文件，不复制 Zod 定义

- [x] **1.4** `shared-repair-guidance.md`（SHC-004）— fail→inspect→repair→rerun 循环、retry limit 3、escalation、8 种 check type 的修复方向
  - verify: body 不含任何具体 gate 的隐藏脚本

- [x] **1.5** `shared-anti-cheating-rules.md`（SHC-005）— 至少 6 条禁令，每条附正确替代动作
  - verify: 覆盖 fake trace、改 control files 冒充 pass、跳过 retry、chat memory 当 state、提前声称 evidence coverage、`stop: yes` 不等用户

- [x] **1.6** Authority boundary 审查（SHC-006）— 逐文件确认无 `phase`/`gate`/`next`/`stop` frontmatter，无 hidden phase 语言
  - verify: 5 个 shared node 的 frontmatter 只有 `node_type: shared` + `authority: guidance-only|generated-summary`

---

## 2. Gate Definition JSON

> 依赖：无硬依赖（inform by Section 1 的 shared-gate-rules 摘要）

- [x] **2.1** `gate-instantiation-complete.definition.json`（PRG-001）— ~11 条 rules：`dir_exists`（bundle）、`file_exists`（5 control files + `START_FROM_HERE.md`）、`dir_exists`（5 scaffold dirs）、`pattern_match`（bundle name）、`status_value`（`current_mode`/`current_gate`/`next_gate`）
  - verify: `check-gate-instantiation-complete.mjs` 加载此 JSON 后能遍历所有 rules 并返回 pass/fail

- [x] **2.2** `gate-hitl1-recorded.definition.json`（PRG-002）— ~6 条 rules：`file_exists`（profile）、`schema_valid`（ProfileSchema）、`field_non_empty`（`research_profile` ≠ `not_selected`、`root_must_answer_set`）、`field_value`（`hitl1.status == recorded`、`hitl1.recorded_at` 非空）
  - verify: placeholder rule 被移除，所有 rule 使用 D2 允许的 check type

- [x] **2.3** `gate-setup-ready.definition.json`（PRG-003）— ~7 条 rules：`file_exists`（control files）、`schema_valid`（4 schemas）、`dir_exists`（scaffold）、`field_value`（hitl1 marker）、`status_value`（`current_gate`/`next_gate`）、`cross_field`（basename consistency）
  - verify: `cross_field` 仅用于 basename，不做 topic/research quality；normalization 规则写入 definition 的 description

---

## 3. Gate CLI Implementation

> 依赖：Section 2（gate definitions 完整后才能加载和遍历 rules）

- [x] **3.1** `check-gate-instantiation-complete.mjs`（PRG-004 + GSK-004）— 支持 `dir_exists`、`pattern_match`、`status_value`；从当前只支持 `file_exists` 扩展到完整 rule set
  - verify: 对合法 bundle 返回 `passed: true`；对缺失 `rb_profile.yaml` 返回 `passed: false` + inspect 指向缺失文件；对非法 bundle name 返回 fail

- [x] **3.2** `check-gate-hitl1-recorded.mjs`（PRG-005 + GSK-004）— 从 hardcoded `passed: true` 升级为 definition-driven；支持 `file_exists`、`schema_valid`、`field_non_empty`、`field_value`
  - verify: profile 缺字段/default 值未改/HITL1 marker 缺失时返回 fail + inspect/advice

- [x] **3.3** `check-gate-setup-ready.mjs`（PRG-006 + GSK-004）— 从 hardcoded `passed: true` 升级为 definition-driven；支持 `file_exists`、`schema_valid`、`dir_exists`、`field_value`、`status_value`、`cross_field`
  - verify: basename mismatch 时 cross_field 返回 fail + inspect 指向 inconsistency

- [x] **3.4** Runtime audit trace 写入（PRG-007）— 三个 gate CLI 在 `emitGateResult` 前追加真实 gate attempt entry 到 active bundle 的 `rb_trace.jsonl`
  - verify: 检查 production bundle 的 `rb_trace.jsonl` 在 gate 调用后出现新 entry，包含 `gate`/`passed`/`currentNodeRef`/`next`

- [x] **3.5** Experiment trace 边界确认（PRG-008）— gate CLI **不**写 `_trace.jsonl`；experiment playbook thin driver 基于 CLI JSON result 调用 `createTrace()` 写入
  - verify: 直接调用 gate CLI 后 bundle 根不出现 `_trace.jsonl`（只能由 playbook driver 创建）

---

## 4. Phase Node Body

> 依赖：Section 3（gate CLI 路径和参数确定）；phase-hitl1、phase-setup 额外依赖 Section 1（shared-profile、shared-schemas 作为 suggested_context）。phase-instantiation 不需要 shared node。

- [x] **4.1** `phase-instantiation.md`（PRP-001, PRP-004, PRP-010）— 完整 9-section body，使用 `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>`，禁止 evidence/synthesis，非法 bundle 名 fail-stop
  - verify: body 不含 `--bundle` flag、不含 auto-collision suffix、不含 HITL 问题；name collision→报错停止，非法名→重新 instantiate

- [x] **4.2** `phase-hitl1.md`（PRP-002, PRP-005, PRP-008）— 完整 9-section body，结构化 HITL 问题面 + payload checklist（至少 4 字段），`stop: yes`
  - verify: body 将回答写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*`；不写入不存在的 `rb_status.json#/phases/hitl1/*`；checklist 直接在 Markdown 中可见

- [x] **4.2a** Topic rewrite（PRP-002 扩展）— `phase-hitl1.md` Allowed Actions 加入：判断用户输入详细程度 → 一句话场景展开为 structured original topic → 写入 `rb_plan.md` 正文 → 推导 seed topics → 写入 `topic_registry` → 展示给用户审查
  - verify: body 包含 rewrite 步骤；original topic 写入正文非 frontmatter；seed topics 写入 `topic_registry`

- [x] **4.3** `phase-setup.md`（PRP-003, PRP-006, PRP-009）— 完整 9-section body，检查 structural consistency，`stop: no`，明确 `setup-ready != readiness-passed`
  - verify: body 说明 production vs disposable normalization；basename 一致性检查使用 byte-for-byte equality；persistent failure→escalation

- [x] **4.4** Anti-cheating 审查（PRP-007）— 每个 phase body 的 Anti-Cheating Rules section 至少 2 条 phase-specific 禁令 + reference `shared-anti-cheating-rules.md`
  - verify: instantiation 禁止声称 evidence coverage；HITL1 禁止伪造用户答案/跳过 HITL1；setup 禁止冒充 readiness

---

## 5. Regression Tests

> 依赖：Section 3（gate CLI 实现完整）
> 位置：`tests/integration/cli/`

- [x] **5.1** Instantiation gate tests — 5 个 case：合法 bundle pass、缺失 control file fail、非法 bundle name fail、status drift fail、illegal-name fail-stop guidance
  - verify: `node --test tests/integration/cli/check-gate-instantiation-complete.test.mjs` 全部 pass

- [x] **5.2** HITL1 gate tests — 6 个 case：完整 profile pass、YAML parse fail、`research_profile: not_selected` fail、空 `root_must_answer_set` fail、`status` 非 `recorded` fail、`recorded_at` 缺失 fail
  - verify: `node --test tests/integration/cli/check-gate-hitl1-recorded.test.mjs` 全部 pass

- [x] **5.3** Setup gate tests — 7 个 case：production basename pass、disposable normalization pass、missing scaffold fail、status drift fail、basename mismatch fail、unparseable file fail、runtime trace append
  - verify: `node --test tests/integration/cli/check-gate-setup-ready.test.mjs` 全部 pass

---

## ⏸️ REVIEW #1 — 所有实现完成

> **停下来。** 确认以下事项后再进入实验阶段：
> - 5 个 shared node、3 个 phase node body 内容符合 spec
> - 3 个 gate definition JSON rule set 完整
> - 3 个 gate CLI 真实 evaluate rules（无 hardcoded pass）
> - 18 个 regression test case 全部通过
> - **GSK-004 验证**：3 个 pre-research gate CLI 都从 definition 加载真实 rules 并 evaluate（`hitl1-recorded` 和 `setup-ready` 不再是 hardcoded pass）

---

## 6. Requirement Registry

> 依赖：所有 spec 稳定

- [x] **6.1** 更新 `openspec/governance/req-registry.yaml` — 注册 SHC-001~006、PRP-001~010、PRG-001~008、PRE-001~007，确认无 ID 冲突
  - verify: `node openspec/governance/check-project-reqs.mjs` PASS

---

## 7. Experiments

> 依赖：Section 1-6 全部完成
> 位置：`experiments_playbook/exp_workflow-foundation/`
> 全部遵循 `guidelines/command-experiments.md`

### 7.0 Playbook 结构约定：MD 步步为营

> **每个 playbook 的控制面是 Markdown。** JS 只在每一步执行一个确定性动作，然后 MD 解释发生了什么、展示输出、告诉 Agent 下一步怎么走。不允许一个大段 JS 从头跑到尾。

每个 playbook SHALL 遵循以下 step 结构：

```
## Step N: <这一步做什么（一句话）>

<2-3 句解释：为什么要做这一步、期望看到什么>

​```bash
<一个短 bash block：调 CLI 或写一个小 inline .mjs，只做一件事>
​```

<展示关键输出：gate JSON result 的关键字段、文件 diff、trace entry>

<解释输出含义：pass 了说明什么，fail 了 inspect 指向哪里，advice 建议怎么修>

<如果 fail：明确下一步 repair 动作是什么；如果 pass：下一步推进到哪里>
```

每一步之间 Agent 都能停下来理解状态。Agent Flow 在 Markdown 里，JS 只做 checkpoint。

Shared utilities（`experiments/shared/wff-playbook-utils.mjs`）只包含被各 playbook 复用的薄函数：`recordCheck(tracePath, event)`、`verdict(tracePath)`、`cleanup(bundlePath)`。不要在其中藏流程编排。

- [x] **7.0** 编写 `experiments/shared/wff-playbook-utils.mjs` — 3 个纯函数，不做流程控制：
  - `recordCheck(tracePath, checkEvent)` — append `{ event: "check", ...checkEvent }` 到 `_trace.jsonl`
  - `verdict(tracePath)` — 解析 `_trace.jsonl`，过滤 `event === "check"`，any fail → `process.exit(1)`；console 输出 ANSI `\x1b[32mPASS\x1b[0m` / `\x1b[31mFAIL\x1b[0m`
  - `cleanup(bundlePath)` — `rm -rf` + 确认已删除
  - verify: `playbook-utils.mjs` 不含任何 gate CLI 调用、bundle 创建、或 phase 顺序编排

### 7A. Playbook 编写

- [x] **7.1** 创建 experiment family 目录 + 更新 `RUN.md`
  - verify: `experiments_playbook/exp_workflow-foundation/` 存在，`RUN.md` 的 light/heavy 清单含 4 个新 playbook

- [x] **7.2** `test-simple-pre-research-happy-path.md`（PRE-001）— light，fixed HITL payload → 3 个 gate 依次 pass
  - playbook 结构（MD 驱动，每步一段 bash，步间有解释）：
    1. MD: 说明要创建 disposable bundle → bash: `B=$(node experiments/shared/new-disposable-bundle.mjs ...)` → MD: 展示 `$B`，确认 bundle 存在
    2. MD: 说明要写入 fixed HITL payload → bash: `cat > $B/rb_profile.yaml << 'EOF'`（`research_profile: quick_factual`、`root_must_answer_set: ["What is the answer?"]`、`hitl1.status: recorded`、`hitl1.recorded_at`）→ MD: 展示写入后的 profile 关键字段
    3. MD: 说明 instantiation-complete gate 检查什么 → bash: `node ...check-gate-instantiation-complete.mjs --bundle $B ...` → MD: 展示 gate JSON（`check.passed`、`routing.kind`、`routing.next`）→ bash: 调 `playbook-utils.mjs` 的 `recordCheck()` 记录到 `_trace.jsonl`
    4. MD: hitl1-recorded gate（同上 pattern）
    5. MD: setup-ready gate（同上 pattern）
    6. MD: 说明从 trace 做最终裁决 → bash: `node -e "import('playbook-utils.mjs').then(m => m.verdict('$B/_trace.jsonl'))"`
    7. MD: cleanup
  - verify: 至少 3 个 `check` events 写入 `_trace.jsonl`，全部 `passed: true`，verdict PASS；每个 step 的 bash block ≤ 10 行

- [x] **7.3** `test-medium-pre-research-repair-loop.md`（PRE-002）— light，gate fail → inspect/advice → repair diff visible → rerun → pass
  - **具体场景**：创建 bundle 后故意让 `research_profile` 保持 `not_selected`，运行 hitl1 gate，fail → inspect/advice → 修复 → rerun → pass
  - playbook 结构（MD 驱动，突出 repair 决策过程）：
    1. MD: 创建 bundle + 验证（同 7.2 step 1）
    2. MD: 解释 "我们现在故意不填 profile，模拟用户未回答 HITL1 的状态" → bash: `cat > $B/rb_profile.yaml << 'EOF'` 写入默认 profile（`research_profile: not_selected`）
    3. MD: 运行 hitl1 gate → bash → MD: **展示完整 gate JSON output**（`check.passed: false`、`inspect` 数组、`advice` 数组）→ MD: 逐条解释 inspect 和 advice 在说什么
    4. MD: **"Agent 现在读到了这个 feedback，应该决定：把 `research_profile` 从 `not_selected` 改成 `quick_factual`"** → bash: repair（改 YAML）→ MD: **展示 repair 前后 diff**（至少展示 `research_profile` 字段的变化）
    5. MD: rerun same gate → bash → MD: 展示 `check.passed: true`
    6. MD: verdict + cleanup
  - verify: `_trace.jsonl` 同时有 `passed: false` 和 `passed: true` 的 `check` events；MD 正文中包含 gate JSON output 原文和 repair diff

- [x] **7.3a** `test-medium-pre-research-fault-tolerance.md`（PRE-002 补充）— light，验证 gate CLI 在异常 state 下不崩溃并返回清晰反馈
  - playbook 结构（MD 驱动，3 个独立 case，每个 case 的 MD 解释 "我们要模拟 Agent 可能搞出的什么错误状态"）：
    - **Case 1: 非法 JSON** — MD: "MD 可能把 `rb_status.json` 写坏" → bash: 写入 `"not json {{{"` → bash: 运行 setup gate → MD: 展示 gate 不崩溃、返回 JSON、inspect 含 parse error → bash: recordCheck(failed)
    - **Case 2: 多 rule 同时 fail** — MD: "Agent 可能漏建多个东西" → bash: 删除 `rb_plan.md` 和 `final/` → bash: 运行 setup gate → MD: 展示 `inspect` 含两条诊断、`advice` 含两条建议 → bash: recordCheck(failed)
    - **Case 3: bundle 目录不存在** — MD: "Agent 可能传错 --bundle 路径" → bash: 对不存在的路径运行 instantiation gate → MD: 展示 gate 不崩溃、返回清晰 `inspect`
  - verify: 3 个 case 的 gate CLI exit code = 1（不崩溃），stdout 为合法 JSON，`inspect` 非空且指向具体问题；MD 正文解释每个 case 模拟了 Agent 的哪类错误

- [x] **7.4** `test-complex-pre-research-review-surface.md`（PRE-003, PRE-004）— light，fixed AI interpretation sample + human review checklist，所有审查内容在 Markdown 正文中
  - **fixed sample**（静态 Markdown 内容，不依赖实时 Agent）：
    - 一份 "AI 对 HITL1 问题的理解示例"：Markdown 表格展示 AI 建议 `research_profile: exploratory_map`、`root_must_answer_set` 含 3 个问题、以及 AI 为什么这样选的理由
    - 一份对应的 payload：上述理解转化为具体 `rb_profile.yaml` 写入内容
  - **review checklist**（人类 reviewer 对照 sample 回答）：
    - AI 的 profile 选择是否贴切？must-answer 问题是否覆盖关键维度？
    - payload 写入路径是否正确（`human_decision_checkpoints.hitl1.*` 而非其他路径）？
    - `plan_basename` 是否未被误改？
  - playbook 结构：MD 正文中展示 sample + checklist + review points；gate CLI 调用和 trace 记录放在短 bash block 中，每步后有 MD 解释
  - verify: runner 不读 inline JS 也能理解 case goal、sample、review points、verdict basis；不依赖实时 Agent 生成

- [x] **7.4a** PRE-007 审查 — 确认 4 个 light playbook（7.2/7.3/7.3a/7.4）都把 case goal、HITL1 问题面或 fixed/manual payload、review points、gate fail 后的 inspect/advice 读取指引放在 Markdown 正文中，不被 inline JS 隐藏。thin driver 只做 deterministic execution。
  - verify: 逐 playbook 确认 reviewer 只读 Markdown 正文（不读 inline JS）即可理解实验意图和裁决依据

### ⏸️ REVIEW #2 — Playbook 设计审阅

> **停下来。** 确认 light playbook（7.2-7.4）的设计：
> - **MD 步步为营**：每个 playbook 是否遵循 MD解释→短bash→MD展示输出→MD解释→下一步 的结构？JS block 是否每个 ≤ 10 行？有没有出现一个大段 JS 从头跑到尾？
> - **Agent 能知错改错**：gate fail 后，MD 是否展示了完整 JSON output？是否逐条解释了 inspect/advice？是否明确指出了 repair 动作？
> - HITL1 问题面是否对人类可审查？
> - fixed payload 是否贴合当前 profile schema？
> - repair loop 的 diff surface 是否可见？inspect/advice 关键词是否可验证？
> - fault-tolerance：3 个异常 case 是否覆盖了 LLM 最可能搞错的状态？
> - review checklist 是否完整？
> - thin driver（`playbook-utils.mjs`）是否只含纯函数、不含流程编排？

- [x] **7.5a** `test-light-hitl1-quick-factual.md` — light，ResearchProfile enum 值 `quick_factual` → `schema_valid` pass
- [x] **7.5b** `test-light-hitl1-exploratory-map.md` — light，ResearchProfile enum 值 `exploratory_map` → `schema_valid` pass
- [x] **7.5c** `test-light-hitl1-claim-verification.md` — light，ResearchProfile enum 值 `claim_verification` → `schema_valid` pass
- [x] **7.5d** `test-heavy-hitl1-manual-review.md`（PRE-005, PRE-006）— heavy fallback，`agent_mode: auto|manual`，auto 枚举 6 vector（3 pass + 3 fail），manual 人类写 payload

- [x] **7.10a** `test-light-hitl1-topic-rewrite-vague.md`（PRE-008）— light，一句话输入 → Agent 展开 original topic → 推导 seed topics → human review → gate pass
  - verify: `rb_plan.md` 正文含 structured original topic（≥ 背景+范围+维度）；`topic_registry` 非空；hitl1 gate pass
- [x] **7.10b** `test-light-hitl1-topic-rewrite-detailed.md`（PRE-008）— light，详细 brief → Agent 识别不需要 heavy rewrite → 只做轻量整理 → 保留用户原意
  - verify: original topic 保留用户原始术语和维度；未引入用户没要求的额外维度；hitl1 gate pass

### ⏸️ REVIEW #3 — 审阅通过（3 profile playbook 已跑过）

### 7B. 执行与裁决

- [x] **7.6** 运行 light playbooks（7.2, 7.3, 7.3a, 7.4, 7.5a-c）— 逐个执行，从 `_trace.jsonl` 裁决
  - verify: 4 个 playbook 全部 PASS

- [x] **7.7** 运行 heavy playbook（7.5）— 人工介入后执行
  - verify: PASS（不计入 light 回归）

- [x] **7.8** 运行 governance checks
  - verify: `node openspec/governance/check-project-reqs.mjs` PASS；`node openspec/governance/check-project-specs.mjs` PASS

- [x] **7.9** Cleanup — 确认无残留 `dpt_disp_*` 目录

### ⏸️ REVIEW #4 — 最终裁决

> **停下来。** 全部跑完后确认：
> - light playbook 4/4 PASS？
> - heavy playbook PASS？
> - governance checks PASS？
> - 有残留 disposable bundle 吗？
> - 可以 archive 了吗？
