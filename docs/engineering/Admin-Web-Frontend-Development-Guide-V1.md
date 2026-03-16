# 多米通告 运营后台前端开发文档 V1

## 1. 文档信息

- 文档名称：运营后台前端开发文档 V1
- 对应后台需求：[Admin-Operations-Backend-PRD-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/product/Admin-Operations-Backend-PRD-V1.md)
- 对应技术选型：[Technical-Architecture-Selection-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/Technical-Architecture-Selection-V1.md)
- 对应后端总文档：[CloudBase-Backend-Development-Guide-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudBase-Backend-Development-Guide-V1.md)
- 对应后台鉴权规范：[CloudBase-Admin-Auth-Spec-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)
- 对应 API Contract：[CloudFunction-API-Contract-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudFunction-API-Contract-V1.md)
- 对应运行手册：[Backend-Env-Deploy-Runbook-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/Backend-Env-Deploy-Runbook-V1.md)
- 文档日期：2026-03-16
- 文档目标：为多米通告 V1 运营后台输出一份可直接指导前端工程落地的详细开发文档，统一工程结构、登录鉴权、布局组件、页面模式、服务调用和联调规范

## 2. 开发目标与范围

### 2.1 后台前端目标

1. 用独立 Web 管理端支撑通告审核、举报处理、黑名单处罚和处理记录查询闭环。
2. 让审核员、运营管理员、超级管理员能在桌面端高效完成列表筛选、详情判断和高风险动作执行。
3. 统一后台前端的工程结构、布局模式、列表页与详情页模式，避免后续页面越做越散。
4. 与 `admin-auth`、`review-admin`、`governance-admin` 云函数保持一一对应的服务层和权限模型。

### 2.2 范围

本文档覆盖：

1. 管理后台技术栈与工程结构
2. 登录与权限接入
3. 布局、组件与页面模式
4. 路由设计与角色守卫
5. 业务页面开发规范
6. 服务层、状态管理、错误处理
7. 测试、验收、上线联调要求

### 2.3 非目标

1. 不做复杂 BI 大屏
2. 不做可视化规则编排系统
3. 不做多组织多租户权限体系
4. 不做后台 UI 高保真定制稿，V1 以高效率内部工具体验优先

## 3. 技术路线与实现前提

### 3.1 固定技术栈

1. Vue 3
2. Vite
3. TypeScript
4. Element Plus
5. Pinia
6. Vue Router
7. Sass / SCSS

### 3.2 开发前提

1. 后台 Web 不复用小程序身份。
2. 后台登录统一走 `admin-auth`。
3. 后台所有业务页面都必须经过路由登录守卫与角色守卫。
4. 后台不直连数据库，全部通过云函数 action 调用。
5. 后台所有请求的 `meta.source` 固定为 `admin-web`。
6. 列表类接口统一按 API Contract 的 `cursor` 分页模型实现，前端不得自行假定存在 `total`、`pageNo`、`pageCount`。

### 3.3 文档事实来源优先级

当实现细节出现冲突时，按以下顺序认定：

1. [CloudFunction-API-Contract-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudFunction-API-Contract-V1.md)
2. [CloudBase-Admin-Auth-Spec-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)
3. [CloudBase-Backend-Development-Guide-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudBase-Backend-Development-Guide-V1.md)
4. [Admin-Operations-Backend-PRD-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/product/Admin-Operations-Backend-PRD-V1.md)
5. 本文档

说明：

1. 本文档负责把后台前端落地方式定清楚，但不覆盖已锁定的接口 contract。
2. PRD 中若出现尚未进入 contract 的能力，前端默认不自行扩展实现。

## 4. 后台实现总原则

### 4.1 业务效率优先

1. 后台是桌面工具，不追求营销感，优先保证信息密度、筛选效率和风险动作可控。
2. 列表页必须支持快速定位，详情页必须支持同屏做决策。

### 4.2 风险动作显式化

1. 通过、驳回、补资料、转复核、下架、处罚、解除处罚都属于高风险动作。
2. 高风险动作必须经过确认弹层、理由填写和结果反馈。
3. 高风险动作按钮样式必须形成清晰主次，不允许所有按钮视觉权重一样。

### 4.3 角色与权限显式化

1. 前端不隐藏所有无权限页面后再让用户猜原因。
2. 路由不可访问的页面直接拦截。
3. 页面内不可执行的动作可以置灰并展示原因说明。

