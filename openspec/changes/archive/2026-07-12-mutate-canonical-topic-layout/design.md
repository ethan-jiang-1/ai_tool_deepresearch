## Context

C3A 已建立 `rb_plan.md#/topic_registry`、immutable `topic_uid`、UID-bound seed、一个 `operate-topic-state.mjs inspect|apply|recover` CLI 与一个只拥有 plan+listed seeds 的 crash-safe workspace。它刻意冻结既有 `id/slug`，因为 queue、work-unit snapshots、wave gates 与历史 artifact/reference paths仍直接使用slug。

初稿C3B试图把rename扩张为 artifact/reference directory move、structured metadata/link rewrite与ledger path translation。对当前系统而言这是错误方向：历史output path是当时真实provenance坐标，移动它们会迫使Engine理解所有Markdown/YAML/link owner，并把一个topic rename变成通用filesystem migration。长期两条Evolution Directions要求相反的形状：保留直接事实、减少控制面、让Agent执行明确机械步骤，而不是用更多迁移状态模拟可靠性。

本设计因此把“layout”严格分成两类：

```text
current layout projection
  = rb_plan current id/slug + current UID-bound seed + future queue binding

historical provenance coordinate
  = previously accepted slug/path embedded in immutable queue/work-unit/output facts
```

C3B只原子修改第一类；第二类保持原位，通过一个纯UID resolver继续被gate/inspect识别为同一topic。

## Goals / Non-Goals

**Goals:**

- 保持`topic_uid`不变，在一次完整target中rename、reorder/renumber，并安全移除从未开展且无依赖的topic。
- 让`rb_plan.md`保存最小previous-layout lineage，使旧slug能唯一绑定同一UID。
- 复用现有topic-state helper、CLI、plan+seed workspace、rerun authorization与explicit recover。
- 让queue、work-unit provenance、wave gate、file observability与reentry共用一个纯resolver，删除各自近似slug判断。
- 保持历史artifact/reference/output files与immutable ledger/receipt/work-unit bytes不变，同时允许它们继续满足同UID的历史coverage。
- 用户只决定目标title/order/remove语义；Agent负责drain、retained input、apply/recover/style/audit；Engine只做确定性schema/UID/CAS/path/verdict。

**Non-Goals:**

- 不开放post-final fresh mutation、arbitrary maintenance、state jump或human override；这些属于C5。
- 不删除有queue/work-unit/ledger/artifact/reference历史的topic，不新增retired lifecycle、tombstone registry或active-filter状态树。
- 不移动、复制、重命名或改写历史artifact/reference/final/output files，不重写其index/link/frontmatter来追随current slug。
- 不给work-unit result或submitted ledger新增重复topic字段；topic binding来自queue item及其immutable work-unit snapshot。
- 不自动猜title/slug stem/remove intent/conflict winner，不建立alias file、symlink、resolver cache、watcher、daemon、lock service或通用transaction framework。

## Decisions

### 1. Registry owns current layout and minimal historical slug lineage

Canonical topic entry增加可选、默认空的`previous_layouts[]`：

```yaml
topic_uid: tp_...
id: "02"
slug: 02_current-stem
title: Current title
must_answer: [...]
scope_role: primary
depends_on_topic_uids: []
previous_layouts:
  - id: "03"
    slug: 03_old-stem
```

Current `id/slug` 是唯一可创建新work和current seed的layout。`previous_layouts`只保存immutable历史records曾使用、且无法从current registry重建的旧coordinate；不保存title、path inventory、progress、gate verdict、timestamp或workspace state。

Schema invariants：

- existing C3A current `id/slug` validation remains backward-compatible; C3B SHALL NOT make a previously accepted canonical plan unreadable merely because its current coordinates predate normalized `NN_<stem>` output；
- current + previous slug在整个registry内全局唯一，因此任一accepted slug只解析到一个UID；
- previous entry不能等于该topic current layout，重复history去重/拒绝；target若恢复该UID自己的旧coordinate，builder SHALL从history移除该coordinate并把被替换的current coordinate追加进history；
- `derived_topic_count`继续等于registry length。

不按historical `id`单独解析topic，因为ordinal可在不同slug上重复使用；唯一兼容key是full slug或UID。

