## Context

See `proposal.md`. The repository owner decided that maintaining two `AGENTS.md`/`CLAUDE.md`
copies is unacceptable and that `CLAUDE.md` should be a symlink to the co-located `AGENTS.md`.
This changes `agent/agent-context-routing` (ACR-002/ACR-004), which today requires two files
byte-identical modulo tool-specific title lines, enforced by a guard test.

Verified facts shaping the approach:

- Root and `DEEP_RESEARCH_HARNESS/` each hold a `CLAUDE.md`/`AGENTS.md` pair that is byte-identical
  except line 1 (title) and line 3 (host name).
- `tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` asserts the two bodies
  (after the first three lines) are byte-identical.
- `check-all.mjs` aggregates every `check-*.mjs`, so a new `check-entry-chain.mjs` needs no
  aggregator edit.

## Goals / Non-Goals

**Goals:**

- Make each entry directory hold exactly one real `AGENTS.md`, with `CLAUDE.md` a symlink to it.
- Neutralize the host-specific line 3 so one file reads correctly under both hosts.
- Enforce the symlink shape with a deterministic check and update the guard test to assert shape
  instead of two-file byte equality.

**Non-Goals:**

- Do not change any `DEEP_RESEARCH_HARNESS/` runtime, schema, CLI, receipt, trace, or Gate behavior.
- Do not touch `.agents/skills/**`, `.claude/skills/**`, or `.codex/skills/**`.
- Do not add dependencies; use Node built-ins (`node:fs`, `node:test`, `node:assert`).
- Do not alter the Charter-then-context route content — only its physical file shape.

## Decisions

### 1. `CLAUDE.md` becomes a symlink; `AGENTS.md` line 3 is neutralized

In each entry directory, `CLAUDE.md` → symlink → `AGENTS.md`. `AGENTS.md` line 3 changes to a
host-agnostic phrase (root: "Coding-agent notes for this repo"; Harness: "Coding agent 读到本文件时
…"), and the Harness `AGENTS.md` trailing note ("two files, edit both") becomes a note that
`CLAUDE.md` is a symlink.

- **Why symlink over keeping two files**: the owner explicitly wants one real file; a symlink makes
  "edit the rules" a single action and removes the second copy outright (DSH
  `09-agents-entry-chain.md` shape).
- **Why neutralize line 3**: a symlink has one physical target, so a single host-neutral line is the
  only way both hosts read the same file.

### 2. New `check-entry-chain.mjs` (auto-aggregated by `check-all.mjs`)

Asserts, for the repo root and `DEEP_RESEARCH_HARNESS/`, that `AGENTS.md` is a regular file and
`CLAUDE.md` is a symlink whose `realpath` equals `AGENTS.md`'s. Fails with the violating surface and
the repair instruction (restore the symlink). This is the deterministic shape check the ACR delta
requires; the finalizer's existing drift-guard list is not extended (the check runs in
`check-all.mjs` and during Apply).

### 3. Guard test asserts shape, not two-file byte equality

`tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` is rewritten to assert the
single-source shape (`AGENTS.md` regular file, `CLAUDE.md` symlink resolving to it) for both entry
directories. A new `tests/integration/governance/check-entry-chain-contract.test.mjs` provides the
negative control: a temp fixture where `CLAUDE.md` is a regular-file copy must fail the checker
(introduce regression → red → revert → green).

### Semantic-precision / simple-reliable-control / helper-oriented reflection

- **Semantic precision**: the reader-facing change has one bounded question (is this entry a single
  fact?), one essential distinction (symlink vs copy; real file vs second copy), and a normal
  reasoning stop (the check verdict).
- **Simple reliable control**: shortest legal loop is `npm run governance:check` failing at the
  named surface on drift; no new state machine or recovery path.
- **Helper-oriented responsibility**: the checker is an Engine deterministic verdict; symlinking and
  neutralizing text is ordinary authorized Agent work; the BREAKING file-shape change was decided by
  the user.

## Risks / Trade-offs

- [A host-specific intro line is lost] → Mitigation: line 3 is neutralized; the standing orders
  themselves are identical today, so no rule content is lost.
- [Tests that compare AGENTS/CLAUDE content become trivial] → Mitigation: the guard test is
  rewritten to assert the symlink shape, which is the meaningful invariant; no test asserts that
  "Codex"/"Claude Code" must appear in a specific file (verified this session).
- [The finalizer's drift-guard list does not include `check-entry-chain`] → Mitigation: the check
  runs in `check-all.mjs` and during Apply; extending the finalizer list is a deliberate
  out-of-scope follow-up, not a silent gap.
