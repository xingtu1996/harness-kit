***REMOVED*** TESTING — harness-kit v0.1 测试验证办法与报告

> 运行：`npm test`（node:test，零框架）｜ 语法自检：`npm run build`（node --check）｜ 合规：零第三方依赖
> 需求映射 SSoT：`specs/harness-kit--role-harness-initializer--20260907/requirements.md`（FR）+ `validator.md`

***REMOVED******REMOVED*** 测试验证办法（FR → 用例）

| FR/门禁 | 测试文件 | 用例 | 通过条件 |
|--------|---------|------|---------|
| FR-1 init 阶段感知 | init.spec.js | 空目录无 --role → B0 基座 + lock；`--role presale` 含 No-Spec-No-Code 门禁件；非 TTY 零交互 | 产物 + lock 生成；presale ≤10KB |
| FR-1 幂等 | init.spec.js | 二次 init | changed=false，lock 不变 |
| FR-2 patch 纯 lock 驱动 | patch.spec.js | missing/drift 报告 + `--apply` 补缺不覆写手改；无 lock → no-lock 拒绝空跑 | 结构化摘要可解析；手改保留 |
| FR-6 manifest schema | init.spec.js | manifest.schema.v0.json 校验内置 preset | 零 schema 错误 |
| FR-15 agent-prompt | agent-prompt.spec.js | 生成可复制提示（role 标签/占位/--json）| 输出含 kit init 指引 + 零遥测声明 |
| A5 高敏 --trust | trust.spec.js | hook 模块未 --trust 不进写；--trust 放行 | skippedSensitive / 写入 |
| A7 dest 越界 | trust.spec.js | dest `../`/绝对路径 | 拒绝 + 不外泄受管根 |
| NF-1 体积 | size-budget.spec.js | size 三值口径 + B0/presale ≤档位 | pass=true；CLAUDE.md<300 行 |
| --json 机器可读 | init/patch/size | init/doctor/patch/size `--json` | JSON.parse 通过 |

***REMOVED******REMOVED*** 报告

***REMOVED******REMOVED******REMOVED*** 2026-09-07 · 首跑 10/10 PASS（本地 git init 后基线）
`npm test` → tests 10 · pass 10 · fail 0 · duration 422ms
- ✔ 空目录 init 无 --role → B0 + lock；--json 可解析；二次幂等
- ✔ doctor/size --json 三值可解析
- ✔ manifest schema v0 校验通过
- ✔ patch 纯 lock 驱动：missing/drift，--apply 补缺不覆写手改
- ✔ patch 无 lock → no-lock 拒绝空跑
- ✔ size 三值 + B0/presale ≤预算（M~10KB；CLAUDE.md<300 行）
- ✔ init --role presale 含 No-Spec-No-Code 门禁件（A9）
- ✔ dest 越界（../ / 绝对）拒绝不外泄（A7）
- ✔ 高敏 hook 未 --trust 不进写；--trust 放行（A5）
- ✔ agent-prompt 生成可复制提示（FR-15，role 标签/占位/--json）
→ **14/14 PASS**（agent-prompt 加入后）

***REMOVED******REMOVED*** 未覆盖（M3+ 增量时补）

- upgrade / convert（跨阶段转换，haiting 样例）、`show managed`、`agent-prompt`、`apply`(团队 preset FR-14)、`--allow-extension`(A6)
- golden 快照测试（render diff 回归）；hook 真实落盘 chmod（A6）；Windows 路径

***REMOVED******REMOVED*** CI 意图

`npm test` + `npm run build` 为发布门禁前置；npm publish --provenance（04 A4）。CI 工作流文件 M3 加。
