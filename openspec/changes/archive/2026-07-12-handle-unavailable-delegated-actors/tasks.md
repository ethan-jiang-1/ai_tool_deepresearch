## 1. Governance And Characterization

- [x] 1.1 登记 `DEW-016`、`DEW-017`、`DEW-018`、`AGQ-024`、`RWP-019`、`SRL-006` 到 `openspec/governance/req-registry.yaml`。Done condition：归入既有 capability 组、ID/描述唯一、按数字序排列、proposal/spec/tasks一致。
- [x] 1.2 为 `DEW-016` 建立 actor decision characterization。Done condition：锁定`queue-front homogeneous role preview → preflight → claim transaction`边界，证明unknown/unavailable/role mismatch必须在work ID、batch counter、trace-invalid-input、queue/index/workspace mutation前短路。
- [x] 1.3 为 `DEW-017`/`DEW-018` 建立kind policy与actor provenance characterization。Done condition：锁定三种current kind→role mapping且均允许single fallback、unknown/default prohibited；manifest/index为direct authority，beacon/receipt/result/ledger/inspect为必要projection/binding，agent/runtime refs保持diagnostic-only。
- [x] 1.4 建立pre-v0.25 legacy claimed/submitted fixtures。Done condition：legacy index record/manifest/beacon/receipt/result/ledger可读，claimed可submit但统一truthful投影`legacy_unrecorded`；不得猜成delegated或授权new claim/fallback。
- [x] 1.5 建立recursive authority snapshot helper/fixture复用。Done condition：no-claim只允许既有trace/run.log诊断变化；queue/index/work-unit dirs/ledger/status/profile/plan/topic/artifact/cache/reference/final及bundle外零mutation。

## 2. Actor Decision Schema And Evaluator

- [x] 2.1 实现 `DEW-016` actor observation/execution Zod schemas。Done condition：source仅`native_probe|not_observed`，closed matrix覆盖available success、四种classified unavailable、not-observed与probe-inconclusive；无host-report/duplicate surface/raw error/account secret/balance字段。
- [x] 2.2 扩展existing kind contract并实现单一actor decision evaluator。Done condition：三种current kind绑定exact delegated role且允许single fallback、unknown默认prohibited；evaluator按observation/role/policy/actor组合得到`allow_claim|no_claim|invalid`与一个最近动作；pure evaluator无I/O/clock/queue knowledge。
- [x] 2.3 实现`work-unit.actor.v1`与legacy work-unit/ledger compatibility unions。Done condition：new index record/manifest/beacon/result/receipt/ledger带discriminator，agent/status不变；legacy完全缺discriminator并只投影`legacy_unrecorded`；无index/container migration。
- [x] 2.4 验证actor schema/evaluator。Done condition：覆盖全部closed matrix、inconclusive不触发fallback、role mismatch、fallback allowed/prohibited/default-deny、secret/raw-error rejection、byte-stable JSON、legacy read与new strictness。

## 3. Claim Preflight And Queue Containment

- [x] 3.1 实现read-only claim preview并接入`claimWorkUnits()`最前端。Done condition：normal最多preview requested count的valid homogeneous role/policy prefix；fallback从开始只preview queue-front单项；无eligible demand保留existing empty behavior；preflight在open batch/counter/work ID/queue/directory前且无unguarded path。
- [x] 3.2 实现no-claim structured result并复用existing claim trace/log events。Done condition：输出actor preflight facts、`claimed_count: 0`、stable reason/action；success/reject events追加normalized fields，无new event family，且reader不把trace当future authority。
- [x] 3.3 实现allowed claim actor binding。Done condition：normal复用existing bounded capacity；fallback仅在kind policy允许时复用同一transaction并强制effective count 1；每个record接收同一validated actor object，无second allocator/counter。
- [x] 3.4 实现 `AGQ-024` queue containment。Done condition：unknown/unavailable/prohibited no-claim不改变active/refill/in-flight/terminal/batch/pending语义；mixed role只授权homogeneous prefix；不新增queue field/pool/priority。
- [x] 3.5 验证claim preflight/mutation boundary。Done condition：覆盖1/5-item doomed batch、missing→unknown、available normal batch、unavailable allowed/prohibited、available fallback reject、fallback count 1、mixed roles、role mismatch、historical trace ignored与recursive zero-mutation。

