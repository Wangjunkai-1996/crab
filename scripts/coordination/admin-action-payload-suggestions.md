# 后台动作请求建议（R03）

> 状态：临时口径，仅供联调；未拍板前不得当成最终业务规则。

## 单点事实源

- TypeScript：`/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/admin/action-payloads.ts`
- JSON 枚举：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/admin.action-payload-enums.json`

## 推荐 payload 样例

- `review-admin.resolveTask`：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/review-admin.resolveTask.request.json`
- `governance-admin.resolveReport`：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.resolveReport.request.json`
- `governance-admin.createAccountAction`：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.createAccountAction.request.json`
- `governance-admin.releaseAccountAction`：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.releaseAccountAction.request.json`
- `governance-admin.forceRemoveNotice`：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/governance-admin.forceRemoveNotice.request.json`

## 临时建议

- `resolveReport.resultAction`：当前建议使用 `record_only / remove_notice / watchlist / restricted_publish / restricted_apply / banned`
- `accountAction.restrictionType`：当前建议使用 `watchlist / restricted_publish / restricted_apply / banned`
- `resolveTask.nextQueueType`：当前建议仅使用 `manual_review_queue`
