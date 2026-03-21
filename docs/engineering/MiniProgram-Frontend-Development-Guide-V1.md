# 多米通告 小程序前端开发文档 V1

## 1. 文档信息

- 文档名称：小程序前端开发文档 V1
- 对应产品文档：[PRD-V1.md](../product/PRD-V1.md)
- 对应 UI 定稿：[UI-Final-Signoff-V1.md](../design/UI-Final-Signoff-V1.md)
- 对应 UI 设计系统：[UI-Design-System-V1.md](../design/UI-Design-System-V1.md)
- 对应 Design Token：[UI-Design-Tokens-V1.json](../design/UI-Design-Tokens-V1.json)
- 对应后端总文档：[CloudBase-Backend-Development-Guide-V1.md](CloudBase-Backend-Development-Guide-V1.md)
- 对应 API Contract：[CloudFunction-API-Contract-V1.md](CloudFunction-API-Contract-V1.md)
- 对应权限矩阵：[Visibility-Permissions-Matrix-V1.md](../product/Visibility-Permissions-Matrix-V1.md)
- 对应状态流转：[Status-Flow-Matrix-V1.md](../product/Status-Flow-Matrix-V1.md)
- 文档日期：2026-03-16
- 文档目标：为多米通告 V1 输出一份可以直接指导原生微信小程序落地开发的详细前端规范，统一目录结构、组件体系、页面数据流、状态处理和联调方式

## 2. 开发目标与范围

### 2.1 前端目标

1. 严格还原已锁定 UI 的页面层级、状态页、表单体验和 CTA 逻辑。
2. 通过原生微信小程序 + TypeScript + Sass 完成 V1 全量页面落地。
3. 所有业务能力以 CloudBase 云函数为唯一数据入口，不在前端硬编码业务规则。
4. 为后续真机联调、提测和小程序上线提供统一实现口径。

### 2.2 范围

本文档覆盖：

1. 小程序工程结构
2. App 启动与全局架构
3. 组件与样式系统
4. 页面级开发规范
5. 云函数调用约定
6. 表单校验、权限显隐、状态渲染
7. 测试、验收与开发顺序

### 2.3 非目标

1. 不做 H5 或多端复用框架接入
2. 不做 Taro / uni-app
3. 不做前端直连数据库
4. 不做前端自定义权限体系

## 3. 技术路线与前提

### 3.1 固定栈

1. 原生微信小程序
2. TypeScript
3. Sass / SCSS
4. `wx.cloud`
5. 基础库使用 `latest`

### 3.2 必须遵守的前提

1. 小程序天然登录，不设计登录页。
2. 用户身份由云函数中的 `OPENID` 自动识别。
3. 小程序前端只展示服务端允许展示的数据。
4. 联系方式、账号限制、状态流转都不在前端做最终判断。

## 4. 前端实现总原则

### 4.1 UI 还原原则

1. 以 [UI-Design-System-V1.md](../design/UI-Design-System-V1.md) 和高保真稿为视觉事实来源。
2. 所有关键状态页必须真实实现，不能只靠一套通用空白页兜底。
3. 视觉实现优先沉淀成组件，不在页面内散写样式。

### 4.2 业务边界原则

1. 页面层只负责渲染、交互、表单输入和轻量状态切换。
2. 业务规则全部依赖 API 返回的 `permissionState`、`ctaState`、`availableActions`、`status` 等字段。
3. 前端不自己判断联系方式何时释放、不自己拼装复杂 CTA 文案。

### 4.3 状态管理原则

1. 页面状态优先局部管理。
2. 跨页轻状态统一收口在轻量 store。
3. 服务端事实状态永远优先于本地缓存状态。

## 5. 工程结构建议

### 5.1 根目录建议

