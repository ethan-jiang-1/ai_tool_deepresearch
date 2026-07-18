## Context

历史 command experiment 由 Interactive Playbook Agent 在 TUI 会话里读取 runner instruction 和 case playbook，逐步执行真实 bundle/Engine/Agent flow，再从 trace 形成 verdict。目标是减少人类陪跑：由 host tool 调用 Claude Code CLI，以 headless 方式启动同类 Coding Agent。

当前 change 把“启动方式自动化”误写成“JS Runner 接管编排和裁决”，造成四类混淆：

1. 把 Claude Code CLI（Agent runtime 启动接口）和传统 deterministic CLI/test runner 混为一谈。
2. 把 Autorun Supervisor 与真正执行 Markdown 的 Playbook Agent 混为一谈。
3. 把 Playbook Agent 与 Heavy case 内的 Subject Agent/Sub-agent 混为一谈。
4. 把 outer aggregation 与 native playbook verdict 混为一谈。

真实审计已经证明第四类混淆会造假：Heavy case 在 real Agent evidence 尚未产生时，仅凭 queue engine 的通用 `enqueue/save` checks 被 Supervisor 标成 PASS。因此本轮不是文档润色，而是 contract-class correction。

本 design paired-read：

- `guidelines/evolution-simple-reliable-control.md`：质量控制必须比被验证工作简单；直接 authority、一个 truth path、fail clearly、无双重 validator。
- `guidelines/evolution-helper-oriented-agent.md`：Agent 在已有授权内执行机械/智能工作，Engine 只裁确定性 truth；不能把 Agent 能力移交给通用 controller。
- `guidelines/command-experiments.md`：Markdown playbook 是 Agent Flow 控制面，outer runner 只能聚合，不能 reinterpret native verdict。

本 change 的 `feasibility-audit.md` 记录 2026-07-18 对 97 个 current playbook 的 creator/verdict/health/state/cleanup 特殊形状审计。它是 apply compatibility ledger 的基线，不是 implementation evidence。

## Canonical Terminology

| Term | Canonical meaning | Must not be called |
|---|---|---|
| Agent Experiment Autorun | 无需人在 TUI 陪跑、但仍由真实 Agent runtime 执行的整项能力 | traditional CLI test, CI runner |
| Autorun Supervisor | host-side deterministic lifecycle supervisor | brain, playbook executor, verdict judge |
| Agent CLI Launcher | 配置并调用 Claude Code CLI 的 host tool | experiment runner |
| Headless Playbook Agent | `claude -p` 启动、读取并执行 Markdown playbook 的智能体 | shell worker, hands |
| Interactive Playbook Agent | TUI/manual replay 中执行同类 playbook 的智能体 | second production mode |
| Subject Agent/Sub-agent | Heavy case 内被测试的额外智能 actor | Supervisor, Playbook Agent |
| Native playbook completion | playbook verdict step 基于 runtime truth 产出的完成事实 | Supervisor summary, arbitrary trace checks |

正典迁移图：

```text
Interactive path (manual debug/replay)
Human -> Interactive Playbook Agent -> Markdown -> Engine -> native completion

Agent Autorun path (normal)
Human/host
  -> Autorun Supervisor
  -> Agent CLI Launcher / Claude Code CLI
  -> Headless Playbook Agent
  -> Markdown playbook
  -> Engine checkpoints (+ optional Subject Agent/Sub-agent)
  -> native completion
  -> Supervisor validation + health + report/cleanup
```

两条路径共享同一个 Markdown/Engine/native-completion contract；区别只是 Playbook Agent 的启动表面。它们不是“Agent mode”和“script mode”。

## Goals / Non-Goals

### Goals

- 建立精确且跨 proposal/spec/guideline/docs/code/tests 一致的 Agent Autorun 术语。
- 让 `run-agent-experiment.mjs` 只做 deterministic host supervision，通过 Agent CLI 启动真实 Headless Playbook Agent。
- 保持 Markdown playbook 对单 case Agent Flow 的 ownership。
- 建立一个 universal deterministic finalizer/native completion handoff，禁止 Supervisor 从 partial/arbitrary checks 重判 verdict。
- 让 manifest 只拥有实际消费的 runnable path/order；V2 frontmatter 拥有 case/group、native policy和 verification-aligned proof profile，filename 拥有 cost，并对交叉 drift fail closed。
- 隔离每个 case run root，验证所有 bundle/result/cleanup path containment。
- 明确 native PASS/FAIL/NOT_RUN、lifecycle HUMAN/ERROR/CANCELLED、process、health 和 cleanup 的正交语义。
- 把 Interactive surface 降为 manual debug/replay；保留 real-human evidence。
- 用真实 Headless Playbook Agent canary 证明 Agent runtime 路径；该 fixture-backed Light case 只证明 deterministic Autorun contract，不用 fixture subprocess overclaim Headless execution，也不把 Playbook Agent participation overclaim 为 Subject Agent behavior。

### Non-Goals

- 不让普通 CI/node:test 替代 Agent runtime。
- 不把 playbook Markdown 解析成 JS workflow engine。
- 不让 Supervisor 选择 repair、Agent action、Subject Agent dispatch 或 semantic verdict。
- 不修改研究 Engine/gate/schema/phase 行为，除非 native completion 需要一个狭窄、实验专用的 deterministic helper/contract。
- 不新增 daemon、watcher、resume state tree、generic scheduler 或并发执行。
- 不借 autorun 删除 real-human case 或把 AI judge 当真人。
- 不保留旧新两套 active instruction/host entry 造成永久兼容分叉。

## Decisions

### Decision 1: 能力叫 Agent Experiment Autorun，不叫 CLI Mode

**选择**：能力 slug 使用 `experiment-agent-autorun`；模式语义使用 `headless_agent` / `interactive_agent`；“CLI”只用于 `Agent CLI Launcher` 或用户实际调用的命令行接口。

