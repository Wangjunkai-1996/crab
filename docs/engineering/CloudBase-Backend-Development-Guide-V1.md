# 多米通告 CloudBase 后端开发文档 V1

## 1. 文档信息

- 文档名称：CloudBase 后端开发文档 V1
- 对应产品文档：[PRD-V1.md](../product/PRD-V1.md)
- 对应技术选型：[Technical-Architecture-Selection-V1.md](Technical-Architecture-Selection-V1.md)
- 对应字段字典：[Field-Dictionary-V1.md](../product/Field-Dictionary-V1.md)
- 对应状态流转：[Status-Flow-Matrix-V1.md](../product/Status-Flow-Matrix-V1.md)
- 对应审核工作流：[Review-Workflow-V1.md](../product/Review-Workflow-V1.md)
- 对应权限矩阵：[Visibility-Permissions-Matrix-V1.md](../product/Visibility-Permissions-Matrix-V1.md)
- 对应 UI 定稿：[UI-Final-Signoff-V1.md](../design/UI-Final-Signoff-V1.md)
- 对应 UI 设计系统：[UI-Design-System-V1.md](../design/UI-Design-System-V1.md)
- 对应后台需求：[Admin-Operations-Backend-PRD-V1.md](../product/Admin-Operations-Backend-PRD-V1.md)
- 文档日期：2026-03-16
- 文档目标：为多米通告 V1 输出一份可直接进入 CloudBase 后端开发的实现规范，统一云函数拆分、数据结构、权限收口、状态机和运维动作

## 2. 开发目标与范围

### 2.1 V1 后端目标

1. 跑通“浏览通告、发布通告、审核上架、达人报名、消息通知、举报处理、账号限制”闭环。
2. 所有核心业务规则都收口在服务端，不把状态判断、权限判断和联系方式释放放到前端。
3. 以 CloudBase 为唯一 V1 后端底座，优先保证开发速度、低运维成本和后续可迁移性。
4. 为后续小程序前端开发文档、后台开发文档和测试文档提供稳定后端口径。

### 2.2 V1 非目标

1. 不做独立注册登录页。
2. 不做企业认证体系。
3. 不做会员收费、付费解锁和平台结算。
4. 不做站内即时聊天。
5. 不引入独立搜索引擎、推荐引擎和自建 API 网关。

## 3. 后端总原则

### 3.1 身份原则

1. 小程序端不设计登录页。
2. 用户身份以 CloudBase 云函数中的 `cloud.getWXContext().OPENID` 为准。
3. 平台内部使用 `userId` 作为业务主键，`wxOpenId` 只在服务端存储和查询，不对前端透出。

### 3.2 BFF 原则

1. 小程序前台和运营后台都通过云函数访问业务数据。
2. 前端不允许直连核心业务集合做增删改查。
3. 所有核心集合默认通过数据库安全规则拒绝客户端直接读写。

### 3.3 权限原则

1. 联系方式可见性必须由服务端裁剪。
2. 账号限制状态必须由服务端拦截。
3. 对象归属校验必须在服务端完成。
4. 审核、举报、处罚、下架等高风险动作必须走后台专用云函数。

### 3.4 状态原则

1. `noticeStatus`、`applicationStatus`、`reviewTaskStatus`、`accountStatus` 都只能由云函数修改。
2. 通告业务状态和审核任务状态分离，不能复用一个字段承载两套语义。
3. 每次状态变化都要写操作日志，并按需要生成站内消息。

### 3.5 数据原则

1. 主表适度反规范化，优先保证列表查询性能和审核回溯稳定性。
2. 详情展示所需的关键文案、联系方式、展示名称等，都以业务快照为准。
3. 一名用户只维护一份发布方资料和一张达人名片。
4. 同一达人对同一通告只允许存在一条有效报名记录。

### 3.6 UI 联动原则

1. 后端返回结构不仅要满足业务正确性，还要满足已锁定 UI 稿的页面状态和首屏决策需求。
2. 对于 [UI-Final-Signoff-V1.md](../design/UI-Final-Signoff-V1.md) 中已点名锁定的状态页，后端必须返回足够字段，不能把关键 CTA、错误态或联系方式释放态交给前端自行推断。
3. 所有“游客态”“双角色态”“限制状态提示”“筛选回显”“联系方式释放态”都必须由服务端提供明确状态字段或能力字段。
4. 任何会影响 CTA 文案和按钮可点击状态的逻辑，都优先由服务端返回 `permissionState`、`ctaState` 或同等级结构，而不是前端本地散落判断。

## 4. CloudBase 环境与工程组织

### 4.1 环境规划

推荐至少拆分 3 套环境：

1. `dev`：本地联调、字段实验、调试日志放开。
2. `test`：提测环境，模拟真实审核与状态流转。
3. `prod`：正式环境，严格控制配置修改和数据权限。

### 4.2 初始化约定

云函数统一使用动态环境初始化：

```ts
import cloud from 'wx-server-sdk'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
```

说明：

1. 小程序端通过 `wx.cloud.init({ env, traceUser: true })` 初始化 CloudBase。
2. 后端开发不设计显式登录流程。
3. 当前调用用户的唯一可信身份来自 `OPENID`。

### 4.3 目录建议

