# 多米通告 字段字典 V1

## 1. 文档信息

- 文档名称：字段字典 V1
- 对应 PRD：[PRD-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/product/PRD-V1.md)
- 对应 UI 定稿：[UI-Final-Signoff-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/design/UI-Final-Signoff-V1.md)
- 文档日期：2026-03-15
- 文档目标：统一前后端、测试、运营对核心业务字段的命名、含义和约束理解

## 2. 使用原则

1. V1 采用“一个微信身份对应一个平台用户”的模型，不设计额外注册页。
2. 一个平台用户可同时挂载一份发布方资料和一张达人名片。
3. V1 只支持单一达人名片，不支持多名片切换。
4. 联系方式字段是否展示，不由前端自行判断，必须遵循 [Visibility-Permissions-Matrix-V1.md](/Users/tokk/Desktop/crab-miniapp/docs/product/Visibility-Permissions-Matrix-V1.md)。
5. 前台展示文案可友好化，但底层枚举值必须稳定，避免后续统计和状态联动混乱。

## 3. 全局字段约定

| 字段 | 含义 | 建议类型 | 说明 |
| --- | --- | --- | --- |
| `id` | 主键 ID | string | 推荐使用稳定唯一 ID |
| `createdAt` | 创建时间 | datetime | 服务端生成 |
| `updatedAt` | 更新时间 | datetime | 服务端更新 |
| `createdBy` | 创建人 | string | 记录操作主体 |
| `updatedBy` | 更新人 | string | 记录最近操作主体 |
| `isDeleted` | 逻辑删除标记 | boolean | V1 推荐保留 |

## 4. 枚举定义

### 4.1 身份类型 `identityType`

| 枚举值 | 含义 |
| --- | --- |
| `merchant` | 商家 |
| `personal_pr` | 个人 PR |
| `agency` | 代理商 |
| `operator` | 代运营 |
| `other` | 其他 |

### 4.2 合作平台 `cooperationPlatform`

| 枚举值 | 含义 |
| --- | --- |
| `xiaohongshu` | 小红书 |
| `douyin` | 抖音 |
| `shipinhao` | 视频号 |
| `kuaishou` | 快手 |
| `bilibili` | B 站 |
| `other` | 其他 |

说明：

- V1 默认为单选，若用户需要跨平台合作，要求其拆分多条通告或在合作说明中补充。

### 4.3 合作形式 `cooperationType`

| 枚举值 | 含义 |
| --- | --- |
| `store_visit` | 探店 |
| `mail_shoot` | 寄拍 |
| `article` | 图文 |
| `short_video` | 短视频 |
| `livestream` | 直播 |
| `other` | 其他 |

说明：

- V1 默认为单选，若有组合交付需求，在合作说明中补充。

### 4.4 合作领域 `cooperationCategory`

| 枚举值 | 含义 |
| --- | --- |
| `local_life` | 本地生活 |
| `food_beverage` | 美食餐饮 |
| `beauty_fashion` | 美妆穿搭 |
| `mother_baby` | 母婴亲子 |
| `home_living` | 家居生活 |
| `digital_auto` | 数码汽车 |
| `travel_outdoor` | 旅行户外 |
| `education_service` | 教育服务 |
| `other` | 其他 |

说明：

- V1 推荐单选，筛选、匹配和发布表单使用同一套领域枚举。

### 4.5 结算方式 `settlementType`

| 枚举值 | 含义 |
| --- | --- |
| `fixed_price` | 固定报价 |
| `negotiable` | 可议价 |
| `barter` | 置换合作 |
| `free_experience` | 免费体验 |
| `other` | 其他 |

### 4.6 预算区间 `budgetRange`

| 枚举值 | 含义 |
| --- | --- |
| `below_200` | 200 元以下 |
| `200_500` | 200-500 元 |
| `500_1000` | 500-1000 元 |
| `1000_3000` | 1000-3000 元 |
| `3000_5000` | 3000-5000 元 |
| `5000_plus` | 5000 元以上 |
| `not_applicable` | 不适用 |

说明：

- 当 `settlementType` 为 `fixed_price` 或 `negotiable` 时，`budgetRange` 必填。
- 当 `settlementType` 为 `barter`、`free_experience` 或 `other` 时，`budgetRange` 默认使用 `not_applicable`。