### 4.4 页面模式统一

后台 V1 统一采用 4 种页面模式：

1. 登录页
2. 工作台页
3. 列表页
4. 详情处理页

### 4.5 组件复用优先

1. 筛选区、列表表格、状态标签、风险标签、详情卡片、操作面板都必须组件化。
2. 不允许每个页面单独写一套筛选表单和状态标签。

## 5. 后台前端视觉与交互基线

说明：

1. 当前仓库没有独立后台 UI 定稿稿件。
2. 因此本开发文档同时承担后台界面实现基线定义，避免开发时无规范可依。

### 5.1 视觉方向

1. 风格定位为“清晰、克制、专业的现代运营后台”。
2. 保留多米通告品牌蓝作为主色，但不套用小程序首页的大渐层风格。
3. 后台整体以浅色界面为主，强调表格、筛选区、详情区和风险动作区的分层。

### 5.2 设计 token 建议

| 角色 | 色值 | 用途 |
| --- | --- | --- |
| Primary | `#2F6BFF` | 主操作、链接、高亮筛选 |
| Success | `#12B3A8` | 通过、完成、正常 |
| Warning | `#FFB547` | 待处理、补资料、提醒 |
| Danger | `#E35D6A` | 下架、封禁、驳回、危险操作 |
| Background | `#F4F7FB` | 页面背景 |
| Surface | `#FFFFFF` | 卡片、表格、弹层 |
| Border | `#E3E8F0` | 分割线、边框 |
| Text Primary | `#152033` | 主文本 |
| Text Secondary | `#5C6980` | 次文本 |

补充约束：

1. 标题字号建议使用 `20 / 24`，正文 `14 / 16`，表格正文默认 `14`。
2. 常规圆角使用 `12`，大卡片与弹层圆角使用 `16`。
3. 卡片阴影保持轻量，不使用厚重投影，建议控制在 `0 8px 24px rgba(21, 32, 51, 0.08)` 以内。
4. 所有风险动作颜色仅用于关键按钮和标签，不得把整块面板做成大面积红底。

### 5.3 布局规范

1. 主体采用“左侧导航 + 顶部栏 + 内容区”结构。
2. 列表页筛选区始终在表格上方，不做隐藏式复杂筛选抽屉。
3. 详情页优先采用“双栏结构”：
   - 左侧信息详情
   - 右侧风险信息与操作面板
4. 高风险确认弹层采用右侧操作区 + 确认弹窗双保险。
5. 桌面开发基线宽度按 `1280px` 设计，`1440px` 为主验收分辨率。
6. 小于 `1180px` 时允许内容区横向滚动，但不为 V1 单独设计移动后台。

### 5.4 交互规范

1. 列表页筛选采用“修改即查询”还是“点查询再执行”，V1 统一采用“点查询”模式。
2. 所有高风险处理动作必须二次确认。
3. 表格分页、筛选、排序必须保留当前查询上下文。
4. 详情页返回列表时，列表条件不丢失。
5. 弹层确认态必须具备键盘回车确认与 `Esc` 取消能力。
6. 焦点态、禁用态、错误态需要有明确视觉差异，不能只靠颜色轻微变化。

## 6. 工程结构建议

### 6.1 目录结构

```text
admin-web/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  .env.development
  .env.test
  .env.production
  src/
    main.ts
    App.vue
    router/
      index.ts
      guards.ts
    stores/
      auth.store.ts
      app.store.ts
      review.store.ts
      report.store.ts
      dictionary.store.ts
    layouts/
      AdminLayout.vue
      AuthLayout.vue
    pages/
      auth/
        login/
      dashboard/
        index/
      review/
        list/
        detail/
      report/
        list/
        detail/
      blacklist/
        list/
      logs/
        index/
      forbidden/
        index/
    components/
      app-shell/
      side-nav/
      top-bar/
      filter-toolbar/
      status-tag/
      risk-flag-list/
      stats-card/
      detail-section-card/
      action-panel/
      confirm-action-dialog/
      table-empty/
      page-skeleton/
      page-error-state/
    services/
      client.ts
      admin-auth.service.ts
      review.service.ts
      governance.service.ts
    models/
      auth.ts
      review.ts
      report.ts
      governance.ts
      common.ts
    constants/
      routes.ts
      roles.ts
      status.ts
      ui.ts
    composables/
      usePageQuery.ts
      useAsyncAction.ts
      usePermission.ts
      useCursorPager.ts
      useTableState.ts
    utils/
      request.ts
      permission.ts
      formatter.ts
      export.ts
    styles/
      tokens.scss
      variables.scss
      element-overrides.scss
      helpers.scss
```

