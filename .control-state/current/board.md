# KK_Crab 总进度表

## 项目状态

- 当前模式：总控单窗口 + Subagents + 会议落盘
- 当前轮次：R63
- 更新时间：2026-03-26 18:52
- 总控窗口：负责更新本表、会议纪要、各线收件箱，并在需要时内部调度六个角色

## 协作规则

1. 每轮结束后，由总控窗口读取各角色回报并输出会议纪要。
2. 已拍板事项只写进会议纪要和本进度表，不口头漂移。
3. 各角色只读取自己的收件箱，不直接改其他线目录和共享文档。
4. 共享规则缺失时，先登记为阻塞项或协作需求，由总控统一裁决。
5. 在后台访问地址、管理员账号或产品拍板未到位前，各角色继续推进非阻塞任务，不空等。
6. 真实密钥、初始密码等敏感值不得写入同步文档、仓库快照或证据文件，只能通过安全渠道单独转交。
7. 用户默认只与总控窗口对接；总控应优先内部协调各角色，而不是要求用户手动转发。
8. `inbox/outbox` 继续保留，作为总控与内部角色的持久化状态层，也是换电脑续接事实源。

## 开发线状态

| 线别 | 当前状态 | 当前轮次 | 说明 |
| --- | --- | --- | --- |
| 前端 | 维护中 | R63 | `8` 页升档冲刺已完成并补齐一轮 CloudBase 最小真实样本；`R63` 正式结论已升级为 `最终签收通过`，当前页面最终结论更新为 `签收通过 18 / 有条件通过 0 / 退回修复 0` |
| 后台 | 维护中 | R63 | 治理域真实读 `r52` 基线继续稳定；`R63` 未暴露新的后台共享 blocker，默认继续维护态 |
| 后端 | 维护中 | R63 | 已为 `R63` 提供最小样本支援并补齐 `publish-application-manage / report-records / search` 所需真实样本；当前小程序主线已无后端最小支援待办 |

## 专项角色状态

| 角色 | 当前状态 | 当前轮次 | 说明 |
| --- | --- | --- | --- |
| 产品经理 | 已完成 | R63 | 已按 `R63` 最新收口结果刷新产品侧正式结论；当前整体支持“小程序最终签收通过”，并转入并行资料维护态 |
| 体验设计审查 | 已完成 | R63 | 已按 `R63` 最新收口结果刷新体验侧正式结论；当前整体支持“小程序最终签收通过” |
| 阻塞协调（老板/外部协调） | 待命 | R63 | 当前小程序主线已无外部环境 blocker；法院辖区、提审资料和 owner 台账继续并行维护，不占小程序主链 |

## 轮次任务看板

### 前端

