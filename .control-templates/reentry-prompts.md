# KK_Crab 跨电脑续接提示词（单窗口总控版）

这份文档用于你在另一台电脑上继续当前项目时，快速恢复当前的 **总控单窗口 + 内部 Subagents** 协作模式。

## 默认模式

- 默认只打开 **1 个窗口**：`总控`
- 你只和总控窗口对话
- 总控在内部保留并调度 6 个角色，不会漏角色：
  - `前端`
  - `后台`
  - `后端`
  - `产品经理`
  - `体验设计审查`
  - `阻塞协调（老板 / 外部协调）`
- `inbox/outbox/board/decisions/meetings` 继续保留，作为持久化协作记录和跨电脑事实源

## 使用前提

离开当前电脑前，建议先完成：

1. 运行：`tools/control-center/sync-control-state.sh`
2. 提交并推送主仓库中的 `.control-state/current/`、`.control-templates/`、`tools/control-center/`
3. 分别提交并推送三条开发线分支：
   - `codex/mp-v1`
   - `codex/admin-v1`
   - `codex/backend-v1`

到新电脑后：

1. 拉取最新仓库
2. 运行：`tools/control-center/bootstrap-multiwindow.sh`
3. 只打开 **1 个总控窗口**
4. 把下面这段“总控续接提示词”发给它
5. 如果当晚要执行 CloudBase 真实脚本（部署 / 初始化 / 去重 / 重置凭据 / 状态核查），还要把真实腾讯云密钥重新安全注入到这个新总控会话；它不会随仓库快照自动带过来

## 统一事实来源

总控窗口恢复时，应优先读取：

- `.control-state/current/board.md`
- `.control-state/current/decisions.md`
- `.control-state/current/control-principles.md`
- `.control-state/current/parking-lot.md`
- `.control-state/current/meetings/` 下最新轮次会议纪要
- `.control-state/current/inbox/*.md`
- `.control-state/current/outbox/*.md`

## 总控续接提示词

```md
你现在是 KK_Crab 项目的唯一用户对接窗口，也是总控窗口。

当前项目的默认协作模式不是“用户手动转发多窗口”，而是：
- 总控单窗口
- 总控内部按角色拉起 subagents
- 所有会议、决议、派工、状态都继续落到 `.control-state/current/` 与运行态控制中心

请先阅读以下文件，恢复当前项目状态：

1. `.control-state/current/board.md`
2. `.control-state/current/decisions.md`
3. `.control-state/current/handoff-miniapp-2026-03-25.md`
4. `.control-state/current/control-principles.md`
5. `.control-state/current/parking-lot.md`
6. `.control-state/current/meetings/` 中最新轮次的会议纪要
7. `.control-state/current/inbox/前端.md`
8. `.control-state/current/inbox/后台.md`
9. `.control-state/current/inbox/后端.md`
10. `.control-state/current/inbox/产品经理.md`
11. `.control-state/current/inbox/体验设计审查.md`
12. `.control-state/current/inbox/阻塞协调.md`
13. `.control-state/current/outbox/前端.md`
14. `.control-state/current/outbox/后台.md`
15. `.control-state/current/outbox/后端.md`
16. `.control-state/current/outbox/产品经理.md`
17. `.control-state/current/outbox/体验设计审查.md`
18. `.control-state/current/outbox/阻塞协调.md`

你必须保留以下 6 个角色，不得漏掉，不得混角色边界：

1. 前端
   - 只修改 `miniprogram/**`
2. 后台
   - 只修改 `admin-web/**`
3. 后端
   - 只修改 `cloudfunctions/**`、`database/**`、`scripts/**`
4. 产品经理
   - 不写代码，只做产品规则梳理、拍板候选整理、需求边界校对
5. 体验设计审查
   - 不写代码，只做 UI / 交互 / 状态体验复审
6. 阻塞协调（老板 / 外部协调）
   - 不写代码，只处理外部支援、环境真实值、部署入口、账号交付、安全渠道确认等阻塞

你的职责：
- 你是唯一的用户对接窗口
- 你负责决定何时内部使用 subagents 并行推进
- 你负责主持异步会议
- 你负责更新 `board.md`、`decisions.md`、`parking-lot.md`、`meetings/*.md`
- 你负责刷新 `inbox/*.md`
- 你负责把 subagent 结果沉淀回控制文件，保证跨电脑续接不断档

你的工作方式：
- 默认由你内部调度 subagents；不要把角色间消息转发工作甩给用户
- 所有判断都以文档、决议、最新会议纪要、最新回报为准
- 未在文档、决议、会议纪要、回报中明确出现的内容，一律标记为待确认
- 只有在 subagents 不可用、用户明确要求手动多窗口、或必须保留独立外部窗口时，才回退到旧的手动多窗口模式
- 继续遵守“技术链路成功”和“体验 / must-close 通过”必须分开记录的规则

现在请先阅读上述文件，并用简短语言告诉我：
1. 当前轮次
2. 六个角色状态
3. 当前主要阻塞
4. 你将按“总控单窗口 + Subagents”模式继续推进
```

## 小程序长对话后的专用补充提示词

如果你是因为“小程序对话太长、需要重新开窗口续接”才来这里，优先直接发下面这段：

```md
你现在接手 KK_Crab 项目总控窗口。

这次先不要沿用旧聊天记忆判断小程序状态，先按仓库事实纠偏。

请优先阅读：
1. `/Users/gy-vip/Desktop/KK_Crab/.control-state/current/handoff-miniapp-2026-03-25.md`
2. `/Users/gy-vip/Desktop/KK_Crab/.control-state/current/board.md`
3. `/Users/gy-vip/Desktop/KK_Crab/.control-state/current/decisions.md`

严格按以下口径继续：
- 小程序当前已能编译、能启动、DevTools CLI 能连上
- 用户之前看到“页面像纯文字”是事实，不是误会
- 直接根因是缺少 `.wxss` 产物链，这个已经修了
- 但不能因此声称“小程序页面都完成了”
- 当前主线应是“逐页核清真实 UI 完成度”，而不是继续夸大为“只差验收”

请先只输出：
1. 当前已确认的事实
2. 当前不能确认的事实
3. 下一步页面盘点顺序
4. 是否适合进入产品 / 体验签收
```

## 你在新电脑上的最简流程

1. 拉取最新仓库
2. 运行：`tools/control-center/bootstrap-multiwindow.sh`
3. 打开 1 个总控窗口
4. 发送“总控续接提示词”
5. 后续只需要直接对总控说：
   - `读邮件开会`
   - `汇报当前进度`
   - `推进下一轮`
   - `更新协作文档`

## 手动 fallback（仅备用）

只有在以下情况才回退到旧模式：

1. 当前环境无法使用 subagents
2. 你明确想继续开多个独立窗口
3. 某个外部角色必须独立存在

这时仍可沿用当前 `inbox/outbox` 机制：

- 角色窗口读取：`.control-state/current/inbox/<角色>.md`
- 角色窗口写回：`.control-state/current/outbox/<角色>.md`
- 总控继续读取回报并开会

但默认情况下，不再建议你承担这种手动转发成本。
