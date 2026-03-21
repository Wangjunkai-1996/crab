# 多米通告上线执行版倒排清单（R55）

## 1. 当前阶段结论

- `R54` 已完成：小程序真实 smoke 的 helper、预检脚本、样本核查脚本、runbook、证据目录全部就绪。
- 从 `R55` 起，不再把用户本人作为 DevTools / console 人肉执行端。
- 小程序真实 `cloud` smoke 仍是上线前必要项，但当前降级为“恢复项”，不再阻塞今晚自动推进。
- `R55` 当前主线改为：资料包、owner 台账、发布 / 回滚 / 值守 runbook。

## 2. R55 自动推进范围

| 事项 | owner | 输入物 | 完成定义 | 依赖人工 | 阻塞上线 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 冻结立即人工 smoke 主线 | 总控 | `board.md`、`decisions.md`、`meetings/R55.md` | 控制面不再把“现在去跑 DevTools”当作当前任务 | 否 | 否 | 已完成 |
| 固化上线执行版倒排 | 总控 + 产品经理 | 本文档 | 提审资料、owner、发布链路进入统一台账 | 否 | 是 | 已完成 |
| 固化提审资料包 | 总控 + 产品经理 | `Miniapp-Submission-Materials-Pack-R55.md` | 所有资料项都有来源、owner、完成定义 | 否 | 是 | 已完成 |
| 固化上线日 runbook | 总控 + 阻塞协调 | `Miniapp-Launch-Day-Runbook-R55.md` | 发布、回滚、值守、证据留存路径明确 | 否 | 是 | 已完成 |
| 维持小程序恢复 ready | 前端 + 后端 | `R54` helper / runbook / sample scripts | 未来恢复时无需重新设计方案 | 否 | 是 | 已完成 |
| 维持后台治理域稳定 | 后台 + 后端 | `r52` / `r54` 证据与 smoke | 治理域不回退成主阻塞 | 否 | 否 | 进行中 |

## 3. 提审资料与来源台账

| 资料项 | 来源文档 | owner | 完成定义 | 当前状态 |
| --- | --- | --- | --- | --- |
| 小程序名称 / 简介 / 审核备注 | `Brand-And-Audit-Copy-V1.md` | 产品经理 | 形成可直接提交的平台文案终稿 | 已有草案，待终稿 |
| 用户协议 | `User-Agreement-Draft-V1.md` | 产品经理 + 阻塞协调 | 补齐主体、邮箱、客服、法院辖区并完成发布版审校 | 待补主体信息 |
| 隐私政策 | `Privacy-Policy-Draft-V1.md` | 产品经理 + 阻塞协调 | 补齐主体、邮箱、客服与最终采集口径 | 待补主体信息 |
| 平台规则 / 审核说明 | `Platform-Rules-Draft-V1.md`、`Moderation-SOP-V1.md` | 产品经理 | 形成可公示的发布规范与审核说明 | 待收口 |
| 首批通告模板 | `Seed-Notice-Templates-V1.md` | 产品经理 | 可供冷启动内容直接使用 | 已有模板，待 owner |
| 提审截图清单 | `Miniapp-Launch-Checklist-V1.md` | 前端 + 体验设计审查 | 明确 6 张必备图位与验收标准 | 待真实 smoke 恢复后补图 |

## 4. 发布 / 回滚 / 值守 owner 台账

| 事项 | 当前 owner | 缺什么 | 补完算什么 | 是否阻塞上线 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| 发布 owner | 待老板指派 | 具体负责人 + 发布时间窗 | 有人能执行正式发布并留痕 | 是 | 待补 |
| 回滚 owner | 待老板指派 | 具体负责人 + 回滚入口 | 故障时 15 分钟内可回退 | 是 | 待补 |
| 值守 owner | 待老板指派 | 首日值守排班 | 上线后 24 小时有人盯问题 | 是 | 待补 |
| 合规文案 owner | 产品经理 / 阻塞协调 | 主体、客服、邮箱、法务口径 | 协议与隐私政策可正式挂出 | 是 | 待补 |
| 提审资料 owner | 产品经理 | 最终提交人 + 提交窗口 | 提审包可一次性交付 | 是 | 待补 |

## 5. 未来恢复项（当前不要求执行）

以下动作保留为未来恢复项，不再要求用户现在就做：

1. 在微信开发者工具导入真实 `AppID` 工程
2. 执行 `build-miniprogram-js.mjs`
3. 执行 `check-devtools-readiness.mjs`
4. console 执行 `runtimeDebug.useCloud()`
5. console 执行 `devSmoke.runFirstBatch()`
6. 将结果回填到 `miniprogram/evidence/r54/`

恢复时统一按 `/Users/gy-vip/Desktop/KK_Crab/docs/engineering/MiniProgram-Real-Smoke-Runbook-R54.md` 执行，不再重新口头讲解。

## 6. 当前第一风险

1. 小程序真实 `cloud` 证据尚未形成，但当前已从“立即执行项”降为“恢复项”。
2. 正式主体、客服、邮箱、法院辖区与发布 / 回滚 / 值守 owner 仍未落定。
3. 提审截图仍需在未来恢复真实 smoke 后补最终版。

## 7. R55 完成判定

满足以下条件，即可判定 `R55` 自动阶段完成：

1. 控制面已全部切换到“冻结立即人工 smoke、继续自动推进”的口径。
2. 上线执行版倒排、提审资料包、上线日 runbook 已全部入仓。
3. `.autonomous/r55-launch-readiness/` 已落地，换电脑后可继续推进。
4. `.control-state/current/` 已同步到最新事实。