- [x] 搭建 `miniprogram/` 工程骨架
- [x] 完成 4 个主 Tab 与主包 / 分包结构
- [x] 建立请求层、store、mock adapter、页面骨架
- [x] 完成 `bootstrap` 真联调切换准备
- [x] 补齐 TypeScript 静态编译检查
- [x] 细化 `packages/creator/apply` 与 `packages/publish/application-manage`
- [x] 收口首批 `application-bff` / `creator-bff` / `publisher-bff` / `user-bff` 类型
- [x] 收口 `notice-bff.list/detail`、`message-bff.list`、`application-bff.myList/detail` 页面消费字段
- [x] 将真实请求切换继续集中到 `service/request` 层
- [x] 统一采用“我的报名列表”安全降级路径，避免假直跳
- [x] 补齐发布侧 `application-bff.publisherList/publisherDetail` 的 service 适配层
- [x] 补齐 `creator-bff.getCard` / `publisher-bff.getProfile` 首创空态承接
- [x] 输出关键状态页清单第一版
- [x] 直接按正式 sample 收紧 `notice-bff.myList`、`application-bff.publisherList/publisherDetail` 的字段边界
- [x] 补充关键状态页证据材料或不可提供原因说明
- [x] 对接 `application-bff` 发布侧动作与 `notice-bff` 写接口真实请求承接通道
- [x] 对接达人侧 `application-bff.submit/withdraw` 真实请求承接通道
- [x] 按 UX gap review 补 5 组高优先级替代证据
- [x] 把资料读写链路的 real-ready 事实补进前端回报
- [x] 把 `bootstrap` / runtime switch / cloud request 收敛到单点切换层
- [x] 将消息页报名类消息入口安全降级到“我的报名列表”
- [x] 复核真实 smoke 前置口径，不把主体初始化成功回传误写成整体验证已完成
- [x] 再次通过小程序 `tsc --noEmit`
- [x] 将 `project.config.json` 切到真实 `AppID=wxa6f615dcab1f984f`
- [x] 预置 `DEFAULT_CLOUD_ENV_ID=cloud1-4grxqg018586792d`，同时继续保持 `DEFAULT_API_MODE=mock`
- [x] 在 `App.globalData` 暴露 `runtimeDebug` helper 与请求日志 console 入口，不新增可见 debug UI
- [x] 落 `miniprogram/evidence/r53/` 证据目录模板与仓库内 runbook，确保换电脑后可直接接力
- [x] 暴露 `App.globalData.devSmoke` 半自动 helper，并固定 `runFirstBatch()` 顺序与失败短路规则
- [x] 固化 `build-miniprogram-js.mjs` 与 `check-devtools-readiness.mjs`，把 `.ts -> .js` 产物生成与导入前预检纳入固定流程
- [x] 补齐 `evidence/r54` 结构与 `MiniProgram-Real-Smoke-Runbook-R54.md`
- [x] 冻结“立即执行 DevTools 真实 smoke”主线，不再把用户当前是否手动跑 console 当作推进前提
- [x] 保留 `R54` 的 helper / runbook / 证据位，作为未来恢复真实 `cloud` 窗口时的固定入口
- [x] 新增 `scripts/run-miniprogram-tech-acceptance-r58.mjs` 作为一键技术验收入口
- [x] 产出 `R58` 首轮结构化技术验收证据
- [x] 已重新接通微信开发者工具 CLI，当前可确认 `ideConnected=true`、`servicePortEnabled=true`
- [x] 已补齐小程序 `.scss -> .wxss` 样式构建链，修复“页面像纯文字”这一关键缺口
- [x] 基于真实运行中的小程序页面，完成 `18` 个注册页的页面盘点矩阵
- [x] 将 `R58` 页面完成度证据固定到 `miniprogram/evidence/r58/runtime/ui-inventory.json` 与 `miniprogram/evidence/r58/ui-inventory.md`
- [x] 在完成 UI 完成度盘点前，不再宣称“小程序页面已完成”或“只差真实 smoke”
- [x] 只修当前真实 `P0/P1` 缺口：`message-bff.list`、`user-bff.mine`、`report-bff.myList`、`application-bff.submit`、`application-manage/detail` 相关权限或样本问题
- [x] `2026-03-26 10:16` 已再次通过 `run-miniprogram-tech-acceptance-r58.mjs`，继续保持 `ok=true / blocker=none / batch ok=true`
- [x] `2026-03-26 10:13` 已重跑 `run-miniprogram-ui-inventory-r58.mjs`，继续保持 `18` 页覆盖、`运行异常 0 / 仅骨架 0`，且证据锚点已恢复真实截图路径
- [x] 已确认当前满足启动产品 / 体验签收准备的技术前提，但不自动输出最终签收结论
- [x] 已基于最新 `ui-inventory` 生成 `R59` 签收输入包，按 `18` 页给出页面状态、签收候选、待收口点与证据链接
- [x] 已完成 `R60` 轻量复核：`node scripts/build-miniprogram-js.mjs` 与 `node scripts/check-miniprogram-tech-acceptance.mjs` 继续全绿
- [x] 已生成 `R60` 页面级签收候选结论矩阵：`.control-state/current/miniapp-signoff-judgment-r60.md`
- [x] 已确认当前 `R60` 无新增前端 `P0/P1`、后端最小支援或后台共享 blocker，可进入最终签收讨论准备
- [x] 已完成 `R61` 正式最终签收结论文档：`.control-state/current/miniapp-signoff-conclusion-r61.md`
- [x] 已形成整体小程序最终签收结论：`最终签收有条件通过`（`签收通过 2 / 有条件通过 16 / 退回修复 0`）
- [x] 已确认 `R61` 无新增前端 `P0/P1`、后端最小支援或后台共享 blocker；`16` 页待收口项均为非阻塞条件跟踪
- [x] 已完成 `R62` 的 `16` 页前端收口冲刺一轮，围绕信息层级、空态引导、CTA 说明、状态表达和页面结构完成真实前端收口
- [x] 已完成 `R62` 固定复核：`WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-tech-acceptance-r58.mjs` 继续 `ok=true / blocker=none / batch ok=true`
- [x] 已完成 `R62` live screenshot 刷新尝试：`MINIPROGRAM_REFRESH_SCREENSHOTS=1 WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-ui-inventory-r58.mjs` 继续保持 `18` 页覆盖、`运行异常 0 / 仅骨架 0`
- [x] 已输出 `R62` 收口跟踪与正式结论文档：
  - `.control-state/current/miniapp-polish-tracking-r62.md`
  - `.control-state/current/miniapp-signoff-conclusion-r62.md`
