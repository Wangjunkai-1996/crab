# KK_Crab 小程序收口跟踪 R63

- 更新时间：2026-03-26 18:52
- 轮次目标：在 `R62` 仍为 `有条件通过` 的 `8` 个页面上完成一轮真实前端升档收口，不改公开业务 API、Cloud Function contract 或后台接口
- 固定预检：
  - `node scripts/build-miniprogram-js.mjs` => `ok=true`
  - `node scripts/check-miniprogram-tech-acceptance.mjs` => `ok=true`
- 收口后复核：
  - `WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-tech-acceptance-r58.mjs` => `ok=true / blocker=none / batch ok=true`
  - `MINIPROGRAM_REFRESH_SCREENSHOTS=1 WECHAT_DEVTOOLS_PORT=25116 node scripts/run-miniprogram-ui-inventory-r58.mjs` => `18` 页覆盖、`runtimeError=0 / skeletonOnly=0`，其中 `search=ready`、`publish-application-manage=ready`、`report-records=ready`
- 本轮结果摘要：
  - `8` 个目标页均已完成一轮真实前端升档收口
  - 已接入一轮 CloudBase 最小真实样本，补齐 `publish-application-manage` / `report-records` / `search` 升档所需样本前提
  - 已补齐 `search` 页路由关键词解码，消除 URL 编码导致的真实命中结果态丢失
  - `8` 页全部从 `有条件通过` 升级为 `签收通过`
  - 当前已无保留条件项页面
  - live screenshot 已再次尝试刷新，但 DevTools 实时截图采集仍回落到缓存图；这次继续按“有刷新动作、无技术回退”登记

## 第一批核心入口与主路径

### plaza
- 改动项：新增“主路径收口”摘要卡，把首页拆成“首个建议 / 继续浏览”两段；已启用筛选时显示筛选说明，广告位固定落在首个决策卡之后，降低首屏决策压力。
- 新结论：升级为 `签收通过`。`pageState=ready`，首屏浏览节奏已从“整屏平铺列表”收口为“先决策一条，再横向比较其余候选”，原本的结构性问题已降到细节层。
- 证据锚点：`miniprogram/evidence/r58/screenshots/plaza.png`；`miniprogram/pages/plaza/index.wxml`；`miniprogram/pages/plaza/index.wxss`
- 剩余条件项：无新增阻塞项；当前仍是缓存截图锚点，但不影响本页升档判断。

### publish
- 改动项：新增“资料 -> 通告 -> 动作”三段式导读、分段完成度卡片、各表单区进度标识与底部动作 helperText，把长表单改成更明确的阶段推进流。
- 新结论：升级为 `签收通过`。`pageState=ready`，长表单的填写顺序、阶段感和草稿 / 提审语义已经足够清楚，主要问题已从结构层收敛到轻微细节。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish.png`；`miniprogram/pages/publish/index.wxml`；`miniprogram/pages/publish/index.wxss`
- 剩余条件项：无新增阻塞项。

### mine
- 改动项：新增工作台优先级摘要卡、角色准备度卡片，把快捷入口拆成“优先动作 / 全部入口”两层，明确双角色用户当前最该先做什么。
- 新结论：升级为 `签收通过`。`pageState=ready`，双角色首页的优先级和浏览顺序已明显清晰，首屏拥挤感已被有效收敛。
- 证据锚点：`miniprogram/evidence/r58/screenshots/mine.png`；`miniprogram/pages/mine/index.wxml`；`miniprogram/pages/mine/index.wxss`
- 剩余条件项：无新增阻塞项。

### search
- 改动项：新增搜索路径摘要、建议关键词、relaxed search fallback、“清空筛选后重搜”与“回合作广场”动作，补齐空结果到回退路径的闭环；同时补上路由 `keyword` 的 URL 解码，修复真实中文关键词被当作编码串参与搜索的问题。
- 新结论：升级为 `签收通过`。当前 `ui inventory` 与定点 automator 复核都已拿到 `pageState=ready`，且真实请求中 `keyword=上海探店合作管理样本` 能稳定命中结果列表。
- 证据锚点：`miniprogram/evidence/r58/screenshots/search.png`；`miniprogram/pages/plaza/search.wxml`；`miniprogram/pages/plaza/search.wxss`
- 剩余条件项：无新增阻塞项；当前仍是缓存截图锚点，但不影响本页升档判断。

## 第二批列表与管理页

### creator-application-list
- 改动项：新增报名总览摘要卡、当前最值得先看的报名焦点卡、状态标签 / 下一步动作摘要，并把筛选空态改成保留统计与 tabs 的 inline empty。
- 新结论：升级为 `签收通过`。`pageState=ready`，列表已能更直接回答“当前处在哪个阶段、下一步回哪里处理”，批量浏览路径明显比 `R62` 更清楚。
- 证据锚点：`miniprogram/evidence/r58/screenshots/creator-application-list.png`；`miniprogram/packages/creator/application-list/index.wxml`；`miniprogram/packages/creator/application-list/index.wxss`
- 剩余条件项：无新增阻塞项。

### publish-notice-list
- 改动项：新增通告管理摘要卡、当前优先处理焦点卡、动作提示文案，并把筛选空态改成保留统计与状态切换的 inline empty。
- 新结论：升级为 `签收通过`。`pageState=ready`，详情 / 编辑 / 报名管理三类动作的主次关系已更加稳定，列表管理节奏满足当前签收要求。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish-notice-list.png`；`miniprogram/packages/publish/notice-list/index.wxml`；`miniprogram/packages/publish/notice-list/index.wxss`
- 剩余条件项：无新增阻塞项。

### publish-application-manage
- 改动项：新增报名推进摘要卡、焦点报名卡、列表优先级提示、详情区状态标签与动作 tone；底部动作栏补充“当前只对已选报名生效”的 helperText。
- 新结论：升级为 `签收通过`。当前已通过最小真实报名样本复核到 `pageState=ready`，左右联动、选中态反馈与动作区节奏已具备页面级证据。
- 证据锚点：`miniprogram/evidence/r58/screenshots/publish-application-manage.png`；`miniprogram/packages/publish/application-manage/index.wxml`；`miniprogram/packages/publish/application-manage/index.wxss`
- 剩余条件项：无新增阻塞项；当前仍是缓存截图锚点，但不影响本页升档判断。

### report-records
- 改动项：新增处理进度摘要卡、最近一条记录的下一步说明、统计卡与状态 tabs 保留、inline empty，以及“去提交举报”空态动作。
- 新结论：升级为 `签收通过`。当前已通过最小真实举报记录样本复核到 `pageState=ready`，记录列表下的进度表达、状态识别与最近记录摘要已具备页面级证据。
- 证据锚点：`miniprogram/evidence/r58/screenshots/report-records.png`；`miniprogram/packages/mine/report-records/index.wxml`；`miniprogram/packages/mine/report-records/index.wxss`
- 剩余条件项：无新增阻塞项；当前仍是缓存截图锚点，但不影响本页升档判断。

## 本轮未升档页面

- 当前无保留 `有条件通过` 页面
- 当前 `8` 个目标页均已完成本轮升档，不再保留页面级条件项
