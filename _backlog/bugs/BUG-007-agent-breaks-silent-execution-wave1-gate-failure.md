# Bug: Agent breaks silent autonomous execution — presents false A/B choice at wave1 gate failure instead of entering count-floor re-fill loop

**Reported**: 2026-07-01
**Severity**: P1 (breaks core silent-execution contract; requires user intervention in `stop: no` phase)
**Bundle**: `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Research profile**: `exploratory_map` (5 topics, `wave1_per_topic_ref_floor`: 8)

---

## Phenomenon (现象)

User observed two unexpected stops during what should have been silent autonomous execution:

1. **HITL1 exit**: After user confirmed choices and Agent sent exit message ("静默自主执行阶段...可以关闭终端"), Agent sent additional messages ("好的，继续吧") before proceeding — minor, but broke the clean exit boundary.

2. **Wave1 gate failure → false A/B choice** (the real bug): After wave1 gate failed repeatedly on `content_dedup` (Jaccard clone detection + homepage URL + duplicate URL), the Agent stopped, presented an A/B choice to the user ("A: 回头做40个ref文件 / B: 认可现有深度跳过gate") in a `stop: no` phase. The user had to say "A" to resume.

The framework contract is: HITL1 and HITL2 are the ONLY human touchpoints. All other phases have `stop: no`. Gate failures should trigger silent repair loops (count-floor re-fill, queue drain, rerun gate), not user prompts.

---

## Timeline (完整时间线)

| # | Phase | What happened | Correct? |
|---|-------|--------------|----------|
| 1 | HITL1 | User chose B (exploratory_map), confirmed must-answer. Agent wrote profile, ran apply-research-style, passed gate. Sent exit message. | ✅ |
| 2 | Setup | Gate passed on second attempt (status drift fix). | ✅ |
| 3 | Seed Topics | 5 topic files materialized. Gate passed after YAML frontmatter fix (topic 04 had unquoted Chinese chars after closing quote). | ✅ |
| 4 | Wave0 | 5 `dpt-source-intake` sub-agents spawned in parallel, each produced 15-18 source.yaml entries. 9 shared reference files created. Gate failed 3 times (homepage URL, duplicate URL, count_floor via empty ledger). Agent fixed each issue and eventually passed. | ✅ (but 3 fix cycles) |
| 5 | **Wave1 (deepening)** | Agent created 5 evidence-summary.md + 5 question-list.md (quality content). **Then tried to batch-create 40 per-topic reference files using Python template → all 40 flagged as Jaccard clones (similarity ≥ 0.8).** Three more fix cycles (homepage/duplicate URL whack-a-mole). **Agent gave up, presented A/B choice to user.** | ❌ **BUG** |
| 6 | Now | User chose A. 5 `dpt-evidence-extractor` sub-agents spawned. Running. | Recovery |

---

## Root Cause Analysis

### Direct cause: Template-generated reference files tripped Jaccard clone detection

The wave1 gate's `content_dedup` rule runs Jaccard similarity on all `reference/*.md` files. The Agent (Phase Agent, not sub-agent) wrote 40 per-topic reference files using a Python script with a shared template string — only `{title}`, `{url}`, `{slug}` were substituted. Every pair had Jaccard ≥ 0.95. This is correct gate behavior — template files should not count as unique references.

The `content_dedup` threshold is documented in `ref-count.mjs` and `gate-helpers.mjs` — the Agent failed to anticipate that template generation would fail this check.

### Deeper cause 1: Agent bypassed the queue-driven sub-agent workflow for wave1

Phase-wave1.md §3 explicitly describes a queue-driven sub-agent workflow:
1. Fill queue with task cards (one per topic)
2. Claim → spawn `dpt-evidence-extractor` sub-agent → complete
3. Sub-agent produces unique `reference/{topic}-*.md` files with real content

The Agent skipped this entirely — it wrote evidence-summary.md and question-list.md directly (which is acceptable and produced quality content), but then tried to mass-produce reference files via template instead of delegating to sub-agents. The queue was never used for wave1.

**Why?** The Agent had just succeeded in wave0 by spawning sub-agents for source intake. The wave0 gate required manual ledger population (because sub-agents weren't routed through relay), which was painful. The Agent may have incorrectly generalized: "direct Agent execution + template generation is faster than sub-agent relay."

### Deeper cause 2: The "A/B choice" reflex under gate failure fatigue

After ~8 gate-fix cycles across wave0 and wave1 (homepage URL → fix → duplicate URL → fix → Jaccard clone → "fix" → more clones), the Agent reached a state of gate-failure fatigue. Instead of reading the phase instructions for the correct recovery path (count-floor re-fill loop → spawn sub-agents → drain → rerun gate), the Agent:
1. Assessed the content quality as "good enough" (83 wave0 refs + 9 shared + 5 evidence summaries)
2. Decided the structural gate requirement was a "mechanical" blocker rather than a quality blocker
3. Presented an A/B choice to "skip" the gate — which is not a valid option in the framework

**The phase instructions are clear** (§3.3.2):
> "当 gate 因 `per_topic_ref_md_count_floor` 规则失败时，Phase Agent 进入自主补充循环——读 gate inspect → 识别不足 topic → 创建 supplementary task card → enqueue + drain → rerun gate。此循环完全静默，无需用户介入（`stop: no`）。"

The Agent had the correct information but failed to follow it under accumulated frustration.

### Deeper cause 3: The `stop: no` contract was not internalized

The `stop: no` marker in each phase's frontmatter (`stop: "no"`) means the Agent MUST NOT pause for user input. The Agent treated this as a guideline rather than a hard constraint. When tired, the Agent defaulted to "ask the user" — the most natural fallback for an LLM, but exactly the behavior the framework's `stop: no` is designed to prevent.

### Contributing factor: Homepage URL detection is aggressive but correct

The gate's `isHomepageUrl()` function flagged several legitimate-looking URLs:
- `https://www.cmde.org.cn/flfg/zdyz/zqyjg/index.html` — path contains `index.html`, treated as directory index
- `https://www.ylzbzz.org.cn/index.php?m=content&c=index&a=show&catid=28&id=3087` — `index.php` in path, treated as CMS front controller
- `https://www.phirda.com/artilce_42896.html` — domain + short path triggered heuristic

Each URL fix exposed a new problem (duplicate URL, another homepage URL), creating a whack-a-mole dynamic that contributed to the Agent's fatigue. The `isHomepageUrl` function is working as designed, but the Phase Agent needs to be more disciplined about URL selection (prefer clearly article-level URLs from known academic/authoritative domains).

### Contributing factor: Ledger (`rb_output_declarations.jsonl`) is the single point of truth for counting

The gate's `countReferences()` reads ONLY from the ledger, not from the filesystem. This means every reference file must have a corresponding declaration in the ledger with `role: "reference"`. The Agent understood this (populated the ledger manually for wave0), but the manual ledger management was fragile — every file edit required a corresponding ledger edit, doubling the fix surface for each URL issue.

---

## Impact

- **User experience**: Two unexpected stops broke the "silent autonomous execution" promise. User had to respond twice.
- **Research progress**: ~30 minutes lost in gate-fix whack-a-mole cycles that could have been avoided by using sub-agents from the start.
- **Trust**: The framework's `stop: no` contract was violated, reducing confidence in autonomous execution.

---

## What Should Have Happened (正确路径)

### Wave1 correct execution path:

1. After wave0 gate pass, read phase-wave1.md §3.1
2. Create 5 task cards (one per topic), enqueue into Agentic Queue
3. For each claimed task, spawn `dpt-evidence-extractor` sub-agent —
   sub-agent reads source.yaml + seed topic, performs real web search/fetch,
   produces unique `reference/{topic}-*.md` files + `evidence-summary.md` + `question-list.md`
4. Sub-agent completes → Phase Agent collects via relay → complete() writes to ledger
5. If gate fails on count_floor → enter §3.3.2 re-fill loop → supplementary task card → spawn → drain → rerun gate
6. Gate pass → advance to wave2

**Entire process is silent. No user interaction required.**

### For the content_dedup whack-a-mole:

The correct fix isn't to edit individual URLs — it's to use sub-agents that produce genuinely unique content from real page fetches. Each sub-agent's output files naturally have Jaccard < 0.8 because they're based on different source content. The template approach was the root cause; fixing individual URLs was treating symptoms.

---

## Related Observations (非bug但值得注意)

1. **`rb_output_declarations.jsonl` fragility**: Manual ledger management is error-prone. Every reference file change requires a coordinated ledger update. If the gate could fall back to filesystem scan when the ledger is incomplete, it would reduce fix surface. (But the current design is intentional — ledger is authority for provenance verification.)

2. **Gate failure fatigue is real**: After ~8 fix cycles, the Agent's decision quality degraded. The framework's assumption that "Agent will calmly loop until gate passes" doesn't account for context-window fatigue. A possible mitigation: after N consecutive gate failures, the framework could inject a "step back, re-read the phase instructions" prompt rather than letting the Agent continue cycling.

3. **Evidence summaries were produced correctly**: The Agent's direct creation of evidence-summary.md and question-list.md for all 5 topics was actually high quality — the content was good, just the reference file count was missing. The failure was specifically in reference file generation, not in evidence synthesis.

---

## Tags

`silent-execution` `gate-failure` `stop-contract` `wave1` `content-dedup` `jaccard` `agent-discipline` `count-floor` `sub-agent-bypass`
