# Change 1: Capture User Research Controls

> Parent plan: [User-Guided Research Controls, Question Closure, and Model-Led Evidence Judgment](../research-question-closure-and-evidence-judgment.md)
>
> Proposed OpenSpec change id: `capture-user-research-controls`
>
> Status: candidate Change 1, ready for focused OpenSpec exploration; no framework behavior has changed yet

## Goal

Let a user state one optional per-run control brief at HITL1, preserve it in the existing host file, and make it available to the existing Seed, wave, work-unit, and Final guidance surfaces without adding a new runtime controller.

The optional brief changes research guidance only when the user actually supplies one. It is not a required HITL1 answer, a new gate fact, or a prerequisite for later question closure.

The supplied-controls flow is intentionally small; the no-controls form retains the current question/profile path:

```text
user controls
  -> HITL1 records one host-file snapshot
  -> Seed makes local projections; wave and delegated Agents read the original coordinate
  -> Final uses the same controls and visible limitations
```

## Terms

| Term | Meaning | Is not |
| --- | --- | --- |
| **Research control brief** | The optional, user-authored, per-run statement of priorities, exclusions, source/evidence policy, analytical lens, and delivery needs. Its durable snapshot lives in the host file. | A profile enum, a new Gate input, or a live external knowledge-pack reference. |
| **Preference** | A direction such as "prioritize primary sources" or "focus on China." It guides judgment but is not a categorical prohibition. | Permission to ignore provenance or silently lower an existing floor. |
| **Hard exclusion** | A clear user instruction such as "only use peer-reviewed studies" or "do not use vendor material." The Agent preserves that strength rather than quietly weakening it to a preference. | A mechanism that makes an unavailable or under-backed answer pass. |
| **Topic-local projection** | Model-authored `search_guardrails` or `evidence_route` guidance derived from the brief for one seed/topic. | A replacement for the original user brief or a second user-control authority. |
| **User context** | User-supplied domain background, definitions, assumptions, or internal decision criteria that scope and interpret the research. | Externally verified evidence or submitted source backing. |
| **Engine constraint** | A schema, provenance, receipt, Gate, or lifecycle rule the Engine deterministically enforces. | A semantic judgment the model or user can override in prose. |

## Confirmed Baseline

| Surface | Existing capability | Missing or important boundary |
| --- | --- | --- |
| `rb_plan.md` | It is the human/Agent-readable host file. Its `## Constraints` body is durable, survives canonical topic-state updates, and is intentionally not a Gate-owned semantic schema. Its Topic Registry and Progress sections are also currently updated by Engine helpers, while the setup gate scans the body for required-fill markers. | It has no named place or HITL1 flow for a user-authored control brief. This is the natural per-run home; adding a separate external authority would duplicate it, but captured Markdown must be isolated from Engine-owned section locators and template-marker checks. |
| Checkpoint / Progress order | A successful `setup-ready` Gate currently writes its checkpoint manifest from `writeGateAttempt()` before its caller invokes `writePlanProgress()`. Reentry treats `rb_plan.md` as a hash-checked control file. | A post-checkpoint Progress mutation can therefore look like unexplained control-file drift even though it was Engine-owned. Change 1 must make the bounded Progress write and one checkpoint agree on final plan bytes, leaving the old full plan untouched if that presentation update cannot commit. The bounded writer must report committed versus no-change to its caller rather than conceal that distinction. Durable attempt audit must precede a checked Progress claim, and `enter-phase` must reject a routed setup attempt if its required final checkpoint is absent. Because the route trace is append-only, focused exploration must prove one coherent commit/consumption boundary rather than claim a later trace can retract an earlier success. It must preserve the accepted requirement that every gate attempt has an auditable checkpoint without silently claiming one was recorded or weakening reentry drift detection. |
| HITL1 | It already aligns topic, scope, must-answer questions, profile, and research access before silent execution. It can write the narrative `rb_plan.md` body and structured `rb_profile.yaml` facts. | The retired `search_preference` is not a valid general control surface. HITL1 does not yet ask for or preserve broader user criteria for source choice, evidence judgment, and delivery. |
| Seed Topics | `search_guardrails` and `evidence_route` already give later work topic-local search guidance. | They are model-authored projections, not the original user control. They need the user brief as an upstream input and must not silently replace it. |
| Wave actors and work units | Existing role/task/seed guidance already gives actors an active bundle coordinate, topic context, and bounded work contract. The generated task can carry a Phase-authored brief without changing the Engine-owned output contract. | They do not yet have an explicit obligation to read the global user controls alongside topic-local guardrails. A read-only input coordinate in the existing task brief is enough; a new per-work-unit control schema is not warranted. |
| Engine provenance and Gates | Ledger-based `countReferences()` / `isCountable()`, source claims, cache trails, receipts, schemas, and Gate transitions establish structural facts. | Structural countability is not a semantic verdict, and user controls cannot weaken these facts. |

