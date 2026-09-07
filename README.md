***REMOVED*** harness-kit

> 给强 harness，模型可以便宜。 —— 可回滚的角色化 Agent Harness 工作区生成器。

一句话三支柱：
1. **可控是分水岭** —— harness 不是工具收藏，是 AI 规模化使用的前提；模型会变，"可控"不变。
2. **强 harness → 不必强模型** —— 把质量从"模型智力"迁移到"约束 + 工程 + 知识接入"，跑更便宜/更小/私有化模型而不塌质量。
3. **Agent 驱动 + 人可操作** —— 全命令 `--json`，agent（或人）可读现状/差异/漂移给建议，从"人脑记忆驱动"到"现状分析驱动"。

命令：`init` / `patch` / `upgrade` / `doctor` / `size` / `show managed` / `convert` / `agent-prompt`；角色 preset 库内容导向（B0 + presale / code-delivery / content）。test 37/37。

---

***REMOVED******REMOVED*** 给老奶奶讲 harness-kit

- **是什么**：给 AI 配的"工作台 + 使用手册 + 规矩"。AI 不会自己知道该怎么帮你，harness 就是告诉它你的项目规矩、你的知识放哪、怎么一步步干活的那套文件。
- **为什么**：模型再聪明，不懂你的规矩就乱来。harness 像给新手员工的一本《岗位手册 + 操作规范 + 老员工笔记》。
- **什么时候用**：新开一个项目/内容工作区 → `harness-kit init` 十几秒搭好；已有项目想让 AI 更有规矩 → `harness-kit patch` 补规矩并接上你的知识库。
- **作用**：省 token（别把手册全塞进每次对话）、少返工、质量稳（机械门禁拦低级错）、沉淀复利（踩过的坑下次不再踩）。

---

***REMOVED******REMOVED*** 实例：harness 接口长这样

以真实生产 harness（`ctf-gitlab/.claude/`）为例，标注每块是什么"接口"：

```
.claude/                                ← Harness 根目录（所有 AI Agent 共享的"工作台"）
├── CLAUDE.md                           ← 行为锚点：我是谁(角色)/怎么路由/铁律（AI 每次读的"名片+规矩"）
├── DIRECTORY.md                        ← 索引：harness 里有什么、在哪（注册表，防资产"登记了不存在"）
├── knowledge-map.md / wiki/            ← 知识收敛层：知识点路由 + 正式知识库
├── config.yaml                         ← 配置接口：技术栈/DB/端口/门禁（一次配好）
├── agents/                             ← Agent 角色接口：子 agent 定义（侦查/审查/写作…）
├── rules/                              ← 规则接口：治理护栏（宪法最优先；业务规则按需触发，防全量常驻税）
├── skills/                             ← 技能接口：SOP 打包（触发才加载，按需省 token）
├── workflows/                          ← 流程接口：怎么一步步走（生命周期/需求→spec→编码…）
├── memory/ + incidents/                ← 沉淀接口：知识/踩坑回流（复利飞轮落点）
├── hooks/ + scripts/                   ← 机械强制接口：规则是愿望、hook 是墙（确定性动作机器拦）
```

harness-kit 生成物 = 这份接口的**角色化简化版**（B0 基座：`.claude/CLAUDE.md` + 红线 + C13 方法论 + 模板元层 + `.harness-kit/lock`；角色 preset 加角色规约与门禁件）。

---

***REMOVED******REMOVED*** 不变的是什么、不同在哪里

| 维度 | 不变（跨一切 harness） | 不同（各家变体） |
|------|--------------------|----------------|
| 目的 | 受控轨道 + 人机分工 + 知识沉淀三件事恒成立 | — |
| 入口文件 | 根指令锚点必有 | CLAUDE.md（claude）/ AGENTS.md（codex/opencode/pi）双写 |
| 规则载体 | 治理护栏 + 常驻/按需分层思想 | constitution+rules 内联 vs 编号 RULES + 路由 vs AGENTS 内联 |
| 技能 | SOP 打包、懒加载省 token | skills/ 目录 vs .agents/skills vs SKILL.md 标准 |
| 机械强制 | 规则是愿望、hook 是墙 | claude hooks / dsh cordis / git hooks / 脚本门禁 |
| 重量 | 随阶段增减（售前最小 → 存量全量） | S 一张纸 ~ XL 60KB（常驻口径） |
| 沉淀 | 踩坑 → 规则 → 反哺 | incidents / 每日日志 / auto-memory |

> 真例对照：磐石（重全量+蜂群）、行途（内容工厂+飞轮+看板）、haiting（售前阶段门）、dsh（插件化 preset）、pi（<1000 token 极简）—— 入口/重量/机制不同，三件事与渐进披露思想相同。