- [x] 已将小程序正式最终签收结论刷新为：`最终签收有条件通过`（`签收通过 10 / 有条件通过 8 / 退回修复 0`）
- [x] 已完成 `R63` 固定预检与技术复核：`WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-tech-acceptance-r58.mjs` 继续 `ok=true / blocker=none / batch ok=true`
- [x] 已完成 `R63` live screenshot 刷新尝试：`MINIPROGRAM_REFRESH_SCREENSHOTS=1 WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-ui-inventory-r58.mjs` 继续保持 `18` 页覆盖、`运行异常 0 / 仅骨架 0`
- [x] 已输出 `R63` 收口跟踪与正式结论文档：
  - `.control-state/current/miniapp-polish-tracking-r63.md`
  - `.control-state/current/miniapp-signoff-conclusion-r63.md`
- [x] 已将小程序正式最终签收结论刷新为：`最终签收有条件通过`（`签收通过 15 / 有条件通过 3 / 退回修复 0`）
- [x] 已通过 CloudBase 最小样本脚本补齐 `search / publish-application-manage / report-records` 所需真实业务样本
- [x] 已在最新 `ui inventory` 复核中确认 `publish-application-manage=ready`、`report-records=ready`，并将 `R63` 页面最终结论进一步收敛为：`签收通过 17 / 有条件通过 1 / 退回修复 0`
- [x] 已确认当前剩余条件项只剩 `search`；最新页面级证据仍为 `pageState=empty`，待 DevTools 登录态恢复后再补一次“关键词命中非空结果”复核
- [x] 已修复 `pages/plaza/search` 的路由关键词解码问题，确认真实中文关键词不再以 URL 编码串参与搜索
- [x] 已重新跑通 `WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-tech-acceptance-r58.mjs`，结果恢复为 `ok=true / blocker=none / batch ok=true`
- [x] 已重新跑通 `MINIPROGRAM_REFRESH_SCREENSHOTS=1 WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-ui-inventory-r58.mjs`，确认 `search=ready`
- [x] 已将小程序 `R63` 正式最终签收结论升级为：`最终签收通过`（`签收通过 18 / 有条件通过 0 / 退回修复 0`）
- [ ] 等待城市筛选候选源拍板后接真实城市筛选

### 后台

