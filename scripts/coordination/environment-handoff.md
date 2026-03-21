# CloudBase 环境 Handoff（后端 R33）

## 1. 当前已确认

- 小程序 `AppID`：`wxa6f615dcab1f984f`
- 公众平台账号可持续使用情况：`是`
- 主体类型：`个人`
- 拟用名称：`多米通告`
- 类目：`工具-预约/报名`
- 小程序备案状态：`审核中`
- 微信认证状态：`审核中`
- 当前 `dev` 候选环境：`cloud1-4grxqg018586792d`
- 当前凭据下可见的 CloudBase 环境列表已收口为仅 1 套：`cloud1-4grxqg018586792d`（alias：`cloud1`）
- 已确认 `ADMIN_WEB_BASE_URL`：`https://cloud1-4grxqg018586792d-1412048057.tcloudbaseapp.com/`
- 已确认真实登录入口实现事实：自动化与人工验证应优先从根路径 `/` 进入，必要时通过风险提示页，再落到真实登录页 `login?redirect=/dashboard`；不要把裸 `/login` 的 `404` 误判成后台未发布。
- 已确认首批 `admin-auth` 技术 smoke 已由后台成功闭环：`login -> changePassword -> workspace -> logout -> login -> me -> workspace -> logout`。
- 已确认“`admin-auth` 技术 smoke 成功”与“后台体验 / must-close 证据已自洽通过”是两件事；截至 R43，这两件事当前都已分别成立，但结论范围只覆盖后台 `admin-auth` 最小体验闭环。
- R31 已完成一次性凭据的非同步交付，后台已基于该凭据补跑一轮新的真实 `admin-auth` smoke。
- R32 体验复核后的最小缺口已正式收口为 3 项：首次改密弹层、首次改密后工作区、标准登录后工作区。
- R33 后台已正式提出新的首次改密请求；后端已再次复用重置脚本准备一套新的“一次性密码 + `mustResetPassword=true`”凭据，并已将明文重新置入本机非同步介质（剪贴板），待按既定安全方式转交后台执行窗口。
- owner 边界已纠偏：`后端` 负责 CloudBase 环境初始化、规则 / 索引下发、seed 写入与云函数部署；`后台` 负责 `admin-web` 静态站点发布、`ADMIN_WEB_BASE_URL` 与真实登录入口回传；`阻塞协调` 仅在后台缺发布权限、缺账号或缺外部持有方配合时介入。
- owner 侧已确认并安全转交真实可用密钥给当前后端会话完成初始化与部署核验；同步文档中不记录明文，后续若需再次实跑仍应通过安全渠道重新注入。
- 后端初始化脚本入口：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/init-database.mjs`
- `storageRule` 定向重试脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/retry-storage-rule.mjs`
- `dm_configs` 审计脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/audit-config-groups.mjs`
- `dm_configs` 去重脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/dedupe-config-groups.mjs`
- 新增可信凭据重置脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/reset-admin-credential.mjs`
- 新增云函数状态核查脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-cloudfunctions-active.mjs`
- 新增函数安全规则更新脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/update-function-security-rule.mjs`
- smoke readiness 检查脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-real-smoke-readiness.mjs`
- readiness 脚本会显式识别“缺少真实密钥 / 占位值密钥 / 已提供真实密钥”三种状态。
- 真实 smoke 模板：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/coordination/r08-real-smoke-template.md`
- 云函数部署顺序基线：`shared -> admin-auth -> user-bff -> publisher-bff -> creator-bff -> notice-bff -> application-bff -> message-bff -> review-admin -> governance-admin -> cron-jobs`

## 1.1 初始化主体结果（已执行）

- 已收到并使用安全转交的真实腾讯云密钥执行 `init-database.mjs --apply`。
- `collections`：14/14 返回成功，本轮重跑均为 `created=false`，说明集合当前已存在。
- `databaseRules`：14/14 返回成功，均已按 `CUSTOM` 写入。
- `indexes`：25/25 已可成功检查；首次有效重跑已创建完成，随后幂等重跑返回 `created=false`。
- `dm_admin_users` / `seed-admin-users`：脚本已返回创建首个超管成功，`adminUserId=admin_c7d01f016a9115ff`，用户名为 `domi_admin`；额外按 `data.username` 只读核查可命中 1 条。
- `storageRule`：CloudBase 返回 `ModifyStorageSafeRule / OperationDenied.FreePackageDenied / 当前套餐无法执行此操作`；该失败事实继续保留。

## 1.2 云函数部署 / 环境一致性核验（已执行）

- 已使用安全转交的真实腾讯云密钥完成 CloudBase 环境与云函数核验。
- R24 首次核验前，目标环境 `cloud1-4grxqg018586792d` 的云函数列表为空，`total=0`；随后已先部署 `admin-auth`，并确认其 `status=Active`。
- R27 扩展部署前，该环境云函数列表为 `total=1`，当前仅有 `admin-auth`。
- 已本地完成下一批函数构建：`user-bff`、`publisher-bff`、`creator-bff`、`application-bff`、`review-admin`、`governance-admin`、`notice-bff`、`message-bff`、`cron-jobs` 均可成功打包。
- 已将以上 9 个函数补部署到 `cloud1-4grxqg018586792d`。
- R29 已再次远端复核该环境，当前云函数列表仍为 `total=10`，函数名为：`admin-auth`、`user-bff`、`publisher-bff`、`creator-bff`、`application-bff`、`review-admin`、`governance-admin`、`notice-bff`、`message-bff`、`cron-jobs`。
- R32 已通过 `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-cloudfunctions-active.mjs` 再次核验，结果为 `expectedCount=10`、`totalCount=10`、`activeCount=10`、`missingFunctions=[]`、`inactiveFunctions=[]`。
- R33 已再次使用同一脚本复核，结果继续为 `expectedCount=10`、`totalCount=10`、`activeCount=10`、`missingFunctions=[]`、`inactiveFunctions=[]`。
- 当前 10 个函数均已再次核验 `status=Active`、`runtime=Nodejs16.13`，未见回退。
- 当前函数 `modTime` 如下：
  - `admin-auth`：`2026-03-18 17:37:08`
  - `user-bff`：`2026-03-18 18:51:49`
  - `publisher-bff`：`2026-03-18 18:52:08`
  - `creator-bff`：`2026-03-18 18:52:26`
  - `application-bff`：`2026-03-18 18:52:44`
  - `review-admin`：`2026-03-18 18:53:01`
  - `governance-admin`：`2026-03-18 18:53:19`
  - `notice-bff`：`2026-03-18 18:53:36`
  - `message-bff`：`2026-03-18 18:53:53`
  - `cron-jobs`：`2026-03-18 18:54:10`
- `shared` 是共享源码层，不是独立 deployable 云函数；其代码会随 `admin-auth`、`user-bff` 等可部署函数一并打包。
- 基于以上核验，当前关于“云函数部署到哪套环境”的正式结论继续保持：`已部署到 cloud1-4grxqg018586792d`，且 10 个函数的部署事实当前稳定有效。

## 1.3 当前联调分层事实

### 1.3.1 已真实参与联调

- `admin-auth`
  - 已被后台真实技术 smoke 至少验证 1 次。
  - 当前能确认的事实边界是：技术链路成功闭环成立。
  - 当前不能确认的事实边界是：后台体验 / must-close 复审已通过；R32 的正式结论仍是“缺 3 个最小视觉证据点”。
  - R29 / R30 已验证可信凭据重置路径可用；若后台需要新的首次改密机会，当前可直接复用脚本再次准备一次性密码。

### 1.3.2 已部署待验证

- 后台下一批真实读接口 / 动作联调待验证：`review-admin`、`governance-admin`
- 小程序首批真实 smoke 待验证：`user-bff`、`publisher-bff`、`creator-bff`、`application-bff`、`notice-bff`、`message-bff`
- 任务函数已部署待后续场景验证：`cron-jobs`

说明：以上函数当前能确认的是“已部署且 Active”；尚不能把它们误写成“已完成真实联调验证”。

## 1.4 可信凭据重置路径（R29 新增）

- 当前已选择路径 A：重置 `domi_admin.mustResetPassword=true`，并准备一次性密码。
- 已新增脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/reset-admin-credential.mjs`
- 当前脚本能力：
  - 生成满足 V1 口径的纯字母数字一次性密码；
  - 重置 `passwordHash`；
  - 强制 `mustResetPassword=true`；
  - 重置失败计数与锁定态；
  - 可选吊销当前活跃后台会话；
  - 可选将一次性密码复制到本机剪贴板，避免落盘。
