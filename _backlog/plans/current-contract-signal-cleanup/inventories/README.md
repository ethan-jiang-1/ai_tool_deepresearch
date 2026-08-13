# Current-Contract Cleanup Audit Inventories

> Status: in progress. These inventories are the evidence layer for the
> global Coverage Gate in `../coverage-ledger.md`.

## Purpose

The cleanup program cannot treat a keyword hit as a deletion candidate. These
files make the audit checkable: every in-scope asset has a primary
classification, an owner or adjacent change family, and a recorded next action.
They are planning evidence, not a behavior source of record and not an OpenSpec
change.

## Classification keys

| Key | Meaning |
| --- | --- |
| `P` | Protected current semantic. The asset owns or projects current behavior and is not a deletion target. |
| `R` | Current rejection or safety boundary. It may mention historical input, but its current job is to fail closed or expose an honest diagnostic. |
| `C#` | A bounded cleanup or policy fact owned by the named change card. The card, not this inventory, decides whether it is later removed or rewritten. |
| `H` | History-only or tombstone material. It remains only when a current governance owner requires the history. |
| `F` | False positive or current schema discriminator. A version-like word is not evidence of multi-version runtime support. |

An asset can contain both a protected current contract and a narrow candidate
fact. Its primary classification remains `P` or `R`; the `Tracked fact` column
names the narrow card so that the current behavior is not accidentally swept
away with the candidate.

## Scope and counting rules

- Harness inventory: `git ls-files DEEP_RESEARCH_HARNESS` yields 227 tracked
  files. Five are empty placeholders or an empty trace template, so the
  detailed inventory has 222 non-empty assets plus a separate empty-file list.
- Main-spec inventory: all 85 accepted `openspec/specs/**/spec.md` files.
- Supporting-surface inventory: direct routing/governance files and the
  focused tests/playbooks that a candidate would have to change or preserve.
  It is intentionally not a duplicate inventory of every test in the repo.

## Completion rule

The Coverage Gate is not closed just because every row exists. It closes only
when each `C#` fact has a card with an owner, risk, concrete reader consequence,
and next action, and when no row remains `unresolved`.
