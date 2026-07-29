# 01 — 根因之一：现有治理检查的执行回路是手动的

## 1. 一句话

已有 governance 不变量之所以仍可能静默回归，**不是因为检查不够多，而是因为已有检查没有与
正常 archive transition 绑定**。脚本本身可运行且当前真实 repo 上通过；`config.rules.tasks` 也已经
证明能很可靠地把义务送入 `tasks.md`。但“task 被生成”仍不等于“命令已执行”，当前 archive flow
不校验 project checker，甚至允许带未完成治理 task 继续归档。

这只是整批反复 bug 的一个**生命周期根因**。它不解释 writer/reader、时间/provenance、重复 evaluator
或 Agent-facing feedback 的内容缺陷；那些仍由 C2–C5 和 `08` 的 semantic review loop 处理。

## 2. 机器级证据（已逐行核实）

### 2.1 当前 OpenSpec archive flow 是主要“可硬停”环节，但它不跑 governance check

下面逐行事实来自当前 `.claude/commands/opsx/archive.md` 1.7 flow；`.codex/skills` 有近等价新版，
repo 里也仍有版本较旧的 `.agents` / `.codex/prompts` 副本。因此它证明的是**支持路径存在相同缺口**，
不是说某一个 Markdown 文件天然拥有跨 harness 的唯一 archive authority。

该 flow 的 6 步：

1. 选 change（`openspec instructions archive`，advisory，**永不阻塞**，`:31-54`）
2. 检查 artifact 完成度（`openspec status`，未完成只**警告+确认**，`:56-69`）
3. 检查 task 完成度（数 `- [ ]`，未完成只**警告+确认**，`:70-81`）
4. 评估 delta spec sync（**唯一真正的硬停**在这步，`:116-122`：sync 后再比对，不一致就 stop）
5. 执行 archive（`mkdir -p archive && mv changeRoot …`，`:124-139`）
6. 汇总

关键事实：

- **唯一会“stop, do not archive”的 gate 在 step 4 的 sync 再比对**（`archive.md:116-122`）。
- 而它**只在 "Sync now / Sync anyway" 路径上触发**（`:99-103`：`Archive without syncing` /
  `Archive now` → 直接 proceed to archive，**跳过再比对**）。
- 整个 `archive.md` **从不**调用 `check-project-reqs.mjs`、`check-project-specs.mjs`、
  `check-verification-routing.mjs`（全文 grep 证实）。
- guardrail 明说 `:213`：“**Don't block archive on warnings - just inform and confirm.**”

### 2.2 governance check 的真正载体是 config.yaml 注入的 tasks.md 文本

`openspec/config.yaml`：

- `:104-107`：verification routing——“apply tasks SHALL run `check-verification-routing.mjs
  --mode plan` before target edits and `--mode assets` before archive. **This is repo lifecycle
  discipline, not an OpenSpec-native artifact gate: `openspec status/validate` does not parse or
  validate the custom plan.**”
- `:197-204`：每个 change 的 tasks **必含两条收尾检查 task**：跑
  `check-project-reqs.mjs`（0 duplicate/orphan/unregistered/reusedRetired）和
  `check-project-specs.mjs`（0 violations）。注释明说这是为了“防止 requirement ID
  堆叠/漏标/被覆盖，以及 delta 格式污染 main spec 而**无人发现**”。
- `:84`：“每次 change 归档前两个 check 脚本都必须 PASS”。

也就是说：**纪律已经可靠地进入 artifact，但执行仍只发生在 apply Agent 去跑那条 task 时**。
没有任何机器环节保证它发生。归档时 `tasks.md` 里的 `[x]` 是**自报**的（见
`archive/2026-07-29-harden-dpt-research-entry-routing/tasks.md` 的 4.3–4.6 行）。

### 2.3 历史数据说明：task 注入成功，archive enforcement 仍缺

详细方法和时间线见 `evidence/E-governance-integration-history.md`。只读 committed `HEAD`，以
verification-routing 接受时刻为 cutoff，此后创建且已归档的 34 个 change 中：

- **34/34** 的 `tasks.md` 同时包含两个 project checker；
- **31/34** 包含精确的 routing checker 命令，另 1 个用等价 prose；
- 只有 **8/34** 真正带 custom `verification-plan.yaml`；
- 至少一个 change 在 governance task 仍为 `[ ]` 时被归档。

所以用户所说的“`openspec/governance/` 历史上挂得进去”是对的，但精确结论是：

- `rules.tasks -> openspec instructions tasks -> tasks.md` 是一个已验证的**送达接缝**；
- `openspec/governance/*.mjs` 是已验证的**deterministic verdict 接缝**；
- 两者之间和最终 move 之间，还缺一个**执行/transition 接缝**。

这正是 `08` 不应推翻历史 pattern、而应把它深化为 governance finalizer 的理由。

### 2.4 其它“看起来像自动”的地方都不是

- `package.json:7` 的 `test` 脚本跑 `node --test`，但 governance 测试用的是 **synthetic temp
  fixture**（`tests/integration/governance/check-project.test.mjs:11-24` 起 `mkdtempSync`），
  **从不**跑真实 `openspec/specs/` 或 active change；且 session 生命周期里没有任何东西自动 `npm test`。
- 无 `Makefile`、无 git hook（`.git/hooks/` 只有 `*.sample`）、无 `.claude/settings.json` 的
  `hooks` 块（只有 `settings.local.json` 的权限 allowlist）。
- propose/explore/apply 三个 skill 除 `openspec` CLI 外**不跑任何子命令**（apply 完成后只“suggest
  archive”，`apply.md:102-108`，不跑测试、不跑 governance）。

## 3. 它解释“反反复复”的哪一部分

`framework-contract-feedback-and-control-structure-analysis.md` 已经诊断出 bug 的**内容根因**
（消费方分类漂移、writer 弱于 reader、时间边界混同等）。本文件只补上**机械治理回路缺口**：
即便内容 root 被修掉，只要三个现有 checker 仍靠人记得跑，它们覆盖的 req/spec/routing 违规就仍可能
在归档时静默进入历史记录。

反过来也必须成立：把三个 checker 自动跑起来，**不会自动发现** BUG-151/152/176/178 那类语义/实现
漂移。把前者说成整批 bug 的根因，会给 hard gate 不具备的覆盖率。完整闭环见 `08`。

## 4. 推论

修这个机械缺口的最小动作仍是复用三个 checker；但最终形态不应是在多个生成的 Markdown adapter
中复制命令。`08` 建议在历史 `openspec/governance/` seam 上增加 deterministic finalizer：先闭合
project checks，再包装 OpenSpec 原生 archive；OpenSpec operation guidance 和 root instructions 只负责把
支持 flow 路由到它。`04` 保留较早的窄方案。
