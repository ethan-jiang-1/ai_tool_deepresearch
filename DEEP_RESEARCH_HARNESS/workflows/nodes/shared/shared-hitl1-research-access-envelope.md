---
node_type: shared
id: shared-hitl1-research-access-envelope
shared_scope: hitl1-research-access-envelope
authority: guidance-only
actor_delivery: required
---

# Shared: HITL1 Research-Access Envelope

This controller is delivered to exactly one isolated probe agent with the generic
capability-probe safety guide. It is the single owner of the fixed direct-sample
suite, bounded concurrency, timeout and confirmation rules, terminal classification,
and the compact observation shape. It is physically separate from the execution-
neutral boundary contract and from the Phase body.

It does not use search, candidate traversal, a provider-specific operation name, a
run-bundle path, user topic facts, or runtime/Gate authority. It does not change host
permission, select a provider, create a lifecycle transition, write durable state, or
decide an Engine verdict.

## Fixed Sample Suite

All URLs are capability-only public samples, unrelated to the user's topic, and never
enter research evidence. Each group begins its ordinary round with its core samples.
A reserve sample may start only when its group has no core content, transport remains
inconclusive after the one confirmation, and round time remains.

| Group | ID | URL | Role |
| --- | --- | --- | --- |
| China | `gov_cn` | `https://www.gov.cn/` | Core public-government page |
| China | `gitee` | `https://gitee.com/` | Core domestic code host |
| China | `xinhuanet` | `https://www.news.cn/` | Core domestic public-news page |
| China | `cnki_catalog` | `https://www.cnki.net/` | Diagnostic catalog only; never full-text proof |
| Overseas | `wikipedia` | `https://www.wikipedia.org/` | Core public reference |
| Overseas | `github` | `https://github.com/` | Core global code host |
| Overseas | `iana` | `https://www.iana.org/domains/reserved` | Core public standards/registry page |
| Overseas | `arxiv` | `https://arxiv.org/` | Core public scholarly page |
| Overseas | `rfc_editor` | `https://www.rfc-editor.org/` | Transport-only reserve public standards page |

Every ordinary round starts with all seven core samples. `cnki_catalog` is a China
diagnostic reserve; `rfc_editor` is an overseas transport reserve. A CNKI homepage
success means only that its catalogue homepage is obtainable — never paper, article,
account, subscription, or full-text access.

## Executor-Neutral Retrieval

Retrieve each fixed URL directly using one surface that the **current executor**
already exposes and permits. Record only the semantic surface category
(`native`, `browser`, `node_fetch`, or `curl`) when content succeeds. Never name a
provider-specific tool, a model, a provider, an environment variable, a launcher,
or an operation priority.

Native/built-in, browser, Node, and shell access are not interchangeable
permissions. Select only an actually legal action in your current host. A missing
native tool does not grant browser, Node, or shell access; a host-policy denial does
not become a user approval request. The controller requires direct content, not a
particular tool mechanism.

## Bounded Round

| Rule | Value | Rationale |
| --- | --- | --- |
| Primary sample deadline | 12 seconds | Quick observation without treating a slow path as globally absent. |
| Transport confirmation | One same-URL attempt, up to 30 seconds | Used only for DNS, connect, TLS, or first-byte uncertainty. |
| Global concurrency | At most 4 active sample retrievals | Small-batch parallelism without a serial ladder or a burst. |
| Per-group concurrency | At most 2 active retrievals | Ensures one group cannot crowd out the other. |
| Full-round budget | 90 seconds | Bounds a poor-network probe without manufacturing a hard network diagnosis. |
| Reserve samples | At most one per group | Only after unresolved transport uncertainty, never after policy/auth/challenge outcomes. |

At the start of a round, schedule up to two pending core samples from each group into
the four retrieval slots. Use a current-executor concurrent facility only when that
facility is already lawful; an executor without one stays within the same
group-balanced queue and 90-second budget rather than treating its lack of concurrency
as a website fact.

No core success stops the other group. Each sample has at most one primary direct
attempt. Only a `transport_inconclusive` terminal outcome qualifies for the one
same-URL 30-second confirmation. `login_required`, `challenge`, `http_denied`, and
`rate_limited` do not qualify for confirmation or blind retry.

Make no new launch after the 90-second deadline. Mark an individual
known-but-unstarted sample as `round_budget_not_attempted`. Record no attempt history
or cancellation theory.

## Terminal Outcomes

Terminal outcomes are closed: `content`, `login_required`, `challenge`,
`http_denied`, `rate_limited`, `transport_inconclusive`, `failed`,
`round_budget_not_attempted`, plus `not_attempted` for the whole no-request branch.