## 4. Fallback Envelope And Actor Provenance

- [x] 4.1 实现 `DEW-017` fixed actor object authority/projections。Done condition：manifest/index exact cross-check closed object（class/role/observation/policy/fallback_from）；beacon/inspect projection；agent/status不变；actor class immutable；queue snapshot保留intended sub-agent target。
- [x] 4.2 更新spawn/task continuation。Done condition：`delegated_subagent`继续输出role-matching native spawn prompt；`phase_agent_fallback`明确由Phase Agent执行单个同一task/beacon并在submit/terminalize后再claim；runtime refs仅diagnostic且不参与actor verdict。
- [x] 4.3 实现 `SRL-006` receipt actor binding。Done condition：new receipt仅带actor contract version+exact class、不重复observation；missing/conflicting在submit mutation前拒绝；legacy只走compat path。
- [x] 4.4 实现 `DEW-018` result/ledger actor provenance。Done condition：result只带version/class binding，ledger从Engine record保存full snapshot；inspect区分queue intended与actual normal/fallback/legacy actor，不持久化raw host error或秘密。
- [x] 4.5 扩展dry-submit/formal submit conflict validation。Done condition：actor mismatch不写queue/index/status/result canonicalization/ledger；修正后同一claimed attempt可重试。
- [x] 4.6 实现legacy claimed/submitted compatibility。Done condition：legacy claimed可inspect/submit，existing/new legacy ledger均投影`legacy_unrecorded`；legacy与actor-aware records同index共存且无container migration；new normal/fallback不得降级。
- [x] 4.7 验证fallback/provenance。Done condition：normal/fallback submit、result/receipt mismatch、runtime refs不影响actor verdict、missing result/receipt、legacy claimed submit、legacy submitted read、no actor fabrication、post-submit hash/audit与authority snapshot全部PASS。

## 5. CLI And Agent Guidance

- [x] 5.1 扩展 `operate-work-unit claim` 显式actor参数与usage。Done condition：无env/default-available/force/auto-fallback；0/1/2或既有CLI约定稳定；所有actor fields进入structured stdout。
- [x] 5.2 更新work-unit inspect/claim output。Done condition：Agent无需读源码即可看到actor class、observation、preflight verdict与一个最近动作；无多路线恢复树。
- [x] 5.3 实现 `RWP-019` Wave0/Wave1/Wave2 phase guidance。Done condition：先inspect planned role并做one bounded matching observation，再normal batch/single fallback/no-claim；禁止claim一批测试availability或跨role复用probe；不降evidence floor。
- [x] 5.4 更新shared subagent protocol与role surfaces。Done condition：fallback是work-unit actor且必须submit；zero-progress classified spawn failure固定`fail actor_spawn_unavailable → fresh probe → new claim`；progress-positive继续inspect/repair/timeout-preflight；无fail/abandon猜测或in-place fallback。
- [x] 5.5 更新`DPT_FRAMEWORK/COMMANDS.md`与一个work-unit actor decision playbook。Done condition：copyable normal、unknown、unavailable fallback、later recovery命令；普通机械执行由Agent完成，用户只处理不可代理host/account/permission。
- [x] 5.6 增加helper-oriented/static responsibility regression。Done condition：删除one-action、Agent-owned fallback execution、Engine verdict或`human-directed` non-permission边界会失败。
- [x] 5.7 迁移framework active claim guidance/examples。Done condition：DPT_FRAMEWORK phase/shared/command playbook中的production claim命令均带role-matching actor decision；phase template/hygiene与COMMANDS静态检查PASS。
- [x] 5.8 迁移root regression fixtures与direct API call sites。Done condition：优先通过shared test helper集中提供explicit available decision；其余engine/schema/integration call逐个标明测试意图，无production default/test-only bypass。
- [x] 5.9 迁移existing controlled/experiment claim commands。Done condition：fixture-backed cases明确标注synthetic observation只测Engine branch且不作为host availability证据，实际actor class与case driver一致；heavy real-subagent cases使用真实matching probe；validate-playbook与case contracts PASS，不伪造verdict。
- [x] 5.10 验证CLI/MD integration。Done condition：missing observation no-claim、normal/fallback CLI JSON/exit、exit-code inventory、all active claim examples与legacy docs compatibility PASS。

