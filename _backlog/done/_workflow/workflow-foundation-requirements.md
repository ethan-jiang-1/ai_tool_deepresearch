# Workflow Foundation — 需求基准（Requirements Baseline）

> 2026-06-19 | 状态: 需求基准待 review | 范围: workflow foundation only

---

## 1. 目的（Purpose）

这份文档定义 Deep Research Tool rewrite 的 **Workflow Foundation** 上游需求。它不是实现计划（implementation plan），也不定义下游规格工件。它的任务是把 workflow 意图、权威边界（authority boundaries）、质量门（quality gates）、分阶段落地模型讲清楚，避免后续设计和实现再次回到 V12 那种“看起来完整、实际发糊”的状态。

Workflow Foundation 要把生命周期（lifecycle）显性化为 Agent 可读的 Markdown nodes，同时把确定性权威留在 JS/CLI、结构化 bundle state 和 trace 里。核心规则是：

```text
Markdown controls Agent Flow.
JS/CLI controls deterministic checkpoints.
The LLM Agent owns research judgment.
Bundle state and trace hold runtime truth.
```

Workflow Foundation 关注的是一次 run 的流程形状和反馈闭环，不是一次性完成所有 deep-research 能力。Wave1/subagent 机制是后续能力边界，不在 foundation 阶段假装完成。

---

## 2. 上下文与依据（Review Inputs / Source Context）

这份需求基准不是凭空写出的设计结论。它综合了项目当前指导原则、已实现 framework surface、当前 bundle 模板、以及 V12 的失败经验。Reviewer 不需要重新读完所有历史材料才能 review 本文，但需要知道本文的判断来自哪里。

### 2.1 主要输入材料

| 输入 | 本文使用方式 |
|------|--------------|
| `guidelines/project-charter.md` | 确认最高层边界：Markdown controls Agent Flow；JS/CLI controls deterministic checkpoints；LLM owns judgment；bundle state/trace 持有 runtime truth。本文所有 authority model、gate/repair、stop 语义都服从这个边界。 |
| `guidelines/framework-runtime-boundary.md` | 确认目录和权威边界：`DPT_FRAMEWORK/` 是 read-only framework assets；`dpt_rb_*` 承载 mutable runtime truth；definition、schema、engine code、CLI wrapper、runtime state 不能混放。 |
| `guidelines/command-experiments.md` | 确认质量底线：不能 mock Agent work，不能手写 fake trace/receipt/result，不能用 console output 当裁决证据，不能把多阶段 Agent Flow 藏进 JS controller。本文的 minimum real verifiable action 和 trace/audit 要求来自这里。 |
| `DPT_FRAMEWORK/engine/workflow-chain.mjs` | 确认当前 workflow-chain 的方向是 Markdown loader + dependency resolver，不是 VM/JS runner。本文因此要求 node Markdown 给 Agent 读，Engine 不执行 Markdown 里的 code block。 |
| `DPT_FRAMEWORK/engine/gate-loop.mjs` | 确认 gate checkpoint 的角色：JS 评估 deterministic rules，返回 Agent 可读反馈。本文把 gate 定义为 check/inspect/advice feedback checkpoint，而不是研究判断器。 |
| `DPT_FRAMEWORK/engine/trace.mjs` | 确认 trace 是 durable runtime evidence 的关键 surface。本文要求 pass/fail、blocking、repair/escalation 不能只留在 chat summary。 |
| `DPT_FRAMEWORK/rb_templates/` | 确认当前 canonical run bundle control files：`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`。本文避免使用旧 V12 的 `PLAN.md`、`STATUS.md`、`PROFILE` 作为当前文件名。 |
| `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs` | 确认当前已有 bundle 实例化和 bundle 检查入口。本文把 instantiation 定义为 Run Bundle 实例化，而不是复刻 V12 大初始化。 |
| `openspec/specs/dynamic-node-loading/spec.md` | 确认当前方向是 gate 通过后动态解析下一个 Markdown node，Engine 不执行 MD code block。本文采用 dynamic loading 和 phase manifest 的要求。 |
| `openspec/specs/check-inspect-feedback/spec.md` | 确认 check/inspect feedback loop 的基本形状：确定性校验失败后返回结构化诊断，Agent/repair 再修正并重回 check。本文的 gate failure lifecycle 来自这个机制方向。 |
| `openspec/specs/schema-core/spec.md` | 确认 profile/HITL/status/queue/trace 等当前 schema surface 和 HITL 字段方向。本文把 HITL1/HITL2 记录落在 `rb_profile.yaml` 和 runtime state，而不是 chat memory。 |
| `openspec/specs/repair-loop/spec.md` | 确认 repair loop 必须有边界，避免无限重试。本文要求 bounded retry、no-progress escalation。 |
| V12 历史需求/模板材料 | 用来抽取失败模式：workflow 藏在 prose 和模板中、gate 依赖 Agent 自觉、状态和规则重复投影、Agent 单点故障。同时确认 HITL2 的用户反馈/repair/rerun 发生在 readiness/final delivery 之前，final delivery 是 readiness 通过后的输出动作。本文只吸收问题和经验，不把 V12 文件名/结构当成当前权威。 |