- R30 已补兼容：同时支持 top-level 字段与 `data.*` 包装态的 `dm_admin_users` / `dm_admin_sessions` 文档，避免因环境返回形态差异导致“查不到超管”或回写时触发 `_id` 更新错误。
- R33 最近一次实际执行结果：
  - 目标账号：`domi_admin`
  - 环境：`cloud1-4grxqg018586792d`
  - 状态：`credentialPrepared=true`
  - 交付状态：`clipboard-ready`
  - 脱敏登录校验结果：`code=0`、`message=ok`、`mustResetPassword=true`、`hasToken=true`
- 当前 R33 状态：`已再次准备好`；新的首次改密凭据已重新置入本机剪贴板，并已触发本地交付提示，等待按既定安全方式完成非同步交付。
- 当前推荐执行命令：

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run reset:admin-credential -- --env cloud1-4grxqg018586792d --username domi_admin --copy-password
```

## 1.5 `storageRule` 当前口径与补执行入口

- 当前失败并非脚本参数错误，而是 CloudBase 套餐能力限制；在套餐不变时重复重试不会成功。
- 按当前已拍板口径：对 `dev` 候选环境 `cloud1-4grxqg018586792d`，`storageRule` 暂按“已知环境例外”处理，不阻塞首批真实 smoke。
- 仍保留只重试 `storageRule` 的入口，供后续升级套餐或切换到支持该能力的新环境后补执行：

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run retry:storage-rule -- --env cloud1-4grxqg018586792d --apply
```

