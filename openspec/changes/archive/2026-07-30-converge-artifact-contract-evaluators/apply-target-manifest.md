# C1 Apply Target Manifest

| Concern | Direct fact / owner | Current implementation target | C1 action |
| --- | --- | --- | --- |
| Seed Topic return-map entry | Seed Topic Wave slot plus current submitted identity | engine/helpers/return-map.mjs evaluateSeedTopicProjectionReadiness | Retain as the only return-map evaluator input. |
| Rich reference format | reference metadata plus five semantic sections | engine/helpers/gate-helpers-checks.mjs | Make YAML frontmatter canonical, retain legacy bullet read compatibility, and keep one metadata reader. |
| Wave1 evidence/question artifact | declared Wave1 artifact contract and submitted output coverage | engine/helpers/wave-contract-evaluators.mjs | Retain unchanged as direct artifact owner. |
| Generic return-map scans | No declared artifact family owns them | engine/helpers/return-map.mjs and cli/inspect-wave{0,1,2}-output.mjs | Remove these false consumer paths. |
| Phase-owned reference backing | submitted source/cache/work-unit facts | engine/helpers/gate-helpers-checks.mjs classifyReferenceAuthority | Reuse unchanged classification in reentry. |
| Reentry reference audit | same backing classification as normal Wave evaluation | cli/check-reentry.mjs | Replace direct-declaration-only scan; preserve genuine unbacked blocker. |
| Rich-reference authoring | shared template and loaded phase/role guidance | workflows/nodes/shared and workflows/nodes/phases | Teach canonical frontmatter without adding a second protocol. |

The manifest introduces no registry, persistent state, evaluator, authority, retry,
or controller. It records the existing owners that C1 will reconnect.