- [x] 搭建 `admin-web/` 工程骨架
- [x] 完成登录、布局、路由守卫、页面骨架
- [x] 建立 mock service 与本地构建能力
- [x] 接入真实 `admin-auth` 调用通道
- [x] 收口权限 helper 与页面只读态入口
- [x] 完成 `permissionSummary` / `availableActions` 结构收口
- [x] 建立 `review-admin` / `governance-admin` 的集中 normalizer / model 承接层
- [x] 将待确认动作请求枚举收敛到单点 bridge / 常量层
- [x] 输出后台关键状态页清单第一版
- [x] 补第一版后台证据包与首批截图
- [x] 补 R06 版后台证据包、状态事实与 25 张截图
- [x] 准备 `admin-auth` 真实 smoke 脚本、环境变量模板与证据目录
- [x] 补 `R10` must-close 总览、真实 smoke readiness 文档与分步 smoke 入口
- [x] 黑名单页、日志页游标分页统一收口到 `useCursorPager`
- [x] 将风险等级 / 身份类型 / 审核状态 / 举报状态展示标签统一收口到 `admin-labels`
- [x] 将页面通用 `loading/error` 状态收口到 `usePageLoadState`
- [x] 明确后台代码侧默认登录入口技术结论为 `${ADMIN_WEB_BASE_URL}/login`（若站点部署在域名根路径）
- [x] 已完成 `admin-auth` 真实环境 smoke
- [x] 已收到本轮一次性凭据并完成一轮新的证据自洽版真实 `admin-auth` smoke 重跑
- [x] 已修正真实 smoke 脚本证据断言，并明确当前 3 个最小证据缺口
- [x] 已在真实 smoke 脚本中补登录提交后的 `after-submit` 日志与失败分支，避免把真实登录失败误记成超时
- [x] 对齐 `dashboard`、`operationLogList` 与审核 / 举报 / 处罚相关读模型
- [x] 基于已修复的 `dev` 环境函数安全规则，按更新后的脚本重跑 3 个最小证据点
- [x] 已确认 fresh 凭据与服务端 `login/changePassword/me` 对照链路可用，当前不再把“凭据不匹配”当成主根因
- [x] 重新发布最新 `admin-web/dist` 到当前 CloudBase Hosting
- [x] 发布后重跑部署指纹核查，确认线上 bundle 已切到新版本
- [x] 发布后重跑首次改密真实 smoke，验证弹层收口
- [x] 补齐 `changePassword` 的真实返回体（`code/message/data`）并据此排除 action 层失败
- [x] 核对真实部署页与本地最新 `AdminLayout.vue` / `auth.store.ts` 是否一致
- [x] 基于真实 `admin-auth` smoke 结果完成 must-close 二次复核
- [x] 补齐体验复核指出的 3 个最小视觉证据点
- [x] 在真实读模式下将详情动作区与处罚动作默认降为只读，避免写 transport 未就绪时报错
- [x] 为 `review-admin` / `governance-admin` 真实读准备首批规则放行或 transport 切换方案
- [x] 在 `VITE_ENABLE_REAL_ADMIN_READS=true`、`VITE_ENABLE_REAL_ADMIN_WRITES=false` 条件下通过 `typecheck + build`
- [x] 对齐 `dashboard`、`operationLogList` 与审核 / 举报 / 处罚相关读模型
- [x] 在 `dev` 环境开启 `VITE_ENABLE_REAL_ADMIN_READS` 后执行 `dashboard` / `operationLogList` / 审核 / 举报首批页面级真实读 smoke
- [x] 定位 `dashboard` / `logs` / `review-list` / `report-list` 真实读统一进入加载失败态的前端根因
- [x] 完成生产包真实读开关修正、重新 build/publish 与部署指纹对齐
- [x] 在页面真实读恢复后补齐 `review-list` / `report-list` 页面级空态证据
- [x] 继续收口 `dashboard`、`operationLogList` 与审核 / 举报 / 处罚相关读模型
- [x] 若需要详情页 populated smoke，再协调最小样本数据
- [x] 基于 populated 样本完成审核详情 / 举报详情页面级真实读 smoke
- [x] 将 `review detail / report detail / operation logs / blacklist` 剩余 raw enum / raw code / 散落文案继续收口到 `admin-labels`
- [x] 在 `r50` 页面级真实读 smoke 中命中 `logs` 动作中文标签、详情历史区块与只读提示、`blacklist` 至少 2 类限制类型 / 状态文案
- [x] 完成 `admin-web/dist` 再发布与部署指纹核查，确认线上 bundle 与本地构建一致
- [x] 基于 `R50` 体验复核继续收口 `dashboard / logs / review detail / report detail / blacklist` 的提示文案、只读说明与格式化摘要
- [x] 在 `r51` 页面级真实读 smoke 中确认 `dashboard / logs / review-list / review-detail / report-list / report-detail / blacklist` 7 页关键展示命中且无明显裸值
- [x] 在 `R51` 轮重新发布 `admin-web/dist` 并通过部署指纹核查，确认线上资源与本地构建一致
- [x] 在 `r52` 页面级真实读 smoke 中固定 `review list / report list` 空态证据，并将 `console` 静态资源噪音收口到白名单摘要
- [x] 在 `r52` 页面级真实读 smoke 中确认 `dashboard / logs / review-list / review-detail / report-list / report-detail / blacklist` 7 页全部可进入，且 `dashboard_load_error=no`
- [x] `R53` 起后台默认转维护态，不再主动扩治理页功能；仅保留上线前复查与被小程序真实联调暴露出的最小修复
- [ ] 在 real handler 到位后逐步下掉 legacy mock 兼容分支

