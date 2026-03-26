# KK_Crab 小程序收口跟踪 R62

- 更新时间：2026-03-26 14:35
- 轮次目标：按 `R62` 计划完成 `16` 个“有条件通过”页面的一轮真实前端收口，不改公开业务 API、Cloud Function contract 或后台接口
- 固定预检：
  - `node scripts/build-miniprogram-js.mjs` => `ok=true`
  - `node scripts/check-miniprogram-tech-acceptance.mjs` => `ok=true`
- 收口后复核：
  - `WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-tech-acceptance-r58.mjs` => `ok=true / blocker=none / batch ok=true`
  - `MINIPROGRAM_REFRESH_SCREENSHOTS=1 WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-ui-inventory-r58.mjs` => `18` 页覆盖、`runtimeError=0 / skeletonOnly=0`
- 本轮结果摘要：
  - `16` 个目标页均已完成一轮前端收口
  - `8` 页从 `有条件通过` 升级为 `签收通过`
  - `8` 页继续保留 `有条件通过`
  - live screenshot 已尝试刷新，但 DevTools 截图实时采集仍回落到缓存图；这次按“有刷新动作、无技术回退”登记

## 第一批主路径

### plaza
- 改动项：新增首页摘要卡，补“默认推荐 / 已启用筛选”的首屏解释；在筛选未启用时增加“先看什么”的导读，弱化直接铺满列表带来的决策压力。
- 新结论：继续 `有条件通过`。`pageState=ready`、技术稳定，但首页卡片密度与广告位编排仍需更细颗粒度的产品 / 体验复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/plaza.png`；`miniprogram/pages/plaza/index.wxml`；`miniprogram/pages/plaza/index.wxss`

### publish
- 改动项：新增“资料 -> 通告 -> 动作”三段式导读；为底部动作区补充草稿 / 提审说明，明确“保存资料不清空表单、保存草稿不直接上线”的路径。
- 新结论：继续 `有条件通过`。`pageState=ready`、主路径更清楚，但长表单在真实复杂填写场景下仍建议保留最终体验复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish.png`；`miniprogram/pages/publish/index.wxml`；`miniprogram/pages/publish/index.wxss`

### messages
- 改动项：新增收件箱摘要区，补“先看未读 / 当前列表 / 处理建议”的三格信息；消息卡改为“标题 + 类型 + 时间 + 摘要”的收件箱样式，并补空态去向动作。
- 新结论：升级为 `签收通过`。空态和消息态都已具备明确的阅读顺序与后续动作路径。
- 证据锚点：`miniprogram/evidence/r58/screenshots/messages.png`；`miniprogram/pages/messages/index.wxml`；`miniprogram/components/inbox-message-item/index.wxml`

### mine
- 改动项：新增工作台摘要卡，补“当前优先视角 / 当前城市 / 未读消息”的信息总览；把“先从哪个角色继续推进”说清，减轻双角色入口的混乱感。
- 新结论：继续 `有条件通过`。`pageState=ready`、方向更清楚，但常用入口区仍偏密，双角色态的优先级还值得继续打磨。
- 证据锚点：`miniprogram/evidence/r58/screenshots/mine.png`；`miniprogram/pages/mine/index.wxml`；`miniprogram/pages/mine/index.wxss`

### search
- 改动项：新增搜索路径摘要卡，明确“关键词 + 沿用广场筛选”的使用方式；为空结果补“回合作广场”动作，闭合搜索失败后的回退路径。
- 新结论：继续 `有条件通过`。当前主要证据仍是空结果路径，真实结果列表的浏览节奏仍建议保留后续体验复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/search.png`；`miniprogram/pages/plaza/search.wxml`；`miniprogram/pages/plaza/search.wxss`

### notice-detail
- 改动项：新增详情页“决策提示”摘要卡，提前汇总当前状态、招募人数与主 CTA；底部动作区增加禁用原因 / 联系方式规则说明。
- 新结论：升级为 `签收通过`。详情页已能较完整回答“值不值得报名、为什么现在能或不能做动作”。
- 证据锚点：`miniprogram/evidence/r58/screenshots/notice-detail.png`；`miniprogram/pages/plaza/notice-detail.wxml`；`miniprogram/pages/plaza/notice-detail.wxss`

### creator-apply
- 改动项：新增报名路径导读，补“名片沿用 + 提交后固化快照”的关键说明；底部动作区直接承接 `helperText`，避免提交前后状态断裂。
- 新结论：升级为 `签收通过`。报名页当前已具备较完整的提交前说明、表单节奏与提交后反馈。
- 证据锚点：`miniprogram/evidence/r58/screenshots/creator-apply.png`；`miniprogram/packages/creator/apply/index.wxml`；`miniprogram/packages/creator/apply/index.wxss`

### creator-application-list
- 改动项：新增报名总览摘要卡，补“先看状态标签 / 联系方式释放情况”的阅读顺序；空态补“回合作广场”动作。
- 新结论：继续 `有条件通过`。`pageState=ready`、空态闭环已补齐，但多状态混排下的列表密度与摘要层级仍建议继续复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/creator-application-list.png`；`miniprogram/packages/creator/application-list/index.wxml`；`miniprogram/packages/creator/application-list/index.wxss`