```text
cloudfunctions/
  shared/
    src/
      auth/
      constants/
      db/
      enums/
      errors/
      logger/
      response/
      services/
      storage/
      utils/
      validators/
  user-bff/
    src/
  publisher-bff/
    src/
  creator-bff/
    src/
  notice-bff/
    src/
  application-bff/
    src/
  message-bff/
    src/
  report-bff/
    src/
  feedback-bff/
    src/
  admin-auth/
    src/
  review-admin/
    src/
  governance-admin/
    src/
  cron-jobs/
    src/
```

### 4.4 公共模块建议

`shared` 层至少包含以下能力：

1. `auth`：获取用户上下文、管理员上下文、账号状态断言、对象归属断言。
2. `db`：集合名常量、基础查询封装、事务与幂等工具。
3. `validators`：输入校验、字段长度和枚举合法性校验。
4. `response`：统一响应结构与错误映射。
5. `logger`：操作日志、错误日志、审计日志封装。
6. `services`：跨函数复用的领域服务，如消息服务、审核任务服务、联系方式裁剪服务。

### 4.5 数据库安全规则

V1 推荐规则：

1. `dm_users`、`dm_publisher_profiles`、`dm_creator_cards`、`dm_notices`、`dm_notice_review_tasks`、`dm_applications`、`dm_messages`、`dm_reports`、`dm_feedback_records`、`dm_account_actions`、`dm_operation_logs`、`dm_admin_users`、`dm_admin_sessions` 默认拒绝客户端直接读写。
2. 前台所有业务读写都经由云函数。
3. `dm_configs` 若存在纯公开配置，可按配置项粒度放开读取；广告配置、风控配置、审核配置仍只允许云函数读取。

## 5. 数据模型与集合设计

### 5.1 集合总览

| 集合名 | 用途 | 主要写入入口 |
| --- | --- | --- |
| `dm_users` | 平台用户基础档案 | `user-bff` |
| `dm_publisher_profiles` | 发布方资料 | `publisher-bff` |
| `dm_creator_cards` | 达人名片 | `creator-bff` |
| `dm_notices` | 通告主表 | `notice-bff`、`review-admin`、`cron-jobs`、`governance-admin` |
| `dm_notice_review_tasks` | 审核任务流 | `notice-bff`、`review-admin` |
| `dm_applications` | 报名记录 | `application-bff` |
| `dm_messages` | 站内消息 | 各领域函数通过消息服务写入 |
| `dm_reports` | 举报记录 | `report-bff`、`governance-admin` |
| `dm_feedback_records` | 意见反馈 | `feedback-bff` |
| `dm_account_actions` | 限制发布、限制报名、封禁等处罚记录 | `governance-admin`、`cron-jobs` |
| `dm_operation_logs` | 敏感操作审计日志 | 全部领域函数 |
| `dm_admin_users` | 后台管理员账号 | `admin-auth` |
| `dm_admin_sessions` | 后台登录会话 | `admin-auth` |
| `dm_configs` | 系统配置、审核规则、风险词、公共文案等 | 后台维护或初始化脚本 |

说明：

1. 架构文档中的 `dm_account_actions` 与字段字典中的 `restrictionRecord` 在实现层视为同一类数据。
2. 字段字典已定义 `feedbackRecord`，因此实现层补充 `dm_feedback_records` 作为正式业务集合。
3. 后台鉴权支撑集合详见 [CloudBase-Admin-Auth-Spec-V1.md](CloudBase-Admin-Auth-Spec-V1.md)。

### 5.2 `dm_users`

用途：

1. 承载平台级用户主档。
2. 管理角色能力开通状态。
3. 存储账号限制状态和最近活跃信息。

关键约束：

1. `wxOpenId` 服务端唯一映射到一个 `userId`。
2. `publisherProfileId` 和 `creatorCardId` 都是可空的一对一关联。
3. `accountStatus` 为平台当前有效状态，用于前台写操作拦截。

索引建议：

1. `wxOpenId`
2. `userId`
3. `accountStatus + updatedAt`

### 5.3 `dm_publisher_profiles`

用途：

1. 承载发布方最小资料。
2. 为通告发布时生成资料快照。

关键约束：

1. `userId` 一对一唯一。
2. `contactValue` 为敏感字段，任何前台返回都不能原样透出给非本人。
3. `profileCompleteness` 由服务端统一计算。

索引建议：

1. `userId`
2. `status + updatedAt`

### 5.4 `dm_creator_cards`

用途：

1. 承载达人唯一名片。
2. 为报名记录生成达人快照和联系方式快照。

关键约束：

1. `userId` 一对一唯一。
2. `portfolioImages` 至少一张才允许进入完整状态。
3. `contactValue` 为敏感字段，只可在报名业务受控释放。

索引建议：

1. `userId`
2. `primaryPlatform + primaryCategory + updatedAt`

### 5.5 `dm_notices`

用途：

1. 承载广场、详情、我的通告列表的唯一业务主表。
2. 存储通告状态、快照字段和统计字段。

关键约束：

1. 发布动作只能发生在账号允许发布且发布方资料完整时。
2. 通告状态流转必须严格符合 [Status-Flow-Matrix-V1.md](../product/Status-Flow-Matrix-V1.md)。
3. `publisherContactTypeSnapshot` 和 `publisherContactValueSnapshot` 在创建或重新发布时固化。
4. 只有 `active` 状态进入广场默认列表。