### 2.2 从输入材料得出的关键判断

1. **不能把 workflow 重新藏进 JS。**  
   旧系统的问题不是“Markdown 太多”，而是权威分散和 deterministic checkpoint 不清。把整条 Agent Flow 做成 JS runner 会违反项目 charter。

2. **也不能让 Markdown prose 成为 gate authority。**  
   Markdown node 可以指导 Agent 做事，但 gate pass/fail 必须来自 JS/CLI 对 bundle state、files、trace 的检查。

3. **Run Bundle 实例化（Run Bundle instantiation）必须比简单 copy 模板更丰富。**  
   一次 Deep Research request 有自己的 topic data、reference/artifact space 和 initial bundle state；这些是实例数据，不是研究结论。Instantiation 应创建这些专属数据空间，但不能声称 evidence coverage 或完成 wave research。

4. **HITL 是独立 node，但不应停留在 chat memory。**  
   HITL1/HITL2 可以停下来问用户，但用户答案必须写入 active bundle，尤其是 `rb_profile.yaml`，并由 gate 检查已记录。

5. **Skeleton 阶段也要真实可审计。**  
   Foundation 可以小，但不能假。最小动作也要产生真实 files/state/trace，让 gate 能检查。

6. **Wave1 是后续复杂能力边界。**  
   Topic-specific deepening、subagent dispatch、candidate intake、repair/backfill、fan-in review 都不应塞进 foundation 里假装完成。

7. **Final 是当前 delivery pass 的终点，不是禁止用户反馈。**  
   V12 的用户返工主要通过 HITL2 的 repair/rerun 进入 earlier phases。新 workflow 也应保留这个语义：`phase-final.md` 没有普通 `next`，用户后续反馈统一写入 `rb_profile.yaml` 中承载用户反馈/HITL2 decision 的位置，并通过 HITL2 repair/rerun 回到受影响 phase 或 repair path，而不是让 final node 暗中承担 gate 或循环职责。

---

## 3. 问题（Problem）

V12 有一个可见的高层 research lifecycle，但真正的 operational workflow 分散在 prose、模板、隐藏约定和 Agent 自觉里。这造成几个反复出现的问题：

1. Workflow 顺序不容易检查，因为真实流程散落在多个 Markdown 表面。
2. Gate 质量过度依赖 Agent 记住 prose rules。
3. Runtime state 容易漂移，因为文件、summary、status 字段和 trace-like claims 没有被 deterministic layer 稳定检查。
4. Human checkpoints 存在，但它们的状态和权威边界容易混在一起。
5. 系统可以从静态结构上看起来完整，但实际运行还是糊：有些 wave 输出对，有些 stale 或缺失，gate passage 也不可信。

重写不能用“把 lifecycle 藏进 JS”来解决这个问题。那只是把一种不透明 workflow 换成另一种不透明 workflow。目标是：Agent-facing node chain 清晰可读，JS/CLI 只在 deterministic checks、state validation、receipts、trace 这些位置介入。

---

## 4. 核心需求（Core Requirements）

### 4.1 Workflow 必须显式（Explicit Workflow）

Lifecycle 必须表现为一条小而可检查的 phase node 序列。每个 phase node 只负责一个阶段，并告诉 Agent：

- 当前阶段目标是什么；
- 输入来自哪些 bundle state 或文件；
- 允许做什么；
- 应产出哪些 runtime artifacts；
- 完成后跑哪个 gate command；
- gate fail 后如何 repair；
- 是否允许停下来问用户。

Agent 不应该从散落文档或 chat history 里推断当前阶段。它应该能加载当前 node，读取 required context，执行阶段工作，运行 gate CLI，然后根据 gate 输出 repair 或进入下一个 node。

### 4.2 Workflow 必须动态加载（Dynamic Loading）

Agent 应只加载当前 phase node 加该 node 的 required shared context，不应一开始把整个 lifecycle 都塞进工作上下文。

Dynamic loading 的目的不是形式上的懒加载，而是保护 context hygiene：

- Wave0 工作不应需要 Wave2 指令出现在上下文里。
- Wave1 应读自己的 node 和 required shared references，而不是整套 lifecycle 文档。
- Final delivery 应读 readiness/final 指令和 runtime state，而不是依赖早期 chat memory。

### 4.3 Node 是 Agent 指令，不是 Engine 程序

Node Markdown 是给 Agent 读的。它不能依赖 Markdown 里的 JS code block 被自动执行。

