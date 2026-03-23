# 小程序真实联调 Runbook（R53）

## 1. 目标

- 把 `R53` 的小程序真实联调固定成一套换电脑也能直接照做的流程。
- 今晚只完成 readiness；明早人工只剩 1 个关口：微信开发者工具导入工程并执行首轮真实 smoke。

## 2. 当前固定事实

- 工程路径：`/Users/gy-vip/Desktop/KK_Crab/miniprogram`
- 小程序 `AppID`：`wxa6f615dcab1f984f`
- 当前 `dev` CloudBase 环境：`cloud1-4grxqg018586792d`
- 默认 API 模式：`mock`
- 证据目录：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/`

## 3. 导入步骤

1. 打开微信开发者工具。
2. 导入 `miniprogram` 工程目录：`/Users/gy-vip/Desktop/KK_Crab/miniprogram`
3. 确认工程未再显示 `touristappid`，`project.config.json` 中应为真实 `AppID`。
4. 等工程编译完成，不手改 storage key、不手改代码里的默认模式。

## 4. 开发者控制台固定命令

先在 console 中执行：

```js
const app = getApp()
app.globalData.requestDebug.setEnabled(true)
app.globalData.runtimeDebug.getSummary()
```

切到真实 `cloud`：

```js
app.globalData.runtimeDebug.useCloud().then(console.log)
```

如需显式指定环境：

```js
app.globalData.runtimeDebug.useCloud('cloud1-4grxqg018586792d').then(console.log)
```

强制重跑 `bootstrap`：

```js
app.globalData.runtimeDebug.rerunBootstrap().then(console.log)
```

查看 / 清理请求日志：

```js
app.globalData.requestDebug.getLogs()
app.globalData.runtimeDebug.clearRequestLogs()
```

切回 `mock`：

```js
app.globalData.runtimeDebug.useMock().then(console.log)
```

## 5. 明早固定执行顺序

1. `bootstrap`
2. 发布方资料读写
3. 达人资料读写
4. `application-bff.submit`
5. `application-bff.withdraw`

固定规则：

- `bootstrap` 失败即停止，不继续后续链路。
- 资料链路失败，只修资料链路，不扩到消息、广场、发布全量。
- 首轮全绿后，下一轮才扩大到 `notice-bff`、消息与发布侧更宽链路。

## 6. 证据落点

- 运行态摘要与请求日志：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/runtime/`
- bootstrap 结果：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/bootstrap/`
- 资料读写：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/profile/`
- 报名提交 / 撤回：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/application/`
- 总摘要：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r53/summary.md`

## 7. 失败时的固定回传格式

若失败，请直接按下面格式回填到摘要或回报里：

### 环境事实

- DevTools 版本：`<填写>`
- AppID：`wxa6f615dcab1f984f`
- Cloud 环境：`cloud1-4grxqg018586792d`
- 当前 runtime summary：`<粘贴>`

### 通过项

- `<填写>`

### 失败项

- `action`：`<填写>`
- `页面/步骤`：`<填写>`
- `错误文案`：`<填写>`
- `requestId`：`<填写>`

### 阻塞项

- `<填写>`

## 8. 本轮明确不做

1. 不把 `DEFAULT_API_MODE` 改成 `cloud`
2. 不新增前台可见 debug UI
3. 不用脚本伪造 `OPENID`
4. 不在 `R53` 首轮把广场、消息、发布全链路一口气拉进真实 smoke
