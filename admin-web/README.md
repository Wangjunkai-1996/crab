# 多米通告 V1 后台 Web

## 本地开发

- 安装依赖：`npm install`
- 启动开发环境：`npm run dev`
- 类型检查：`npm run typecheck`
- 构建：`npm run build`

## 发布自检

- 发布状态检查：`npm run check:publish-status`
- 发布状态检查并验证构建：`npm run check:publish-status:verify-build`
- 角色自发布 dry-run：`npm run release:hosting:dry-run`
- 角色自发布：`npm run release:hosting`
- 发布后立即跑首次改密 smoke：`npm run release:hosting:with-smoke`
- 当前脚本会额外输出 `entry_script_src`、`deployed_admin_layout_chunk`、`publish_version_consistency` 与 `publish_version_missing_markers`，可直接判断线上是否仍是旧包
- 当前构建会在浏览器启动时写入 `window.__DM_ADMIN_WEB_BUILD__`，也会输出一条 `[admin-web build]` 控制台日志，便于发版后快速核对真实部署版本
- 当前发布 owner：后台线
- 当前正式后台地址：`https://cloud1-4grxqg018586792d-1412048057.tcloudbaseapp.com/`
- 当前默认登录入口结论：`${ADMIN_WEB_BASE_URL}/login`；R24 已确认当前真实入口就是 `/login`，若后续真实入口不同，可用 `ADMIN_WEB_LOGIN_PATH` 覆盖

## 角色自发布

- 目标：让后台角色在自己的工程目录里直接完成 `build -> publish -> deploy fingerprint check`
- 一次性本机配置：
  1. 复制模板：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/scripts/admin-web-publish.env.example`
  2. 保存到：`~/.config/kk-crab/admin-web-publish.env`
  3. 填入真实 `TENCENTCLOUD_SECRETID` / `TENCENTCLOUD_SECRETKEY`
- 配好后，后台角色只需在 `admin-web/` 下执行：
  - `npm run release:hosting`
- 若还想在发版后自动补跑首次改密闭环：
  - `npm run release:hosting:with-smoke`
- 说明：
  - 真实密钥只放本机非仓库文件，不写入仓库、控制文档或证据目录
  - 当前发布命令会调用后端侧的 CloudBase Hosting 发布脚本，但后台角色只需要记住 `release:hosting` 这一条命令

## 真实 `admin-auth` smoke 入口

- 环境模板：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/.env.real-admin-auth.example`
- 本地配置：复制为 `admin-web/.env.real-admin-auth.local`
- 干跑检查：`npm run smoke:admin-auth:real:dry-run`
- 首次改密闭环：`npm run smoke:admin-auth:real:first-reset`
- 标准登录闭环：`npm run smoke:admin-auth:real:standard`
- 一次性整包复跑：`npm run smoke:admin-auth:real`
- 若登录提交出现 `PERMISSION_DENIED`，当前先按“函数未部署到同一环境 / 前后端环境不一致”处理，不按“密码错误”处理
- 当前最小真实方案：沿用 seed 账号 `domi_admin`，先改密再复核标准登录；若环境侧另给独立标准账号，脚本也可兼容。
- 当前自动化入口应统一从根路径 `/` 开始；CloudBase 测试域名的“风险提示”页确认按钮存在倒计时，秒数不固定，脚本与人工执行都应等待按钮真正可点击后再继续，不要写死固定等待秒数。
- 真实读接口切换开关：默认仍保持 mock；当 `VITE_ENABLE_REAL_ADMIN_READS=true` 且已配置 `VITE_CLOUDBASE_ENV_ID` 时，`dashboard`、`operationLogList`、`taskList`、`taskDetail`、`reportList`、`reportDetail`、`accountActionList` 可切到真实 CloudBase transport。
- 写动作开关：默认 `VITE_ENABLE_REAL_ADMIN_WRITES=false`；即便开启真实读，详情动作与处罚动作也会先保持只读，直到真实写 transport 准备完成。

## 证据目录

- 当前真实 smoke 产物目录：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/evidence/r09/real-admin-auth`
- R10 收口说明：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/evidence/r10/must-close-status.md`
- R10 执行顺序：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/evidence/r10/real-smoke-readiness.md`
- R24 联调字段清单：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/evidence/r10/admin-auth-handoff-fields.md`
- R24 发布状态：`/Users/gy-vip/Desktop/KK_Crab-admin/admin-web/evidence/r10/admin-web-publish-status.md`