### publish-notice-list
- 改动项：新增通告管理摘要卡，补“详情 / 编辑 / 报名管理”三类动作的使用预期；空态补“去发布通告”动作。
- 新结论：继续 `有条件通过`。列表路径比 `R61` 更清楚，但批量浏览与跨状态管理效率仍值得继续优化。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish-notice-list.png`；`miniprogram/packages/publish/notice-list/index.wxml`；`miniprogram/packages/publish/notice-list/index.wxss`

### publish-application-manage
- 改动项：新增报名推进摘要卡，补“先选列表，再看详情区动作”的使用逻辑；底部动作区补充当前选中项说明。
- 新结论：继续 `有条件通过`。当前样本仍主要落在空态，详情区结构已更完整，但真实多报名样本下仍建议再做一次体验复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish-application-manage.png`；`miniprogram/packages/publish/application-manage/index.wxml`；`miniprogram/packages/publish/application-manage/index.wxss`

## 第二批补充业务页

### creator-application-detail
- 改动项：新增详情解读摘要卡，明确“联系方式是否开放 / 当前能否撤回”；底部动作区补充撤回规则说明。
- 新结论：升级为 `签收通过`。详情页已能把阶段、联系规则和撤回能力解释清楚。
- 证据锚点：`miniprogram/evidence/r58/screenshots/creator-application-detail.png`；`miniprogram/packages/creator/application-detail/index.wxml`；`miniprogram/packages/creator/application-detail/index.wxss`

### creator-card
- 改动项：新增名片收口摘要卡，明确“最小闭环字段”与“只保留一个主联系方式”的原则；底部动作区补充保存前提示。
- 新结论：升级为 `签收通过`。当前页已能更明确地指导用户完成一张可直接参与报名的达人名片。
- 证据锚点：`miniprogram/evidence/r58/screenshots/creator-card.png`；`miniprogram/packages/creator/creator-card/index.wxml`；`miniprogram/packages/creator/creator-card/index.wxss`

### report
- 改动项：新增举报路径摘要卡，突出“对象摘要 + 举报原因”优先级；底部动作区补证据说明与提交后预期。
- 新结论：升级为 `签收通过`。举报页当前已形成较完整的填写导向、证据说明与提交反馈。
- 证据锚点：`miniprogram/evidence/r58/screenshots/report.png`；`miniprogram/packages/mine/report/index.wxml`；`miniprogram/packages/mine/report/index.wxss`

### report-records
- 改动项：新增处理进度摘要卡，补“先看最近一条，再切状态筛选”的阅读顺序；空态补“去提交举报”动作。
- 新结论：继续 `有条件通过`。当前样本仍以空态为主，虽然路径更完整，但真实有记录时的层级和状态表达仍建议继续复核。
- 证据锚点：`miniprogram/evidence/r58/screenshots/report-records.png`；`miniprogram/packages/mine/report-records/index.wxml`；`miniprogram/packages/mine/report-records/index.wxss`

### feedback
- 改动项：新增反馈路径摘要卡，明确推荐写法为“页面位置 + 预期结果 + 实际现象”；底部动作区补提交后补充说明口径。
- 新结论：升级为 `签收通过`。当前页已具备较清楚的写法引导、截图预期和提交结果反馈。
- 证据锚点：`miniprogram/evidence/r58/screenshots/feedback.png`；`miniprogram/packages/mine/feedback/index.wxml`；`miniprogram/packages/mine/feedback/index.wxss`

### publish-edit
- 改动项：新增编辑路径摘要卡，明确“保存修改”和“重新提交审核”的区别；底部动作区补“保存不直接上线”的说明。
- 新结论：升级为 `签收通过`。编辑页已能较清楚地区分补信息与重新提审两类动作。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish-edit.png`；`miniprogram/packages/publish/edit/index.wxml`；`miniprogram/packages/publish/edit/index.wxss`

## 本轮未升档页面

- 当前继续 `有条件通过` 的 `8` 页：
  - `plaza`
  - `publish`
  - `mine`
  - `search`
  - `creator-application-list`
  - `publish-notice-list`
  - `publish-application-manage`
  - `report-records`
- 共同原因：
  - 当前技术稳定、无 `runtimeError / skeletonOnly`
  - 但仍主要集中在首页 / 列表 / 空态类页面，真实内容密度、批量浏览效率或空态转化路径还保留最后一轮产品 / 体验细修空间
