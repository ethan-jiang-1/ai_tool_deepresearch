## Context

`run-entry` 已经区分显式可达 existing bundle 与 new research，也要求 `RUN.md` 覆盖 built-in research shortcut。BUG-139 显示 generic `research` skill 仍可在 root routing 之前被匹配；BUG-140 显示即使 skill 未调用，Agent 仍可直接使用 WebSearch/WebFetch 完成 request。两种行为的共同故障不是 Gate、bundle 或 evidence 规则，而是 selected DPT request 没有先进入 DPT Agent Flow。

当前 Source of Record 是 accepted `run-entry` spec；入口行为由 root `AGENTS.md` / `CLAUDE.md`、framework `AGENTS.md` / `CLAUDE.md`、`DPT_FRAMEWORK/RUN.md` 和 framework README 共同向不同加载时机的 Agent 传达。宿主的 skill matcher、tool injection 和是否实际发起 tool call 不属于 repo runtime authority。

## Goals / Non-Goals

**Goals:**

- 在 selected DPT research 的最前面给 Agent 一个唯一、可执行的 entry choice：explicit reachable existing bundle 读 continuation playbook；否则 selected new research 读 `RUN.md`。
- 禁止 entry 前的 generic shortcut 与 atomic research fallback，并明确 `RUN.md` 后的 HITL1 capability probe 和后续 phase/delegated research 仍依 accepted contract 授权。
- 让 root 与 framework guidance 使用同一短 policy anchor，并用 focused document contract 验证 repository-owned guidance 事实。
- 保持 DPT 的 Markdown Agent Flow / Engine checkpoint boundary，不改变 runtime bundle truth、Gate、receipt、queue 或 search/evidence semantics。

**Non-Goals:**

- 不实现 provider-specific settings hook、skill blacklist、tool interceptor 或 host scheduler。
- 不声称 Markdown 能强制控制所有 harness skill matching、WebSearch availability 或 model behavior。
- 不新增 lifecycle checkpoint、entry state、runtime schema、CLI、trace event 或 user confirmation。
- 不改变用户未选择 DPT 时的 normal research routing。

## Decisions

### 1. Define entry priority as one bounded reader-facing distinction

`DPT-selected entry` answers only: “this request's first framework document is which one?” Its three outcomes are `continue-run-bundle.md`, `RUN.md`, or not selected. It preserves the distinctions that change that answer: explicitness, reachability, existing-bundle continuation/inspection intent, and selected DPT research intent. Once one document is selected and read, the Agent can stop routing analysis and follow its existing instructions; the concept neither selects research content nor persists state.

This is a reader-facing guidance distinction, not a new Engine state or lifecycle mode. `RUN_BUNDLE.md` / `BUNDLE_MAP.md` remain passive navigation surfaces unless the existing accepted explicit/reachable selection condition holds.

### 2. Make entry-first a positive route plus a narrow pre-entry prohibition

Every affected behavior surface will carry the same short anchor in local wording:

```text
explicit reachable existing bundle + continue/inspect -> read continuation playbook first
otherwise selected DPT research -> read RUN.md first
before that selected entry is read, do not use generic research shortcut,
direct research/search/fetch, or manual evidence synthesis for this request
```

The prohibition applies only to work for the selected request. It does not prohibit normal repository inspection, ordinary implementation work, nor the actual research capabilities that the loaded `RUN.md`/phase contract later authorizes. This prevents BUG-140 without treating all WebSearch/WebFetch usage as globally forbidden.

The anchor will name current generic examples `research` and `deep-research`, then retain category language for equivalent one-shot shortcuts. Exact skill-name enumeration is guidance hardening, not a claim that future unknown skills can be mechanically disabled.

### 3. Keep one authoritative flow rather than adding enforcement machinery

The shortest legal loop is:

```text
selected request
  -> existing-bundle continuation playbook | RUN.md
  -> existing Agent-facing workflow/phase instruction
  -> phase-authorized research work
```

No new controller, hook, background checker, per-session memory, retry tree, or mutable route record is needed. The change replaces the incomplete “do not call one shortcut” mental rule with one routing decision plus one bounded negative boundary. It also prevents the framework-local `start-research` wording from becoming an alternative pre-entry path: `RUN.md` remains the selected new-research entry and may delegate to existing start instructions.

Rejected alternatives:

- **Provider settings/hook suppression:** no verified cross-host conditional capability exists in this repository. Adding it would create a platform-specific authority outside DPT and could disable later legal work.
- **Engine-issued entry token/state:** entry selection is conversation guidance, not deterministic runtime truth; a state/token would add a second lifecycle authority without a direct Engine question.
- **Only enumerate more skill names:** does not cover BUG-140's atomic-tool path and will decay as tool inventories change.
- **Ban all search tools globally:** would contradict HITL1 capability probing and later research phases.

### 4. Verify the repository-controlled contract, not a synthetic host observation

One `integration` document-contract test will prove the required behavior surfaces retain the policy anchor, selected entry order, exceptions and no ambiguous skill-only wording. It proves content synchronization, not model compliance.

`agent_flow_e2e` is deliberately not selected. Existing experiment traces start after the Playbook Agent receives an injected playbook; the established Subject adapter starts from a synthetic system prompt and is restricted to registered phase cases. Extending either surface for case-specific first-action capture would create a new acceptance-critical adapter, ledger exception, and transcript predicate. It would still observe a constructed prompt rather than prove that a real host did not select a generic skill before repository routing. That is a worse control loop than the defect warrants.

`unit` and `deterministic_e2e` are also not applicable: no pure helper/API or JS-led multi-checkpoint state chain is introduced. The one direct, repeatable proof is the selected document contract; host behavior remains a documented residual boundary rather than fabricated trace evidence.

### 5. Responsibility boundary

The Agent reads selection facts, selects the existing legal entry document, and executes its ordinary follow-up actions. The user supplies only the research request or an explicit existing-bundle intent; no new decision checkpoint is created. Engine ownership begins where existing bundle/phase commands, schemas, gates and trace contracts already begin. An unavailable host capability is an external boundary, never permission to synthesize a result, write runtime truth, or bypass the framework.

## Risks / Trade-offs

- [Host invokes a generic skill before the model follows repository guidance] -> Retain it as an external residual risk; do not represent the document contract as an enforcement guarantee.
- [Policy wording drifts across surfaces] -> Use one short anchor and an integration document contract that reads every required surface.
- [Pre-entry prohibition accidentally blocks legal later research] -> Test and state the boundary explicitly: it expires once selected entry guidance delegates to the phase-authorized capability probe or Wave work.
- [Existing-bundle intent is misclassified as a new run] -> Preserve the accepted explicit + reachable selector and assert its precedence in the document contract.
- [A synthetic experiment is mistaken for host enforcement] -> Do not add an Agent-flow claim. Keep the host matcher/tool-injection limitation explicit and validate only repository-owned guidance.

## Migration Plan

1. Apply the doc anchor and `RUN.md` entry wording atomically with the static document contract.
2. Update `CHANGELOG.md` and the `RUN.md` banner to `v0.58` under the existing version-management contract.
3. Keep the host-level matcher/tool-injection limitation visible in the changed guidance and document-contract assertions. Rollback is documentation/version rollback only; no bundle migration or runtime state repair exists.

## Open Questions

None for this proposal. A future platform-specific capability suppression mechanism requires separate host evidence and a separately scoped change.