Engine 可以加载 Markdown、解析 metadata、解析 required Markdown dependencies、缓存内容，并写 load receipts/trace。Engine 不能成为 workflow runner、research actor、synthesis owner 或 human-interaction controller。

### 4.4 Gate 是确定性 checkpoint（Deterministic Checkpoint）

每个非终点 phase 必须以 gate 结束。Gate 检查 JS/CLI 能从 bundle state 和文件里确定验证的事实，并把结构化反馈返回给 Agent：

```json
{
  "check": { "passed": false },
  "inspect": "...what failed and where...",
  "advice": "...what to repair next..."
}
```

Agent 读取反馈后，或 repair 当前阶段，或在 pass 后进入下一个 node。Agent 不能自我声明 gate 已通过。

### 4.5 Skeleton 工作也必须真实（Minimum Real Verifiable Action）

第一阶段可以做很小的动作，可以用很窄的 evidence 要求，也可以使用明确标记的 fixture，但不能使用 fake evidence、fake trace、fake receipts 或手写 validation output。

正确标准是 **minimum real verifiable action**，不是 mock action 或“看起来像回事”。Skeleton phase 可以很小，但它的输出必须是真实 runtime artifacts，并且 gate 能检查这些 artifacts。

---

## 5. 权威模型（Authority Model）

Workflow Foundation 必须把每个 surface 的权威边界说清楚。

| Surface | Owns | Does Not Own |
|---------|------|--------------|
| Phase manifest | 线性 lifecycle navigation：current phase、next phase、node filename | Gate truth、runtime state、research judgment |
| Phase node Markdown | Agent-readable stage instructions、allowed actions、expected outputs、repair posture | state/receipt/trace/gate verdict 的机器权威 |
| Node metadata | `node_type`、`id`、`requires`、`suggested_context`，以及 phase node 的 `phase`/`gate`/`next`/`stop` 或 shared node 的 `shared_scope`/`authority` | research content quality、gate result、runtime truth |
| Gate definition JSON | read-only machine-readable deterministic gate rules 和 check descriptions，存放在 `DPT_FRAMEWORK/schema/gate_definitions/` | Agent research judgment、非确定性的 synthesis quality、任何 per-run gate result |
| Gate prose summary | 从 Gate definition JSON / gate definition tooling 生成或随 gate 规则同步升级的 human-readable explanation | 独立 gate authority、长期人工维护的平行 rule source |
| Bundle state | `rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json` 中的 runtime truth | prose instructions 或 chat-only claims |
| Trace | `rb_trace.jsonl` 中的 durable event history | narrative progress summaries 或 console-only proof |
| Agent | search、reading、evidence extraction、judgment、repair reasoning、synthesis | deterministic gate passage、schema truth、trace truth |
| JS/CLI | schema validation、deterministic checks、gate feedback、trace writing | research、user intent interpretation、final synthesis |

如果两个 surface 冲突，确定性事实以更确定的 surface 为准。例如：node 可能说应该跑某个 gate，但 gate CLI output 决定 pass/fail。progress summary 可能说 Wave0 完成了，但 `rb_status.json`、evidence files 和 `rb_trace.jsonl` 才是可审计 runtime truth。

---

## 6. 生命周期模型（Lifecycle Model）

### 6.1 标准阶段顺序（Canonical Phase Order）

Workflow Foundation lifecycle 是：

```text
instantiation
  -> hitl1
  -> setup
  -> wave0
  -> wave1
  -> wave2
  -> hitl2
  -> readiness
  -> final
```

Instantiation 在 HITL1 之前。这里的 instantiation 指 **Run Bundle 实例化（Run Bundle instantiation）**：为这一次具体 Deep Research request 创建真实 `dpt_rb_*` 实例。它必须创建 canonical control files，并创建这次 request 专属的初始实例数据（initial instance-specific data scaffold），包括从输入问题派生出来的 initial topic / seed-topic data，以及这次 run 的 references 和 artifacts 所在目录空间。

这些 artifacts 是实例数据（instance data），不是研究结论（research conclusions）。不同 Deep Research request 必须实例化出不同的 topic data、reference/artifact spaces 和 bundle state。Instantiation 可以派生并写入 initial topic registry 和 filesystem scaffold，但不能问 HITL 问题，不能声称 evidence coverage，不能执行 wave research，不能做 synthesis judgments，也不能用 assertion 代替 setup/readiness 检查。

Run bundle 目录名应由 Agent/CLI 根据本次 request 自动生成。默认使用英文 slug：可读、稳定、短小、避免冲突，并保留必要的 collision suffix。用户不需要手工命名目录；如果输入问题是中文或无法形成合理英文名称，Agent 应生成保守英文 slug，再由 CLI 负责冲突检测和换名。

