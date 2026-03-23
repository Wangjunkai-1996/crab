"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPlatform = formatPlatform;
exports.formatCategory = formatCategory;
exports.formatCooperationType = formatCooperationType;
exports.formatIdentityType = formatIdentityType;
exports.formatSettlementType = formatSettlementType;
exports.formatBudgetRange = formatBudgetRange;
exports.formatContactType = formatContactType;
exports.formatGender = formatGender;
exports.formatFollowerBand = formatFollowerBand;
exports.formatReportReason = formatReportReason;
exports.formatReportTargetType = formatReportTargetType;
exports.formatFeedbackType = formatFeedbackType;
exports.formatPreferredView = formatPreferredView;
exports.formatNoticeStatus = formatNoticeStatus;
exports.formatApplicationStatus = formatApplicationStatus;
exports.formatAccountStatus = formatAccountStatus;
exports.formatCompleteness = formatCompleteness;
exports.formatTimeText = formatTimeText;
const enums_1 = require("../constants/enums");
function findLabel(options, value) {
    return options.find((item) => item.value === value)?.label || value || '未设置';
}
function formatPlatform(value) {
    return findLabel(enums_1.COOPERATION_PLATFORM_OPTIONS, value);
}
function formatCategory(value) {
    return findLabel(enums_1.COOPERATION_CATEGORY_OPTIONS, value);
}
function formatCooperationType(value) {
    return findLabel(enums_1.COOPERATION_TYPE_OPTIONS, value);
}
function formatIdentityType(value) {
    return findLabel(enums_1.IDENTITY_TYPE_OPTIONS, value);
}
function formatSettlementType(value) {
    return findLabel(enums_1.SETTLEMENT_TYPE_OPTIONS, value);
}
function formatBudgetRange(value) {
    return findLabel(enums_1.BUDGET_RANGE_OPTIONS, value);
}
function formatContactType(value) {
    return findLabel(enums_1.CONTACT_TYPE_OPTIONS, value);
}
function formatGender(value) {
    return findLabel(enums_1.GENDER_OPTIONS, value);
}
function formatFollowerBand(value) {
    return findLabel(enums_1.FOLLOWER_BAND_OPTIONS, value);
}
function formatReportReason(value) {
    return findLabel(enums_1.REPORT_REASON_OPTIONS, value);
}
function formatReportTargetType(value) {
    return findLabel(enums_1.REPORT_TARGET_TYPE_OPTIONS, value);
}
function formatFeedbackType(value) {
    return findLabel(enums_1.FEEDBACK_TYPE_OPTIONS, value);
}
function formatPreferredView(value) {
    if (!value) {
        return '未设置';
    }
    return enums_1.PREFERRED_VIEW_LABELS[value];
}
function formatNoticeStatus(value) {
    if (!value) {
        return '状态待确认';
    }
    return enums_1.NOTICE_STATUS_LABELS[value] || value;
}
function formatApplicationStatus(value) {
    if (!value) {
        return '状态待确认';
    }
    return enums_1.APPLICATION_STATUS_LABELS[value] || value;
}
function formatAccountStatus(value) {
    return enums_1.ACCOUNT_STATUS_LABELS[value];
}
function formatCompleteness(value) {
    if (typeof value !== 'number') {
        return '未计算';
    }
    return `资料完整度 ${value}%`;
}
function formatTimeText(value) {
    if (!value) {
        return '';
    }
    return value;
}
