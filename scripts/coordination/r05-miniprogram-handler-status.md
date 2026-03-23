# R05 小程序 handler / contract 状态说明（后端）

## 1. 已固化 contract / sample / real handler

### `notice-bff`

- 查询：`list`、`detail`、`myList`
- 写接口：`createDraft`、`updateDraft`、`submitReview`、`close`
- 条件性写接口：`republish`

### `application-bff`

- 查询：`myList`、`detail`、`publisherList`、`publisherDetail`
- 发布侧动作：`markViewed`、`markContactPending`、`markCommunicating`、`markRejected`、`markCompleted`、`revealCreatorContact`

对应 contract：

- `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/notice-bff.ts`
- `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/miniprogram/application-bff.ts`

对应样例目录：

- `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples`

## 2. 临时口径

- 后台动作请求临时事实源仍保持为：
  - `/Users/gy-vip/Desktop/KK_Crab-backend/cloudfunctions/shared/src/contracts/admin/action-payloads.ts`
  - `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/admin.action-payload-enums.json`
  - `/Users/gy-vip/Desktop/KK_Crab-backend/scripts/coordination/admin-action-payload-suggestions.md`
- `application-bff.submit`、`withdraw` 仍未进入 real handler，本轮未扩大到达人侧写链路。

## 3. 待确认 / 阻塞中的规则

- `preferredView` 默认值仍未拍板，继续允许返回 `null`。
- 非列表场景直跳报名详情仍未拍板，继续按“不可保证直跳”执行。
- `notice-bff.republish` 在正式 contract 中缺少新的 `deadlineAt` 入参；因此当前 real handler 仅能处理“原通告仍具未来 `deadlineAt`”的场景，历史 `expired` 通告若无新截止时间会直接校验失败。
- CloudBase 环境实值、管理员账号与凭证仍未提供，不能宣称真实 smoke 条件已具备。