### 后端

- [x] 搭建 `cloudfunctions/` 基础骨架
- [x] 完成统一 action 分发、响应结构、错误码、日志能力
- [x] 完成 `user-bff.bootstrap` 基础联调骨架
- [x] 完成 `admin-auth` 基础骨架
- [x] 输出后台管理接口 DTO 明细与返回样例
- [x] 输出 `availableActions` 与 `permissionSummary` 结构
- [x] 输出小程序 CloudBase 接入说明与初始化脚本可执行方案
- [x] 绑定 `review-admin.taskList/taskDetail`、`governance-admin.reportList/reportDetail/accountActionList` 真实 handler
- [x] 绑定 `governance-admin.dashboard`、`operationLogList` 真实 handler
- [x] 补管理端 `claim/release/resolve` 系列动作 real handler
- [x] 输出后台动作请求临时事实源与样例
- [x] 补齐 `notice-bff.myList`、`application-bff.publisherList/publisherDetail` 正式 contract / sample
- [x] 将 `notice-bff.list/detail/myList`、`application-bff.myList/detail/publisherList/publisherDetail` 推进到真实查询 handler
- [x] 补小程序可用函数清单与接入说明
- [x] 补 `application-bff` 发布侧动作接口 real handler
- [x] 补 `notice-bff` 发布侧写接口真实链路
- [x] 补 `application-bff.submit/withdraw` real handler
- [x] 补后台只读态 / 他人占用态 / 日志 `afterSnapshot` 代表 sample
- [x] 输出 `notice-bff.republish.deadlineAt` 正式 contract 候选方案
- [x] 补 `publisher-bff` / `creator-bff` 资料写接口 real handler
- [x] 新增首批真实 smoke readiness 检查脚本
- [x] 升级环境交接文档到最新事实口径
- [x] 修复 `init-database.mjs` 索引方向参数（`ASC/DESC` → `1/-1`）
- [x] 完成初始化 dry-run 计划校验
- [x] 通过安全渠道收到密钥并完成主体初始化重跑
- [x] 回传 `collections / databaseRules / indexes / dm_configs / dm_admin_users / seed-admin-users` 实际结果
- [x] 新增 `retry-storage-rule.mjs` 单点重试入口
- [x] 新增 `audit-config-groups.mjs` 分组核查入口
- [x] 修复 secret 模式下 `dm_configs` / 超管 seed 查询路径
- [x] 按 `groupKey` 核清 `dm_configs_count=16` 的数据归属
- [x] 已与后台协同完成 `admin-auth` 首批真实 smoke
- [x] 已修复 `reset-admin-credential.mjs` 并完成新一轮可信一次性凭据重置
- [x] 已新增云函数存活核查脚本并确认 10 个函数全部 `Active`
- [x] 已确认当前总控会话重新具备真实腾讯云密钥，可继续执行 CloudBase 侧脚本
- [x] 补查 CloudBase Web 侧 `admin-auth.login` 返回 `OPERATION_FAIL / PERMISSION_DENIED` 的根因并给出修复口径
- [x] 已读取当前 `dev` 环境函数安全规则，并确认 wildcard 规则直接排除了匿名调用
- [x] 已对当前 `dev` 环境 apply 最小 unblock：保留 wildcard 非匿名基线，新增 `admin-auth.invoke=true`
- [x] 已完成服务端 `login -> changePassword -> me` 对照核验，确认 fresh 凭据、改密动作与同 session `me` 均可用
- [x] 评估 `review-admin` / `governance-admin` 后续真实读的规则扩展方案或 transport 替代方案
- [x] 在当前 `dev` 环境为 `review-admin` / `governance-admin` 执行路线 A 最小放行（保留 wildcard 非匿名基线）
- [x] 新增 `update-function-security-rule.mjs` 作为可复用函数安全规则读写脚本
- [x] 跑通后台业务域服务端真实读 smoke（`admin-auth`、`dashboard`、`taskList`、`reportList`、`accountActionList`、`operationLogList`）
- [x] 若后台需要详情页 populated smoke，提供最小 `dev` 样本数据方案或 seed 计划
- [x] 修复 CloudBase node-sdk 脚本 root-shape 写入，避免新增 `data.*` 包装文档
- [x] 扩治理 smoke 样本到 `dm_account_actions`、同目标历史 `dm_reports`、最小 `dm_operation_logs`
- [x] 为 `governance-admin.reportList` 增加坏单条降级容错，脏 `targetType/targetId` 不再打挂整页
- [x] 在 `r49` 证据下确认服务端验收门槛成立：`reviewTaskCount>=1`、`reportCount>=1`、`accountActionCount>=1`，且 `taskDetail/reportDetail code=0`
- [x] 将治理样本继续扩到 `publisher/creator report`、更重处罚 / 已解除处罚与更宽 `operationLog.afterSnapshot`
- [x] 新增 `reportList` 坏单条回归脚本与 `r50` 固定证据，确保脏单条继续 `code=0` 且降级为 `missing`
- [x] 在 `r50` 证据下确认服务端验收门槛升级成立：`reviewTaskCount=3`、`reportCount=7`、`accountActionCount=4`，且 `operationLogTargetTypes` 覆盖 `report / notice / account_action`
- [x] 将治理样本第三轮扩到弱资料 `report`、长期 / 即将到期 / 已解除 `accountAction` 与更宽 `operationLog` 组合
- [x] 将坏单条回归纳入 `r51` 固定 smoke，确认脏 `report` 单条继续 `code=0` 且降级为 `targetType=missing`
- [x] 在 `r51` 服务端真实读 smoke 中确认 `reviewTaskCount=4`、`reportCount=10`、`accountActionCount=8`，且 `operationLogTargetTypes` 覆盖 `admin_session / account_action / notice / review_task / report`
- [x] 将 `reportList` 坏单条回归升级为 3 场景矩阵，并在 `r52` 证据下确认全部 `ok=true`
- [x] 新增 `reportDetail` 坏详情固定回归，并在 `r52` 证据下确认 `code=0` 且 `targetSnapshot=missing`
- [x] 在 `r52` 服务端真实读 smoke 中确认阈值继续满足：`reviewTaskCount=4`、`reportCount=10`、`accountActionCount=8`
- [x] 刷新 `R53` readiness 检查脚本、CloudBase 接入说明与首轮 smoke 模板，主目标切到小程序真实联调支援
- [x] 明确今晚不做脚本伪造 `OPENID`；小程序真实 smoke 继续依赖微信开发者工具 / 真机提供的 `wxContext.OPENID`
- [x] 新增 `check-miniprogram-dev-smoke-sample.mjs`，用于固定优先 `noticeId` 与 fallback 候选样本核查
- [x] 将小程序接入说明、smoke 模板与 readiness 检查脚本统一刷新到 `R54` 口径
- [ ] 若总控拍板 `oldest` 去重策略，则执行 `dedupe-config-groups --strategy oldest --apply`
- [ ] 若拍板则升级 `notice-bff.republish.deadlineAt` 为正式实现

