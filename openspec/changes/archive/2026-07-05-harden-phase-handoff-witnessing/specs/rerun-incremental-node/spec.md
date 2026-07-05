## MODIFIED Requirements

> req: REI-002

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` body SHALL instruct the Agent to perform semantic analysis:

1. **Read inputs**: `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` (user intent) and current `seed_topics/` state (existing topic list, each topic's depth/direction)
2. **Compare and infer**: analyze what the user wants to change vs what already exists, then produce a topic adjustment plan:
   - Topics to **keep** as-is (not mentioned in rationale, work still valid)
   - Topics to **supplement** with new dimensions/directions (rationale asks for deeper/more specific angle on existing topic)
   - Topics to **add** (rationale mentions new areas not covered)
   - Topics to **remove** (rationale explicitly rejects or contradicts)
3. **Write direction hints**: for each affected topic, write a `## 本轮重跑方向` section into `seed_topics/{slug}.md` containing:
   - `action`: `supplement` (add dimensions to existing topic), `add` (new topic), or `remove` (deprecate topic)
   - `new_search_dimensions`: additional search angles for wave0
   - `adjusted_depth`: modified research depth if changed
   - `search_guardrails`: any new constraints for source intake
   - `rationale_excerpt`: relevant quote from HITL2 rationale

   The section format is Agent-facing Markdown prose — the field labels above describe **required content**, not prescribed literal key names. Downstream phases (also Agent-driven) read this section as natural language guidance, not as structured data.
4. **Record rerun context**: increment `rerun_count` in profile. Gate preconditions SHALL keep the incoming HITL2→rerun status window (`current_gate: hitl2_recorded`, `next_gate: rerun_ready`) until the `rerun-ready` gate itself passes. The Agent SHALL NOT write `current_gate: rerun_ready` before the `rerun-ready` gate has passed.
5. **Run gate**: execute `check-gate-rerun-ready.mjs`; if pass, consume the gate CLI `check.next` through `enter-phase --bundle <path> --node <check.next>`, then synchronize the just-passed source gate with `advance-status --bundle <path> --to rerun_ready`. If fail, follow gate inspect/advice and do not route forward without `check.next`.

The Agent SHALL NOT delete existing artifacts or references. Downstream phases (seed-topics, wave0, wave1, wave2) SHALL read `rerun_count > 0` and the `## 本轮重跑方向` section in each seed topic to operate in delta mode.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass

- **WHEN** HITL2 has selected the deterministic rerun branch and `enter-phase --node phases/phase-rerun.md` has loaded the rerun node
- **AND** source-gate status synchronization has written `current_gate: "hitl2_recorded"` and `next_gate: "rerun_ready"`
- **THEN** `phase-rerun.md` SHALL instruct the Agent to run `check-gate-rerun-ready.mjs` under that incoming status window
- **AND** it SHALL NOT instruct `advance-status --to rerun_ready` before the rerun gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass

- **WHEN** `check-gate-rerun-ready.mjs` passes and emits `check.next: "phases/phase-seed-topics.md"`
- **THEN** the Agent SHALL first run `enter-phase --bundle <bundle> --node phases/phase-seed-topics.md`
- **AND** only after that route-bound entry witness exists, run `advance-status --bundle <bundle> --to rerun_ready`
- **AND** the resulting status window SHALL be `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