### 4.7 通告状态 `noticeStatus`

| 枚举值 | 含义 |
| --- | --- |
| `draft` | 草稿 |
| `pending_review` | 待审核 |
| `rejected` | 驳回待修改 |
| `supplement_required` | 需补充资料 |
| `active` | 进行中 |
| `expired` | 已截止 |
| `closed` | 已关闭 |
| `removed` | 已下架 |

### 4.8 报名状态 `applicationStatus`

| 枚举值 | 含义 |
| --- | --- |
| `applied` | 已报名 |
| `viewed` | 已查看 |
| `contact_pending` | 待联系 |
| `communicating` | 已沟通 |
| `rejected` | 未入选 |
| `withdrawn` | 已撤回 |
| `completed` | 已完成合作 |

### 4.9 审核任务状态 `reviewTaskStatus`

| 枚举值 | 含义 |
| --- | --- |
| `pending` | 待处理 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |

### 4.10 审核任务阶段 `reviewStage`

| 枚举值 | 含义 |
| --- | --- |
| `initial_review` | 初审 |
| `manual_review` | 人工复核 |
| `resubmission_review` | 用户补充后复审 |

### 4.11 审核结果 `reviewResult`

| 枚举值 | 含义 |
| --- | --- |
| `approved` | 通过 |
| `rejected` | 驳回 |
| `supplement_required` | 需补充资料 |
| `transfer_manual_review` | 转人工复核 |
| `removed` | 直接下架 |

### 4.12 账号限制状态 `accountStatus`

| 枚举值 | 含义 |
| --- | --- |
| `normal` | 正常 |
| `watchlist` | 观察名单 |
| `restricted_publish` | 限制发布 |
| `restricted_apply` | 限制报名 |
| `banned` | 全量封禁 |

## 5. 核心实体字段

### 5.1 用户基础档案 `user`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `userId` | 用户 ID | string | 是 | 平台内部用户主键 |
| `wxOpenId` | 微信 OpenID | string | 是 | 仅服务端使用，不对前端透出 |
| `wxUnionId` | 微信 UnionID | string | 否 | 若后续有则保存 |
| `nickname` | 微信昵称快照 | string | 否 | 用于默认展示，可被用户自定义资料覆盖 |
| `avatarUrl` | 微信头像快照 | string | 否 | 用于默认展示 |
| `publisherProfileId` | 发布方资料 ID | string | 否 | 一对一关联 |
| `creatorCardId` | 达人名片 ID | string | 否 | 一对一关联 |
| `roleFlags.publisherEnabled` | 是否具备发布方资料 | boolean | 是 | 资料完整后为 true |
| `roleFlags.creatorEnabled` | 是否具备达人名片 | boolean | 是 | 资料完整后为 true |
| `accountStatus` | 账号限制状态 | enum | 是 | 见 `accountStatus` |
| `publishLimitLevel` | 发布审核等级 | string | 否 | 如新用户、正常、重点观察 |
| `lastActiveAt` | 最近活跃时间 | datetime | 否 | 用于运营判断 |
| `createdAt` | 创建时间 | datetime | 是 | 首次进入小程序时生成 |
| `updatedAt` | 更新时间 | datetime | 是 | 服务端维护 |

说明：

- “游客态”不是匿名用户，而是已创建 `user` 但尚未补全发布方资料或达人名片的用户。

### 5.2 发布方资料 `publisherProfile`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `publisherProfileId` | 发布方资料 ID | string | 是 | 主键 |
| `userId` | 归属用户 ID | string | 是 | 关联 `user.userId` |
| `identityType` | 身份类型 | enum | 是 | 见 `identityType` |
| `displayName` | 对外展示名称 | string | 是 | 详情页和广场展示 |
| `city` | 所在城市 | string | 是 | 建议使用标准城市名称 |
| `contactType` | 联系方式类型 | string | 是 | 例如微信号、手机号、电话、其他 |
| `contactValue` | 联系方式内容 | string | 是 | 原始值，需要可见性控制 |
| `intro` | 简介 | string | 否 | 发布方介绍 |
| `profileCompleteness` | 资料完整度 | integer | 是 | 0-100，系统计算 |
| `publishCount` | 历史发布数 | integer | 是 | 系统累计 |
| `approvedPublishCount` | 历史通过数 | integer | 是 | 系统累计 |
| `violationCount` | 历史违规数 | integer | 是 | 系统累计 |
| `status` | 资料状态 | string | 是 | `incomplete` / `complete` |

