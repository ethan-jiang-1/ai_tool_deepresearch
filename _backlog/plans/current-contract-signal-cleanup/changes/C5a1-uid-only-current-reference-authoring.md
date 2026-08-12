# C5a-1: Make Current Reference Authoring UID-Only

> Candidate change: `make-current-reference-authoring-uid-only`
>
> Status: investigation mostly complete; one handoff proof remains before proposal
>
> Risk: L3

## One question

Can every new rich reference use only exact `related_topic_uid` (or the shared
sentinel `all`), so current authoring stops emitting or teaching the
slug/id-based `related_topic` compatibility form?

## Verified boundary

- Current Markdown reference reader accepts both fields through
  `topic-layout.mjs`; this card does **not** remove that reader.
- The evidence-extractor template still writes
  `related_topic: "{topic.slug}"`.
- Shared reference guidance explicitly permits either exact UID or compatible
  `related_topic`, and its example writes `related_topic: all`.
- Current phase and queue context routinely contains both
  `{topic.topic_uid}` and `{topic.slug}`. This makes the desired writer change
  plausible but does not alone prove every rich-reference authoring handoff
  supplies a UID at the point of write.

## Proposed current-only result

- New per-topic rich references write one exact `related_topic_uid`.
- New shared rich references write `related_topic_uid: all`.
- Current guidance/templates no longer offer `related_topic` as a new-output
  choice.
- The reader remains temporarily unchanged. C5a-2 separately decides what to
  do with historical reference files that still use the old key.

## Expected effect and side effects

New output becomes stable across current rename/reorder operations because it
is bound directly to UID. The immediate compatibility surface becomes
writer-free, but old reference reading remains unchanged until a later explicit
decision.

The main risk is operational: a sub-agent task that lacks the canonical UID
could write an empty/wrong binding. The proposal must trace the actual task
card/extractor handoff, not assume a nearby phase file proves it.

## Protected current behavior

- `related_topic_uid: all` for shared sources.
- `_INDEX.md` `related_topic` navigation column; it is a derived display, not
  a reference metadata writer contract.
- Current reference reader and `previous_layouts[]` lineage until C5a-2 has a
  separate decision.

## Proposal gate

- [x] Current legacy-key writer/guidance discovered.
- [x] UID exists in current phase/queue context.
- [ ] Trace the exact evidence-extractor task handoff and prove it carries one canonical UID or `all` at authoring time.
- [ ] Add Wave0/Wave1 current-output characterization tests.
- [ ] User approves this writer-only slice after the overall policy queue reaches C5a.

## Expected verification

```bash
node --test tests/integration/md/parser-aligned-guidance.test.mjs \
  tests/engine/helpers/reference-index-sync.test.mjs \
  tests/integration/cli/check-gate-wave0-complete.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
