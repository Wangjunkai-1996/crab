# KK_Crab 项目接手说明（2026-03-27）

## 1. 这份文档给谁用

- 给新电脑、新会话、新窗口接手当前仓库时使用。
- 默认场景就是“在家里的电脑继续接手当前项目”，先恢复事实，再决定下一步，不沿用旧聊天记忆。

## 2. 当前项目真实状态

- 截至 `2026-03-26 19:20`，小程序主线已完成正式验收落盘。
- 当前小程序正式结论：`最终签收通过`。
- 页面最终结论分布：`签收通过 18 / 有条件通过 0 / 退回修复 0`。
- `R58` 技术验收最新复核结果：`ok=true / blocker=none / batch ok=true`。
- `R58` 页面盘点最新复核结果：`18` 页覆盖、`runtimeError=0`、`skeletonOnly=0`。
- 后台与后端当前都处于维护态，不再主动扩新主线功能，只处理未来回归重新暴露出的最小 blocker。
- 项目未完成的部分主要是并行资料和上线准备事项，不是当前小程序研发 blocker。

## 3. 接手时先看哪些文件

按下面顺序阅读：

1. `.control-state/current/handoff-miniapp-2026-03-25.md`
2. `.control-state/current/board.md`
3. `.control-state/current/decisions.md`
4. `.control-state/current/miniapp-signoff-conclusion-r63.md`
5. `miniprogram/evidence/r58/summary.md`
6. `miniprogram/evidence/r58/ui-inventory.md`

如果只想快速确认“项目现在是不是稳的”，至少先看第 `1`、`4`、`5`、`6` 项。

## 4. 在家里电脑的首次启动步骤

### 4.1 拉代码

```bash
git clone <你的仓库地址>
cd KK_Crab
git checkout main
git pull origin main
```

### 4.2 安装脚本依赖

项目里的技术验收脚本依赖装在 `scripts/` 目录下：

```bash
cd /path/to/KK_Crab/scripts
npm install
```

### 4.3 微信开发者工具准备

确保本机已安装微信开发者工具，并满足：

1. 已登录微信开发者工具账号
2. 已打开本项目小程序工程
3. 已开启“服务端口”

当前项目固定事实：

- `AppID=wxa6f615dcab1f984f`
- CloudBase 环境：`cloud1-4grxqg018586792d`

### 4.4 若要继续沿用当前多线协作方式

当前线上仓库主线在 `main`，本机历史上还额外使用过 3 个 worktree：

- `codex/admin-v1`
- `codex/backend-v1`
- `codex/mp-v1`

家里电脑不是必须复刻这 3 个 worktree；如果只是单人接手当前总控，直接用 `main` 就够了。

## 5. 接手后的最小验证命令

先跑固定预检：

```bash
node scripts/build-miniprogram-js.mjs
node scripts/check-miniprogram-tech-acceptance.mjs
```

如果要复核小程序真实技术基线，再跑：

```bash
WECHAT_DEVTOOLS_PORT=<你当前 DevTools 服务端口> node scripts/run-miniprogram-tech-acceptance-r58.mjs
WECHAT_DEVTOOLS_PORT=<你当前 DevTools 服务端口> node scripts/run-miniprogram-ui-inventory-r58.mjs
```

说明：

- `run-miniprogram-tech-acceptance-r58.mjs` 已补过恢复逻辑。
- 若固定 automation 端口 `9421` 没起来，脚本会自动切到新的 recovery 端口继续跑，不需要再把这类端口漂移误判成代码 blocker。

## 6. 这台新电脑上要特别注意什么

- 不要把旧 README 里“尚未进入正式代码开发”的历史表述当成当前事实，当前仓库已经是代码和验收并存状态。
- 不要把 DevTools 截图回落到缓存图误判成技术 blocker；当前它仍是非阻塞噪音。
- 不要把“技术验收已通过”直接外推成“提审资料、法院辖区、上线 owner 也全部完成”。
- 不要把明文密钥、账号、一次性密码写回仓库或 `.control-state/current/`。

## 7. 现在可以怎么表述项目状态

可以说：

- 小程序代码、技术验收、页面盘点和最终签收结论都已经落盘
- 小程序当前正式结论是 `最终签收通过`
- 当前仍可能继续做资料维护、上线准备和未来回归处理

不能说：

- “项目所有并行事项都已经结束”
- “今天的 live screenshot 一定都刷新成功了”
- “仓库里已经带着所有生产密钥，可直接换机无缝执行所有云端动作”

## 8. 如果在家里电脑继续推进，默认下一步建议

按优先级建议：

1. 先确认本机 DevTools、脚本依赖和 `main` 分支都能跑通预检
2. 再确认是否真的需要继续小程序研发主线
3. 如果不是继续修代码，就把主线切到资料维护、上线准备或其他并行事项

## 9. 一句话结论

- 这份仓库现在不是“文档先行、尚未开发”的状态，而是“小程序主线已开发完成并完成正式签收，后续以维护与并行收尾为主”的状态。