### 5.3 达人名片 `creatorCard`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `creatorCardId` | 达人名片 ID | string | 是 | 主键 |
| `userId` | 归属用户 ID | string | 是 | 关联 `user.userId` |
| `avatarUrl` | 头像 | string | 否 | 可使用微信头像作为初始值 |
| `nickname` | 昵称 | string | 是 | 名片展示名称 |
| `city` | 所在城市 | string | 是 | 名片基础资料 |
| `gender` | 性别 | string | 否 | 可选 |
| `primaryPlatform` | 擅长平台 | enum | 是 | 见 `cooperationPlatform` |
| `primaryCategory` | 擅长领域 | enum | 是 | 见 `cooperationCategory` |
| `followerBand` | 粉丝量级 | string | 是 | 建议用区间枚举 |
| `accountName` | 账号名称 | string | 否 | 对应平台昵称 |
| `accountIdOrLink` | 账号链接或 ID | string | 否 | 手动填写 |
| `portfolioImages` | 代表作品截图 | string[] | 是 | 至少 1 张 |
| `caseDescription` | 合作案例描述 | string | 否 | 文字补充 |
| `residentCity` | 常驻城市 | string | 否 | 与所在城市可相同 |
| `contactType` | 联系方式类型 | string | 是 | 例如微信号、手机号、其他 |
| `contactValue` | 联系方式内容 | string | 是 | 默认用于报名联系方式快照 |
| `profileCompleteness` | 资料完整度 | integer | 是 | 0-100，系统计算 |
| `status` | 名片状态 | string | 是 | `incomplete` / `complete` |

说明：

- V1 一名用户只允许维护一张达人名片。

### 5.4 通告 `notice`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `noticeId` | 通告 ID | string | 是 | 主键 |
| `publisherUserId` | 发布方用户 ID | string | 是 | 归属用户 |
| `publisherProfileId` | 发布方资料 ID | string | 是 | 关联资料快照来源 |
| `title` | 通告标题 | string | 是 | 必填 |
| `identityTypeSnapshot` | 身份类型快照 | enum | 是 | 取发布时资料快照 |
| `brandName` | 品牌或门店名称 | string | 否 | 用户填写 |
| `cooperationPlatform` | 合作平台 | enum | 是 | V1 单选 |
| `cooperationCategory` | 合作领域 | enum | 是 | 见 `cooperationCategory` |
| `cooperationType` | 合作形式 | enum | 是 | V1 单选 |
| `city` | 所在城市 | string | 是 | 必填 |
| `settlementType` | 结算方式 | enum | 是 | 见 `settlementType` |
| `budgetRange` | 预算区间 | enum | 是 | 见 `budgetRange` |
| `budgetSummary` | 预算摘要 | string | 是 | 前端展示用，由结算方式和预算区间生成 |
| `recruitCount` | 招募人数 | integer | 否 | 可为空，空表示不限 |
| `deadlineAt` | 报名截止时间 | datetime | 是 | 到期自动转已截止 |
| `creatorRequirements` | 达人要求 | string | 是 | 必填 |
| `cooperationDescription` | 合作说明 | string | 是 | 必填 |
| `attachments` | 补充图片或截图 | string[] | 否 | 最多若干张 |
| `publisherContactTypeSnapshot` | 发布方联系方式类型快照 | string | 是 | 发布时固化 |
| `publisherContactValueSnapshot` | 发布方联系方式内容快照 | string | 是 | 发布时固化，前台按规则展示 |
| `status` | 通告状态 | enum | 是 | 见 `noticeStatus` |
| `reviewRoundCount` | 审核轮次 | integer | 是 | 每次重新提交加 1 |
| `latestReviewReasonCategory` | 最近审核原因分类 | string | 否 | 驳回、补资料、下架时使用 |
| `latestReviewReasonText` | 最近审核说明 | string | 否 | 前台展示给发布方 |
| `riskFlags` | 风险标签 | string[] | 否 | 如敏感词、重复内容 |
| `applicationCount` | 报名人数 | integer | 是 | 冗余统计字段 |
| `publishedAt` | 上架时间 | datetime | 否 | 审核通过时写入 |
| `closedAt` | 关闭时间 | datetime | 否 | 主动关闭时写入 |
| `removedAt` | 下架时间 | datetime | 否 | 违规下架时写入 |

