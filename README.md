# 多米通告 项目文档总览

## 项目状态

当前仓库不再是“文档先行、尚未开发”的早期状态。

截至 `2026-03-27`，当前真实状态是：

1. 小程序主线代码、技术验收、页面盘点与正式签收结论都已落盘
2. 小程序当前正式结论为 `最终签收通过`
3. 后台与后端当前转入维护态，默认只处理未来回归暴露出的最小 blocker
4. 仓库里仍同时保留产品、设计、技术、上线与控制面文档，作为后续维护和换机接手事实源

## 最新接手入口

如果你是在另一台电脑接手当前项目，先看：

1. [docs/engineering/Project-Handoff-2026-03-27.md](docs/engineering/Project-Handoff-2026-03-27.md)
2. [.control-state/current/handoff-miniapp-2026-03-25.md](.control-state/current/handoff-miniapp-2026-03-25.md)
3. [.control-state/current/board.md](.control-state/current/board.md)
4. [.control-state/current/miniapp-signoff-conclusion-r63.md](.control-state/current/miniapp-signoff-conclusion-r63.md)
5. [miniprogram/evidence/r58/summary.md](miniprogram/evidence/r58/summary.md)
6. [miniprogram/evidence/r58/ui-inventory.md](miniprogram/evidence/r58/ui-inventory.md)

如果只是想确认“项目现在是不是已经开发落地”，看第 `1` 和第 `4` 项即可。

当前有效方向：

1. 产品定位为低门槛、全链路免费、轻风控兜底的达人合作撮合小程序
2. UI 方向已锁定为“清爽可信、带编辑感的独立移动产品感”
3. 技术路线已锁定为“原生微信小程序 + CloudBase + 独立 Web 运营后台”

当前开发事实来源：

1. 小程序前端开发文档已定稿
2. 运营后台前端开发文档已定稿
3. CloudBase 后端开发文档、后台鉴权规范、API Contract、索引与部署文档已定稿

## 核心文档

## 文档目录结构

- `docs/product/`：产品需求、字段字典、权限矩阵、状态流转、审核工作流
- `docs/design/`：UI 定稿、设计系统、Token、高保真原型
- `docs/engineering/`：技术选型、前后端开发文档、鉴权规范、API Contract、部署与安全规范
- `docs/operations/`：品牌提审、规则协议、SOP、上线清单、种子内容模板

### 产品与流程

- 产品需求文档：[docs/product/PRD-V1.md](docs/product/PRD-V1.md)
- 运营后台需求：[docs/product/Admin-Operations-Backend-PRD-V1.md](docs/product/Admin-Operations-Backend-PRD-V1.md)
- 字段字典：[docs/product/Field-Dictionary-V1.md](docs/product/Field-Dictionary-V1.md)
- 可见性与权限矩阵：[docs/product/Visibility-Permissions-Matrix-V1.md](docs/product/Visibility-Permissions-Matrix-V1.md)
- 状态流转表：[docs/product/Status-Flow-Matrix-V1.md](docs/product/Status-Flow-Matrix-V1.md)
- 审核工作流：[docs/product/Review-Workflow-V1.md](docs/product/Review-Workflow-V1.md)

### UI 与体验

- UI 设计系统与规范：[docs/design/UI-Design-System-V1.md](docs/design/UI-Design-System-V1.md)
- Design Token：[docs/design/UI-Design-Tokens-V1.json](docs/design/UI-Design-Tokens-V1.json)
- UI 高保真预览：[docs/design/UI-High-Fidelity-Prototype-V1.html](docs/design/UI-High-Fidelity-Prototype-V1.html)
- UI 定稿结论：[docs/design/UI-Final-Signoff-V1.md](docs/design/UI-Final-Signoff-V1.md)

### 技术与开发

- 技术架构与选型方案：[docs/engineering/Technical-Architecture-Selection-V1.md](docs/engineering/Technical-Architecture-Selection-V1.md)
- CloudBase 后端开发文档：[docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md)
- 小程序前端开发文档：[docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md](docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md)
- 运营后台前端开发文档：[docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md](docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md)
- CloudBase 后台鉴权规范：[docs/engineering/CloudBase-Admin-Auth-Spec-V1.md](docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)
- Cloud Function API Contract：[docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)
- CloudBase 安全规则与索引规范：[docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md](docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md)
- 后端环境与部署 Runbook：[docs/engineering/Backend-Env-Deploy-Runbook-V1.md](docs/engineering/Backend-Env-Deploy-Runbook-V1.md)

