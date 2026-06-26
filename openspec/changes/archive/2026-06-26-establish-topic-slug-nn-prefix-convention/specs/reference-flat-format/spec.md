> req: REF-001, REF-005

## MODIFIED Requirements

### Requirement: Flat reference directory with three-level naming prefixes

`reference/` SHALL 为扁平目录（无子目录），所有 reference 文件以 `.md` 结尾、平铺在同一层级。文件命名 SHALL 使用三级前缀：

- `00-shared-<slug>.md` — 共享基础 reference，由 wave 0 产出，覆盖 ≥2 个 topic 的跨领域知识
- `{topic_slug}-<qualifier>.md` — topic 专属 reference，由 wave 1 产出，覆盖单个 topic 的 source。`{topic_slug}` SHALL 为 topic 的完整 slug（含 `NN_` 编号前缀，如 `01_meal-timing-...`），`<qualifier>` SHALL 为该 source 的短标识符（如作者名、机构名、关键词）
- `00-cross-<slug>.md` — 跨 topic 发现 reference，由 wave 2 产出，在 cross-topic scan 时涌现的新共享 source

`<slug>` SHALL 为 kebab-case 标识符，描述该 source 的核心内容。

**变更说明**: Wave1 topic 专属 reference 的命名从 `0N-<slug>.md` 改为 `{topic_slug}-<qualifier>.md`。原因是 topic slug 本身已含 `NN_` 编号前缀（见 `seed-topic-materialization`），额外 `0N-` 前缀冗余。Wave0 的 `00-shared-` 是固定共享标记（非 topic 编号），Wave2 的 `00-cross-` 同理，两者不受此变更影响。

#### Scenario: Wave 0 produces shared foundation references only

- **WHEN** wave 0 检索共享基础 evidence
- **THEN** Agent 为每条共享 source 创建 `reference/00-shared-<slug>.md`
- **AND** 文件名以 `00-shared-` 开头

#### Scenario: Wave 1 produces topic-specific references with slug-based prefix

- **WHEN** wave 1 为 topic（slug = `01_meal-timing-blood-glucose-insulin`）检索深挖 evidence
- **THEN** Agent 为每条 topic 专属 source 创建 `reference/01_meal-timing-blood-glucose-insulin-<qualifier>.md`
- **AND** 文件名以 topic 的完整 slug 开头，后跟 `-` 和 qualifier
- **AND** `ls reference/` 下同一 topic 的 reference 文件自然聚拢（共享 `01_meal-timing-...` 前缀）

#### Scenario: Wave 2 produces cross-topic discovery references

- **WHEN** wave 2 cross-topic scan 发现新的 ≥2 topic 共享 source
- **THEN** Agent 创建 `reference/00-cross-<slug>.md`
- **AND** 文件名以 `00-cross-` 开头，与 wave 0 的 `00-shared-` 区分

#### Scenario: Directory is flat and scannable

- **WHEN** 用户执行 `ls reference/`
- **THEN** 所有 reference 文件在同一层级可见
- **AND** 不存在 `reference/<topic>/` 或 `reference/00_shared/` 等子目录

### Requirement: Phase nodes enforce reference file naming convention

Phase node body 中的 Expected Artifacts 和 Allowed Actions 节 SHALL 明确要求 Agent 按三级前缀创建 reference 文件，SHALL NOT 指示 Agent 创建 `reference/<topic>/` 子目录或 `source.yaml` 文件。

#### Scenario: Wave0 phase instructs agent to create 00-shared files

- **WHEN** Agent 读取 `phase-wave0.md` 的 Expected Artifacts 节
- **THEN** 指令 SHALL 要求创建 `reference/00-shared-<slug>.md`（非 `reference/<topic>/source.yaml`）

#### Scenario: Wave1 phase instructs agent to create topic-slug-prefixed files

- **WHEN** Agent 读取 `phase-wave1.md` 的 Expected Artifacts 节
- **THEN** 指令 SHALL 要求创建 `reference/{topic_slug}-<qualifier>.md`（topic_slug 为含 `NN_` 前缀的完整 slug）
- **AND** SHALL NOT 要求创建 `reference/0N-<slug>.md`（`0N-` 前缀已被 slug 内置的 `NN_` 取代）
