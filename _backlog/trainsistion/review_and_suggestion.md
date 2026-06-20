# Transition Layer Review And Suggestion

> Status: independent review memo, not an accepted OpenSpec spec.
> Scope: `DPT_FRAMEWORK/workflows/` transition layer, workflow node metadata, gate CLI routing feedback, and related accepted specs.
> Sources reviewed: `cc_transition_systemic_analysis.md`, `cx_transition_boundary_review.md`, `guidelines/project-charter.md`, accepted OpenSpec specs, current framework code, workflow data, and regression tests.

## Executive Summary

两篇 transition memo 都抓到了真实问题：当前 `chain`、`fsm`、`manifest`、phase frontmatter、gate CLI、bundle status machine 同时出现“transition-like”概念，而且 key 和 verb 不统一。

我的独立判断是：问题的核心不是简单命名清理，而是 **transition abstraction 的使用方契约没有定稳**。

最重要的定调：

```text
currentNodeRef + outcome(passed/failed) -> nextNodeRef
```

`chain` 和 `fsm` 应该是这同一个 abstraction 的两种 backend：

- `chain`：简单、线性、低理解负担的 node-keyed transition table。
- `fsm`：复杂分支、终止、回退、条件扩展能力更强的 node-keyed graph。

它们不应该要求 MD Controller / Agent 改变使用习惯。MD Controller 最好只提供它天然知道的局部事实：

- 当前加载的 node fileRef，例如 `phases/phase-wave0.md`
- 当前 bundle path
- 如果直接查询 router，则提供 gate/check outcome：`passed` 或 `failed`

在推荐运行路径里，MD Controller 甚至不需要自己调用 transition router。它只要把 `--current-node` 和 `--bundle` 交给当前 node 声明的 gate CLI；gate CLI 执行 deterministic check 后，用 `currentNodeRef + outcome` 向 Engine 查询 next，并把 `check.next` 返回给 MD Controller。

Engine/CLI 应承担机械精准的事情：校验参数、确认 node/gate 绑定、查路由、区分 terminal / no transition / invalid input / config error，并用 inspect/advice 给出可修复反馈。

API decision:

```text
Canonical API:
  resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)

Removed old API:
  askNext(path, gate, state)
```

There should be no gate-key routing API and no `string | null`-only router result. The old `askNext()` abstraction should be removed from specs, code, and tests because the project has no external compatibility obligation and the old model preserves the ambiguity this review is trying to eliminate.

## Current Findings

### 1. 现有 `chain` 与 `fsm` 不是可替换 backend

当前真实数据形态：

```text
transitions.chain.json:
  gateKey + passed -> nextNodeRef

transitions.fsm.json:
  currentNodeRef + success -> nextNodeRef
```

当前真实行为：

```text
askNext(transitions.chain.json, "instantiation-complete", "passed")
-> phases/phase-hitl1.md

askNext(transitions.fsm.json, "instantiation-complete", "passed")
-> null

askNext(transitions.fsm.json, "phases/phase-instantiation.md", "success")
-> phases/phase-hitl1.md
```

这说明 `.fsm.json` 不是坏方向，而是目前没有兑现“与 chain 共享同一使用方契约”的承诺。现在的差异会让后续 Coding Agent 误以为 chain 和 FSM 是两套不同心智模型。

### 2. `gateKey` 不应成为 workflow routing 的主输入

`gateKey` 的合理职责是：

```text
这个 phase node 完成后应该运行哪个 deterministic gate checker?
```

它不应该成为：

```text
workflow router 的主状态 key
```

MD Controller / Agent 在运行时自然知道的是“我当前加载的是哪个 node”，不是“这个 node 对应的 gate key 应该拿来查路由”。要求 Agent 用 `wave0-complete` 这类 gate key 查 next，本质上是把 Engine 可以精确处理的映射负担转移给 LLM。

### 3. `manifest.json` 是 identity bridge，不是 next authority