Active change locator `experiment-auto-runner` 仅作为本次已存在 OpenSpec work item 的历史 ID保留到 archive，不是 capability/command/doc术语，也不允许被实现或main spec消费。Accepted capability、registry mapping和所有长期文件名使用新术语。

**原因**：TUI 和 headless 路径都由 Coding Agent 执行。CLI 是启动 transport，不是 execution intelligence。`CLI Mode` 会把真实 Agent runtime 错读成普通 CI/script execution。

**文件名**：

- `RUN_AGENT_AUTORUN_EXPS.md`
- `RUN_INTERACTIVE_EXPS.md`
- `run-agent-experiment.mjs`

旧 `RUN_CLI_EXPS.md`、`RUN_TUI_EXPS.md`、`run-experiment.mjs` 在本 change archive 前退出 active surface。由于新能力尚未归档接受，不增加长期 compatibility shim。

### Decision 2: Supervisor supervises; Playbook Agent executes

**Supervisor owns**：manifest selection、per-case run root、Agent CLI spawn、timeout/process outcome、completion validation、health invocation、audit/report、containment-safe cleanup。

**Headless Playbook Agent owns**：完整读 playbook、按序执行 bash/inline JS、执行显式 Agent step、读取 Engine feedback、选择合法 repair、启动 case 所需 Subject Agent/Sub-agent、运行 native verdict step。

**Engine owns**：结构化检查、trace、receipt、gate、native completion schema/checking。

Supervisor 不读取 Markdown step 来执行 workflow，也不因“Agent 可能 hallucinate”建立第二套 verdict。防 hallucination 的正确做法是确定性 native completion，而不是绕过 playbook verdict。

### Decision 3: One deterministic finalizer/native completion replaces all outer reinterpretation

新增：

- `DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs`：Playbook Agent 在 case 的 verdict boundary 调用；从显式 bundle/trace inputs 计算 native outcome 并写 completion，不做 Agent Flow。
- `DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs`：manifest/completion Zod contracts、pure evaluator、digest/containment helpers，供 finalizer、Supervisor 和 tests 复用。

每个 autorun-compatible case 必须用 finalizer 产出一个 native completion。Supervisor 在 launch 前写入并保留一份 expected run context；finalizer 必须显式接收该 context path，不允许 Agent 用 `--outcome PASS` 之类参数自报成功。

Completion target在launch前必须不存在。Finalizer先在同目录写入并fsync唯一temp regular file，再用same-filesystem atomic `link(temp, fixed-target)`作exclusive publish；target已存在即contract ERROR，publish后unlink temp并fsync parent。不得用会覆盖既有target的plain rename，也不得直接写入最终文件造成partial completion可见。

Finalizer CLI v1固定为 repeatable path flags；下面的 `{{RUN_CONTEXT_SH}}` / `{{CASE_RUN_ROOT_SH}}` 是source playbook中的allowlisted runtime tokens，Supervisor在launch前替换为POSIX-shell-quoted absolute path，Agent实际看到的是rendered command而不是literal token：

```bash
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs \
  --context {{RUN_CONTEXT_SH}} \
  --bundle "verdict=$B" \
  --bundle "fault-aux=$AUX"
```

`--bundle <role>=<path>`只把本次实际created bundle绑定到case-local stable role；`--evidence <role>=<file>`只把本次Subject evidence文件绑定到V2要求的evidence role。Bundle/health/verdict roles使用`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`，durable evidence roles使用`^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`；role/path分隔只认第一个`=`且empty/duplicate/unknown role全部拒绝。V2 frontmatter独立拥有exact ordered `bundle_roles[]`、唯一`verdict_role`和非空ordered `health_roles[]`（health是bundle-role subset且包含verdict role），Supervisor把这份policy写入独立expected context。数组顺序只用于canonical completion/audit serialization，不改变authority；CLI flag、registry object或filesystem iteration顺序均不得选择verdict/health。正常完成不接收outcome/verdict/health选择参数，finalizer按context policy计算PASS/FAIL；NOT_RUN仅加`--not-run-reason <non-empty>`，可以无bundle，也可声明policy role的partial subset。CLI不接受case、completion target、outcome、mode、profile、judge、allowed bundle/verdict/health role或required evidence-role override。

目标最小 completion contract：

```json
{
  "schema_version": "agent-experiment-completion/v1",
  "run_id": "...",
  "case": "case-41-light-minimal-path",
  "run_context_sha256": "...",
  "instruction_sha256": "...",
  "source_playbook_sha256": "...",
  "rendered_playbook_sha256": "...",
  "outcome": "PASS",
  "verdict_mode": "all",
  "checks_total": 4,
  "checks_considered": 4,
  "considered_checks": [
    { "gate": "enqueue", "passed": true, "expected": true }
  ],
  "durable_evidence": [],
  "verdict_role": "verdict",
  "bundles": [
    {
      "role": "verdict",
      "path": ".exp-bundles/runs/<batch-id>/<case-run-id>/dpt_disp_case-41_...",
      "trace_prefix_bytes": 6412,
      "trace_event_count": 27,
      "trace_prefix_sha256": "...",
      "trace_parse_status": "valid",
      "health": { "required": true, "profile": "light" }
    }
  ]
}
```

具体 schema/字段在 apply 中用 Zod 锁定；跨字段至少保证：

