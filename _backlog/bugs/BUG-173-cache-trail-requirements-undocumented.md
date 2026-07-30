---
bug_id: BUG-173
title: Cache trail leaf file requirements (websearch.json + page.md + meta.json per dir) not clearly documented in task.md
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-165: Cache trail requirements undocumented

## What happened

`dry-submit` rejected result.json with `missing_cache` violations. Each cache trail directory must contain exactly three leaf files:
- `websearch.json`
- `page.md`
- `meta.json`

The `task.md` mentions these requirements in §"Cache And Source Facts" (3 lines):
```
Required cache leaves: websearch.json, page.md, meta.json.
page.md must contain fetched page content or an explicit degraded/fetch-failure record.
```

But this is buried after 40+ lines of contract/beacon/result schema boilerplate. The sub-agent and Phase Agent both missed it on first read.

## Impact

This caused 3 dry-submit rejections in this run:
1. #3 (community): had cache dirs but missing websearch.json in each → "missing_cache"
2. #4 (quality): same issue
3. #5 (trends): same issue

Each rejection required: read violation → create missing files → rerun dry-submit. ~3-4 extra repair cycles.

## Expected behavior

The task.md should front-load the output requirements in a prominent checklist:

```markdown
## What You Must Produce (Checklist)
- [ ] artifacts/wave0/{topic}/source.yaml (YAML array, each entry: url, title, retrieved_date, topic_tag, notes)
- [ ] For each source: _cache/wave0/primary/{topic}/sNN/ containing:
  - [ ] websearch.json
  - [ ] page.md (non-empty fetched content)
  - [ ] meta.json ({url, final_url, retrieved, source_slug})
- [ ] result.json (copy Starter, fill summary + output_files + cache_trails)
- [ ] runtime-receipt.jsonl events
- [ ] dry-submit passes
```

**Why:** The contract language is correct but the presentation buries actionable requirements under reference material.

## C3 Disposition (2026-07-30)

C3 confirms this is not a new cache-trail or task-only mapping authority. The existing DEW-021 generated Completion Contract remains the owner for cache and source facts; C3 keeps its actor/candidate vocabulary aligned with public claim feedback and phase guidance without duplicating cache validation. The concrete task-card presentation remains an existing-owner documentation surface, not a new C3 validator or writer.
