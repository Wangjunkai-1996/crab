# R06 后台只读态 / 日志字段代表事实（后端）

## 1. 代表 sample 文件

### 审核详情 `review-admin.taskDetail`

- 他人占用只读：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/review-admin.taskDetail.readonly-processing.response.json`
- 已处理只读：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/review-admin.taskDetail.readonly-completed.response.json`

### 举报详情 `governance-admin.reportDetail`

- 他人占用只读：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.reportDetail.readonly-processing.response.json`
- 已处理只读：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.reportDetail.readonly-closed.response.json`

### 处罚记录列表 `governance-admin.accountActionList`

- 活跃 / 已解除混合代表：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.accountActionList.readonly-cases.response.json`

### 操作日志列表 `governance-admin.operationLogList`

- `afterSnapshot` 常见字段代表：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.operationLogList.afterSnapshot-common.response.json`

## 2. contract 边界

- 本轮未改动 `review-admin` / `governance-admin` 共享 TS contract；当前补的是“代表事实 sample”，用于后台 service / 页面状态对齐。
- 若后续后台仍发现字段级缺口，应优先在共享 contract 中补显式字段，而不是在页面层自造只读态字段。

## 3. 推荐消费方式

- 他人占用只读：以后端 `availableActions[].disabled = true` + `disabledReason` 作为首要判定，不由页面自行推导。
- 已处理只读：以后端 `taskStatus` / `report.status` 与 `availableActions[].disabledReason` 联合显示历史态。
- `afterSnapshot`：以后端原样对象作为事实源，后台 normalizer 可按 action 类型做只读映射，但不要丢弃原始字段。