The direct gap is that the run has no durable, user-owned statement of the semantic criteria by which the model should conduct and judge research.

## Ownership And Authority Boundary

| Fact or action | Owner | Boundary |
| --- | --- | --- |
| Research priorities, exclusions, acceptable source/evidence policy, analytical lens, and delivery expectations | User, at HITL1 | The Agent may recommend or clarify a material ambiguity, but it must not silently substitute a model default for a clear user control. |
| Structured research profile, root must-answer set, and style parameters | The existing HITL1 decision and style-application owners | These retain their existing structured meaning. A free-text control may refine how research is conducted or presented, but it does not silently rewrite a selected profile, must-answer set, or Engine-derived style parameter. |
| Faithful per-run capture and topic-local interpretation of the controls; semantic adequacy, relevance, independence, currency, strategy, synthesis, and limitations | Model | It reads actual evidence and applies the user's criteria contextually. It does not turn free text into a fake deterministic score. |
| User-readable durable control context | Markdown host file | `rb_plan.md` is the one per-run narrative source. Its body remains Agent/human guidance, not a second machine authority. |
| Identity, schema, source/cache/receipt provenance, and accepted work-unit result | Engine | These are direct deterministic facts. User text and model judgment cannot override them. |
| New semantic/risk decision when a control conflicts materially with the intended research | User at an existing HITL placement | HITL1 resolves a known conflict before silent execution. A later discovered constraint stays visible; it uses an existing degraded/limitation/HITL2 route only where the accepted contract actually permits one, and never creates a new interactive phase. |

The boundary is deliberately short; it is not a linear rule in which Engine validation comes last and can therefore be outweighed by prose:

```text
host/security + accepted deterministic contracts
  -> define the non-negotiable legal boundary

within that boundary:
  user research controls for this run
    -> model's evidence-grounded interpretation and judgment

Engine -> reads and validates direct deterministic authority;
          it neither ranks free-text preferences nor yields its constraints to them
```

User controls are binding research direction for the Agent, not executable framework instructions. They may not ask the Agent to bypass a Gate, fabricate provenance, change a receipt, use an unavailable capability, alter host permissions, or treat a source as established without real backing. A strict source filter that leaves a question unanswered keeps the constraint visible and never justifies quietly using disallowed material; the exact limitation, degraded, HITL2, or held-checkpoint outcome remains the one already authorized by the current phase contract.

If the detailed brief materially conflicts with the selected `research_profile`, `root_must_answer_set`, or the user-visible implications of `research_style_params`, HITL1 resolves that one decision before recording both surfaces. The Agent uses the existing profile/style owner for any resulting structured change; it does not make later Seed, Wave, delegated, or Final roles choose between contradictory values, silently mutate profile fields, or reinterpret a hard Engine parameter as a free-text preference.

## Minimal Per-Run Form

### One Dedicated Host-File Subsection With Optional Controls

Add a single `### User Research Controls` subsection beneath `rb_plan.md## Constraints` for new bundles. The **user-supplied control is optional**: its normal-path form explicitly records that no additional controls were supplied. The subsection is a free-text, user-authored brief with light prompts, not a parser contract:

