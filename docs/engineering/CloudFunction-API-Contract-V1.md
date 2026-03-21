# 多米通告 Cloud Function API Contract V1

## 1. 文档信息

- 文档名称：Cloud Function API Contract V1
- 对应后端总文档：[CloudBase-Backend-Development-Guide-V1.md](CloudBase-Backend-Development-Guide-V1.md)
- 对应后台鉴权规范：[CloudBase-Admin-Auth-Spec-V1.md](CloudBase-Admin-Auth-Spec-V1.md)
- 对应字段字典：[Field-Dictionary-V1.md](../product/Field-Dictionary-V1.md)
- 文档日期：2026-03-16
- 文档目标：定义 V1 阶段全部云函数的 action、请求参数、返回结构和主要错误口径，作为前后端联调与测试用例编写依据

## 2. 使用原则

1. 所有云函数统一走 `{ action, payload, meta }` 结构。
2. 普通前台请求依赖小程序 `OPENID` 自动识别用户。
3. 后台请求额外在 `meta.adminSessionToken` 中携带后台 session token。
4. 返回对象只返回当前页面所需最小字段，不直接暴露原始敏感字段。

## 3. 通用请求与响应

### 3.1 通用请求结构

```json
{
  "action": "list",
  "payload": {},
  "meta": {
    "source": "miniprogram",
    "clientVersion": "1.0.0"
  }
}
```

后台示例：

```json
{
  "action": "taskList",
  "payload": {},
  "meta": {
    "source": "admin-web",
    "clientVersion": "1.0.0",
    "adminSessionToken": "plain-session-token"
  }
}
```

### 3.2 通用响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace-id"
}
```

表单与补资料类接口补充约定：

1. 当 `code = 40003` 或资料不完整时，`data` 可额外返回 `errorType`、`fieldErrors`、`missingFieldKeys`。
2. `fieldErrors` 用于字段级错误提示，格式建议为 `{ fieldName: "错误文案" }`。
3. `missingFieldKeys` 用于前端渲染“资料补全卡”“入口锁定原因”“待补字段摘要”。

### 3.3 通用分页参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.pageSize` | integer | 否 | 默认 10，最大 20 |
| `payload.cursor` | string | 否 | 游标 |

### 3.4 通用分页返回

| 字段 | 说明 |
| --- | --- |
| `list` | 当前页数据 |
| `nextCursor` | 下一页游标，无更多数据时为空 |
| `hasMore` | 是否还有更多 |

## 4. 通用错误码口径

| 错误码 | 说明 |
| --- | --- |
| `20001` | 用户上下文获取失败 |
| `30001` | 无对象访问权限 |
| `30002` | 后台登录态失效 |
| `30003` | 后台角色权限不足 |
| `40001` | 账号被限制发布 |
| `40002` | 账号被限制报名 |
| `40003` | 参数校验失败 |
| `50001` | 当前通告状态不允许该操作 |
| `50002` | 当前报名状态不允许该操作 |
| `50003` | 请先完善发布方资料 |
| `50004` | 请先完善达人名片 |
| `50005` | 请勿重复报名 |
| `60001` | 审核任务已被处理 |

## 5. `admin-auth`

说明：

1. `login` 不需要后台 session。
2. `me`、`logout`、`changePassword` 都必须携带 `meta.adminSessionToken`。

### 5.1 `login`

用途：后台登录

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.username` | string | 是 | 用户名 |
| `payload.password` | string | 是 | 密码 |

返回：

| 字段 | 说明 |
| --- | --- |
| `adminUser.adminUserId` | 管理员 ID |
| `adminUser.displayName` | 展示名称 |
| `adminUser.roleCodes` | 角色列表 |
| `session.adminSessionToken` | 会话 token |
| `session.expiresAt` | 绝对过期时间 |
| `session.idleExpireAt` | 空闲过期时间 |
| `session.mustResetPassword` | 是否需要改密 |

### 5.2 `me`

用途：读取当前管理员信息

返回：

1. `adminUserId`
2. `displayName`
3. `roleCodes`
4. `permissionSummary`
5. `mustResetPassword`

### 5.3 `logout`

用途：登出当前后台会话

返回：

1. `success`

### 5.4 `changePassword`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.oldPassword` | string | 是 | 旧密码 |
| `payload.newPassword` | string | 是 | 新密码 |