### 6.2 分层原则

1. `pages` 只负责页面编排。
2. `components` 承担复用 UI。
3. `services` 只负责 action 调用。
4. `stores` 管理跨页状态。
5. `composables` 管理列表页、详情页通用交互逻辑。

### 6.3 页面目录约定

1. 每个页面目录默认包含 `index.vue`。
2. 列表页可选拆出 `columns.ts`、`filters.ts` 管理列定义与筛选 schema。
3. 详情页可选拆出 `action-schema.ts` 管理动作面板配置和确认文案。
4. 页面级私有组件放在对应页面目录下，不进入全局 `components`。

## 7. 路由与权限设计

### 7.1 路由结构

| 路由 | 页面 | 角色要求 |
| --- | --- | --- |
| `/login` | 登录页 | 无 |
| `/dashboard` | 工作台 | `reviewer` / `ops_admin` / `super_admin` |
| `/review/list` | 审核列表 | `reviewer` / `ops_admin` / `super_admin` |
| `/review/:reviewTaskId` | 审核详情 | `reviewer` / `ops_admin` / `super_admin` |
| `/report/list` | 举报列表 | `reviewer` / `ops_admin` / `super_admin` |
| `/report/:reportId` | 举报详情 | `reviewer` / `ops_admin` / `super_admin` |
| `/blacklist` | 黑名单与处罚列表 | `ops_admin` / `super_admin` |
| `/logs` | 操作日志 | `ops_admin` / `super_admin` |
| `/403` | 无权限页 | 已登录 |

说明：

1. 详情路由参数命名与 API Contract 保持一致，避免页面层和服务层二次转换。
2. 页面语义保留“黑名单”命名，但服务层统一映射 `accountActionList`、`createAccountAction`、`releaseAccountAction`。

### 7.2 路由守卫

路由守卫顺序：

1. 读取本地 `adminSessionToken`
2. 无 token 且目标路由非公开时跳转 `/login`
3. 有 token 时调用 `admin-auth.me`
4. 将 `adminUser`、`roleCodes`、`permissionSummary` 写入 `auth.store`
5. 若 `mustResetPassword = true`，进入强制改密流程
6. 判断目标路由 `allowedRoles`
7. 无权限跳转 `/403`
8. `me` 失败且非权限问题时清理登录态并跳回 `/login`

### 7.3 页面内动作守卫

1. 路由可访问不代表页面内所有按钮都可点击。
2. 动作按钮显隐与禁用统一通过 `usePermission()` 管理。
3. 不允许在模板里散落字符串式角色判断。

### 7.4 路由 meta 约定

建议每个业务路由至少声明以下 meta：

1. `requiresAuth`
2. `allowedRoles`
3. `pageKey`
4. `keepQueryState`

## 8. 登录与鉴权接入

### 8.1 登录流程

1. 用户访问 `/login`
2. 输入用户名和密码
3. 调用 `admin-auth.login`，并在 `meta.source` 传 `admin-web`
4. 存储 `adminSessionToken`
5. 跳转工作台
6. 若 `mustResetPassword = true`，强制展示改密流程

### 8.2 登录态存储

建议：

1. `adminSessionToken` 默认放 `sessionStorage`
2. `adminUser` 与 `roleCodes` 存 `auth.store`
3. 不把权限结果散落到 localStorage 多份缓存
4. 若后续要支持“记住登录”，必须单独评审安全方案，V1 不默认开启

### 8.3 应用启动恢复

1. `main.ts` 启动时先读取本地 `adminSessionToken`
2. 若存在 token，则优先调用 `admin-auth.me`
3. `me` 成功后再挂载主路由内容，避免页面首屏闪回登录
4. `me` 失败则清空本地 session 并回到 `/login`

### 8.4 会话失效处理

当接口返回 `30002`：

1. 清理本地登录态
2. 弹出“登录已失效，请重新登录”
3. 跳转登录页