## 1.6 `dm_configs` 审计结论（按 `groupKey`）

- 已通过 `audit-config-groups.mjs` 与导出核查确认：当前 `dm_configs_count=16` 不是历史额外组，也不是命名漂移导致的混合数据。
- 实际结果是：初始化模板中的 8 个 `groupKey` 都各出现了 2 条，共 16 条；没有缺失组，也没有模板外组。
- 8 个重复 `groupKey` 为：`public_dictionary`、`ad_slots_public`、`feature_flags_public`、`risk_keywords`、`review_reason_categories`、`report_reason_codes`、`restriction_reason_categories`、`admin_ip_whitelist`。
- 重复根因已确认：`init-database.mjs` 在 secret 模式下查询 CloudBase 文档时，返回结构为 `data.*` 包装；旧逻辑使用 `where({ groupKey })` / `where({ username })`，无法命中已有记录，导致后续重跑再次插入。
- 当前脚本已修正为 `where({ 'data.groupKey': ... })` 与 `where({ 'data.username': ... })`；因此后续重跑不应再继续制造新的 `dm_configs` 或超管重复记录。
- 现有重复数据仍未自动清理；当前结论应记为“重复 seed 已发生，根因已定位并完成脚本侧收口，存量重复仍待后续清理策略”。
- 已新增 `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/dedupe-config-groups.mjs`；按 `--strategy oldest` 的 dry-run 结果，8 组重复都属于 `sameBusinessPayload=true`，建议保留首批 8 条、删除后插入的 8 条，当前 `totalDeleteCount=8`，且不存在需要人工拆分的差异 payload。
- 截至 R29，`oldest` 去重 apply 仍未获总控正式拍板，因此当前保持 dry-run 结论，不擅自执行删除。

## 1.7 管理员联调默认方案

- 首批联调账号最终沿用已创建 seed 账号 `domi_admin`；当前不把“额外标准账号 / 额外首次改密账号”作为首批 smoke 前置阻塞项。
- 当前 seed 账号角色为 `super_admin`，状态为 `active`，且初始化时已写入 `mustResetPassword=true`；因此它既可作为首登账号，也可直接作为首次改密账号。
- 首次改密链路已不再停留在“实现可执行”层面，当前已被后台真实技术 smoke 成功验证过一次。
- 当前首批后台登录链路的四项核心前提——`ADMIN_WEB_BASE_URL`、真实进入路径、云函数环境一致性、seed 密码交付——均已至少完成一次真实执行闭环。

## 2. 当前后台 Web 权限诊断结论

