## Why

当前 HITL1 access envelope 用 Claude/DeepSeek 的 `WebSearch` 后同 URL
`WebFetch` 的首成功阶梯表示“能否继续”。这既不能回答当前环境分别能否直接
取得中国与海外典型公开页面，也把某一个 Coding Agent 的工具名误当成通用能力。
Codex、Claude Code 和其他执行器的直接取页手段不同；它们共同需要被观察的是
“这个公开页面能否在当前用户网络与当前执行器的已授权表面上取得真实内容”，
而不是某个搜索工具是否存在。

用户确认：执行环境通常在中国，VPN 或网络调整完全由用户控制；Agent 应根据
原始问题、硬来源约束与 must-answer 的语义判断观察到的中外来源限制是否相关。
相关时，Agent 说明限制并允许用户调整环境后重新完整探测，或接受当前限制后
使用最后一次真实观察继续深度研究。

## What Changes

- 将独立的 `shared-hitl1-research-access-envelope.md` 从 search-first source-class
  阶梯重建为固定公开样本的中国/海外双来源直接取页图谱。中国与海外的核心样本在
  小批量并发中各自完成观察，任一侧成功都不得短路另一侧；真实页面内容而非命令
  退出、搜索摘要、登录页或 challenge shell 才是成功。
- **BREAKING**：HITL1 不再把 `WebSearch`、`WebFetch`、搜索候选、同 URL
  candidate binding，或 Claude/DeepSeek selected adapter 作为生产取页前提。
  controller 只要求当前执行器通过其已有、已获许可的直接页面获取表面取得指定 URL
  的内容。工具清单和宿主权限仍由当前执行器决定；controller 不选择 provider、
  不要求某一种表面，也不因缺少 native tool 擅自放宽到 shell。
- 将 controller 中的 timeout 与差网络确认实验设为静态有界规则：主取用、仅针对
  transport 不确定性的同 URL 延长确认、同来源组备用样本和整轮预算。它明确区分
  「整轮预算到期而未启动」和「隔离 probe / 当前执行器无法开始任何合法直接取页」；登录、
  挑战、明确 HTTP 拒绝和速率限制不盲重试；controller 不自行调整 VPN、权限或网络。
- 扩展 `research_access` 的结构化观察，使其能保留静态受限的样本组、每个样本的
  紧凑终态和实际成功 surface，而不保存页面、URL 历史、HTTP 矩阵、搜索候选或
  重试记录。旧 envelope 保持可读；一次新的有效 probe 只替换当前 observation，
  不宣称网络恒久可用。
- 在 HITL1 内加入受限的 source-access alignment loop。Phase Agent 根据原问题、
  已确认 must-answer、Topic map 和用户控制判断中外结果对本轮研究的相关性；只有
  相关来源存在缺口时才向用户说明当前限制并等待其请求调整环境后的新一轮探测、更新来源
  约束或接受当前限制。Agent 不验证、记录或推断用户是否实际改变网络；没有新用户请求时
  不得自动空转重试，用户接受当前限制后才以最后 observation 进入现有 silent research path。
- 将现有 Claude/DeepSeek adapter 降回该宿主的实验与 launcher 事实：它可作为一个
  真实 canary 的执行环境，并在其 own contract 中保留实际工具事件元数据；它不能再充当
  生产 HITL1 或 Codex 的唯一入口。跨执行器的公共概念是“合法直接页面获取”，不是共享的
  provider registry、adapter 优先级、环境变量选择协议或权限升级。
- 以版本 `v0.86` 发布这个 Harness 行为变更，并补足 schema、Gate、Markdown、
  deterministic e2e 与真实 isolated-agent canary 的验证边界。每个 canary 只证明其
  实际执行器与实际网络的那次观察，绝不推导跨 provider 或长期可用性。

## Capabilities

### New Capabilities

无。中外样本、用户对齐和最终 observation 都是现有 HITL1 research-access
capability 的扩展，不建立第二套网络/供应商能力系统。

### Modified Capabilities

- `research/research-access-adapter`: 生产 HITL1 从 Claude-specific search/fetch
  adapter 转为执行器中立的直接页面获取边界；现有 Claude adapter 仅保留其自身的
  launcher/canary 事实，不能为其他 Coding Agent 创造或拒绝操作权限。
- `engine/schema-core`: `research_access` 记录静态受限的双来源样本终态、观察结果和
  legacy compatibility。
- `research/pre-research-gate-implementation`: HITL1 Gate 使用 schema-valid 的当前
  observation，并把全无可取样本与当前可用但相关来源受限的反馈分开，不引入网络
  位置或 VPN verdict。
- `research/pre-research-phase-content`: HITL1 Phase actor-deliver 独立图谱、处理有界
  并发结果，并在需要时运行同一 HITL1 内的用户主导 access-alignment loop。