索引建议：

1. `status + cooperationPlatform + cooperationCategory + city + createdAt`
2. `publisherUserId + createdAt`
3. `status + deadlineAt`
4. `reviewRoundCount + updatedAt`

### 5.6 `dm_notice_review_tasks`

用途：

1. 单独承载审核任务队列。
2. 与通告业务状态分离，保留完整审核历史。

关键约束：

1. 每次提交通告审核都创建一条新任务。
2. `transfer_manual_review` 会结束当前任务，并创建下一条人工复核任务。
3. 历史任务只追加，不覆盖。

索引建议：

1. `taskStatus + reviewStage + createdAt`
2. `objectId + createdAt`
3. `assignedTo + taskStatus + updatedAt`

### 5.7 `dm_applications`

用途：

1. 承载达人报名主记录。
2. 为发布方侧报名管理和达人侧我的报名提供单一事实源。

关键约束：

1. 同一 `creatorUserId + noticeId` 只允许一条有效报名记录。
2. 报名时固化达人名片快照和联系方式快照。
3. 发布方查看完整达人联系方式时必须记录 `creatorContactRevealedAt`。
4. 达人看到发布方联系方式的时机由报名状态决定，不由前端自行推断。

索引建议：

1. `noticeId + status + createdAt`
2. `creatorUserId + createdAt`
3. `publisherUserId + noticeId + createdAt`

实现建议：

1. 若环境支持唯一复合索引，可对 `noticeId + creatorUserId + isDeleted` 增加唯一约束。
2. 若暂不使用唯一索引，必须通过事务或幂等锁保证重复报名不会写出双记录。

### 5.8 `dm_messages`

用途：

1. 承载站内消息列表。
2. 为红点、已读和历史通知提供数据源。

索引建议：

1. `receiverUserId + isRead + createdAt`
2. `relatedObjectType + relatedObjectId`

约束：

1. 所有关键状态变化都优先写站内消息。
2. 订阅消息属于增强能力，不影响站内消息闭环。

### 5.9 `dm_reports`

用途：

1. 承载举报主记录。
2. 支撑后台举报处理和处罚联动。

索引建议：

1. `status + createdAt`
2. `targetType + targetId + createdAt`
3. `reporterUserId + createdAt`

关键约束：

1. 举报证据可为空，但原因必填。
2. 举报成立后可联动通告下架或账号处罚。
3. 举报不成立不修改业务对象状态，但保留全部痕迹。

推荐稳定枚举：

1. `pending`
2. `processing`
3. `confirmed`
4. `rejected`
5. `closed`

### 5.10 `dm_feedback_records`

用途：

1. 承载用户意见反馈和问题反馈。
2. 为上线后体验改进提供归档。

索引建议：

1. `userId + createdAt`
2. `status + createdAt`

推荐稳定枚举：

1. `pending`
2. `viewed`
3. `archived`

### 5.11 `dm_account_actions`

用途：

1. 承载观察名单、限制发布、限制报名、全量封禁等治理动作。
2. 作为 `dm_users.accountStatus` 的变更来源和审计凭证。

关键约束：

1. 每条处罚记录都要有原因分类、操作人、生效时间和状态。
2. `dm_users.accountStatus` 存当前有效态，`dm_account_actions` 存完整历史。
3. 到期处罚由 `cron-jobs` 自动解除并回写用户状态。

索引建议：

1. `userId + status + startAt`
2. `restrictionType + status + createdAt`
3. `endAt + status`

推荐记录状态枚举：

1. `active`
2. `released`

### 5.12 `dm_operation_logs`

用途：

1. 记录敏感操作和状态变更。
2. 用于审核申诉、举报排查、问题回溯和数据修复。

建议字段：

1. `logId`
2. `operatorType`
3. `operatorId`
4. `action`
5. `targetType`
6. `targetId`
7. `requestId`
8. `beforeSnapshot`
9. `afterSnapshot`
10. `remark`
11. `createdAt`

### 5.13 `dm_configs`

用途：

1. 承载风险词、审核原因分类、处罚原因分类、首页运营配置、广告位占位配置。
2. 避免把规则硬编码到多个云函数里。

建议配置分组：

1. `review_reason_categories`
2. `report_reason_codes`
3. `restriction_reason_categories`
4. `risk_keywords`
5. `ad_slots`
6. `feature_flags`

## 6. 云函数拆分与职责

### 6.1 拆分原则

1. 按业务域拆分，而不是一个巨型 `api` 函数。
2. 一个函数内部使用 `action` 路由，避免单动作单函数过碎。
3. 公共校验、日志、消息服务放到共享层。

### 6.2 小程序侧云函数

| 云函数 | 主要调用方 | 建议 action |
| --- | --- | --- |
| `user-bff` | 小程序 | `bootstrap` `mine` `setPreferredView` |
| `publisher-bff` | 小程序 | `getProfile` `upsertProfile` |
| `creator-bff` | 小程序 | `getCard` `upsertCard` |
| `notice-bff` | 小程序 | `list` `detail` `createDraft` `updateDraft` `submitReview` `myList` `close` `republish` |
| `application-bff` | 小程序 | `submit` `withdraw` `myList` `detail` `publisherList` `publisherDetail` `markViewed` `markContactPending` `markCommunicating` `markRejected` `markCompleted` `revealCreatorContact` |
| `message-bff` | 小程序 | `list` `markRead` `markAllRead` |
| `report-bff` | 小程序 | `submit` `myList` |
| `feedback-bff` | 小程序 | `submit` |

