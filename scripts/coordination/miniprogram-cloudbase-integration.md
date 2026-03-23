# 小程序 CloudBase 接入说明（后端，R54）

## 1. 当前固定事实

- 小程序 `AppID`：`wxa6f615dcab1f984f`
- 当前 `dev` CloudBase 环境：`cloud1-4grxqg018586792d`
- 小程序默认仍保持：`DEFAULT_API_MODE=mock`
- 真实联调 runbook：`/Users/gy-vip/Desktop/KK_Crab/docs/engineering/MiniProgram-Real-Smoke-Runbook-R54.md`
- 小程序半自动 smoke 证据目录：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/`

说明：

1. `project.config.json` 已固定真实 `AppID`，换电脑后可直接导入。
2. `cloud` 模式只允许开发态显式切换，不默认开启，不暴露前台可见调试入口。
3. 本轮继续明确不做脚本伪造 `OPENID`；真实用户身份仍以开发者工具 / 真机提供的 `wxContext.OPENID` 为准。

## 2. 当前首批可联调函数

参考：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/cloudfunctions.available.json`

### `R54` 首轮真实 smoke 范围

- `user-bff.bootstrap`
- `publisher-bff.getProfile`
- `publisher-bff.upsertProfile`
- `creator-bff.getCard`
- `creator-bff.upsertCard`
- `application-bff.submit`
- `application-bff.withdraw`

### 已部署但本轮不主动扩面的函数

- `notice-bff.list`
- `notice-bff.detail`
- `notice-bff.myList`
- `notice-bff.createDraft`
- `notice-bff.updateDraft`
- `notice-bff.submitReview`
- `notice-bff.close`
- `notice-bff.republish`
- `application-bff.myList`
- `application-bff.detail`
- `application-bff.publisherList`
- `application-bff.publisherDetail`
- `application-bff.markViewed`
- `application-bff.markContactPending`
- `application-bff.markCommunicating`
- `application-bff.markRejected`
- `application-bff.markCompleted`
- `application-bff.revealCreatorContact`
- `message-bff.list`

## 3. 小程序开发态入口约束

### 3.1 初始化

真实 `cloud` 模式下仍走：

```ts
wx.cloud.init({
  env: 'cloud1-4grxqg018586792d',
  traceUser: true,
})
```

### 3.2 开发者控制台 helper

小程序已在 `App.globalData` 暴露以下 helper：

- `getApp().globalData.runtimeDebug.getSummary()`
- `getApp().globalData.runtimeDebug.useMock()`
- `getApp().globalData.runtimeDebug.useCloud(cloudEnvId?)`
- `getApp().globalData.runtimeDebug.clearRequestLogs()`
- `getApp().globalData.runtimeDebug.rerunBootstrap()`
- `getApp().globalData.devSmoke.prepare()`
- `getApp().globalData.devSmoke.getSummary()`
- `getApp().globalData.devSmoke.readPublisherProfile()`
- `getApp().globalData.devSmoke.upsertPublisherProfile()`
- `getApp().globalData.devSmoke.readCreatorCard()`
- `getApp().globalData.devSmoke.upsertCreatorCard()`
- `getApp().globalData.devSmoke.submitApplication(noticeId?)`
- `getApp().globalData.devSmoke.withdrawLatestApplication()`
- `getApp().globalData.devSmoke.runFirstBatch()`
- `getApp().globalData.requestDebug.getLogs()`

目的：

1. 不新增可见调试页面。
2. 不再手改 storage key。
3. 把首轮真实 smoke 收口成“控制台半自动”，而不是整轮人肉点 UI。

## 4. 首轮 smoke 顺序（固定）

1. `runtimeDebug.useCloud()`
2. `devSmoke.prepare()`
3. `devSmoke.runFirstBatch()`

`runFirstBatch()` 内部固定顺序：

1. `user-bff.bootstrap`
2. `publisher-bff.getProfile`
3. `publisher-bff.upsertProfile`
4. `creator-bff.getCard`
5. `creator-bff.upsertCard`
6. `application-bff.submit`
7. `application-bff.withdraw`

固定规则：

- `bootstrap` 失败，立即停止后续 smoke。
- 发布方 / 达人资料任一步失败，不进入 `submit`。
- `submit` 失败，不执行 `withdraw`。
- 本轮只接受 console helper 结果 + request logs 作为首轮主证据，不再要求完整逐页点击验证。

## 5. 样本与事实源

### contract / sample

- `user-bff`：`/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/user-bff.ts`
- `publisher-bff`：`/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/publisher-bff.ts`
- `creator-bff`：`/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/creator-bff.ts`
- `application-bff`：`/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/application-bff.ts`

配套样例：

- `scripts/api-samples/user-bff.bootstrap.*.json`
- `scripts/api-samples/publisher-bff.getProfile.*.json`
- `scripts/api-samples/publisher-bff.upsertProfile.*.json`
- `scripts/api-samples/creator-bff.getCard.*.json`
- `scripts/api-samples/creator-bff.upsertCard.*.json`
- `scripts/api-samples/application-bff.submit.*.json`
- `scripts/api-samples/application-bff.withdraw.*.json`

### dev 样本核查

- 样本核查脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-miniprogram-dev-smoke-sample.mjs`
- 固定优先 notice：`notice_202603160001`

说明：

1. 该脚本只负责确认“全局存在一条 active + future deadline 的候选通告样本”。
2. 该脚本不会、也不能伪造 `OPENID`；own notice / hasApplied / creatorCard completeness 仍以真实当前用户上下文为准。

## 6. 当前明确不做的事情

1. 不把 `DEFAULT_API_MODE` 改成 `cloud`。
2. 不新增前台可见 debug UI。
3. 不用脚本伪造 `OPENID` 做“假真实 smoke”。
4. 不在 `R54` 并发扩大到 `notice-bff` 更宽写链路、消息链路和广场 / 搜索真实行为。

## 7. 失败回传最小要求

若首轮执行失败，最少回传以下 4 项：

1. `runtime summary`
2. `devSmoke.runFirstBatch()` 结构化结果
3. `request logs`
4. 失败 `action / requestId / 错误文案 / 样本 noticeId（若有）`
