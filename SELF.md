# SELF.md —— harness-kit 项目自述（开源矩阵索引）

> 行途开源矩阵治理惯例：每独立仓一份专业自述，供开源矩阵/索引与 site 作品集引用。

## 项目

- 名称：harness-kit
- 一句话：可回滚的角色化 Agent Harness 工作区生成器（init / patch / doctor）。给强 harness，模型可以便宜。
- 层位：L2 规约初始化 + 治理（不做 L4 流程编排、不做 L3 资产同步，见 spec 02 生态地图）
- 状态：v0.1 骨架（2026-09-07 建仓），init+patch+doctor 最小可跑，B0 + presale 首发
- 定位叙事：规约建筑师 + 体检医师 —— 从零定义"这个角色/项目的 agent 该长什么样"，生成 + 差分治理 + 随盘体积自门禁
- 开源许可：Apache-2.0
- 语言/运行时：Node ≥ 20，纯 ESM JavaScript（spec TS 骨架，v0.1 零编译可跑）；零第三方 runtime 依赖
- 未来发布：独立仓 + npm（`--provenance` + 2FA，A4）

## 生态矩阵关系

| 关系 | 对象 | 内容 |
|------|------|------|
| 理念源 | xingtu-harness | 聚合母仓；marketplace 组装模式复用；README 互连 |
| 方法论底座 | xingtu-ai-engineering | preset 公共件 C 系引其 philosophy/governance |
| spec 骨架源 | xingtu-sdd | presale preset spec 模板出处（蒸馏不复制） |
| 规则/技能/hooks 源 | xingtu-rules / xingtu-skills / xingtu-hooks | C4/C5/C12 内容源 + hook 双形态 |
| 脚本纪律源 | xingtu-cli / xingtu-tools / xingtu-mcps | C1 安全/备份/自包含实践 |
| 展示 | xingtu-site | 发布后收作品集卡片 |

## 立品实证（A9，v0.1 可运行形态）

- presale preset = No-Spec-No-Code 门禁件（`rules/no-spec-no-code.md`）
- doctor / size = 体积三值自门禁（CLAUDE.md<300 行 / 产物 ≤ 档位预算）

## 红线（开发与发布共同遵守）

- 不碰客户公司业务私有内容（"某电商中台"抽象口径）
- 内容敏感分级：hook/script/settings/permissions/mcp = 高敏 → `--trust` 人审
- 供应链：vendored 外部内容记 THIRD_PARTY_NOTICES；第三方 marketplace 默认关闭
- 零遥测默认承诺；无官方关联免责

## 文档指针

- README.md（理念 + 快速开始 + ecosystem + 路线图）
- LICENSE / THIRD_PARTY_NOTICES（合规）
- manifest.schema.v0.json（preset manifest JSON Schema）
- spec 目录：`specs/harness-kit--role-harness-initializer--20260907/`（设计 SSoT）