- `agent/hitl-ux`: HITL1 以中文说明相关来源的当前取用限制、用户可控的环境重试和
  接受当前限制后的继续，不新增默认问卷或固定重试轮数。
- `research/user-research-controls`: 用户明确的来源硬约束与“按当前取用范围继续”
  决定在既有 HITL1 controls snapshot 中保持可恢复，而不成为 Engine 解析的语义
  规则。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-access-adapter` | `openspec/specs/research/research-access-adapter/spec.md` | Modify | REA-001/002/003 已拥有 selected adapter、独立 controller、probe 顺序和 provider-scoped evidence boundary；本 change 取消其对生产 HITL1 的 Claude-only 前提并定义 execution-neutral direct retrieval boundary。 |
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` | Modify | SCO-001/002 已拥有 source-class enum 与 `research_access` Zod contract；新的中国/海外固定样本终态、直接取页 surface 类别与 legacy compatibility 需要同一可执行 owner。 |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md` | Modify | PRG-002/010 已拥有 HITL1 research-access admission 与 unavailable feedback。 |
| `research/pre-research-phase-content` | `openspec/specs/research/pre-research-phase-content/spec.md` | Modify | PRP-002/005/015 已拥有 HITL1 probe、profile writer 和 user-facing sequencing。 |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` | Modify | HIU-001/002 已拥有 HITL1 loop 和 exact access messages；新的相关性提示与用户响应属于该 interaction contract。 |
| `research/user-research-controls` | `openspec/specs/research/user-research-controls/spec.md` | Modify | URC-001/002 已拥有一次 durable controls snapshot 和用户来源语义；需保留用户最终接受的来源限制，而不升级成 Gate 语义。 |
| `agent/subagent-node-contract` | `openspec/specs/agent/subagent-node-contract/spec.md` | Verify-only | `shared-page-fetch-guidance.md` 已拥有 Wave work-unit 的跨宿主取页语义，但其 cache/receipt 义务不适用于 HITL1 isolated probe；本 change 不让 controller 复用或修改该 work-unit contract。 |
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md` | Verify-only | 既有 opaque controls snapshot 已提供合法 host-file coordinate；不新增 section、parser 或 Gate rule。 |
| `research/retrieval-access-atlas` | `openspec/specs/README.md` 与上述六份 main spec | Excluded | 样本图谱仅由现有 `research-access-adapter` 的独立 controller requires 链消费，不具备独立 Gate/Engine/module 边界，不另建 capability。 |

## Impact

- 目标 Markdown：独立 controller、HITL1 Phase/brief、generic probe guide、
  execution-neutral access boundary、Claude canary projection、profile guidance 与
  release surfaces。`shared-page-fetch-guidance.md` 继续服务 work-unit，不进入 HITL1。
- 可执行 contract：`schema/enums.mjs`、`schema/contracts/profile.mjs` 和
  `check-gate-hitl1-recorded.mjs`；不新增依赖。
- 治理事实目录：`research.host-access-envelope` 的有界问题将同步为当前固定样本的
  direct observation，并只把已验证的 legacy `access_boundary` 视为 boundary fact。
- 验证：schema、boundary resolver、CLI Gate、Markdown integration、deterministic e2e，
  以及现有 case-115 的 executor-scoped direct-fetch canary。真实运行仍可能是
  `NOT_RUN` 或 honest unavailable；单次 Claude 或 Codex 运行不能由 fixture 替代，
  也不能当作另一执行器的能力证明。
- 本 change 不修改用户的 VPN、系统网络设置、host 权限或任何生产 research evidence；
  不保存网页正文、动态候选 URL、凭据、IP/地理位置或历史网络画像。

## Design Boundary

**Semantic precision**：Phase Agent 要回答的有界问题是“最后一次中国/海外样本观察
是否与这个用户明确要研究的来源相关”，而不是从界面语言、IP、VPN 状态或某个
工具名推断用户意图。必须保留“直接取页观察”“用户来源语义”和“Gate 的结构化
admission”三者的区别。所有样本终态完成或用整轮预算诚实终止后，若没有语义相关
缺口，或用户已接受当前范围，推理自然停止并进入既有 silent path。

**最小控制形状**：移除搜索候选阶梯、首成功短路和 provider-specific binding，改为
一份独立 controller 的固定 URL 小批量观察与一次最终 profile observation；没有
retry history、后台轮询、网络画像、第二 Gate 或 adapter selector。用户调整环境后
才由 Agent 发起一次新的完整 round，旧 observation 被替换而不累积。

**责任边界**：用户决定是否调整其网络、改变来源语义或接受当前范围；Agent 在
已授权表面内执行一次有界直接取页并做相关性判断；Engine 只验证结构化 observation
与既有 HITL1 Gate，不判断来源相关性、网络位置、VPN 或未来稳定性。