### 2. One complete target avoids an imperative rename state machine

`operate-topic-state apply --input <retained-json>`增加与C3A actions互斥的完整target：

```json
{
  "context": "rerun",
  "action": "mutate_layout",
  "expected_plan_sha256": "...",
  "topics": [
    {"topic_uid": "tp_a", "title": "...", "slug_stem": "..."},
    {"topic_uid": "tp_c", "title": "...", "slug_stem": "..."}
  ],
  "remove_topic_uids": ["tp_b"]
}
```

`topics[]`顺序即final order；Engine生成continuous id与`NN_<slug_stem>`，这是layout operation的输出不变量，而不是对所有pre-C3B canonical plans的global read gate。每个current UID必须恰好出现在retained或remove集合，不能新增UID，不能混`migrate_legacy|add_topic|update_intent`。`expected_plan_sha256`直接复用inspect读取的完整`rb_plan.md` bytes hash，不另建registry canonicalization/hash规则。若final slug等于同UID某个previous slug，Engine将其提升为current并轮换history；若命中另一UID的current/previous slug则阻断。Title/slug/order/remove是用户语义；Agent从已记录HITL2 rationale构造target，只有真正歧义才回问用户。

Inspect SHALL derive a copy-ready slug stem only when removing an optional numeric prefix is lossless under the accepted stem grammar. Otherwise it SHALL mark that entry `slug_stem_required` instead of silently normalizing an arbitrary legacy coordinate; Agent supplies the missing semantic stem and asks the user only if it cannot be inferred from recorded intent.

Engine SHALL diff current and final registry to compute `affected_topic_uids`: removed UIDs plus retained UIDs whose current id, slug or title changes. Quiescence and seed mutation checks apply only to this set. A complete target does not make every listed unchanged topic affected, so unrelated active work is not blocked.

After rendering the final plan body projection and seed set, if every staged target already equals current bytes and `cleanup_files[]` is empty, apply SHALL return `verdict: unchanged` without workspace creation or follow-up. A stale recognized Topic Registry body table is a real staged plan projection change and MAY be repaired even when registry authority is otherwise unchanged.

完整target让Engine只验证final state，不需要解释rename→remove→renumber的命令顺序或暴露中间layout。

### 3. Fresh mutation reuses only the sanctioned rerun authority

`mutate_layout`只在C3A已定义的route-bound HITL2→rerun witness及`hitl2_recorded → rerun_ready` incoming window中允许。HITL1在首次add apply前直接形成正确初始order，无需第二次layout pass。Post-final、maintenance invocation、caller context或`human-directed`字符串都不能授权。

Prepared manifest继续记录原始authorization facts；exact `recover`可在lifecycle drift后完成已接受bytes，但不能接收新layout语义。没有新permission token、session mode或authorization evaluator。

### 4. One pure resolver maps UID, current slug and previous slugs

在topic-state helper旁提供一个窄pure evaluator，输入canonical registry，输出：

- `current_by_uid`；
- `uid_by_current_slug`；
- `uid_by_any_slug`（current + previous）；
- `accepted_slugs_by_uid`（current first, previous in stored order）；
- structured helpers that resolve queue/work-unit topic binding and a topic-bearing relative path to `{topic_uid, recorded_slug, current_slug, historical}`。

Resolver只识别UID和accepted structured slug fields；path consumer继续使用其现有accepted path/metadata parser提取slug后调用resolver。它不读取chat、run.log或Markdown自由文本，不用`JSON.stringify().includes(slug)`，不缓存、不写盘，也不建立新的path grammar层。

消费者规则：

- new enqueue只接受current slug；Engine确定性解析并写`payload.topic_uid + payload.topic_slug`。Caller若提供UID必须匹配，但缺省UID不要求Agent手工补。Legacy lineage-only slug可读但不能作为new C3B binding。
- work-unit manifest已有immutable `queue_item` snapshot，因此无需给result/ledger增加topic字段。
- submitted ledger通过`work_unit_ref`读取manifest queue-item binding；legacy snapshot只有slug时经`uid_by_any_slug`解析。
- wave gate/file observability按UID枚举accepted slugs，把历史path留在原地并归到同一topic。

### 5. Historical content paths remain immutable provenance coordinates

Rename/renumber后：

