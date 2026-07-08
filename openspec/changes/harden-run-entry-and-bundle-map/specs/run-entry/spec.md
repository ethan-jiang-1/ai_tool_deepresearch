> req: RUE-004

## MODIFIED Requirements

### Requirement: Agent behavior files stay synchronized on skill override

When the skill-override instruction in RUN.md is updated, the same directive SHALL be reflected consistently across repo-root `CLAUDE.md`, repo-root `AGENTS.md`, `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, and `DPT_FRAMEWORK/README.md`.

Repo-root behavior files SHALL contain a short high-priority rule: when the user expresses research, deep-research, investigation, or report intent and this repo's `DPT_FRAMEWORK/` is the selected or relevant entry path, the Agent SHALL NOT invoke built-in `deep-research` or equivalent one-shot research shortcuts. It SHALL use `DPT_FRAMEWORK/RUN.md` and the framework workflow.

#### Scenario: Skill override language consistency
- **WHEN** RUN.md Section 0 instructs agents not to invoke built-in deep-research or equivalent research shortcuts
- **THEN** repo-root `CLAUDE.md` and repo-root `AGENTS.md` SHALL contain equivalent repo-level routing language
- **AND** `DPT_FRAMEWORK/CLAUDE.md` and `DPT_FRAMEWORK/AGENTS.md` SHALL contain equivalent framework-local directive language
- **AND** README.md trigger rules SHALL reference the override instruction

#### Scenario: Root behavior files suppress shortcut before framework-local files
- **WHEN** a fresh Agent session loads repo-root behavior files before reading `DPT_FRAMEWORK/RUN.md`
- **AND** the user expresses research intent with `DPT_FRAMEWORK/` selected or relevant
- **THEN** the root behavior files SHALL instruct the Agent not to call a built-in research shortcut
- **AND** they SHALL route the Agent to the DPT framework entry instead
