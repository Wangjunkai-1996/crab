# 多米通告 CloudBase 安全规则与索引规范 V1

## 1. 文档信息

- 文档名称：CloudBase 安全规则与索引规范 V1
- 对应后端总文档：[CloudBase-Backend-Development-Guide-V1.md](CloudBase-Backend-Development-Guide-V1.md)
- 对应后台鉴权规范：[CloudBase-Admin-Auth-Spec-V1.md](CloudBase-Admin-Auth-Spec-V1.md)
- 文档日期：2026-03-16
- 文档目标：锁定 CloudBase 数据库与云存储的访问边界、集合索引方案与环境初始化顺序

## 2. 总原则

1. 默认拒绝所有客户端直接读写核心业务集合。
2. 小程序前台和后台 Web 都通过云函数访问业务数据。
3. 只有明确标记为公开配置的数据，才允许有限度客户端读取。
4. 索引只为当前 V1 查询路径服务，不做过早过度优化。
5. 唯一性约束能用索引解决就不用前端约定代替。

## 3. 数据库安全规则策略

### 3.1 规则结论

V1 推荐采用“业务集合全禁直连，配置集合白名单读取”的策略。

### 3.2 集合访问矩阵

| 集合 | 小程序直读 | 小程序直写 | 后台 Web 直读 | 后台 Web 直写 | 建议策略 |
| --- | --- | --- | --- | --- | --- |
| `dm_users` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_publisher_profiles` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_creator_cards` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_notices` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_notice_review_tasks` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_applications` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_messages` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_reports` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_feedback_records` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_account_actions` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_operation_logs` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_admin_users` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_admin_sessions` | 否 | 否 | 否 | 否 | 云函数独占 |
| `dm_configs` | 有条件可读 | 否 | 有条件可读 | 否 | 白名单读取 |

### 3.3 `dm_configs` 白名单读取

允许客户端读取的前提：

1. 配置项明确标记为 `visibility = public`
2. 配置分组属于前台展示用途

V1 可考虑公开读取的配置组：

1. `public_dictionary`
2. `ad_slots_public`
3. `feature_flags_public`

V1 不允许客户端直接读取的配置组：

1. `risk_keywords`
2. `review_reason_categories`
3. `restriction_reason_categories`
4. `admin_ip_whitelist`

### 3.4 规则文件落地原则

1. 正式规则文件由后端开发阶段生成，不在前端页面内拼接。
2. 每次新增集合都必须先补规则，再开放云函数读写。
3. 提测环境和正式环境都必须有完整规则文件，不能靠“先放开方便调试”长期运行。

## 4. 云存储权限策略

### 4.1 目录访问矩阵

| 路径前缀 | 前台上传 | 前台直接下载 | 后台下载 | 说明 |
| --- | --- | --- | --- | --- |
| `notice-images/` | 可 | 仅经业务字段返回后展示 | 可 | 通告附件 |
| `creator-portfolio/` | 可 | 仅经业务字段返回后展示 | 可 | 达人作品图 |
| `report-evidence/` | 可 | 否 | 可 | 举报证据 |
| `feedback-screenshots/` | 可 | 否 | 可 | 反馈截图 |
| `system-assets/` | 后台维护 | 可公开读取 | 可 | 公共素材 |

### 4.2 存储原则

1. 文件上传成功不代表业务提交成功，业务接口还要二次校验归属关系。
2. 举报证据与后台截图不允许在普通前台返回公开地址。
3. 云存储路径必须包含业务对象 ID，避免孤立文件无法回收。

## 5. 索引设计总表

### 5.1 业务集合索引