### 8.5 权限不足处理

当接口返回 `30003`：

1. 页面内显示无权限提示
2. 若为整页不可访问，则跳转 `/403`

### 8.6 强制改密拦截

1. `mustResetPassword = true` 时，登录后默认弹出不可跳过的改密流程。
2. 未完成改密前，左侧导航与高风险动作全部禁用。
3. 改密成功后重新调用 `admin-auth.me` 刷新登录态摘要。

## 9. 全局布局与共享组件

### 9.1 `AdminLayout`

结构：

1. 左侧导航
2. 顶部信息栏
3. 内容滚动区
4. 全局反馈层

要求：

1. 导航宽度固定
2. 内容区最大化利用桌面空间
3. 顶部栏展示当前管理员信息、角色、登出入口

### 9.2 `filter-toolbar`

用途：

1. 列表页筛选区统一承载
2. 支持输入框、单选下拉、时间区间、查询与重置按钮

规则：

1. 查询按钮固定在右侧
2. 筛选条件过多时允许换行，不做弹层高级筛选

### 9.3 `status-tag`

用途：

1. 通告状态
2. 审核任务状态
3. 举报状态
4. 处罚状态

规则：

1. 所有业务状态使用统一颜色语义
2. 表格和详情页共用同一套状态组件

### 9.4 `risk-flag-list`

用途：

1. 展示敏感词、联系方式异常、多次举报等风险标签

### 9.5 `detail-section-card`

用途：

1. 详情页的信息分区容器
2. 承载基础信息、发布方信息、历史记录、风险信息等模块

### 9.6 `action-panel`

用途：

1. 审核与举报详情页右侧操作面板
2. 承载动作按钮、理由选择、备注输入

### 9.7 `confirm-action-dialog`

用途：

1. 封装通过、驳回、补资料、封禁、解除处罚等确认动作
2. 校验必填理由和备注

### 9.8 页面状态组件

统一组件：

1. `page-skeleton`
2. `page-error-state`
3. `table-empty`

### 9.9 页面状态机约定

所有后台页面统一收敛为以下状态：

1. `loading`：首次加载
2. `ready`：正常展示
3. `empty`：无数据
4. `error`：首次加载失败
5. `submitting`：动作提交中
6. `readonly`：详情页可读但不可执行

落地规则：

1. 列表页至少区分 `loading / ready / empty / error`
2. 详情页至少区分 `loading / ready / readonly / error / submitting`
3. 高风险动作提交中时，操作面板要整体锁定，避免重复点击

### 9.10 可访问性基线

1. 文本与背景对比度至少满足 WCAG AA。
2. 所有弹层、抽屉、确认框都要有可见焦点和键盘关闭路径。
3. 表格操作按钮不能只提供图标，必须保留文字或 tooltip 说明。

## 10. 页面开发规范

### 10.1 登录页 `pages/auth/login`

#### 页面目标

1. 快速、稳定完成后台登录
2. 不做营销感页面

#### 数据依赖

1. `admin-auth.login`
2. `admin-auth.changePassword`

#### 必须实现的状态

1. 初始输入态
2. 登录提交态
3. 登录失败态
4. 首次改密态

### 10.2 工作台 `pages/dashboard/index`

#### 数据依赖

1. `governance-admin.dashboard`

#### 页面结构

1. 顶部数据卡
2. 快捷入口
3. 优先处理列表

#### 必须实现的状态

1. 加载态
2. 正常数据态
3. 空状态
4. 错误态

#### 角色差异

1. `reviewer` 默认只展示可进入审核、举报的快捷入口。
2. `ops_admin` / `super_admin` 才显示黑名单、操作日志相关入口。
3. 数据卡展示可全量返回，但快捷动作显隐仍以 `permissionSummary` 为准。

### 10.3 审核列表 `pages/review/list`

#### 数据依赖

1. `review-admin.taskList`

#### 页面目标

1. 快速筛选待审核任务
2. 快速定位高风险通告

#### 页面结构

1. 页面标题
2. 筛选工具栏
3. 列表表格
4. 分页区

#### 筛选项

1. `taskStatus`
2. `reviewStage`
3. `city`
4. `identityType`
5. `riskLevel`
6. `pageSize`

#### 表格建议字段

