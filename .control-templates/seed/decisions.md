# KK_Crab 已拍板事项

- 更新时间：`__GENERATED_AT__`
- 当前轮次：`__CURRENT_ROUND__`

## 协作机制

- [x] 使用三套独立 `git worktree` 并行开发：前端 / 后台 / 后端
- [x] 使用“总控单窗口 + 内部 Subagents + 会议落盘”作为默认协作机制
- [x] 总控窗口负责维护 `board.md`、`decisions.md`、`parking-lot.md`、`meetings/*.md`
- [x] 用户默认只与总控窗口对接，不再承担角色间消息转发
- [x] 保留 `前端`、`后台`、`后端`、`产品经理`、`体验设计审查`、`阻塞协调` 六个角色，不因切换协作方式而丢失
- [x] `inbox/outbox/board/decisions/meetings` 继续保留，作为总控与内部 subagents 的持久化协调介质，也是跨电脑续接事实源
- [x] 跨电脑续接时，以仓库内 `.control-state/current/` 和 `.control-templates/reentry-prompts.md` 为准
- [x] 只有在 subagents 不可用、用户明确要求手动多窗口、或必须保留独立外部窗口时，才回退到旧的手动多窗口模式
- [x] `产品经理`、`体验设计审查` 与 `阻塞协调` 作为按需启用的专项角色，也使用同一套 `inbox/outbox` 机制

## 当前开发边界

- [x] 前端只修改 `miniprogram/**`
- [x] 后台只修改 `admin-web/**`
- [x] 后端只修改 `cloudfunctions/**`、`database/**`、`scripts/**`
- [x] `产品经理`、`体验设计审查` 与 `阻塞协调` 不写代码、不直接修改共享控制文件
- [x] 各角色都不直接修改其他线目录

## 当前轮次已定策略

- [x] 前端继续保留 mock，不自创业务规则、权限规则、联系方式释放逻辑
- [x] 后台优先接入真实 `admin-auth`，其余后台业务接口继续 mock
- [x] 后端下一轮优先补后台管理接口 DTO 与样例，不优先扩展 `mine/profile`

## 接下来新增决策的记录规则

1. 每条决策只记录已拍板结论，不记录拉扯过程。
2. 未拍板问题一律进入 `parking-lot.md`。
3. 如决策发生变更，在原条目下补充“变更时间 + 新结论”。