```markdown
### User Research Controls

- Priorities and exclusions: ...
- Source and evidence policy: ...
- Analytical lens: ...
- Delivery needs: ...
```

The headings are an affordance, not required fields. A user can give a paragraph, bullets, examples, or a concise directive in Chinese or another working language.

### Absent, Present, And Legacy Forms

There are exactly three compatibility cases. The change must make each understandable to the Agent without parsing user prose into a new machine authority:

| Case | Durable host-file form | Meaning for later Agents | Engine effect |
| --- | --- | --- | --- |
| New run, no additional controls | The dedicated subsection exists and explicitly says that no additional controls were supplied. | Use the agreed question, scope, profile, and normal model judgment. | None: no new field, Gate requirement, or alternate pass path. |
| New run, controls supplied | The subsection records one faithful, labeled user snapshot. | Read that source alongside existing task/topic guidance. | None beyond the ordinary durable host-file write path. |
| Legacy run without the subsection | The subsection is absent. | Preserve current behavior; absence means no additional control brief, not a failure or an invitation to invent one. | None; no migration or Gate blocker merely for presentation. |

The representation is intentionally human-readable rather than a parsed enum. The future change may choose the exact no-controls sentence and template placement, but it must not use an empty heading, an external file path, or a profile flag as a hidden second authority.

At HITL1, the user may state the controls directly or explicitly ask the Agent to read a local text file. The Agent records the applicable content as a faithful, labeled snapshot in this subsection. The external file is not a live runtime authority and later phases do not reread it by path. This preserves a stable, auditable per-run decision without adding `knowledge_pack_path`, a bundle-copy protocol, a home-directory default, or a separate reload surface.

### Bounded Capture And Host Boundary

A local file is a convenience for providing user guidance at HITL1, not a general ingestion, synchronization, or instruction-execution mechanism. The Agent captures only the control material the user intends for this run and for the research roles that will read the shared run brief, preserving hard exclusions and other material wording rather than silently replacing them with a lossy summary. It does not recursively read linked files, retain the external path as run state, copy unrelated private content, or treat text in the file as permission to bypass framework/host constraints.

If the user marks part of the material as non-delegable or the Agent can see that a source file mixes a small relevant control with unrelated sensitive content, it asks for the smallest shareable directive or excerpt before recording the universal brief. This does not create a per-role secrecy system: a control recorded in this host-file subsection is intentionally available to the Seed, Phase, delegated research, and Final readers named below. Claims that require undisclosed internal data continue through the existing internal-data/limitation route rather than being smuggled into a shared research instruction.

If the file cannot be read under current host permission, is too broad to identify the intended controls, or conflicts materially with the proposed work, the Agent does not invent a snapshot. At HITL1 it asks for the smallest needed clarification, relevant excerpt, or permission-dependent external prerequisite; after that it resumes the normal legal capture path. This remains part of the existing HITL1 decision surface, not a new file-upload checkpoint or a background sync loop.

### Embedded Markdown, Locator, And Template-Marker Safety

The snapshot may contain ordinary Markdown headings, lists, checkboxes, code samples, links, or literal text that resembles a template marker. That user content must remain readable without being mistaken for template-owned host-file structure, an Engine-owned update target, or an unfilled system template.

Focused exploration must choose the smallest embedding/delimiting treatment that makes the snapshot unambiguous to human/Agent readers while retaining its applicable content faithfully. A subsection heading alone is not enough: captured Markdown can itself contain top-level headings. The chosen treatment must establish a bounded user-content region that cannot join the canonical host-file layout merely by containing a familiar heading or checklist line. It may encode/quote the captured representation, or use a shared bounded scanner that explicitly skips the region; it must not rely on the first or last matching heading in the whole file. If it uses sentinel delimiters, an adversarial literal of the same delimiter inside user content must remain data rather than ending or escaping the region.

