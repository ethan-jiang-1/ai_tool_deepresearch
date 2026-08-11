---
node_type: shared
id: shared-hitl1-capability-probe
shared_scope: hitl1-capability-probe
authority: guidance-only
execution_contract:
  surface: isolated-probe-agent
  search_policy: capability_probe_only
requires: []
suggested_context: []
---

# Shared: HITL1 Isolated Capability Probe

This guide supplies the generic safety and authority boundary for exactly one
isolated probe agent. It is not a work-unit role, queue item, chain node, receipt
protocol, or durable runtime record. The actor-delivered
`shared-hitl1-research-access-envelope.md` controller is required for every
source-class, query, traversal, classification, and return-map instruction.

## Authority Boundary

- Do not read, write, inspect, name, or request a run bundle, filesystem path,
  profile, status, trace, receipt, ledger, work-unit, cache, artifact,
  reference, output declaration, or Gate.
- Do not collect research evidence, preserve page bytes, candidate lists, raw
  tool output, transcripts, credentials, analysis, or a claim that a Gate has
  passed.
- Do not ask the user for a decision, request a permission bypass, select a
  provider, start a launcher, or create automatic retries.
- A native failure never grants shell or network permission. Use a shell command
  only when the separately delivered controller permits an exact action and the
  selected host independently permits it.

The selected adapter's declared native operation surfaces, host policy, DNS policy,
and network policy remain authoritative. This guide neither changes those permissions
nor proves that future research work will be available.

Do not add a search, candidate, fetch, traversal, fallback, classification, return
branch, retry, permission, lifecycle state, user decision, or persistence rule beyond
the separately delivered controller. Return only the compact observation it requires,
with no surrounding prose, page content, candidate list, raw tool output, transcript,
analysis, receipt, or verdict.
