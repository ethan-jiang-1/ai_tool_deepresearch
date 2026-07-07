# BUG-024: Agent reads RUN.md entry point but bypasses Section 2 flow — does free-form research instead

**Date:** 2026-07-05
**Severity:** P0 — the framework entry point is the gate before all gates; if it can be bypassed, no downstream enforcement matters
**Discovered during:** kol-sdlc-deep-mining — Agent read RUN.md, acknowledged DPT_FRAMEWORK entry, then ignored Section 2 and wrote a free-form analysis report

## Symptom

1. User pointed Agent at `_raw_kol/` directory for deep research
2. Agent read `DPT_FRAMEWORK/RUN.md` (the framework entry point)
3. RUN.md Section 0 explicitly says: "读到本文件即已选定 DPT_FRAMEWORK 入口...直接执行下方 Section 2 的 DPT_FRAMEWORK 流程"
4. RUN.md Section 2 says: "定名 → 建 bundle → 写 rb_plan.md → 加载 phase-instantiation.md → 自驱动到 phase-final"
5. Agent **read and quoted RUN.md** in its response, then **did not execute Section 2**
6. Instead, Agent manually read all 14 `_raw_kol/` files, wrote a long free-form analysis report, and only entered the framework when the human said "我们要做 seed topic"

The framework entry point was acknowledged and then ignored. The Agent treated it as context to read, not as instructions to execute.

## Root Cause

Unlike downstream gates (which are CLI-enforced), the framework entry has **zero mechanical enforcement**:

| Boundary | Enforcement | Bypassable? |
|----------|------------|-------------|
| Framework entry (RUN.md §2) | Markdown instructions | **Yes — nothing stops Agent from doing free-form work** |
| Phase entry (`enter-phase.mjs`) | Trace witness + gate preflight | No — mechanically enforced |
| Gate pass | CLI validation | No — mechanically enforced |
| `stop: yes` (HITL1/HITL2) | Phase frontmatter declaration | Yes — advisory only (see BUG-023) |

The entry point is the **weakest link** in the entire chain. Every downstream enforcement (gates, handoff witnesses, trace events) assumes the Agent has already committed to the framework flow. If the Agent never enters the flow, none of those mechanisms can fire.

### Why the Agent bypassed it

Three factors combined:

1. **The Agent's native behavior is "read and analyze."** When pointed at a directory of files, the Agent's default mode is to read them and produce analysis. The RUN.md instructions to "create a bundle and follow a phase workflow" conflict with this default.

2. **The user's initial request was ambiguous.** "用深度挖掘手段看这个目录" could mean "use DPT_FRAMEWORK" or "do a deep analysis." The Agent resolved this ambiguity in favor of the default behavior (analyze), not the framework entry (bundle + phases).

3. **There's no mechanical forcing function.** The Agent can read RUN.md, quote it, and still not execute it — and nothing stops this. The framework has no "entry witness" equivalent to the `enter-phase` handoff.

## Prevention

### Short-term (instructions — remove ambiguity)

1. **Strengthen RUN.md §0 language**: Add an explicit "DO NOT do free-form analysis" rule:
   > "If you find yourself reading source files, writing analysis, or producing a report BEFORE creating a bundle via `instantiate-run-bundle.mjs`, STOP. You have bypassed the entry point. Go back to Section 2."

2. **Add to CLAUDE.md first-priority section**: "When the user expresses research intent and this file is loaded, the ONLY valid response is to execute RUN.md Section 2. Reading files, writing analysis, or producing reports before bundle creation is an entry-point bypass."

### Medium-term (trace evidence — prove entry was executed)

3. **Entry witness**: After `instantiate-run-bundle.mjs` creates the bundle, the CLI writes an `entry_committed` trace event. The setup gate verifies this event exists. This doesn't prevent bypass, but it creates a clear audit trail showing whether the entry flow was followed or not.

4. **`check-reentry.mjs` integration**: The existing `check-reentry.mjs` CLI could be extended to detect "Agent did free-form work before bundle creation" by checking timestamps — if the conversation contains substantial analysis messages before the first bundle operation, flag it.

### Long-term (structural — make entry unavoidable)

5. **Framework-only mode**: When `DPT_FRAMEWORK/` is the working context and user expresses research intent, the harness could require that the first tool call is `instantiate-run-bundle.mjs`. Free-form `Read`/`Write`/analysis calls before bundle creation would be blocked. This is a harness-level enforcement, not a framework-level one — it requires integration with the agent runtime.

6. **Entry gate**: Add a lightweight "entry gate" that runs immediately after bundle creation, verifying that:
   - Bundle was created via `instantiate-run-bundle.mjs` (not manually)
   - `rb_plan.md` has a valid `plan_basename`
   - The next expected action is HITL1 (per the chain)
   - If any of these fail, the Agent is redirected to RUN.md §2

   This gate would be the first mechanical checkpoint, analogous to `enter-phase` for downstream phases.

## Relationship to Other Bugs

This is the **root cause** of the pattern seen in BUG-022 and BUG-023:

```
BUG-024 (entry bypass)  →  Agent never enters framework flow
    ↓
BUG-023 (HITL1 bypass)  →  Agent skips interactive checkpoint
    ↓
BUG-022 (shortcuts)     →  Agent takes shortest path to gate pass
    ↓
BUG-021 (null params)   →  Agent disables quality thresholds
```

The chain starts at the entry point. If the entry is mechanically enforced, downstream bypasses become harder (though not impossible — BUG-022/023 still apply within the flow). If the entry is advisory, **nothing downstream matters** because the Agent might never get there.

**The entry point is the single highest-leverage place to add mechanical enforcement.**
