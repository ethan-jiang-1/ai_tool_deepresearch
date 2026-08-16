# start-research

`RUN.md` 是 selected Deep Research Harness new-research 的 entry。只有在已读 `RUN.md`、且没有 explicit reachable existing-run-bundle continuation route 后，才进入本下游 playbook；不要把本文件作为 entry 前的 direct research 或 shortcut 路径。

Agent 命令：从零开始一次完整的 Deep Research。

## 前置条件

- `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs` 存在
- 已运行 `npm install`（依赖 zod, yaml）
- 用户在 git repository 中

## 步骤

### 1. 定名

从 research question 生成 kebab-case bundle name，或使用 Harness execution 开始前已提供的 `--name`：

- 取英文前 6 个词
- 去除非字母数字，空格替换为 `-`
- 全小写，最长 60 字符
- 如无法生成有效名称，使用 `deep-research`

目标目录：`dpt_rb_<name>/`。

如果名称已在 entry 前提供，可以直接使用该名称。不要把 bundle naming 变成 autonomous execution 中的 mid-pipeline dependency。

### 2. 创建 Bundle

```bash
B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>)
```

若目录已存在，CLI 报错退出（永不覆盖）；Agent 按 pre-research-phase-content 契约派生带 `-<hex6>` 后缀的 collision-safe 名称重试、经 trace/log 记录，不询问用户；或使用 entry 前已提供的替代名称。

JS 脚本内部已完成：目录创建、模板替换、Zod schema 校验、validate-bundle + inspect-bundle 质量检查。

### 3. 写入 Research Question

确保 `## Goal` section 存在（新 bundle 已有）。将用户问题填入 `<bundle>/rb_plan.md` 的 `## Goal > ### Research Questions` 子节：

```markdown
### Research Questions

1. <用户的问题>
```

注意：不要创建游离的 `## Research Question` section——所有内容统一放在 `## Goal` 下，避免与后续 HITL1 的 topic rewrite 冲突。

### 4. 设置 Research Profile（可选）

如果用户指定了 research profile（`quick_factual` / `exploratory_map` / `claim_verification`），修改 `<bundle>/rb_profile.yaml`：

```yaml
research_profile: <profile>
```

未指定时保持默认值 `not_selected`，在 HITL1 阶段由用户确认。

### 5. 加载第一个 Phase Node

打开 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行。

### 6. 后续：Phase Node 自行驱动

从这一步开始，不再需要额外指引。每个 phase node 本身就是一个完整的 instruction sheet（instantiation/HITL1 为 WNC-010 声明的 bootstrap 兼容例外，已在其 §6 标注）：

1. 读 phase node（`phases/phase-<name>.md`）
2. 按 "Allowed Actions" section 执行
3. 运行 "Gate Command" section 中指定的 gate CLI
4. Gate pass → 读 JSON output 中的 `check.next` → 先运行 `enter-phase --bundle <path> --node <check.next>` 获取下一 Markdown control surface，再立即按刚通过的 source gate 运行 `advance-status --bundle <path> --to <source_gate_enum>` 同步 gate window；例如 `wave0-complete` pass 后使用 `--to wave0_complete`。只有两步都成功后，才执行已加载的 target phase。`enter-phase` / `load_complete` 只见证 entry；`advance-status` 只同步 source-gate status；两者都不证明 target phase work completion。
5. Gate fail → 读 `inspect` / `advice` → repair → rerun same gate
6. 回到步骤 1，直到 `phase-final`（terminal，无 gate）

Execution handoff：`hitl1` 和 `hitl2` 是仅有的 interactive in-run checkpoints，Agent 各自先给一个可修正推荐并承接用户决定。其余非终端 `stop: no` phase 由 Agent 静默自主推进，不主动提问、确认、汇报或等待 acknowledgement；用户主动的 current turn 可得到事实回答，但不改变 lifecycle/permission/route/mutation authority 或既有 next action。Final 是 terminal lifecycle delivery，deliver-first、接受 presentation feedback，但不是第三个 checkpoint：entry 后先完成 Readiness status sync；admitted empty bundle 发布 base，admitted post-C5 zero-append return 发布 next global version；已有 current-lineage report 才留在 Final 等待/处理 presentation refinement。满意不写 state；仅新增证据/研究才走 accepted C5 recovery。

## 如果已有 Current Run Bundle

不要重新创建。此 playbook 不处理 existing bundle：入口选择的完整规则只有一处 canonical 表述——`continue-run-bundle.md` 的 "Entry Selection (canonical)" 节；将显式提供的 candidate 交给它，先验证同根 `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`。缺少任一文件即报告 `unsupported_current_entry_contract` 并停止。通过 pair 后，continuation route 才读 `rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`。若 `rb_status.json.current_node` 非空，把它作为当前应加载的 phase Markdown coordinate；`current_gate` / `next_gate` 只是 gate window，不要只凭 `current_gate` 推断当前 phase。若 `current_node` 为 `null` 或缺失，先运行 reentry/trace 诊断再继续。
