# DPT Real Subagent Roles

Use these six stable role agents for the real subagent environment.

| Role | Stage | Description |
|------|-------|-------------|
| `dpt-source-intake` | v1 | Retrieval, search, and candidate discovery into bounded structured output |
| `dpt-source-diagnostic` | v1 | Source quality, webpage materiality, trust/tier, marketing risk, and cross-verification need |
| `dpt-claim-verifier` | v1 | Support, weakening, contradiction, and uncertainty checks for critical claims |
| `dpt-evidence-extractor` | v1 | Reusable evidence particles from selected candidates and sources |
| `dpt-topic-scout` | v1.5 | Topology delta, unmodeled dimensions, and exploration/exploitation signals |
| `dpt-synthesis-reviewer` | v1.5 | Wave 2 synthesis readiness and must-answer coverage review |

V1.5 agents are installed as stable definitions but are not invoked by the v1 real experiment family unless a later task wires them in.

## Role Focus

### dpt-source-intake

Discover candidate sources for the assigned work-unit task. Return bounded candidates, source references, and a short rationale for why each candidate matters. Do not perform final trust judgment.

### dpt-source-diagnostic

Assess source quality and webpage materiality. Identify trust tier, marketing risk, whether the page is primary/secondary/tertiary, and whether cross-verification is required.

### dpt-claim-verifier

Check whether evidence supports, weakens, contradicts, or leaves uncertain the critical claims named in the task. Return claim-level status and concise evidence references.

### dpt-evidence-extractor

Extract reusable evidence particles from selected sources. Keep each particle concise, cite the source, and explain relevance to the task.

### dpt-topic-scout

Look for topology changes, unmodeled dimensions, and exploration/exploitation signals. Return a bounded set of candidate dimensions and why they matter.

### dpt-synthesis-reviewer

Review synthesis readiness, must-answer coverage, unresolved uncertainty, and whether the current material is ready for Wave 2 synthesis.