1. 通告标题
2. 发布方名称
3. 身份类型
4. 城市
5. 平台
6. 结算方式
7. 风险标签
8. 通告状态
9. 审核阶段
10. 提交时间
11. 操作列

#### 必须实现的状态

1. 首次加载
2. 有数据
3. 空列表
4. 查询报错

#### 交互要求

1. 点击行或操作按钮进入审核详情
2. 列表条件与分页状态在返回时保留
3. 高风险项视觉突出，但不破坏表格可读性
4. 分页按 `cursor` 模式实现，支持上一页 / 下一页，不要求任意页码跳转

### 10.4 审核详情 `pages/review/detail`

#### 数据依赖

1. `review-admin.taskDetail`
2. `review-admin.claimTask`
3. `review-admin.releaseTask`
4. `review-admin.resolveTask`

#### 页面结构

左侧：

1. 通告基础信息
2. 发布方信息
3. 图片与截图
4. 历史处理记录

右侧：

1. 风险提示
2. 当前任务摘要
3. 审核动作区

#### 必须实现的状态

1. 未领取任务
2. 已领取可处理
3. 已处理只读
4. 数据加载失败
5. 被他人领取只读

#### 动作要求

1. 支持 `通过`
2. 支持 `驳回`
3. 支持 `需补充资料`
4. 支持 `转人工复核`
5. 支持 `直接下架`

#### 交互规则

1. 非本人领取的处理中任务默认只读
2. 非通过类动作必须填写原因分类
3. 提交前弹出确认弹层
4. 页面动作区以 `availableActions` 为唯一渲染依据
5. `claimTask` 成功后刷新详情，`resolveTask` 成功后刷新详情并可回退列表

### 10.5 举报列表 `pages/report/list`

#### 数据依赖

1. `governance-admin.reportList`

#### 页面目标

1. 快速查看举报量和高风险举报
2. 支持对象聚合查看

#### 筛选项

1. `status`
2. `targetType`
3. `reasonCode`
4. `pageSize`

说明：

1. PRD 中提到的 `风险等级`、`举报时间` 筛选，当前以 API Contract 为准，不在首版强行自行扩展。
2. 举报列表点击后统一进入 `reportDetail`，V1 不额外建设独立“用户详情页”。

#### 表格建议字段

1. 举报对象类型
2. 对象名称或 ID
3. 举报原因
4. 举报状态
5. 累计举报次数
6. 是否高风险
7. 举报时间
8. 操作列

#### 必须实现的状态

1. 加载态
2. 正常列表
3. 空状态
4. 错误态
5. 游标翻页态

### 10.6 举报详情 `pages/report/detail`

#### 数据依赖

1. `governance-admin.reportDetail`
2. `governance-admin.claimReport`
3. `governance-admin.resolveReport`
4. `governance-admin.forceRemoveNotice`
5. `governance-admin.createAccountAction`

#### 页面结构

左侧：

1. 举报摘要
2. 被举报对象详情
3. 历史举报记录
4. 历史处罚记录

右侧：

1. 处理动作区
2. 联动处罚区
3. 风险提示区

#### 必须实现的状态

1. 待处理
2. 处理中
3. 已处理只读
4. 错误态
5. 被他人领取只读

#### 动作要求

1. 举报不成立
2. 举报成立但仅记录
3. 举报成立并下架通告
4. 举报成立并限制发布 / 报名 / 封禁

#### 交互要求

1. 联动处罚信息必须显式展示影响范围
2. 高风险处罚前必须二次确认
3. 完成处理后给出明确成功反馈
4. 页面动作面板必须根据 `availableActions` 动态组装，不通过前端硬编码角色推导可执行动作
5. `reviewer` 只显示后端明确放行的基础动作，涉及处罚的动作默认由 `ops_admin` / `super_admin` 处理

### 10.7 黑名单与处罚列表 `pages/blacklist/list`

#### 数据依赖

1. `governance-admin.accountActionList`
2. `governance-admin.createAccountAction`
3. `governance-admin.releaseAccountAction`

#### 页面目标

1. 查看当前处罚记录
2. 新增处罚
3. 提前解除处罚

#### 页面结构

1. 筛选工具栏
2. 处罚列表表格
3. 新增处罚弹层

#### 必须实现的状态

1. 正常列表
2. 空状态
3. 新增处罚表单态
4. 解除处罚确认态

#### 交互要求

