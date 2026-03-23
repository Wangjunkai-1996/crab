# R04 小程序 contract / sample 状态说明（后端）

## 1. 本轮已固化

以下接口已补齐 TypeScript contract 与 JSON sample，可作为前端 / 后台联调口径：

- `notice-bff.myList`
- `application-bff.publisherList`
- `application-bff.publisherDetail`

对应 contract：

- `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/notice-bff.ts`
- `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/application-bff.ts`

对应 sample：

- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/notice-bff.myList.request.json`
- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/notice-bff.myList.response.json`
- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.publisherList.request.json`
- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.publisherList.response.json`
- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.publisherDetail.request.json`
- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/application-bff.publisherDetail.response.json`

## 2. 当前 real handler 边界

已接入真实查询链路：

- `notice-bff.list`
- `notice-bff.detail`
- `notice-bff.myList`
- `application-bff.myList`
- `application-bff.detail`
- `application-bff.publisherList`
- `application-bff.publisherDetail`

说明：

- 上述接口已从数据库真实读取并按共享 contract 返回。
- `notice-bff.createDraft/updateDraft/submitReview/close/republish` 仍为未实现占位。
- `application-bff.submit/withdraw/markViewed/markContactPending/markCommunicating/markRejected/markCompleted/revealCreatorContact` 仍为未实现占位。

## 3. 临时口径

- 后台动作请求临时事实源仍以以下三处为单点口径，未升级为正式共享 contract：
  - `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/admin/action-payloads.ts`
  - `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/admin.action-payload-enums.json`
  - `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/coordination/admin-action-payload-suggestions.md`
- `application-bff.publisherDetail.availableActions` 当前仅覆盖发布侧报名管理页已落地动作 key；若产品后续拍板新增动作，以共享 contract 增量扩展，不由页面自行派生。

## 4. 仍待拍板

- `preferredView` 默认值未锁定，仍允许返回 `null`。
- 非列表场景是否支持直跳单条报名详情，仍按已拍板策略保持“不可保证”。
- CloudBase 数据库 / 存储正式规则下发语法与环境实值仍待环境侧提供，当前不能宣称真实 smoke 条件已具备。
