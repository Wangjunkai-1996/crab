# KK_Crab 中控模板（单窗口总控 + Subagents）

## 设计目标

这套模板用于解决两个问题：

1. **可移植**：模板、规则、会议结构放在仓库内，换电脑后只要拉取仓库即可恢复。
2. **可共享**：运行态控制中心放在仓库外的共享目录，供主仓库、三个代码工作树，以及总控内部 subagents 共用。
3. **可续接**：换电脑后默认只恢复 1 个总控窗口，而不是要求用户重新手动维护 7 个聊天窗口。

## 结构说明

### 仓库内（可提交、可迁移）

- `/.control-templates/seed/`：控制中心种子文件
- `/.control-templates/seed/control-principles.md`：总控防错原则模板
- `/.control-templates/reentry-prompts.md`：换电脑后单窗口总控续接提示词（含手动多窗口 fallback）
- `/tools/control-center/bootstrap-control-center.sh`：重建共享控制中心脚本
- `/tools/control-center/sync-control-state.sh`：把仓库外运行态回写为仓库内快照
- `/tools/control-center/bootstrap-multiwindow.sh`：在新电脑上一键恢复三工作树 + 共享控制中心
- `/.control-state/current/`：最近一次已同步的中控状态快照

### 仓库外（运行态、共享态）

脚本默认会在主仓库同级目录生成：

- `<主仓库名>-control/`

例如当前项目主仓库为 `KK_Crab`，则运行态目录为：

- `../KK_Crab-control/`

## 为什么不把运行态直接放进仓库

因为当前项目使用了多套 `worktree` 并行开发。若把运行态文件直接放进某个工作树：

1. 其他工作树无法实时看到未提交变更
2. 不同工作树容易各自维护一份“伪同步”的控制文件
3. 会议记录与收件箱会分叉

因此采用：

- **仓库内存模板**
- **仓库外跑运行态**

## 当前电脑离开前建议动作

为了保证回家后能无缝继续，需要先把“最新会议状态”和“最新代码分支”都同步出去。

建议顺序：

1. 运行中控状态同步脚本

```bash
tools/control-center/sync-control-state.sh
```

2. 提交并推送主仓库中的控制模板和状态快照
3. 分别在 `前端 / 后台 / 后端` 三个工作树中提交并推送各自分支

说明：

- 运行态控制中心在仓库外，**不会被 Git 自动带走**
- 所以必须先执行同步脚本，把最新会议状态写回仓库内的 `.control-state/current/`

## 新电脑恢复方式

在新电脑拉取最新仓库后，执行：

```bash
tools/control-center/bootstrap-multiwindow.sh
```

它会尝试：

1. 恢复 `前端 / 后台 / 后端` 三个工作树
2. 根据仓库内最新状态快照重建共享控制中心
3. 让你可以只打开 **1 个总控窗口** 继续工作
4. 保留旧的手动多窗口模式作为 fallback

## 仅重建共享控制中心

在任意一个工作树或主仓库中执行：

```bash
tools/control-center/bootstrap-control-center.sh
```

如需强制用当前模板覆盖运行态文件：

```bash
tools/control-center/bootstrap-control-center.sh --force
```

说明：

- 若 `.control-state/current/` 有内容，脚本会优先用“最新状态快照”恢复
- 若没有状态快照，才会退回到 `/.control-templates/seed/` 模板

## 运行态关键文件

- `README.md`：中控说明
- `board.md`：总进度表
- `decisions.md`：已拍板规则
- `parking-lot.md`：待拍板事项停车场
- `meetings/`：会议纪要
- `inbox/`：各线收件箱
- `outbox/`：各线回报箱

## 建议工作流

### 默认模式：总控单窗口 + Subagents

1. 用户只对接总控窗口
2. 总控先读取 `board.md`、`decisions.md`、最新 `meetings/Rxx.md` 与相关 `inbox/outbox`
3. 总控按角色在内部拉起 subagents：`前端 / 后台 / 后端 / 产品经理 / 体验设计审查 / 阻塞协调`
4. 各 subagent 严格遵守既有职责边界推进
5. 总控把会议结论、派工与关键状态回写到 `board.md`、`decisions.md`、`parking-lot.md`、`meetings/*.md`、`inbox/*.md`
6. 用户只看总控汇报，不再承担角色间消息转发

### 手动 fallback：多窗口 + inbox/outbox

仅在以下场景使用：

1. 当前环境无法使用 subagents
2. 用户明确要求继续手动多窗口
3. 某些角色必须作为独立外部窗口存在

补充约定：

- fallback 模式下，若角色窗口仍在线，只发送一句：`请读取收件箱并继续。`
- 只有在新开窗口、窗口失忆、或换电脑恢复时，才使用 `/.control-templates/reentry-prompts.md` 中的长提示词。
