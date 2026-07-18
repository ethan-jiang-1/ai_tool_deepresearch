## Why

`experiments_playbook/` 的实验不是传统脚本测试。每个 case 必须由有智力的 Coding Agent 读取 Markdown playbook、执行真实命令、消费 Engine 反馈，并在需要时启动真实 Subject Agent/Sub-agent。历史入口依赖人在交互式 TUI 会话中陪同 Playbook Agent 长时间执行，难以批量发起、离场后审计和稳定复跑。

本 change 的目标不是建立一个能够替代 Agent 的“CLI runner”，也不是让普通 CI 直接执行 `agent_flow_e2e`。目标是建立 **Agent Experiment Autorun**：由确定性的 **Autorun Supervisor** 通过 `DPT_FRAMEWORK/host_tools/` 中的 Claude Code CLI launcher 启动一个真实 **Headless Playbook Agent**，仍由该 Agent 完整执行 playbook；Supervisor 只负责选择、启动、监督、验证 native completion、health、审计和安全清理。

`experiment-auto-runner` 只保留为这个既有 active change 的历史 locator；长期 capability slug、registry mapping、host/instruction filenames和文档术语全部使用 `experiment-agent-autorun` / Agent Experiment Autorun。

现有实现把这条边界写反了：`RUN_CLI_EXPS.md` 要求 Agent 跳过 playbook verdict，`run-experiment.mjs` 再从任意 trace `check` 重新裁决。真实审计已出现 Heavy real-Agent case 仅凭通用 queue `enqueue/save` checks 被错误标成 PASS。当前实现还存在 tier/weight 混用、manifest 不被 Supervisor 消费、权限 bypass flag 未真正启用、目录扫描猜 bundle、PASS+ISSUES 被清理、runner surface/test 漂移和 OpenSpec delta 无效等问题。

因此本 change 需要按正确术语和责任边界重新打开，而不是在现有双模式叙事上继续打补丁。

## What Changes

### 1. 统一术语和执行模型

- 能力名称统一为 **Agent Experiment Autorun**，capability slug 为 `experiment-agent-autorun`；现有 change 目录名 `experiment-auto-runner` 仅为 active change 的历史 locator，不再作为正典术语。
- **Autorun Supervisor**：确定性 host tool，选择 case、创建隔离 run root、调用 Agent CLI、监督进程、验证 native completion、运行 health、聚合和清理；不读取任意 checks 自行发明 playbook verdict。
- **Agent CLI Launcher**：`claude-deepseek.mjs`，负责配置并调用 Claude Code CLI；CLI 是启动智能体 runtime 的接口，不是实验执行者。
- **Headless Playbook Agent**：由 `claude -p` 启动，完整读取和执行单个 Markdown playbook，是 autorun 路径中的智能执行者。
- **Interactive Playbook Agent**：历史 TUI/manual replay 路径中的 Coding Agent，仅保留为单 case 调试和故障复现入口，不再与 autorun 并列为两个常规批量模式。
- **Subject Agent/Sub-agent**：Heavy case 内可选的、真正被测试的额外 Agent actor，与 Playbook Agent 不混称。

### 2. 精确命名 runner surfaces

- `experiments_playbook/PLAYBOOK_MANIFEST.md`：机器可核对、Autorun Supervisor 实际消费的 active playbook path/order 注册表；case/group、verdict/check policy、stable bundle/verdict/health roles 和 verification-aligned proof profile 从 V2 frontmatter读取，cost 从 filename读取，避免在 manifest 重抄。
- `experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md`：注入 Headless Playbook Agent 的单 case autorun 协议，替代含混的 `RUN_CLI_EXPS.md`。
- `experiments_playbook/RUN_INTERACTIVE_EXPS.md`：Interactive Playbook Agent 的单 case manual debug/replay 协议，替代把 TUI 当长期批量模式的 `RUN_TUI_EXPS.md`。
- `DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs`：Autorun Supervisor 入口，替代含混的 `run-experiment.mjs`。
- 旧文件名不得作为第二套 active instruction/runner surface 保留；所有消费者和 tests 同轮迁移。