---

***REMOVED******REMOVED*** 概念区：飞轮 / 自进化 / 活文档

- **知识复利飞轮**：使用 → 问题 → 沉淀 → 反哺 → 更好。每次会话留痕/归档，让资产越用越厚。kit 产物内置飞轮挂点：memory/日志结构 + 沉淀纪律。
- **自进化**：harness 会改自己 —— 踩坑 → 提炼规则 → 积累 3 次 → 升 Skill → 回流。升级由 `kit upgrade`（六维 + sha 锁 + 人 gate）受控执行。
- **活文档**：harness 是活物不是墓碑 —— 体积预算（CLAUDE.md<300 行 / rule<100 行）+ 保鲜期检查 + 防回弹门禁（size gate）。kit 生成物默认带这套预算与门禁（`doctor` 三值）。

---

***REMOVED******REMOVED*** 一段话让任意 Agent 动手（零门槛入门）

不用学 CLI——把下面这段**复制给你常用的任何 Agent**（Claude Code / 豆包 / Qoder / ChatGPT / WorkBuddy / TraeWork / Kimi…），它会自己读说明、跑 harness-kit、搭好工作台：

> 请用 **harness-kit** 把当前目录初始化成一个「{售前 / 开发交付 / 内容运营}」角色的受控 AI 工作台。harness-kit 是角色化 Harness 工作区生成器（git: xingtu1996/harness-kit）。步骤：① 读它的 README 并安装；② 运行 `harness-kit init --role {角色}`（先 `--json` 预览将写哪些文件，确认再落盘）；③ 完成跑 `harness-kit doctor --json`，告诉我受管文件、体积和是否有漂移。

**安全纯净承诺**：harness-kit 零遥测、零埋点、不把你的数据外发（生成物、会话都留在你的空间）。新增组件（hook/脚本/设置）进工作台前会提示敏感分级，需你确认才写。

***REMOVED******REMOVED*** 团队统一与规模化（FR-14，路线图 v1+）

公司/团队内每人 harness 各不一样 → 从**团队标准 preset** 统一：
- `harness-kit apply <company preset>`：拉团队/公司标准规约（org marketplace 或 git 源）→ 模板变量参数化（`{{COMPANY_NAME}}`/技术栈）→ 角色化 → 写项目并落 lock
- **三层模型**：公司标准层 + 角色层 + 个人手改层（个人改动 kit 永不覆写）→ 团队收敛同基座
- **跨项目一致**：批量升级 + `doctor` 跨项目体检，规模化执行而不散架
- 理念源自 haiting 公司标准规约包（"没有它=AI 忘规范/经验不沉淀"），kit 把它从"人肉复制 zip"变成"可回滚的生成与治理"

跨阶段转换（售前 → coding）走 `kit convert --role code-delivery`：跨 preset 纯 lock 切换（新增/变更渲染 + 快照），旧角色专属件移出受管但**盘上保留不自动删**，放行 coding 族加门禁；doctor 会按 `config.defaultRole` 提示转换关系。

***REMOVED******REMOVED*** 快速开始

> 环境：Node ≥ 20。零第三方 runtime 依赖，纯 ESM，无编译。

```bash
***REMOVED*** 1) 空目录搭一个 role-中性受管基座（B0）
mkdir my-workspace && cd my-workspace
harness-kit init --json

***REMOVED*** 2) 角色化（已内置 presale / code-delivery / content 三角色，各带签名门禁件）
harness-kit init --role presale --json        ***REMOVED*** 售前：No-Spec-No-Code 门禁
harness-kit init --role code-delivery --json  ***REMOVED*** 开发交付：coding-gate（spec 先行/TDD/三条件）
harness-kit init --role content --json        ***REMOVED*** 内容运营：content-gate + 知识接入点
***REMOVED*** 已有受管空间：preset 有新版走 upgrade（六维 diff + 快照回滚）

***REMOVED*** 3) 体检：受管 / 漂移 / 体积三值（agent 可消费）
harness-kit doctor --json

***REMOVED*** 4) 补缺 + 漂移报告（纯 lock 驱动，默认 dry-run）
harness-kit patch --json
harness-kit patch --apply --json
```

本地开发（本仓库）：`node bin/harness-kit.js <op>` 或 `npm link` 后 `harness-kit <op>`。测试：`npm test`。

***REMOVED******REMOVED******REMOVED*** 输出示例（doctor --json 结构）

