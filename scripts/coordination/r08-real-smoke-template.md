# R54 小程序真实 Smoke 记录模板（后端支援）

## 1. 目的

- 固定 `R54` 首轮真实 smoke 的最小范围、控制台执行方式和失败回传格式。
- 把小程序真实联调从“人肉逐页点点点”收口成“控制台半自动 + 结构化结果”。
- 明确本轮只做小程序首轮关键链路，不把后台治理域或更宽前台链路混入主 smoke。

## 2. 本轮正式范围

### 2.1 固定控制台顺序

```js
const app = getApp()
await app.globalData.runtimeDebug.useCloud()
app.globalData.devSmoke.prepare()
const batch = await app.globalData.devSmoke.runFirstBatch()
batch
app.globalData.requestDebug.getLogs()
```

### 2.2 `runFirstBatch()` 内部固定步骤

| 步骤 | action | 请求样例 | 成功样例 | 结果要求 |
| --- | --- | --- | --- | --- |
| 1 | `user-bff.bootstrap` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/user-bff.bootstrap.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/user-bff.bootstrap.response.json` | 必须先过；失败即停止后续 |
| 2 | `publisher-bff.getProfile` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/publisher-bff.getProfile.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/publisher-bff.getProfile.response.json` | 首读可为空 |
| 3 | `publisher-bff.upsertProfile` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/publisher-bff.upsertProfile.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/publisher-bff.upsertProfile.response.json` | 写成功即可 |
| 4 | `creator-bff.getCard` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/creator-bff.getCard.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/creator-bff.getCard.response.json` | 首读可为空 |
| 5 | `creator-bff.upsertCard` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/creator-bff.upsertCard.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/creator-bff.upsertCard.response.json` | 写成功即可 |
| 6 | `application-bff.submit` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.submit.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.submit.response.json` | 优先使用固定 dev 样本 notice；若样本失效，则 fallback 到候选通告 |
| 7 | `application-bff.withdraw` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.withdraw.request.json` | `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.withdraw.response.json` | 仅基于本轮新生成报名单 |

## 3. 本轮固定规则

1. `bootstrap` 失败即停止，不继续资料链路或报名链路。
2. 发布方 / 达人资料任一动作失败，不进入 `submit`。
3. `submit` 失败，不执行 `withdraw`。
4. `DEFAULT_API_MODE` 继续保持 `mock`；`cloud` 只通过开发者工具 console helper 显式切换。
5. 本轮不做脚本伪造 `OPENID` 的“假真实 smoke”。
6. 本轮不把 `notice-bff` 更宽写链路、`message-bff`、广场搜索真实行为算进首轮通过范围。

## 4. 必要错误样例

### 4.1 资料链路

- 发布方资料校验失败：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/publisher-bff.upsertProfile.validation-error.response.json`
- 达人名片校验失败：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/creator-bff.upsertCard.validation-error.response.json`

### 4.2 业务链路

- 报名前名片不完整：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.submit.creator-card-required.response.json`
- 撤回时状态不合法：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.withdraw.invalid-status.response.json`

## 5. 样本与证据目录

- dev 样本核查：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-miniprogram-dev-smoke-sample.mjs`
- 总摘要：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/summary.md`
- runtime：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/runtime/`
- smoke：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/smoke/`
- logs：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/logs/`

## 6. 执行记录模板

### 6.1 环境事实

- 微信开发者工具版本：`<待填写>`
- 小程序 `AppID`：`wxa6f615dcab1f984f`
- CloudBase 环境：`cloud1-4grxqg018586792d`
- 当前 runtime summary：`<待填写>`
- `devSmoke.prepare()` 输出：`<待填写>`
- `check-miniprogram-dev-smoke-sample.mjs` 输出：`<待填写>`

### 6.2 结果记录

| 步骤 | 结果 | 证据 | 备注 |
| --- | --- | --- | --- |
| `runtimeDebug.useCloud` | `<pass/fail/block>` | `<文件路径>` | `<待填写>` |
| `devSmoke.runFirstBatch` | `<pass/fail/block>` | `<文件路径>` | `<待填写>` |
| `request logs` | `<pass/fail/block>` | `<文件路径>` | `<待填写>` |

## 7. 回写要求

1. 回报必须分 4 段：环境事实、通过项、失败项、阻塞项。
2. 失败项至少带 `step / action / message / requestId`。
3. 若本轮只完成准备而未执行真实 `cloud` 调用，必须明确写：`当前仅完成 readiness，不宣称真实 smoke 已完成。`
