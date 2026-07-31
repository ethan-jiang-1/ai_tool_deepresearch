# Evidence E — `openspec/governance/` 的历史接入链

> 2026-07-30 只读追溯。时间线来自 git history；数量统计只读取 committed `HEAD`，不计当前
> worktree 中未提交或未跟踪的 change。结论区分“规则被送入 change”“checker 被执行”和
> “失败阻止 archive”三件不同的事。

## 1. 它是怎样长出来的

### 2026-06-16：先有局部 checker

`schema-core` 首次引入 requirement registry 和 `check-req-ids.mjs`。当时它们住在
`DPT_FRAMEWORK/`，服务一个实现 change，还不是 project-level governance seam。

### 2026-06-17：真实 archive 事故触发 project check

commit `4163fbdd7` 记录了直接根因：Agent 手工复制 delta spec 到 `openspec/specs/`，绕过正确
archive flow，导致 19 个 main specs 出现 delta-format 污染。修复做了三件事：

1. 修复已经污染的 main specs；
2. 新增只读 `check-spec-format.mjs`，加强 requirement checker；
3. 在 `openspec/config.yaml.rules.tasks` 中要求每个 change 生成两条 archive 前收尾 task。

同日 commit `ca415768e` 把 registry 和两个 checker 从 distributable `DPT_FRAMEWORK/` 移到
`openspec/governance/`，并明确称其为“项目级 OpenSpec 治理扩展（非 OpenSpec 原生）”。

### 2026-06-27/28：事后补上 accepted contract

`establish-hitl-ux` change 新增 accepted `requirement-traceability` capability。RET-006 把两个
checker 定义为 archive hard gate；`config.yaml` 固化 registry 组织和 capability-boundary rules。

这一步提供了规范所有权，但没有改变 archive adapter：规范写着 “SHALL NOT archive”，实际
archive flow 仍把未完成 task 当 warning。

### 2026-07-15：更成熟的 governance 模式

`formalize-verification-routing` 是更值得复用的第二代模式：

- change-local `verification-plan.yaml` 是 route intent 的 Source of Record；
- `verification-routing-contract.mjs` 是唯一 strict Zod parser；
- `check-verification-routing.mjs --mode plan|assets` 是只读 CLI consumer；
- focused unit/integration tests 覆盖 parser 和 checker；
- accepted `verification-routing` spec 定义行为；
- `config.yaml`、root instructions 和 README 只保留 lifecycle/placement facts 与 pointer；
- knowledge-surface test 防止高频入口重新发明旧 taxonomy。

它刻意声明：这是 repo lifecycle discipline，`openspec status/validate` 不认识 custom plan。

## 2. 真实消费图

```text
accepted spec / incident lesson
             |
             v
openspec/governance checker + focused tests
             |
             +------------------------------+
             |                              |
             v                              v
openspec/config.yaml context          rules.tasks
             |                              |
             |                              v
             |                    openspec instructions tasks
             |                              |
             +------------------------------+
                                            v
                                  generated tasks.md
                                            |
                                            v
                                  Agent runs / checks [x]
                                            |
                                            v
                           archive adapter warns, then may still mv
```

当前不存在另一条隐藏执行链：

- `package.json` 的 `npm test` 只发现 `node:test`；不会自动对真实 repo 运行三个 governance CLI；
- governance checker 自身的 integration tests 使用 temporary fixtures；
- 无 repo CI、tracked git hook、Claude SessionStart hook 或 OpenSpec-native custom-artifact gate；
- current 1.7 archive skill 会读取可选 `operationGuidance`，但明确说它是 advisory，lookup 失败也继续；
- incomplete tasks 仍是 warning + confirm，随后 raw `mv`。

OpenSpec 1.7 的**原生 CLI**其实比生成 skill 更深：`openspec archive` 自己拥有 delta-spec apply、rebuilt
spec validation、archive collision 和 move；`--json` 还能返回结构化结果。但当前安装包
`dist/core/archive.js` 的源码顺序是先写 main specs，
之后才检查 archive collision 并 move，而且没有 side-effect-free dry-run。JSON 模式若要自动执行 spec update
必须带 `--yes`，而 `--yes` 同时会放行 incomplete tasks。第一版 project finalizer 因此不应采用“写完发现
`specsUpdated: true` 再搬回 active”的恢复协议；它应在现有 Agent-driven sync/re-compare 与 project checks
之后调用 `openspec archive --json --skip-specs`。这个组合不需要 `--yes`，也不会在 final transition 改 specs。

所以历史上“挂进去”的准确含义是：**通过 OpenSpec artifact instruction 把纪律高概率地送进
每个 change；不是 checker 已经自动执行，更不是失败已经绑定 archive transition。**

## 3. Committed history 的实际效果