```json
{
  "op": "doctor",
  "ok": true,
  "managed": { "total": 4, "ok": 4, "missing": 0, "drift": 0 },
  "size": {
    "claudeMd": { "bytes": 2203, "lines": 54 },
    "residentRules": { "count": 0, "bytes": 0 },
    "productsKb": 5.12,
    "budgetKb": 10,
    "pass": true
  },
  "preset": { "id": "B0", "needsUpgrade": false },
  "suggestions": ["体积达标。"]
}
```

---

***REMOVED******REMOVED*** 接口与生成物说明 + 术语三行

***REMOVED******REMOVED******REMOVED*** kit 生成物（三类，别混）

| 层 | 内容 | 谁写 | kit 是否再覆写 |
|----|------|------|--------------|
| B0 基座 | role-中性 `.claude/CLAUDE.md` / `AGENTS.md` + 红线 + C13 方法论 + templates | init | patch 维护 lock |
| 角色 preset | 角色规约 + 签名机制件（如 No-Spec-No-Code） | init --role / patch --role | patch 补缺，升级走 upgrade |
| user 手改 | 用户本地改动 | 人/agent | **kit 永不覆写**（scope user，hash 检测报漂移） |

***REMOVED******REMOVED******REMOVED*** CLI 契约

- 全命令 `--json`；`--dry-run` 预览（patch 默认 dry-run）；`--apply` 落盘；`--trust` 高敏放行（A5）；`--cwd <dir>`；`--role <presale|code-delivery|content|B0>`（init/patch/convert）；`--stage`（upgrade 跨阶段占位，完整转换走 convert）。
- 命令：`init`（默认可写）· `patch`（纯 lock 补缺+漂移）· `upgrade`（纯 lock 升级：preset 新版列新增/变更，--apply 写盘+刷新 lock）· `doctor`（受管/漂移/体积体检 + 合并分层配置）· `size`（三值+预算）· `show managed`（只读列受管文件 + ok/missing/drift）· `convert`（跨角色切换 preset，--apply 才落盘，旧件移出受管不删盘）· `agent-prompt`（生成贴给 Agent 的一句话）。
- `.harness-kit/`（lock + 快照 + 分层配置 config.json）自动进目标 `.gitignore`，自豁免体积审计。
- 分层配置（FR-16，只读注入 doctor，M3+ 才驱动行为）：内置默认 < `~/.harness-kit/config.json` < 项目 `.harness-kit/config.json`（init 自动生成骨架，字段 `defaultRole`/`defaultPlatform`/`budget`/`features`；`null` 惰性回退低层）< CLI 参数。

***REMOVED******REMOVED******REMOVED*** 术语三行

- **受管区** = kit 生成的文件（内容 hash 记于 `.harness-kit/lock`）。
- **手改区** = 你在受管文件上的本地改动。
- **漂移** = 磁盘 hash ≠ lock hash → kit v0.1 尊重手改不覆盖；内容升级走 upgrade。

***REMOVED******REMOVED******REMOVED*** 实现说明（v0.1 建仓偏差记录）

- spec 骨架定案为 TS（bin `bin/harness-kit.ts` → `src/cli.ts`）；本骨架按"零编译纯 ESM JS 可跑"优先落地，`src/` 内为 `.js`，`tsconfig.json` 保留待迁 TS。README 与 package.json 为当前事实源。
- `manifest.yml` 现以 YAML1.2 的 JSON 子集书写（`JSON.parse` 即可解析，零依赖）；依赖放开后可换完整 YAML 解析器。

---

***REMOVED******REMOVED*** ecosystem（与行途开源矩阵 10 仓互连）

harness-kit = 散仓资产的**角色化编排生成器**：`xingtu-harness` 是"一键装配全部资产"，harness-kit 是"按角色 × 平台生成一套专业规约 workspace"——差异互补、同源内容，引用不复制。

| 仓 | 定位 | 与 harness-kit 关系 | 协作机制 |
|----|------|--------------------|---------|
| xingtu-harness | 聚合母仓：marketplace.json + install.sh | 理念源 + marketplace 组装模式复用 | README 互连；marketplace 引用模式同源 |
| xingtu-ai-engineering | 方法论旗舰：philosophy/governance | **方法论底座**：公共件 C 系引用 | marketplace git 引用；kit 不含方法论正文 |
| xingtu-sdd | Spec-Driven 方法论 | spec 骨架源（presale preset 出处） | 蒸馏模板骨架，引用不复制 |
| xingtu-rules | 规则库：分层 | C4/C5 内容源 | 通用规则骨架蒸馏 + scoped 引用 |
| xingtu-skills | 技能聚合（agentskills） | C12/skill 内容源 | SKILL.md 引用（跨平台） |
| xingtu-hooks | Claude Code hooks 集合 | C5 模板源（hook/inline 双形态） | 模板双形态蒸馏 |
| xingtu-mcps / xingtu-cli / xingtu-tools | MCP / 零依赖 CLI / 工程脚本 | C1 脚本纪律源 | 纪律蒸馏；脚本按需引用 |
| xingtu-site | 个人作品集站点 | 展示层 | 发布后 site 加卡片 |