### 3. 保留 Agent 智力和 playbook native verdict

- Headless Playbook Agent 必须执行 playbook 的全部 verdict-affecting Markdown flow，包括非 bash 的 Agent/Subject-Agent step、反馈读取、repair、NOT_RUN 和 native verdict。
- 新增统一的 native playbook completion contract。每个 autorun-compatible case 必须由自己的 verdict step 通过确定性 helper/CLI 写出唯一 completion，至少绑定 run/case/source-playbook/rendered-playbook digests、outcome（PASS/FAIL/NOT_RUN）、frontmatter verdict mode/required check IDs、considered checks、judge provenance 和 active bundle roots。PASS/FAIL 只能由 finalizer 从 trace checks 计算，且缺少 case-owned required check 是 ERROR；Agent不能通过参数自报 PASS。
- Autorun Supervisor 只验证并聚合这个 native completion；任意通用 `check`、partial trace、Agent narrative、console PASS 或 Supervisor 自行重算都不能替代它。
- “所有 playbook 不修改”不再是 non-goal。允许为统一 native completion 和 autorun isolation 做最小、机械、可验证的 playbook contract 迁移；不得改写 case 的机制步骤或证明含义。

### 4. 单一 manifest、隔离和安全清理

- Supervisor 从 `PLAYBOOK_MANIFEST.md` 选择和排序 active path；filesystem/frontmatter/filename 读取只解析该注册项并验证一致性，不扫描补入未注册 case。
- `--tier` 使用 filename 的 `light|standard|heavy` execution cost。将 current playbook frontmatter 升为 `command-experiment/v2`：退役 `weight`、`runner`、静态 `bundle`/`trace` glob 和 `verdict` selector；加入独立 `verdict_mode`、`health_profile` 及与 verification-routing 同词汇的 proof/subject/fixture/external/judge profile。Playbook Agent 身份来自执行路径，Subject Agent 证明来自 case proof profile，不能互相冒充。
- 每个 case 使用 Supervisor 拥有的唯一 run root 和 schema-valid run context；Headless Agent以validated repo command root为固定cwd，使现有repo-relative framework/experiment命令仍调用原始source。Run context分别绑定repo command root、repo-root `DPT_FRAMEWORK/` 和case run root；`.exp-bundles/`只保存run-owned workspace/record/log，不复制、symlink或hardlink `DPT_FRAMEWORK/`、`experiments_env/`、`tests/`。Autorun-compatible playbook使用strict runtime tokens；Supervisor只做allowlisted、shell-quoted deterministic substitution，生成并digest-bind rendered playbook，把context/case-root作为显式CLI参数传给creator/finalizer/state path，不使用env、不让Agent临场重写命令。所有bundle、playbook state、case-local诊断和completion都必须containment-valid；禁止扫描repo root猜bundle、禁止信任越界`BUNDLE=<path>`、禁止删除run root之外路径。
- Native completion 声明当前 case run root 下的全部 bundle、唯一 verdict trace 和 required health targets；target profile必须等于 selected playbook显式 `health_profile`。Supervisor 只按声明运行 health，并用 containment scan检查未声明 bundle。
- 只有 Headless effective PASS + 全部 required health CLEAN + `--cleanup-pass` + outside-root durable evidence 才删除整个 case run root。清理前必须在 `.exp-bundles/_logs/` fsync固化精确 injected prompt、sanitized structured Agent transcript和stderr，并在`.exp-bundles/_evidence/`导出每个completion-declared bundle的exact verdict-boundary trace-prefix bytes（missing为显式null）；`agent_behavior` PASS还必须导出completion声明且hash验证的Subject Agent prompt/task/transcript/result/receipt/output/judge evidence。随后在`.exp-bundles/_audit/agent-experiment-runs.jsonl` fsync包含full native completion、full health、process/outcome、run identity/digests和durable log/trace/Subject-evidence byte/hash refs的case record；batch report位于`.exp-bundles/_reports/`。Interactive v1不接受cleanup并保留真人/诊断现场。FAIL、NOT_RUN、ERROR、CANCELLED、HUMAN、HEALTH ISSUES/ERROR保留可用现场或明确记录无bundle原因。旧`_run_log.jsonl`/`_temp/exp_verdicts.jsonl`退为历史数据，不成为第二套薄结果面。v1不自动采用safe-cleanup exception；有预期health issues的PASS诚实保留。

