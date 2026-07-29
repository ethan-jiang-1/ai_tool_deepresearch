---
bug_id: BUG-143
title: "HITL1 research-access contract is coupled to Claude tool names and lacks Codex-equivalent adapters"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: hitl1
node: phases/phase-hitl1.md
category: host-surface-integration
---

# BUG-143: HITL1 research-access contract is coupled to Claude tool names and lacks Codex-equivalent adapters

## 现象

用户已经接受 HITL1 的研究方向，Agent 完成了 profile、must-answer set、canonical topic registry、Seed Topic skeleton 和 research style 写入；但在进入 Setup 之前停在 `research_access_available`。

本次当前 Codex 会话没有暴露名为 `WebSearch` / `WebFetch` 的工具，但暴露了可执行 shell、Node.js 20 原生 `fetch` 和 `/usr/bin/curl` 等价底层能力；`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check` 也成功确认 Claude、`.env`、DeepSeek API key、endpoint 和 model 配置均存在。但 DPT 没有提供按语义能力注册/选择 Adapter 的 seam，导致“工具名称不同”被错误地当成“研究能力不存在”。

这里需要严格区分两类等价关系：Node `fetch` / bounded `curl` 可以承接 WebFetch 的页面抓取语义；WebSearch 则不是任意 shell 命令，仍需要一个真实、可验证、能返回候选 HTTP(S) URL 的 search provider 或 search adapter。当前框架没有把这个选择写成可执行 contract。

因此用户看到的是“继续不了”，而不是可执行的 Setup 路由。这个问题不同于 BUG-099/104/106 的 `stop: no` phase liveness：本案发生在 `stop: yes` 的 HITL1 research-access gate 之前，根因是 DPT 把 Claude Code 的工具命名当成了隐含能力发现机制，未接通 Codex 的等价能力。

## Red loop（已运行）

当前 bundle 上运行：

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands \
  --current-node phases/phase-hitl1.md
