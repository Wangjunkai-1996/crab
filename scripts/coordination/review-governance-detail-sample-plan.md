# review/governance detail 最小样本数据方案（R45）

## 1. 结论先行

- 当前**服务端真实读链路已绿**，不需要为了“接口可用性”补样本数据。
- 若目标是后台页面级 smoke 的**空态路径**（列表为空、只读详情未点开），也不需要补样本数据。
- 只有在需要覆盖 `review-admin.taskDetail` / `governance-admin.reportDetail` 的 **populated-data 路径** 时，才需要补最小 `dev` 样本数据。

## 2. 最小可执行方案（推荐）

推荐一次性补 3 条记录，覆盖审核详情 + 举报详情：

1) `dm_notices`：插入 1 条最小通告样本（供审核任务与举报目标复用）  
2) `dm_notice_review_tasks`：插入 1 条 `pending` 审核任务（`objectId` 指向上面的 `noticeId`）  
3) `dm_reports`：插入 1 条 `pending` 举报（`targetType='notice'`，`targetId` 指向同一个 `noticeId`）

该方案优点：

- 覆盖两条详情链路，数据量最小；
- 不依赖小程序真实用户行为；
- 与现有 `list -> detail` smoke 取第一条数据逻辑天然兼容；
- 不影响权限与鉴权策略，不触碰函数安全规则。

## 3. 字段最小集（建议）

### `dm_notices`（最小）

- `noticeId`
- `publisherUserId`
- `title`
- `status`
- `city`
- `cooperationPlatform`
- `settlementType`
- `budgetSummary`
- `createdAt`
- `updatedAt`

### `dm_notice_review_tasks`（最小）

- `reviewTaskId`
- `objectId`（等于 `noticeId`）
- `taskStatus`（建议 `pending`）
- `reviewStage`（建议 `first_review`）
- `queueType`（建议 `first_review_queue`）
- `riskLevel`（可选，建议 `low/medium`）
- `riskFlags`（可选，数组）
- `createdAt`
- `updatedAt`

### `dm_reports`（最小）

- `reportId`
- `reporterUserId`
- `targetType`（`notice`）
- `targetId`（等于 `noticeId`）
- `reasonCode`
- `status`（建议 `pending`）
- `createdAt`
- `updatedAt`

## 4. 执行与回滚建议

- 执行方式：建议新增独立 seed 脚本（例如 `scripts/seed-admin-detail-smoke-sample.mjs`），支持 `--apply` / `--dry-run`。
- 回滚方式：脚本记录本次插入的 `noticeId/reviewTaskId/reportId`，提供 `--cleanup` 删除。
- 命名建议：统一前缀 `smoke_r45_`，防止与真实数据混淆。

## 5. 拍板建议

- 若本轮目标是“后台页面级真实读空态证据”：**不补数据**，直接执行页面级 smoke。
- 若本轮目标包含“详情页 populated-data 证据”：按本文最小方案补 3 条样本，再执行 smoke。