`manifest.json` 当前同时持有三类身份：

| Identity | Example | Meaning |
|----------|---------|---------|
| phase key | `wave0` | Human/Agent lifecycle label |
| node ref | `phases/phase-wave0.md` | Loadable Markdown node fileRef |
| gate key | `wave0-complete` | Deterministic checker identity |

它不应恢复 `next` 字段，也不应靠数组相邻关系推导 runtime next。但它可以作为 identity bridge 和一致性检查来源：

```text
currentNodeRef -> declared gateKey
gateKey -> owning currentNodeRef
```

这个桥接关系适合 Engine 用来检查 MD Controller 是否传错参数，也适合 consistency validator 防止 transition/backend/frontmatter 漂移。

### 4. `passed` / `failed` 应成为公共 transition outcome

`success` 对 Agent 来说不够精确：

- phase 工作成功？
- gate CLI 成功执行？
- gate rules 通过？
- research 质量成功？

当前 checkpoint 反馈领域的自然语言是 `passed` / `failed`。因此公共 transition outcome 应统一为：

```text
passed | failed
```

FSM 仍可支持复杂 graph，但默认 workflow outcome 不应迫使调用方把 `passed` 映射成 `success`。

### 5. 当前 loader frontmatter 解析不足

`workflow-chain.mjs` 当前 `NodeFrontmatter` 只保留 `requires`。由于 Zod 默认剥离 unknown fields，loader output 会丢失：

```text
node_type, id, phase, gate, stop, suggested_context, subagent
```

如果后续 Gate CLI / Engine 要验证 `currentNodeRef` 和 gate 绑定，这些 metadata 必须能被保留、返回、并参与一致性检查。

## Target Runtime Model

### Preferred MD Controller Path

推荐的运行路径是：

```text
1. MD Controller loads current phase node.
2. Node frontmatter/body tells Agent which gate command to run.
3. MD Controller invokes that gate CLI with:
   --bundle <bundle>
   --current-node <currentNodeRef>
   --transitions <transitionBackend>
4. Gate CLI validates currentNodeRef and node/gate binding.
5. Gate CLI evaluates deterministic gate rules.
6. Gate CLI asks Engine router:
   currentNodeRef + outcome -> nextNodeRef
7. Gate CLI returns check/inspect/advice, including check.next when available.
8. MD Controller reads feedback and decides load next / repair / block / ask HITL.
```

Under this path, MD Controller does not need to know the gate key for routing. It only passes simple local facts.

Example invocation:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs \
  --bundle dpt_rb_example \
  --current-node phases/phase-wave0.md \
  --transitions DPT_FRAMEWORK/workflows/transitions.chain.json