返回：

1. `success`
2. `logoutOtherSessions`

## 6. `user-bff`

### 6.1 `bootstrap`

用途：首次进入小程序建档

入参：无

返回：

| 字段 | 说明 |
| --- | --- |
| `user.userId` | 平台用户 ID |
| `user.roleFlags` | 当前角色能力 |
| `user.accountStatus` | 当前账号状态 |
| `user.preferredView` | 优先视角 |
| `message.unreadCount` | 未读消息数 |

### 6.2 `mine`

用途：我的页基础聚合数据

返回：

1. `userSummary`
2. `publisherSummary`
3. `creatorSummary`
4. `messageSummary`
5. `quickActions`
6. `isTourist`
7. `roleFlags`
8. `preferredView`
9. `restrictionSummary`
10. `entryStates`

### 6.3 `setPreferredView`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.preferredView` | string | 是 | `publisher` / `creator` |

返回：

1. `preferredView`

## 7. `publisher-bff`

### 7.1 `getProfile`

用途：读取本人发布方资料

返回：

1. `publisherProfile`
2. `editableFields`
3. `profileCompleteness`
4. `missingFieldKeys`

### 7.2 `upsertProfile`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.identityType` | enum | 是 | 身份类型 |
| `payload.displayName` | string | 是 | 对外名称 |
| `payload.city` | string | 是 | 城市 |
| `payload.contactType` | string | 是 | 联系方式类型 |
| `payload.contactValue` | string | 是 | 联系方式内容 |
| `payload.intro` | string | 否 | 简介 |

返回：

1. `publisherProfileId`
2. `status`
3. `profileCompleteness`
4. `roleFlags.publisherEnabled`
5. `missingFieldKeys`

## 8. `creator-bff`

### 8.1 `getCard`

用途：读取本人达人名片

返回：

1. `creatorCard`
2. `editableFields`
3. `profileCompleteness`
4. `missingFieldKeys`

### 8.2 `upsertCard`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.nickname` | string | 是 | 昵称 |
| `payload.avatarUrl` | string | 否 | 头像 |
| `payload.city` | string | 是 | 城市 |
| `payload.gender` | string | 否 | 性别 |
| `payload.primaryPlatform` | enum | 是 | 平台 |
| `payload.primaryCategory` | enum | 是 | 领域 |
| `payload.followerBand` | string | 是 | 粉丝量级 |
| `payload.accountName` | string | 否 | 账号名 |
| `payload.accountIdOrLink` | string | 否 | 账号链接或 ID |
| `payload.portfolioImages` | string[] | 是 | 作品截图 |
| `payload.caseDescription` | string | 否 | 案例描述 |
| `payload.residentCity` | string | 否 | 常驻城市 |
| `payload.contactType` | string | 是 | 联系方式类型 |
| `payload.contactValue` | string | 是 | 联系方式内容 |

返回：

1. `creatorCardId`
2. `status`
3. `profileCompleteness`
4. `roleFlags.creatorEnabled`
5. `missingFieldKeys`

## 9. `notice-bff`

### 9.1 `list`

用途：广场列表

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.keyword` | string | 否 | 关键词 |
| `payload.cooperationPlatform` | enum | 否 | 平台筛选 |
| `payload.cooperationCategory` | enum | 否 | 领域筛选 |
| `payload.city` | string | 否 | 城市筛选 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`
4. `filterSummary`
5. `filterEcho`

卡片字段建议：

1. `noticeId`
2. `title`
3. `cooperationPlatform`
4. `cooperationCategory`
5. `budgetSummary`
6. `city`
7. `deadlineAt`
8. `publisherSummary.displayName`
9. `statusTag`

### 9.2 `detail`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |

返回：

1. `notice`
2. `publisherSummary`
3. `permissionState.canApply`
4. `permissionState.canViewPublisherContact`
5. `permissionState.hasApplied`
6. `permissionState.isOwner`
7. `ctaState.primaryAction`
8. `ctaState.primaryText`
9. `ctaState.disabledReason`
10. `maskedOrFullContact`

### 9.3 `createDraft`

入参：

`payload.notice` 可写字段：