```

结果稳定为：

```text
check.passed: false
failed_rule_ids: ["research_access_available"]
routing.kind: "no_transition"
hints[0].repair_kind: "external_action"
```

当前事实还包括：

```bash
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check
```

返回 exit code `0`，且报告 Claude、`.env`、provider key、endpoint 和 model 均已配置；但该 check 只验证 launcher/provider preflight，不证明当前 Codex 已拥有 WebSearch/WebFetch，也不把 launcher 注册为 DPT research surface。

`rb_profile.yaml` 的真实记录为 `research_access.status: unavailable`、`fetch_outcome: not_attempted`、`eligible_candidate_count: 0`；`rb_status.json` 仍为 `current_node: phases/phase-hitl1.md`，没有进入 Setup。

### Host runtime 复核（非 authority）

随后通过仓库已配置的 Claude host launcher 做了一次 continuation 尝试。该 runtime 自报 WebSearch/WebFetch 工具存在，但 WebSearch 被宿主 permission policy 拒绝，未产生 candidate，且没有写入 bundle 的成功 observation。由于这次工具拒绝没有形成 DPT runtime receipt，不能把 child Agent 的文字总结当作 Gate/evidence authority；它只把本 bug 的宿主边界细化为“surface 可能存在，但没有被当前 DPT run 合法接入且 permission 未满足”。

## 预期行为

当仓库已经存在可配置的宿主 Agent launcher 或其他外部研究能力时，DPT 应当具备一个明确的、可验证的连接路径：

1. 当前 DPT Agent 能调用真实 search/fetch surface，完成一次 neutral search 和同一 candidate 的真实 fetch，写入 `available` 并通过 HITL1 Gate；或
2. 在进入 HITL1 前就确定宿主 surface 不可用，给出可操作的 host preflight/切换边界，而不是让用户先完成 HITL1、再在 gate 门口发现无路可走。

无论采用哪条路径，都不能把 Claude launcher 的配置检查、`curl` 存在、搜索摘要、模型记忆或模型构造 URL 当成 `research_access: available`。

## 实际行为与证据边界

- `phase-hitl1.md:135-149` 要求使用当前 Agent 的实际 search/fetch surface；`curl` 只能在已有 search 返回的同一合法 URL 上作为 bounded fetch fallback。
- `phase-hitl1.md:153-160` 正确地把“search surface 缺失”记录为 `unavailable/not_attempted/count=0`。
- `openspec/specs/pre-research-gate-implementation/spec.md:82-86` 要求 `research_access.status != available` 时 Gate 失败，并且不得进入 Setup 或 silent wave。
- `check-gate-hitl1-recorded.mjs:155-175` 将该情况标成 `external_action`，但当前 Codex 没有一个可执行的 Engine operation、surface registration 或 host bridge 能满足这个 external prerequisite。
- `DPT_FRAMEWORK/host_tools/README.md:10-27` 将 launcher 定义为 provider/Agent runtime 启动器；`claude-deepseek.mjs:88-116` 的 `--check` 只做配置预检，正常模式才启动另一个 Claude runtime。它没有与 DPT 当前 run 的 HITL1 probe 建立 capability handoff。
- `shared-page-fetch-guidance.md:17-29` 已经承认 Node.js `fetch` 和 bounded `curl` 是 page-fetch 的等价降级 tier，但这套语义 Adapter 只到 delegated page fetch guidance，没有被 HITL1 的 search/access probe 复用。

## 诊断结论

确认的直接根因是能力边界分裂和名称耦合：

1. DPT HITL1 要求“当前 Agent 可实际调用的 search/fetch surface”；
2. 实现/指导实际上以 Claude Code 的 `WebSearch` / `WebFetch` 名称作为默认认知入口，没有定义等价能力的 Adapter interface；
3. 当前 Codex 会话具备 Node `fetch` / `curl` 的 fetch 能力，但缺少被认可的 search provider/adapter 选择；
4. 现有 Gate 按 accepted contract 正确 fail-closed，然而没有可达的修复/切换路径，导致一个具备部分宿主研究基础设施的环境在 Setup 前不可运行。

所以“停下来”不是 Agent 把普通进度误报成 HITL，也不是用户没有继续确认；它是一个真实的 host-surface integration / capability-name coupling / lifecycle reachability gap。Gate 本身不应简单放宽，但入口需要通过语义 Adapter 找到合法等价能力。

## 已排除或降级的假设

1. **用户决定没有写入**：排除。HITL1 profile、问题集、topics 和 `status: recorded` 均已落盘。
2. **Gate 错误读取 profile**：排除。Gate 读取到的唯一失败根因是 `research_access.status: unavailable`。
3. **普通 `stop: no` / context exhaustion 导致停顿**：本案不是该 phase；停点在 HITL1 的 `stop: yes` access gate，不能并入 BUG-099/104/106 的因果链。
4. **直接用 curl 即可合法修复**：排除。没有 search surface 返回的 candidate URL，直接对搜索引擎或模型构造的 URL 发起请求违反当前 HITL1 contract。

## 与既有 bug 的关系

- BUG-099、BUG-104、BUG-106：同属 Agent/宿主可操作性风险，但它们发生在已进入 silent phase 或 phase handoff 之后，关注 Agent 是否继续执行；BUG-143 发生在 research access gate 之前，关注“可执行研究 surface 是否被入口接上”。
- BUG-100/101/102：曾处理 pre-Wave readiness 的确定性 producer 路径；本案暴露的是更早的宿主能力发现和接入边界，不应通过手写 profile 或新增 parallel success path 规避。

## 建议的 OpenSpec 方向

后续应通过 OpenSpec propose/explore/apply 评估一个最小 semantic research-surface contract：

- 定义一个小而深的 research-access Adapter interface：search 返回真实候选 URL（含 surface identity/order），fetch 接收已返回的同一 URL 并返回真实 page content；HITL1 只依赖这个语义接口，不依赖 `WebSearch` / `WebFetch` 字面名称；
- 提供 Codex adapter：fetch 侧复用 Node.js `fetch` → 同 URL bounded `curl`；search 侧显式绑定一个真实 search provider，不能把 `exec_command` 或任意 URL 拼接当成 search success；
- 让 pre-trigger/入口 preflight 能发现“launcher 已配置但当前 Agent 不可调用”的断裂，并给出唯一合法修复路径；
- 保留当前 fail-closed 证据边界：launcher `--check`、网络连通、`curl` 存在和用户同意都不能单独生成 `research_access.available`；
- 以真实 Agent/search/fetch observation 验证 available 路径，以 deterministic test 锁定 no-surface 分支和恢复时不重复 HITL1 决定的行为。

## Non-goals

- 不把 `research_access.unavailable` 改成 degraded pass。
- 不用直连搜索引擎、固定 URL、搜索 snippet 或模型记忆替代真实 search result + page fetch。
- 不为解决宿主 liveness 添加 DPT watcher、自动 retry tree 或第二套 queue/controller。
- 不把本 bug 当作 BUG-099/104/106 的重复报告，也不在没有 OpenSpec 授权时直接修改 `DPT_FRAMEWORK/`。

## Regression / closure criteria

- 在没有 search surface 的 Codex runtime 中，运行应继续 honest fail-closed，但必须暴露明确的 host-surface contract boundary，不要求用户重复 HITL1 语义决定。
- 在只有 Codex 等价 fetch surface、没有 search provider 时，系统应明确报告 `search_unavailable`，不能把 fetch 能力误报成完整 research access。
- 在 Codex adapter 已绑定真实 search provider、且 Node fetch/curl 获得真实页面时，neutral capability probe 应写入真实 `available` observation，`hitl1-recorded` Gate 应通过并提供 `setup` route。
- 在有真实 search/fetch surface 的 runtime 中，neutral capability probe 应写入真实 `available` observation，`hitl1-recorded` Gate 应通过并提供 `setup` route。
- 仅有 launcher/provider preflight 或 shell `curl` 时，测试应明确保持 unavailable，除非存在被验证的实际 surface handoff。
- 任何修复都必须保留 probe URL/page content 不进入 evidence surfaces 的边界。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Repro node: `phases/phase-hitl1.md`
- Direct profile fact: `rb_profile.yaml#/research_access`
- Gate: `node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs`
- Owner boundary: host research surface / DPT entry integration；不是用户继续确认，也不是手写 profile/status 的修复

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；当前运行时只向我暴露 GPT-5 模型族标识，精确
  deployment/model ID 未暴露，不能据症状臆测更细型号。
- 本案不是“模型太弱导致忘记调用工具”的直接证据：Codex 确实有 Node `fetch` /
  `curl` 的抓取能力，但缺少被框架认可的真实 search adapter；Gate 的 fail-closed
  结果是框架入口契约缺口。
- 调整方向：优先补 semantic capability discovery/adapter contract；Agent guidance
  只能要求先证明 search→same-URL fetch，不能把工具名称、launcher 配置或模型记忆当成
  research access。