- 当前 `dev` 环境 `cloud1-4grxqg018586792d` 的函数安全规则已被总控直接读取，真实值为：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  }
}
```

- 上述真实规则已直接解释后台 `admin-web` 当前失败：`admin-web` 现状是“匿名 CloudBase 登录 + SDK callFunction”，因此它会被当前 wildcard 规则稳定拦截，表现为登录提交后 `OPERATION_FAIL / PERMISSION_DENIED`。
- 同环境服务端对照调用 `admin-auth.login` 继续成功返回 `code=0`、`mustResetPassword=true`、`hasToken=true`；说明函数实现、账号状态与当前一次性凭据本身当前均可用。
- 总控已在当前 `dev` 环境执行最小 unblock，现行函数安全规则为：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  },
  "admin-auth": {
    "invoke": true
  }
}
```

- 说明：这里放开的只是 CloudBase 客户端 `callFunction` 入口；真正的后台权限仍应继续由各函数内部的 `meta.adminSessionToken`、`requireAdminAuth` 与角色校验负责。
- 当前第一待验证项已从“根因补查”切换为：后台基于已修复环境，立即重跑 `admin-auth` 的 3 个最小证据点——首次改密弹层、首次改密后工作区、标准登录后工作区。
- 若后台重跑后仍失败，必须继续带 `*-after-submit-snapshot.txt` 与页面错误文案回传；在拿到新证据前，不再回退旧根因。
- 截至 R37，总控已进一步完成服务端对照核验：fresh 凭据下 `admin-auth.login -> changePassword -> me` 都返回 `code=0`；因此“当前 fresh 凭据不可用”已被排除为当前第一根因。
- 截至 R37，后台侧最新失败已收口为：首次改密登录能进入 `/dashboard` 的改密弹层，但点击“确认修改”后弹层不关闭；当前问题边界更偏向后台 Web 页面交互 / smoke 自动化，而非后端 `changePassword` 或 `me` 链路。
- 若后续后台 Web 开启 `review-admin` / `governance-admin` 的真实 transport，当前还不能直接视为已打通；仍需在保持匿名 CloudBase transport 的前提下扩展函数安全规则，例如：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  },
  "admin-auth": {
    "invoke": true
  },
  "review-admin": {
    "invoke": true
  },
  "governance-admin": {
    "invoke": true
  }
}
```

- 截至 R43，总控已在 `dev` 环境实际执行上述最小放行；当前函数安全规则真实值为：

```json
{
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  },
  "admin-auth": {
    "invoke": true
  },
  "review-admin": {
    "invoke": true
  },
  "governance-admin": {
    "invoke": true
  }
}
```

- 若不希望继续扩大匿名放行面，则需改掉当前后台 Web 的 CloudBase transport 方案，而不是误把 `admin-auth` 的最小 unblock 当成全后台真实读已闭环。
- `dm_configs` 现有 16 条中包含 8 组重复记录；脚本侧已阻止继续扩散，但存量重复仍需总控确认是否执行 `oldest` 去重 apply。
- 题 4 / 5 / 6 高优先级规则，以及题 1 / 2 / 3 与 `notice-bff.republish.deadlineAt`，当前仍待正式拍板。
- 小程序侧首批真实 smoke 与证据补齐仍待执行；虽所需主要云函数覆盖面已补齐，但真实链路结果尚未补回。
- 后台其余业务域仍待继续做更大范围真实 handler / mock 替换收口与真实联调。
- `storageRule` 在当前套餐下仍无法落地：失败步骤 `storageRule`，接口动作 `ModifyStorageSafeRule`，错误码 `OperationDenied.FreePackageDenied`，提示 `当前套餐无法执行此操作`；但按当前口径，这一项在 `dev` 环境按“已知环境例外”处理，不阻塞当前联调推进。

说明：当前 `admin-auth` 根因已实锤且 `dev` 环境最小 unblock 已执行；后端 owner 范围内下一阶段重点切换为“支援后台补 3 个最小证据点”、“评估 `review-admin` / `governance-admin` 的长期规则或 transport 方案”、“dm_configs` 去重决策”，以及继续支持前后台更大范围真实联调。

## 2.1 admin-web 部署版本一致性核查（R39 新增）