The implementation must inventory every `rb_plan.md` reader/writer that scans body text before changing the template, then identify canonical template-owned sections before scanning or mutating them. Topic Registry refresh, Progress update, and required-fill inspection are the confirmed body-sensitive paths and must use the same direct boundary/locator rule rather than three near-duplicate regex assumptions. Frontmatter-only readers remain outside this body-boundary change unless exploration finds a real body scan. This does not require a general Markdown parser, a new semantic schema, or another controller. In particular:

- a captured `## Topic Registry` heading or registry-looking table must not hijack the canonical registry refresh;
- a captured `## Progress` heading or `- [ ] setup-ready`-looking line must not be rewritten by a gate-pass progress update;
- a captured `## Decisions` heading remains ordinary user content and cannot be mistaken for the template-reserved Decisions section. Change 1 does not add a Decisions writer; any later Engine writer must use the same bounded locator rather than a new whole-file heading search;
- literal `(待填充` / `(尚无话题` text from the user must not create a false `setup-ready` failure.

Prefer narrowing the existing host-section and template-marker interpretation to template-owned structure over escaping, rewriting, or semantically parsing user content. This is a false-positive reduction in existing write/check paths, not a new semantic Gate or a second Markdown authority. It does not promise that the user brief has an OS-level sandbox: the role's existing bundle access model remains the actual enforcement boundary.

The existing `plan_body_non_empty` check is intentionally a whole-body minimum, not a Goal/section-completeness validator. A captured brief must not be described as proof that research intent was recorded, but Change 1 also must not turn this narrow existing check into a new structural Goal Gate merely because a user-content region now exists. The scoped work is the false-positive-prone locators and required-fill scan above.

### Preserve Control Strength

The Agent records the user's modality faithfully. "Prefer," "avoid where possible," "only," "must," and "do not use" are materially different instructions:

- A preference guides selection and comparison but does not authorize the Agent to manufacture a categorical exclusion.
- A clear hard exclusion remains a hard research boundary until the user revises it; the Agent does not silently relax it just to meet an existing source floor.
- If the wording is materially ambiguous and the difference changes scope, expected cost, or the likelihood of answering a must-answer question, HITL1 asks one compact clarification. It does not turn an ordinary preference into a blocking form field.

### One Host-File Source, Existing Local Projections

`rb_plan.md## Constraints` is the one per-run host-file control source. Its existing language, time, geography, method, and source-preference bullets remain concise human-readable summaries. `### User Research Controls` carries the canonical detailed user wording when it exists. If a summary and the detailed subsection overlap, the subsection governs the user's supplied detail; HITL1 either aligns the summary to it or asks one minimal clarification before recording. Later phases do not invent a different precedence between two conflicting lines. A legacy bundle without the subsection keeps the existing summaries as its only available guidance.

The subsection is a durable part of the host-file body, not an immutable sidecar. Any current sanctioned topic-state apply may rewrite plan frontmatter and refresh the standard Topic Registry projection, so Change 1 must prove that such a staged write preserves the subsection byte-for-byte unless an explicitly authorized writer changes it. A current rerun retains the prior snapshot by default. A later replacement is legal only if focused exploration identifies an existing sanctioned host-file mutation associated with a recorded user decision; otherwise the user starts a new run. A Phase Agent has no sanctioned mutation path for editing it merely for a more convenient research strategy. The change must not bypass topic-state ownership by direct-editing canonical frontmatter or introduce a second mutable controls file.

When controls are supplied, the detailed subsection is the original free-text control surface; existing seed fields remain useful as topic-local projections:

- Seed Topics read the original brief and make relevant scope, source, and evidence implications visible through existing `search_guardrails` and `evidence_route`.
- Phase Agents read the original host-file subsection as well as their assigned seed/task guidance. The Phase Agent names the read-only bundle-relative `rb_plan.md## Constraints > ### User Research Controls` input coordinate in every affected research task's existing `task_brief`; the delegated actor resolves `rb_plan.md` from `_beacon.json#bundle_dir` and reads that coordinate before research. The pointer, not a copied control payload, travels with the task. The task states that this is research guidance only: the assigned role, task, direct-output, result, receipt, and lifecycle contracts remain the actor's execution boundary. “Read-only” describes the task contract and does not assert a new OS-level restriction on a role that otherwise has broader bundle access.
- Final reads the same original subsection for report form and for candid treatment of any control-induced limitation.