```text
miniprogram/
  app.ts
  app.json
  app.scss
  project.private.config.json
  sitemap.json
  assets/
    icons/
    illustrations/
  pages/
    plaza/
      index/
      search/
      notice-detail/
    publish/
      index/
    messages/
      index/
    mine/
      index/
  packages/
    publish/
      success/
      edit/
      notice-list/
      application-manage/
    creator/
      apply/
      application-list/
      application-detail/
      creator-card/
    mine/
      report/
      report-records/
      feedback/
      rules/
  components/
    app-hero-header/
    status-tag/
    notice-card/
    filter-chip-bar/
    filter-sheet/
    grouped-form-card/
    bottom-action-bar/
    empty-state/
    inbox-message-item/
    restriction-banner/
    uploader-grid/
    stats-summary-card/
  services/
    cloud.ts
    user.service.ts
    publisher.service.ts
    creator.service.ts
    notice.service.ts
    application.service.ts
    message.service.ts
    report.service.ts
    feedback.service.ts
  stores/
    user.store.ts
    ui.store.ts
    discovery.store.ts
  constants/
    enums.ts
    routes.ts
    storage-keys.ts
    ui.ts
  models/
    api.ts
    user.ts
    notice.ts
    application.ts
    message.ts
  utils/
    request.ts
    validator.ts
    formatter.ts
    safe-area.ts
    upload.ts
    page-state.ts
  styles/
    tokens.scss
    mixins.scss
    motion.scss
    helpers.scss
  typings/
    global.d.ts
    cloudfunctions.d.ts
```

### 5.2 分包建议

主包仅保留高频入口：

1. `pages/plaza/index`
2. `pages/publish/index`
3. `pages/messages/index`
4. `pages/mine/index`
5. `pages/plaza/search`
6. `pages/plaza/notice-detail`

建议分包：

1. `publish-subpackage`
   - `packages/publish/success`
   - `packages/publish/edit`
   - `packages/publish/notice-list`
   - `packages/publish/application-manage`
2. `creator-subpackage`
   - `packages/creator/apply`
   - `packages/creator/application-list`
   - `packages/creator/application-detail`
   - `packages/creator/creator-card`
3. `mine-subpackage`
   - `packages/mine/report`
   - `packages/mine/report-records`
   - `packages/mine/feedback`
   - `packages/mine/rules`

说明：

1. 详情页若访问频率很高，可保留主包。
2. 目标是控制首包体积，保证首页与广场启动体验。

### 5.3 `app.json`、路由与 TabBar 建议

#### TabBar 固定项

1. `pages/plaza/index`：`广场`
2. `pages/publish/index`：`发布`
3. `pages/messages/index`：`消息`
4. `pages/mine/index`：`我的`

#### 路由原则

1. TabBar 页面只放主包。
2. 详情页保留主包，减少从广场跳详情的等待。
3. 发布成功、编辑、报名管理、报名详情、举报、反馈等低频页走分包。
4. `发布` Tab 永远进入 `pages/publish/index`，不可因为身份变化改路由。

#### `app.json` 配置要求

1. 使用原生 TabBar，自定义图标资源与选中态图标。
2. `window.navigationStyle` 可根据最终实现决定是否自定义导航，但页面内品牌标题区仍由组件实现。
3. 主包 pages 顺序优先保证首开路径与高频跳转路径。

## 6. App 启动与全局流程

### 6.1 `app.ts` 启动流程

启动顺序建议：

1. `wx.cloud.init({ env, traceUser: true })`
2. 初始化全局样式和安全区信息
3. 调用 `user-bff.bootstrap`
4. 将 `user.userId`、`user.roleFlags`、`user.preferredView`、`user.accountStatus`、`message.unreadCount` 写入轻量 store
5. 根据返回结果决定消息红点、我的页入口锁定态、发布页补资料卡默认逻辑

### 6.2 启动态要求

1. App 首屏不显示登录过程。
2. `bootstrap` 未返回前，广场页可先展示骨架屏。
3. `bootstrap` 失败时，页面要展示可重试状态，而不是白屏。

### 6.3 全局缓存建议

适合持久化的内容：

1. `preferredView`
2. 最近使用的发现筛选条件
3. 最近一次城市选择

不建议持久化的内容：

1. 权限判断结果
2. 报名状态
3. 联系方式是否可见

## 7. 设计系统落地方式

### 7.1 Token 映射

实现规则：

1. 将 [UI-Design-Tokens-V1.json](../design/UI-Design-Tokens-V1.json) 映射到 `styles/tokens.scss`
2. 页面和组件只消费语义化变量，如 `--color-brand-primary`、`--radius-card`、`--shadow-soft`
3. 禁止在页面内直接散写十六进制颜色

### 7.2 全局样式要点

1. 页面背景统一使用浅渐层基底
2. 主卡片统一白纸感表面、浅边、高光、柔影
3. 底部固定栏统一磨砂白底 + 安全区
4. 标题层级、正文层级、预算数字层级要有全局变量

### 7.3 动效落地

统一动效参数：

