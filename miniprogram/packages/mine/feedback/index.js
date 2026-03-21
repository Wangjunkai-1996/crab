"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../../constants/enums");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const feedback_service_1 = require("../../../services/feedback.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const request_1 = require("../../../utils/request");
const EMPTY_FEEDBACK_FORM = {
    feedbackType: '',
    content: '',
    screenshots: [],
    contact: '',
};
function validateFeedbackForm(form) {
    const errors = {};
    if (!form.feedbackType) {
        errors.feedbackType = '请选择反馈类型';
    }
    if (!form.content.trim()) {
        errors.content = '请填写问题描述';
    }
    else if (form.content.trim().length > 300) {
        errors.content = '问题描述最多 300 字';
    }
    if ((form.screenshots || []).length > 4) {
        errors.screenshots = '截图最多 4 张';
    }
    if (form.contact.trim().length > 40) {
        errors.contact = '联系方式最多 40 字';
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
        feedbackId: '',
        primaryDisabled: true,
        form: EMPTY_FEEDBACK_FORM,
        fieldErrors: {},
        feedbackTypeOptions: enums_1.FEEDBACK_TYPE_OPTIONS,
        summaryPills: [],
    },
    onLoad() {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
        });
        this.applyDerivedState({
            form: EMPTY_FEEDBACK_FORM,
        });
    },
    applyDerivedState(partial = {}) {
        const form = partial.form || this.data.form;
        const ready = Object.keys(validateFeedbackForm(form)).length === 0;
        this.setData({
            ...partial,
            form,
            primaryDisabled: !ready,
            summaryPills: [
                { label: (0, formatter_1.formatFeedbackType)(form.feedbackType), active: !!form.feedbackType },
                { label: `${form.screenshots.length} 张截图`, active: form.screenshots.length > 0 },
                { label: form.contact?.trim() ? '已留联系方式' : '未留联系方式', active: !!form.contact?.trim() },
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
        const value = `${event.currentTarget.dataset.value || ''}`;
        this.applyDerivedState({
            form: {
                ...this.data.form,
                feedbackType: value,
            },
            fieldErrors: clearError(this.data.fieldErrors, 'feedbackType'),
        });
    },
    onScreenshotChange(event) {
        this.applyDerivedState({
            form: {
                ...this.data.form,
                screenshots: event.detail.files || [],
            },
            fieldErrors: clearError(this.data.fieldErrors, 'screenshots'),
        });
    },
    async onPrimaryAction() {
        if (this.data.submitted) {
            wx.navigateBack({
                delta: 1,
            });
            return;
        }
        const fieldErrors = validateFeedbackForm(this.data.form);
        if (Object.keys(fieldErrors).length) {
            this.setData({
                fieldErrors,
            });
            wx.showToast({
                title: '请先补齐反馈必填项',
                icon: 'none',
            });
            return;
        }
        this.setData({
            submitting: true,
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, feedback_service_1.submit)({
                feedbackType: this.data.form.feedbackType,
                content: this.data.form.content.trim(),
                screenshots: this.data.form.screenshots,
                contact: this.data.form.contact.trim() || undefined,
            });
            this.setData({
                submitted: true,
                feedbackId: result.feedbackId,
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
                title: error instanceof Error ? error.message : '提交反馈失败',
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
            this.setData({
                submitted: false,
                feedbackId: '',
            });
        }
        this.applyDerivedState({
            form: EMPTY_FEEDBACK_FORM,
            fieldErrors: {},
        });
    },
});