### 5.5 报名记录 `application`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `applicationId` | 报名 ID | string | 是 | 主键 |
| `noticeId` | 通告 ID | string | 是 | 归属通告 |
| `publisherUserId` | 发布方用户 ID | string | 是 | 冗余存储，便于查询 |
| `creatorUserId` | 达人用户 ID | string | 是 | 报名人 |
| `creatorCardId` | 达人名片 ID | string | 是 | V1 固定指向唯一达人名片 |
| `creatorCardSnapshot` | 达人名片摘要快照 | object | 是 | 报名时固化昵称、平台、领域、粉丝量级等 |
| `selfIntroduction` | 自我介绍 | string | 是 | 报名表单内容 |
| `deliverablePlan` | 可提供的合作内容 | string | 是 | 报名表单内容 |
| `expectedTerms` | 期望报价或合作条件 | string | 否 | 报名表单内容 |
| `portfolioImages` | 补充案例截图 | string[] | 否 | 可选 |
| `contactTypeSnapshot` | 联系方式类型快照 | string | 是 | 默认取达人名片联系方式 |
| `contactValueSnapshot` | 联系方式内容快照 | string | 是 | 默认取达人名片联系方式，可本次覆盖 |
| `status` | 报名状态 | enum | 是 | 见 `applicationStatus` |
| `publisherViewedAt` | 发布方查看时间 | datetime | 否 | 标记已查看时写入 |
| `creatorContactRevealedAt` | 发布方查看完整达人联系方式时间 | datetime | 否 | 点击查看联系方式或标记待联系时写入 |
| `publisherContactRevealedAt` | 达人查看发布方联系方式时间 | datetime | 否 | 发布方标记待联系时写入 |
| `withdrawnAt` | 撤回时间 | datetime | 否 | 达人撤回时写入 |
| `completedAt` | 合作完成时间 | datetime | 否 | 标记完成时写入 |

说明：

- 同一 `creatorUserId + noticeId` 只允许存在一条有效报名记录。

### 5.6 审核任务 `reviewTask`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `reviewTaskId` | 审核任务 ID | string | 是 | 主键 |
| `objectType` | 审核对象类型 | string | 是 | V1 固定为 `notice` |
| `objectId` | 审核对象 ID | string | 是 | 对应 `noticeId` |
| `noticeStatusSnapshot` | 任务生成时通告状态 | enum | 是 | 一般为 `pending_review` |
| `reviewStage` | 审核阶段 | enum | 是 | 见 `reviewStage` |
| `taskStatus` | 任务状态 | enum | 是 | 见 `reviewTaskStatus` |
| `queueType` | 所属队列 | string | 是 | 如初审队列、复核队列 |
| `riskLevel` | 风险等级 | string | 否 | 低、中、高 |
| `riskFlags` | 风险标签 | string[] | 否 | 规则命中结果 |
| `assignedTo` | 当前处理人 | string | 否 | 审核员 ID |
| `claimedAt` | 领取时间 | datetime | 否 | 进入处理中时写入 |
| `completedAt` | 完成时间 | datetime | 否 | 任务结束时写入 |
| `reviewResult` | 审核结果 | enum | 否 | 见 `reviewResult` |
| `reasonCategory` | 原因分类 | string | 否 | 必填于非通过场景 |
| `reasonText` | 处理备注 | string | 否 | 前后台共用说明 |
| `nextQueueType` | 下一队列 | string | 否 | 转人工复核时写入 |

说明：

- “转人工复核”是当前任务结果，不是通告业务状态。
- 一个通告在一次审核轮次中可以先后关联多条审核任务。

