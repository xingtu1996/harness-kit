***REMOVED*** NPM 发布提示 —— harness-kit

> 参照：xingtu `specs/20260902-npm包发布SOP/`（首版流程沉淀）｜ harness-kit spec `04 协议裁决` A4/A6/A10
> 原则：**先本地全绿 → dry-run → 精确版本 → provenance 发布**；发布是用户可逆动作，先给提示再执行。

***REMOVED******REMOVED*** 预发布门禁（`npm publish` 前必过）

```
□ npm test                      （node:test 全绿，当前 10+ 基线）
□ npm run build                 （node --check 语法自检全过）
□ version                       （semver：0.1.0 → 0.1.x patch / 0.x minor / 1.0 功能稳定）
□ NOTICE 核对                   （THIRD_PARTY_NOTICES 有外源内容即补；当前零 runtime 依赖）
□ package.json files 白名单     （只发 bin/src/presets/README/SELF/LICENSE/NOTICE/manifest schema，不发 test/*.spec? 可发 test 或无）
□ 体积告警                      （包体积合理；presets 内容即护城河，别误裁）
□ npm view harness-kit          （查包名是否被占 / 已被占则提示改名冲突——发布前必查）
□ 零 runtime 依赖复核           （dependencies:{} 保持；A4：不拖 ajv 全树）
```

***REMOVED******REMOVED*** 发布命令序列（发布者身份操作）

```bash
***REMOVED*** 1. 预检
npm test && npm run build
npm view harness-kit             ***REMOVED*** 名字可用性 / 已存在则看是否本账号可接管
npm pack --dry-run               ***REMOVED*** 看将发布哪些文件、体积

***REMOVED*** 2. 版本 + 标签
npm version patch -m "chore: release v%s"   ***REMOVED*** 或 minor；commit + tag 由 npm version 完成

***REMOVED*** 3. 发布（provenance：sigstore 签名，04 A4 供应链信任锚）
npm publish --provenance --access public

***REMOVED*** 4. 验证
npm view harness-kit@latest dist-tags version
npm i -g harness-kit && harness-kit agent-prompt --role presale   ***REMOVED*** 装后用 agent-prompt 自检
```

***REMOVED******REMOVED*** 配套

- **2FA / 精确版本 pin**：维护者开 2FA；文档让用户 `npm i -g harness-kit@0.1.0` 精确 pin（禁 `^`/`~`，A4）
- **CI**：M3 加 `.github/workflows`（test+build+publish --provenance）
- **README 首屏**已含"复制给 Agent 的一段话"——发布后任何人 `npm i -g` 即可用该卡开箱
- **供应链姿态**：CLI 零依赖 + 禁自身 postinstall + NOTICE 逐源——符合 04 A6 注入面管控
- **Tag/Changelog**：v0.1.0 tag；CHANGELOG 随 npm version（后续 changesets 化）

***REMOVED******REMOVED*** 风险提示

- 包名 `harness-kit` 若 npm 已占用（社区多个 harness-kit）→ 改名决策见 spec 02 §一（备选 create-harness 已被生态用；最终命名由发布前 npm view 实况 + boss 定）
- 发布后新装用户即暴露真实 README 体验——README 为对外门面，先按 07 §六 扩写全文再首发