- outcome 为 `PASS|FAIL|NOT_RUN`；HUMAN/ERROR/CANCELLED 由 host lifecycle 产生，不伪装成 playbook verdict。
- case 与 selected manifest identity 完全一致。
- `bundles[]` 按stable role列出 run root 下全部 `dpt_disp_*`/explicit production-path experiment bundle，且role/path各自唯一、全部 containment-valid；Supervisor scan 只用于发现未声明 bundle contamination，不用于猜 authority。
- `verdict_role` 和required health roles必须逐字来自context-bound V2 policy，不能由finalizer caller选择。PASS/FAIL要求actual bundle roles与policy exact match，并由 finalizer 从policy verdict role的非空 check set 计算；finalizer 不接受 caller-supplied PASS/FAIL。NOT_RUN 必须有 reason，可在尚无 bundle 时完成，实际bundle roles只能是policy subset，不能当 PASS。
- Verdict evaluator只接受完整trace中strict playbook-owned verdict checks：`event:"check"`、`source:"playbook"`、符合stable ID grammar的`gate`，以及显式boolean `passed`/`expected`；普通Engine/queue check、缺字段legacy event、console/narrative不进入considered set。`verdict_mode: all`按trace顺序考虑全部accepted verdict checks；`last`按每个gate保留trace中最后一条（repair-loop语义）。`checks_total`是accepted verdict-check总数，`checks_considered`和`considered_checks[]`是mode投影，不能把所有trace events混入计数。
- V2 `required_checks[]` 是playbook-owned最小完成证据集合，stable ID grammar固定为`^[a-z][a-z0-9]*(?:(?:[-_:])[a-z0-9]+)*$`。Finalizer要求每个required ID至少一次出现在considered set，防止 Headless Agent提前调用 finalizer时通用 queue checks再次造出 Heavy PASS。它检查presence和每个considered row的`passed === expected`，不从`detail`解释语义；`all`任一mismatch为FAIL，`last`任一last-per-gate mismatch为FAIL。
- selected playbook frontmatter 独立声明 `health_profile: light|standard|heavy`。Completion 只声明哪些 bundles 是 required health targets；target profile 必须等于该 policy。Filename cost 描述执行成本，不能兼任 health profile（例如 Heavy real-Agent HITL case 可以合法使用 Light health）。
- completion 必须绑定 V2 proof profile；901–999 pair 还必须与 `real_human|ai_judge` band一致，AI-judge verdict check 使用结构化 provenance，不依赖 detail prose 搜索。
- V2 `durable_evidence_roles[]` 是cleanup survival policy：`deterministic_contract`为空；`agent_behavior`为case-ledger规定的非空roles。Agent-behavior PASS/FAIL completion必须用`durable_evidence[]`逐role声明containment-valid、non-symlink regular file及bytes/sha256；NOT_RUN可因actor unavailable而缺省。Finalizer不能从outer transcript或check detail伪造Subject evidence。
- Completion `bundles[]`、required health projection和`durable_evidence[]`分别按V2 `bundle_roles[]`、`health_roles[]`和`durable_evidence_roles[]`顺序canonicalize；NOT_RUN只过滤未出现的policy roles而保留相对顺序。调用参数、registry JSON或directory enumeration order不进入digest语义。
- `agent_flow_e2e` 的verdict authority bundle保持fresh `dpt_disp_*`。case-73/102这类production-instantiator contract另创建一个同case-root fresh `dpt_rb_*` subject/auxiliary bundle；production CLI/runtime facts从该bundle读取，但case-owned required checks写入`dpt_disp_*` verdict trace。两者都在completion声明并接受health；该`dpt_rb_*`不是separately selected live production run，不能被报告成live-production evidence。
- completion 只能由 playbook verdict helper/CLI 从 runtime facts 写出，不能由 Agent narrative 或 Supervisor手写。
- finalizer 对合法 PASS、FAIL、NOT_RUN 都在 atomic completion 写成后 exit `0`；只有 schema/input/path/digest contract failure 才 nonzero。这样 native FAIL 不会被 Supervisor 错分成 Agent process ERROR。

每个 declared bundle 使用 `trace_prefix_bytes + trace_prefix_sha256` 绑定 verdict boundary 时 `rb_trace.jsonl` 的 exact raw bytes，并记录 `trace_parse_status: valid|invalid|missing` 和 nullable `trace_event_count`。Supervisor按 byte length截取同一 prefix并核对 digest。Verdict bundle必须是完整、newline-terminated、无空/partial/malformed record的 valid JSONL且包含非空 check set；required health target也必须 valid。非 health auxiliary故障注入 bundle可以显式 invalid/missing但仍受 raw digest绑定（case-135 的 corrupt-trace auxiliary即属此类）。Health verifier只对 valid required targets运行并可追加 non-verdict diagnostic event；合法 append不使已验证 prefix失效，也不能改变 native outcome。

Finalizer 解决的是“completed native verdict handoff”，不声称通用 JS 可以证明 Agent 忠实执行了每个语义步骤。Playbook Agent 仍是 flow executor；source/rendered playbook digests、唯一 finalizer boundary、真实 Headless canary 和 preserved Agent log用于证明/审计执行路径，而不是再造一个 Markdown workflow parser。

迁移策略：97 个 current case 中已核对 62 个走两类共享 verdict helper、35 个使用 custom verdict。Apply 先让共享 helpers 委托 finalizer，再按 family 分批迁移 35 个 custom cases；每批不超过 10 个。未产生合法 completion 的 case 在 Autorun 中为 ERROR/unsupported，绝不 fallback 到 raw trace 推断。

### Decision 4: Manifest owns registration/order; identity and cost stay at their direct facts

`PLAYBOOK_MANIFEST.md` 只拥有 active relative path 和稳定顺序。唯一机器段格式固定为：

```markdown
<!-- agent-experiment-manifest:v1 -->
| Path |
|---|
| `exp_gate-fork/case-11-light-four-returns.md` |
<!-- /agent-experiment-manifest -->
```

Markers各恰好一次；表头只允许 `Path`，row order即执行顺序，每 row只有一个 repo-relative POSIX path。Marker外可有人类说明但不能有第二份 runnable table/JSON projection。Parser拒绝 absolute/traversal/backslash、duplicate、symlink/non-regular/stale path和marker/table形状漂移。

Selected path 的其他直接 facts（`command-experiment/v2`）：