### 6.3 后台侧云函数

| 云函数 | 主要调用方 | 建议 action |
| --- | --- | --- |
| `admin-auth` | 运营后台 | `login` `me` `logout` `changePassword` |
| `review-admin` | 运营后台 | `taskList` `taskDetail` `claimTask` `releaseTask` `resolveTask` |
| `governance-admin` | 运营后台 | `dashboard` `reportList` `reportDetail` `claimReport` `resolveReport` `accountActionList` `createAccountAction` `releaseAccountAction` `forceRemoveNotice` `operationLogList` |
| `cron-jobs` | 定时任务 | `expireNotices` `releaseExpiredAccountActions` `repairCounters` `slaMonitor` `archiveMessages` |

### 6.4 `user-bff`

职责：

1. 首次进入小程序时自动创建平台用户。
2. 汇总“我的”页基础信息和角色能力。
3. 维护“优先视角切换”偏好。

关键规则：

1. `bootstrap` 必须幂等。
2. 若 `wxOpenId` 已存在，不重复创建用户。
3. 每次成功调用后更新 `lastActiveAt`。

### 6.5 `publisher-bff`

职责：

1. 读取和更新发布方资料。
2. 计算资料完整度。
3. 在资料完成后回写 `dm_users.roleFlags.publisherEnabled`。

关键规则：

1. 非本人不可读写。
2. `contactValue` 只对本人返回原值。
3. 完整度未达标时，不允许发布通告。

### 6.6 `creator-bff`

职责：

1. 读取和更新达人名片。
2. 计算名片完整度。
3. 在名片完成后回写 `dm_users.roleFlags.creatorEnabled`。

关键规则：

1. 一名用户仅一张名片。
2. `portfolioImages` 为空时不能标记为完整。
3. 联系方式对本人原样返回，对他人只走报名链路受控透出。

### 6.7 `notice-bff`

职责：

1. 广场列表、搜索筛选、详情页。
2. 通告草稿创建、编辑、提交审核、关闭、重新发布。

关键规则：

1. 详情页返回时要按当前访问者身份裁剪联系方式和按钮能力。
2. 非 `active` 状态通告默认不进入公开广场。
3. `submitReview` 必须同步创建审核任务。
4. `republish` 只允许来源状态为 `expired` 或 `closed`。

### 6.8 `application-bff`

职责：

1. 达人报名和撤回。
2. 发布方查看报名列表、推进报名状态、查看联系方式。
3. 达人查看我的报名和发布方联系方式。

关键规则：

1. 报名前必须校验达人名片完整。
2. 报名前必须校验通告状态为 `active` 且未截止。
3. 发布方操作报名状态前必须校验通告归属。
4. 联系方式释放动作必须留痕。

### 6.9 `message-bff`

职责：

1. 消息列表分页。
2. 消息已读和批量已读。
3. 未读数统计。

### 6.10 `report-bff`

职责：

1. 用户发起举报。
2. 用户查看本人举报处理进展。

关键规则：

1. 举报对象必须存在且当前可举报。
2. 允许游客态用户举报，但仍会落到平台用户身份上。

### 6.11 `feedback-bff`

职责：

1. 提交意见反馈。
2. 绑定截图和回访联系方式。

### 6.12 `review-admin`

职责：

1. 审核任务列表和详情。
2. 领取、释放、处理审核任务。
3. 根据审核结果修改通告业务状态并生成下一步任务或消息。

关键规则：

1. “转人工复核”只改变任务流，不新增前台通告状态。
2. 审核员重复提交同一任务结果时必须阻断。
3. 审核任务处理要与通告状态更新保持事务一致。

### 6.13 `governance-admin`

职责：

1. 举报处理。
2. 黑名单与限制记录维护。
3. 强制下架、处罚解除、操作日志查询。

关键规则：

1. 举报结论与处罚动作都必须可回溯。
2. 强制下架需要同时更新通告状态和通知发布方。
3. 生效中的处罚不得重复叠加冲突状态，应按优先级合并。

### 6.14 `cron-jobs`

职责：

1. 截止通告自动转 `expired`。
2. 到期处罚自动解除。
3. 异常统计补偿。
4. 审核 SLA 监控。

## 7. 统一接口约定

### 7.1 请求结构

建议所有云函数统一入参：

```json
{
  "action": "submit",
  "payload": {},
  "meta": {
    "source": "miniprogram",
    "clientVersion": "1.0.0",
    "adminSessionToken": ""
  }
}
```

说明：

1. `action` 为必填。
2. `payload` 承载业务参数。
3. `meta` 用于日志、灰度追踪以及后台 session 传递。
4. 小程序前台不需要传 `adminSessionToken`。