1. `title`
2. `brandName`
3. `cooperationPlatform`
4. `cooperationCategory`
5. `cooperationType`
6. `city`
7. `settlementType`
8. `budgetRange`
9. `recruitCount`
10. `deadlineAt`
11. `creatorRequirements`
12. `cooperationDescription`
13. `attachments`

返回：

1. `noticeId`
2. `status`

### 9.4 `updateDraft`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |
| `payload.notice` | object | 是 | 草稿字段集合 |

返回：

1. `noticeId`
2. `status`
3. `updatedAt`

### 9.5 `submitReview`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |

返回：

1. `noticeId`
2. `status`
3. `reviewRoundCount`
4. `currentReviewTaskId`

### 9.6 `myList`

用途：我的通告列表

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.status` | enum | 否 | 状态筛选 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

### 9.7 `close`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |

返回：

1. `noticeId`
2. `status`
3. `closedAt`

### 9.8 `republish`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 原通告 ID |

返回：

1. `noticeId`
2. `status`
3. `reviewRoundCount`
4. `currentReviewTaskId`

## 10. `application-bff`

### 10.1 `submit`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |
| `payload.selfIntroduction` | string | 是 | 自我介绍 |
| `payload.deliverablePlan` | string | 是 | 可交付计划 |
| `payload.expectedTerms` | string | 否 | 期望条件 |
| `payload.portfolioImages` | string[] | 否 | 补充案例截图 |
| `payload.contactType` | string | 否 | 本次报名联系方式类型 |
| `payload.contactValue` | string | 否 | 本次报名联系方式内容 |

返回：

1. `applicationId`
2. `status`
3. `noticeId`

### 10.2 `withdraw`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.applicationId` | string | 是 | 报名 ID |

返回：

1. `applicationId`
2. `status`
3. `withdrawnAt`

### 10.3 `myList`

用途：我的报名列表

返回建议：

1. `list[]`
2. `nextCursor`
3. `hasMore`

列表最小字段：

1. `applicationId`
2. `noticeId`
3. `noticeTitle`
4. `budgetSummary`
5. `city`
6. `status`
7. `publisherSummary`
8. `canViewPublisherContact`

### 10.4 `detail`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.applicationId` | string | 是 | 报名 ID |

返回：

1. `application`
2. `noticeSummary`
3. `publisherSummary`
4. `permissionState.canViewPublisherContact`
5. `timeline`
6. `publisherContactRevealState`
7. `maskedOrFullPublisherContact`

### 10.5 `publisherList`

用途：发布方查看某通告下报名列表

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |
| `payload.status` | enum | 否 | 报名状态筛选 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

列表最小字段：

1. `applicationId`
2. `creatorCardSnapshot`
3. `status`
4. `publisherViewedAt`
5. `contactRevealState`

### 10.6 `publisherDetail`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.applicationId` | string | 是 | 报名 ID |

返回：

1. `application`
2. `creatorSummary`
3. `maskedOrFullCreatorContact`
4. `availableActions`

### 10.7 `markViewed`

入参：`payload.applicationId`

返回：

1. `applicationId`
2. `status`
3. `publisherViewedAt`

### 10.8 `markContactPending`

入参：`payload.applicationId`

返回：

1. `applicationId`
2. `status`
3. `publisherContactRevealedAt`

### 10.9 `markCommunicating`

入参：`payload.applicationId`

返回：

1. `applicationId`
2. `status`

### 10.10 `markRejected`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.applicationId` | string | 是 | 报名 ID |
| `payload.reasonText` | string | 否 | 对达人展示的备注 |

返回：

1. `applicationId`
2. `status`

### 10.11 `markCompleted`

入参：`payload.applicationId`

返回：

1. `applicationId`
2. `status`
3. `completedAt`

### 10.12 `revealCreatorContact`

入参：`payload.applicationId`

返回：

1. `applicationId`
2. `creatorContact`
3. `creatorContactRevealedAt`

## 11. `message-bff`

### 11.1 `list`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.messageType` | string | 否 | 消息类型筛选 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`
4. `unreadCount`

### 11.2 `markRead`

入参：`payload.messageId`

返回：

1. `messageId`
2. `isRead`
3. `readAt`

### 11.3 `markAllRead`

入参：无

返回：

1. `updatedCount`

