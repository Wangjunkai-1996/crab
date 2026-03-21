# 小程序真实联调 Runbook（R54）

## 1. 目标

- 把小程序真实联调从“人肉逐页排查”收口成“开发者控制台半自动 smoke”。
- 只保留 1 次最小人工关口：微信开发者工具导入工程并在 console 执行固定命令。
- 换电脑后也能直接按本文档续接，不依赖聊天记录。

## 2. 当前固定事实

- 工程路径：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram`
- 脚本目录：`/Users/gy-vip/Desktop/KK_Crab-mp/scripts`
- 小程序 `AppID`：`wxa6f615dcab1f984f`
- 当前 `dev` CloudBase 环境：`cloud1-4grxqg018586792d`
- 默认 API 模式：`mock`
- 证据目录：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/`

## 3. 打开 DevTools 前固定预检

先在终端执行：

```bash
node /Users/gy-vip/Desktop/KK_Crab-mp/scripts/build-miniprogram-js.mjs
node /Users/gy-vip/Desktop/KK_Crab-mp/scripts/check-devtools-readiness.mjs
```

预期：

1. `.ts -> .js` 入口产物已生成，不再依赖 DevTools 自己兜底。
2. `project.config.json` 继续使用真实 `AppID`。
3. `tsc --noEmit` 通过。
4. 未发现已知 `WXML` 兼容性问题。

## 4. 导入步骤

1. 打开微信开发者工具。
2. 导入工程目录：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram`
3. 确认工程未回退成 `touristappid`。
4. 等待编译完成，不手改 storage key，不手改默认运行模式。

## 5. 开发者控制台固定命令

先执行：

```js
const app = getApp()
app.globalData.runtimeDebug.getSummary()
```

切到真实 `cloud`：

```js
await app.globalData.runtimeDebug.useCloud()
```

准备半自动 smoke：

```js
app.globalData.devSmoke.prepare()
app.globalData.devSmoke.getSummary()
```

执行首轮真实 smoke：

```js
const batch = await app.globalData.devSmoke.runFirstBatch()
batch
```

查看请求日志：

```js
app.globalData.requestDebug.getLogs()
```

如需单步复跑：

```js
await app.globalData.devSmoke.readPublisherProfile()
await app.globalData.devSmoke.upsertPublisherProfile()
await app.globalData.devSmoke.readCreatorCard()
await app.globalData.devSmoke.upsertCreatorCard()
await app.globalData.devSmoke.submitApplication()
await app.globalData.devSmoke.withdrawLatestApplication()
```

切回 `mock`：

```js
await app.globalData.runtimeDebug.useMock()
```

## 6. 首轮 smoke 固定顺序

`runFirstBatch()` 内部固定为：

1. `user-bff.bootstrap`
2. `publisher-bff.getProfile`
3. `publisher-bff.upsertProfile`
4. `creator-bff.getCard`
5. `creator-bff.upsertCard`
6. `application-bff.submit`
7. `application-bff.withdraw`

固定规则：

- `bootstrap` 失败即停止。
- 发布方 / 达人资料任一步失败，不进入 `submit`。
- `submit` 失败，不执行 `withdraw`。
- 首轮全绿后，下一轮才考虑扩大到 `notice-bff` 更宽链路、消息和广场真实行为。

## 7. 证据落点

- 运行态摘要：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/runtime/`
- 首轮 smoke 结果：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/smoke/`
- 请求日志：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/logs/`
- 总摘要：`/Users/gy-vip/Desktop/KK_Crab-mp/miniprogram/evidence/r54/summary.md`

## 8. 回填建议

最小回填物：

1. `runtimeDebug.getSummary()` 或 `devSmoke.getSummary()` 输出
2. `devSmoke.runFirstBatch()` 返回对象
3. `requestDebug.getLogs()` 输出
4. 1 张关键截图（可选；若 console 结果已经够清楚，可不补多张）

## 9. 失败时固定回传格式

### 环境事实

- DevTools 版本：`<填写>`
- AppID：`wxa6f615dcab1f984f`
- Cloud 环境：`cloud1-4grxqg018586792d`
- 当前 runtime summary：`<粘贴>`

### 通过项

- `<填写>`

### 失败项

- `step`：`<填写>`
- `action`：`<填写>`
- `message`：`<填写>`
- `requestId`：`<填写>`

### 阻塞项

- `<填写>`

## 10. 本轮明确不做

1. 不把 `DEFAULT_API_MODE` 改成 `cloud`
2. 不新增前台可见 debug UI
3. 不用脚本伪造 `OPENID`
4. 不再把“人工逐页点 UI”作为首轮唯一执行路径