- case/group：playbook frontmatter `case` / `experiment`；
- native policy：frontmatter `verdict_mode` / `required_checks[]` / exact `bundle_roles[]` / `verdict_role` / `health_roles[]` / `health_profile`；
- proof profile：frontmatter `proof_subject` / `subject_execution` / `fixture` / `external_calls` / `verdict_judge`，词汇和跨字段约束对齐 accepted `verification-routing`；
- cost：filename `case-<id>-<light|standard|heavy>-...md`；
- human/AI judge：frontmatter `verdict_judge` + 9NN band/pair + structured trace provenance。

现有 `command-experiment/v1` 把 `weight` 当第二份 cost，把 `runner: coding-agent` 当恒定角色，还用 static `bundle`/`trace` glob、`verdict` selector及松散 `execution/evidence/agent_mode/agent_dependency`描述不同维度。V2是 strict closed schema：identity/goal + stable native policy（包括roles但不包括paths）+ accepted verification profile，optional只允许 req refs和非权威 `not_run_if`。Native completion拥有本次 runtime role→path/outcome binding，执行路径拥有 Playbook Agent角色，proof profile明确 Subject Agent/fixture/runtime/external/judge语义。

Filesystem/frontmatter validator 负责：

- manifest path entry 指向真实 regular file；
- 每个 runnable `case-*.md` 恰有一个 active manifest entry；
- case identity 与 filename stem 一致，group 非空，filename cost、verdict mode、health profile及 verification proof profile 合法；
- frontmatter 不再包含 active V1 `weight`、`runner`、`execution`、`evidence`、`bundle`、`trace`、`verdict`、`agent_mode` 或 `agent_dependency` metadata；
- 901–949 必须显式 `verdict_judge: real_human`，950–999 必须显式 `verdict_judge: ai_judge`，并与 pair/trace provenance一致。

这样只有一个 selection truth。目录 scan 不再默默纳入 manifest 未注册 case，也不另立排序和 tier 规则。

### Decision 5: Per-case Supervisor-owned run root, no bundle guessing

每个 batch 使用 `crypto.randomUUID()` 生成 batch id；每个 selected case 创建 `.exp-bundles/runs/<batch-id>/<ordinal>-<safe-case-id>-<uuid>/`，不依赖一位 hex suffix承担 case-root collision safety。这个目录正典名为 **case run root**，其中的 direct-child `dpt_disp_*|dpt_rb_*` 才是一个或多个 **bundle roots**，不能把两层都简称 bundle。Supervisor 在 case run root 固定写 `agent-experiment-run.json` (`agent-experiment-run/v1`)，绑定 execution mode、selected manifest/path + source digest + rendered digest、injected instruction path + digest、case/group、filename cost、V2 native/proof policy、`repo_command_root`、`framework_root`、case run root 和固定 sibling `agent-experiment-completion.json`。`framework_root` 必须 realpath 等于 `<repo_command_root>/DPT_FRAMEWORK`；repo root下的 `experiments_env/` 也是source/tool surface，不是run data。Supervisor在内存保留 expected object/context digest、case-root realpath + device/inode identity和source/rendered bytes/digests；completion回写context/instruction/source-playbook/rendered-playbook digests，不能把可被child改写的context当唯一authority。

Headless Agent固定以validated `repo_command_root`为cwd；这不是runtime truth位置，而是让current corpus的repo-relative `node DPT_FRAMEWORK/...`、`experiments_env/...`和relative imports继续指向唯一原始source。`.exp-bundles/`下 **不得**复制、symlink或hardlink `DPT_FRAMEWORK/`、`experiments_env/`、`tests/`或其他repo source tree。固定repo cwd不被描述为containment或sandbox：真正的mutation/cleanup authority仍来自显式case-run-root contract和path validation。

Source playbook只允许三个runtime tokens：`{{RUN_CONTEXT_SH}}`、`{{CASE_RUN_ROOT_SH}}`、`{{PLAYBOOK_STATE_DIR_SH}}`。每次出现必须位于Markdown `bash|sh` fenced code block内，并在source中作为未加single/double/backtick quote、未与其他字符拼接的独立shell word；frontmatter/prose/其他language fence、quoted word、heredoc payload或`$TOKEN/suffix`式拼接均拒绝。每个autorun-compatible source至少出现一次context token（finalizer）和case-root token（creator/preparation）；state-dir token按case需要可为零或多次。Supervisor先验证fence/token vocabulary/count/lexical placement，再把每个token literal替换为一个标准single-quote POSIX shell word（path内`'`按`'"'"'`编码）的absolute value；拒绝unknown/unresolved token、source中hard-coded run path和render后新增token。Rendered bytes连同source bytes各自digest-bind到context/completion和durable prompt。这个render只识别fence边界和runtime binding token，不解析Markdown step、不执行workflow、也不产生verdict。

所有动态bundle path必须通过case-local `_playbook_state/bundles.json` 按V2 stable role持久化，不得依赖shell export、`B= # populated from Step 1`的conversation memory或filesystem latest scan。新增窄CLI `agent-experiment-state.mjs register-bundle|get-bundle`：显式接收context和role，先要求context本身是non-symlink regular file，并把其validated real parent（而不是context内可变的root/target字段）作为唯一case-root坐标；registry固定为该parent的`_playbook_state/bundles.json`。register先以`open(...,'wx')`取得固定`_playbook_state/bundles.lock`；lock已存在（并发或前次崩溃）即fail closed，不做自动stale-lock恢复。持锁后验证role属于context policy、direct-child naming/realpath containment/non-symlink，在Supervisor预建的registry上以temp-file+fsync+atomic rename执行read-modify-write，禁止覆盖既有role或把同一路径绑定第二role，但不是禁止替换registry文件本身；最后unlink lock并fsync state directory。get依靠atomic registry snapshot只返回已注册path。Finalizer同样只能把completion写到context parent的固定`agent-experiment-completion.json` sibling，并要求context字段中的root/target与这些derived coordinates相等；context mutation只能导致contract ERROR，不能改变写入authority。它们是跨tool-call path handoff/completion helper，不是bundle/verdict/cleanup authority。PASS/FAIL finalizer要求CLI role→path、registry、context V2 exact role policy和observed directories exact match；NOT_RUN要求三者actual set相互exact且为policy subset。Supervisor仍用independent expected context和scan验证。