1. 点击反馈：`140ms`
2. 轻切换：`180ms`
3. 页面进入：`240ms`
4. 抽屉与反馈层：`320ms`

应用范围：

1. 筛选抽屉
2. 底部 CTA 栏
3. 卡片按压态
4. 成功反馈层

## 8. 共享层架构

### 8.1 服务调用链

统一调用链：

```text
Page
  -> page controller / page methods
  -> services/*
  -> utils/request.ts
  -> wx.cloud.callFunction
```

### 8.2 `request.ts` 规范

职责：

1. 拼装 `{ action, payload, meta }`
2. 附加 `source`、`clientVersion`
3. 处理统一错误码
4. 上报 `requestId`

错误处理要求：

1. 业务错误优先转成友好提示
2. `40001`、`40002` 这类受限状态要落到页面级提示，而不是仅 toast
3. 未知异常要保留重试能力

### 8.3 service 层职责

每个 service 文件只负责一个业务域：

1. `user.service.ts`
2. `publisher.service.ts`
3. `creator.service.ts`
4. `notice.service.ts`
5. `application.service.ts`
6. `message.service.ts`
7. `report.service.ts`
8. `feedback.service.ts`

禁止：

1. 页面内直接 `wx.cloud.callFunction`
2. 页面内散落 action 名和错误码判断

### 8.4 轻量 store 建议

#### `user.store`

维护：

1. `userId`
2. `roleFlags`
3. `accountStatus`
4. `preferredView`
5. `unreadCount`

#### `ui.store`

维护：

1. 安全区信息
2. 全局 loading
3. 全局反馈弹层

#### `discovery.store`

维护：

1. 广场与搜索共享筛选条件
2. 最近搜索词

### 8.5 通用页面状态机

建议统一页面状态枚举：

1. `loading`
2. `ready`
3. `empty`
4. `error`
5. `submitting`

适用规则：

1. 广场首页、详情页、消息中心、我的页必须显式管理页面状态。
2. 表单页面在提交时进入 `submitting`，按钮 loading 与禁用同步。
3. `error` 状态必须给出“重试”或“返回上一步”动作，不允许停留空白页。

推荐封装：

1. `utils/page-state.ts`
2. `components/page-skeleton/`
3. `components/page-error-state/`

## 9. 共享组件清单

### 9.1 `app-hero-header`

适用：

1. 广场首页
2. 发布页
3. 我的页

职责：

1. 品牌标题区
2. 副文案
3. 渐层背景与环境光

### 9.2 `notice-card`

职责：

1. 展示标题、标签、预算、城市、时间、发布方、状态
2. 统一卡片层级和按压态

### 9.3 `status-tag`

职责：

1. 通告状态
2. 报名状态
3. 限制状态

要求：

1. 不同页面共享同一套状态 token
2. 不能页面内自己配色

### 9.4 `filter-chip-bar` + `filter-sheet`

职责：

1. 承载发现筛选
2. 支持“重置 + 确定”模式
3. 展示筛选回显

### 9.5 `grouped-form-card`

职责：

1. 表单分组
2. 标题说明
3. 错误提示容器

### 9.6 `bottom-action-bar`

职责：

1. 底部固定 CTA
2. 主按钮 / 次按钮布局
3. 安全区处理

### 9.7 `empty-state`

职责：

1. 空状态插图
2. 场景文案
3. 主操作

### 9.8 其他组件

1. `inbox-message-item`
2. `restriction-banner`
3. `uploader-grid`
4. `stats-summary-card`

## 10. 页面开发规范

### 10.1 广场首页 `pages/plaza/index`

#### 页面目标

1. 建立产品首页感
2. 让用户快速发现通告
3. 承接搜索和筛选

#### 数据依赖

1. `user-bff.bootstrap`
2. `notice-bff.list`

#### 页面结构

1. 大标题区
2. 搜索框
3. 筛选 chip
4. 信息流列表
5. 广告占位卡

#### 必须实现的状态

1. 首次加载骨架态
2. 有数据态
3. 空状态
4. 筛选无结果态
5. 筛选抽屉展开态

#### 交互规则

1. 筛选修改先在抽屉暂存，点“确定”后才触发 `notice-bff.list`
2. 返回搜索页和广场页时共享筛选条件
3. 滚动时标题区可轻压缩，但搜索入口不消失

#### 联调重点

