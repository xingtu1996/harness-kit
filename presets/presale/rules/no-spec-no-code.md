***REMOVED*** Rule · No-Spec-No-Code（售前阶段门铁律）

> C7 阶段门「No-X」铁律 · A9 立品实证件（presale 角色签名机制）
> 触发：任何"直接写代码 / 直接出方案"的请求。常驻。

***REMOVED******REMOVED*** 铁律

未走 spec、未经人 gate，**禁止进入编码实现**。售前阶段只产出：

- 需求澄清 → `spec`（analysis + validator，含退出/幂等/回滚三条件）
- 方案设计 → 评审 → 交接

***REMOVED******REMOVED*** 违规处置（agent 行为约束）

1. 若请求绕过 spec 直接要求实现 → **拦截**，指向本文件，要求先出 spec。
2. 若已有 spec → 检查人 gate 是否通过（阶段声明勾选）→ 未通过不动作。
3. spec 完整（含验收三条件）→ 交付物加 `ready-for-agent` label → 交编码阶段。

***REMOVED******REMOVED*** 判定速查

| 场景 | 处置 |
|------|------|
| 无 spec 直接写码请求 | 拦截 → 先 spec |
| 有 spec 无人 gate | 停 → 等人 gate |
| spec 完整 + gate 通过 | 交付 `ready-for-agent` |
| 交接后编码 | 不再属售前范围 |

> 依据：阶段门是"角色 = 阶段声明 + 允许动作 + 禁止铁律"，防止售前越界污染交付。