Playbook migration仍须把16个`/tmp` handoff迁移到`{{PLAYBOOK_STATE_DIR_SH}}`或bundle内，让bundle creator/fixture/preparation helper显式接收`--target-dir {{CASE_RUN_ROOT_SH}}`，创建后立即register stable role，后续block显式get role，让finalizer显式接收`--context {{RUN_CONTEXT_SH}}`和role-bound bundles，并删除playbook-local health/cleanup。不得让production creator或helper从cwd/env/chat/“latest run”猜context；它们保留ordinary invocation contract，并在Agent Experiment rendered path中只消费显式target。Current repo-relative source commands/imports可以保留，不进行94-case无意义绝对路径重写。

Supervisor 不扫描 repo root 或全局 `.exp-bundles/` 猜“最新 bundle”，不信任未校验的 `BUNDLE=<path>`。支持一个 case 多 bundle；native completion 明确声明所有 bundle roots。Cleanup 只删除当前 Supervisor-owned run root 或其中经 containment 验证的 bundle。

Observed-bundle completeness scan只枚举 current case run root的direct-child directories，匹配 `dpt_disp_*|dpt_rb_*`，拒绝symlink并以realpath containment复核；这与creator naming contract一致。每个observed path必须在completion恰好一次，每个declared bundle也必须是这种observed direct child。`_playbook_state`/`_diagnostics`/context/completion不是bundle，scan不把任意目录猜成authority。Supervisor在completion validation、health和cleanup前还必须重新lstat/realpath case root并与创建时的non-symlink directory device/inode identity一致；替换目录或symlink swap是ERROR并禁止health/cleanup。

### Decision 6: Agent CLI activation is explicit and fail closed

Supervisor 复用 `env-deepseek.mjs` 和 Agent CLI Launcher 的 provider isolation。2026-07-18 本机 `claude --help` 明确区分 `--allow-dangerously-skip-permissions`（只开放 bypass 选项）与真正启用的 `--permission-mode bypassPermissions` / `--dangerously-skip-permissions`。Production argv 必须使用一个当前 CLI 实际启用的 bypass mode；不能再用前者冒充 headless permission activation。

Apply tests 固定以下边界：

- argv 中存在真正生效的 headless/non-interactive mode；
- user settings/env 不得覆盖 repo-selected provider routing；
- approval request、timeout、signal、nonzero exit、missing completion 均 ERROR；
- fixture Claude executable 只能证明 Supervisor subprocess contract，不能证明真实 Agent behavior。

2026-07-18 explore-time transport probe使用本机Claude Code 2.1.199和repo DeepSeek launcher，以stdin + `-p --output-format stream-json --verbose --no-session-persistence --permission-mode bypassPermissions`完成一次无工具“OK”调用。输出确有`system/init`、assistant和final `result` JSONL，init列出Task/WebSearch/WebFetch并显示repo cwd；exact input没有被自动回放，因此独立prompt file不可省略。该最小调用仍报告21,738 input tokens和约USD 0.109 cost，证明真实Autorun必须有host budget contract，不能把默认Light batch当近似免费。

Headless实际执行要求`--max-total-budget-usd <positive>`；可选`--max-case-budget-usd <positive>`不得大于total。每个child收到Claude原生`--max-budget-usd min(case_cap_or_remaining, remaining_total)`。Supervisor只从valid final stream result读取`total_cost_usd`并累计；cost不参与native verdict。若一个started case没有可信final cost、remaining不足以启动下一case、或CLI budget终止，当前/后续case使用既有lifecycle ERROR + stable reason（`cost_unknown|batch_budget_exhausted|case_budget_exhausted`），保留已创建root并停止继续launch。`--dry-run`不要求budget，但若提供则显示selected count、per-case cap和maximum exposure；Interactive由user-present session管理，不复用Headless budget accounting。

### Decision 7: Outcome, declared health scope, cleanup and report stay orthogonal

每个 result 保留四个正交字段：

- `native_outcome: PASS|FAIL|NOT_RUN|null`：只来自 schema-valid completion；
- `lifecycle_outcome: HUMAN|ERROR|CANCELLED|null`：manual-only、host/Agent contract failure 或外部中断；
- `agent_process: completed|nonzero|timeout|signal|approval_required|not_started`；
- `health: CLEAN|ISSUES|ERROR|null`。

`effective_outcome` 仅是 report/count projection：存在 lifecycle outcome 时使用 lifecycle；否则使用 native outcome。Valid completion 后 Agent process仍 nonzero/timeout/signal时，completion的 native fact可以保留展示，但 effective outcome是 ERROR，不能计 PASS/FAIL或 cleanup。User/SIGINT/SIGTERM interruption使用 CANCELLED，不伪装成 playbook NOT_RUN；active run root保留，尚未启动的 selected cases也明确列为 CANCELLED/not_started。

Finalizer completion 声明全部 bundles、唯一 verdict bundle及 required health targets；profile 来自 selected playbook frontmatter，而不是 filename cost或 Agent自由选择。Supervisor 先验证 completion 和 run-root bundle declaration completeness，再只对 required targets 运行 health。Health 聚合为 `CLEAN|ISSUES|ERROR|null`，不覆盖 native outcome。

PASS/FAIL completion至少把 verdict bundle声明为 required health target，因此 completed execution不会用“零 targets”绕过 health。Health JSON status `clean|issues` 映射为 CLEAN/ISSUES；health process failure、timeout或 malformed JSON 映射为 health ERROR并使 effective outcome ERROR，但仍保留 native outcome。NOT_RUN可声明 partial bundle health targets，也可没有 bundles而保持 health null。

