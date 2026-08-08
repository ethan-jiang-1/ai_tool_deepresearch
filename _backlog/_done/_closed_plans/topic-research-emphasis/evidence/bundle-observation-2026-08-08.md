# Completed-Bundle Observation: Enterprise AI Harness Platforms

> Observed: 2026-08-08
> Bundle: `/Users/bowhead/ai_tool_deepresearch/dpt_rb_enterprise-ai-harness-platforms`
> Method: read-only inventory, canonical topic-state inspection, and direct
> artifact/seed inspection. These are observations, not an evidence-quality
> verdict or a proposed runtime mutation.

## Question

Does the completed bundle show unequal research effort across its five seed
Topics, or does its reader-facing `reference/` layout merely make it look that
way?

## Runtime Facts

- The canonical registry contains five Topics.
- `rb_status.json` reports `state: completed` and
  `current_gate: readiness_passed`.
- `rb_profile.yaml` records `rerun_count: 0`.
- Read-only `operate-topic-state.mjs inspect` reports every canonical Topic
  `complete` from submitted artifact facts.
- The selected `exploratory_map` style recorded a common
  `wave0_per_topic_source_floor: 10`; it has no Topic-specific effort field.

## Wave0 Direct Source Records

| Topic | Direct source records |
| --- | ---: |
| 01 AgentScope platform | 12 |
| 02 DeerFlow platform | 13 |
| 03 Open-source agent frameworks | 12 |
| 04 Hosted agent platforms | 13 |
| 05 Enterprise adoption landscape | 13 |

This is close to a uniform initial intake. It does not establish equivalent
source quality, breadth, or analytical depth.

## Flat Reference Inventory

The committed `reference/_INDEX.md` inventories 74 files. File size and count
are presentation facts, not a measure of semantic research quality.

| Reader-facing group | Files | Bytes | Lines |
| --- | ---: | ---: | ---: |
| `00-shared-*` | 13 | 37,414 | 631 |
| `00-cross-*` | 4 | 9,211 | 184 |
| `01_*` | 9 | 18,077 | 414 |
| `02_*` | 12 | 23,062 | 552 |
| `03_*` | 9 | 18,385 | 414 |
| `04_*` | 11 | 22,295 | 506 |
| `05_*` | 16 | 34,468 | 736 |

The `00-shared-*` group is not a sixth seed Topic. It is intended as a
shared-foundation projection, while `00-cross-*` is cross-Topic synthesis.
However, nine of the thirteen shared filenames are AgentScope-specific. The
directory prefix consequently hides the distinction between genuinely shared
foundation evidence and evidence that happens to have been materialized in the
shared namespace.

## Seed-Navigation Mismatch

For Topics 02-05, each Wave0 seed has 12-13 submitted source entries but all
of those entries navigate to one shared reference file for that Topic. For
example, DeerFlow's thirteen direct source records are represented by the
single `reference/00-shared-deerflow-repo.md` navigation target. The source
records themselves remain available through their Wave0 artifact and cache
trails, but the reader-facing reference view does not expose that distribution.

Topic 01 has twelve Wave0 entries linking to nine distinct shared references;
its display therefore appears much richer even before Topic-specific Wave1
material is considered.

## Design Consequence

Do not infer Topic research allocation from `reference/` file count, byte
count, prefix, or a single seed-navigation target. The future design needs two
separate reader questions:

1. What common-baseline and incremental research has been accepted for this
   Topic and Wave?
2. Which files are reusable foundation evidence, Topic-specific evidence, or
   cross-Topic synthesis?

The answer to either question must preserve submitted evidence provenance and
must not create a second evidence authority.

## Follow-up Boundary

A read-only Wave0 inspector also reported naming expectations that reject
Topic-specific and cross-Topic filenames in this completed reference
namespace. That observation is not classified here: it may be an inspector
scope mismatch or a compatibility defect. Treat it as a separate diagnostic
until reproduced against its intended lifecycle window and contract.