```

### Router Contract

The Engine-internal router contract should be:

```text
resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)
```

Where:

- `currentNodeRef` is a canonical node fileRef, relative to `DPT_FRAMEWORK/workflows/nodes/`.
- `outcome` is `passed` or `failed`.
- `context` may include manifest/frontmatter/gate definition references needed for validation.

The router should return a detailed result. It should not expose `nextNodeRef | null` as the serious API, because that collapses terminal, no-transition, and caller-input errors into the same value.

## Canonical Identity And Verb Policy

### Identity Roles

Recommended identity split:

| Identity | Example | Role | Route By It? |
|----------|---------|------|--------------|
| Node fileRef | `phases/phase-wave0.md` | Canonical routing key; directly loadable by node loader | Yes |
| Frontmatter `id` | `phase-wave0` | Stable metadata and diagnostic label | No |
| Phase key | `wave0` | Human/Agent lifecycle label | No |
| Gate key | `wave0-complete` | Deterministic checker identity | No |

The canonical transition key should be the node fileRef. It is the only identifier that is both:

- naturally known after loading the node;
- directly usable by `assessNode(nextNodeRef, ...)` without a second lookup.

Frontmatter `id` remains useful for diagnostics and self-description, but it should not become the transition key. Using `id` as the transition key would force another mapping step before loading the next Markdown node.

### Verb Roles

Recommended verb split:

| Domain | Values | Role |
|--------|--------|------|
| Public routing outcome | `passed`, `failed` | Shared event vocabulary for chain and FSM |
| Gate result field | `check.passed: true/false` | Deterministic checkpoint result |
| Internal backend status | optional, explicitly scoped | Must not leak into MD Controller routing |

FSM should not use `success` as the normal gate-driven workflow event. If a future FSM needs richer backend statuses, that should be introduced as an explicit advanced extension, not as the default vocabulary for gate outcomes.

## Backend Shape Recommendation

### Chain Backend

`chain` should be the simple node-keyed form of the same abstraction:

```json
{
  "phases/phase-instantiation.md": { "passed": "phases/phase-hitl1.md" },
  "phases/phase-hitl1.md": { "passed": "phases/phase-setup.md" },
  "phases/phase-setup.md": { "passed": "phases/phase-wave0.md" },
  "phases/phase-wave0.md": { "passed": "phases/phase-wave1.md" },
  "phases/phase-wave1.md": { "passed": "phases/phase-wave2.md" },
  "phases/phase-wave2.md": { "passed": "phases/phase-hitl2.md" },
  "phases/phase-hitl2.md": { "passed": "phases/phase-readiness.md" },
  "phases/phase-readiness.md": { "passed": "phases/phase-final.md" }
}
```

This is still human-friendly: a plain current-node table. It removes the need for users to understand gate keys as routing states.

Do not invent a `failed` branch policy just to fill the table. If failed routing is undefined, that is a valid `no_transition` result and the gate's inspect/advice can drive Agent repair. Add explicit `failed` branches only when the behavior is accepted and deterministic.

### FSM Backend

`fsm` should keep its graph structure, but use the same key and outcome domain:

```json
{
  "name": "wff-lifecycle",
  "initial": "phases/phase-instantiation.md",
  "states": {
    "phases/phase-wave0.md": {
      "on": {
        "passed": "phases/phase-wave1.md"
      }
    }
  }
}
```

Under this model, FSM is not a separate user-facing contract. It is the richer backend for the same router query.

### Terminal Semantics

Terminal must be explicit and not confused with invalid input.

Recommended taxonomy:

| Kind | Meaning | Example |
|------|---------|---------|
| `next` | Valid transition to another node | `wave0 passed -> wave1` |
| `terminal` | Valid transition with `next: null` | Explicit backend terminal edge |
| `no_transition` | Valid node/outcome, but backend has no edge | `wave0 failed` when no failed edge exists |
| `invalid_input` | Caller supplied bad input | unknown node, invalid outcome |
| `config_error` | Framework data is malformed | bad manifest, malformed transition file |

In current WFF v1, `phase-final.md` has `gate: null`, so the controller normally stops before running a gate/router query from final. A backend may still model explicit terminal edges for future workflows, but final-node termination should not require inventing a fake `phase-final + passed` gate call.

## Detailed Result And Error Feedback

The detailed router result should make ambiguity impossible:

```json
{
  "ok": true,
  "kind": "next",
  "currentNode": "phases/phase-wave0.md",
  "outcome": "passed",
  "next": "phases/phase-wave1.md",
  "inspect": [],
  "advice": []
}
```

No transition:

```json
{
  "ok": false,
  "kind": "no_transition",
  "currentNode": "phases/phase-wave0.md",
  "outcome": "failed",
  "next": null,
  "inspect": [
    {
      "code": "NO_TRANSITION",
      "issue": "No transition is defined for phases/phase-wave0.md with outcome failed."
    }
  ],
  "advice": [
    "Read the gate failure feedback and repair the current phase before rerunning the gate."
  ]
}
```

Invalid caller input:

```json
{
  "ok": false,
  "kind": "invalid_input",
  "currentNode": "phases/phase-missing.md",
  "outcome": "passed",
  "next": null,
  "inspect": [
    {
      "code": "UNKNOWN_CURRENT_NODE",
      "issue": "currentNodeRef phases/phase-missing.md is not present in the workflow manifest."
    }
  ],
  "advice": [
    "Reload the current phase node and pass its fileRef as --current-node."
  ]
}
```

Node/gate mismatch at Gate CLI boundary:

```json
{
  "check": {
    "passed": false,
    "gate": "wave0-complete",
    "next": null
  },
  "inspect": [
    {
      "code": "NODE_GATE_MISMATCH",
      "issue": "currentNodeRef phases/phase-wave1.md declares gate wave1-complete, but this CLI checks wave0-complete."
    }
  ],
  "advice": [
    "Reload the current phase node and invoke the gate command declared by that node."
  ]
}
```

Recommended exit class:

| Case | Meaning | Exit |
|------|---------|------|
| Gate passed | deterministic gate passed | `0` |
| Gate failed | content/state did not satisfy gate | `1` |
| Caller input invalid | missing/wrong `--current-node`, mismatch, unknown node, invalid outcome | `2` |
| Engine/config error | malformed transition file, malformed manifest, unreadable required file | `3` |

Exact exit codes should be accepted through OpenSpec, but the distinction is important. An Agent repairs a bad invocation differently from a failed gate.

## Node Frontmatter Policy

Frontmatter should be adjusted, but not by adding route authority.

Recommended policy:

- Do not add `next`.
- Do not make frontmatter `id` the transition key.
- Keep `gate` as phase node's checker binding.
- Preserve and validate full phase/shared metadata in loader output.
- Return loaded `fileRef` beside parsed frontmatter.

Useful phase frontmatter shape remains:

```yaml
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires:
  - shared/shared-anti-cheating-rules