v1 不实现 safe cleanup exception：已有 playbook 即使把某些 health issue 解释为 expected，Supervisor 仍诚实报告 PASS+ISSUES 并保留整个 case run root。未来若磁盘成本证明必须自动清理 expected-issue cases，应另行定义 machine-authenticated exception contract，不能从 prose 猜。

Cleanup matrix：

| Outcome | Health | `--cleanup-pass` | Result |
|---|---|---|---|
| PASS | all required CLEAN | yes | 先 durable audit，再删除整个 Supervisor-owned case run root |
| PASS | ISSUES | any | preserve；effective PASS，但 batch exit 表示不 clean |
| PASS/FAIL/NOT_RUN | ERROR | any | preserve；effective ERROR，native outcome仍展示 |
| FAIL/NOT_RUN/ERROR/CANCELLED | any | any | preserve available run root |
| HUMAN | null | any | no run root required |

持久记录不能退化为现有 `_run_log.jsonl` 那种 start/done薄摘要，也不能只保存一个指向即将删除目录的diagnostic path。Supervisor在spawn前创建outside-case-root transcript set：`.exp-bundles/_logs/<batch-id>/<ordinal>-<safe-case-id>.prompt.md`保存exact injected payload，`.agent.jsonl`接收`--output-format stream-json --verbose`的sanitized structured stdout，`.stderr.log`接收sanitized stderr。三者均须flush/`fsync`/close后记录bytes和sha256，且在需要新建目录项时同步parent directory；provider secret exact values必须redact，argv/env本身不得落盘。Outer transcript是Playbook Agent诊断证据，不自动等于Subject Agent行为证据。

对于每个cleanup-eligible PASS，Supervisor必须在health后按completion的V2 bundle-role order重新读取每个declared trace的exact `trace_prefix_bytes`，复核sha256和source未变化，并把prefix原始bytes导出到`.exp-bundles/_evidence/<batch-id>/<ordinal>-<safe-case-id>/traces/<safe-role>.rb_trace.jsonl`；invalid JSONL auxiliary仍按原字节保留，missing trace写入audit null ref而不伪造文件。这样cleanup后保留的不只是digest/considered projection，而是native verdict boundary的可复核原始trace evidence。

对于cleanup-eligible `agent_behavior` PASS，Supervisor还必须重验completion-declared Subject evidence文件未变化、role coverage完整、path containment/non-symlink/regular-file成立且raw bytes不含已知provider credential，然后将exact bytes复制到同case evidence目录的`subject/`子目录。所有导出均须flush/`fsync`/close、复核目标bytes/sha256并sync新目录项；known credential scan覆盖trace与Subject bytes。任一required trace/evidence source变更、secret hit或export失败都使effective ERROR并保留case root；不能仅凭outer transcript、trace check或hash-without-bytes删除runtime/行为证据。

每个进入terminal classification的case写一个full `case_result` audit event到 `.exp-bundles/_audit/agent-experiment-runs.jsonl`；它包含selection/run/context identity与digests、full native completion（含全部considered `{gate,passed,expected}` rows和trace-prefix bindings）、full validated health JSON、Agent process/timing、native/lifecycle/effective outcome、reason、case run root历史路径/availability、cleanup request/eligibility，以及durable transcript/trace/Subject-evidence refs的role/path-or-null/bytes/sha256。该append必须`fsync`/close成功才允许cleanup。若执行cleanup，再append一个引用前一record hash的`cleanup_result` event，记录removed/failed、时间以及cleanup failure造成的lifecycle/effective outcome override；batch report固定atomic write到 `.exp-bundles/_reports/<batch-id>.json`并fold同一event schema形成最终projection。Audit/log/evidence/report都位于case roots之外。

旧 `.exp-bundles/_run_log.jsonl`、`_temp/exp_verdicts.jsonl` 和per-bundle `exp_result.json`不再接受新写入，也不成为compatibility fallback；既有文件只作为历史遗留保留。Transcript/audit写失败均为infrastructure ERROR并禁止cleanup；cleanup失败记录ERROR并停止后续cleanup。显式启用cleanup意味着放弃对已删bundle的完整forensic replay，但不能丢失“跑了什么、Agent输出什么、native completion是什么、health验证了什么以及为何删除”的durable evidence；需要重新检查全部runtime文件时必须不传`--cleanup-pass`。

Batch按 manifest order串行并在 ordinary case FAIL/NOT_RUN/ERROR 后继续。Exit contract：全部 effective PASS且 health CLEAN为 0；存在 FAIL或PASS+ISSUES、但无 incomplete/infrastructure状态为 1；存在 NOT_RUN/HUMAN/ERROR或preflight/input failure为 2；外部 SIGINT/SIGTERM 保留 conventional 130/143。多种状态并存时 130/143 > 2 > 1 > 0。

### Decision 8: Interactive is debug/replay; real-human evidence remains

`RUN_INTERACTIVE_EXPS.md` 不再默认全量批跑。它用于：

- 单 case 手工诊断/复现；
- real-human 901–949 judgment；
- autorun ERROR 后的人工 replay。

Interactive 不是让一个既有 TUI session 在 repo cwd 临场模拟 run context。`run-agent-experiment.mjs --interactive --case <exact-case>` 只允许单 case：host创建与 Autorun相同的 context/run root，使用 Agent CLI Launcher启动有 TTY/用户在场的 Interactive Playbook Agent。由于stdin/stdout/stderr必须全部inherit真实TTY且v1不引入PTY wrapper，完整instruction + rendered playbook + identity/digest/context payload通过Claude CLI documented positional `[prompt]` argument一次性交付；不得pipe stdin或只给文件发现指令。Supervisor在创建child前以UTF-8 bytes验证一个保守的128 KiB initial-prompt上限，超限则ERROR并保留已创建root；不得依赖host-specific `ARG_MAX`侥幸成功。Interactive不使用`-p`、`--output-format`、`--no-session-persistence`、Headless budget或bypass；permission由用户正常确认。Agent退出后host仍验证同一native completion、运行health并写audit/report，但v1拒绝把`--interactive`与`--cleanup-pass`组合，始终保留Interactive run root。TTY路径没有Headless `stream-json` contract，real-human/manual证据也不该为了磁盘回收被删除；不为抓取TUI transcript引入PTY wrapper或第二套launcher。