```text
registry current slug      -> new slug
current seed path          -> new slug
future queue/output path   -> new slug

old artifact/reference path -> unchanged
old ledger/result path       -> unchanged
old Markdown/YAML link       -> unchanged and still valid
```

这不是“双重current layout”。历史path只有provenance/read coverage角色，不能enqueue新work，也不能从filesystem反向创建topic。Gate对一个UID聚合所有accepted slugs下的已提交coverage；diagnostics同时显示recorded slug与current slug，避免用户误以为历史path应手工搬迁。

选择不搬迁的理由：

- 保持ledger/result path真实且无需翻译到不存在的“新等价文件”；
- 不需要扫描/改写wave2 finding index、dossier link、reference index或任意prose；
- crash transaction仍局限plan+seed，而不是升级为content migration controller；
- 多次rename只增加小型registry lineage，不复制content或建立symlink alias树。

### 6. Queue binding becomes UID-current-slug without schema proliferation

Queue item `payload`已是accepted structured object。本change规定new topic-scoped enqueue由Engine固化：

```json
{"topic_uid":"tp_...","topic_slug":"02_current-stem"}
```

Agent/task card只需提供current slug；Engine从canonical registry解析UID并写入payload。若caller已提供UID或lineage也携带topic fields，它们必须匹配。Queue schema version不变；Work-unit claim已经snapshot完整queue item，因此DEW integration只增加deterministic validation/reader，不给manifest index/result/ledger复制新字段。

Layout apply prepare前要求affected UID无active/refill queued/running item、delegated_in_flight、claimed/nonterminal work。Agent通过现有owner drain、submit、repair或terminalize后重跑同一apply；topic-state helper不写queue/work-unit。

### 7. Safe remove is intentionally narrow

Remove UID必须同时满足：

- 无active或terminal queue record；
- 无work-unit index/manifest/result/ledger binding；
- 无submitted output declaration；
- 无accepted artifact/reference fact under any accepted slug；
- 无其他topic dependency指向该UID。

If any existing record is explicitly topic-scoped but cannot be uniquely resolved to a UID through structured binding, safe remove SHALL fail closed with `remove_history_unresolved`; absence of resolvability is not proof of absence.

Seed是registry projection，不算historical fact，可由transaction删除。Trace/run.log中的诊断叙述不单独阻止safe remove，也不创建topic authority。

任一事实存在即在workspace前返回`remove_has_history`或`remove_has_dependents`。C3B不引入retired state来绕过删除语义；有历史topic只能rename/reorder，不能remove。

### 8. Existing workspace stays plan+seed only

`mutate_layout`沿用一个workspace和durable `prepared.json`。Manifest继续只拥有complete file replacements，并增加一个窄`cleanup_files[]`用于hash-bound删除superseded/removed seed files；不增加directory move或generic path operation。

Layout commit顺序：

1. stage final `rb_plan.md`和所有new/current seed bytes；
2. durable publish prepared manifest，包含expected/staged hashes、authorization、input digest与cleanup seed expected hashes；
3. create/replace new/current seed files；
4. replace `rb_plan.md` last；
5. delete only listed old seed files whosehash仍匹配expected；
6. fsync parents and cleanup workspace。

Before prepared publication, each seed target SHALL be classified exactly: replacing the same UID's existing current path is allowed; a new current path must be absent; any pre-existing non-current target, symlink, directory, cross-UID seed or unexplained orphan at that path SHALL block. Cleanup sources SHALL be current seed paths proven to bind the affected/removed UID and SHALL record their exact expected hash.

显式recovery table：

| Direct fact | Recover action |
|---|---|
| target matches expected-old | write exact staged replacement |
| target matches staged-new | treat replacement complete |
| cleanup seed matches expected-old | delete exact seed |
| cleanup seed absent | treat cleanup complete |
| any target matches neither accepted form | block without overwrite/delete |
| all entries complete | cleanup workspace and report committed |

Accepted workspace存在时enqueue、topic gate与reentry优先返回exact recover，短路临时extra/missing seed噪声。Recovery只roll forward，不建设自动rollback tree。

