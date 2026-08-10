# Plan: isolate-hitl1-capability-probe

> 状态: 设计已收敛，待落地（落地走 OpenSpec change）
> 日期: 2026-08-10
> 类型: 行为变更计划

## 背景与目的

HITL1 research-access probe（启动后的 Wikipedia 试探）目前由主 Phase Agent 在自己的上下文里亲自执行 search+fetch。两个问题：

1. **上下文污染**：probe 的 query、URL 列表、页面字节以 tool-result 形式留在主 Agent 会话里，后续 wave2 综合会被杂音串扰。
2. **UX 突兀**：用户刚做完研究决定，一个无关的搜索+抓取动作冒出来，且无法用小白能懂的话解释。

目标：把 probe 隔离进一次性 **probe agent**（独立上下文），主 Agent 只收紧凑 observation；UX 文案改为小白版；现有契约（schema/gate/证据边界）全部不动。

## 事实研究（已核实）

- 研究阶段所有 search/fetch 均由委派原生 Sub-agent 执行：wave0 `subagent-dpt-source-intake`、wave1/2 `subagent-dpt-evidence-extractor`、wave2 `subagent-dpt-topic-scout`，全部走 `operate-work-unit claim → spawn native Sub-agent → submit`（`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md`）。
- Phase Agent 研究期间从不直接搜索："do not direct-search from the Phase Agent"（phase-wave0.md / phase-wave1.md / phase-wave2.md）。
- Sub-agent 用真实 search + 页面 fetch + 同一 bounded curl 兜底（`shared-page-fetch-guidance.md`），工具 surface 与 probe 同族。
- 实验机制已有"独立 Subject Agent 执行 HITL1 probe"先例：case-115 + `experiments_env/shared/run-iterative-interaction-subject.mjs`（claude-deepseek launcher spawn 隔离子进程）+ `observe-iterative-interaction-case.mjs`（transcript observer）。
- 结论：**整个研究流程里唯一在主 Agent 上下文跑的搜索就是 probe 本身**。probe 下放给同类 actor 反而更忠实于"实际研究的 surface"。

## 设计决策

| # | 决策 |
|---|---|
| D1 | probe 改由一次性 **probe agent** 执行：Phase Agent 用现有 "Spawn the Sub-agent with the generated prompt" 模式 spawn，**不走 work-unit/claim/submit/ledger** |
| D2 | probe agent 是纯"搜索+抓取+回传"的 bounded agent：不读 bundle、不写任何文件；角色 prompt 自带固定中性查询 `site:wikipedia.org "Internet protocol suite"` + 探测规则 |
| D3 | 回传 = 现有 `research_access` observation 字段原样：available → `{status, probed_at, result_url, fetch_outcome: success, fetch_surface}`；unavailable → `{status, probed_at, fetch_outcome: failed\|blocked\|not_attempted, reason, [result_url], eligible_candidate_count, final_candidate_ordinal}` |
| D4 | Phase Agent 原样写入 `rb_profile.yaml`（唯一合法写入者），跑**同一个** `hitl1-recorded` gate |
| D5 | 诚实链从第一手变第二手（Phase Agent 信任 probe agent 回传）；缓解 = schema 严格分支 + case-115 canary 兜底（Engine 本来就无法独立验证外部调用，BUG-071 已定） |
| D6 | 失败路径：spawn 失败/回传畸形 → honest unavailable（reason 写明），同一 probe/gate 重跑；**不建自动重试树** |
| D7 | probe agent 不新增任何持久面；observation 留在 `rb_profile.yaml` 即唯一持久记录 |
| D8 | legacy bundle 兼容：observation schema 不变，沿用 v0.39 先例（新版本 Agent 跑旧 bundle 按当前加载的 framework node 执行，无需迁移） |

## 不动 / 动 / 新增

**不动**：`research_access` schema 三分支、`hitl1-recorded` gate 规则（`research_access_available`）、HITL1 `stop: yes` 边界、probe 证据排除边界（不进 reference/_cache/artifacts/work-unit output/ledger）、unavailable 保留选择+重跑路径、work-unit/ledger/receipt 全部机制、`ProfileSchema`、`apply-research-style.mjs` writer。

**动**：
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md` §3d：执行者措辞（Phase Agent 亲自 search/fetch → spawn probe agent + 写入其回传 + 同一 gate）
- spec `openspec/specs/research/pre-research-phase-content/spec.md`（PRP-002/005 措辞）
- `brief/hitl1.md` HIU-002 文案换小白版
- case-115 + observer 适配（subject = probe agent 本身，runner 直接 spawn，observer 看它的 tool events——避免嵌套子代理 transcript 抓不到的坑）

**新增**：
- probe-role 指引节点（固定 prompt + 回传格式，模式照抄现有 subagent 角色节点）
- deterministic 集成测试扩展：Phase Agent 的 spawn→写→gate 管道（纯机制，canary 不用背）

## UX 文案（终稿）

- 事前：开始研究前，系统先快速检查一下联网搜索能力，大概几秒钟，请稍候。
- 成功：联网能力正常，开始准备研究。
- 失败：联网检查没通过。多数是网络问题——请检查网络连接后重试；网络正常的话稍后再试也行。你刚才的选择不会丢。

注意：HIU-002 的 notice→结果→gate 顺序保留；silent 出口仍只在 gate pass 后；失败文案用"多数是"口吻，不把 blocked/failed/not_attempted 说死成网络问题。

## 验证

- 确定性：probe-role 回传契约无页面字节、gate 行为不变、文案顺序、Phase Agent 管道。
- 真实 canary：case-115 改造为 subject = probe agent，observer 证明真实 search→URL→same-URL fetch 序列 + 诚实 available/unavailable 回传。
- 证明距离：确定性测试只证结构；真实 Agent 行为由 canary 证；不把 fixture 当能力证明。

## 落地路径（研究已备，暂不执行）

1. OpenSpec change：`openspec/changes/2026-08-10-isolate-hitl1-capability-probe/`（proposal.md / design.md / specs / tasks / verification-plan），走 propose → explore → apply → archive。
2. 版本：framework v0.82 → v0.83，apply 时同步 `CHANGELOG.md` 与 `DEEP_RESEARCH_HARNESS/RUN.md` banner。
3. 目标文件：`phase-hitl1.md`、`pre-research-phase-content` spec、`hitl1-ux` spec、`brief/hitl1.md`、case-115、`tests/integration/md/phase-hitl1-research-access.test.mjs`、新增 probe-role 节点。
4. 明确不产出：CONTEXT.md 词条、docs/adr/ ADR（按用户指示不做）。

## 术语

- **probe agent**：执行 HITL1 能力自检的一次性隔离 Agent；非 work-unit actor，无 bundle 写入权，无证据权威。
