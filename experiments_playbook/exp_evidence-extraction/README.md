# exp_evidence-extraction — Suite Contract

> Case segment: `case-161` through `case-169`. This suite proves evidence-chain behavior after a work-unit result is accepted: submitted reference rows, verified cache trails, gate cache coverage, file observability, and reentry feedback.

## Proof Roles

| Case | Weight | Proof role |
| --- | --- | --- |
| `case-161` | light | Fixture-backed Engine path: `operate-work-unit submit` validates cache trails and writes verified ledger rows; invalid cache trails reject without ledger append. |
| `case-162` | standard | Disposable-bundle gate/reentry path: submitted work-unit ledger rows drive `count_floor`, `cache_coverage`, file-observability `cache_gap`, and `check-reentry`; orphan/direct artifacts cannot satisfy pass conditions. |
| `case-163` | heavy | Real Agent continuation canary: a historical normal-run prerequisite enters a real rerun, adds two Topics through topic-state, runs their normal Wave0/Wave1 and supplementary work-unit paths, performs one hint-only same-Gate repair, then proves hash-identical declaration recovery. |
| `case-164` | heavy | Three-turn real Subject Agent canary: a first real child returns a post-`work_done` direct semantic rejection, the Subject preserves its hashes and explicitly claims a fresh same-primary replacement, and a second independently searching/fetching child alone reaches submit. |

## Boundary

Fixture-backed cases prove Engine and gate contracts only. They do not prove Agent search, judgment, writing, or recovery quality. In case-163, the fixture stops at the two-Topic historical normal-run prerequisite; all rerun-added Topic outputs, receipts, cache leaves, references, depth reviews, repairs, and recovery evidence must come from the real continuation path. In case-164, setup stops before claim with only one Topic and one primary queue demand; both child candidates, receipts, source/cache facts, dry-submit rejection, fail/replacement transition, and submitted row must come from the real three-turn path. Either heavy canary may report `NOT_RUN` when a required real Agent/child plus search/fetch surface is unavailable; `NOT_RUN` is not a PASS and cannot be used as proof of Agent extraction quality.
