# gate-content-dedup Specification

> req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005, GAC-006, GAC-007, GAC-008, GAC-009

## Purpose

`content_dedup` and its duplicate URL, homepage/shallow URL, Jaccard, and self-reference heuristics are retired historical gate patches. They created noisy feedback for the Markdown Controller and do not belong in phase-boundary gate quality loops.

Current quality authority belongs to work-unit submit, declaration ledger coverage, cache trail validation, provenance/hash checks, source/reference schema checks, and phase handoff witnesses.

## Requirements

_All requirements (GAC-001 through GAC-009) have been removed. This capability directory is retained as a tombstone for traceability only. No active production code or gate definitions depend on `content_dedup`._