## 6. Recovery, Race And Simplicity Guards

- [x] 6.1 明确post-probe spawn failure边界。Done condition：不新增fail-preflight/状态；Agent guidance对zero-progress classified unavailable只给existing `fail`+normalized reason后fresh probe/new claim；progress-positive继续existing paths；无abandon竞争或in-place conversion。
- [x] 6.2 验证unavailable→available/fallback恢复。Done condition：no-claim后same demand normal claim；failed normal attempt terminalized后fallback获new work ID；无手改queue/index/ledger。
- [x] 6.3 增加simplicity scope guard。Done condition：一个preview/evaluator、existing kind policy/claim trace/envelope/submit/queue；无host-report authority/new trace family/probe service/token/TTL/cache/db/daemon/watcher/scheduler/fallback queue/role-model tree/global mode。
- [x] 6.4 运行paired Evolution Direction review。Done condition：target manifest证明role-bound preflight + single fallback的net simplification，量化删除doomed batch cleanup链；Agent执行机械fallback、用户仅外部决定、Engine仅verdict，no-fabrication闭环。

## 7. Controlled Proof And Source Closure

- [x] 7.1 在现有`exp_engine-boundary` family新增case-407 light controlled proof。Done condition：production CLI证明5-demand unavailable no-claim零authority mutation、fallback policy/default deny、explicit single fallback formal submit/ledger actor class、mixed-role isolation、later available normal batch；不伪造native host真实性结论。
- [x] 7.2 更新`experiments_playbook/RUN_EXPS.md`并逐step执行case-407。Done condition：PASS来自真实bundle bytes/trace/ledger/CLI；repeat no-claim与inspect稳定；PASS后清理成功bundle。
- [x] 7.3 更新BUG-077与Overall roadmap。Done condition：只在controlled proof+full regression通过后标记C4 actor availability/fallback完成；不提前关闭其他来源/C3B/C5。
- [x] 7.4 按VEM-002更新`CHANGELOG.md`为`v0.25`。Done condition：只声明actor preflight、explicit Phase Agent work-unit fallback与actor provenance，不声称host-authenticated availability或generic scheduler。
- [x] 7.5 按VEM-003/004同步`DPT_FRAMEWORK/RUN.md` version banner。Done condition：与CHANGELOG最新条目一致且version regression PASS。

## 8. Verification And Governance

- [x] 8.1 运行DEW/AGQ/RWP/SRL focused schema、claim、queue、receipt、dry-submit/submit、inspect、CLI/MD/static与authority snapshot回归。Done condition：全部PASS，`git diff --check`无错误。
- [x] 8.2 运行完整`node --test tests`。Done condition：全套PASS；不修无关failure。
- [x] 8.3 运行`openspec validate handle-unavailable-delegated-actors --strict`。Done condition：change严格验证PASS。
- [x] 8.4 运行`node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [x] 8.5 运行`node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [x] 8.6 最终scope audit。Done condition：queue/lifecycle/evidence/topic/post-final owners不变；actor observation不成future authority；fallback不绕submit、不冒充subagent；无隐藏auto-fallback/parallel scheduler/global mode；全部证据闭环记录。