`rb_plan.md## Topic Registry` table remains a non-authoritative projection. The existing plan renderer SHALL refresh the standard table from the final registry in the same staged plan bytes when the recognized section/table shape is present. If the body is missing or non-standard, apply SHALL preserve it and return one advisory; presentation drift SHALL NOT block or create another parser authority.

### 9. Gates and diagnostics aggregate by UID, not by one current slug

Wave gate evaluator读取current registry并为每个UID取得`accepted_slugs`：

- current seed/gate materialization仍只要求current slug；
- historical Wave0/Wave1 artifact/reference/ledger coverage可位于任一accepted slug；
- new rerun work只写current slug；
- coverage必须由existing submitted provenance owner证明，previous slug本身不授予authority；
- 同一physical output不得因current+previous匹配被重复计数。

Accepted slugs form an OR-set for one UID, not separate mandatory targets. A gate rule that requires one artifact/reference for a topic SHALL evaluate the aggregate submitted coverage across that UID's accepted slugs; it SHALL NOT require one artifact per historical alias. Likewise, file observability SHALL NOT synthesize missing expected paths merely because a previous slug exists.

File observability与reentry复用同一resolver。Accepted workspace是primary root；clean state下old path标记为historical layout，而不是orphan、新topic或待rename错误。

### 10. Responsibility and net-simplification review

最短合法闭环：

```text
registry + direct queue/work-unit/submitted/path facts
  -> operate-topic-state inspect/apply
  -> one active-owner, remove-history, collision or exact-recover action
  -> Agent performs the legal mechanical action
  -> rerun same apply/recover
  -> existing style owner only when count changed
  -> inspect/audit
```

Apply target manifest必须证明：

| Surface | Irreplaceable truth | Complexity removed/avoided |
|---|---|---|
| `previous_layouts[]` | immutable records曾使用的UID slug | 避免ledger rewrite、content move、symlink alias、second registry |
| complete `mutate_layout` target | 用户明确的final order/title/slug/remove | 避免imperative action state machine与Engine猜意图 |
| one pure resolver | current/previous slug到UID的唯一解释 | 合并queue/progress/gate/observability的近似slug判断 |
| `cleanup_files[]` limited to seeds | exact removal of superseded current projections | 避免generic move/delete transaction与path inventory |
| queue-item UID/current slug binding | future work stable identity | 复用现有payload+manifest snapshot，不扩result/ledger schema |

责任边界：用户只决定新layout语义或真正冲突；Agent自行drain owner、写retained target、运行apply/recover/style/audit；Engine验证schema、UID、owner、hash与lifecycle。没有permission或capability时明确block，不能把用户坚持解释成override。

## Risks / Trade-offs

- [历史目录名不随current slug变化] → Inspector明确显示historical/current映射；gate按UID聚合，避免把展示整齐置于provenance真实性之上。
- [Previous lineage持续增长] → 只记录coordinate实际变化并去重；不保存time/title/path inventory。
- [Gate需要枚举多个accepted slugs] → 一个resolver返回bounded list，所有消费者复用；禁止每个gate自写fallback。
- [Legacy work-unit snapshot缺UID] → 仅当structured slug唯一命中current/previous时兼容；ambiguous即fail-closed，不猜全文。
- [Safe remove不能删除已有研究topic] → 明确保留provenance优先；retirement若未来确有需求另走OpenSpec。
- [Crash后短暂存在old+new seed] → accepted workspace优先阻断并给exact recover；plan+seed以registry-last顺序roll forward。

## Migration Plan

1. 增加schema-compatible`previous_layouts`与pure resolver，锁定current/previous唯一解析。
2. 让new enqueue写UID+current slug，并让work-unit/submitted readers从queue snapshot解析；删除C3A serialized substring fallback。
3. 扩展topic-state complete target与seed-only cleanup manifest，实现registry-last exact recover。
4. 接入wave gates、seed gate、file observability、reentry、rerun与style follow-up，删除重复slug判断。
5. 用真实disposable bundle证明rename+renumber、历史coverage原位有效、mid-seed crash/exact recover、safe remove与ambiguous legacy no-write。
6. 更新backlog和version `v0.26`。Rollback仅在无accepted workspace时回退runtime code；已写入的previous lineage保持可读，不删除历史。

## Open Questions

None. Historical topic retirement、post-final mutation与generic authorized repair明确不由C3B解决。