### 产品经理

- [x] 完成首轮产品一致性专项审查
- [x] 输出 6 项待拍板问题的候选表第一版
- [x] 压缩为可直接让用户选择的“决策单”
- [x] 压缩为用户最小确认单（先题 4 / 5 / 6）
- [x] 给出可直接写入 `decisions.md` 的结论文案
- [x] 输出可直接发给用户的 3 题最小确认文案
- [x] 准备单题 / 双题拍板时的最小落盘规则
- [x] 压缩并继续登记第二批 3 题的最小确认文案
- [x] 输出 `R53` 执行版上线倒排清单骨架，按 owner / 输入物 / 完成定义 / 人工依赖 / 阻塞上线拆表
- [x] 以总控落盘方式补齐 `R56` 提审资料矩阵与发布日执行表事实源
- [x] 将提审资料项继续拆到“来源 / owner / 待填真实值 / 完成定义”
- [x] 已确认运营主体：`王俊凯`
- [x] 已确认联系邮箱：`junkaifly@gmail.com`
- [x] 已确认客服方式：`17621503908`
- [x] 基于 `R59` 签收输入包输出页面级“候选通过 / 待收口”产品结论，不把技术结论外推成最终产品签收
- [x] 基于 `R60` 页面级候选结论组织最终产品签收讨论，不把讨论前结论写成最终签收
- [ ] 按 `R61` 有条件通过口径继续跟踪 `16` 页非阻塞待收口项与并行提审资料事项
- [ ] 等待用户对第一批 3 题中的任意一题正式拍板
- [ ] 补齐提审资料、合规文案、冷启动内容与值守安排的 owner/待补位

