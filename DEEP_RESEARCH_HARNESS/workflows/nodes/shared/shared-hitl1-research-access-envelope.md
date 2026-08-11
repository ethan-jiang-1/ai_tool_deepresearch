---
node_type: shared
id: shared-hitl1-research-access-envelope
shared_scope: hitl1-research-access-envelope
authority: guidance-only
actor_delivery: required
---

# Shared: HITL1 Research-Access Envelope

This controller is delivered to exactly one isolated probe agent with the selected
adapter operation facts and the generic capability-probe safety guide. It controls
only this probe's bounded observation. It does not change host permission, select a
provider, create a lifecycle transition, write durable state, or decide an Engine
verdict.

## Declared Source-Class Ladder

Use this ordered, closed ladder. The query is neutral, is unrelated to the user's
research topic, and never becomes research evidence.

```yaml
source_class_ladder:
  - source_class: encyclopedia
    query: 'site:wikipedia.org "Internet protocol suite"'
  - source_class: code_host
    query: 'site:github.com "Hello World"'
  - source_class: general_web
    query: '"Internet protocol suite"'
```

The only reachability values are `reachable`, `unreachable`, and `not_attempted`.
The only boundary locations are `host_surface`, `host_policy`, `network_path`, and
`probe_relay`. The only boundary extents are `universal` and `class_scoped`.

## Ordered Observation

Start at the first ladder entry and make exactly one native search with that entry's
query. From its actual response, consider at most the first three syntactically
eligible HTTP(S) URLs in provider order. An eligible URL has no raw single quote,
ASCII whitespace/control, URL credentials, `localhost` or `.localhost`, loopback,
literal private, or link-local target. Do not invent, normalize, substitute, or retain
a URL. Host DNS and redirected-destination policy remain authoritative.

For every considered URL, use the selected native fetch surface once first. Only real
requested page content is success; command exit, empty body, search snippets, and
HTTP error or challenge shells are not content. When native fetch cannot return real
content, use at most one independently permitted fallback for that exact same URL:

```bash
curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
```

The URL is one single-quoted argument. The command permits no prefix assignment,
pipe, redirection, command substitution, shell chaining, or trailing command.
`--globoff` prohibits `{}` and `[]` expansion; redirects remain HTTP(S)-only.

On the first real-content success, stop the entire ladder: mark that class
`reachable`; mark every earlier fully exhausted class `unreachable`; and mark every
later class `not_attempted`. Otherwise, mark a class `unreachable` only after its
single search and every permitted candidate sequence have exhausted. Continue to the
next class until the ladder is exhausted. Do not repeat a surface, add a fallback
tier, start another search for a class, create retry state, or request user action.

## Classification And Return

Return exactly one YAML object rooted at `research_access`, with no surrounding prose
or additional fields. Never return page content, candidate lists, raw tool output,
transcripts, analysis, receipts, or a verdict. The return is direct observation data,
not runtime authority.

Each current return includes exactly one reachability entry for every declared source
class. It never includes query text, URL history, attempt history, response bodies,
HTTP status, or a derived verdict. `unprobed` is not a probe return branch.

When direct facts establish one boundary owner, include the paired object below. Do
not infer a boundary from reason prose or choose one merely to fill the field:

```yaml
access_boundary:
  location: <host_surface|host_policy|network_path|probe_relay>
  extent: <universal|class_scoped>
```

Use `universal` only for an unavailable observation when the same established
location explains every declared class. Use `class_scoped` only for an available
observation that includes both reachable and unreachable classes. When no single
owner is established, omit the whole object: that is the honest unclassified result.

```yaml
# First success or a later class success.
research_access:
  status: available
  probed_at: <ISO 8601 timestamp>
  result_url: <final considered returned URL>
  fetch_outcome: success
  fetch_surface: <actual successful surface>
  eligible_candidate_count: <positive count>
  final_candidate_ordinal: <ordinal within that count>
  source_class_reachability:
    - source_class: encyclopedia
      reachability: <reachable|unreachable|not_attempted>
    - source_class: code_host
      reachability: <reachable|unreachable|not_attempted>
    - source_class: general_web
      reachability: <reachable|unreachable|not_attempted>
  # Include only for a directly established partial boundary.
  access_boundary:
    location: <location>
    extent: class_scoped
```

```yaml
# All declared classes exhausted without real requested page content.
research_access:
  status: unavailable
  probed_at: <ISO 8601 timestamp>
  fetch_outcome: <failed|blocked|not_attempted>
  reason: <direct non-empty reason>
  # For a positive final count, also retain result_url, fetch_surface when known,
  # eligible_candidate_count, and final_candidate_ordinal.
  source_class_reachability:
    - source_class: encyclopedia
      reachability: unreachable
    - source_class: code_host
      reachability: unreachable
    - source_class: general_web
      reachability: unreachable
  # Include only when one location directly explains all classes.
  access_boundary:
    location: <location>
    extent: universal
```

For a no-candidate unavailable result, set `eligible_candidate_count: 0` and omit
the final URL and ordinal. For a positive-count unavailable result, retain the final
considered URL, truthful non-success outcome, known attempted surface, count, and
ordinal. These are the only unavailable forms; a free-text reason alone is not a
classification. Do not persist probe material as evidence, cache, artifacts, receipts,
ledger entries, or coverage input.
