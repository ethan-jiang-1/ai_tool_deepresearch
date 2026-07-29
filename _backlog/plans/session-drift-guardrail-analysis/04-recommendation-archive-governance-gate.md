# 04 — 必要但不充分：把现有三 checker 接入 pre-archive hard floor

> **状态修正**：本文件保留 hard-floor 判断，但其早期“直接改 `.claude` archive Markdown”落地形态
> 已被 `08` 取代。完整机制还必须包含 event-triggered semantic feedback loop；最终 archive 应由
> `openspec/governance/` deterministic finalizer 拥有 project preconditions 并包装 native archive，
> 而不是由多个生成 adapter 各自复制命令或手写 move。

## 1. 一句话

一个必要的高杠杆缺失件，是让三个现有 governance checker 与最终 archive move 绑定。它能修复
req/spec/routing 的机械执行缺口；它不是防止整批 semantic/implementation drift 的完整机制。

## 2. 修正后的落地形态

不要把 gate 逻辑复制到 `.claude/commands`、`.claude/skills`、`.codex/skills` 等生成 surface。
OpenSpec `update` 会重生成这些文件，repo 当前还存在版本不同的 adapter。

`08` 建议新增一个 repo-owned finalizer：

```text
node openspec/governance/finalize-change-archive.mjs --change "<name>"
```

它复用（不复制）三个现有 checker，并在同一个命令边界内要求 required artifacts、带稳定 marker 的
plan/closeout tasks、其它 tasks、strict validation 与 checker PASS。随后它调用 native
`openspec archive --json --skip-specs`，让 OpenSpec 自己拥有 validation、collision、archive naming 和
move。现有 Agent-driven sync/re-compare 在前，project checks 读取 sync 后的 main specs；不传 `--yes`，也不
新增写后回滚。这样“漏跑 checker”不再是 adapter 两步 prose 中的可能分支。

这不是给 repo 引入一个陌生位置。历史 audit（见 `evidence/E-governance-integration-history.md`）显示，
`openspec/governance/` 从 2026-06-17 的真实 archive 污染事故起就是 project-level extension seam；
`rules.tasks` 又在后续 34/34 个 committed change 中成功送达两个 project checks。新增 finalizer 是把这个
已验证的 delivery/verdict pattern 深化到 transition，不是另起平行系统。

OpenSpec 1.7 的 `operations.archive.guidance` 与 `AGENTS.md` / `CLAUDE.md` 短路由负责让各 harness
进入这个 finalizer；adapter 只允许保留薄调用，并由 conformance test 保护。现有 tasks guidance 继续作为
early feedback 与 durable ledger。

## 3. 它覆盖什么 / 不覆盖什么（诚实边界）

### 覆盖

- **机械回路缺口（`01`）**：把 req/spec/routing 检查从“靠人记得跑”变成正常 archive move 的前置条件。
- 已被项目付费构建并信任的三类不变量：req-ID registry 一致性、main-spec 结构、verification routing
  的 asset 边界。
- 任何 future change 若在归档时带着未注册的 req ID、delta 头污染、或 verification asset 越界，
  **立刻被拦**。

### 不覆盖（明确）

- **不**直接抓 BUG-151（time/provenance）、BUG-152（writer 弱于 reader）这类**内容**漂移——它们需要
  C2–C5 的内容修复 + deterministic_e2e 测试，不是静态 governance 检查能管的。
- **不**抓“语义对象未被表示”（那是 Tier-B 想管、但被 GCO-007 禁掉的）——这条靠 **prose reconciliation
  矩阵**（已在 `config.yaml:183-191` + GCO-007 要求下被产出）+ human review，不靠机器 verdict。
- **不**抓“evaluator 消费了它不该消费的 pattern”——这是 Tier-A 想管、但按 `03` 的 S2/S3 当前会误报
  的；留给 conditional Phase-2。
- 命名的 BUG-146/162 已 closed、BUG-178 已 converge，所以这是 **regression guard**，不是 live-bug fix。

### 一个仍存的残余风险（诚实）

finalizer 能保证**经它调用的正常 native archive**不会漏掉 project checks；任何人仍可绕开 OpenSpec
直接移动目录。
`AGENTS.md` / `CLAUDE.md` 与 operation guidance 只能把这种绕过变成显式违反项目 flow，不能提供 OS 级
权限隔离。只有出现真实绕过证据后，才考虑 CI / tracked hook；第一版不预先叠这层。

## 4. 为什么这是 Simple Reliable Control，而不是新复杂度

- 它**复用**已构建的不变量和 native OpenSpec archive，并把 project checker 与 canonical transition
  收进一个可单测/端到端验证的 deterministic seam。
- 它**删除/合并**了什么复杂度：把“governance check 是否发生”从“依赖 apply agent 记忆 + archive 不校验”
  收敛为“archive 唯一接缝上的一次确定性发生”。net simplification = 少一条“可能被遗忘的执行路径”。
- 它**不**新增 state machine、retry、controller、第二套 truth——符合 `guidelines/evolution-simple-
  reliable-control.md` 与 GCO-008 charter-companion 纪律。

## 5. 与 Phase-2 的关系

这个 hard floor 必须与 `08` 的 targeted semantic review 同时看待。只有完整 loop 落地后，真实复发仍证明
某个**可机械推导的窄不变量**缺失，才启动 `03` 末尾描述的窄化 Tier-A。在那之前，Tier-A 仍是
“已探索、已收窄、暂不做”。