### 运营、上线与合规

- 品牌与提审文案：[docs/operations/Brand-And-Audit-Copy-V1.md](docs/operations/Brand-And-Audit-Copy-V1.md)
- 平台规则文案初稿：[docs/operations/Platform-Rules-Draft-V1.md](docs/operations/Platform-Rules-Draft-V1.md)
- 用户协议初稿：[docs/operations/User-Agreement-Draft-V1.md](docs/operations/User-Agreement-Draft-V1.md)
- 隐私政策初稿：[docs/operations/Privacy-Policy-Draft-V1.md](docs/operations/Privacy-Policy-Draft-V1.md)
- 审核与处罚 SOP：[docs/operations/Moderation-SOP-V1.md](docs/operations/Moderation-SOP-V1.md)
- 首批通告模板：[docs/operations/Seed-Notice-Templates-V1.md](docs/operations/Seed-Notice-Templates-V1.md)
- 上线准备清单：[docs/operations/Miniapp-Launch-Checklist-V1.md](docs/operations/Miniapp-Launch-Checklist-V1.md)

## 文档状态分层

### 已定稿，可直接作为开发依据

- 小程序前端开发文档：[docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md](docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md)
- 运营后台前端开发文档：[docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md](docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md)
- CloudBase 后端开发文档：[docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md)
- CloudBase 后台鉴权规范：[docs/engineering/CloudBase-Admin-Auth-Spec-V1.md](docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)
- Cloud Function API Contract：[docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)
- CloudBase 安全规则与索引规范：[docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md](docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md)
- 后端环境与部署 Runbook：[docs/engineering/Backend-Env-Deploy-Runbook-V1.md](docs/engineering/Backend-Env-Deploy-Runbook-V1.md)

### 有效但属于业务/运营补充或上线前补全

- 品牌与提审文案：[docs/operations/Brand-And-Audit-Copy-V1.md](docs/operations/Brand-And-Audit-Copy-V1.md)
- 平台规则文案初稿：[docs/operations/Platform-Rules-Draft-V1.md](docs/operations/Platform-Rules-Draft-V1.md)
- 用户协议初稿：[docs/operations/User-Agreement-Draft-V1.md](docs/operations/User-Agreement-Draft-V1.md)
- 隐私政策初稿：[docs/operations/Privacy-Policy-Draft-V1.md](docs/operations/Privacy-Policy-Draft-V1.md)
- 审核与处罚 SOP：[docs/operations/Moderation-SOP-V1.md](docs/operations/Moderation-SOP-V1.md)
- 首批通告模板：[docs/operations/Seed-Notice-Templates-V1.md](docs/operations/Seed-Notice-Templates-V1.md)
- 上线准备清单：[docs/operations/Miniapp-Launch-Checklist-V1.md](docs/operations/Miniapp-Launch-Checklist-V1.md)

## 建议阅读顺序

1. 先看 [docs/product/PRD-V1.md](docs/product/PRD-V1.md) 与 [docs/product/Admin-Operations-Backend-PRD-V1.md](docs/product/Admin-Operations-Backend-PRD-V1.md)，确认前台与后台的业务边界
2. 再看 [docs/design/UI-Final-Signoff-V1.md](docs/design/UI-Final-Signoff-V1.md)、[docs/design/UI-Design-System-V1.md](docs/design/UI-Design-System-V1.md) 与 [docs/design/UI-High-Fidelity-Prototype-V1.html](docs/design/UI-High-Fidelity-Prototype-V1.html)，确认小程序端页面与交互定稿
3. 再看 [docs/engineering/Technical-Architecture-Selection-V1.md](docs/engineering/Technical-Architecture-Selection-V1.md)，确认技术路线、边界与拆分方式
4. 小程序前端开发先看 [docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md](docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md)，并同时配合 [docs/design/UI-Final-Signoff-V1.md](docs/design/UI-Final-Signoff-V1.md)、[docs/design/UI-Design-System-V1.md](docs/design/UI-Design-System-V1.md)、[docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md) 与 [docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)
5. 运营后台前端开发先看 [docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md](docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md)，并同时配合 [docs/engineering/CloudBase-Admin-Auth-Spec-V1.md](docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)、[docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)、[docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md) 与 [docs/product/Admin-Operations-Backend-PRD-V1.md](docs/product/Admin-Operations-Backend-PRD-V1.md)
6. CloudBase 后端开发先看 [docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md)，配合 [docs/engineering/CloudBase-Admin-Auth-Spec-V1.md](docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)、[docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)、[docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md](docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md)、[docs/engineering/Backend-Env-Deploy-Runbook-V1.md](docs/engineering/Backend-Env-Deploy-Runbook-V1.md)，再配合 [docs/product/Field-Dictionary-V1.md](docs/product/Field-Dictionary-V1.md)、[docs/product/Visibility-Permissions-Matrix-V1.md](docs/product/Visibility-Permissions-Matrix-V1.md)、[docs/product/Status-Flow-Matrix-V1.md](docs/product/Status-Flow-Matrix-V1.md)、[docs/product/Review-Workflow-V1.md](docs/product/Review-Workflow-V1.md)
7. 上线前再回到合规、运营与法务文档补齐执行项

