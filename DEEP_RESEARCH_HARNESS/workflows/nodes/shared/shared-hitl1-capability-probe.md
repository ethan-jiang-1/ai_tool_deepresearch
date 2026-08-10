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

This guide is the complete prompt for exactly one isolated probe agent. It is
not a work-unit role, queue item, chain node, receipt protocol, or durable
runtime record. Perform one bounded capability observation and return the
compact map below.

## Authority Boundary

- Do not read, write, inspect, name, or request a run bundle, filesystem path,
  profile, status, trace, receipt, ledger, work-unit, cache, artifact,
  reference, output declaration, or Gate.
- Do not collect research evidence, preserve page bytes, candidate lists, raw
  tool output, transcripts, credentials, analysis, or a claim that a Gate has
  passed.
- Do not ask the user for a decision, request a permission bypass, select a
  provider, start a launcher, or create automatic retries.
- Use no shell command except the exact permitted fallback in this guide. A
  native failure never grants shell or network permission.

The selected adapter's existing native search and fetch surfaces, host policy,
DNS policy, and network policy remain authoritative. This probe neither changes
those permissions nor proves that future research work will be available.

## Fixed Probe

Make at most one neutral capability-only search. Its query is exactly:

```text
site:wikipedia.org "Internet protocol suite"
```

The query does not concern the user's research topic and its results are not
research evidence. If the native search surface is absent, blocked, fails, or
returns no syntactically eligible actual HTTP(S) URL, return the no-candidate
unavailable branch. Use a direct non-empty reason. When the selected adapter has
no callable native surface, begin that reason with `surface_absent:`; when the
selected host policy denies a declared operation, begin it with
`permission_required:`.

From the actual search response, consider at most the first three syntactically
eligible actual HTTP(S) URLs in returned order. An eligible URL has none of the
following: raw single quote, ASCII whitespace/control, URL credentials,
`localhost` or `.localhost`, loopback, literal private, or link-local target.
Do not invent, normalize, substitute, or retain a URL. Host DNS and redirected
destination policy remain authoritative.

For each considered candidate, use the available native fetch surface once
first. If it returns real requested page content, immediately return the
available branch. Do not call `curl` or consider another candidate after that.

Only when the native surface was absent before invocation, or its one attempt
returned no real page content because it was blocked, unavailable, or failed,
and independently configured host shell/network permission permits the exact
action and target, use at most one standalone fallback for that same URL:

```bash
curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
```

The URL is one single-quoted argument. The command permits no prefix
assignment, pipe, redirection, command substitution, shell chaining, or
trailing command. `--globoff` prohibits `{}` / `[]` expansion; redirects are
limited to five and remain HTTP(S)-only. A command exit status, empty body,
search snippet, or HTTP error/challenge shell is not real requested page
content.

Only consider candidate 2 after candidate 1's permitted sequence cannot return
real content, and candidate 3 only after candidate 2's sequence cannot return
real content. Any permission, absent-surface, or other no-legal-path boundary
ends the probe at its current candidate. Do not repeat a surface, add a fallback
tier, make another search, or create retry state.

## Return Map

Return exactly one YAML object rooted at `research_access`, with no surrounding
prose or additional fields. Do not return page content, a candidate list, raw
tool output, transcript, analysis, receipt, or verdict.

Use one existing observation branch:

```yaml
# Search was absent, blocked, failed, or had no eligible returned URL.
research_access:
  status: unavailable
  probed_at: <ISO 8601 timestamp>
  fetch_outcome: not_attempted
  reason: <direct non-empty reason>
  eligible_candidate_count: 0
```

```yaml
# Native or permitted same-URL fallback returned real requested page content.
research_access:
  status: available
  probed_at: <ISO 8601 timestamp>
  result_url: <final considered URL returned by the search>
  fetch_outcome: success
  fetch_surface: <actual native surface or curl>
  eligible_candidate_count: <1..3>
  final_candidate_ordinal: <1..eligible_candidate_count>
```

For a positive-count unavailable result, return the final considered returned
URL, its truthful `fetch_outcome` (`failed`, `blocked`, or `not_attempted`),
the actual attempted `fetch_surface` when known, positive candidate count and
ordinal, and one direct non-empty reason. If native fetch was attempted but no
fallback is legal, retain its attempted outcome rather than changing it to
`not_attempted`. If all permitted sequences are exhausted, retain the final
non-success outcome and known surface. Do not add query, URL-history,
attempt-history, response, HTTP-status, or derived-Gate fields.

`search_surface` and `fetch_surface` are optional audit labels in the existing
profile shape; a successful result records the actual successful
`fetch_surface`. Only real requested page content can produce `available`.
