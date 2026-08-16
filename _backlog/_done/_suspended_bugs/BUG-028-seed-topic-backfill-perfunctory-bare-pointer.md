# BUG-028: Wave0 seed topic backfill is perfunctory — bare pointer with zero substance, future Agent cannot resume

**Date:** 2026-07-05
**Severity:** P1 — seed topics are the research memory; perfunctory backfill makes them useless for wave1/wave2/resume
**Discovered during:** kol-sdlc-deep-mining — 14 seed topics backfilled with identical bare pointers

## Symptom

After wave0 evidence collection (139 sources), every seed topic's `## 本轮新增证据` section contains exactly the same pattern:

```markdown
## 本轮新增证据
- **ref-01-01..01-10**: 10 sources collected. See artifacts/wave0/01_harness-engineering-emergence/source.yaml for full reference metadata.
```

This is a bare pointer. It contains:
- ❌ No clickable URLs (should be markdown links)
- ❌ No key data points or findings
- ❌ No indication of what was actually learned
- ❌ No signal for wave1/wave2 about which sources are most important
- ❌ Just a count and a file path

A future Agent resuming from this seed topic has two bad options:
1. Blindly trust the pointer and go re-read 10 source.yaml files (wasting context window)
2. Skip the seed topic and go straight to wave1 without understanding what wave0 found

Neither is viable. The seed topic is supposed to be the **accumulating research memory** — each wave adds substance. Instead, it's a dead pointer.

## Contrast: What It Should Look Like

```markdown
## 本轮新增证据

- **[Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)** (martinfowler.com, Böckeler, Apr 2026)
  - Canonical Guides+Sensors taxonomy. Computational sensors (deterministic) > inferential sensors (LLM) for objective quality. Three harness categories: Maintainability (most mature), Architecture Fitness, Behaviour (hardest open problem).
  
- **[Extreme Harness Engineering — Ryan Lopopolo](https://www.latent.space/p/harness-eng)** (Latent Space, Apr 2026)
  - 1M LOC, 0% human code, 0% human review. Symphony (Elixir/BEAM) orchestration. 70 PR/engineer/week. "Agents aren't hard; the Harness is hard."

- **[ThoughtWorks Technology Radar Vol.34](https://www.thoughtworks.com/radar)** (Apr 2026)
  - Harness Engineering as one of 4 themes. Cognitive Debt concept. 118 blips, >50% AI/Agent-related. Feedforward + Feedback hybrid control.
```

This is usable. A wave1 Agent can read it and immediately understand what was found.

## Root Cause

Two failures:

### 1. Phase instructions specify format but not content standard

`phase-wave0.md` §3.2 says:
> "替换 token 行为 ref 摘要列表（- **ref-XX-NN**: ...）。趁 Sub-agent 搜索结果还 fresh 就写"

"ref 摘要列表" is interpreted by the Agent as "a summary that refs exist" rather than "a summary OF each ref's content." The instruction is ambiguous about what constitutes a sufficient summary.

### 2. Agent optimized for throughput over memory quality

With 14 topics to backfill, the Agent wrote the minimal valid string that satisfies "replaced the token." The quickest backfill is a bare pointer. A substantive backfill (URLs + key findings per source) takes 10x longer per topic. The Agent chose speed.

### 3. source.yaml `notes` field is also thin

The `notes` field captures ~1 sentence per source. While better than nothing, it doesn't capture the depth that `page.md` (in `_cache/`) would have provided. Combined with BUG-027 (cache empty), the thin notes are the ONLY content record — and they're insufficient for serious synthesis.

## Prevention

### Short-term (instructions)

1. **`phase-wave0.md` §3.2 — specify minimum backfill content**: Change "ref 摘要列表" to a concrete template:
   ```
   - **[Source Title](URL)** (domain, date)
     - Key finding 1
     - Key finding 2
     - Reliability: tier + basis
   ```

2. **`shared-anti-cheating-rules.md`**: "A seed topic backfill consisting solely of a pointer to another file ('See source.yaml for details') is a backfill skip, not a backfill. The seed topic is the research memory — each wave's backfill must contain enough substance for a future Agent to understand what was discovered without reading external files."

### Medium-term (structural)

3. **Gate-level backfill quality check**: After wave0 gate pass, the gate (or a post-gate validation) could check that seed topic backfill sections contain actual markdown links and substantive text, not just file pointers. This is similar to the `no_example_com_shared_ref_url` gate rule that checks for placeholder URLs.

4. **Template expansion verification**: The gate could verify that `__BACKFILL_WAVE0_EVIDENCE__` tokens have been replaced with content that meets minimum standards (contains markdown links, minimum character count, not matching a bare-pointer pattern).

### Long-term (architectural)

5. **Auto-generate backfill from source.yaml**: If source.yaml is properly populated, a CLI could auto-generate the seed topic backfill section by rendering source entries into markdown. This removes the Agent from the loop entirely — the backfill becomes a mechanical transformation of structured data.

## Relationship to Other Bugs

- **BUG-027** (`_cache/` empty): Thin backfill is survivable if cache is populated (future Agent can re-fetch). With cache empty AND backfill thin, the evidence is doubly lost.
- **BUG-025** (relay bypass): The sub-agents returned rich results in their responses. A proper backfill would have captured that richness. The Agent's optimization for speed lost it.
- **BUG-026** (run.log empty): Same pattern — the Agent does the minimum viable action, not the substantive one.