该入口不接受 batch `--group/--tier/default` selection，也不成为第二套常规 runner。AI-judge dual只提供 AI-judge evidence；删除 human pair会使“比较 AI 是否能替人”的 claim失去基线，因此本 change恢复 901/951 到 accepted co-located `exph_workflow-foundation/` +50 pair并保持区分。

### Decision 9: command-experiments guideline becomes terminology canon

`guidelines/command-experiments.md` 在 apply 中新增/修改：

- Canonical Terminology；
- Interactive → Agent Autorun execution model；
- Supervisor / Playbook Agent / Subject Agent / Engine ownership；
- Agent CLI 与传统 CI 的区别；
- manifest selection；
- native completion and no outer reinterpretation；
- autorun isolation、outcome/health/cleanup；
- fixture subprocess proof 与 real Agent-flow proof 的区分。

同时删除/替换旧 `RUN.md`、`RUN_EXPS.md`、`CLI/TUI mode` 和“outer runner 可从 arbitrary checks 重判”的漂移表述。Guideline 只定义稳定形状；具体 filenames/flags/schema 仍由 accepted specs 和 implementation 拥有。

### Decision 10: Main specs and project config converge in the same change

术语变化代表责任边界变化，不能只落在 README/guideline。已审计的 accepted/config surfaces 路由如下：

| Surface | Decision |
|---|---|
| `playbook-runner` | **MODIFY via delta**：统一 manifest、Agent Autorun instruction、Interactive debug/replay、native completion/report |
| `agent-testing` AGT-005/006/007 | **REMOVE + MODIFY via delta**：废弃 `weight`; V2 删除 `runner`/static bundle/trace/verdict；bundle collision/isolation/cleanup 改由 run context + Supervisor；root trace runtime path由 completion绑定 |
| `experiment-observability` EXO-002/006 | **MODIFY via delta**：health profile 使用独立 frontmatter policy，不从 execution cost 推导；Autorun Supervisor report 不改 native outcome |
| `pre-research-experiments` PRE-001–008 | **RENAME/MODIFY via delta**：清除 stale test/RUN/weight/trace/cleanup authority，按 proof role 描述 Headless/Interactive、native policy 与 topic-review judge边界；为既有未登记 Topic rewrite requirement补 PRE-008 |
| `trace-writer` TRW-005 | **MODIFY via delta**：active trace knowledge surfaces 使用 manifest/Agent Autorun/Interactive names |
| `verification-routing` | **MODIFY VER-001 + ADD VER-006 delta**：四类 taxonomy 不变；把coding-Agent泛称、trace→completion handoff和unconditional PASS delete校正为Playbook Agent/native completion/explicit Supervisor cleanup，并补Supervisor/Subject Agent/CI-host proof boundary |
| `agentic-queue` AGQ-006/008/010 | **MODIFY via delta**：移除旧`test-*`/已不存在seed-topics path和playbook-local success cleanup authority；使用current manifest/V2/strict checks/native completion/Supervisor cleanup |
| `research-wave-experiments` RWE-007–011 touched subset | **MODIFY via delta**：reviewer/Playbook Agent ownership、current manifest roles、root trace strict checks/native completion和Supervisor cleanup；移除legacy `_trace.jsonl`/old path authority |
| `pre-research-gate-implementation` PRG-007/008 + `research-wave-gate-implementation` RWG-007 | **MODIFY via delta**：移除已与TRW-005冲突的dual-trace authority；同一`rb_trace.jsonl`内按event owner区分gate audit与playbook verdict check |
| `seed-topic-materialization` STM-005 | **MODIFY via delta**：移除不存在的legacy path，绑定current case-124、strict root checks和native completion |
| `local-deepseek-claude-launcher` LDC-001/002/005/008/009 | **MODIFY via delta**：generic launcher保持透明；抽取纯 invocation contract供 Supervisor直管 Claude child；provider env不可被 caller extra覆盖；仅显式 Autorun启用真实 bypass，Interactive不继承 |
| 其他 capability 中泛称 `runner-facing` 的 Purpose/prose | **REVIEWED unless named above**：泛称本身不拥有启动/裁决 semantics；apply 只可做受delta/guideline约束且不改变requirement的术语投影清理。若具体requirement仍拥有旧path/cleanup/verdict责任，必须像上述 AGQ/RWE/VER 一样先补delta |
| `openspec/config.yaml` | **MODIFY as project context target**：加入正典 glossary、Agent Autorun launch model、ordinary CI boundary 和 active experiment surfaces；它不是 capability spec，不用 delta 替代 |

Main specs 不在 explore 阶段直接编辑。Apply 实现 delta；archive/sync 将 delta 合并到 main specs。若 apply 的全量 `rg` 审计发现另一个 accepted requirement 的旧术语会改变责任边界，必须先把对应 delta 加入本 change，再编辑 main spec/consumer，不能只用文档替换掩盖。

## Source Of Record Map

| Fact | Source of Record |
|---|---|
| Runnable case registration/order | `PLAYBOOK_MANIFEST.md` path table |
| Case/group identity | selected playbook V2 frontmatter |
| Case cost | selected playbook filename grammar |
| Native verdict mode / stable bundle-verdict-health role policy / bundle health profile | selected playbook V2 frontmatter |
| Proof subject / Subject Agent / fixture / external / judge profile | selected playbook V2 frontmatter, constrained by accepted verification-routing |
| Human/AI judge class | V2 judge field plus 9NN band/pair validation |
| Single-case Agent Flow and semantic work | selected case playbook |
| Agent runtime invocation contract | Autorun Supervisor + Agent CLI Launcher executable contract |
| Gate/receipt/check/runtime facts | active disposable bundle |
| Completed playbook outcome | native playbook completion bound to trace digest |
| Post-run health | health verifier JSON |
| Batch view/history | Supervisor report/audit projection |
| Apply-time 97-case migration target | `case-compatibility-ledger.yaml`; planning baseline only, never runtime verdict authority |

