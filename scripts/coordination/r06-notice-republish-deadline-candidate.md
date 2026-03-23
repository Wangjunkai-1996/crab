# R06 `notice-bff.republish.deadlineAt` contract 候选方案（后端）

> 状态：候选方案（推荐）
> 说明：以下内容仅供产品 / 总控拍板前评估，不是当前已拍板正式 contract。

## 推荐候选

### 请求入参

在现有 `payload.noticeId` 基础上，新增：

- `payload.deadlineAt: string`
  - 类型：ISO datetime
  - 场景：当原通告已 `expired` 或原 `deadlineAt` 已无效时必填
  - 校验：必须为未来时间

### 推荐规则

1. `status = closed` 且原 `deadlineAt` 仍为未来时间：`deadlineAt` 可选，默认沿用原值。
2. `status = expired` 或原 `deadlineAt` 已过期：`deadlineAt` 必填，否则返回校验错误。
3. 其余规则保持不变：重新发布后状态回到 `pending_review`，`reviewRoundCount += 1`，并新建审核任务。

## 候选 sample

- 请求 sample：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/notice-bff.republish.candidate-deadlineAt.request.json`
- 返回 sample：`/Users/gy-vip/Desktop/KK_Crab-backend/scripts/api-samples/notice-bff.republish.candidate-deadlineAt.response.json`

## 为什么推荐这个候选

- 不改变当前 `closed + 未来 deadlineAt` 的已实现最小链路。
- 能显式覆盖 `expired` 通告补新截止时间的真实业务缺口。
- 对前端表单与后端校验都更直接，避免把“补新截止时间”藏成隐式规则。

## 当前实现边界

- 在产品拍板并升级正式 contract 前，当前 real handler 仍只支持“原通告仍具未来 `deadlineAt`”场景。
- 本文件与配套 sample 仅作为候选，不代表当前线上 / 联调既定事实。
