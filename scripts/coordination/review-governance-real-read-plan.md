# review-admin / governance-admin 真实读最小可执行方案（R42）

## 1. 输入事实（已核对）

- 当前 CloudBase 函数安全规则（`dev`）仍以“非匿名默认拒绝”为基线：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  },
  "admin-auth": {
    "invoke": true
  }
}
```

- `admin-auth` 已完成真实链路验证；服务端对照 `login -> changePassword -> me` 为 `code=0`。
- `review-admin` / `governance-admin` 的 action 已在函数内做了二次鉴权：
  - `getAdminWebSource(meta)`
  - `requireAdminAuth(meta.adminSessionToken)`
  - `assertAdminRole(...)`
- 结论：CloudBase 函数安全规则只决定“能否调用入口”，真正后台权限仍在函数内部。

## 2. 路线对比

### 路线 A：继续匿名 CloudBase transport + 扩规则（短期最小可执行）

#### A1. 最小动作

在当前 `dev` 环境函数安全规则上新增：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  },
  "admin-auth": {
    "invoke": true
  },
  "review-admin": {
    "invoke": true
  },
  "governance-admin": {
    "invoke": true
  }
}
```

#### A2. 为什么可执行

- 后台当前 transport 不改造即可开真实读。
- 与现有 `admin-auth` 成功链路完全同构，联调成本最低。
- 函数内已有 `source + sessionToken + role` 三层校验，不会因入口放开而直接放弃业务鉴权。

#### A3. 风险点

- 扩大匿名可调用面：会增加被探测/刷调用风险（虽然函数内仍会拦截未授权请求）。
- 若未来继续给更多管理函数开 `invoke=true`，规则会膨胀，长期维护成本上升。
- 对平台级风控依赖更高（需结合频控、日志告警、WAF/CDN策略）。

#### A4. 最小改动范围

- **必须**：CloudBase 函数安全规则（环境侧配置）。
- **建议**：补一条环境交接文档说明，明确“入口放开 != 权限放开”。
- **无需**：后台 `admin-web` transport 改造、后端 action 合同改造。

#### A5. 对已验证 `admin-auth` 的影响

- 低风险、向后兼容。
- 不改 `admin-auth` 的请求协议与业务鉴权实现；已验证链路可保持不变。

---

### 路线 B：换 transport / token 化方案（中长期更稳）

#### B1. 目标形态（建议方向）

- 后台不再直连匿名 `wx.cloud.callFunction`。
- 改为后端受控 transport（例如 HTTP 网关/BFF），携带后台会话 token（或服务端签名）访问 `review-admin` / `governance-admin`。
- CloudBase 函数安全规则回归更收敛基线，不再持续扩 `invoke=true`。

#### B2. 优势

- 更小攻击面与更可控审计链路（鉴权、频控、IP 策略集中化）。
- 后续管理函数扩展时不再每次改 CloudBase 函数放行规则。
- 更符合“后台管理接口默认非匿名入口”的安全设计预期。

#### B3. 风险点/成本

- 需要改 `admin-web` 请求层与部署配置，联调回归成本明显高于路线 A。
- 需要补网关/BFF 层运维、监控、错误映射与发布流程。
- 若实现不当，可能影响当前已稳定的 `admin-auth` 前端调用路径。

#### B4. 最小改动范围

- `admin-web`：请求 SDK / transport 统一切换。
- 后端：新增或扩展受控入口层（网关/BFF），并维护 token 透传或校验。
- 环境：新增域名/路由/CORS/证书与发布流水线配置。

#### B5. 对已验证 `admin-auth` 的影响

- **可做到不影响**，前提是分阶段迁移：
  1. 先仅迁 `review-admin`/`governance-admin` 真实读；
  2. `admin-auth` 保持现状直到新 transport 稳定；
  3. 最后统一迁移。
- 若一次性全切，有中等回归风险。

## 3. 推荐方案（分阶段）

### 3.1 当前推荐：先走路线 A（最小可执行）

- 先让后台把 `review-admin` / `governance-admin` 真实读跑起来，快速解锁联调。
- 同时严格要求：
  - 继续保留并验证 `meta.source='admin-web'`、`meta.adminSessionToken`、角色校验；
  - 对失败请求做日志采样与告警（避免“入口放开后无观测”）。

### 3.2 下一阶段：规划路线 B（安全收敛）

- 在本轮真实读稳定后，立项迁移 transport。
- 迁移策略以“灰度函数域 + 双通道并存 + 逐函数切换”为主，避免影响已验证 `admin-auth`。

## 4. 执行清单（最小）

1. 环境侧把 `review-admin`、`governance-admin` 加入 `invoke=true` 放行列表（仅当前 `dev`）。
2. 后台执行两组真实读 smoke：`review-admin.taskList/taskDetail`、`governance-admin.reportList/reportDetail`。
3. 后端观察 `30002/30003/40003` 分布，确认函数内鉴权与校验按预期兜底。
4. 将结果回写会议纪要，再决定是否启动路线 B 的技术方案评审。

## 5. 结论一句话

- **短期要快且不破坏现有联调：走路线 A。**
- **中长期要稳且安全面收敛：规划路线 B。**
- 两者可串行，不冲突；并且都不要求回退已验证的 `admin-auth` 链路。
