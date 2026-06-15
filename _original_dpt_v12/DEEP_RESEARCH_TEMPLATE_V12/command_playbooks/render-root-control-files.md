---
title: "Render Root Control Files"
role: "internal run-bundle instantiation step"
scope: "render instantiated root control files and run-root agent files from local framework output templates"
reads:
  - "output_templates/PROFILE.md"
  - "output_templates/PLAN.md"
  - "output_templates/STATUS.md"
  - "output_templates/QUEUE.md"
  - "output_templates/TRACE.md"
  - "output_templates/RUN_ROOT_AGENTS.md"
  - "output_templates/RUN_ROOT_CLAUDE.md"
writes:
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<RUN_DIR>/AGENTS.md"
  - "<RUN_DIR>/CLAUDE.md"
  - "<RUN_DIR>/.claude/settings.local.json"
  - "<TOPIC_ROOT>"
  - "<ARTIFACT_DIR>/README.md"
---

# Render Root Control Files

This command is an internal implementation step of run-bundle instantiation. It creates the five mutable root control files and the two run-root agent instruction files from the copied local framework templates.

## Inputs

- `RUN_DIR`
- `PLAN_BASENAME`
- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`
- `TOPIC_ROOT = RUN_DIR/seed_topics`
- `REFERENCE_DIR = RUN_DIR/seed_topics/_reference`
- `ARTIFACT_DIR = RUN_DIR/seed_topics/_artifacts`
- `ORIGINAL_TOPIC_DIR = RUN_DIR/original_topic` or `not_applicable`
- final deliverable, audience, round focus, research profile, and seed/decomposition context

## Steps

1. Create or confirm `RUN_DIR/seed_topics/`, `RUN_DIR/seed_topics/_reference/`, and the minimal artifact scaffold:
   - `RUN_DIR/seed_topics/_artifacts/README.md`
   - `RUN_DIR/seed_topics/_artifacts/wave1_topics/`
   - `RUN_DIR/seed_topics/_artifacts/wave2/`
   - `RUN_DIR/seed_topics/_artifacts/shared/`
   The artifact README is a content framework and navigation contract only. It must say that the scaffold is not evidence, does not count toward source floors, and contains no produced topic or synthesis artifacts yet.
   It must also name the execution lifecycle owner: Wave 1 topic `evidence-summary.md` and `question-list.md` are produced by active `QUEUE_PATH` tasks after `topic_unique_ref_count >= 1`; producer_rule=`topic_ref_count_changed` owns initial production and refresh routing.
2. Create `RUN_DIR/original_topic/` only when broad upstream material needs local decomposition storage.
3. Read skeletons from `RUN_DIR/_framework/output_templates/*.md`, not from the source template package.
4. Extract only content between each boundary pair:
   - `BEGIN PROFILE OUTPUT` / `END PROFILE OUTPUT`
   - `BEGIN PLAN OUTPUT` / `END PLAN OUTPUT`
   - `BEGIN STATUS OUTPUT` / `END STATUS OUTPUT`
   - `BEGIN QUEUE OUTPUT` / `END QUEUE OUTPUT`
   - `BEGIN TRACE OUTPUT` / `END TRACE OUTPUT`
5. Do not copy output frontmatter, `Output Skeleton` headings, or boundary comments.
6. Resolve `TEMPLATE_VERSION` from `RUN_DIR/_framework/specs/CONSTANTS.md`.
7. Resolve every instantiation placeholder in the five root control files. The rendered root files must contain zero `<...>` angle-bracket placeholders. Runtime metavariables defined in `specs/CONSTANTS.md -> Placeholder Classes` may remain only as brace notation inside explicit schema/template/pattern guidance; active state, configured paths, confirmed topic rows, inventory rows, counts, gate flags, concrete queue tasks, and trace entries must be concrete.
8. Preserve only the minimal `Runtime Command Entrypoint`: local command index, local CLI helper, and the five root control-file bindings.
9. Copy `RUN_DIR/_framework/output_templates/RUN_ROOT_AGENTS.md` to `RUN_DIR/AGENTS.md` and `RUN_DIR/_framework/output_templates/RUN_ROOT_CLAUDE.md` to `RUN_DIR/CLAUDE.md`.
10. Create `RUN_DIR/.claude/settings.local.json` with a Claude Stop hook command bound to this exact run root:

   ```json
   {
     "hooks": {
       "Stop": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "DEEP_RESEARCH_RUN_ROOT=\"<ABSOLUTE_RUN_DIR>\" node \"<ABSOLUTE_RUN_DIR>/_framework/cli_tools/stop_guard/claude-stop-guard.mjs\""
             }
           ]
         }
       ]
     }
   }
   ```

   Replace both `<ABSOLUTE_RUN_DIR>` tokens with the concrete absolute `RUN_DIR`. Do not leave `RUN_DIR`, `<RUN_DIR>`, or a relative hook path in the generated settings file.
11. Keep runtime reference capture, produced artifacts, Wave gates, final output, and snapshot repair out of this step.

## Path Binding Rule

`RUN_DIR`, `FRAMEWORK_DIR`, `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, `TOPIC_ROOT`, `REFERENCE_DIR`, `ARTIFACT_DIR`, and all `Runtime Command Entrypoint` paths written to root files must be absolute paths. `ORIGINAL_TOPIC_DIR` may be `not_applicable`; otherwise it must also be absolute. Do not write relative root bindings such as `deepresearch_x/foo.plan.md`.

## Pre-Check Residue Rule

Before running `check-instantiation`, scan each rendered root control file for `<[^>\n]+>`. Any match is a rendering bug, even when it appears in an example row, schema hint, or Markdown table. Replace the residue with a concrete instance value or brace notation before delivery. Also confirm `RUN_DIR/AGENTS.md`, `RUN_DIR/CLAUDE.md`, and `RUN_DIR/.claude/settings.local.json` exist at the run root, not inside `_framework`.

## Result

The result is a candidate run bundle. It is not structurally instantiated until the five root control files, run-root `AGENTS.md`, run-root `CLAUDE.md`, run-root `.claude/settings.local.json`, and `check-instantiation` all pass.