## Simplicity And Helper Reviews

### Shortest legal loop

```text
manifest -> one Supervisor spawn -> one Headless Playbook Agent
-> one Markdown playbook -> one native completion
-> one health check -> report/preserve/cleanup
```

### Net simplification

- 删除 Supervisor raw-trace verdict evaluator。
- 删除 repo/global bundle discovery scan。
- 用 V2 删除 frontmatter `weight`/`runner` 重复 routing metadata 和 static runtime path/verdict selectors。
- 避免 manifest 重抄 derived case/group/cost/native-policy/judge facts。
- 删除两个并列常规 batch instruction modes。
- 删除 Human evidence removal route。
- 避免 resume cache、watcher、daemon、parallel scheduler 和 hidden repair tree。

新增一个 native completion contract，是把现有分裂 truth 收敛为一个，而非增加第三层 verdict。

### Helper direction

用户只选择运行范围、cleanup policy 和 real-human judgment。Supervisor/Agent 执行其余已授权机械与智能工作；普通权限提示不推回用户作为每步 co-runner。无合法 Agent runtime/completion 时明确 ERROR，不伪造 PASS。

## Apply Target Manifest

`case-compatibility-ledger.yaml` is the apply compatibility manifest for the current corpus. It is intentionally separate from runtime `PLAYBOOK_MANIFEST.md`: the former records one change's migration obligations and archives with the change; the latter is the accepted active path/order surface after apply. Apply must reconcile every ledger row into V2/playbook/native completion, then validate that the final runtime manifest has the same 97 target identities/paths. Runtime code must not read the archived change ledger to decide a verdict.

### Add / rename

- `DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs`
- `DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs`
- `DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs`
- `experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md`
- `experiments_playbook/RUN_INTERACTIVE_EXPS.md`
- focused unit/integration tests and verification assets
- narrow experiment-owned Subject Agent adapters only where the actor ledger exposes a current missing boundary (115, 232, 901/951); reuse the accepted iterative/work-unit actor paths elsewhere

### Modify

- `experiments_playbook/PLAYBOOK_MANIFEST.md`
- autorun-compatible `case-*.md` run-context/state handoff, verdict, health and cleanup boundaries only
- bundle creators/current fixture-case helpers needed to honor a validated Agent Experiment run context
- `DPT_FRAMEWORK/host_tools/README.md`
- `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` / `lib/env-deepseek.mjs` only if shared launcher contract needs convergence
- `DPT_FRAMEWORK/cli/validate-playbook.mjs` or the canonical manifest/playbook validator
- `experiments_playbook/README.md`
- `guidelines/command-experiments.md`
- all tests/knowledge surfaces that still name `RUN.md`, `RUN_EXPS.md`, `RUN_CLI_EXPS.md`, `RUN_TUI_EXPS.md`, or `run-experiment.mjs`
- `openspec/governance/req-registry.yaml`
- `openspec/config.yaml`
- delta-covered main specs during sync/archive: `playbook-runner`, `agent-testing`, `experiment-observability`, `pre-research-experiments`, `trace-writer`, `verification-routing`, `agentic-queue`, `research-wave-experiments`, `pre-research-gate-implementation`, `research-wave-gate-implementation`, `seed-topic-materialization`
- `local-deepseek-claude-launcher` accepted spec via its delta
- `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md`

### Remove / retire

- `DPT_FRAMEWORK/host_tools/run-experiment.mjs`
- `experiments_playbook/RUN_CLI_EXPS.md`
- `experiments_playbook/RUN_TUI_EXPS.md`
- Supervisor raw trace verdict reinterpretation and repo-root bundle guessing
- playbook frontmatter `weight` and `runner` fields plus their schema/tests/consumers
- wording that calls ordinary CI an Agent-flow executor
- unapproved removal/move of real-human/AI-judge pairs

## Risks / Trade-offs

- **Playbook migration breadth**：97 个 current case 中 verdict shape 不完全一致。Mitigation：先共享 helper，再静态 inventory custom cases，按 family 迁移；未迁移 case fail closed，不 fallback。
- **Current playbook shape drift**：部分 case 仍以 `/tmp` 传递bundle path、在repo/tests root创建runtime、只有optional JS smoke，或没有可执行verdict block。Mitigation：apply前形成逐case compatibility ledger；autorun-compatible必须有allowlisted rendered runtime bindings、run-context-safe state、显式creator target、可执行native finalizer boundary且无local health/cleanup。纯node-test invoker需按accepted verification routing迁出current Agent-flow surface，不能用Headless Agent包装来抬高证据类别。
- **Headless permission risk**：真正 bypass permissions 具有高权限。Mitigation：仅由显式 host autorun command 启用，固定validated repo command cwd、repo source保持原位、run-root mutation/cleanup containment、source/rendered digest、无 shell spawn、记录argv class（不记录secret），并用focused tests锁定。Repo cwd不是安全边界；若威胁模型包含hostile playbook，CI host必须提供OS sandbox。
- **Real Agent canary cost**：真实 Headless Agent 运行不能由 node fixture 替代。Mitigation：deterministic tests 覆盖 Supervisor contract，单个 Light case 提供最小真实 Agent-flow canary。
- **Manifest authoring drift**：手写 Markdown 可能漏项。Mitigation：严格一致性 validator 和 integration guard；Supervisor 不扫描补漏。
- **Current dirty implementation**：已有文件包含未提交的错误迁移。Mitigation：apply 前 inventory/保留用户改动，按本 target manifest 局部重写，不以已勾 tasks 作为真实完成证据。
