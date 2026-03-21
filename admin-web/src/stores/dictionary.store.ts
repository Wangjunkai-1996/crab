import { defineStore } from 'pinia'

import { TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES } from '@/constants/admin-action-payloads'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/ui'
import type { SelectOption } from '@/models/common'

const toOptions = (pairs: Array<[string | number | boolean, string]>): SelectOption[] => pairs.map(([value, label]) => ({ value, label }))

export const useDictionaryStore = defineStore('dictionary', {
  state: () => ({
    reviewTaskStatusOptions: toOptions([
      ['', '全部状态'],
      ['pending', '待领取'],
      ['processing', '处理中'],
      ['completed', '已完成'],
      ['cancelled', '已取消'],
    ]),
    reviewStageOptions: toOptions([
      ['', '全部阶段'],
      ['initial_review', '初审队列'],
      ['manual_review', '人工审核'],
      ['resubmission_review', '补件复审'],
    ]),
    cityOptions: toOptions([
      ['', '全部城市'],
      ['上海', '上海'],
      ['杭州', '杭州'],
      ['深圳', '深圳'],
      ['广州', '广州'],
      ['成都', '成都'],
    ]),
    identityTypeOptions: toOptions([
      ['', '全部身份'],
      ['merchant', '商家'],
      ['company', '企业'],
      ['personal', '个人'],
    ]),
    riskLevelOptions: toOptions([
      ['', '全部风险'],
      ['high', '高风险'],
      ['medium', '中风险'],
      ['low', '低风险'],
    ]),
    reportStatusOptions: toOptions([
      ['', '全部状态'],
      ['pending', '待处理'],
      ['processing', '处理中'],
      ['closed', '已关闭'],
      ['resolved', '已处理'],
    ]),
    reportTargetTypeOptions: toOptions([
      ['', '全部对象'],
      ['notice', '通告'],
      ['publisher', '发布方'],
      ['creator', '达人'],
    ]),
    reportReasonOptions: toOptions([
      ['', '全部原因'],
      ['fake_requirement', '虚假合作需求'],
      ['illegal_content', '违规内容'],
      ['fraud', '诈骗诱导'],
      ['contact_abuse', '联系方式违规'],
    ]),
    reviewReasonOptions: toOptions([
      ['contact_risk', '联系方式异常'],
      ['sensitive_keywords', '敏感词风险'],
      ['incomplete_material', '资料不完整'],
      ['manual_review', '需人工复核'],
      ['fake_requirement', '虚假合作描述'],
    ]),
    restrictionTypeOptions: toOptions([
      [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.WATCHLIST, '观察名单'],
      [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_PUBLISH, '限制发布'],
      [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.RESTRICTED_APPLY, '限制报名'],
      [TEMP_ACCOUNT_ACTION_RESTRICTION_TYPES.BANNED, '全量封禁'],
    ]),
    actionStatusOptions: toOptions([
      ['', '全部状态'],
      ['active', '生效中'],
      ['released', '已解除'],
    ]),
    operatorTypeOptions: toOptions([
      ['', '全部操作者'],
      ['admin', '后台管理员'],
      ['user', '平台用户'],
      ['system', '系统'],
    ]),
    pageSizeOptions: PAGE_SIZE_OPTIONS.map((value) => ({ label: `${value} 条 / 页`, value })),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  }),
  actions: {
    initialize() {
      return undefined
    },
  },
})
