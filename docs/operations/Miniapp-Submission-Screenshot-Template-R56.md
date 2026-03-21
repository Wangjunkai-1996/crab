# 多米通告提审截图模板（R56）

## 1. 目标

先把提审截图的图位、命名规则、验收标准和回填目录定死；当前不要求立刻产出最终截图。

## 2. 截图位

| 编号 | 页面位 | 目标内容 | 验收标准 | 未来回填目录 |
| --- | --- | --- | --- | --- |
| 01 | 广场首页 | 主列表、顶部信息、底部 Tab | 页面完整可见，无开发态标识、无遮挡 | `miniprogram/evidence/r56/screenshots/01-plaza-home.png` |
| 02 | 通告详情 | 标题、合作信息、底部主要动作 | 详情关键信息完整，可看清主 CTA | `miniprogram/evidence/r56/screenshots/02-notice-detail.png` |
| 03 | 发布页 | 发布表单主结构 | 页面结构完整，表单区可读 | `miniprogram/evidence/r56/screenshots/03-publish-form.png` |
| 04 | 报名页/资料页 | 报名或达人资料填写主区 | 能体现报名闭环，不出现调试残留 | `miniprogram/evidence/r56/screenshots/04-application-or-profile.png` |
| 05 | 我的通告/我的报名 | 个人侧记录页 | 列表结构清晰，能体现“我的”闭环 | `miniprogram/evidence/r56/screenshots/05-mine-records.png` |
| 06 | 规则说明页 | 协议/规则/说明入口页 | 文案清晰、可证明有规则说明 | `miniprogram/evidence/r56/screenshots/06-rules-page.png` |

## 3. 命名规则

1. 统一使用两位序号前缀。
2. 文件名使用英文短语，避免空格与中文标点。
3. 若同一图位重拍，使用 `-v2`、`-v3` 递增，不覆盖旧图。

## 4. 验收标准

1. 截图必须来自未来恢复后的真实路径，不接受纯设计稿替代。
2. 不出现开发工具边框、console、调试按钮、明显 mock 标识。
3. 关键信息不裁切，页面元素不被弹层遮挡。
4. 若某页面暂时没有真实内容，可使用稳定空态，但必须与页面职责一致。

## 5. 当前不做

1. 当前不要求用户立刻出图。
2. 当前不为了凑截图重新开启真实 smoke。
3. 当前不新增前台 debug UI 作为截图入口。