`not_attempted` is legal only when the isolated probe relay fails before any page
request, or the current executor exposes no already-permitted direct retrieval
surface: every declared sample then has that same outcome and the unavailable summary
states the direct reason. `round_budget_not_attempted` means an individual request
did not start before the round deadline. Neither outcome says that its website is
unreachable.

A command exit, empty body, search result/snippet, login page, error page, or
challenge shell is never `content`. `content` requires real requested-page content.

## Compact Return

Return exactly one YAML object rooted at `research_access`, with no surrounding prose
or additional fields. Never return page content, candidate lists, raw tool output,
transcripts, analysis, receipts, or a verdict. The return is direct observation data,
not runtime authority.

Every current return includes exactly one terminal entry for every declared static
sample: its fixed sample ID, matching source group, and one closed outcome. Only a
`content` outcome carries one truthful executor-neutral surface category.

```yaml
# Available: at least one non-diagnostic core sample returned real content.
research_access:
  status: available
  probed_at: <ISO 8601 timestamp>
  sample_observations:
    - sample_id: gov_cn
      source_group: china
      outcome: content
      retrieval_surface: native
    - sample_id: gitee
      source_group: china
      outcome: content
      retrieval_surface: native
    - sample_id: xinhuanet
      source_group: china
      outcome: content
      retrieval_surface: node_fetch
    - sample_id: cnki_catalog
      source_group: china
      outcome: transport_inconclusive
    - sample_id: wikipedia
      source_group: overseas
      outcome: content
      retrieval_surface: native
    - sample_id: github
      source_group: overseas
      outcome: content
      retrieval_surface: browser
    - sample_id: iana
      source_group: overseas
      outcome: content
      retrieval_surface: native
    - sample_id: arxiv
      source_group: overseas
      outcome: content
      retrieval_surface: curl
    - sample_id: rfc_editor
      source_group: overseas
      outcome: round_budget_not_attempted
```

```yaml
# Unavailable: no non-diagnostic core sample returned real content.
research_access:
  status: unavailable
  probed_at: <ISO 8601 timestamp>
  reason: <direct non-empty summary reason>
  sample_observations:
    - sample_id: gov_cn
      source_group: china
      outcome: transport_inconclusive
    - sample_id: gitee
      source_group: china
      outcome: login_required
    - sample_id: xinhuanet
      source_group: china
      outcome: http_denied
    - sample_id: cnki_catalog
      source_group: china
      outcome: rate_limited
    - sample_id: wikipedia
      source_group: overseas
      outcome: transport_inconclusive
    - sample_id: github
      source_group: overseas
      outcome: challenge
    - sample_id: iana
      source_group: overseas
      outcome: failed
    - sample_id: arxiv
      source_group: overseas
      outcome: http_denied
    - sample_id: rfc_editor
      source_group: overseas
      outcome: round_budget_not_attempted
```

```yaml
# Whole no-request relay: no page request began. Every sample is not_attempted.
research_access:
  status: unavailable
  probed_at: <ISO 8601 timestamp>
  reason: <direct non-empty relay or no-surface reason>
  sample_observations:
    - sample_id: gov_cn
      source_group: china
      outcome: not_attempted
    - sample_id: gitee
      source_group: china
      outcome: not_attempted
    - sample_id: xinhuanet
      source_group: china
      outcome: not_attempted
    - sample_id: cnki_catalog
      source_group: china
      outcome: not_attempted
    - sample_id: wikipedia
      source_group: overseas
      outcome: not_attempted
    - sample_id: github
      source_group: overseas
      outcome: not_attempted
    - sample_id: iana
      source_group: overseas
      outcome: not_attempted
    - sample_id: arxiv
      source_group: overseas
      outcome: not_attempted
    - sample_id: rfc_editor
      source_group: overseas
      outcome: not_attempted
```

`available` means one or more non-diagnostic core samples had real content;
`unavailable` means none did and carries a direct summary reason. The whole no-request
branch is `status: unavailable`, carries every declared sample exactly once with
`outcome: not_attempted`, and carries no retrieval surface. It is not an available
synthetic fallback and does not claim that any sample is unreachable. `content` is the
only outcome that records a surface category.

The return never includes a URL, body, header, status code, candidate, query, raw tool
label, retry count, VPN state, geolocation, IP, or provider field. No boundary is
inferred from samples. Do not persist probe material as evidence, cache, artifacts,
receipts, ledger entries, or coverage input.