| 集合 | 索引名建议 | 字段顺序 | 唯一 | 用途 |
| --- | --- | --- | --- | --- |
| `dm_users` | `idx_users_openid` | `wxOpenId` | 是 | 用户建档查找 |
| `dm_users` | `idx_users_account_status_updated` | `accountStatus, updatedAt` | 否 | 风控与后台筛选 |
| `dm_publisher_profiles` | `idx_publisher_user` | `userId` | 是 | 一人一档 |
| `dm_creator_cards` | `idx_creator_user` | `userId` | 是 | 一人一卡 |
| `dm_notices` | `idx_notice_plaza_core` | `status, cooperationPlatform, cooperationCategory, city, createdAt` | 否 | 广场列表 |
| `dm_notices` | `idx_notice_publisher_created` | `publisherUserId, createdAt` | 否 | 我的通告 |
| `dm_notices` | `idx_notice_status_deadline` | `status, deadlineAt` | 否 | 定时过期扫描 |
| `dm_notice_review_tasks` | `idx_review_task_queue` | `taskStatus, reviewStage, createdAt` | 否 | 审核队列 |
| `dm_notice_review_tasks` | `idx_review_task_object` | `objectId, createdAt` | 否 | 按通告追踪 |
| `dm_notice_review_tasks` | `idx_review_task_assignee` | `assignedTo, taskStatus, updatedAt` | 否 | 我的任务 |
| `dm_applications` | `idx_application_notice_status` | `noticeId, status, createdAt` | 否 | 报名管理 |
| `dm_applications` | `idx_application_creator_created` | `creatorUserId, createdAt` | 否 | 我的报名 |
| `dm_applications` | `idx_application_notice_creator_effective` | `noticeId, creatorUserId, isDeleted` | 是 | 防重报名 |
| `dm_messages` | `idx_message_receiver_read_created` | `receiverUserId, isRead, createdAt` | 否 | 消息中心 |
| `dm_reports` | `idx_report_status_created` | `status, createdAt` | 否 | 举报列表 |
| `dm_reports` | `idx_report_target_created` | `targetType, targetId, createdAt` | 否 | 聚合同对象举报 |
| `dm_feedback_records` | `idx_feedback_user_created` | `userId, createdAt` | 否 | 我的反馈 |
| `dm_account_actions` | `idx_account_action_user_status_start` | `userId, status, startAt` | 否 | 处罚查询 |
| `dm_account_actions` | `idx_account_action_end_status` | `endAt, status` | 否 | 到期解除 |
| `dm_operation_logs` | `idx_operation_target_created` | `targetType, targetId, createdAt` | 否 | 回溯查询 |
| `dm_operation_logs` | `idx_operation_operator_created` | `operatorType, operatorId, createdAt` | 否 | 按操作者查询 |
| `dm_admin_users` | `idx_admin_username` | `username` | 是 | 后台登录 |
| `dm_admin_sessions` | `idx_admin_session_token` | `tokenHash` | 是 | 会话校验 |
| `dm_admin_sessions` | `idx_admin_session_user_status` | `adminUserId, status, updatedAt` | 否 | 撤销与清理 |
| `dm_admin_sessions` | `idx_admin_session_expire` | `expiresAt, status` | 否 | 过期清理 |

### 5.2 索引设计说明

1. `dm_notices` 广场查询以 `status` 为首字段，是因为广场只看 `active`。
2. `dm_applications` 防重报名优先用唯一索引解决，避免单靠业务判断。
3. `dm_admin_sessions.tokenHash` 必须唯一，防止重复 session 混淆。

## 6. 初始化顺序

### 6.1 首次初始化步骤

1. 创建集合
2. 下发数据库安全规则
3. 创建索引
4. 写入基础配置
5. 创建初始管理员
6. 部署云函数
7. 跑烟雾验证

### 6.2 为什么规则先于云函数

1. 避免测试期误开直读直写。
2. 保证新环境启动即符合安全基线。

## 7. 验证清单

### 7.1 规则验证

1. 小程序端无法直接读取 `dm_users`
2. 小程序端无法直接写 `dm_notices`
3. 后台 Web 无法绕过云函数直接改 `dm_reports`
4. `dm_configs` 只有公开配置可直读

### 7.2 索引验证

1. 广场列表查询命中 `idx_notice_plaza_core`
2. 我的报名查询命中 `idx_application_creator_created`
3. 审核队列查询命中 `idx_review_task_queue`
4. 后台登录校验命中 `idx_admin_username` 和 `idx_admin_session_token`

## 8. 后续维护规则

1. 新增集合时必须同步补安全规则和索引说明。
2. 删除字段前必须确认是否被复合索引使用。
3. 每次提测前都要校验测试环境规则和正式环境规则是否一致。