### 5. Agent runtime、Human/AI judge 与 CI 边界

- Supervisor 通过 Agent CLI Launcher 启动真实 Headless Playbook Agent，并使用真正生效的 non-interactive permission mode；approval request、timeout、nonzero Agent process 或缺失 completion 均 fail closed 为 ERROR。
- Headless非dry-run要求显式batch USD budget，可选更小per-case cap；Supervisor把当前允许值传给Claude `--max-budget-usd`，从final stream result累计实际cost。Budget耗尽或cost不可判定时停止后续launch并以明确infrastructure reason报告，不能把cost状态混入native verdict。
- 901–949 real-human case 保留为 manual/Interactive evidence，Autorun Supervisor 跳过并标记 HUMAN；950–999 AI-judge dual 可 autorun，但不得替代或删除 real-human evidence，必须保留 `source: ai-judge` 区分。
- 普通 CI/node:test 不能替代 Headless Playbook Agent。CI host 只有在显式提供真实 Agent CLI runtime、模型凭据和工具能力时，才可以发起 Autorun；此时 CI 只是 host，不是 `agent_flow_e2e` 的执行者或 verdict authority。

### 6. 上升为 command experiment 正典

- 在 apply 阶段更新 `guidelines/command-experiments.md`：加入上述正典术语、Interactive → Agent Autorun 迁移模型、Supervisor/Playbook Agent/Subject Agent/Engine 四层边界、native completion、manifest、CI 边界和 cleanup 规则。
- 同轮更新 `experiments_playbook/README.md`、host-tools README、accepted runner consumers 和 focused tests，删除旧 CLI/TUI 双模式叙事。

## Capabilities

### New Capabilities

- `experiment-agent-autorun`：通过 Agent CLI 启动真实 Headless Playbook Agent 的实验 autorun 能力；Supervisor 只拥有确定性 host lifecycle，不拥有 playbook 智力或 native verdict。

### Modified Capabilities

- `playbook-runner`：把统一 runner entry 从历史 `RUN.md`/`RUN_EXPS.md` 漂移收敛为 manifest + Agent Autorun instruction；Interactive surface 降为 debug/replay，保留 Agent-driven 执行和 native verdict。
- `agent-testing`：退役 frontmatter `weight` requirement；cost 由 filename grammar 拥有，active registration/order 由 manifest 拥有，避免第三份 cost truth。
- `experiment-observability`：health profile 和 Autorun Supervisor report 使用正典 manifest/native outcome 术语，移除 `RUN_EXPS` 绑定。
- `pre-research-experiments`：按稳定 proof role 清理 stale test/RUN/weight/trace/cleanup authority，统一 manifest、V2 proof profile、Headless/Interactive 与 topic-review judge 语义。
- `trace-writer`：active experiment knowledge surfaces 改为 manifest + Agent Autorun/Interactive instructions，不再把 `RUN_EXPS` 写成 trace migration owner。
- `verification-routing`：修正既有 `agent_flow_e2e` actor/native-completion/explicit-cleanup contract，并新增窄 actor/host terminology requirement，明确 Autorun Supervisor、Playbook Agent、Subject Agent 和普通 CI fixture 的 proof permission，不改四类 taxonomy。
- `agentic-queue`：把当前 queue command experiments 从旧 `test-*`/playbook-local cleanup 收敛到 manifest/V2/native completion/Supervisor cleanup，并移除已不存在的 seed-topics legacy path authority。
- `research-wave-experiments`：把 Wave review/event/reference/timeout experiment requirements迁到当前 manifest roles、Playbook Agent ownership、root trace/native completion和Supervisor cleanup，移除 legacy `_trace.jsonl`/`test-*` path authority。
- `pre-research-gate-implementation` / `research-wave-gate-implementation`：把历史 dual-trace requirement 改为单一 bundle-root trace 中 gate-attempt 与 playbook-owned verdict-check 的事件 ownership 分离。
- `seed-topic-materialization`：把 STM-005 从已不存在的 legacy `test-simple-*` path迁到 current case-124 + V2/native completion。
- `local-deepseek-claude-launcher`：保留 generic launcher透明入口与 `.env` authority，新增共享 pure invocation contract供 Supervisor直接拥有 Claude child lifecycle，并明确 Autorun/Interactive permission差异。