1. 新增处罚需填写限制类型、原因分类、备注、时长
2. 解除处罚需填写解除说明
3. 超级管理员和运营管理员能力差异必须前端可见
4. 当前 API Contract 未提供单独“延长处罚” action，V1 统一通过新增一条处罚记录实现续期，不单独做续期按钮

### 10.8 操作日志页 `pages/logs/index`

#### 数据依赖

1. `governance-admin.operationLogList`

#### 页面目标

1. 支撑按对象、按操作者回溯
2. 保持查询效率

#### 表格建议字段

1. 对象类型
2. 对象 ID
3. 动作类型
4. 处理结果
5. 操作人
6. 操作时间
7. 备注摘要

#### 必须实现的状态

1. 正常列表
2. 空状态
3. 错误态

#### 实现说明

1. 当前 API Contract 已锁定筛选维度为 `targetType`、`targetId`、`operatorType`、`pageSize`。
2. PRD 中的“时间区间、处理动作”筛选先保留在文档意图层，V1 前端不自行添加无后端支撑的筛选项。

### 10.9 无权限页 `pages/forbidden/index`

#### 页面目标

1. 在用户已登录但无访问权限时给出明确说明

#### 页面内容

1. 无权限说明
2. 返回工作台
3. 联系超级管理员提示

### 10.10 V1 锁定实现说明

1. 后台不建设独立“用户详情页”，涉及账号信息统一在举报详情或处罚列表中查看对象快照。
2. 后台列表页统一走游标分页，不做基于 `total` 的传统页码跳转。
3. PRD 中未进入 API Contract 的筛选项和动作能力，不在首轮前端开发中自行扩展。
4. 所有动作面板都以后端返回的 `availableActions` 为最终事实来源。

## 11. 服务层映射

### 11.1 `admin-auth.service.ts`

封装：

1. `login`
2. `me`
3. `logout`
4. `changePassword`

### 11.2 `review.service.ts`

封装：

1. `taskList`
2. `taskDetail`
3. `claimTask`
4. `releaseTask`
5. `resolveTask`

### 11.3 `governance.service.ts`

封装：

1. `dashboard`
2. `reportList`
3. `reportDetail`
4. `claimReport`
5. `resolveReport`
6. `accountActionList`
7. `createAccountAction`
8. `releaseAccountAction`
9. `forceRemoveNotice`
10. `operationLogList`

### 11.4 `request.ts`

职责：

1. 统一拼装 `{ action, payload, meta }`
2. 自动带上 `adminSessionToken`
3. 处理 `30002`、`30003`
4. 标准化错误提示
5. 自动补充 `meta.source = admin-web`
6. 为列表接口统一转换 `cursor` 响应到前端分页状态模型

### 11.5 前端返回模型约定

1. 列表页统一消费 `CursorListResult<T>`：`{ list, nextCursor, hasMore }`
2. 详情页统一消费 `DetailResult<T>`，并显式包含 `availableActions`
3. 动作型接口成功后优先以返回的最新 `status` 字段刷新本地 UI，而不是盲目乐观更新

## 12. 状态管理建议

### 12.1 `auth.store`

维护：

1. `adminUser`
2. `roleCodes`
3. `adminSessionToken`
4. `mustResetPassword`
5. `permissionSummary`
6. `sessionExpiresAt`
7. `idleExpireAt`

### 12.2 `app.store`

维护：

1. 全局 loading
2. 全局消息提示
3. 侧边栏折叠状态

### 12.3 `review.store`

维护：

1. 审核列表查询条件
2. 审核列表分页状态
3. `cursorStack`
4. `currentCursor`
5. `currentVirtualPage`

### 12.4 `report.store`

维护：

1. 举报列表查询条件
2. 举报列表分页状态
3. `cursorStack`
4. `currentCursor`
5. `currentVirtualPage`

### 12.5 `dictionary.store`

维护：

1. 状态文案映射
2. 风险等级文案映射
3. 原因分类选项映射
4. 限制类型文案映射

## 13. 表格、筛选与详情页实现规范

### 13.1 表格规范

1. 所有列表页统一采用 Element Plus 表格。
2. 操作列固定在右侧。
3. 状态、风险标签通过组件渲染，不直接写字符串。

### 13.2 筛选规范

