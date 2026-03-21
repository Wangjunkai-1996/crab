# KK_Crab 中控说明（单窗口总控 + Subagents）

## 生成来源

- 模板来源：`__REPO_ROOT__/.control-templates/seed`
- 生成时间：`__GENERATED_AT__`
- 当前轮次：`__CURRENT_ROUND__`

## 目的

把“用户手动转发多窗口”改成“总控单窗口 + 内部 Subagents + 会议落盘”模式。

## 路径

- 总进度表：`__RUNTIME_DIR__/board.md`
- 已拍板事项：`__RUNTIME_DIR__/decisions.md`
- 待拍板停车场：`__RUNTIME_DIR__/parking-lot.md`
- 会议纪要目录：`__RUNTIME_DIR__/meetings/`
- 前端收件箱：`__RUNTIME_DIR__/inbox/前端.md`
- 后台收件箱：`__RUNTIME_DIR__/inbox/后台.md`
- 后端收件箱：`__RUNTIME_DIR__/inbox/后端.md`
- 前端回报箱：`__RUNTIME_DIR__/outbox/前端.md`
- 后台回报箱：`__RUNTIME_DIR__/outbox/后台.md`
- 后端回报箱：`__RUNTIME_DIR__/outbox/后端.md`
- 产品经理收件箱：`__RUNTIME_DIR__/inbox/产品经理.md`
- 体验设计审查收件箱：`__RUNTIME_DIR__/inbox/体验设计审查.md`
- 产品经理回报箱：`__RUNTIME_DIR__/outbox/产品经理.md`
- 体验设计审查回报箱：`__RUNTIME_DIR__/outbox/体验设计审查.md`
- 阻塞协调收件箱：`__RUNTIME_DIR__/inbox/阻塞协调.md`
- 阻塞协调回报箱：`__RUNTIME_DIR__/outbox/阻塞协调.md`

## 工作协议

1. 用户默认只对接总控窗口。
2. 总控窗口在内部按角色拉起 subagents：`前端 / 后台 / 后端 / 产品经理 / 体验设计审查 / 阻塞协调`。
3. 各角色职责边界不变，代码写入边界不变。
4. 总控窗口根据文档、回报与 subagent 结果更新 `board.md`、`decisions.md`、`parking-lot.md`、`meetings/*.md`、`inbox/*.md`。
5. `inbox/outbox` 继续保留，作为持久化协作记录和跨电脑事实源。
6. 如发现共享规则缺失，只写入“阻塞项”或“需要其他线配合”。


### 专项角色

- `产品经理`、`体验设计审查` 与 `阻塞协调` 继续保留，不因切换到 subagents 而消失。
- 这三个角色与 `前端 / 后台 / 后端` 一起，构成总控内部必须保留的 6 个角色。
- 若需要 fallback 到手动多窗口模式，它们仍沿用同一套 `inbox/outbox` 机制。

## 触发方式

### 发给总控窗口

- `读邮件开会`
- `推进下一轮`
- `汇报当前进度`
- `更新协作文档`
- `读取某角色最新状态`

说明：

1. 默认只和总控窗口对话。
2. 总控负责内部调度，不再要求用户手动在角色窗口之间转发。

### 手动 fallback 模式

只有在 subagents 不可用、用户明确要求多窗口、或某些角色必须独立存在时，才使用旧模式：

- 在线角色窗口短触发：`请读取收件箱并继续。`
- 新窗口 / 换电脑恢复：使用仓库内 `/.control-templates/reentry-prompts.md` 的 fallback 说明

## 换电脑如何恢复

### 当前电脑离开前

先执行：

```bash
tools/control-center/sync-control-state.sh
```

然后提交并推送：

1. 主仓库中的控制模板与 `.control-state/current/`
2. 三个工作树分支中的最新代码

### 新电脑恢复

拉取仓库后，优先执行：

```bash
tools/control-center/bootstrap-multiwindow.sh
```

如只想重建共享控制中心，也可执行：

```bash
tools/control-center/bootstrap-control-center.sh --force
```

说明：

1. `bootstrap-multiwindow.sh` 会尝试恢复三工作树与共享控制中心
2. 恢复完成后，默认只打开 1 个总控窗口继续工作
3. `bootstrap-control-center.sh` 仅重建共享控制中心

## 例行轮次与重进场的区别

1. 默认模式：用户只对接总控窗口，由总控内部调度 subagents。
2. fallback 模式：总控更新完 `inbox/*.md` 后，才向在线角色窗口发送一句 `请读取收件箱并继续。`
3. 重进场：换电脑恢复时，默认使用 `reentry-prompts.md` 里的总控续接提示词。