1. `list` 返回的筛选摘要能否支撑 chip 回显
2. 无结果时能否保留已选条件

### 10.2 搜索结果页 `pages/plaza/search`

#### 数据依赖

1. `notice-bff.list`

#### 必须实现的状态

1. 未搜索态
2. 已搜索有结果
3. 已搜索无结果

#### 交互规则

1. 搜索词与发现筛选并存
2. 保留历史搜索词
3. 结果页与广场页筛选状态互通

### 10.3 通告详情页 `pages/plaza/notice-detail`

#### 数据依赖

1. `notice-bff.detail`

#### 首屏必须展示

1. 状态
2. 标题
3. 预算
4. 平台
5. 城市
6. 合作形式
7. 底部 CTA

#### CTA 规则

必须完全按服务端返回渲染：

1. 游客态：`完善达人名片后报名`
2. 已有达人名片未报名：`立即报名`
3. 已报名：`查看我的报名`
4. 发布方本人：`查看报名`

#### 必须实现的状态

1. 进行中
2. 已截止
3. 已关闭
4. 已下架
5. 游客态 CTA

#### 联调重点

1. 不同身份、状态下 CTA 是否正确
2. 发布方联系方式是否按状态释放

### 10.4 发布页 `pages/publish/index`

#### 数据依赖

1. `publisher-bff.getProfile`
2. `publisher-bff.upsertProfile`
3. `notice-bff.createDraft`
4. `notice-bff.updateDraft`
5. `notice-bff.submitReview`

#### 页面结构

1. 标题区
2. 资料补全卡
3. 分组表单卡
4. 固定提交栏

#### 必须实现的状态

1. 首次补资料
2. 正常发布
3. 校验失败
4. 提交中

#### 表单分组建议

1. 发布方资料卡
2. 通告基础信息卡
3. 合作要求卡
4. 补充图片卡

#### 校验规则

1. 必填未完成前主按钮禁用
2. 字段错误就近展示
3. 资料预填字段标注“已从资料带入”

### 10.5 发布成功页 `packages/publish/success`

#### 数据依赖

前一页带入提交结果即可，必要时可回查 `notice-bff.detail`

#### 页面目标

1. 明确告知“已进入审核”
2. 提供后续动作入口

### 10.6 我的通告列表 `packages/publish/notice-list`

#### 数据依赖

1. `notice-bff.myList`

#### 必须实现的状态

1. 全部
2. 待审核
3. 进行中
4. 已关闭
5. 空状态

#### 交互规则

1. 列表卡片上显示可执行动作
2. 操作按钮显隐依赖服务端状态，不自行猜

### 10.7 通告编辑页 `packages/publish/edit`

#### 数据依赖

1. `notice-bff.detail`
2. `notice-bff.updateDraft`
3. `notice-bff.submitReview`

#### 必须实现的状态

1. 驳回修改
2. 补充资料
3. 正常编辑

#### 交互重点

1. 明确这是修改后重提
2. 展示最近驳回或补资料原因

### 10.8 报名管理页 `packages/publish/application-manage`

#### 数据依赖

1. `application-bff.publisherList`
2. `application-bff.publisherDetail`
3. `application-bff.markViewed`
4. `application-bff.markContactPending`
5. `application-bff.markCommunicating`
6. `application-bff.markRejected`
7. `application-bff.markCompleted`
8. `application-bff.revealCreatorContact`

#### 页面目标

1. 快速扫读达人摘要
2. 快速推进报名状态

#### 必须实现的状态

1. 有报名
2. 空状态
3. 已处理状态混排

### 10.9 报名页 `packages/creator/apply`

#### 数据依赖

1. `notice-bff.detail`
2. `creator-bff.getCard`
3. `creator-bff.upsertCard`
4. `application-bff.submit`

#### 必须实现的状态

1. 首次补名片
2. 已补全直接报名
3. 提交成功
4. 校验失败

#### 表单规则

1. 通告摘要固定置顶
2. 首次报名时可联动补齐达人名片
3. 补名片与报名表单都采用分组卡片

### 10.10 我的报名列表 `packages/creator/application-list`

#### 数据依赖

1. `application-bff.myList`

#### 必须实现的状态

1. 全部
2. 已查看
3. 待联系
4. 已沟通
5. 未入选
6. 空状态

### 10.11 报名详情页 `packages/creator/application-detail`

#### 数据依赖

1. `application-bff.detail`

#### 页面目标

