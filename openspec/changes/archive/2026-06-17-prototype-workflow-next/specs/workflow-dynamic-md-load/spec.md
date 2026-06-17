# Workflow Dynamic MD Load
> req: WDM-001

Workflow-next loads one explicitly chosen entry Markdown file at a time. The entry Markdown is loaded just-in-time when `loadNextMarkdown(fileRef, state, runtime)` is called.

## ADDED Requirements

### Requirement: LoadNextMarkdown loads only the requested entry closure
The `loadNextMarkdown(fileRef, state, runtime)` function SHALL load and execute only the dependency closure rooted at the requested `fileRef`.

#### Scenario: Self-contained entry loads by request
- **WHEN** `loadNextMarkdown('wave-entry.md', state, runtime)` is called
- **THEN** `wave-entry.md` is loaded and executed
- **AND** unrelated Markdown files such as `audit.md` are not loaded

#### Scenario: Multiple entries are caller-selected
- **WHEN** `loadNextMarkdown('wave-entry.md', state, runtime)` succeeds
- **AND** later `loadNextMarkdown('audit.md', state, runtime)` is called
- **THEN** `audit.md` is loaded because the caller explicitly selected it
- **AND** no cursor is used to select the next file

### Requirement: Successful load returns loaded result
The system SHALL return `{ status: 'loaded', state, runtime, plan }` after the requested entry dependency closure is successfully resolved and executed.

#### Scenario: Loaded result includes plan
- **WHEN** `loadNextMarkdown('wave-entry.md', state, runtime)` succeeds
- **THEN** the result status is `loaded`
- **AND** the result plan contains `['wave-entry.md']`

### Requirement: Markdown content cache does not cache execution
The loader SHALL cache Markdown content and parsed frontmatter after the first read, but SHALL execute a Markdown file each time it appears in a new load plan.

#### Scenario: Cached file executes again
- **WHEN** `shared-lib.md` was read during a previous `loadNextMarkdown()` call
- **AND** a later load plan includes `shared-lib.md`
- **THEN** the loader records a `cache_hit`
- **AND** it records a new `file_executed` event for `shared-lib.md`