## 12. `report-bff`

### 12.1 `submit`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.targetType` | string | 是 | `notice` / `publisher` / `creator` |
| `payload.targetId` | string | 是 | 目标对象 ID |
| `payload.reasonCode` | string | 是 | 举报原因 |
| `payload.reasonText` | string | 否 | 补充说明 |
| `payload.evidenceImages` | string[] | 否 | 举报证据 |

返回：

1. `reportId`
2. `status`

### 12.2 `myList`

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

列表最小字段：

1. `reportId`
2. `targetType`
3. `targetId`
4. `reasonCode`
5. `status`
6. `resultAction`

## 13. `feedback-bff`

### 13.1 `submit`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.feedbackType` | string | 是 | 反馈类型 |
| `payload.content` | string | 是 | 反馈内容 |
| `payload.images` | string[] | 否 | 截图 |
| `payload.contactValue` | string | 否 | 回访联系方式 |

返回：

1. `feedbackId`
2. `status`

## 14. `review-admin`

### 14.1 `taskList`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.taskStatus` | enum | 否 | 任务状态 |
| `payload.reviewStage` | enum | 否 | 审核阶段 |
| `payload.city` | string | 否 | 城市筛选 |
| `payload.identityType` | enum | 否 | 身份类型筛选 |
| `payload.riskLevel` | string | 否 | 风险等级 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`
4. `summary.pendingCount`

### 14.2 `taskDetail`

入参：`payload.reviewTaskId`

返回：

1. `task`
2. `notice`
3. `publisherProfile`
4. `riskSummary`
5. `historyLogs`
6. `availableActions`

### 14.3 `claimTask`

入参：`payload.reviewTaskId`

返回：

1. `reviewTaskId`
2. `taskStatus`
3. `assignedTo`
4. `claimedAt`

### 14.4 `releaseTask`

入参：`payload.reviewTaskId`

返回：

1. `reviewTaskId`
2. `taskStatus`

### 14.5 `resolveTask`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.reviewTaskId` | string | 是 | 任务 ID |
| `payload.reviewResult` | enum | 是 | 审核结果 |
| `payload.reasonCategory` | string | 否 | 原因分类 |
| `payload.reasonText` | string | 否 | 处理备注 |
| `payload.notifyUser` | boolean | 否 | 是否通知用户 |
| `payload.nextQueueType` | string | 否 | 转复核时使用 |

约束：

1. 当 `payload.reviewResult = approved` 时，`reasonCategory` 可为空。
2. 当 `payload.reviewResult = rejected`、`supplement_required`、`removed`、`transfer_manual_review` 时，`reasonCategory` 必填。
3. 当 `payload.reviewResult = transfer_manual_review` 时，`nextQueueType` 必填。

返回：

1. `reviewTaskId`
2. `taskStatus`
3. `noticeStatus`
4. `nextReviewTaskId`

## 15. `governance-admin`

### 15.1 `dashboard`

返回：

1. `reviewPendingCount`
2. `reportPendingCount`
3. `todayNoticeCount`
4. `todayApprovedCount`
5. `todayRejectedCount`
6. `todayNewBlacklistCount`
7. `priorityItems[]`

### 15.2 `reportList`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.status` | enum | 否 | 举报状态 |
| `payload.targetType` | string | 否 | 举报对象类型 |
| `payload.reasonCode` | string | 否 | 原因筛选 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

### 15.3 `reportDetail`

入参：`payload.reportId`

返回：

1. `report`
2. `targetSnapshot`
3. `historyReports`
4. `historyActions`
5. `availableActions`

### 15.4 `claimReport`

入参：`payload.reportId`

返回：

1. `reportId`
2. `status`
3. `handlerId`

### 15.5 `resolveReport`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.reportId` | string | 是 | 举报 ID |
| `payload.result` | enum | 是 | `confirmed` / `rejected` |
| `payload.resultAction` | string | 否 | 处罚或处理动作 |
| `payload.resultRemark` | string | 否 | 处理备注 |
| `payload.noticeAction` | string | 否 | `none` / `remove_notice` |
| `payload.accountAction` | object | 否 | 处罚对象 |

