# 多米通告 后端环境与部署 Runbook V1

## 1. 文档信息

- 文档名称：后端环境与部署 Runbook V1
- 对应后端总文档：[CloudBase-Backend-Development-Guide-V1.md](CloudBase-Backend-Development-Guide-V1.md)
- 对应安全规则文档：[CloudBase-Security-Rules-And-Indexes-V1.md](CloudBase-Security-Rules-And-Indexes-V1.md)
- 对应后台鉴权规范：[CloudBase-Admin-Auth-Spec-V1.md](CloudBase-Admin-Auth-Spec-V1.md)
- 对应上线清单：[Miniapp-Launch-Checklist-V1.md](../operations/Miniapp-Launch-Checklist-V1.md)
- 文档日期：2026-03-16
- 文档目标：给 V1 后端提供环境初始化、部署顺序、验证步骤、回滚与日常运维的执行手册

## 2. 环境规划

### 2.1 环境矩阵

| 环境 | 用途 | 数据要求 | 发布要求 |
| --- | --- | --- | --- |
| `dev` | 本地联调、自测 | 可重置、可脏数据 | 支持频繁部署 |
| `test` | 集成测试、提测 | 接近真实配置 | 仅经提测流程发布 |
| `prod` | 正式环境 | 严格控制、可审计 | 仅允许正式发布 |

### 2.2 环境命名建议

| 逻辑名 | 占位示例 |
| --- | --- |
| `CLOUDBASE_ENV_ID_DEV` | `domi-dev-xxxx` |
| `CLOUDBASE_ENV_ID_TEST` | `domi-test-xxxx` |
| `CLOUDBASE_ENV_ID_PROD` | `domi-prod-xxxx` |

## 3. 必备配置项

### 3.1 云端配置表

| 配置项 | 必填 | 说明 |
| --- | --- | --- |
| `APP_ID` | 是 | 小程序 AppID |
| `CLOUDBASE_ENV_ID` | 是 | 当前环境 ID |
| `ADMIN_WEB_BASE_URL` | 是 | 后台访问地址 |
| `PUBLIC_FILE_BASE_URL` | 否 | 公共静态资源地址 |
| `ADMIN_INIT_USERNAME` | 首次初始化时是 | 初始超管用户名 |
| `ADMIN_INIT_PASSWORD` | 首次初始化时是 | 初始超管密码 |
| `SESSION_ABSOLUTE_HOURS` | 是 | 后台会话绝对时长 |
| `SESSION_IDLE_HOURS` | 是 | 后台空闲时长 |
| `DEFAULT_PAGE_SIZE` | 是 | 默认分页大小 |
| `MAX_PAGE_SIZE` | 是 | 最大分页大小 |
| `FEATURE_FLAGS` | 否 | 功能开关 |

### 3.2 不应进入仓库的敏感项

1. 初始管理员密码
2. 后台会话密钥
3. 私有环境 ID 映射表中的敏感备注
4. 任何私有域名白名单

## 4. 首次环境初始化

### 4.1 初始化顺序

1. 创建 CloudBase 环境
2. 绑定小程序与 CloudBase 环境
3. 创建数据库集合
4. 写入数据库安全规则
5. 创建数据库索引
6. 初始化 `dm_configs`
7. 初始化 `dm_admin_users`
8. 部署云函数
9. 部署后台 Web
10. 执行烟雾测试

### 4.2 首次初始化清单

必须创建的集合：

1. `dm_users`
2. `dm_publisher_profiles`
3. `dm_creator_cards`
4. `dm_notices`
5. `dm_notice_review_tasks`
6. `dm_applications`
7. `dm_messages`
8. `dm_reports`
9. `dm_feedback_records`
10. `dm_account_actions`
11. `dm_operation_logs`
12. `dm_configs`
13. `dm_admin_users`
14. `dm_admin_sessions`

### 4.3 初始配置建议

至少初始化：

1. 审核原因分类
2. 举报原因分类
3. 处罚原因分类
4. 基础风险词
5. 前台公开枚举
6. 广告位占位配置

### 4.4 初始超管创建

规则：

