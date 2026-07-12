> req: PHS-003

## MODIFIED Requirements

### Requirement: Topic Registry body section is human-readable table

The `## Topic Registry` section SHALL be a Markdown table with columns: `#`, `Slug`, `Title`, `Status`. The frontmatter `topic_registry` SHALL remain the authoritative source for topic identity and current layout. The body table is a derived human-readable view; conflicts SHALL be resolved in favor of frontmatter.

When topic-state apply renders a new plan and the body contains the recognized standard Topic Registry section/table shape, the same staged `rb_plan.md` replacement SHALL refresh its rows from the final current registry while preserving the Status value for rows that still bind the same UID when deterministically possible. Historical previous layouts SHALL not appear as current rows. If the body section/table is absent or non-standard, apply SHALL preserve the body and return advisory feedback; presentation drift SHALL NOT block mutation or create another identity authority.

#### Scenario: Topic Registry table reflects frontmatter topics
- **WHEN** Agent writes topics to `topic_registry` frontmatter during HITL1
- **THEN** the body `## Topic Registry` table SHALL list the same current topics with corresponding slugs and titles when the standard projection is rendered

#### Scenario: Layout mutation refreshes standard table
- **WHEN** mutate-layout changes current order, slug or title and the recognized standard table exists
- **THEN** the staged plan body SHALL show the final current rows without previous-layout aliases

#### Scenario: Status column tracks per-topic progress
- **WHEN** a wave completes for a specific topic
- **THEN** the Agent MAY update the Status column for that topic's row (frontmatter remains authoritative for identity)

#### Scenario: Non-standard body table does not block authority mutation
- **WHEN** the `## Topic Registry` body table is missing, non-standard or has different slugs than frontmatter
- **THEN** topic-state apply/gates SHALL preserve or tolerate the body, use frontmatter as authority and MAY return advisory feedback
- **AND** SHALL NOT fail layout mutation solely for presentation drift