suggested_context:
  - shared/shared-schemas
```

Engine interpretation:

| Field | Engine meaning |
|-------|----------------|
| loaded `fileRef` | Canonical routing key |
| `node_type` | Phase/shared discriminator |
| `id` | Stable diagnostic label |
| `phase` | Human/Agent lifecycle label |
| `gate` | Gate CLI/checker binding |
| `stop` | HITL behavior constraint |
| `requires` | Mandatory loadable dependencies |
| `suggested_context` | Optional context refs if loader-consumed |

Recommended loader fix:

- Replace minimal `NodeFrontmatter` with a phase/shared metadata schema, or preserve unknown fields while validating known fields.
- Ensure `readMarkdownFile()` / `assessNode()` returns `{ fileRef, md, frontmatter }`.
- Validate phase frontmatter against manifest in workflow consistency checks.
- Normalize `suggested_context` references to `shared/shared-*` if those refs become loader-consumed.

Do not duplicate canonical path inside frontmatter unless a future spec gives a strong reason. The loader already knows the canonical fileRef because the caller used it to load the file; duplicating it creates another drift point.

## Internal Engine Helpers

Recommended helper boundaries:

- `normalizeNodeRef(input, manifest)`:
  - accepts caller-provided current node ref;
  - returns exact canonical manifest node ref or a structured input error.
- `validateNodeGateBinding(currentNodeRef, gateKey, manifest, frontmatter)`:
  - confirms the current phase node declares the gate being executed.
- `resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)`:
  - dispatches to chain/FSM backend;
  - returns `next`, `terminal`, `no_transition`, `invalid_input`, or `config_error`.
- `validateWorkflowPackageConsistency(workflowDir)`:
  - verifies manifest, phase frontmatter, gate definitions, chain, FSM, and shared references close over the same package.

Strictness policy:

- Stored transition keys must be canonical node fileRefs with subdirectory and `.md` suffix.
- Transition targets must also be canonical node fileRefs or `null`.
- Gate CLI should require `--current-node`.
- If caller passes a bare id such as `phase-wave0`, Engine may return a diagnostic suggesting `phases/phase-wave0.md`, but should not silently guess unless an accepted spec explicitly allows alias resolution.

The older `askNext(path, gate, state)` should be removed, not wrapped. Keeping both APIs would preserve two mental models and increase the chance that future Coding Agents choose the wrong one.

## Answers To Prior Memos

This review is meant to resolve, not merely summarize, the open questions from the two prior memos.

| Prior question / finding | Answer in this review |
|--------------------------|-----------------------|
| `askNext()` FSM branch silently fails with real workflow data | Correct diagnosis, but the fix should not be "teach FSM about gate keys". Delete the old gate-key abstraction and replace it with `resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)`. |
| Chain and FSM have different key contracts | Make both backend contracts node-keyed. Chain becomes a node-keyed table; FSM remains a node-keyed graph. |
| Chain uses `passed`, FSM uses `success` | Standardize public routing outcome to `passed` / `failed`. `success` should not be the default gate-driven workflow event. |
| Manifest has phase key, node ref, and gate key | Keep manifest as inventory plus identity bridge. It is not next authority, but it is the right source for consistency checks and node/gate binding validation. |
| Should file path or canonical id be the transition identity? | Use node fileRef such as `phases/phase-wave0.md` as canonical routing identity. Frontmatter `id` remains metadata and diagnostic label. |
| Should FSM be downgraded or kept separate? | No. FSM should be retained as the richer backend for the same node-result routing abstraction. The mistake is exposing a different caller model, not having FSM. |
| Chain tracker is stateless, FSM tracker is stateful | That difference can remain internal. The MD/Gate-facing facade should be stateless and explicit: `currentNodeRef + outcome`. |
| Should manifest generate routing data? | Not initially. Prefer consistency validation first. Generation/projection can be a later accepted change if duplication becomes painful. |
| Should frontmatter metadata stripping be treated as a bug? | Yes, for this direction. Engine cannot validate node/gate binding if loader output drops `gate`, `phase`, `node_type`, etc. |
| Should `suggested_context` become loadable? | Not required for the transition fix. If any spec makes it loader-consumed, normalize it to loadable `shared/shared-*` refs and validate it. |
| What about `rb_status.json` underscore states and `PASS_*` events? | Keep them separate. Bundle status machine is mutable runtime status, not Markdown node routing. Do not normalize it in this change. |

The resulting answer differs from both prior memos:

- It agrees with CC that `passed` is the right verb and fileRef is the right canonical node identity.
- It agrees with CX that manifest must not regain next authority and that frontmatter parsing is currently insufficient.
- It disagrees with the tentative idea that chain should simply remain current canonical gate routing while FSM is non-authoritative. Instead, it makes both chain and FSM backends of a cleaner node-result router.
- It avoids promoting FSM into a JS-owned Agent Flow controller; FSM remains deterministic routing data behind a narrow Engine facade.

## Proposed OpenSpec Change

Suggested change name:

```text
clarify-transition-node-result-routing
```

Likely scope:

- `transition-table`:
  - public transition query becomes `currentNodeRef + outcome -> nextNodeRef`;
  - `chain` and `fsm` are interchangeable backends under that query;
  - shared outcome verbs are `passed` / `failed`;
  - detailed result distinguishes `next`, `terminal`, `no_transition`, `invalid_input`, and `config_error`.
  - accepted `askNext(path, gate, state)` requirements and tests are removed or rewritten around `resolveNodeTransitionDetailed(...)`.
- `gate-skeleton`:
  - gate CLI accepts `--current-node`;
  - gate CLI validates node/gate consistency;
  - caller input errors produce structured inspect/advice and distinct exit class.
- `workflow-node-contract`:
  - loaded node fileRef is canonical routing identity;
  - frontmatter `gate` remains checker binding;
  - frontmatter `id` remains metadata, not routing key;
  - `next` remains out of frontmatter and manifest.
- `dynamic-node-loading` or related loader spec:
  - loader preserves full metadata needed for Agent/Engine feedback;
  - loader returns loaded fileRef with parsed frontmatter.
- New or expanded workflow consistency check:
  - manifest, frontmatter, gate definitions, chain backend, FSM backend, and shared refs must be internally closed.

Non-goals:

- Do not move multi-stage Agent Flow into JS.
- Do not make manifest array adjacency runtime next authority.
- Do not merge bundle status machine states with Markdown node routing.
- Do not require MD Controller to understand gate keys for next-node routing.
- Do not invent failed-branch repair policy unless accepted by spec.

## Implementation Direction

Recommended sequence:

1. Add a detailed node-result transition router API.
2. Add or migrate node-keyed `transitions.chain.json`.
3. Migrate `transitions.fsm.json` event verbs from `success` to `passed` for the canonical pass path.
4. Update Gate CLI wrappers to accept `--current-node` and validate node/gate binding before returning `check.next`.
5. Update loader/frontmatter parsing so full metadata is preserved and `{ fileRef, md, frontmatter }` is available.
6. Add a workflow package consistency validator/test.
7. Remove the old `askNext(path, gate, state)` API, its accepted spec requirement, and its gate-key routing tests.

No Compatibility Policy:

The project has no external API obligation here, so correctness and future Agent clarity are more important than preserving an old internal shape.

Do not keep a wrapper from `askNext(path, gate, state)` to the new router. A wrapper would leave two valid-looking entry points in the repo and invite future Coding Agents to repair the wrong abstraction. The OpenSpec change should explicitly replace the old accepted contract with the new one.

All new specs, code, and tests should point to `resolveNodeTransitionDetailed(...)` as the only transition routing API.

## Test And Validation Plan

### Backend equivalence

For every non-final phase in `manifest.json`:

```text
chain.resolve(currentNodeRef, "passed") === fsm.resolve(currentNodeRef, "passed")
```

Example:

```text
resolve(chain, "phases/phase-wave0.md", "passed")
-> phases/phase-wave1.md

