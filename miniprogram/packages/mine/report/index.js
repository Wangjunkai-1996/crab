"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../../constants/enums");
const routes_1 = require("../../../constants/routes");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const report_service_1 = require("../../../services/report.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const request_1 = require("../../../utils/request");
const EMPTY_REPORT_FORM = {
    targetType: '',
    targetId: '',
    targetSummary: '',
    reasonCode: '',
    description: '',
    evidenceImages: [],
};
function validateReportForm(form) {
    const errors = {};
    if (!form.targetType) {
        errors.targetType = '请选择举报对象类型';
    }
    if (!form.targetSummary.trim()) {
        errors.targetSummary = '请填写举报对象摘要';
    }
    if (!form.reasonCode) {
        errors.reasonCode = '请选择举报原因';
    }
    if (form.description.trim().length > 200) {
        errors.description = '补充说明最多 200 字';
    }
    if ((form.evidenceImages || []).length > 6) {
        errors.evidenceImages = '举报证据最多 6 张';
    }
    return errors;
}
function clearError(errors, field) {
    if (!errors[field]) {
        return errors;
    }
    const nextErrors = {
        ...errors,
    };
    delete nextErrors[field];
    return nextErrors;
}
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        submitting: false,
        submitted: false,
        reportId: '',
        primaryDisabled: true,
        form: EMPTY_REPORT_FORM,
        fieldErrors: {},
        targetTypeOptions: enums_1.REPORT_TARGET_TYPE_OPTIONS,
        reasonOptions: enums_1.REPORT_REASON_OPTIONS,
        summaryPills: [],
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
        });
        this.applyDerivedState({
            form: {
                ...EMPTY_REPORT_FORM,
                targetType: query.targetType || '',
                targetId: query.targetId || '',
                targetSummary: query.targetTitle || query.targetSummary || '',
            },
        });
    },
    applyDerivedState(partial = {}) {
        const form = partial.form || this.data.form;
        const ready = Object.keys(validateReportForm(form)).length === 0;
        this.setData({
            ...partial,
            form,
            primaryDisabled: !ready,
            summaryPills: [
                { label: (0, formatter_1.formatReportTargetType)(form.targetType), active: !!form.targetType },
                { label: (0, formatter_1.formatReportReason)(form.reasonCode), active: !!form.reasonCode },
                { label: `${form.evidenceImages.length} 张证据`, active: form.evidenceImages.length > 0 },
            ],
        });
    },
    onFieldInput(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = event.detail.value;
        this.applyDerivedState({
            form: {
                ...this.data.form,
                [field]: value,
            },
            fieldErrors: clearError(this.data.fieldErrors, field),
        });
    },
    onPickOption(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = `${event.currentTarget.dataset.value || ''}`;
        this.applyDerivedState({
            form: {
                ...this.data.form,
                [field]: value,
            },
            fieldErrors: clearError(this.data.fieldErrors, field),
        });
    },
    onEvidenceChange(event) {
        this.applyDerivedState({
            form: {
                ...this.data.form,
                evidenceImages: event.detail.files || [],
            },
            fieldErrors: clearError(this.data.fieldErrors, 'evidenceImages'),
        });
    },
    async onPrimaryAction() {
        if (this.data.submitted) {
            wx.navigateTo({
                url: routes_1.ROUTES.mineReportRecords,
            });
            return;
        }
        const fieldErrors = validateReportForm(this.data.form);
        if (Object.keys(fieldErrors).length) {
            this.setData({
                fieldErrors,
            });
            wx.showToast({
                title: '请先补齐举报必填项',
                icon: 'none',
            });
            return;
        }
        this.setData({
            submitting: true,
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, report_service_1.submit)({
                targetType: this.data.form.targetType,
                targetId: this.data.form.targetId || undefined,
                targetSummary: this.data.form.targetSummary.trim(),
                reasonCode: this.data.form.reasonCode,
                description: this.data.form.description.trim() || undefined,
                evidenceImages: this.data.form.evidenceImages,
            });
            this.setData({
                submitted: true,
                reportId: result.reportId,
                fieldErrors: {},
            });
        }
        catch (error) {
            if (error instanceof request_1.RequestError) {
                this.setData({
                    fieldErrors: error.fieldErrors || {},
                });
            }
            wx.showToast({
                title: error instanceof Error ? error.message : '提交举报失败',
                icon: 'none',
            });
        }
        finally {
            this.setData({
                submitting: false,
            });
        }
    },
    onSecondaryAction() {
        if (this.data.submitted) {
            wx.navigateBack({
                delta: 1,
            });
            return;
        }
        this.applyDerivedState({
            form: {
                ...EMPTY_REPORT_FORM,
                targetType: this.data.form.targetType,
                targetId: this.data.form.targetId,
                targetSummary: this.data.form.targetSummary,
            },
            fieldErrors: {},
        });
    },
});