For the explicit no-controls form, Seed, work-unit tasks, and Final retain their current question/scope/profile guidance. They do not gain a copied empty payload or a new obligation to read the subsection merely to discover that no extra controls exist.

Do not create a `user_controls` field in every seed, queue item, manifest, result, finding, or profile. Do not serialize a new copy into each work-unit task merely to make it easy to test. The active bundle already supplies the stable path; the existing `task_brief` may name the one read-only host-file input coordinate without adding a queue-payload or manifest **schema field**, changing the task's Engine-owned assignment contract, or creating a new allowed-write authority.

This is an instruction-level input coordinate, not a new filesystem permission grant or sandbox. The existing role, declared-output, and Engine validation boundaries remain the enforcement mechanism. Focused exploration must verify that the selected role guidance and generated task can perform this one beacon-rooted read under the host's actual actor filesystem permissions. If a real actor cannot read the coordinate, the proposal must identify that concrete capability gap and stop; it must not silently duplicate the text into a manifest/result, relax the role's existing output contract, or assume the actor's current working directory is the bundle root.

### Lifecycle Contract To Prove

This table is a proposal admission requirement, not a claim that every writer path already exists. It keeps the host-file brief from becoming an unowned mutable preference system.

| Fact | One source and initial writer | Readers | Retention / replacement rule |
| --- | --- | --- | --- |
| Additional user controls or normal-path absence | `rb_plan.md## Constraints > ### User Research Controls`; the HITL1 Agent records it after the user's decision or bounded file capture. | Seed, Phase, delegated research actor through the beacon-rooted input coordinate, and Final. | Ordinary phases preserve it. Existing topic-state rendering may refresh canonical frontmatter/Topic Registry and gate progress updates may refresh their owned checklist, but neither has a sanctioned reason to reinterpret, select, or alter the captured body subsection. |
| Later material change to controls | The same host-file subsection, never a second file/path/profile field. | Same readers after the legal mutation. | Only an already authorized, recorded user-decision path may replace it. Change 1 exploration must name that writer or declare a new run as the lawful route; silent waves have no writer. |
| User context used in research | The same human-readable subsection, but never evidence authority. | Model/Agents as context only. | It cannot become source, cache, receipt, or finding backing; private-data dependence uses the existing Wave2/HITL2 route where applicable. |
| Engine-owned host-file update | The existing topic-state writer or gate-progress writer, each limited to its template-owned region. | The next checkpoint/reentry reader consumes the final host-file bytes. | The writer/checkpoint path must leave one coherent final plan hash. A checked Progress update is committed only with durable attempt audit and a checkpoint over those final bytes, or the old full plan remains intact with no successful Progress claim. If the final checkpoint fails, `enter-phase` must not consume the route-bearing `check.next`; Change 1 must prove a single existing commit/consumption path for that outcome rather than add a drift exemption, a parallel checkpoint, or an assumed trace rollback. |

### User Context Is Not Evidence

The brief may contain domain definitions, internal priorities, a decision threshold, or facts the user believes are true. The model can use these to frame questions, select lenses, or identify what must be verified. It must not cite them as externally established facts or let them satisfy source, cache, receipt, or finding-backing requirements.

When a claim actually depends on private or internal information, the Agent uses the existing `requires_internal_data` / limitation / HITL2 semantics where applicable. It does not copy the claim into a research artifact as if it had public provenance, and it does not create a separate internal-data subsystem in Change 1.

### Conflict And Change Handling

