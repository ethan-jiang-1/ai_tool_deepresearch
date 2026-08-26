## ADDED Requirements

### Requirement: Post-final descendant supersession SHALL be a same-point same-decision re-run only

To prove the one continuous descendant chain required for an accepted post-final lineage, a later `gate_attempt` SHALL supersede an earlier passed pass at the same `gate` + `currentNodeRef` **only** when it is itself a passed pass (`passed: true`), carries the **same** `next`, and no different-gate `gate_attempt` occurs between the candidate and it (i.e. a literal re-run of the same decision at the same point). A failed attempt (`passed: false`) SHALL never supersede a prior passed pass. A passed pass with a **different** `next` at the same `gate` + `currentNodeRef` SHALL be a separate lifecycle event belonging to a different rerun round, not a supersession, and SHALL remain a link in the descendant chain. Consequently the `hitl2` gate legitimately fires once per rerun round — `hitl2 -> phase-rerun` ending each intermediate round and `hitl2 -> phase-readiness` ending the final round — and all such round passes SHALL participate in one linear descendant chain that remains continuous across consecutive multi-round post-final reruns rather than being judged discontinuous at a (wrongly) superseded round pass.

#### Scenario: A later failed attempt does not supersede a prior passed pass

- **WHEN** a `gate` at a `currentNodeRef` records a passed pass (`passed: true`, `next: T`) and a later `gate_attempt` at the same `gate` + `currentNodeRef` records `passed: false`
- **THEN** the later failed attempt SHALL NOT supersede the earlier passed pass
- **AND** the earlier passed pass SHALL remain a legal link in the deterministic handoff chain

#### Scenario: Cross-round rerun passes at the same gate with different next remain distinct

- **WHEN** an accepted post-final lineage records a `hitl2` pass (`next: phases/phase-rerun.md`) ending an intermediate rerun round, then a full rerun sub-chain, then a later `hitl2` pass (`next: phases/phase-readiness.md`) ending the final round
- **THEN** both `hitl2` passes SHALL remain separate links in the continuous descendant chain
- **AND** the chain SHALL remain continuous across the round boundary and reach the readiness-to-Final handoff without a discontinuity verdict

#### Scenario: Only a same-point re-run of the same decision supersedes

- **WHEN** a `gate` at a `currentNodeRef` records a passed pass with `next: T`, and a later passed pass at the same `gate` + `currentNodeRef` again records `next: T` with no different-gate attempt in between
- **THEN** the later passed pass SHALL supersede the earlier one, and only the latest SHALL be projected as the current handoff link

### Requirement: Final entry authorization SHALL be a single non-contradictory verdict

The `enter-phase phase-final` flow SHALL present exactly one authorization verdict. If the requested target is `phases/phase-final.md`, the Final inventory/lineage admission gate SHALL be folded into the same authorization decision that selects the handoff; an admission failure SHALL be reported as the single reason (naming the lineage/primary-inventory boundary) rather than first reporting the target as authorized and then failing a separate admission step. This SHALL NOT change the deterministic admission facts — only their single-point, non-contradictory presentation.

#### Scenario: Final entry reports one reason when the lineage gate fails

- **WHEN** a Phase Agent runs `enter-phase --node phases/phase-final.md` on a bundle whose latest legal readiness-to-Final handoff is present but whose Final inventory/lineage admission gate fails
- **THEN** the command SHALL fail once with the admission reason (lineage/inventory boundary) as the sole verdict
- **AND** it SHALL NOT first report the target as authorized and then contradict that with a separate admission failure

#### Scenario: Final entry with passing admission reports the normal pin

- **WHEN** a Phase Agent runs `enter-phase --node phases/phase-final.md` on a bundle whose latest legal readiness-to-Final handoff and Final inventory/lineage admission both pass
- **THEN** the command SHALL proceed with the single authorized handoff and SHALL NOT emit a contradictory second verdict