### 体验设计审查

- [x] 完成首轮 UI / 交互一致性专项审查
- [x] 输出复审清单第一版
- [x] 压缩为开发可直接提交的“证据清单模板”
- [x] 基于前端 / 后台现有证据做第一轮 gap review
- [x] 明确 must-close 缺口分“待环境后复核 / 待拍板后复核”
- [ ] 继续维护前后台 must-close 清单与待环境复核边界
- [x] 基于后台真实 smoke / 截图执行第二轮复审
- [x] 基于 `R50` 真实证据完成 `dashboard / operation logs / review detail / report detail / blacklist` 正式复核
- [x] `R51` 复核结论已收口为 `可通过`，且 `R50` 残余必须修项已闭环
- [x] 以总控落盘方式补齐 `R56` 提审截图模板，明确页面位、命名规范与验收标准
- [x] 小程序体验复核前置条件已满足：`tech acceptance` 通过且 `ui inventory` 达成 `运行异常 0 / 仅骨架 0`
- [x] 基于 `R59` 签收输入包输出页面级体验复核候选结论，不把“可评审但待收口”写成“已签收”
- [x] 基于 `R60` 页面级候选结论组织最终体验签收讨论，不把讨论前结论写成最终签收
- [ ] 按 `R61` 有条件通过口径继续跟踪 `16` 页非阻塞待收口项；若无新 `P0/P1`，不重开 must-close

### 阻塞协调