HITL1 仍然是独立 human-interaction node，但它直接写入 active bundle，尤其是 `rb_profile.yaml`。

### 6.2 Phase Table

| Phase | Node | Stop | Gate | Next | Requirement |
|-------|------|------|------|------|-------------|
| instantiation | `phase-instantiation.md` | `no` | `instantiation_complete` | hitl1 | 实例化有效的 `dpt_rb_*` run bundle，包含 canonical control files、initial topic data 和本 request 的 reference/artifact scaffold。 |
| hitl1 | `phase-hitl1.md` | `yes` | `hitl1_recorded` | setup | 询问结构化用户问题，并把 profile/must-answer data 写入 `rb_profile.yaml`。 |
| setup | `phase-setup.md` | `no` | `setup_ready` | wave0 | 验证已实例化 bundle structure、seed-topic scaffold 和 control-file consistency。 |
| wave0 | `phase-wave0.md` | `no` | `wave0_complete` | wave1 | 产出 minimum shared foundation evidence，并更新可审计状态。 |
| wave1 | `phase-wave1.md` | `no` | `wave1_complete` | wave2 | 保留 topic-specific work 的 placeholder capability boundary，不假装 full subagent research 已完成。 |
| wave2 | `phase-wave2.md` | `no` | `wave2_complete` | hitl2 | 从已验证 artifacts 产出 minimum cross-topic synthesis。 |
| hitl2 | `phase-hitl2.md` | `yes` | `hitl2_recorded` | readiness | 提供 decision brief，并记录用户 final review decision 到 `rb_profile.yaml` 和 state。 |
| readiness | `phase-readiness.md` | `no` | `readiness_passed` | final | delivery 前运行 final deterministic readiness checks。 |
| final | `phase-final.md` | `no` | none | none | 生成 final report artifacts；这是当前 delivery pass 的 terminal node。 |

### 6.3 Gate List

Workflow Foundation 有且只有 8 个 non-terminal gates：

1. `instantiation_complete`
2. `hitl1_recorded`
3. `setup_ready`
4. `wave0_complete`
5. `wave1_complete`
6. `wave2_complete`
7. `hitl2_recorded`
8. `readiness_passed`

`phase-final.md` 没有 outgoing gate，也没有普通 next phase。它是当前 delivery pass 的 terminal node。

这不表示用户永远不能反馈或返工。用户反馈统一通过 HITL2 repair/rerun 语义承载：反馈意见写入 `rb_profile.yaml` 中承载用户反馈/HITL2 decision 的字段，再回到受影响的 earlier phase 或 repair path。`phase-final.md` 不暗中拥有 hidden next、hidden gate 或隐式循环。

---

## 7. Node Contract

### 7.1 Node Metadata

Workflow nodes 分两类：

- **Phase node**：隶属某个 lifecycle stage，Agent 会按 phase 顺序执行它，完成后运行 gate。
- **Shared node**：不隶属任何单一 stage，只提供多个 phase 可复用的说明、schema 摘要、profile 说明、gate prose summary 或操作约束。Shared node 是 context dependency，不是 lifecycle step。

两类 node 都必须声明 Agent 和 loader/checking layer 能理解的 metadata，避免 shared MD 变成隐藏 stage 或隐藏规则源。

通用 required fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `node_type` | Node 类型：`phase` 或 `shared` | `phase` |
| `id` | Node stable id，通常与文件名语义一致 | `phase-wave0` / `shared-profile` |
| `requires` | 当前 node 的 mandatory shared Markdown dependencies；没有则为空数组 | `[shared-profile.md]` |

Phase node required fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `phase` | 当前 phase key | `wave0` |
| `gate` | phase work 后要运行的 gate；final 为 `none` | `wave0_complete` |
| `next` | gate pass 后的 next phase key；final 为 `none` | `wave1` |
| `stop` | Agent 是否允许暂停并请求用户输入 | `yes` / `no` |

Shared node required fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `shared_scope` | Shared node 服务的上下文范围 | `profile` / `gate-summary` / `schema-summary` |
| `authority` | 明确该 shared node 是否权威；通常是 `guidance-only` 或 `generated-summary` | `guidance-only` |

Optional fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `suggested_context` | Agent 需要时可加载的 optional references | `[shared-schemas.md]` |
| `subagent` | 标记该 phase 预期未来使用 subagent mechanics | `true` |

`requires` 是 mandatory context。如果声明了 `requires`，loader 或 playbook 必须把它作为 node context 的一部分。`suggested_context` 不是 mandatory，只是 Agent 需要更多解释时的参考入口。

Foundation 阶段只定义这两类 context loading：`requires` 和 `suggested_context`。暂不增加 generated context、debug context 或其他第三类上下文类型。