## 文档优先级

当文档之间出现冲突时，按以下优先级认定：

1. [docs/engineering/Technical-Architecture-Selection-V1.md](docs/engineering/Technical-Architecture-Selection-V1.md)、[docs/design/UI-Final-Signoff-V1.md](docs/design/UI-Final-Signoff-V1.md)、[docs/engineering/CloudFunction-API-Contract-V1.md](docs/engineering/CloudFunction-API-Contract-V1.md)
2. [docs/engineering/CloudBase-Backend-Development-Guide-V1.md](docs/engineering/CloudBase-Backend-Development-Guide-V1.md)、[docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md](docs/engineering/MiniProgram-Frontend-Development-Guide-V1.md)、[docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md](docs/engineering/Admin-Web-Frontend-Development-Guide-V1.md)、[docs/engineering/CloudBase-Admin-Auth-Spec-V1.md](docs/engineering/CloudBase-Admin-Auth-Spec-V1.md)、[docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md](docs/engineering/CloudBase-Security-Rules-And-Indexes-V1.md)、[docs/engineering/Backend-Env-Deploy-Runbook-V1.md](docs/engineering/Backend-Env-Deploy-Runbook-V1.md)
3. [docs/product/PRD-V1.md](docs/product/PRD-V1.md)、[docs/product/Admin-Operations-Backend-PRD-V1.md](docs/product/Admin-Operations-Backend-PRD-V1.md)、[docs/design/UI-Design-System-V1.md](docs/design/UI-Design-System-V1.md)、[docs/product/Field-Dictionary-V1.md](docs/product/Field-Dictionary-V1.md)、[docs/product/Visibility-Permissions-Matrix-V1.md](docs/product/Visibility-Permissions-Matrix-V1.md)、[docs/product/Status-Flow-Matrix-V1.md](docs/product/Status-Flow-Matrix-V1.md)、[docs/product/Review-Workflow-V1.md](docs/product/Review-Workflow-V1.md)
4. 各类 `Draft`、`Checklist`、`SOP`、协议与提审文档

说明：

1. 若实现层发生冲突，开发团队优先遵守“架构选型 / UI 定稿 / API Contract / 开发文档”这一层级。
2. 协议、规则和清单类文档仍是有效工作文档，但部分内容属于上线前占位初稿。

## 本轮清理结论

1. 旧的竞品交接型 README 已废弃，现已替换为正式项目索引。
2. 低保真原型文档已废弃并移除，后续不再作为当前事实来源。
3. 当前 `docs/` 目录中剩余文档均仍有保留价值。
4. 小程序前端开发文档与运营后台前端开发文档均已补齐并定稿。
5. CloudBase 后端主文档与配套执行文档已补齐，前后端后续实现应以这组技术文档为事实来源。
6. `Draft`、协议、提审、清单类文档继续保留，但不覆盖已锁定的技术与 UI 文档。

## Skills 同步

如需在另一台电脑对齐当前这台机器使用的 skills，可查看：

- [tools/skills-sync/README.md](tools/skills-sync/README.md)
- [tools/skills-sync/MANIFEST.md](tools/skills-sync/MANIFEST.md)
