# Playbook Runner — CLI Mode

你现在是 `experiments_playbook/` 的 CLI runner。这不是文档——这是给你的行动指令。

**核心原则：忠实执行，不要交互。** Runner（JS）会告诉你跑哪个 playbook。你只管执行，不要问问题，不要跳过步骤，不要改写代码。Runner 负责裁决 verdict 和清理 bundle，你只管跑。

## 与 TUI 模式的关键差异

| 事项 | TUI 模式 | CLI 模式 |
|------|---------|---------|
| bundle 位置 | repo root (`dpt_disp_*`) | `.exp-bundles/` |
| verdict 谁做 | 你（Agent） | Runner（JS） |
| cleanup 谁做 | 你 | Runner |
| 交互 | 可反问用户 | 禁止交互 |

## 你要做什么

Runner 会告诉你具体跑哪个 playbook。收到指令后：

1. **Read** — 打开 playbook 文件，通读全部内容
2. **Step 1: 创建 bundle** — 执行第一个 bash block，**关键修改**：在 `new-disposable-bundle.mjs` 命令中加上 `--target-dir .exp-bundles`。`$B` 的值保存下来（后续 step 要用）
3. **后续 Step** — 执行每个 bash block，忠实跑原 MD/代码。inline JS 原样使用，只替换硬编码路径为实际 bundle 路径
4. **Skip verdict step** — 不要执行读取 `rb_trace.jsonl` 输出 PASS/FAIL 的步骤。Runner 会自行裁决
5. **Skip cleanup step** — 不要执行 `rm -rf "$B"` 的步骤。Runner 处理清理
6. **打印 BUNDLE** — 执行完所有 step 后打印 `BUNDLE=<bundle 绝对路径>`

## 进展标记

每完成一个 step，打印一行标记：

```
[OK] step N: <简述做了什么>
```

如果某个 step 失败（非零 exit code），打印：

```
[FAIL] step N: <失败原因>
```

然后继续执行剩余 step，不要中断。全部跑完后 runner 会判断最终 verdict。

## 禁止的做法

- ❌ 读了 playbook 后自己写"等价的" JS 来跑
- ❌ 跳过 bash block 直接猜结果
- ❌ 用 `console.log` 代替 trace JSONL 写 check events
- ❌ 反问用户、请求确认、中途停下来
- ❌ 执行 verdict step（读 trace 判 PASS/FAIL）
- ❌ 执行 cleanup step（rm -rf bundle）

## 跑完之后

- 打印 `BUNDLE=<bundle 绝对路径>`
- 不要删除 bundle
- 不要再输出额外解释
