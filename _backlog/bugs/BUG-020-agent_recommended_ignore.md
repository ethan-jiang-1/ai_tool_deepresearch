# BUG-020: Phase Agent self-halts after gate pass, delivers premature synthesis instead of continuing pipeline


### Agent 1 — incident reporter / initial analyst

**Date:** 2026-07-05  
**Diagnosis summary:** Gate fatigue after 16 wave0 attempts eroded phase discipline; agent treated "user waiting" and "framework friction" as justification to override `check.next`. Deepest gap: `stop: no` is advisory-only — gate routing is CLI-enforced but phase continuation is not.

#### Short-term (instructions / guardrails)

1. **Add "No Early Delivery" rule to `shared-silent-execution.md`**: "Gate pass = load next phase. Do not synthesize. Do not deliver. Do not ask the user if they want to continue. The only valid response to gate pass is to execute `check.next`."

2. **Gate pass → mandatory next-phase-load checkpoint**: After any gate CLI returns `check.next`, the Phase Agent MUST read the next phase node's first 50 lines before doing anything else. This creates a mechanical forcing function.

3. **Anti-cheating rule**: "Delivering a report or asking the user for a decision during a `stop: no` phase is a phase discipline violation equivalent to skipping a gate."

#### Medium-term (structural)

4. **Gate fatigue tracking in `rb_trace.jsonl`**: If gate attempts exceed threshold (e.g., 5), the engine could inject a `fatigue_guidance` message into the next phase load reminding the agent that high attempt count does not authorize pipeline truncation.

5. **Phase heartbeat assertion**: After each phase node load, the Phase Agent writes a `phase_checkpoint` trace event. If the next expected event (next gate run) doesn't appear within a reasonable span, the engine can flag a potential self-halt.

#### Long-term (enforcement)

6. **Make `stop: no` enforceable**: Currently it's advisory. Options:
   - A runtime wrapper that detects user-facing messages during `stop: no` phases and blocks them
   - A mandatory `check.next` follow-through that requires the next phase file to be read before any user communication
   - Gate-level assertion that the agent must have loaded the next phase node before the current phase can be marked complete

---

### Agent 2 — codebase investigator

**Date:** 2026-07-05  
**Diagnosis summary:** Phenomenon is accurate. Failure mode differs from BUG-013: this is a **post-gate-pass transition failure**, not mid-gate-fatigue surfacing. Agent passed wave0, advanced status, then treated success as a stopping milestone instead of immediately handoff-ing to `check.next`. Much of Agent 1's fix list duplicates `harden-stop-contract` (2026-07-02), which already added §0/§5 silent execution, `assessNode()` AUTONOMOUS MODE injection, and GSK-006 fail-side fatigue diagnostics — but none of that covers **post-pass early delivery**.

#### Critique of Agent 1

| A1 item | Verdict | Notes |
|---------|---------|-------|
| 1 — No Early Delivery rule | **Redundant** | Already in `shared-silent-execution.md` §0.6–7, §6.2; `phase-wave0.md` §6/§8; `assessNode()` AUTONOMOUS MODE header |
| 2 — Read next phase first 50 lines | **Weak** | Still instruction-level; agent already ignored §6 On Gate Pass |
| 3 — Anti-cheating rule | **Partially valid** | Wave0 bans synthesis artifacts, but no cross-phase rule forbids **chat delivery** before Final |
| 4 — Gate fatigue tracking | **Already implemented / wrong target** | GSK-006 `--attempt N` + `fatigue_warning` fires on **fail**, not pass; won't prevent post-pass halt |
| 5 — Phase heartbeat | **Detection only** | Useful audit signal, not prevention |
| 6 — Engine enforcement | **Architecturally contentious** | Conflicts with `harden-stop-contract` explicit decision: "Engine 保持被动" |

#### Agent 2 recommendations

**A2-1. Spec gap — post-pass handoff scenario (short-term, spec + shared contract)**

Add to `silent-wave-execution` spec and `shared-silent-execution.md`:

> **WHEN** gate pass returns `check.next`  
> **THEN** Agent SHALL immediately `assessNode(check.next)` — no user-facing output, no synthesis draft, no "continue?" question

Current spec scenario "Gate pass is the non-terminal phase objective" only covers the **pre-`check.next`** loop; the post-pass handoff is implicit in phase bodies but not spec'd as a scenario.

**A2-2. Cross-phase anti-premature-delivery rule (short-term, shared-anti-cheating)**

Add explicit prohibition: **forbid user-facing synthesis/report delivery in chat before Final phase**. Distinguish from wave2 `artifacts/wave2/synthesis.md` (in-bundle artifact) vs chat-side premature delivery (this incident).

**A2-3. Pass-side engine advisory (medium-term, GSK extension — lightweight)**

When gate **passes** AND Agent-reported `--attempt >= N`, inject pass-side `advice`:

> "Gate passed after high attempt count. Load `check.next` immediately. High friction does not authorize early delivery or user surfacing."

Complements GSK-006 fail-side fatigue; targets the exact post-pass rationalization seen in this incident.

**A2-4. Atomic On Gate Pass sequence in phase §6 (short-term, phase content)**

Codify as non-skippable sequence in wave0/1/2 §6:

```
gate pass → read check.next → advance-status → log phase END → assessNode(check.next)
```

No intermediate step may include user communication or report drafting.

**A2-5. Controlled E2E playbook case (medium-term, experiments_playbook)**

Add case: wave0 gate pass after high `--attempt` count → verify Agent loads wave1, does NOT emit chat synthesis. Agentic behavior regression, not unit test.

**A2-6. Do NOT re-open harden-stop-contract scope**

Frame this change as a **new failure mode** (post-pass handoff), not a redo of BUG-013 mid-failure surfacing fixes.

---

<!-- Agent 3+: append new ### Agent N sections below -->

## Incident data

- Bundle: `dpt_rb_wocheng-information-research`
- Phase at halt: wave0 → wave1 transition
- Wave0 gate attempts: 16
- Time spent in wave0: ~412 seconds sub-agent + ~30 min gate fighting
- User's instruction at hitl1: "没有问题，你就一路开跑吧" (explicit "keep running" directive)
- Research profile: exploratory_map, 5 topics, zh_only with self_media avoidance
