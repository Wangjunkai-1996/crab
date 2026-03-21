import {
  ACCOUNT_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  BUDGET_RANGE_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  COOPERATION_CATEGORY_OPTIONS,
  COOPERATION_PLATFORM_OPTIONS,
  COOPERATION_TYPE_OPTIONS,
  FEEDBACK_TYPE_OPTIONS,
  FOLLOWER_BAND_OPTIONS,
  GENDER_OPTIONS,
  IDENTITY_TYPE_OPTIONS,
  NOTICE_STATUS_LABELS,
  PREFERRED_VIEW_LABELS,
  REPORT_REASON_OPTIONS,
  REPORT_TARGET_TYPE_OPTIONS,
  SETTLEMENT_TYPE_OPTIONS,
  type NullablePreferredView,
} from '../constants/enums';

function findLabel(options: Array<{ label: string; value: string }>, value?: string) {
  return options.find((item) => item.value === value)?.label || value || '未设置';
}

export function formatPlatform(value?: string) {
  return findLabel(COOPERATION_PLATFORM_OPTIONS, value);
}

export function formatCategory(value?: string) {
  return findLabel(COOPERATION_CATEGORY_OPTIONS, value);
}

export function formatCooperationType(value?: string) {
  return findLabel(COOPERATION_TYPE_OPTIONS, value);
}

export function formatIdentityType(value?: string) {
  return findLabel(IDENTITY_TYPE_OPTIONS, value);
}

export function formatSettlementType(value?: string) {
  return findLabel(SETTLEMENT_TYPE_OPTIONS, value);
}

export function formatBudgetRange(value?: string) {
  return findLabel(BUDGET_RANGE_OPTIONS, value);
}

export function formatContactType(value?: string) {
  return findLabel(CONTACT_TYPE_OPTIONS, value);
}

export function formatGender(value?: string) {
  return findLabel(GENDER_OPTIONS, value);
}

export function formatFollowerBand(value?: string) {
  return findLabel(FOLLOWER_BAND_OPTIONS, value);
}

export function formatReportReason(value?: string) {
  return findLabel(REPORT_REASON_OPTIONS, value);
}

export function formatReportTargetType(value?: string) {
  return findLabel(REPORT_TARGET_TYPE_OPTIONS, value);
}

export function formatFeedbackType(value?: string) {
  return findLabel(FEEDBACK_TYPE_OPTIONS, value);
}

export function formatPreferredView(value?: NullablePreferredView) {
  if (!value) {
    return '未设置';
  }

  return PREFERRED_VIEW_LABELS[value];
}

export function formatNoticeStatus(value?: string) {
  if (!value) {
    return '状态待确认';
  }

  return NOTICE_STATUS_LABELS[value as keyof typeof NOTICE_STATUS_LABELS] || value;
}

export function formatApplicationStatus(value?: string) {
  if (!value) {
    return '状态待确认';
  }

  return APPLICATION_STATUS_LABELS[value as keyof typeof APPLICATION_STATUS_LABELS] || value;
}

export function formatAccountStatus(value: keyof typeof ACCOUNT_STATUS_LABELS) {
  return ACCOUNT_STATUS_LABELS[value];
}

export function formatCompleteness(value?: number) {
  if (typeof value !== 'number') {
    return '未计算';
  }

  return `资料完整度 ${value}%`;
}

export function formatTimeText(value?: string) {
  if (!value) {
    return '';
  }

  return value;
}
