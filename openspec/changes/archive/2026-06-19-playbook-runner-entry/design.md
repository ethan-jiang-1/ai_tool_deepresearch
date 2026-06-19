## Context

`experiments_playbook/` 目前有 6 个实验族、17 个 playbook。每个 playbook 是 self-contained Markdown：frontmatter → execution contract → steps with bash blocks → trace verdict → cleanup。coding agent 打开 playbook 后逐行执行——它是 runner，不是 reader。

但现状有两个缺口：

1. **没有入口**。AI 不知道"现在该跑哪些 playbook"。它得自己扫目录、自己判断，或者等用户逐个点名。
2. **没有成本标识**。`exp_subagent/` 的 playbook 启动真实 Claude Code subagent（web search、verify、extract），每个跑十几分钟、消耗 token。其他 5 个实验族跑纯 JS engine code，每个几秒到几十秒。但目录结构上看不出区别——全部混在 `exp_*/` 下，跟 suite 一样。

这个 change 不改变 playbook 的执行模型，只加两层薄的组织层：一个入口文件告诉 AI "跑这些"，一个清单文件让 AI 和人看清全貌，以及 frontmatter 里一个字段标识成本。

## Goals / Non-Goals

**Goals:**
- 让 coding agent 有一个明确的 runner 入口（RUN.md），打开就知道"我要逐个执行哪些 playbook、怎么跑"
- 让每个 playbook 的执行成本可区分（frontmatter `weight: light | heavy`）
- light playbook 适合频繁跑（改完代码），heavy 只在机制变更时跑
- 消除 playbook 之间无意义差异：trace 统一命名为 `_trace.jsonl`，verdict 统一用 ANSI 绿/红
- 所有现有 playbook 的结构和执行方式保持不变

**Non-Goals:**
- 不创建传统 test runner（不以 JS 脚本替代 coding agent 作为 runner）
- 不改变 playbook frontmatter schema version（command-experiment/v1 不变）
- 不移除或重命名现有实验族目录
- 不新增 npm 依赖或 framework engine 代码
- 不为第三层（真实环境 E2E）做设计

## Decisions

### Decision 1: RUN.md 作为 AI runner 入口，不做 CLI

**选择**: 纯 Markdown 文件 `experiments_playbook/RUN.md`，coding agent 打开即知自己是 runner。

**备选**: 写一个 `run-playbooks.mjs` CLI 脚本，接受 `--tier=light` 参数，自动遍历 playbook、执行 shell、收集结果。

**理由**: 传统 runner 会逆转 Agent Flow 的所有权——JS 成为流程控制器，coding agent 退化为脚本执行器。这与 project charter 的 MD-controls-Agent-Flow 原则冲突。RUN.md 保留"AI 是 runner"的本质：AI 读指令、做判断（比如"这个 fail 了我该修复还是跳过"）、被阻断时反问用户。RUN.md 是 MD 控制的 runner；`run-playbooks.mjs` 是 JS 控制的 runner。

RUN.md 的内容形态是给 AI 的行动指令，不是给人看的文档。它说"你该干什么"，不是"这个系统是干什么的"。

### Decision 2: weight 放 frontmatter，不放目录名

**选择**: 每个 playbook 的 YAML frontmatter 新增 `weight: light | heavy`。

**备选 A**: 按 weight 分目录——`experiments_playbook/light/` 和 `experiments_playbook/heavy/`。

**备选 B**: 文件名加后缀——`test-simple.heavy.md`。

**理由**: 
- 同一个实验族（如 `exp_gate-fork/`）的三个 case 都是 light——weight 是实验族级别的属性。分目录会让同一个族的文件分散到两个目录，破坏内聚。
- frontmatter 是现有 playbook 的天然扩展点，不增加目录复杂度。
- 将来如果某个实验族的 complex case 变成了 heavy（比如加入 subagent），frontmatter 允许 case 级别覆盖，而目录方案做不到。
- frontmatter 对人不够显眼的问题，由 INDEX.md 解决——INDEX 显式列出每个 playbook 的 weight，人看 INDEX 即可。

### Decision 3: RUN.md 包含 playbook 清单 + 执行指令，单文件入口

**选择**: `experiments_playbook/RUN.md` 同时包含 playbook 清单（按 light/heavy 分组，每个带路径和 case 简述）和执行指令。AI 打开这一个文件就全有——跑哪些、怎么跑、跑完出什么 report。

**备选**: 拆成 INDEX.md（清单）+ RUN.md（指令）两个文件。

**理由**:
- 两个文件意味着 AI 需要先读 INDEX 再读 RUN——多一步跳转，且两个文件可能不同步。
- 清单本身是 runner 指令的一部分——"跑这些"的前半句是"这些是哪些"。
- 17 个 playbook 的清单很短，不会让 RUN.md 变得臃肿。将来膨胀到 30+ 再考虑拆分。
- 手写而非自动生成（理由同上）。

### Decision 4: RUN.md 的执行语义——"跑"是指逐个 execute playbook

**选择**: RUN.md 给出明确的执行指令：AI 打开 INDEX → 选定 playbook → 逐个打开 → 逐 step 执行 bash blocks → 收集 verdict → 下一个 → 最后出 report。

"跑所有 light"时 AI 打开 INDEX 的 light 列表，逐个执行。

AI 在遇到 failure 时自主判断——是环境问题重跑、是已知 issue 记录跳过、还是不确定反问用户。这不设硬规则，留给 AI 判断。

**备选**: 在 RUN.md 里指定精确的执行序列和 failure 处理逻辑。

