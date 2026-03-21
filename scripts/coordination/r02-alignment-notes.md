# R02 接口与实现差异收口建议（后端）

## 1. `priorityItems[]`

当前实现建议继续沿用后端 contract：

- `itemType`
- `itemId`
- `title`
- `summary`
- `status`
- `riskLevel`
- `createdAt`
- `routeKey`
- `routeParams`

说明：字段级结构已在 `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/admin/governance-admin.ts` 固化，但业务排序规则与优先级权重尚未进入正式共享文档。

## 2. `reportDetail.targetSnapshot`

当前实现已按以下字段收口：

- `targetType`
- `targetId`
- `displayName`
- `status`
- `ownerUserId`
- `city`
- `summary`
- `riskSummary`

说明：`summary` 目前按目标对象当前快照拼接，作为后台首轮联调字段；若后台需要拆字段展示，可继续直接消费其他显式字段。

## 3. 举报 / 处罚状态码

当前处理原则：

- `report.status`：实现层优先兼容 `pending / processing / confirmed / rejected / closed`
- `accountAction.status`：实现层优先兼容 `active / released`
- contract 仍保持 `string`，避免在共享文档未锁定前误固化前后台判断

## 4. `dm_configs` 命名差异

当前代码执行口径：

- 安全规则与初始化脚本公开组：`public_dictionary`、`ad_slots_public`、`feature_flags_public`
- 私有组：`risk_keywords`、`review_reason_categories`、`report_reason_codes`、`restriction_reason_categories`、`admin_ip_whitelist`

待统一项：

- 后端总文档仍写 `ad_slots`、`feature_flags`
- 安全文档与当前实现使用 `ad_slots_public`、`feature_flags_public`

建议：在正式拍板前，前后台不要自行新增 `dm_configs.groupKey`，统一按当前初始化模板落位。