以 `formalize-verification-routing` 接受时刻
`2026-07-15T21:35:13+08:00` 为 cutoff，追踪此后创建、且已存在于 committed `HEAD` archive 的
34 个 change：

| 观察 | 结果 | 说明 |
|---|---:|---|
| `tasks.md` 同时包含 `check-project-reqs.mjs` 与 `check-project-specs.mjs` | **34 / 34** | `rules.tasks` 的生成注入非常有效 |
| 包含精确 `check-verification-routing.mjs` 命令 | **31 / 34** | 另 1 个用等价 prose 写法；仍不是 OpenSpec-native gate |
| change root 实际包含 `verification-plan.yaml` | **8 / 34** | 只放在宽泛 context 的 custom artifact 明显更易漏 |
| archive 时仍有任何未完成 task | **2 / 34** | archive adapter 允许 warning 后继续 |
| archive 时仍有未完成 governance task | **1 / 34** | `2026-07-24-strengthen-guidance-constitution` 的 spec check task 仍为 `[ ]` |

这些数字支持两个同时成立的判断：

1. `config.yaml.rules.tasks -> instructions tasks -> tasks.md` 是 repo 已经跑通、值得复用的 push seam；
2. `tasks.md` 的存在和 `[x]` 仍是 Agent 声明，且 archive 不强制，所以它不能独立承担 hard closure。

## 4. 哪些部分应该复用

### 复用 A：governance 作为 project-level deterministic Module 的家

新机制的机械 closeout 应继续住在 `openspec/governance/`，而不是放进 distributable
`DPT_FRAMEWORK/`，也不复制到 `.claude` / `.codex` / `.agents` adapter。它是 project change
lifecycle 的实现，不是 research runtime 行为。

### 复用 B：accepted contract + one parser/checker + focused tests

若新增结构化机械事实，应遵循 verification-routing 的形状：一个 Source of Record、一个 parser、一个
CLI consumer、一个 Interface test surface。不要让 finalizer 复制各 checker 的规则；它只组合已有
CLI verdict、task/artifact completeness 与 native archive result。

### 复用 C：`rules.tasks` 负责生成 durable obligations

Plan review 和 closeout review 必须写入 `rules.tasks`，而不只写在大 `context:` 或 root prose 中。
为避免 finalizer 用自然语言猜 task，最终 recommendation 固定使用两个极小、稳定的 lifecycle marker：

```md
- [ ] ... <!-- openspec-feedback:plan-review -->
- [ ] ... <!-- openspec-feedback:closeout-review -->
```

marker 只证明 required task 存在及 checkbox 已闭合；不对 review 内容作 semantic verdict。
因为 artifact rules 不会重写既有 `tasks.md`，adoption 必须只对当时的 active changes 做显式 backfill/review；
archived history 不回写，也不设置永久 grandfather bypass。

### 复用 D：operation guidance 补上事件触发

OpenSpec 1.7 的 `operations.apply/archive.guidance` 是历史 checker 建立时尚不存在的 attach point。
它负责在 resumed apply 和 archive 事件把当前 review guidance 推回 Agent；tasks 保存 finding；governance
finalizer 负责机械闭合。finalizer 应包装 native `openspec archive --json --skip-specs`，不再手写 archive
naming 或 normal move，也不引入写后恢复分支。它要求 project checks 在 Agent sync/re-compare 后运行，并
断言 native result 的 `specsUpdated: false`；delta/main 的语义等价仍是 Agent review 边界，不伪装成机器 proof。

## 5. 哪些部分不应照搬

- 不把“文件在 `openspec/governance/`”误当自动执行。
- 不只靠 `context:` 声明一个 custom per-change artifact；历史上的 8/34 已说明它容易漏，除非 guarded
  finalizer 明确要求它。
- 不把七条 semantic question 搬进 checker 或 Zod schema；Engine 不能裁决设计思考质量。
- 不把完整 checker 命令和逻辑复制到每个生成 adapter；`openspec update` 会让这些副本继续漂移。
- 不把 finalizer 塞进 `requirement-traceability` 或 `verification-routing` 的实现内部。它协调多个 checker，
  应由新的有界 change-lifecycle capability 拥有；各既有 capability 继续拥有自己的事实。

## 6. 对 08 的直接结论

`openspec/governance/` 确实是最合适的实现接缝，但要补齐历史上缺的最后一段：

```text
rules.tasks 可靠生成义务
        +
operationGuidance 在事件上推送 review
        +
findings 回到 pending tasks
        +
governance finalizer 验证 marker/tasks/checkers 并独占 native archive 调用
```

这不是新建一套平行 guardrail。它是把已经证明能传播的 governance pattern，从“送达 task”深化成
“送达 + 反馈 + deterministic transition”一个 Module。
