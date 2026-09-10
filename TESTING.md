# TESTING — harness-kit v0.1 测试验证办法与报告

> 运行：`npm test`（node:test，零框架）｜ 语法自检：`npm run build`（node --check）｜ 合规：零第三方依赖
> 需求映射 SSoT：`specs/harness-kit--role-harness-initializer--20260907/requirements.md`（FR）+ `validator.md`

## 测试验证办法（FR → 用例）

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
| A3 show managed | show.spec.js | init 后列受管 ok / 删一文件→missing / 无 lock→no-lock | 相对路径 + ok/missing/drift 逐条 |
| FR-4 convert（跨角色） | convert.spec.js | dry-run 清单 / --apply 切角色 + lock 刷新 + doctor 通过 / 漂移原子阻断 / no-lock / same-role / missing-role | 切后 preset.id 变 + 旧件移出受管盘上保留 |
| FR-16 分层配置 | config.spec.js | doctor --json 含 config / 项目覆盖 defaultRole/features / 无 config 内置默认 / null 惰性 | 四级合并只读注入，不改写行为 |
| --json 机器可读 | init/patch/size | init/doctor/patch/size `--json` | JSON.parse 通过 |

## 报告

### 2026-09-07 · 首跑 10/10 PASS（本地 git init 后基线）
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
- ✔ upgrade（FR-4 骨架）：no-lock→先 init；sha 同→已最新；sha 异→needs-apply dry-run；--apply 写盘+lock 刷新+幂等；--stage 占位
- ✔ golden 快照回归（4 preset init 产物树 sha256 vs fixtures，UPDATE_GOLDEN=1 再生）
- ✔ `show managed`（A3）：init 后列受管 ok；删一文件 → missing；无 lock → no-lock
- ✔ `convert`（FR-4 跨角色最小可用）：dry-run 列 新增/变更/移出受管；--apply 切角色 + lock 刷新 + doctor 通过；漂移原子阻断不写盘；no-lock/same-role/missing-role
- ✔ 分层配置（FR-16）：doctor --json 含 config 合并字段；项目 config 覆盖 defaultRole/features（reflow 占位建议）；无 config 回退内置默认；null 惰性不覆盖用户级
→ **37/37 PASS**

## 未覆盖（M3+ 增量时补）

- `convert` 完整语义（客户样例进阶：spec 交接编排/回滚路径）、`apply`(团队 preset FR-14)、`--allow-extension`(A6)、分层配置完整开关（defaultRole/budget/features 真驱动 init/doctor 行为，非只读）
- hook 真实落盘 chmod（A6）；Windows 路径

## CI 意图

`npm test` + `npm run build` 为发布门禁前置；`.github/workflows/ci.yml` 已落（push/PR 跑 test+build；tag push 触发 `npm publish --provenance --access public`，需 secrets.NPM_TOKEN）。
