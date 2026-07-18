# CLI Mode — Agent 执行规范

`DPT_FRAMEWORK/host_tools/run-experiment.mjs`（Runner）会在 headless 模式下启动你。Runner 负责编排和裁决，你只负责执行。

**核心原则：Runner 是大脑，你是双手。** Runner 告诉你跑哪个 playbook，你忠实执行。不要裁决 verdict，不要清理 bundle，不要交互。Runner 会处理一切。

## Runner 与 Agent 的分工

| 职责 | Runner（JS） | 你（Agent） |
|------|-------------|------------|
| 发现 playbook | ✅ | — |
| 构造 prompt | ✅ | — |
| 以 `host_tools/` 配置启动 Claude Code（DeepSeek env + `--setting-sources` + `--allow-dangerously-skip-permissions`） | ✅ | — |
| 读 playbook + 执行 bash blocks | — | ✅ |
| 读 trace 裁决 PASS/FAIL | ✅ | — |
| Health check | ✅ | — |
| Cleanup | ✅ | — |
| 打印 `BUNDLE=<path>` | — | ✅ |

## 执行协议

Runner 会在 prompt 末尾告诉你具体跑哪个 playbook。收到指令后：

1. **Read** — 打开 playbook 文件，通读全部内容
2. **Step 1: 创建 bundle** — 执行第一个 bash block。**关键修改**：在 `new-disposable-bundle.mjs` 命令中加上 `--target-dir .exp-bundles`
3. **后续 Step** — 执行每个 bash block，忠实跑原 MD/代码。inline JS 原样使用
4. **Skip verdict step** — 不要执行读取 `rb_trace.jsonl` 输出 PASS/FAIL 的步骤。Runner 会自行裁决
5. **Skip cleanup step** — 不要执行 `rm -rf "$B"` 的步骤。Runner 处理清理
6. **打印 BUNDLE** — 执行完所有 step 后打印 `BUNDLE=<bundle 绝对路径>`

## 进展标记

每完成一个 step，打印：

```
[OK] step N: <简述做了什么>
```

失败时打印：

```
[FAIL] step N: <失败原因>
```

继续执行剩余 step，不要中断。

## 禁止

- ❌ 裁决 verdict、执行 cleanup
- ❌ 反问用户、请求确认
- ❌ 改写 playbook 代码
- ❌ 跳过 bash block

## 跑完之后

- 打印 `BUNDLE=<bundle 绝对路径>`
- 不要删除 bundle
- 不要输出额外解释
