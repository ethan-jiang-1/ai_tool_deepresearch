# C9b: Preserve Current Known-ID Topic Resolution

> Audit disposition: protected current semantic, not a cleanup candidate
>
> Risk if removed: L3

## What looked suspicious

`operate-queue` can derive a topic slug from a small closed set of
`queue_item_id` templates when a task card lacks explicit
`payload.topic_slug` and `lineage.topic_slug`.

## Verified current contract

- The accepted `agent/queue-input-validation` spec names the exact templates
  and explicitly requires this fallback only when neither explicit source is
  present.
- Explicit payload and lineage are authoritative: they must agree, are checked
  against the canonical registry, and are never overridden by an ID-derived
  slug.
- Unknown or non-topic IDs do not get guessed. Topic-scoped work without any
  resolvable slug is rejected.
- The resolver prevents invalid task cards from bypassing current canonical
  Topic binding; it is not a multi-version queue reader.
- Focused tests cover explicit priority, known-ID resolution, conflict
  rejection, unknown-topic rejection, prior-layout rejection, and finding-
  scoped tasks that legitimately have no topic slug.

## Disposition

Keep it. Future new writers should supply explicit UID/slug identity, but that
authoring preference does not authorize removal of the accepted current
validation route. Any later policy to require explicit identity needs its own
queue-spec decision and rejection migration, not a generic legacy cleanup.

## Protected tests

```bash
node --test tests/integration/cli/operate-queue-validation.test.mjs \
  tests/integration/cli/operate-queue-demand-admission.test.mjs
```