resolve(fsm, "phases/phase-wave0.md", "passed")
-> phases/phase-wave1.md
```

### Caller input diagnostics

Required cases:

- missing `--current-node` -> `MISSING_CURRENT_NODE`
- unknown node -> `UNKNOWN_CURRENT_NODE`
- node/gate mismatch -> `NODE_GATE_MISMATCH`
- invalid outcome -> `INVALID_OUTCOME`
- malformed transition file -> `config_error`, not gate failure

### Workflow package consistency

Validation should fail if:

- manifest node file does not exist
- phase frontmatter `phase` or `gate` does not match manifest
- final phase declares a non-null gate
- gate definition key does not match exactly one phase frontmatter gate
- chain keys are not manifest node refs
- chain targets are not manifest node refs or `null`
- FSM states are not manifest node refs
- FSM targets are not manifest node refs or `null`
- chain and FSM disagree on canonical `passed` transitions
- `requires` references do not resolve
- loader-consumed `suggested_context` references do not resolve

### Existing checks to keep

Continue running:

```bash
node --test tests/engine/ask-next.test.mjs tests/engine/transition-chain.test.mjs tests/engine/transition-fsm.test.mjs tests/engine/workflow-chain.test.mjs tests/engine/workflow-fsm.test.mjs
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
```

## Final Recommendation

Make `currentNodeRef + outcome` the public transition abstraction.

This best matches the project boundary:

- MD Controller handles what it is good at: reading the current node, doing work, invoking the declared checkpoint, and reacting to feedback.
- JS/Engine handles what it is good at: exact identity checks, transition lookup, schema validation, and precise diagnostics.
- `chain` remains easy for simple workflows.
- `fsm` remains ready for complex workflows.
- Switching backend does not force Agent/MD Controller to learn a new mental model.

The durable design rule:

```text
Do not make the caller understand backend keys.
Make the caller provide simple, local facts.
Let Engine validate and route.
```