1. 一眼看懂当前进展
2. 明确是否已释放联系方式

#### 必须实现的状态

1. 已报名
2. 已查看
3. 待联系
4. 已沟通
5. 未入选
6. 已完成
7. 联系方式释放态

#### 联调重点

1. 联系方式是否完全以 `permissionState.canViewPublisherContact` 为准
2. 时间线节点是否与状态流转一致

### 10.12 达人名片页 `packages/creator/creator-card`

#### 数据依赖

1. `creator-bff.getCard`
2. `creator-bff.upsertCard`

#### 必须实现的状态

1. 首次创建
2. 已存在编辑
3. 资料不完整
4. 保存成功

### 10.13 消息中心 `pages/messages/index`

#### 数据依赖

1. `message-bff.list`
2. `message-bff.markRead`
3. `message-bff.markAllRead`

#### 必须实现的状态

1. 全部
2. 系统通知
3. 审核通知
4. 报名通知
5. 空状态

#### 交互重点

1. 像收件箱，不做聊天气泡
2. 已读未读有显式点位

### 10.14 我的页面 `pages/mine/index`

#### 数据依赖

1. `user-bff.mine`
2. `user-bff.setPreferredView`

#### 页面目标

1. 呈现个人工作台
2. 承接四个核心入口
3. 呈现角色能力与限制状态

#### 必须实现的状态

1. 游客态
2. 单角色态
3. 双角色态
4. 限制状态提示

#### 交互重点

1. 双角色用户可切换优先视角
2. 入口锁定时要显示原因和补全 CTA
3. 不隐藏 `我的通告`、`我的报名`、`达人名片`、`消息中心`

### 10.15 举报页 `packages/mine/report`

#### 数据依赖

1. `report-bff.submit`

#### 必须实现的状态

1. 未填写
2. 已填写
3. 提交成功

### 10.16 举报记录页 `packages/mine/report-records`

#### 数据依赖

1. `report-bff.myList`

#### 必须实现的状态

1. 处理中
2. 已处理
3. 未成立
4. 空状态

### 10.17 意见反馈页 `packages/mine/feedback`

#### 数据依赖

1. `feedback-bff.submit`

#### 必须实现的状态

1. 未填写
2. 可提交
3. 提交成功

### 10.18 规则说明页 `packages/mine/rules`

#### 数据来源

V1 可先使用静态文案或 `dm_configs` 公共配置

#### 页面目标

1. 快速扫读规则
2. 保持产品化卡片风格

## 11. 表单字段与校验规范

### 11.1 发布方资料

1. `displayName` 最多 20 字
2. `contactValue` 最多 40 字
3. `intro` 最多 80 字

### 11.2 通告表单

1. `title` 最多 28 字
2. `brandName` 最多 20 字
3. `creatorRequirements` 最多 200 字
4. `cooperationDescription` 最多 500 字
5. `attachments` 最多 6 张

### 11.3 报名表单

1. `selfIntroduction` 最多 200 字
2. `deliverablePlan` 最多 200 字
3. `expectedTerms` 最多 120 字
4. `portfolioImages` 最多 3 张

### 11.4 达人名片

1. `nickname` 最多 20 字
2. `accountName` 最多 30 字
3. `accountIdOrLink` 最多 100 字
4. `caseDescription` 最多 200 字
5. `portfolioImages` 至少 1 张，最多 6 张
6. `contactValue` 最多 40 字

### 11.5 举报与反馈

1. 举报说明最多 200 字
2. 举报证据最多 6 张
3. 反馈描述最多 300 字
4. 反馈截图最多 4 张
5. 反馈联系方式最多 40 字

### 11.6 校验实现方式

1. `validator.ts` 维护统一规则
2. 输入时做轻校验，提交时做强校验
3. 错误信息贴字段显示

## 12. 权限、身份与 CTA 规则

### 12.1 游客态定义

1. 已建平台用户
2. 未完成发布方资料或达人名片

### 12.2 前端能力判断来源

全部来源于服务端：

1. `roleFlags`
2. `accountStatus`
3. `permissionState`
4. `ctaState`
5. `availableActions`

### 12.3 前端禁止自行决定的内容

1. 是否释放联系方式
2. 是否允许报名
3. 是否允许关闭或重发通告
4. 是否允许查看某对象

## 13. 云函数映射表

### 13.1 用户域