## Direct Source of Record And Shortest Legal Loop

```text
PLAYBOOK_MANIFEST.md active path/order
  -> Autorun Supervisor selects one case
  -> Agent CLI starts one Headless Playbook Agent
  -> Agent executes the Markdown playbook and Engine checkpoints
  -> deterministic finalizer writes one native completion from declared bundle/trace facts
  -> Supervisor validates completion + declared health targets
  -> report, preserve, or containment-safe cleanup
```

直接 Source of Record：manifest 拥有 runnable path/order；V2 frontmatter 拥有 case/group、verdict mode/required checks、stable bundle/verdict/health role policy、health profile与 proof/subject/fixture/external/judge profile；filename 拥有 execution cost；playbook 拥有 case Agent Flow；bundle trace/runtime files 拥有执行事实；native completion 把 V2 policy 绑定到本次实际 outcome、role→path、trace/evidence bytes；health report 拥有独立健康诊断。Supervisor report只是聚合 projection。

Net simplification：删除“CLI mode/TUI mode”含混术语、删除 Supervisor 第二套 raw-trace verdict、删除 filesystem bundle guessing、用 V2 删除 frontmatter 重复 routing/static runtime metadata、删除 manifest 重抄 derived facts、删除两个并列批量 instruction surface、停止 Human evidence 删除路线。新增的 deterministic run-context/native-completion contract 替代而不是叠加现有多种 bundle/verdict/Supervisor reinterpretation。

## User / Agent / Engine Responsibility

- 用户决定运行范围、是否启用 PASS cleanup，以及是否进行 real-human judgment。
- Autorun Supervisor 执行已授权的机械选择、启动、监督、验证、报告和 containment-safe cleanup。
- Headless/Interactive Playbook Agent 执行 Markdown Agent Flow、读取反馈、调用工具、修复和完成 case。
- Subject Agent/Sub-agent 只在 case 明确需要时承担被测智能工作。
- Engine/CLI 负责 schema、gate、receipt、trace 和 native completion 的确定性事实检查。

## Versioning

本 change 修改 `DPT_FRAMEWORK/host_tools/` 的正式行为和入口名，需要 framework version bump 到 **v0.34**。Apply 必须更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Impact

- OpenSpec：重写本 change 的 proposal/design/spec/tasks，补 `verification-plan.yaml` 和checked 97-case `case-compatibility-ledger.yaml`，把现有 35/35 状态重新打开。
- Framework：重命名并重构 Autorun Supervisor；复用 Agent CLI Launcher env 模块；新增/复用 native completion deterministic helper。
- Playbooks：为 autorun-compatible case 做最小 native completion/isolation 迁移；恢复并保留 real-human/AI-judge 双方语义。
- Guidance/docs：更新 `guidelines/command-experiments.md`、`experiments_playbook/README.md`、host-tools README，迁移所有旧名和错误术语。
- Project configuration：更新 `openspec/config.yaml` 的 Experiments/verification routing/命名说明，使高频项目上下文使用同一正典术语，并由 focused static guard 防止回漂。
- Main-spec convergence：只通过本 change 的 delta specs 修改 accepted behavior，包括审计发现的 `verification-routing` unconditional cleanup、`agentic-queue` playbook-local cleanup/legacy path和`research-wave-experiments` legacy trace/runner ownership；apply 不直接发明 main-spec wording，archive/sync 后让 main specs 与 delta 一致。
- Tests：补 Supervisor focused negative tests、manifest drift contract、native completion contract，以及至少一个真实 Headless Playbook Agent autorun canary。
- 不新增 npm 依赖；不把 Markdown Agent Flow搬进 JS；不声称普通 CI 可以替代 Agent runtime。