- During HITL1, when a clear control materially conflicts with the proposed scope, must-answer set, selected profile/style implication, or expected cost, the Agent explains the direct conflict and asks for the smallest necessary user choice before recording it through the existing owners.
- During silent waves, the Agent does not reopen HITL1 or silently edit the control brief. It preserves the constraint and uses an existing explicit limitation, degraded handoff, or HITL2 route only when that phase's accepted contract admits it; otherwise it holds at the current failed checkpoint rather than silently widening scope or claiming an invented exception.
- A later material change is not a generic mutable-preference API. It uses an existing HITL2/rerun decision or starts a new run, subject to whatever mutation authority that lifecycle already grants.

## Candidate Change 1 Contract

### Minimal Behavioral Outcome

1. HITL1 includes one compact optional invitation for research controls as part of the normal alignment conversation. It does not add a separate question round or required answer.
2. The accepted content is recorded in `rb_plan.md## Constraints > ### User Research Controls`; a new run with no extra controls records the normal-path form, while a legacy bundle without the subsection remains valid. `rb_profile.yaml` continues to hold only its existing structured profile/checkpoint facts.
3. A user may offer controls as normal conversation or explicitly point to a local file at HITL1. The recorded host-file content is the durable run snapshot; there is no live external reference after capture.
4. Sanctioned topic-state/HITL1/rerun plan writes retain the recorded subsection. A later replacement is allowed only through an exploration-identified, already authorized user-decision writer; otherwise the lawful route is a new run. Silent waves have no sanctioned mutation path for it. Existing Engine-owned Topic Registry and Progress handling, and required-fill inspection must operate only on their canonical template-owned locations, never on heading- or checkbox-shaped user content in the subsection. `## Decisions` remains template-reserved narrative with no new Change 1 writer; its locator is included only so captured content cannot masquerade as it if a later accepted change writes there. The proposal must also correct the current setup-ready ordering as one coherent attempt: durable audit precedes any checked Progress claim; the bounded writer reports committed versus no-change; the one checkpoint hashes the actual final `rb_plan.md` bytes; and `enter-phase` cannot consume a routed pass whose required final checkpoint is absent. The exploration must name the one existing commit/consumption path that enforces this outcome; it must not assume an append-only trace can be rolled back. A failed Progress update leaves the old plan and no successful Progress claim. The change must not solve either case by exempting `rb_plan.md` from drift checks or adding a parallel checkpoint.
5. Seed Topic authoring reads the original brief and reflects relevant topic-local implications in existing `search_guardrails` and `evidence_route` without inventing user preferences that were not supplied.
6. When controls are supplied, search, deepening, cross-topic, and Final guidance tell their Agents to read the one host-file subsection alongside existing topic/task guidance. For delegated work, the Phase Agent may name one bundle-relative, beacon-rooted, read-only input coordinate in the existing task brief; it informs source selection, evidence treatment, analysis, and presentation, but never creates assignment/lifecycle/write authority. The explicit no-controls form retains the current task guidance without a copied empty payload or an added read requirement.
7. A clear conflict with scope, must-answer, or profile/style meaning is handled at HITL1 through the existing structured owner; a later infeasibility follows only an existing lawful limitation, degraded, HITL2, or held-checkpoint route. Neither case creates a new controller, Gate, or generic update channel.

### Likely Change Surfaces

- the `rb_plan.md` template and accepted host-file/HITL1 behavior specs;
- every confirmed body-sensitive `rb_plan.md` reader/writer, including the existing Topic Registry/Progress locators, template-reserved Decisions locator convention, and required-fill-marker interpretation, only where it would otherwise mistake embedded user content for template-owned structure;
- HITL1 brief and phase guidance;
- seed-topic authoring guidance and the existing Wave0/Wave1/Wave2/Final Agent-facing surfaces;
- existing work-unit role/task guidance only where it must allow the Phase Agent to name the host-file subsection as a read-only input coordinate in the current task brief.