**理由**: Agent 的智力就在"碰到意外时能判断"。把 failure 处理写成 JS 脚本就是退回传统 runner。但 RUN.md 可以给出指导——"fail 了把 trace summary 记下来，继续下一个，别停"。

### Infrastructure standardization

The next three decisions address playbook-internal inconsistencies: bundle collision, trace naming, and verdict output. They are mechanical standardizations — same logic, applied uniformly.

### Decision 5: Bundle 名加随机 hex 后缀，cleanup 用 glob

**选择**: `experiments/shared/new-disposable-bundle.mjs` 在 bundle 名后追加一位随机 hex 字符（`0-9a-f`），如 `dpt_disp_agq_simple` → `dpt_disp_agq_simple_a`。所有 playbook 的 cleanup step 统一用 glob `rm -rf dpt_disp_<short>_*` 或 `rm -rf $B`。

**备选 A**: 不加随机后缀，每次创建前先 `rm -rf` 旧目录。

**备选 B**: 用时间戳后缀（如 `_20260619_143022`），完全避免碰撞。

**理由**:
- 备选 A 的问题是：两个 AI session 或同一 session 的两次独立跑可能并发，`rm -rf` + 重建之间有 race condition。而且"创建前先删"没法保护"想保留上次 trace 对比"的场景。
- 备选 B 完全避免碰撞但后缀过长（15 字符），不美观且 CLI 里不好输。
- 一位 hex（16 值）在单次 session 内碰撞概率 ~1/16，实际场景几乎不可能（同一个 case 不会连续跑两次）。即使碰撞，创建脚本报错即可。
- Cleanup 用 glob 是确定性清除——不依赖记住随机后缀，不怕残留。

### Decision 6: Trace 文件统一命名为 `_trace.jsonl`

**选择**: 所有 playbook 的 trace 文件统一命名为 `_trace.jsonl`（位于 bundle 目录根），不再使用实验族差异化命名（如 `_trace_agq_cli.jsonl`、`_trace_subagent.jsonl`、`_trace_gf_simple.jsonl`）。

**备选**: 保持现状，每个实验族继续用自己的 trace 命名。

**理由**:
- Bundle 目录已经物理隔离（且现在有随机后缀），trace 文件不需要再靠文件名区分来源。
- 统一命名让 AI 和人在任何 bundle 里找 trace 都是同一个路径——`dpt_disp_*/_trace.jsonl`。看 log、堆叠对比多个 run 的 trace 时不需要先查"这个实验族的 trace 叫什么"。
- 简化 `createTrace()` 调用和 verdict 步骤——全都引用 `_trace.jsonl`，减少 playbook 之间的无意义差异。
- 历史命名是"怕撞名"的防御措施，现在隔离已经由目录层解决了。

影响面：
- 所有 playbook frontmatter `trace:` 字段：`dpt_disp_<short>_<case>/_trace_<short>_<case>.jsonl` → `dpt_disp_<short>_<case>_*/_trace.jsonl`
- 所有 inline `.mjs` 中 `createTrace(...)` 调用的路径参数
- 所有 verdict 步骤中读 trace file path 的地方
- `guidelines/command-experiments.md` 中 trace 文件命名约定

### Decision 7: Verdict 统一使用 ANSI 颜色

**选择**: 所有 playbook 的 verdict `console.log` 统一用 `\x1b[32m` (green) 输出 PASS、`\x1b[31m` (red) 输出 FAIL，后跟 `\x1b[0m` reset。

**备选**: 保持现状——部分 playbook 有颜色、部分没有。

**理由**:
- gate-fork 和 gate-loop 已有此实践——终端里绿色 PASS 辨识度极高，跑完一目了然。
- agentic-queue/subagent/workflow-next 的 verdict 只有纯文字，混在 bash 输出里容易被忽略。
- workflow-fsm 意图正确但 escape 写错了（`\\x1b` 在 JS 里是字面量反斜杠+`x1b`，不产生 ESC 字符），需要修。
- 标准化后，任何 playbook 的 verdict 在终端里都是同一种视觉信号——看绿色就知道过、红色就知道挂。

注意：bash heredoc `<< 'JS'` 内容不经过 bash 转义，所以 Markdown 源码中就是 `'\x1b[32m'`（单反斜杠）。绝对不能写成 `'\\x1b[32m'`。

## Risks / Trade-offs

- **[Risk] AI 可能"读完就算"**——打开 RUN.md 后理解为"这是文档，我看看就行"，而不是"这是指令，我该执行" → **Mitigation**: RUN.md 的开头用 action-oriented 语言：`你现在是 runner。打开以下 playbook，逐行执行。`
- **[Risk] RUN.md 里的 playbook 清单可能过期**——新增 playbook 时忘记更新 RUN.md → **Mitigation**: RUN.md 里加一句"如果清单列的和实际目录不一致，先更新本文件再跑"。简单且有效。
- **[Risk] heavy playbook 可能被误跑**——用户说"跑 playbook"时 AI 可能不分轻重全跑 → **Mitigation**: RUN.md 明确说"默认只跑 light。heavy 只在用户明确要求时跑。如果你不确定，问。"
- **[Risk] 随机后缀 bundle 残留**——cleanup 失败或中断时，随机后缀目录可能残留多个 → **Mitigation**: cleanup 始终用 glob `dpt_disp_<short>_*` 清除，不依赖记住随机后缀。runner 跑之前也可先 `rm -rf dpt_disp_*` 做全局清理。

## Open Questions

- 不需要现在回答。如果将来 playbook 数量膨胀到 30+，可能值得写自动生成 INDEX 的工具，但那是另一个 change。