- [x] 建立专项角色与 `inbox/outbox` 机制
- [x] 输出第一版“用户阻塞处理单”
- [x] 区分“用户自己决定”和“需要对外索取”的事项
- [x] 整理最小环境交接口径与外部沟通方向
- [x] 确认当前按个人主体小程序路径推进
- [x] 确认当前拟用名称为“多米通告”、类目为“工具-预约/报名”
- [x] 拆成 3 张 owner checklist（`AppID/主体`、`CloudBase 环境交接`、`管理员账号/初始化方式`）
- [x] `AppID/主体` checklist 已基本完成
- [x] 确认当前 `dev` 候选环境为 `cloud1-4grxqg018586792d`（开发者工具侧当前环境）
- [x] 确认密钥侧阻塞已解除
- [x] 确认 `storageRule` 对当前 `dev` 环境按已知例外处理
- [x] 澄清管理员联调最小真实值的责任边界并给出索取文案
- [x] 后端已给出首批 `admin-auth` 联调默认方案：沿用 seed 账号 `domi_admin`，且 `mustResetPassword=true` 可走首次改密闭环
- [x] 后端已确认 seed 账号 `domi_admin` 的初始密码生成完成；当前剩余缺口不再包含“是否已生成”
- [x] 已将 `R54` 人工关口收口为未来恢复项，当前不再要求用户承担 DevTools / console 执行
- [x] 已将 `R56` 外部缺口固定为：主体、邮箱、客服、法院辖区、发布 owner、回滚 owner、值守 owner
- [x] 已确认主体：`王俊凯`
- [x] 已确认邮箱：`junkaifly@gmail.com`
- [x] 已确认客服方式：`17621503908`
- [x] 发布 / 回滚 / 值守 owner 当前暂按 `王俊凯` 挂载
- [ ] 跟踪法院辖区最终确认、提审资料收口与正式发布时点

## 跨线阻塞

- [x] 小程序技术链路与页面盘点技术门槛已闭环：`run-miniprogram-tech-acceptance-r58.mjs ok=true`，`run-miniprogram-ui-inventory-r58.mjs` 达成 `运行异常 0 / 仅骨架 0`
- [x] 当前剩余小程序主线事项已切换为产品 / 体验签收准备：产品经理与体验设计审查已基于 `R59` 签收输入包输出页面级候选结论
- [x] 当前剩余小程序主线事项已切换为最终签收讨论准备：已基于 `R60` 页面级候选结论完成逐页判断
- [x] 当前小程序已形成 `R61` 最终签收结论：`最终签收有条件通过`，且 `退回修复 0`
- [ ] 仅当 `R61` 条件跟踪项升级为真实 `P0/P1`，或签收方明确要求 live screenshot 时，再重开小程序专项
- [ ] 待未来恢复真实 `AppID` + DevTools `cloud` 窗口时，再按 `R54` runbook 执行 `runtimeDebug.useCloud()` -> `devSmoke.runFirstBatch()` -> 回填 `evidence/r54`
- [ ] `dm_configs` 重复来源已核清：8 个正式 `groupKey` 各重复 1 次；当前仍待拍板清理策略并执行 apply
- [ ] 第一批高优先级规则未拍板：后台动作请求最终枚举、举报处理中可见性 / 状态 code、处罚状态模型 / code
- [ ] 第二批规则未拍板：非列表场景直跳 / `applicationId` 聚合、`preferredView` 默认值、城市筛选来源 / 默认城市
- [ ] `notice-bff.republish.deadlineAt` 是否进入正式 contract 未拍板
- [ ] 提审资料、合规文案、冷启动内容仍待最后收口；主体/邮箱/客服已确认，发布/回滚/值守 owner 当前暂按 `王俊凯` 挂载，法院辖区仍待最终确认
- [ ] 后台 `dashboard / logs / review list / review detail / report list / report detail / blacklist` 的 `r52` 页面级真实读 smoke 已闭环；后台当前只保留真实写冻结与上线前复查，不再作为主线扩项
- [ ] 当前治理侧样本与容错基线已收口为：`reportList` 坏单条矩阵、`reportDetail` 坏详情回归、弱资料 `report`、长期 / 即将到期 / 已解除 `accountAction` 与更宽 `operationLog` 组合；若后续继续扩大覆盖，优先服务小程序真实联调与上线前复查

## 下一次会议触发条件

满足任一条件即可开下一轮会议：

1. 六个角色都完成当前收件箱任务
2. 后台访问地址或管理员账号 / 初始化方式有新事实回传
3. 用户拍板第一批规则（题 4 / 5 / 6）中的任意一项
4. `R61` 条件跟踪项升级为真实 `P0/P1`、签收方明确要求 live screenshot，或并行资料事项回流到小程序主线