Shared node 不能声明 `gate`、`next` 或 `stop`，也不能改变 phase order。Shared node 可以总结规则，但不能替代 Gate definition JSON、bundle state、trace 或 CLI output 成为 machine authority。如果 shared prose 和确定性 surface 冲突，以确定性 surface 为准。

当前 loader 可能需要演进才能完整支持这套 metadata shape。本文定义需求，不假设当前 loader 已经能验证所有字段。

### 7.2 Node Body

每个 phase node body 必须包含：

1. Stage goal。
2. 来自 bundle state 或文件的 required inputs。
3. Allowed Agent actions。
4. Expected runtime artifacts。
5. 要运行的 gate command。
6. Gate pass 后怎么做。
7. Gate fail 后怎么做。
8. 该 phase 的 stop behavior。
9. 针对 evidence、state、trace 的 anti-cheating rules。

Phase node body 应简洁，并保持 phase-local。它不应重复整个 lifecycle，也不应在 prose 里复制 gate rules。Gate details 可以为 Agent 可读性做摘要，但 deterministic rule authority 仍在 Gate definition JSON 和 gate CLI output。

Shared node body 必须声明自己的用途和权威边界。例如 `shared-gate-rules.md` 可以解释 gate 的用途，但必须说明 Gate definition JSON 和 gate CLI output 才是 deterministic rule authority。`shared-profile.md` 可以解释 `rb_profile.yaml` 字段含义，但不能替代 schema 或 active bundle state。

### 7.3 Node Set

Candidate workflow package:

```text
DPT_FRAMEWORK/workflows/
  manifest.json

  nodes/
    shared/
      shared-profile.md
      shared-gate-rules.md
      shared-schemas.md
      shared-repair-guidance.md
      shared-anti-cheating-rules.md

    phases/
      phase-instantiation.md
      phase-hitl1.md
      phase-setup.md
      phase-wave0.md
      phase-wave1.md
      phase-wave2.md
      phase-hitl2.md
      phase-readiness.md
      phase-final.md
```

Phase nodes 形成线性 lifecycle。Shared nodes 是 context dependencies，不是隐藏 phase nodes。这个 lifecycle 不是 business-logic DAG，而是 staged Agent flow，中间由 deterministic gates 分隔。

当前 v1 只有一个 canonical Deep Research workflow package，所以不引入 `workflows/<workflow-name>/` namespace。这个决策不限制 run bundle 数量；同一套 `DPT_FRAMEWORK/` 必须服务多个互相隔离的 `dpt_rb_*`。

---

## 8. Gate and CLI Contract

### 8.1 Gate Definition JSON

Gate rules 必须放在 machine-readable JSON files 里。这些文件是 JS/CLI 能执行的 deterministic checks 的 read-only rule source。它们属于 `DPT_FRAMEWORK/` 的 framework definition，不属于任何单个 run，也不会被复制进每个 `dpt_rb_*`。Gate definition JSON 不需要、也不应该表达复杂研究语义；它主要表达“有/没有、字段是否合法、数量是否达到、状态是否记录、trace 事件是否存在”这类机器能稳定检查的条件。

Candidate path:

```text
DPT_FRAMEWORK/schema/gate_definitions/
  gate-instantiation-complete.definition.json
  gate-hitl1-recorded.definition.json
  gate-setup-ready.definition.json
  gate-wave0-complete.definition.json
  gate-wave1-complete.definition.json
  gate-wave2-complete.definition.json
  gate-hitl2-recorded.definition.json
  gate-readiness-passed.definition.json
```

每个 Gate definition JSON 必须包含足够的信息来执行 deterministic check 并生成有用反馈：

| Field | Requirement |
|-------|-------------|
| `gate` | 必须匹配 phase metadata 里的 gate key。 |
| `description` | 说明这个 gate 保护什么。 |
| `rules` | 有序 deterministic checks。 |
| Rule `id` | 稳定 identifier，用于 diagnostics 和 trace。 |
| Rule `check` | Check type，例如 schema validation、file existence、count、ratio、status value、trace event presence。 |
| Rule input fields | 必须明确被检查的 file/state path、field、glob 或 trace query。 |
| Rule threshold | 使用 count 或 ratio 时，必须定义精确 comparison semantics。 |
| Rule failure message | 必须支持 inspect/advice feedback，让 Agent 知道修哪里。 |

Gate definition JSON 不应编码只有 Agent 能做的 semantic research judgment。它可以检查 evidence files 是否存在、字段是否可解析、counts 是否满足 floor、profile choices 是否已记录、trace events 是否存在、state values 是否合法，也可以执行传统程序能稳定做的 string 操作。它不能直接判断 final synthesis 是否“写得好”，也不能判断某篇材料“是否真的有洞察”。