1. `user-bff.bootstrap`
2. `user-bff.mine`
3. `user-bff.setPreferredView`

### 13.2 发布方域

1. `publisher-bff.getProfile`
2. `publisher-bff.upsertProfile`

### 13.3 达人域

1. `creator-bff.getCard`
2. `creator-bff.upsertCard`

### 13.4 通告域

1. `notice-bff.list`
2. `notice-bff.detail`
3. `notice-bff.createDraft`
4. `notice-bff.updateDraft`
5. `notice-bff.submitReview`
6. `notice-bff.myList`
7. `notice-bff.close`
8. `notice-bff.republish`

### 13.5 报名域

1. `application-bff.submit`
2. `application-bff.withdraw`
3. `application-bff.myList`
4. `application-bff.detail`
5. `application-bff.publisherList`
6. `application-bff.publisherDetail`
7. `application-bff.markViewed`
8. `application-bff.markContactPending`
9. `application-bff.markCommunicating`
10. `application-bff.markRejected`
11. `application-bff.markCompleted`
12. `application-bff.revealCreatorContact`

### 13.6 消息与治理

1. `message-bff.list`
2. `message-bff.markRead`
3. `message-bff.markAllRead`
4. `report-bff.submit`
5. `report-bff.myList`
6. `feedback-bff.submit`

## 14. 上传与媒体实现

### 14.1 上传组件职责

`uploader-grid` 负责：

1. 调用 `wx.chooseMedia`
2. 调用统一上传工具
3. 控制数量上限
4. 展示用途说明

### 14.2 路径约定

1. 通告附件：`notice-images/{noticeId}/`
2. 达人作品图：`creator-portfolio/{creatorCardId}/`
3. 举报证据：`report-evidence/{reportId}/`
4. 反馈截图：`feedback-screenshots/{feedbackId}/`

### 14.3 前端注意事项

1. 上传成功只表示文件上传成功，不表示表单提交成功
2. 删除上传项时区分“本地待提交”和“已提交记录”

## 15. 性能与包体要求

### 15.1 性能目标

1. 广场首屏感知快于 1 秒
2. 详情页切换尽量避免白屏
3. 长列表使用分页加载，避免一次性取完

### 15.2 包体控制

1. 主包仅保留高频页面
2. 图标和插图控制体积
3. 公共组件避免重复资源

### 15.3 渲染优化

1. 列表项避免复杂嵌套
2. 长文案折叠和省略处理
3. 大图上传前压缩

## 16. 测试与验收

### 16.1 关键验收场景

1. 首页第一眼是否符合独立移动产品感
2. 详情页首屏是否能做报名决策
3. 发布与报名流程是否按分组卡片和固定 CTA 落地
4. 游客态、双角色态、校验错误态、联系方式释放态是否真实存在

### 16.2 前后端联调必测

1. 不同身份下 CTA 是否正确
2. 联系方式是否按服务端返回显示
3. 限制发布或限制报名时是否正确拦截
4. 筛选条件是否跨广场与搜索保留
5. 我的页四个核心入口是否都能给出正确锁定说明

### 16.3 真机必测

1. iPhone 安全区
2. Android 长列表滚动
3. 上传、时间选择器、底部固定栏

## 17. 推荐开发顺序

1. `app.ts`、全局样式、request 封装
2. 共享组件与 token 映射
3. 广场首页、搜索页、详情页
4. 发布页、发布成功页、我的通告、编辑页、报名管理页
5. 报名页、我的报名、报名详情、达人名片
6. 消息中心、我的页、举报、举报记录、反馈、规则页

## 18. 技术总监复审结论

以技术总监视角，前端开发文档达到可开工标准，但要求实现时继续遵守以下红线：

1. 不要为了赶进度把云函数 action 名、错误码和字段名写散到页面中。
2. 不要让 UI 状态依赖前端猜测服务端权限。
3. 不要把高保真稿当成数据结构来源，字段和权限必须以后端文档为准。
4. 任何新增页面或组件，都必须先判断是否可以复用现有组件和 token。

本轮复审已合入以下修订：

1. 补齐 `notice-detail` 主包路由，避免目录与页面清单不一致。
2. 将低频业务页统一收束到 `packages/` 分包结构，避免主包与分包路径混乱。
3. 增补 `app.json`、TabBar、路由固定策略，锁定页面入口。
4. 增补通用页面状态机要求，避免各页面各自定义 loading / empty / error 口径。
