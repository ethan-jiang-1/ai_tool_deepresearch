# C5a-1: Make Per-Topic Current Reference Authoring UID-Only

> Candidate change: `make-current-reference-authoring-uid-only`
>
> Status: Wave1 handoff proof complete; blocked by C5a-1b shared/cross Topic binding shape
>
> Risk: L3

## One question

Can every new rich reference use a lossless current binding form, so current
authoring stops emitting or teaching the slug/id-based `related_topic`
compatibility form? The per-Topic Wave1 answer is now known; the shared/cross
Topic answer belongs to C5a-1b.

## Verified boundary

- Current Markdown reference reader accepts both fields through
  `topic-layout.mjs`; this card does **not** remove that reader.
- The optional evidence-extractor rich-reference template still writes
  `related_topic: "{topic.slug}"`; normal Wave1 evidence extraction does not
  write rich reference Markdown.
- Wave1 `phase-wave1.md` loads the shared reference template and owns actual
  materialization after formal submit. Its queue payload contains
  `{topic.topic_uid}` and `{topic.topic_slug}`, and the submitted-backing
  result returns the same canonical pair before the materialization decision.
- Wave0 shared reference materialization can use `related_topic_uid: all`.
- The shared template also governs Wave2 `00-cross-*` projections. A scalar
  UID or `all` cannot express an exact multi-Topic subset, while legacy
  `related_topic` can. No current canonical multi-UID writer form exists yet.

## Proposed current-only result

- Once C5a-1b resolves the shared/cross shape, new per-topic Wave1 rich
  references write one exact `related_topic_uid`.
- New true shared references write `related_topic_uid: all`; this does not
  authorize treating a selected cross-Topic subset as globally shared.
- Current guidance/templates no longer offer `related_topic` as a new-output
  choice only after every writer form has a lossless replacement.
- The reader remains temporarily unchanged. C5a-2 separately decides what to
  do with historical reference files that still use the old key.

## Expected effect and side effects

New output becomes stable across current rename/reorder operations because it
is bound directly to UID. The immediate compatibility surface becomes
writer-free, but old reference reading remains unchanged until a later explicit
decision.

The Wave1 UID source is no longer hypothetical. The remaining risk is semantic:
removing the legacy field from the shared template before C5a-1b would either
make cross-reference subsets unrepresentable or silently broaden them to
`all`. An optional future delegated rich-reference task also needs the selected
binding fact projected into its task before it can be included.

## Protected current behavior

- `related_topic_uid: all` for shared sources.
- `_INDEX.md` `related_topic` navigation column; it is a derived display, not
  a reference metadata writer contract.
- Current reference reader and `previous_layouts[]` lineage until C5a-2 has a
  separate decision.

## Proposal gate

- [x] Current legacy-key writer/guidance discovered.
- [x] Wave1 actual Phase-owned materialization handoff carries exact UID and slug through queue and submitted-backing facts.
- [x] Wave0 shared materialization has the `all` sentinel available.
- [ ] C5a-1b defines a lossless current binding for selected cross-Topic subsets.
- [ ] Decide whether an explicitly assigned future delegated rich-reference task must receive the selected binding in its generated task contract; no current normal task assigns such output.
- [ ] Add Wave0/Wave1/Wave2 current-output characterization tests for the selected writer forms.
- [ ] User approves this writer-only slice after the overall policy queue reaches C5a.

## Expected verification

```bash
node --test tests/integration/md/parser-aligned-guidance.test.mjs \
  tests/engine/helpers/reference-index-sync.test.mjs \
  tests/integration/cli/check-gate-wave0-complete.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