如果某个 gate 还剩必须由 Agent/Markdown 判断的 semantic 条件，CLI 应在已完成 deterministic checks 后，把这些待判断字段作为 structured feedback 返回给 Agent。也就是说：传统程序能判断的先由 CLI 判断完；不能稳定判断的语义问题，明确指出哪些字段/产物需要 Agent 判断，而不是让 Agent 重新猜全部 gate 状态。

### 8.2 Prose Gate Summaries

`shared-gate-rules.md` 可以存在，供 Agent 阅读，但它不能成为第二套 rule source。它应由 Gate definition JSON 或 gate definition tooling 生成/升级，而不是长期人工维护一份平行 prose。每次 gate 规则升级时，prose summary 跟随同一轮升级产出，避免人工维护导致 JSON/prose 漂移。

如果 prose 和 definition JSON 冲突，以 definition JSON 和 CLI output 为准。

### 8.3 CLI Shape

每个 gate 对应一个 thin CLI。Gate CLI 是 framework 的 read-only command surface，但属于 gate 命令族，应放在 `DPT_FRAMEWORK/cli/gates/`，避免把 8 个 gate wrappers 摊平到 `DPT_FRAMEWORK/cli/` 根目录。所有 gate CLI 必须显式接收 active bundle path，同一套 framework 才能服务多个 run bundle；下面的 target 示例使用 `--bundle <path>`，具体 flag 由 executable command contract 固定。

```text
DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs
DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs
DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs
DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs
DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs
DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs
DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs
DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs
```

这些 CLIs 可以共享内部 helper modules。外部形态仍然是 one gate per CLI，这样 Agent-facing command 明确，不容易混淆。

Target invocation example:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle dpt_rb_xxx
```

Minimum output shape:

```json
{
  "check": { "passed": false, "gate": "wave0_complete" },
  "inspect": [
    {
      "rule": "shared_ref_floor",
      "issue": "Only 2 shared references found; required >= 3.",
      "where": "seed_topics/_reference/"
    }
  ],
  "advice": [
    "Add at least 1 more high-trust shared reference, then rerun this gate."
  ]
}
```

具体 JSON schema 可以后续细化，但稳定需求是：pass/fail、diagnosis、actionable repair guidance 必须以 structured feedback 形式返回给 Agent。

---

## 9. Stop Semantics

`stop` 控制 Agent 是否允许暂停 workflow 并请求用户输入。

### 9.1 `stop: yes`

`stop: yes` 允许 user interaction。在 foundation lifecycle 里，只有 HITL nodes 使用它：

- `phase-hitl1.md`
- `phase-hitl2.md`

Node 必须定义需要问什么问题或等待什么 decision，答案如何记录，以及哪个 gate 证明答案已经记录。

### 9.2 `stop: no`

`stop: no` 表示 Agent 应自主完成该 phase，运行 gate，读取 feedback，必要时 repair，并且只有 gate pass 后才能进入下一 phase。

它不表示 Agent 必须掩盖真实 blocker。以下情况允许 escalation，而不是继续硬跑：

- Deterministic gate 连续失败并超过 repair limit。
- 缺少 required permission、credential、file、tool 或 network capability。
- Gate feedback 表明需要 human decision。
- 继续执行会要求伪造 evidence、trace、receipts 或 state。
- Bundle structurally invalid，且当前 phase 无法修复。

网络中断、远端服务短暂不可用等 transient blocker 不算 user-visible stop；它们应进入 waiting/transient state，表示 run 还在等待某件外部条件恢复。恢复后应能继续，而不是永久阻塞或询问用户是否继续。需要用户决策、权限缺失、连续 gate failure 或无法不造假地继续时，才应进入 explicit escalation。

任何来自 `stop: no` phase 的 escalation 都必须通过适当 deterministic path 记录到 bundle state 和/或 trace，不能只停留在 chat explanation。

---

## 10. Gate Failure and Repair Lifecycle

每次 gate failure 都遵循同一个 control loop：

```text
Agent finishes phase work
  -> Agent runs gate CLI
  -> CLI returns check/inspect/advice
  -> if passed: Agent loads next phase node
  -> if failed: Agent repairs according to advice
  -> Agent reruns the same gate
  -> if repeated failure or no progress: escalate/block
