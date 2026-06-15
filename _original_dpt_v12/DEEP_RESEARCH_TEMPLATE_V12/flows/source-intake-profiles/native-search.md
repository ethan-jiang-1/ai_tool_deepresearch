---
title: "Source Intake Native Search"
role: "provider-specific native search source intake policy"
scope: "built-in web search, native fetch/browser follow-up, cache candidate cards, and promotion recommendations"
reads:
  - "flows/source-intake-flow.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<RUN_DIR>/_cache/*"
---

# Source Intake Native Search

This is the default provider-specific source intake file for native model/search tooling. It implements `provider_profile=native_search` while preserving the stable interface in `flows/source-intake-flow.md`.

## When To Use

Use native search when:

- broad discovery is enough
- source filters are lightweight
- the task needs quick candidate generation before promote review
- no specialized database or external search provider has been selected

Use `native_search` as the fallback when `exa_search` is selected but Exa credentials, API access, provider constraints, or result coverage fail softly.

## Native Intake Method

- Convert the main agent's intake request into 3-5 focused query groups.
- Search broadly enough to find independent source families, not just repeated copies of one page.
- If this batch is an Exa fallback, preserve the same intake goal, preferences, exclusion rules, and suggested query groups recorded in Exa cache notes.
- Write raw-ish retrieval notes to `_cache/intake/<batch-id>/retrieval-results.md`.
- Write compact candidate cards to `_cache/intake/<batch-id>/candidate-cards.md`.
- Write `_cache/intake/<batch-id>/capture-manifest.md` listing any optional concrete page captures or direct fetch notes created under `_cache/captures/`.
- Put rejected noise in `_cache/excluded/<batch-id>-excluded.md` only when it affected search, exclusion, or gate reasoning.

## Native Output Discipline

Candidate cards must be short. Do not paste full search result pages, long webpages, or large URL lists into the main conversation. The main agent should see paths, decisions, and why each candidate matters.

Native search output is advisory until the main agent promotes a reviewed candidate to `REFERENCE_DIR/*.md`.