1. 默认筛选项放工具栏。
2. `重置` 与 `查询` 按钮固定存在。
3. 时间区间统一格式。

### 13.3 详情页规范

1. 左侧信息，右侧动作的双栏结构优先。
2. 长内容使用模块卡片分组。
3. 历史记录与操作区不得混在一个表单区。

### 13.4 游标分页规范

1. 审核列表、举报列表、处罚列表、操作日志列表统一采用游标分页。
2. 前端使用 `cursorStack` 记录历史游标，支撑“上一页”返回。
3. 筛选条件变更后必须重置 `cursorStack` 和虚拟页码。
4. V1 不实现依赖总数的任意页跳转，也不伪造 `total`。

### 13.5 查询条件保留规范

1. 列表页查询条件需同时保留在 store 与路由 query。
2. 从详情页返回列表时，优先恢复离开前的 query 和虚拟页码。
3. 浏览器刷新后若仍有有效 query，可直接按 query 恢复列表。

### 13.6 详情动作刷新规范

1. 详情页执行 `claim`、`release`、`resolve` 后必须重新请求详情接口。
2. 动作成功后若状态进入只读，右侧面板需立刻切为只读模式。
3. 动作失败时保留已填写备注和原因分类，避免重复输入。

## 14. 错误处理与反馈

### 14.1 页面级错误

1. 首次加载失败展示 `page-error-state`
2. 提供重试入口

### 14.2 动作级错误

1. 动作失败使用明确错误文案
2. 保留已填写表单内容，不强制清空

常见错误映射：

1. `30002`：登录态失效，统一回登录页
2. `30003`：权限不足，整页跳 `/403` 或动作级禁用
3. `40003`：参数校验失败，优先映射到表单字段错误
4. `60001`：任务已被他人处理，详情页需刷新为最新只读态

### 14.3 成功反馈

1. 审核提交成功
2. 举报处理成功
3. 处罚新增成功
4. 处罚解除成功

都应给出明确反馈，并在需要时返回列表刷新。

## 15. 测试与验收

### 15.1 核心验收场景

1. 登录态过期能否正确跳回登录页
2. 审核员能否独立走完审核闭环
3. 运营管理员能否独立走完举报与处罚闭环
4. 不同角色是否只看到可执行动作
5. 日志与黑名单页是否可回溯关键动作
6. 强制改密流程是否能阻断进入正式工作区
7. 游标分页翻页和返回列表时是否保持上下文

### 15.2 联调必测

1. `admin-auth.login` / `me` / `logout`
2. `review-admin.taskList` / `taskDetail` / `resolveTask`
3. `governance-admin.reportList` / `reportDetail` / `resolveReport`
4. `governance-admin.createAccountAction` / `releaseAccountAction`
5. `governance-admin.operationLogList`
6. `review-admin.claimTask` / `releaseTask`
7. `governance-admin.claimReport` / `forceRemoveNotice`

### 15.3 真机与浏览器兼容建议

1. Chrome 最新版
2. Edge 最新版
3. 常规 1440 宽桌面分辨率

## 16. 推荐开发顺序

1. 登录页、`auth.store`、路由守卫
2. `AdminLayout`、导航、顶部栏、通用样式
3. 工作台
4. 审核列表与审核详情
5. 举报列表与举报详情
6. 黑名单与处罚列表
7. 操作日志页

## 17. 技术总监复审结论

经本轮复审与修订，这份后台前端开发文档已达到定稿标准，可作为运营后台前端的直接开发依据。

最终锁定结论：

1. 小程序前端开发文档已定稿，本轮无需回退重写。
2. 运营后台前端开发文档已补齐鉴权启动、游标分页、页面状态机、角色动作边界和当前 V1 锁定实现说明。
3. 后台前端后续开发必须同时以本文档、[CloudFunction-API-Contract-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudFunction-API-Contract-V1.md) 与 [CloudBase-Admin-Auth-Spec-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/engineering/CloudBase-Admin-Auth-Spec-V1.md) 为事实来源。

开发红线：

1. 不要把角色判断和 action 名散落在页面组件里。
2. 不要把高风险动作直接挂在表格行上而不做二次确认。
3. 不要为了赶工把详情页做成大长表单页面，审核和举报详情必须保留“双栏决策页”结构。
4. 不要脱离 `CloudFunction-API-Contract-V1.md` 自己扩展请求结构。