```

Requirements:

1. Agent repair 后不能直接 advance，必须 rerun the same gate。
2. Repair attempts 必须 bounded。默认 max retry limit 为 3 次；该值必须可配置，实例化时可以按 run/profile/gate 需求调整。
3. No-progress repair loop 必须 escalate，不能无限继续。
4. Gate feedback 应指出 failing rule、failure location 和 minimum repair needed。
5. Blocking 必须明确体现在 runtime state 和 trace 里，不能只表现为“Agent 不说话了”。

这可以防止系统回到 Agent self-policed gate passage。

---

## 11. Minimum Real Verifiable Actions

第一阶段 foundation delivery 应证明 lifecycle 和 checkpoint loop，而不是假装完整 research system 已完成。每个 phase 都有一个很窄但真实的动作：

| Phase | Minimum real verifiable action |
|-------|--------------------------------|
| instantiation | 实例化真实 `dpt_rb_*` run bundle，包含 `rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`；创建 initial topic registry / seed-topic scaffold，以及本 request 的 reference/artifact directory space。这里不做 HITL decisions，不声称 evidence coverage，不跑 wave research，不做 setup/readiness checks。 |
| hitl1 | 询问结构化问题；把 `research_profile`、`root_must_answer_set` 和 HITL1 status 写入 `rb_profile.yaml`；gate 检查这些字段。 |
| setup | 验证 required directories/control files、instantiated topic data、fresh bundle plan/profile/status consistency。 |
| wave0 | 增加少量真实 shared reference artifacts，metadata 必须可解析；按要求更新 index/status/trace。 |
| wave1 | 保持 placeholder boundary：写入简单、可实验跑通的 topic-scoped skeleton artifact(s)，但不声称 full subagent coverage 或真实 deepening 完成。 |
| wave2 | 从 verified wave artifacts 派生一个小的 cross-topic synthesis artifact。 |
| hitl2 | 产出 decision brief，询问 structured user decision，并把结果写入 `rb_profile.yaml`/state。 |
| readiness | 重新运行 deterministic bundle/gate checks，验证 required artifacts 可达，并确认 checkpoint trace coverage。 |
| final | 从已验证 bundle state 生成 final report artifact(s)。 |

Skeleton 只有在每个 node 都产出真实 files/state/trace，且对应 gate 能检查这些产物时才算通过。Test fixtures 只有在明确标记为 fixtures，并且走同一套真实 file/state/check path 时才允许使用。

Log 可以作为辅助诊断材料，但通过/失败的审计依据应优先来自 structured bundle files、gate CLI output 和 `rb_trace.jsonl`。普通 console output 不能单独作为 pass/fail proof。

---

## 12. 分阶段落地策略（Phased Delivery Strategy）

Workflow Foundation 应分层交付，但目标是**把 V12 中仍然有价值的 workflow 内容全量迁移到新 node/gate shape**，不是只挑一部分搬。区别在于：

- **迁移范围要全量**：V12 里关于 instantiation、HITL、setup、wave0、wave1、wave2、readiness、final delivery 的有效流程知识，都应该在新结构中找到归宿。
- **能力启用要分阶段**：先把内容放到正确 node 和 shared node 里，明确哪些是可执行要求、哪些是 deferred capability；不要因为某个复杂能力暂时没实现，就把它留在旧结构或让它继续散落。
- **质量门要逐步变硬**：先用 minimum real verifiable action 验证 node/gate loop，再逐步把每个 phase 的 gate rules 加到足够精确。

这意味着 Wave1 的内容也要搬过来，但在 foundation 阶段只能标记为 placeholder/deferred capability boundary，不能假装 full subagent research 已完成。

### Phase A: Workflow Contract Skeleton

目标：定义并验证 lifecycle shell，同时建立所有 phase/shared node 的归位框架。

Deliverables:

- Phase manifest 或等价 lifecycle map。
- 9 个 phase nodes 和 required shared nodes。
- Node metadata contract，包含 `node_type`、`requires` 和 `suggested_context`。
- 8 个 Gate definition JSON files。
- One thin CLI per gate。
- Agent 用于运行 lifecycle 的 playbook。

Success criterion：Agent 能加载每个 phase，执行 minimum real action，运行 gate，repair 一个简单 failure，并且只在 gate pass 后 advance。

### Phase B: Minimum Real Bundle Run

目标：用真实 run bundle 证明 lifecycle，而不是用 scratch files。

Deliverables:

- 通过真实 instantiation path 创建 disposable 或 test run bundle。
- 真实写入 canonical bundle files。
- 在适用位置产生真实 loader/gate/check trace entries。
- 用 minimal artifacts 完整跑通 instantiation -> final。

Success criterion：每一个 passed claim 都能从 bundle files、gate CLI output 和 trace 审计出来。

### Phase C: Full Content Migration by Phase

目标：把 V12 中仍然有效的 workflow content 全部迁移到新的 node/gate/shared-node shape。迁移不是一次性启用所有能力，而是先把内容放到正确位置，并标明每块内容当前是 executable requirement、guidance、generated summary 还是 deferred capability。

Suggested order:

1. instantiation
2. hitl1
3. setup
4. wave0
5. wave1
6. wave2
7. hitl2
8. readiness
9. final
10. shared nodes（profile、gate summary、schema summary、anti-cheating rules、repair guidance）

Wave1 的历史内容也要迁移进 `phase-wave1.md` 或相关 shared nodes。Foundation 阶段只要求 placeholder：写少量简单逻辑，让 workflow 可以实验性跑通；复杂 subagent/deepening 内容标为 future guidance，不在 foundation 阶段假装完成。Wave1 不能因为 placeholder node 存在就被视为完成，也不能因为能力复杂就留在旧 V12 结构里。

### Phase D: Wave1/Subagent Expansion

目标：把真实 topic-specific deepening、subagent dispatch、candidate intake、repair/backfill、fan-in review 作为单独 capability track 加入。

Wave1 是风险最高的 workflow segment。应先证明 foundation control loop 成立，再扩展 Wave1；否则 subagent complexity 会遮蔽 workflow 本身是否可靠。

---

## 13. 非范围（Out of Scope）

Workflow Foundation 不需要解决：

- 完整 subagent dispatch/collection semantics。
- 复杂 queue scheduling 或 preemption。
- 完整 source-quality ontology。
- 超出 minimal verified output 的 final report view customization。
- 真实世界长跑 E2E research quality。
- 任何 hidden JS workflow runner。

这些可以后续加入，但不能偷偷塞进 foundation，削弱基本 node/gate loop。

---

## 14. Review Checklist

这份 requirements baseline 被用于下游工作前，reviewer 需要区分两类问题：

- **明确核实项（Acceptance Checks）**：当前文档应该已经说清楚，reviewer 主要回答 yes/no。
- **已回答决策（Answered Decisions）**：review 期间已经拍板，正文应反映这些结论。

### 14.1 明确核实项（Acceptance Checks）

A1. **Lifecycle order**：阶段顺序是否明确为 `instantiation -> hitl1 -> setup -> wave0 -> wave1 -> wave2 -> hitl2 -> readiness -> final`？

A2. **Gate count**：是否明确只有 8 个 non-terminal gates，并且 `phase-final.md` 没有 outgoing gate？

A3. **HITL1 state**：HITL1 是否明确在 instantiation 之后，并把用户选择写入 active bundle 的 `rb_profile.yaml`？

A4. **Node type**：Node metadata 是否区分 `node_type: phase` 和 `node_type: shared`？

A5. **Shared node boundary**：Shared node 是否明确不是 hidden phase，也不拥有 gate/runtime authority？

A6. **Current bundle filenames**：当前 bundle filenames 是否统一使用 `rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`？

A7. **Auditability**：Skeleton actions 是否要求真实 files/state/trace/log 作为审计依据，而不是 mock、console-only proof 或手写 fake receipt？

A8. **Full migration**：V12 有效 workflow content 是否要求全量迁移到新 node/gate/shared-node shape，而不是只迁“成熟部分”？

### 14.2 已回答决策（Answered Decisions）

D1. **Instantiation naming**：`dpt_rb_*` 目录名由 Agent/CLI 根据本次 request 自动生成，默认使用英文 slug；CLI 负责 collision detection，冲突时换名并保留 suffix。

D2. **Final/revision path**：用户 final 后反馈走 HITL2 repair/rerun 语义，反馈意见写入 `rb_profile.yaml` 中承载用户反馈/HITL2 decision 的位置，再回到受影响 phase 或 repair path。

D3. **Gate CLI shape**：坚持 one gate per external CLI；内部可以共享 helper，但外部入口保持一 gate 一 CLI，方便管理和维护。

D4. **Gate authority**：Gate definition JSON/CLI 负责传统程序能稳定判断的 deterministic checks，包括字段、计数、状态、trace 和 string 操作。需要语义理解的条件由 CLI 作为 structured feedback 返回给 Agent/MD 判断。

D5. **Gate prose boundary**：`shared-gate-rules.md` 不长期人工维护；它应由 Gate definition JSON/gate definition tooling 生成或随 gate 规则升级同步更新，避免 prose/definition 漂移。

D6. **Gate retry/escalation**：默认 gate repair retry 为 3 次，并且可配置；实例化时可以按 run/profile/gate 调整。

D7. **Wave1 status**：Foundation 阶段的 Wave1 是 placeholder，只写简单逻辑让 workflow 可以实验性跑通；复杂 subagent/deepening 内容迁移进新结构但标为 future guidance。

D8. **Context loading**：Foundation 阶段只保留 `requires` 和 `suggested_context` 两类 context；暂不增加 generated/debug/other context 类型。

D9. **Stop escalation / waiting**：Transient blocker 不算 stop；run 进入 waiting/transient state 等外部条件恢复，恢复后继续。只有需要用户决策、权限缺失、连续 gate failure 或无法不造假地继续时，才进入 explicit escalation。

### 14.3 开放问题（Open Questions）

当前暂无未决 open questions。后续 review 如果发现新问题，应新增到本节并说明为什么当前文档无法回答。