No `PlanSchema` frontmatter field, `ProfileSchema` field, new queue-payload or manifest schema field, new CLI, new Gate rule, Goal-completeness check, or Engine evaluator should be added unless focused exploration proves that the existing bundle-local guidance route cannot deliver the one original source **or** cannot preserve it through an existing sanctioned plan mutation. The already supported `task_brief` is not a new field. Any claimed need for more must name the concrete actor or sanctioned writer that fails, the exact missing ability, and why the existing host-file/body-preservation route fails.

The same exploration must run one deliberately strict source-policy case against the existing Wave0/Wave1 floors. It must identify the exact failing rule and determine whether the current accepted degradation contract, a later Wave2 limitation, or a HITL1 scope/profile clarification is the lawful route. Change 1 must not lower a floor, add a user-control exception to a Gate, or claim that any prose limitation makes a failed source floor pass.

### Verification Shape

- A new run with no additional controls and a legacy run without the subsection both follow today's normal path and acquire no new Gate requirement, structured state field, or presentation-only migration.
- A focused HITL1 conflict case proves that a materially incompatible brief and profile/style or must-answer decision are resolved through the existing HITL1/profile-style path before silent work begins; later roles never choose an implicit winner or mutate structured profile facts from prose.
- A focused host-file mutation case proves the subsection survives a legal topic-state/HITL1 or rerun plan rewrite unchanged unless the same authorized user decision changes it; a silent-wave actor has no sanctioned writer for it. A summary/detail disagreement is either aligned at HITL1 or surfaced as the one necessary clarification, never left for later roles to resolve by inventing precedence.
- Focused negative host-file cases prove embedded `## Topic Registry`, `## Progress`, and `## Decisions` headings, a registry-looking table, a gate-checkbox-looking line, and any chosen delimiter literal cannot redirect the corresponding canonical Engine update or escape the captured region. Literal `(待填充` / `(尚无话题` text inside a captured brief cannot create a false template-marker failure. The check remains strict for actual template-owned required-fill positions.
- A focused reentry case proves that any checked setup-ready Progress line and the one latest checkpoint agree with actual final `rb_plan.md` bytes, while durable attempt audit precedes that claim; an out-of-band later edit still produces the existing drift finding. A Progress-write failure leaves the old full plan intact, reports no successful Progress claim, and lets the one checkpoint describe only actually committed bytes. A checkpoint-write failure leaves no consumable setup handoff: `enter-phase` rejects its `check.next` through the one explored commit/consumption boundary, rather than relying on a fictional trace rollback. A failed or non-durable Gate attempt must not leave a misleading checked Progress line.
- A disposable real Agent-flow run with a source/evidence exclusion and a report need shows the brief available at Seed, delegated search/deepening, and Final. The delegated task names one beacon-rooted read-only input coordinate, and real actor behavior demonstrates that it can read the coordinate without copying the control text into its result or a new manifest field, while staying within its existing declared output contract. Instruction-looking text inside the brief cannot replace the actor's task, output, receipt, or lifecycle contract. The model's semantic compliance is assessed from real output, not a mocked semantic checker.
- A focused local-file input case proves that an unreadable or materially ambiguous file does not create a fabricated snapshot, live path, or silent fallback; HITL1 exposes only the smallest required clarification or external prerequisite.
- A deliberately infeasible strict control preserves the exclusion and follows the exact existing lawful outcome identified by exploration: an eligible degraded handoff, a later explicit limitation/HITL2 route, or a held checkpoint. It never silently falls back to prohibited material or lowers a source floor.
- Focused deterministic checks, if a template or durable write path changes, cover only the direct file/ownership invariant. They do not pretend to prove whether a model semantically respected prose.

## Wave0 Boundary

Change 1 intentionally lets Wave0 receive the user control as search/evidence guidance. It does **not** add Wave1-style question adequacy, target binding, or a new state machine to Wave0 merely for uniformity.

Question-handoff work begins at Wave1 to Wave2. Revisit Wave0 only if a real run shows a material must-answer question disappearing before Wave1 can author and classify it. No such failure is currently known. The Wave1-to-Wave2 contract is detailed in [Change 2](03-question-closure-and-model-judgment.md).
