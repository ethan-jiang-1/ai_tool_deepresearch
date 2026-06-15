# check - Route Deep Research Template Checks

- role: `command router`
- purpose: `choose the correct check playbook or read-only CLI gate`

## Route By Target Or Intent

| target or intent | open or command playbook | CLI gate |
| --- | --- | --- |
| template package source | `README.md` maintainer checklist plus CLI | `check-template` |
| understand canonical run directory layout | `specs/WORK_DIRECTORY_LAYOUT.md` | n/a |
| inspect freshly instantiated run directory layout | `command_playbooks/check-instantiation.md` | `check-instantiation` |
| inspect active run directory layout and local sync | `command_playbooks/check-surfaces.md` or `command_playbooks/check-runtime.md` | `check-surfaces` / `check-runtime` |
| one Markdown file should become a new `original_topic` run | `command_playbooks/instantiate-from-original-topic-md.md`, then `command_playbooks/check-instantiation.md` | `check-instantiation` |
| freshly generated core run bundle | `command_playbooks/check-instantiation.md` | `check-instantiation` |
| broad original topic needs seed decomposition | `command_playbooks/decompose-seed-topics.md` | n/a |
| confirmed seed topic files need shape/refill-anchor checking before evidence execution | `command_playbooks/check-seed-intake.md` or `command_playbooks/repair-seed-topic-shape.md` | `check-seed-topic-shape` |
| confirmed seed topics need intake/readiness checking before evidence execution | `command_playbooks/check-seed-intake.md` | `check-seed-intake` |
| seed topics, reference files, artifacts, or generated control files need post-instantiation sync checking | `command_playbooks/check-surfaces.md` | `check-surfaces` |
| active Queue work units or receipts need focused preflight/closeout checking before continuation or promotion | `command_playbooks/check-queue-receipts.md` | `check-queue-receipts` |
| run-local `_framework` snapshot is incomplete but same-version source package exists | `command_playbooks/repair-framework-snapshot.md`, then `command_playbooks/check-runtime.md` | `check-runtime` |
| active run needs evidence-intensity, verification-posture, speed, or filter policy changes | `command_playbooks/adjust-profile-parameters.md`, then `command_playbooks/check-runtime.md` | `check-runtime` |
| active run with topic topology change | `command_playbooks/formalize-topology-delta.md`, then `command_playbooks/check-runtime.md` | `check-runtime` |
| active or migrated run | `command_playbooks/check-runtime.md` | `check-runtime` |
| final interpretation output | `command_playbooks/create-final.md` | n/a |

## Rules

- Use `check-instantiation` only for the core clean run bundle before execution begins; it does not validate seed readiness or runtime evidence quality.
- Use `instantiate-from-original-topic-md` when the user points to one Markdown file and wants a new `deepresearch_<short-slug>` run with `original_topic/`, `seed_topics/`, and the five root control files created before instantiation stops.
- Use `check-seed-intake` after core instantiation when confirmed seed topics need registry/intake/status/queue alignment.
- Use `check-seed-topic-shape` for a focused read-only check of confirmed seed file anchors. If it fails, use `repair-seed-topic-shape` before Wave 0 evidence work.
- Use `check-surfaces` after structural instantiation for focused seed topic, reference, artifact, and generated control-file sync checks; it is narrower than `check-runtime` and is not an instantiation step.
- Use `check-queue-receipts` before executing Queue work or before closeout/promotion when receipt drift is likely; it checks preflight `required_receipts` or closeout `completion_receipt` according to `receipt_check_phase`, and is not a separate Queue loop command.
- Use `check-runtime` for any run with execution history, accepted references, artifacts, repaired control files, or diagnostic trace entries.
- Use `repair-wave1-artifact-steering` when Wave 1 references have landed but `wave1_topics/` artifacts are missing, stale, thin, stuck only in Refill Pool, or blocking the next source-intake/deepening action; it is write-capable and may be triggered by `hook_wave1_topic_fanin_steering`.
- Treat command playbooks as the human-readable quality gates. The CLI can catch mechanical drift, but the playbook checklist must still inspect semantic failures such as empty artifacts, stale trace pointers, pathless synthesis, generic queue tasks, or evidence that exists only as chat memory.
- Use `repair-framework-snapshot` only for same-version missing framework files; it must not overwrite existing `_framework` files or root control files.
- Use `adjust-profile-parameters` after instantiation when the user changes research profile, configured floors, must-answer policy, evidence intensity, verification posture, or source/date/source-family filters; it is a write-capable command and has no CLI gate.
- Use `formalize-topology-delta` before runtime checking when new topic candidates, topic splits, merges, or redirects appear after evidence digging.
- Use `decompose-seed-topics` before execution when the large topic still needs to become formal `seed_topics`.
- Use `create-final` only for final interpretation output under the deterministic HITL2 `final_output_dir` mapping; it is not gate evidence.
- Do not use CLI helper output as a replacement for the playbook checklist. CLI checks are read-only mechanical support and cannot authorize gate passage by themselves.
- If a target could be either a clean instantiation or an active run, prefer `check-runtime` once there is any execution history; use `check-surfaces` first only when the immediate post-instantiation concern is seed/reference/artifact/control-file sync.

## Expected Results

Command playbooks return:

```text
PASS
FAIL_FIX
FAIL_BLOCKED
```

CLI helpers return:

```text
PASS <gate> <path>
FAIL <error-code> <message>
```
