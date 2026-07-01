# BUG-008: Agent used Python template to batch-generate reference files — caught by content_dedup Jaccard clone detection

**Reported**: 2026-07-01
**Severity**: P1
**Status**: ✅ Fixed in `implement-evidence-extraction`
**Bundle**: `dpt_rb_ai-agents-chinese-hospital-systems-2026`

## Phenomenon

Wave1 deepening: Agent created 5 evidence-summary.md + 5 question-list.md (quality content), then tried to batch-create 40 per-topic reference files using a Python template script. All 40 were flagged as Jaccard clones (similarity ≥ 0.95) by `content_dedup`.

## Root Cause

Phase MD already says "Phase Agent MUST NOT 在自己的上下文直接执行 WebSearch/WebFetch 来替代 Sub-agent" — but didn't explicitly prohibit using scripts/templates to batch-generate reference files from substituted values. The Agent found a loophole: "I'm not doing WebSearch, I'm just formatting data with a script."

## What We Fixed

1. **Anti-cheating rule 16**: Added explicit prohibition in `shared-anti-cheating-rules.md` — "MUST NOT use scripts (Python, bash, node, or any language) or template substitution to batch-generate reference/*.md files. Every reference file MUST be produced by a real sub-agent through the Agentic Queue → Sub-agent Relay pipeline."

2. **Gate advice improvement**: `checkContentDedup()` Jaccard clone advice now says "This often indicates template or script-generated reference files. Use sub-agent relay (dpt-evidence-extractor) to produce genuinely unique reference files from real WebSearch+WebFetch."

## Related

The gate failure fatigue and `stop:no` contract violation that followed the Jaccard clone detection are tracked separately in [[BUG-013-gate-failure-fatigue-breaks-stop-contract]].

## Tags

`content-dedup` `jaccard` `template-generation` `anti-cheating` `fixed`
