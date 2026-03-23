"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyNoticeForm = createEmptyNoticeForm;
exports.applySettlementDefaults = applySettlementDefaults;
exports.mapNoticeDetailToForm = mapNoticeDetailToForm;
exports.validateNoticeForm = validateNoticeForm;
exports.buildNoticeDraftInput = buildNoticeDraftInput;
const SETTLEMENT_TYPES_WITHOUT_BUDGET = ['barter', 'free_experience'];
const DEFAULT_DEADLINE_OFFSET_DAYS = 7;
function createDefaultDeadline() {
    const date = new Date();
    date.setDate(date.getDate() + DEFAULT_DEADLINE_OFFSET_DAYS);
    return date.toISOString().slice(0, 10);
}
function createEmptyNoticeForm() {
    return {
        title: '',
        brandName: '',
        cooperationPlatform: '',
        cooperationCategory: '',
        cooperationType: '',
        city: '',
        settlementType: '',
        budgetRange: '',
        recruitCount: '',
        deadlineAt: createDefaultDeadline(),
        creatorRequirements: '',
        cooperationDescription: '',
        attachments: [],
    };
}
function applySettlementDefaults(form) {
    if (SETTLEMENT_TYPES_WITHOUT_BUDGET.includes(form.settlementType)) {
        return {
            ...form,
            budgetRange: 'not_applicable',
        };
    }
    return form;
}
function mapNoticeDetailToForm(notice) {
    const form = createEmptyNoticeForm();
    if (!notice) {
        return form;
    }
    return applySettlementDefaults({
        ...form,
        title: notice.title || '',
        brandName: notice.brandName || '',
        cooperationPlatform: notice.cooperationPlatform || '',
        cooperationCategory: notice.cooperationCategory || '',
        cooperationType: notice.cooperationType || '',
        city: notice.city || '',
        settlementType: notice.settlementType || '',
        budgetRange: notice.budgetRange || '',
        recruitCount: typeof notice.recruitCount === 'number' ? `${notice.recruitCount}` : '',
        deadlineAt: notice.deadlineAt ? `${notice.deadlineAt}`.slice(0, 10) : form.deadlineAt,
        creatorRequirements: notice.creatorRequirements || '',
        cooperationDescription: notice.cooperationDescription || '',
        attachments: notice.attachments || [],
    });
}
function validateNoticeForm(form) {
    const errors = {};
    const recruitCount = `${form.recruitCount || ''}`.trim();
    if (!form.title.trim()) {
        errors.title = '请填写通告标题';
    }
    else if (form.title.trim().length > 28) {
        errors.title = '标题最多 28 字';
    }
    if (form.brandName.trim().length > 20) {
        errors.brandName = '品牌或门店名称最多 20 字';
    }
    if (!form.cooperationPlatform) {
        errors.cooperationPlatform = '请选择合作平台';
    }
    if (!form.cooperationCategory) {
        errors.cooperationCategory = '请选择合作领域';
    }
    if (!form.cooperationType) {
        errors.cooperationType = '请选择合作形式';
    }
    if (!form.city.trim()) {
        errors.city = '请填写所在城市';
    }
    if (!form.settlementType) {
        errors.settlementType = '请选择结算方式';
    }
    if (!SETTLEMENT_TYPES_WITHOUT_BUDGET.includes(form.settlementType) && !form.budgetRange) {
        errors.budgetRange = '请选择预算区间';
    }
    if (recruitCount) {
        if (!/^\d+$/.test(recruitCount)) {
            errors.recruitCount = '招募人数需为正整数';
        }
        else if (Number(recruitCount) <= 0) {
            errors.recruitCount = '招募人数需大于 0';
        }
    }
    if (!form.deadlineAt) {
        errors.deadlineAt = '请选择截止日期';
    }
    if (!form.creatorRequirements.trim()) {
        errors.creatorRequirements = '请填写达人要求';
    }
    else if (form.creatorRequirements.trim().length > 200) {
        errors.creatorRequirements = '达人要求最多 200 字';
    }
    if (!form.cooperationDescription.trim()) {
        errors.cooperationDescription = '请填写合作说明';
    }
    else if (form.cooperationDescription.trim().length > 500) {
        errors.cooperationDescription = '合作说明最多 500 字';
    }
    if ((form.attachments || []).length > 6) {
        errors.attachments = '补充图片最多 6 张';
    }
    return errors;
}
function buildNoticeDraftInput(form) {
    const normalized = applySettlementDefaults(form);
    const recruitCount = `${normalized.recruitCount || ''}`.trim();
    return {
        title: normalized.title.trim() || undefined,
        brandName: normalized.brandName.trim() || undefined,
        cooperationPlatform: normalized.cooperationPlatform || undefined,
        cooperationCategory: normalized.cooperationCategory || undefined,
        cooperationType: normalized.cooperationType || undefined,
        city: normalized.city.trim() || undefined,
        settlementType: normalized.settlementType || undefined,
        budgetRange: normalized.budgetRange || undefined,
        recruitCount: recruitCount ? Number(recruitCount) : null,
        deadlineAt: normalized.deadlineAt || undefined,
        creatorRequirements: normalized.creatorRequirements.trim() || undefined,
        cooperationDescription: normalized.cooperationDescription.trim() || undefined,
        attachments: normalized.attachments || [],
    };
}