1. 仅在首次初始化时执行。
2. 仅创建 1 个 `super_admin`。
3. 创建成功后立即要求首次改密。

## 5. 云函数部署顺序

### 5.1 推荐顺序

1. `shared`
2. `admin-auth`
3. `user-bff`
4. `publisher-bff`
5. `creator-bff`
6. `notice-bff`
7. `application-bff`
8. `message-bff`
9. `report-bff`
10. `feedback-bff`
11. `review-admin`
12. `governance-admin`
13. `cron-jobs`

### 5.2 部署说明

1. 公共依赖变更后，所有业务函数都应重新安装依赖并部署。
2. 需要云端完整权限时，建议在微信开发者工具内执行一次“云端安装依赖 + 手动部署”。
3. `cron-jobs` 必须确认定时触发器已绑定正确环境。

## 6. 后台 Web 部署

### 6.1 V1 推荐方式

1. 管理后台打包为静态站点
2. 部署到 CloudBase 静态托管
3. 使用环境变量区分 `dev/test/prod`

### 6.2 发布前检查

1. 管理后台调用目标环境正确
2. 后台登录入口仅指向当前环境
3. 非正式环境不得误连正式云函数

## 7. 提测与上线部署流程

### 7.1 `dev -> test`

1. 合并提测版本
2. 部署测试环境云函数
3. 写入测试环境配置
4. 部署测试后台 Web
5. 执行测试 smoke case

### 7.2 `test -> prod`

1. 确认提测问题关闭
2. 确认正式环境规则、索引、配置已准备完毕
3. 先部署云函数
4. 再部署后台 Web
5. 最后执行正式环境 smoke case

### 7.3 发布窗口建议

1. 尽量避开高峰时段
2. 发布时需有一名后端负责人和一名运营负责人在线

## 8. Smoke Test 清单

### 8.1 小程序端

1. 首次进入是否自动建档
2. 发布方资料完善后能否创建草稿
3. 提交通告后是否生成审核任务
4. 达人报名后发布方是否收到消息
5. 联系方式是否按状态正确释放

### 8.2 后台端

1. 管理员能否登录
2. 审核任务列表是否正常加载
3. 审核通过后通告是否进入 `active`
4. 举报成立后是否可联动处罚
5. 操作日志是否写入

### 8.3 定时任务

1. 截止通告是否自动过期
2. 到期处罚是否自动解除
3. 重跑定时任务是否幂等

## 9. 回滚 Runbook

### 9.1 云函数回滚

适用场景：

1. 新版本导致大面积错误
2. 核心状态流转异常
3. 后台鉴权失效

处理顺序：

1. 停止继续发布
2. 回滚到上一个稳定云函数版本
3. 验证 `bootstrap`、`notice-bff.detail`、`review-admin.taskList`、`admin-auth.me`
4. 检查是否存在需要人工修复的数据

### 9.2 配置回滚

1. 回退 `dm_configs` 高风险配置
2. 回退定时任务触发参数
3. 必要时暂停 `cron-jobs`

### 9.3 数据修复原则

1. 先止血再修复
2. 修复前导出受影响对象 ID
3. 修复动作必须写审计日志

## 10. 日常运维清单

### 10.1 每日检查

1. 待审核任务是否堆积
2. 举报处理是否超时
3. 定时任务是否正常执行
4. 后台登录是否存在异常失败激增

### 10.2 每周检查

1. 关键集合索引是否仍命中主要查询
2. 是否存在异常增大的孤立文件目录
3. 是否存在过期 session 未清理
4. 是否存在长期未关闭的高风险举报

## 11. 责任分工建议

| 事项 | 责任角色 |
| --- | --- |
| 环境创建与云函数部署 | 后端负责人 |
| 小程序提测与版本说明 | 前端负责人 |
| 后台 Web 发布 | 前端或全栈负责人 |
| 审核值守与举报处理 | 运营负责人 |
| 生产事故协调 | 技术负责人 |

## 12. 上线前最终确认

1. 正式环境集合、规则、索引已齐全
2. 初始管理员可登录且已改密
3. 正式环境 `dm_configs` 已初始化
4. 所有核心 smoke case 通过
5. 运营值守表已确认
6. 回滚负责人已明确