### 5.7 举报记录 `report`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `reportId` | 举报 ID | string | 是 | 主键 |
| `reporterUserId` | 举报人用户 ID | string | 是 | 举报发起人 |
| `targetType` | 举报对象类型 | string | 是 | `notice` / `publisher` / `creator` |
| `targetId` | 举报对象 ID | string | 是 | 对应对象主键 |
| `reasonCode` | 举报原因 | string | 是 | 结构化原因 |
| `reasonText` | 补充说明 | string | 否 | 用户输入 |
| `evidenceImages` | 凭证图片 | string[] | 否 | 可选 |
| `status` | 举报状态 | string | 是 | 待处理、处理中、举报成立、举报不成立、已结案 |
| `handlerId` | 处理人 ID | string | 否 | 运营处理人 |
| `resultAction` | 处理动作 | string | 否 | 如警告、下架、限制发布 |
| `resultRemark` | 处理备注 | string | 否 | 前后台说明 |

### 5.8 消息通知 `message`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `messageId` | 消息 ID | string | 是 | 主键 |
| `receiverUserId` | 接收人用户 ID | string | 是 | 消息归属人 |
| `messageType` | 消息类型 | string | 是 | 审核通知、报名通知、系统通知等 |
| `title` | 标题 | string | 是 | 前台消息标题 |
| `summary` | 摘要 | string | 是 | 列表摘要 |
| `relatedObjectType` | 关联对象类型 | string | 否 | `notice` / `application` / `report` |
| `relatedObjectId` | 关联对象 ID | string | 否 | 用于跳转 |
| `isRead` | 是否已读 | boolean | 是 | 前台红点判断 |
| `readAt` | 已读时间 | datetime | 否 | 点击消息时写入 |

### 5.9 意见反馈记录 `feedbackRecord`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `feedbackId` | 反馈 ID | string | 是 | 主键 |
| `userId` | 反馈人用户 ID | string | 是 | 反馈发起人 |
| `feedbackType` | 反馈类型 | string | 是 | 功能建议、问题反馈、体验吐槽、其他 |
| `content` | 反馈内容 | string | 是 | 用户填写描述 |
| `images` | 截图 | string[] | 否 | 可选 |
| `contactValue` | 回访联系方式 | string | 否 | 可选 |
| `status` | 处理状态 | string | 是 | 待处理、已查看、已归档 |

### 5.10 限制记录 `restrictionRecord`

| 字段 Key | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `restrictionId` | 限制记录 ID | string | 是 | 主键 |
| `userId` | 被限制用户 ID | string | 是 | 对应用户 |
| `restrictionType` | 限制类型 | string | 是 | 限制发布、限制报名、全量封禁等 |
| `reasonCategory` | 原因分类 | string | 是 | 处罚原因 |
| `reasonText` | 备注 | string | 否 | 详细说明 |
| `startAt` | 生效时间 | datetime | 是 | 生效时间 |
| `endAt` | 到期时间 | datetime | 否 | 若为空表示长期有效 |
| `operatorId` | 操作人 ID | string | 是 | 后台操作人 |
| `status` | 当前状态 | string | 是 | 生效中、已解除 |

## 6. 关键派生字段规则

### 6.1 资料完整度 `profileCompleteness`

1. 发布方资料完整度按身份类型、展示名称、城市、联系方式、简介计算。
2. 达人名片完整度按昵称、城市、平台、领域、粉丝量级、案例截图、联系方式计算。
3. 完整度只作为轻信任展示，不代表官方认证。

### 6.2 预算摘要 `budgetSummary`

1. 当 `settlementType` 为 `fixed_price` 或 `negotiable` 时，展示“结算方式 + 预算区间”。
2. 当 `settlementType` 为 `barter` 或 `free_experience` 时，优先展示结算方式文案。

### 6.3 联系方式快照

1. 通告保存发布方联系方式快照，避免发布方资料后改导致历史通告展示不一致。
2. 报名保存达人联系方式快照，避免达人后续修改名片影响既有报名记录。

## 7. 开发注意事项

1. 前台不要直接读取原始联系方式字段决定展示逻辑，必须结合角色、对象归属和状态判断。
2. 审核结果、下架原因、补资料原因要保留结构化分类和用户可读备注两层数据。
3. 所有状态变更建议同步生成操作日志与消息通知。