`payload.accountAction` 子字段建议：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.accountAction.userId` | string | 是 | 处罚目标用户 |
| `payload.accountAction.restrictionType` | string | 是 | `watchlist` / `restricted_publish` / `restricted_apply` / `banned` |
| `payload.accountAction.reasonCategory` | string | 是 | 处罚原因分类 |
| `payload.accountAction.reasonText` | string | 否 | 处罚备注 |
| `payload.accountAction.endAt` | datetime | 否 | 到期时间 |
| `payload.accountAction.forceRemoveActiveNotices` | boolean | 否 | 是否同步下架在架通告 |

约束：

1. 当 `payload.result = confirmed` 时，`resultAction` 必填。
2. 当 `payload.resultAction` 包含账号处罚时，`payload.accountAction` 必填，且需满足上表字段要求。
3. 当仅记录举报成立但不处罚时，`payload.accountAction` 可为空。

返回：

1. `reportId`
2. `status`
3. `linkedNoticeStatus`
4. `linkedAccountStatus`

### 15.6 `accountActionList`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.userId` | string | 否 | 目标用户 |
| `payload.restrictionType` | string | 否 | 限制类型 |
| `payload.status` | string | 否 | 记录状态 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

### 15.7 `createAccountAction`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.userId` | string | 是 | 目标用户 |
| `payload.restrictionType` | string | 是 | `watchlist` / `restricted_publish` / `restricted_apply` / `banned` |
| `payload.reasonCategory` | string | 是 | 原因分类 |
| `payload.reasonText` | string | 否 | 备注 |
| `payload.startAt` | datetime | 否 | 默认立即生效 |
| `payload.endAt` | datetime | 否 | 到期时间 |
| `payload.forceRemoveActiveNotices` | boolean | 否 | 是否同步下架在架通告 |

返回：

1. `restrictionId`
2. `accountStatus`

### 15.8 `releaseAccountAction`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.restrictionId` | string | 是 | 处罚记录 ID |
| `payload.reasonText` | string | 否 | 解除说明 |

返回：

1. `restrictionId`
2. `status`
3. `accountStatus`

### 15.9 `forceRemoveNotice`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.noticeId` | string | 是 | 通告 ID |
| `payload.reasonCategory` | string | 是 | 下架原因 |
| `payload.reasonText` | string | 否 | 下架说明 |

返回：

1. `noticeId`
2. `status`
3. `removedAt`

### 15.10 `operationLogList`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.targetType` | string | 否 | 目标类型 |
| `payload.targetId` | string | 否 | 目标 ID |
| `payload.operatorType` | string | 否 | 操作人类型 |
| `payload.pageSize` | integer | 否 | 页大小 |
| `payload.cursor` | string | 否 | 游标 |

返回：

1. `list[]`
2. `nextCursor`
3. `hasMore`

## 16. `cron-jobs`

### 16.1 `expireNotices`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.limit` | integer | 否 | 本次处理上限 |
| `payload.dryRun` | boolean | 否 | 是否仅演练 |

返回：

1. `processedCount`
2. `expiredNoticeIds[]`

### 16.2 `releaseExpiredAccountActions`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.limit` | integer | 否 | 本次处理上限 |
| `payload.dryRun` | boolean | 否 | 是否仅演练 |

返回：

1. `processedCount`
2. `releasedRestrictionIds[]`

### 16.3 `repairCounters`

返回：

1. `noticeCounterFixCount`
2. `publisherCounterFixCount`

### 16.4 `slaMonitor`

返回：

1. `reviewTaskTimeoutCount`
2. `reportTimeoutCount`
3. `warningItems[]`

### 16.5 `archiveMessages`

入参：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `payload.beforeDays` | integer | 否 | 归档多少天前的已读消息 |
| `payload.limit` | integer | 否 | 本次处理上限 |
| `payload.dryRun` | boolean | 否 | 是否仅演练 |

返回：

1. `processedCount`
2. `archivedMessageIds[]`

## 17. 落地建议

1. 前端和后台的 service 层必须以本文档的 action 名为准。
2. 字段详情以 [Field-Dictionary-V1.md](../product/Field-Dictionary-V1.md) 为主，本文档负责“接口收发哪些字段”。
3. 若实现中发现 contract 与业务状态矩阵冲突，应优先回到后端总文档和状态流转文档修订，而不是局部拍板改接口。
