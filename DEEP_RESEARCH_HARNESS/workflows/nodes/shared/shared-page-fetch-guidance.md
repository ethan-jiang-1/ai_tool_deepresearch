---
node_type: shared
id: shared-page-fetch-guidance
shared_scope: subagent-fetch
authority: guidance-only
actor_delivery: required
---

# Shared Page-Fetch Guidance

Use this guidance for each candidate URL assigned by the current work-unit task. It explains an actor action sequence; it does not fetch pages, create cache/source facts, or submit work on the actor's behalf.

## Per-URL Access Sequence

For one exact candidate URL, stop when real page content is captured or every independently permitted tier is exhausted:

1. Use an available native or built-in page-fetch surface.
2. Use an available browser surface.
3. Use Node.js `fetch` with bounded HTTP(S), timeout and redirect handling.
4. Only with independently granted host shell/network permission, make at most one bounded `curl` request for that same URL:

   ```bash
   curl --fail --location --max-time 20 --max-redirs 5 --proto '=https,http' --globoff "$url"
   ```

Treat a command exit as insufficient until it yields real page content suitable for the assigned cache trail. Do not interpolate an unvalidated URL into a shell fragment, compose a pipeline, change URLs between tiers, widen permission, or add another access tier. Native unavailability does not itself grant shell/network permission.

For several candidate URLs, use small batches. Bounded parallel access is permitted only when the current native runtime supports it and site politeness permits it. Batching never reduces required cache leaves, source declarations, accepted URL coverage or evidence quality; search snippets are not fetched page content.

## Receipt Diagnostics

After each completed tier, append one actor-written runtime-receipt diagnostic event. Keep the assigned work-unit identity fields on the event and use this bounded detail shape:

```json
{
  "event": "fetch_attempt_done",
  "detail": {
    "url": "https://example.com/page",
    "tier": "native|browser|node_fetch|curl",
    "surface": "truthful runtime surface",
    "outcome": "success|blocked|unavailable|failed",
    "reason_code": "bounded_reason_code"
  }
}
```

These details are diagnostic. They do not change existing receipt identity requirements, cache/source obligations, result validation or formal submit. When every permitted tier is exhausted, record the bounded failure and return that smallest external boundary to the Phase Agent.
