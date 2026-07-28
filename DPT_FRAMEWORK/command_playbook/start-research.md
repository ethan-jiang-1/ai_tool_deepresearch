# start-research

Agent 命令：从零开始一次完整的 Deep Research。

## 前置条件

- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` 存在
- 已运行 `npm install`（依赖 zod, yaml）
- 用户在 git repository 中

## 步骤

### 1. 定名

从 research question 生成 kebab-case bundle name，或使用 framework execution 开始前已提供的 `--name`：

- 取英文前 6 个词
- 去除非字母数字，空格替换为 `-`
- 全小写，最长 60 字符
- 如无法生成有效名称，使用 `deep-research`

目标目录：`dpt_rb_<name>/`。

如果名称已在 entry 前提供，可以直接使用该名称。不要把 bundle naming 变成 autonomous execution 中的 mid-pipeline dependency。

### 2. 创建 Bundle

```bash
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>)
```

若目录已存在，报错退出。Production run bundle 不允许覆盖；Agent 派生新的 collision-safe 名称后重试，或使用 entry 前已提供的替代名称。

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

打开 `DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行。

### 6. 后续：Phase Node 自行驱动

从这一步开始，不再需要额外指引。每个 phase node 本身就是一个完整的 instruction sheet：

1. 读 phase node（`phases/phase-<name>.md`）
2. 按 "Allowed Actions" section 执行
3. 运行 "Gate Command" section 中指定的 gate CLI
4. Gate pass → 读 JSON output 中的 `check.next` → 先运行 `enter-phase --bundle <path> --node <check.next>` 获取下一 Markdown control surface，再立即按刚通过的 source gate 运行 `advance-status --bundle <path> --to <source_gate_enum>` 同步 gate window；例如 `wave0-complete` pass 后使用 `--to wave0_complete`。只有两步都成功后，才执行已加载的 target phase。`enter-phase` / `load_complete` 只见证 entry；`advance-status` 只同步 source-gate status；两者都不证明 target phase work completion。
5. Gate fail → 读 `inspect` / `advice` → repair → rerun same gate
6. 回到步骤 1，直到 `phase-final`（terminal，无 gate）

Execution handoff：`hitl1` 和 `hitl2` 是仅有的 interactive in-run checkpoints，Agent 各自先给一个可修正推荐并承接用户决定。其余非终端 `stop: no` phase 由 Agent 静默自主推进，不主动提问、确认、汇报或等待 acknowledgement；用户主动的 current turn 可得到事实回答，但不改变 lifecycle/permission/route/mutation authority 或既有 next action。Final 在 artifacts 存在后做 terminal delivery，不开第三次确认循环；明确 post-final rerun 才走 accepted recovery。

## 如果已有 Active Bundle

不要重新创建。打开 `<bundle>/BUNDLE_MAP.md` 了解 bundle 布局；旧 bundle 只有 `START_FROM_HERE.md` 时，把它当作 deprecated fallback。读 `rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`。若 `rb_status.json.current_node` 非空，把它作为当前应加载的 phase Markdown coordinate；`current_gate` / `next_gate` 只是 gate window，不要只凭 `current_gate` 推断当前 phase。若 `current_node` 为 `null` 或缺失，先运行 reentry/trace 诊断再继续。