### 7.2 响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace-id"
}
```

表单与补资料相关接口补充约定：

1. 当返回 `40003` 或资料不完整相关错误时，`data` 建议允许携带 `errorType`、`fieldErrors`、`missingFieldKeys`。
2. `fieldErrors` 用于前端做字段级就近提示。
3. `missingFieldKeys` 用于发布页、名片页顶部补资料卡和入口锁定说明。

错误响应示例：

```json
{
  "code": 40001,
  "message": "当前账号已被限制发布",
  "data": null,
  "requestId": "trace-id"
}
```

### 7.3 错误码建议

| 范围 | 含义 |
| --- | --- |
| `0` | 成功 |
| `10000-19999` | 通用系统错误 |
| `20000-29999` | 身份与鉴权错误 |
| `30000-39999` | 权限与归属错误 |
| `40000-49999` | 参数校验错误 |
| `50000-59999` | 业务状态冲突 |
| `60000-69999` | 风控、审核、治理错误 |

建议固定部分业务码：

1. `20001`：用户上下文获取失败
2. `30001`：无对象访问权限
3. `40001`：账号被限制发布
4. `40002`：账号被限制报名
5. `50001`：当前通告状态不允许该操作
6. `50002`：当前报名状态不允许该操作
7. `50003`：请先完善发布方资料
8. `50004`：请先完善达人名片
9. `50005`：请勿重复报名
10. `60001`：审核任务已被处理

### 7.4 输入校验原则

1. 所有 action 入口先做 schema 校验。
2. 枚举字段只接受字段字典中已定义值。
3. 所有字符串字段统一做首尾空格清理和长度限制。
4. 图片文件列表需校验数量上限、业务归属和文件路径前缀。

## 8. 鉴权、权限与字段裁剪

### 8.1 平台用户上下文

所有小程序业务函数执行顺序统一为：

1. `getWXContext()` 获取 `OPENID`。
2. 用 `OPENID` 查找 `dm_users`。
3. 若不存在，则通过 `bootstrap` 逻辑补建用户。
4. 生成统一 `userContext`，包含 `userId`、角色能力、`accountStatus`。

### 8.2 账号状态拦截

建议统一封装：

1. `assertCanPublish(userContext)`
2. `assertCanApply(userContext)`
3. `assertAccountAvailable(userContext)`

拦截规则：

1. `restricted_publish` 和 `banned` 不可发布、编辑、重发通告。
2. `restricted_apply` 和 `banned` 不可报名、撤回后重报。
3. `watchlist` 允许操作，但新通告默认打高风险标签并优先进入审核。

### 8.3 对象归属校验

必须提供通用断言：

1. `assertNoticeOwner(userId, noticeId)`
2. `assertApplicationOwner(userId, applicationId)`
3. `assertPublisherOfNotice(userId, application.noticeId)`
4. `assertReportOwner(userId, reportId)`

### 8.4 联系方式裁剪规则

#### 发布方联系方式

1. 广场卡片和详情页对游客与未满足条件达人返回 `null`。
2. 达人仅在对应报名状态进入 `contact_pending`、`communicating`、`completed` 时可见完整发布方联系方式。
3. 发布方本人始终可见自身通告中的联系方式快照。

#### 达人联系方式

1. 报名管理列表默认只返回“已留联系方式”标记或脱敏值。
2. 发布方主动点击查看联系方式或将报名标记为 `contact_pending` 时，才返回完整联系方式。
3. 查看完整联系方式时写 `creatorContactRevealedAt` 和操作日志。

### 8.5 敏感字段返回约束

以下字段不得对普通前台原样返回：

1. `wxOpenId`
2. `wxUnionId`
3. 原始处罚原因和内部风控标签
4. 举报处理中内部备注
5. 后台审核员信息

### 8.6 UI 状态页联动返回要求

结合 [UI-Design-System-V1.md](../design/UI-Design-System-V1.md) 与 [UI-Final-Signoff-V1.md](../design/UI-Final-Signoff-V1.md)，后端必须补足以下页面视图模型：

#### 广场首页与搜索结果

1. 列表接口除了 `list` 外，还应返回当前已生效筛选摘要和筛选回显字段。
2. 筛选接口语义必须支持“先选择、点确定后生效”，不能假设前端实时筛选。
3. 当筛选无结果时，接口仍需返回当前已选条件，支撑 UI 的“保留条件 + 清空筛选”状态。

#### 通告详情页

1. 详情接口必须直接返回首屏 CTA 所需字段。
2. 至少包含：
   - `permissionState.canApply`
   - `permissionState.hasApplied`
   - `permissionState.isOwner`
   - `permissionState.canViewPublisherContact`
   - `ctaState.primaryAction`
   - `ctaState.primaryText`
   - `ctaState.disabledReason`
3. 详情页的游客态 CTA 必须能直接映射为：
   - 未具备达人名片：`完善达人名片后报名`
   - 已具备达人名片且未报名：`立即报名`
   - 已报名：`查看我的报名`
   - 发布方本人：`查看报名`

#### 发布页与编辑页

1. 发布页需支持“首次补资料卡 + 分组表单 + 就近错误提示”的交互，不允许后端只返回一个泛化报错。
2. 资料补全相关接口应返回资料完整度和缺失项摘要，便于前端在顶部渲染补全卡。
3. 提交审核失败时，接口应优先返回字段级错误映射或明确错误类别，避免前端只能展示笼统 toast。

#### 我的页面

1. `mine` 聚合接口必须显式返回：
   - 是否游客态
   - 是否发布方能力已开通
   - 是否达人能力已开通
   - 当前优先视角
   - 账号限制提示
   - 四个核心入口的可用态与锁定说明
2. 双角色用户的“优先视角”只影响摘要和入口排序，不影响真实权限，这一点必须在服务端返回层保持一致。

#### 报名详情页

1. 报名详情接口必须直接返回当前报名进展和联系方式释放状态。
2. 至少包含：
   - `status`
   - `timeline`
   - `permissionState.canViewPublisherContact`
   - `publisherContactRevealState`
   - `maskedOrFullPublisherContact`
3. 前端不得自行根据状态名拼接联系方式释放时机，必须以服务端返回为准。

## 9. 核心业务流程实现

### 9.1 用户首次进入与 `bootstrap`

目标：

1. 无登录页完成平台用户建档。
2. 为后续发布、报名、举报动作提供统一 `userId`。

流程：

1. 小程序启动后调用 `user-bff.bootstrap`。
2. 云函数读取 `OPENID`。
3. 若 `dm_users` 中不存在，则创建新用户。
4. 初始化 `roleFlags.publisherEnabled = false`、`roleFlags.creatorEnabled = false`、`accountStatus = normal`。
5. 若后续可拿到微信头像昵称快照，可写入 `nickname`、`avatarUrl`。
6. 返回 `userId`、角色能力、优先视角、未读消息数等首页基础信息。

### 9.2 发布方资料完善

流程：

1. 调用 `publisher-bff.upsertProfile`。
2. 校验 `identityType`、`displayName`、`city`、`contactType`、`contactValue`。
3. 计算 `profileCompleteness`。
4. 若达到完整标准，则将 `status` 置为 `complete`，并回写 `dm_users.roleFlags.publisherEnabled = true`。
5. 写操作日志。

### 9.3 达人名片完善

流程：

1. 调用 `creator-bff.upsertCard`。
2. 校验昵称、城市、平台、领域、粉丝量级、作品图、联系方式。
3. 计算 `profileCompleteness`。
4. 若达到完整标准，则回写 `dm_users.roleFlags.creatorEnabled = true`。
5. 写操作日志。

### 9.4 通告创建、编辑与提交审核

#### 草稿创建

1. 仅发布方本人可创建。
2. 创建时拉取当前发布方资料快照。
3. 初始状态为 `draft`。

#### 草稿编辑

1. 仅允许状态为 `draft`、`rejected`、`supplement_required` 的通告编辑。
2. 重新编辑时应重建 `budgetSummary`、联系方式快照和部分展示快照。

#### 提交审核

1. 校验账号可发布。
2. 校验发布方资料完整。
3. 校验通告状态允许提交。
4. 将通告状态改为 `pending_review`。
5. `reviewRoundCount += 1`。
6. 清空 `latestReviewReasonCategory`、`latestReviewReasonText`。
7. 创建审核任务：
   - 首次提交创建 `initial_review`
   - 驳回或补资料后重提创建 `resubmission_review`
8. 写操作日志。
9. 视需要给发布方写一条“已提交审核”的站内消息。

### 9.5 审核任务处理

#### 领取任务

1. 仅审核员或具备审核权限的运营管理员可操作。
2. 任务从 `pending` 进入 `processing`。
3. 写入 `assignedTo`、`claimedAt`。

#### 提交审核结果

支持动作：

1. `approved`
2. `rejected`
3. `supplement_required`
4. `transfer_manual_review`
5. `removed`

结果处理：

1. `approved`
   - 通告状态改 `active`
   - 写 `publishedAt`
   - 当前任务完成
   - 给发布方发审核通过消息
2. `rejected`
   - 通告状态改 `rejected`
   - 回写原因分类与说明
   - 当前任务完成
   - 给发布方发驳回消息
3. `supplement_required`
   - 通告状态改 `supplement_required`
   - 回写原因分类与说明
   - 当前任务完成
   - 给发布方发补资料消息
4. `transfer_manual_review`
   - 通告状态保持 `pending_review`
   - 当前任务完成
   - 新建 `manual_review` 任务
   - 不向用户展示“复核中”
5. `removed`
   - 通告状态改 `removed`
   - 写 `removedAt`
   - 当前任务完成
   - 给发布方发下架消息

### 9.6 广场列表与详情

#### 列表 `notice-bff.list`

查询规则：

1. 只返回 `active` 状态。
2. 支持平台、领域、城市、关键词、排序分页。
3. 默认按 `publishedAt` 或 `createdAt` 倒序。
4. 返回卡片所需的快照字段，不返回原始联系方式。

#### 详情 `notice-bff.detail`

返回结构建议包含：

1. `notice`
2. `publisherSummary`
3. `permissionState`
4. `ctaState`
5. `maskedOrFullContact`

后端需同时给出：

1. 当前用户能否报名
2. 当前用户是否已报名
3. 当前用户是否可见发布方联系方式
4. 当前通告是否可关闭、可重发、可编辑

### 9.7 报名提交与状态推进

#### 报名提交

1. 校验账号可报名。
2. 校验达人名片完整。
3. 校验通告存在且状态为 `active`。
4. 校验截止时间未到。
5. 校验本人不是该通告发布方。
6. 校验无重复有效报名。
7. 固化达人名片快照和联系方式快照。
8. 创建 `application`，状态为 `applied`。
9. 更新 `dm_notices.applicationCount`。
10. 给发布方写“收到新报名”消息。

#### 达人撤回

1. 仅 `applied` 或 `viewed` 可撤回。
2. 状态改为 `withdrawn`。
3. 写 `withdrawnAt`。
4. 若计数按有效报名统计，需同步修正统计字段。

#### 发布方推进状态

1. `markViewed`
   - `applied -> viewed`
   - 写 `publisherViewedAt`
2. `markContactPending`
   - `viewed -> contact_pending`
   - 释放双方联系方式
   - 写 `publisherContactRevealedAt`
   - 给达人发“发布方对你有意向”消息
3. `markCommunicating`
   - `contact_pending -> communicating`
4. `markRejected`
   - `viewed/contact_pending/communicating -> rejected`
   - 给达人发未入选消息
5. `markCompleted`
   - `communicating -> completed`
   - 写 `completedAt`

#### 发布方查看达人联系方式

1. 列表页默认返回脱敏状态。
2. 点击查看时调用 `revealCreatorContact`。
3. 首次查看写 `creatorContactRevealedAt` 和操作日志。

### 9.8 我的报名与联系方式释放

达人查看报名详情时，后端应根据报名状态返回：

1. `applied`、`viewed`：不可见发布方联系方式。
2. `contact_pending`、`communicating`、`completed`：返回完整发布方联系方式快照。
3. `rejected`、`withdrawn`：不可见。

### 9.9 消息生成规则

至少覆盖以下场景：

1. 通告审核通过
2. 通告驳回
3. 通告需补资料
4. 通告被下架
5. 收到新报名
6. 报名被标记待联系
7. 报名未入选
8. 举报处理结果
9. 处罚生效或解除

消息写入建议由共享消息服务统一封装，避免散落各函数。

### 9.10 举报处理

#### 用户侧提报

1. 校验举报对象存在。
2. 写 `dm_reports`，初始状态为 `pending`。
3. 证据文件走举报专用路径。
4. 写操作日志。

#### 后台处理

1. `pending -> processing`
2. `processing -> confirmed` 或 `rejected`
3. `confirmed/rejected -> closed`

联动规则：

1. 举报成立可触发通告下架。
2. 举报成立可触发 `dm_account_actions` 新增处罚。
3. 处理完成后给举报人发送结果消息。

说明：

1. 字段字典的 `status` 文案以“待处理、处理中、举报成立、举报不成立、已结案”为准。
2. 实现中建议仍保存稳定枚举值，不直接存中文。

### 9.11 账号处罚与解除

#### 生效

1. 后台创建 `dm_account_actions` 记录。
2. 根据 `restrictionType` 更新 `dm_users.accountStatus`。
3. 若处罚包含强制下架，可批量处理用户在架通告。
4. 给用户发送处罚通知消息。

#### 解除

1. 管理员手动解除或定时任务到期解除。
2. 将处罚记录置为 `released` 或同类结束态。
3. 重新计算用户当前最高优先级有效处罚，回写 `dm_users.accountStatus`。
4. 给用户发送解除通知。

处罚优先级建议：

1. `banned`
2. `restricted_publish`
3. `restricted_apply`
4. `watchlist`
5. `normal`

## 10. 状态机实现要求

### 10.1 通告状态

后端必须严格限制以下流转：

1. `draft -> pending_review`
2. `pending_review -> active`
3. `pending_review -> rejected`
4. `pending_review -> supplement_required`
5. `pending_review -> removed`
6. `rejected -> pending_review`
7. `supplement_required -> pending_review`
8. `active -> expired`
9. `active -> closed`
10. `active -> removed`
11. `expired -> pending_review`
12. `closed -> pending_review`

### 10.2 报名状态

后端必须严格限制以下流转：

1. `applied -> viewed`
2. `applied -> withdrawn`
3. `viewed -> contact_pending`
4. `viewed -> rejected`
5. `viewed -> withdrawn`
6. `contact_pending -> communicating`
7. `contact_pending -> rejected`
8. `communicating -> completed`
9. `communicating -> rejected`

### 10.3 审核任务状态

后端必须严格限制以下流转：

1. `pending -> processing`
2. `processing -> completed`
3. `processing -> pending`
4. `pending/processing -> cancelled`

### 10.4 幂等要求

以下动作要重点做幂等：

1. `bootstrap`
2. `submitReview`
3. `application submit`
4. `review resolveTask`
5. `markRead`
6. `expireNotices`
7. `releaseExpiredAccountActions`

## 11. 查询、索引与分页约定

### 11.1 分页方式

V1 推荐统一使用游标或最后一条记录时间作为分页锚点，不建议简单页码深翻。

### 11.2 广场查询

1. 先按 `status = active` 过滤。
2. 再叠加平台、领域、城市筛选。
3. 关键词仅做标题、品牌名、合作说明的轻量匹配。
4. 不引入搜索引擎，避免过早复杂化。

### 11.3 我的列表查询

1. 我的通告按 `publisherUserId` 查询。
2. 我的报名按 `creatorUserId` 查询。
3. 所有“我的”列表接口都返回操作能力状态，不让前端自己拼。

### 11.4 统计字段补偿

建议对下列冗余字段准备补偿任务：

1. `dm_notices.applicationCount`
2. `dm_publisher_profiles.publishCount`
3. `dm_publisher_profiles.approvedPublishCount`
4. `dm_publisher_profiles.violationCount`

## 12. 文件上传与云存储规范

### 12.1 存储路径建议

```text
notice-images/{noticeId}/
creator-portfolio/{creatorCardId}/
report-evidence/{reportId}/
feedback-screenshots/{feedbackId}/
system-assets/
```

### 12.2 上传规则

1. 前端只负责上传文件，不负责认定业务归属是否合法。
2. 业务提交时由云函数校验文件路径、归属对象和数量限制。
3. 敏感证据文件不透出公开下载地址。
4. 删除业务对象时，V1 可先做逻辑删除；物理清理放到后续异步任务。

### 12.3 图片字段校验建议

1. 通告附件数量限制
2. 达人作品图至少 1 张
3. 举报证据图可选但建议限制上限
4. 反馈截图可选

具体上限以前端表单规范和提审包体为准，但后端必须二次校验。

## 13. 审计日志、风控与治理

### 13.1 必记日志动作

1. 创建或更新发布方资料
2. 创建或更新达人名片
3. 提交通告审核
4. 审核任务处理
5. 报名提交、撤回、状态推进
6. 查看完整联系方式
7. 举报提交和处理
8. 处罚生效和解除
9. 强制下架

### 13.2 风控最小实现

V1 不做复杂机器风控，但建议至少做：

1. 敏感词命中记录
2. 高频发布提示
3. 多次被举报用户标记
4. 新用户前 3 条通告强制进入人工审核
5. `watchlist` 用户提交通告自动加高风险标签

### 13.3 内部字段约束

以下字段只对后台可见：

1. `riskFlags`
2. 内部审核备注
3. 内部举报处理备注
4. 后台操作人标识

## 14. 定时任务设计

### 14.1 `expireNotices`

规则：

1. 扫描 `status = active` 且 `deadlineAt < now` 的通告。
2. 状态改为 `expired`。
3. 写操作日志。
4. 可选给发布方发送“通告已截止”消息。

### 14.2 `releaseExpiredAccountActions`

规则：

1. 扫描已到期且仍生效的处罚。
2. 将处罚记录改为结束态。
3. 重新计算 `dm_users.accountStatus`。
4. 写解除消息和操作日志。

### 14.3 `repairCounters`

规则：

1. 定时校验通告报名数与实际有效报名数是否一致。
2. 校验资料页累计统计是否一致。
3. 仅修正统计，不改业务状态。

### 14.4 `slaMonitor`

规则：

1. 扫描超时未处理审核任务。
2. 记录告警或写入工作台高优先级列表。

## 15. 开发顺序建议

### 15.1 第一阶段：底座能力

1. 共享层
2. `user-bff`
3. `publisher-bff`
4. `creator-bff`
5. 核心集合初始化和索引

### 15.2 第二阶段：核心闭环

1. `notice-bff`
2. `review-admin`
3. `application-bff`
4. `message-bff`

### 15.3 第三阶段：治理与补全

1. `report-bff`
2. `feedback-bff`
3. `governance-admin`
4. `cron-jobs`

### 15.4 第四阶段：联调与验收

1. 小程序联调
2. 后台联调
3. 测试环境走通审核、报名、举报、封禁场景
4. 上线前压测核心列表和高频写操作

## 16. 联调与测试清单

### 16.1 小程序联调必测

1. 首次进入是否自动建档
2. 未完善资料时，发布和报名是否被正确拦截
3. 联系方式在不同状态下是否正确隐藏、脱敏、释放
4. 被限制发布或限制报名时，前端是否收到稳定错误码
5. 我的通告、我的报名、消息列表是否口径一致

### 16.2 后台联调必测

1. 审核任务领取、释放、处理是否互斥
2. 转人工复核是否只影响任务不新增前台状态
3. 举报成立是否可联动下架与处罚
4. 处罚解除后账号状态是否正确恢复

### 16.3 定时任务必测

1. 截止通告是否自动转 `expired`
2. 到期处罚是否自动解除
3. 重跑定时任务是否幂等

## 17. 上线前检查项

1. 所有核心集合已建索引。
2. 所有核心集合已关闭客户端直读直写。
3. 所有云函数统一响应结构已落地。
4. 所有敏感字段已通过服务端裁剪。
5. 核心状态流转已加断言与日志。
6. 审核、举报、处罚、联系方式查看均有操作日志。
7. 开发环境、测试环境、正式环境配置已分离。
8. `dm_configs` 初始化完成，审核原因和处罚原因有默认值。

## 18. 本文档对后续开发的作用

1. 这份文档是小程序前端开发文档的后端接口和权限依据。
2. 这份文档是运营后台开发文档的云函数和数据口径依据。
3. 后续若新增前端开发文档、后台开发文档、测试用例文档，都应以本文档的集合名、状态机、接口动作和权限规则为准。

配套执行文档：

1. [CloudBase-Admin-Auth-Spec-V1.md](CloudBase-Admin-Auth-Spec-V1.md)
2. [CloudFunction-API-Contract-V1.md](CloudFunction-API-Contract-V1.md)
3. [CloudBase-Security-Rules-And-Indexes-V1.md](CloudBase-Security-Rules-And-Indexes-V1.md)
4. [Backend-Env-Deploy-Runbook-V1.md](Backend-Env-Deploy-Runbook-V1.md)
