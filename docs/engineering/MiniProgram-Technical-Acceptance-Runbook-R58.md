# 小程序技术验收 Runbook（R58）

## 1. 目标

- 把小程序从“代码完成但未正式验收”推进到“技术验收通过，具备进入产品 / 体验签收的前置条件”。
- 本轮只做技术验收，不做最终产品 / 体验签收。
- 人工动作压缩到 1 个前置门槛：开启微信开发者工具服务端口。

## 2. 当前固定事实

- 工程目录：`/Users/gy-vip/Desktop/KK_Crab/miniprogram`
- 脚本目录：`/Users/gy-vip/Desktop/KK_Crab/scripts`
- 小程序 `AppID`：`wxa6f615dcab1f984f`
- 当前 `dev` CloudBase 环境：`cloud1-4grxqg018586792d`
- 默认 API 模式：`mock`
- `R58` 证据目录：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r58/`
- DevTools 服务端口已改为自动发现，优先跟随当前已打开的 DevTools 实际监听端口

## 3. 固定预检 Gate

优先执行：

```bash
node /Users/gy-vip/Desktop/KK_Crab/scripts/check-miniprogram-tech-acceptance.mjs
```

若需要分步看：

```bash
node /Users/gy-vip/Desktop/KK_Crab/scripts/build-miniprogram-js.mjs
node /Users/gy-vip/Desktop/KK_Crab/scripts/check-devtools-readiness.mjs
node /Users/gy-vip/Desktop/KK_Crab/scripts/check-wechat-devtools-cli.mjs
```

预期：

1. `.ts -> .js` 入口产物完整。
2. `project.config.json` 保持真实 `AppID`。
3. `tsc --noEmit` 通过。
4. 无已知 `WXML` 编译兼容问题。
5. 已发现 `R58` auto-smoke 启动链路。
6. DevTools CLI 可连通当前真实监听端口。

## 4. 唯一人工前置动作

打开微信开发者工具：

1. 点击顶部菜单 `微信开发者工具`
2. 进入 `设置`
3. 打开 `安全设置`
4. 开启 `服务端口`

然后重新执行：

```bash
node /Users/gy-vip/Desktop/KK_Crab/scripts/check-wechat-devtools-cli.mjs
```

如果脚本明确提示“请先在微信开发者工具右上角重新登录微信账号”，先完成登录，再继续后续步骤。

## 5. 一键技术验收入口

优先使用仓库内一键脚本：

```bash
/usr/local/bin/node /Users/gy-vip/Desktop/KK_Crab/scripts/run-miniprogram-tech-acceptance-r58.mjs
```

如果你明确知道当前服务端口，也可以手动覆盖：

```bash
WECHAT_DEVTOOLS_PORT=59655 /usr/local/bin/node /Users/gy-vip/Desktop/KK_Crab/scripts/run-miniprogram-tech-acceptance-r58.mjs
```

该脚本会固定执行：

1. `build-miniprogram-js`
2. `check-devtools-readiness`
3. `check-wechat-devtools-cli`
4. `cli open`
5. `cli auto --debug`
6. 回写 `miniprogram/evidence/r58/summary.md`
7. 回写 `miniprogram/evidence/r58/runtime/tech-acceptance-run.json`

## 6. `auto-smoke` 启动参数

固定 compile / query 参数：

- `__dev_auto_smoke=1`
- `__dev_runtime=cloud`

含义：

1. 自动开启 request debug
2. 自动切到 `cloud`
3. 自动重跑 `bootstrap`
4. 自动执行 `devSmoke.runFirstBatch()`
5. 自动执行关键页面技术冒烟
6. 自动输出单一 tagged 结果：`AUTO_SMOKE_RESULT::...`

## 7. 成功标准

### 6.1 Runtime

`runtimeSummary` 必须满足：

- `activeMode=cloud`
- `cloudReady=true`
- `bootstrapError=''`

### 6.2 Batch

`runFirstBatch()` 固定 7 步全部 `ok=true`：

1. `user-bff.bootstrap`
2. `publisher-bff.getProfile`
3. `publisher-bff.upsertProfile`
4. `creator-bff.getCard`
5. `creator-bff.upsertCard`
6. `application-bff.submit`
7. `application-bff.withdraw`

### 6.3 页面技术冒烟

固定覆盖：

1. `广场`
2. `发布`
3. `消息`
4. `我的`
5. `notice-detail`
6. `creator/apply`
7. `creator/application-list`
8. `publish/notice-list`
9. `publish/application-manage`

验收标准：

- 无 WXML 编译错误
- 无运行时红屏异常
- 页面可进入且落到 `ready / empty / error / arrived` 之一

## 8. 证据目录

- runtime：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r58/runtime/`
- smoke：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r58/smoke/`
- logs：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r58/logs/`
- summary：`/Users/gy-vip/Desktop/KK_Crab/miniprogram/evidence/r58/summary.md`

## 9. 当前已知阻塞

截至 `2026-03-25`，`R58` 当前已确认：

1. DevTools 登录态已恢复，不再把“重新登录”当主阻塞
2. 当前主阻塞已切到：DevTools 服务端口可能漂移，脚本需跟随当前真实监听端口
3. 预检脚本与一键验收脚本已支持自动发现端口；若仍失败，再看 `AUTO_SMOKE_RESULT::` 是否产出
4. 在未观察到 `AUTO_SMOKE_RESULT::` 之前，不把页面逻辑误判成主问题

## 10. Console 降级方案

若 DevTools CLI 仍不能稳定驱动，只允许一次性 console fallback：

```js
(async () => {
  const app = getApp()
  app.globalData.requestDebug.setEnabled(true)
  await app.globalData.runtimeDebug.useCloud()
  const batch = await app.globalData.devSmoke.runFirstBatch()
  console.log('AUTO_SMOKE_RESULT::' + JSON.stringify({
    runtimeSummary: app.globalData.runtimeDebug.getSummary(),
    batch,
    steps: batch.steps,
    requestLogs: app.globalData.requestDebug.getLogs(),
    generatedAt: new Date().toISOString(),
  }))
})()
```

说明：

- 这是 fallback，不是主路径。
- 不再回退成人肉逐页点页面。

## 11. 失败时固定回传

只回传以下 4 段：

1. 环境事实
2. 通过项
3. 失败项
4. 阻塞项

失败项必须至少带：

- `step`
- `action`
- `message`
- `requestId`

## 12. 本轮明确不做

1. 不改任何公开业务 API / admin contract
2. 不把 `DEFAULT_API_MODE` 改成 `cloud`
3. 不新增任何正式用户可见 debug UI
4. 不做脚本伪造 `OPENID`
5. 不把“代码自测通过”写成“已正式验收”
