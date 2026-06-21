# start-research

Agent 命令：从零开始一次完整的 Deep Research。

## 前置条件

- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` 存在
- npm 依赖已安装 (zod, yaml)
- 用户在 git repository 中

## 步骤

### 1. 定名

从用户提供的 research question 生成 kebab-case bundle name：

- 取英文前 6 个词
- 去除非字母数字，空格替换为 `-`
- 全小写，最长 60 字符
- 如无法生成有效名称，使用 `deep-research`

目标目录：`dpt_rb_<name>/`。

用户也可以直接指定 `--name`。

### 2. 创建 Bundle

```bash
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>)
```

若目录已存在，报错退出。Production run bundle 不允许覆盖；换一个新的 bundle 名称。

JS 脚本内部已完成：目录创建、模板替换、Zod schema 校验、validate-bundle + inspect-bundle 质量检查。

### 3. 写入 Research Question

把用户的问题追加到 `<bundle>/rb_plan.md` 末尾：

```markdown
## Research Question

<用户的问题>
```

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
4. Gate pass → 读 JSON output 中的 `check.next` → 加载 `check.next` 指向的下一 phase
5. Gate fail → 读 `inspect` / `advice` → repair → rerun same gate
6. 回到步骤 1，直到 `phase-final`（terminal，无 gate）

人类介入点：`hitl1`（`stop: yes`，确认研究方向、设置 profile、注册 topics）和 `hitl2`（`stop: yes`，审阅 synthesis 后放行）。其余 phase 均为 `stop: no`，Agent 自行推进。

## 如果已有 Active Bundle

不要重新创建。打开 `<bundle>/START_FROM_HERE.md` 了解 bundle 布局，读 `rb_status.json` 中的 `current_gate` 判断当前处于哪个 phase。加载对应的 phase node 继续执行。