- 新增脚本：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/check-admin-web-deploy-fingerprint.mjs`
- 目标：快速判断 CloudBase 上的 `admin-web` 当前资源是否疑似旧版，并提供可落盘的资源指纹。
- 脚本能力：
  - 抓取 `ADMIN_WEB_BASE_URL` 下的 `/` 与 `/login?redirect=/dashboard` 页面；
  - 提取并下载首批静态资源（JS/CSS），输出 `sha256` 指纹与资源清单；
  - 按关键 marker（默认含 `markPasswordResetCompleted`）检查线上 JS 是否包含预期逻辑标记；
  - 可选对比本地 `admin-web/dist` 资源名，判断线上是否缺失本地构建产物。
- 建议用途：
  - 当“本地代码已修，但线上行为像旧版”时，先跑本脚本；
  - 若 marker 缺失或本地 `dist` 对比存在 `missingInRemote`，优先按“部署版本滞后”处理；
  - 若 marker 全命中且资源对齐，再优先排查页面运行态链路，而不是重复质疑后端 action 成功性。

## 3. 初始化脚本实跑所需环境变量

必填：

- `CLOUDBASE_ENV_ID`
- `TENCENTCLOUD_SECRETID` 或 `TENCENT_SECRET_ID`
- `TENCENTCLOUD_SECRETKEY` 或 `TENCENT_SECRET_KEY`

可选：

- `TENCENTCLOUD_SESSIONTOKEN` 或 `TENCENT_SESSION_TOKEN`
- `ADMIN_INIT_USERNAME`
- `ADMIN_INIT_PASSWORD`
- `ADMIN_INIT_DISPLAY_NAME`
- `ADMIN_INIT_ROLE_CODES`

## 4. 真实 smoke 建议补充环境变量

- `CLOUDBASE_ENV_ID_TEST` 或 `CLOUDBASE_ENV_ID_DEV`（当前建议指向 `cloud1-4grxqg018586792d`）
- `ADMIN_WEB_BASE_URL`（当前正式值为 `https://cloud1-4grxqg018586792d-1412048057.tcloudbaseapp.com/`）
- `ADMIN_SMOKE_USERNAME`（默认可复用 `ADMIN_INIT_USERNAME`）
- `ADMIN_SMOKE_PASSWORD`（当前一次性密码仅通过非同步方式交付，不写入同步文档）

## 5. 推荐执行命令

### 5.1 快速检查 readiness

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run check:smoke-readiness
```

### 5.2 核查当前 10 个云函数状态

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run check:functions-active -- --env cloud1-4grxqg018586792d
```

### 5.3 只重试 `storageRule`

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run retry:storage-rule -- --env cloud1-4grxqg018586792d --apply
```

### 5.4 核查 `dm_configs` 当前分组分布

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run audit:config-groups -- --env cloud1-4grxqg018586792d
```

### 5.5 `dm_configs` 去重 dry-run

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run dedupe:config-groups -- --env cloud1-4grxqg018586792d --strategy oldest
```

### 5.6 核查 `admin-web` 线上部署版本是否疑似旧版

```bash
cd /Users/gy-vip/Desktop/KK_Crab-backend/scripts
npm run check:admin-web-deploy -- \
  --base-url https://cloud1-4grxqg018586792d-1412048057.tcloudbaseapp.com \
  --marker markPasswordResetCompleted \
  --local-dist /Users/gy-vip/Desktop/KK_Crab-admin/admin-web/dist \
  --output ./admin-web-deploy-check.json
```

补充说明：
- 若当前机器还没构建 `admin-web/dist`，可先去掉 `--local-dist` 只做线上资源与 marker 核查；
- `--output` 会落标准 JSON，便于总控与后台复盘“是否需要重新发布 admin-web”。

### 5.7 后台角色一键发布 `admin-web`

```bash
cd /Users/gy-vip/Desktop/KK_Crab-admin/admin-web
npm run release:hosting
```

补充说明：
- 该命令会串起来执行：`build -> publish hosting -> deploy fingerprint check`
- 本机需先准备非仓库凭据文件：`~/.config/kk-crab/admin-web-publish.env`
- 模板位于：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/scripts/admin-web-publish.env.example`
- 若发布后要继续自动补跑首次改密 smoke，可执行：

```bash
cd /Users/gy-vip/Desktop/KK_Crab-admin/admin-web
npm run release:hosting:with-smoke
```

### 5.6 当前已部署可联调函数

- 后台：`admin-auth`、`review-admin`、`governance-admin`
- 小程序：`user-bff`、`publisher-bff`、`creator-bff`、`application-bff`、`notice-bff`、`message-bff`
- 任务：`cron-jobs`