避让红线：不做资产管家（不给既有空间装散件）、不做流程编排（不抢 GitHub Spec Kit 阶段调度）；只在**生成/治理/回流**动作里写文件。

---

***REMOVED******REMOVED*** 开源版 / 企业版（Open Core）

**开源版（Apache-2.0，永久免费）**：`init` / `patch` / `doctor` 全套命令、B0 基座、三角色 preset（presale / code-delivery / content）、lock 治理、六维 diff 与快照回滚。个人和小团队直接拿去用，不用打招呼，也不用告诉我。

**企业版（闭源，付费）**：核心命令永远开源，付费的部分是「让一整个团队真的用起来」。

| 你卡在哪 | 企业版补什么 |
|---|---|
| 每个人各写各的 preset，风格散 | 私有 preset 体系：把你们的规范、军规、门禁固化成角色库，统一分发与升级 |
| 老工作区一堆散装资产不敢动 | 存量诊断 + 迁移：盘点 → 归并 → 上 lock，全程带快照可回滚 |
| 工具装了，团队没人用 | 落地陪跑：2–4 周，跟一个真实项目从零跑到 `doctor` 全绿 |
| 想让团队自己会，不能一直靠外部 | 内训：半天讲原理，一天带实操（拿你们自己的仓库练） |
| 要向上汇报投入产出 | 体检报告 + 度量：漂移率 / 体积 / 命中率，可导出月度留痕 |

**企业版不会有的东西**：核心 CLI 永远不加锁。任何付费版本都不会在 `init` / `patch` / `doctor` 上比开源版多出能力——这条我自己守。

关于划不划算：harness 省下来的 token 成本通常能覆盖陪跑费用，但数字我替你算不准，拿你们自己的账单来，我帮你看一眼再决定要不要做。

**联系（企业定制 / 陪跑 / 内训）**

- 邮箱：xingtutech@163.com（主题注明「harness-kit 企业版」）
- 微信：xingtu_note（备注「harness-kit」）

这个项目目前是我一个人在做，回复可能慢，但会回。

---

***REMOVED******REMOVED*** 合规 · NOTICE · 免责

- 开源许可：**Apache-2.0**（见 `LICENSE`），归属声明见 `NOTICE`。第三方随包内容见 `THIRD_PARTY_NOTICES`。
- 商用：**允许**。可自由用于公司内部、集成进商业产品、修改后闭源分发，无需授权、无需付费、无需开源你的代码。唯一条件：保留 `LICENSE` 与 `NOTICE`、标注改动、不使用「harness-kit」商标。
- **默认零遥测**：kit 无埋点、无任何外发。生成物/模板禁追踪码、禁隐式外呼。若未来加遥测：opt-in 且数据本地优先，内网/合规场景可 `--no-telemetry` 硬禁。
- 供应链：零第三方 runtime 依赖；禁自身 postinstall；文档版本 pin 禁 ^/~。
- 商标免责：本项目与 Anthropic、Claude、Codex、GitHub Spec Kit 等无官方关联；命名引用仅为生态描述。
- 定位免责：生成物为通用方法论模板，不构成针对任何公司/产品的业务建议。

---

***REMOVED******REMOVED*** 路线图

- **v0.1（本骨架）**：init / patch / doctor + B0 + presale 首发（No-Spec-No-Code 实证件）+ `.harness-kit/lock` 治理。
- **M3+ upgrade**：六维 diff + sha 锁定 + 快照回滚 + `kit show managed` + `patch --role`。
- **preset 扩列**：code-delivery / content 首发（size gate / 回流占位），可 `init --role`。
- **v1+ companion**：`harness-kit slim`（漂移体检）、`harness-kit reflow`（claude-only 会话 → memory）。
- **marketplace（A6）**：第三方 git***REMOVED***sha archive opt-in，默认关闭。

---

***REMOVED******REMOVED*** 开发

```bash
npm run build   ***REMOVED*** 语法自检（零编译）
npm test        ***REMOVED*** node:test 冒烟（init/patch/upgrade/doctor/size/show/convert + trust 门 + 体积预算 + golden）
```

目录：`bin/`（薄入口）· `src/`（cli/detect/init/patch/upgrade/doctor/size/show/convert/config/render/lock/manifest/snapshot）· `presets/`（B0 + presale + code-delivery + content）· `manifest.schema.v0.json`（schema）· `test/`（含 fixtures/golden.* 快照）· `.github/workflows/ci.yml`（门禁）。
