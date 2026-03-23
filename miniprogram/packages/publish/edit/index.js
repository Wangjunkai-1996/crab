"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../../constants/enums");
const notice_service_1 = require("../../../services/notice.service");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const notice_form_1 = require("../../../utils/notice-form");
const page_state_1 = require("../../../utils/page-state");
const request_1 = require("../../../utils/request");
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
        pageState: page_state_1.PAGE_STATUS.loading,
        errorText: '',
        noticeId: '',
        currentStatusText: '',
        infoCopy: '',
        savingDraft: false,
        primaryLoading: false,
        primaryDisabled: true,
        noticeForm: (0, notice_form_1.mapNoticeDetailToForm)(),
        noticeErrors: {},
        summaryPills: [],
        platformOptions: enums_1.COOPERATION_PLATFORM_OPTIONS,
        categoryOptions: enums_1.COOPERATION_CATEGORY_OPTIONS,
        cooperationTypeOptions: enums_1.COOPERATION_TYPE_OPTIONS,
        settlementTypeOptions: enums_1.SETTLEMENT_TYPE_OPTIONS,
        budgetRangeOptions: enums_1.BUDGET_RANGE_OPTIONS,
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            noticeId: query.noticeId || '',
        });
        this.loadPage();
    },
    applyDerivedState(partial = {}) {
        const noticeForm = (0, notice_form_1.applySettlementDefaults)(partial.noticeForm || this.data.noticeForm);
        const noticeReady = Object.keys((0, notice_form_1.validateNoticeForm)(noticeForm)).length === 0;
        this.setData({
            ...partial,
            noticeForm,
            primaryDisabled: !noticeReady,
            summaryPills: [
                { label: (0, formatter_1.formatPlatform)(noticeForm.cooperationPlatform), active: !!noticeForm.cooperationPlatform },
                { label: (0, formatter_1.formatCategory)(noticeForm.cooperationCategory), active: !!noticeForm.cooperationCategory },
                { label: (0, formatter_1.formatCooperationType)(noticeForm.cooperationType), active: !!noticeForm.cooperationType },
                { label: (0, formatter_1.formatSettlementType)(noticeForm.settlementType), active: !!noticeForm.settlementType },
                { label: (0, formatter_1.formatBudgetRange)(noticeForm.budgetRange), active: !!noticeForm.budgetRange },
            ],
        });
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, notice_service_1.detail)(this.data.noticeId);
            this.applyDerivedState({
                pageState: page_state_1.PAGE_STATUS.ready,
                noticeForm: (0, notice_form_1.mapNoticeDetailToForm)(result.notice),
                currentStatusText: (0, formatter_1.formatNoticeStatus)(result.notice.statusTag),
                infoCopy: result.notice.statusTag === 'rejected' || result.notice.statusTag === 'supplement_required'
                    ? '本次修改后可重新提交审核，历史驳回原因以后端最新结果为准。'
                    : '编辑页保存后不会直接改线上展示；重新提交审核通过后才会再次进入广场。',
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '编辑页加载失败',
            });
        }
    },
    onNoticeInput(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = event.detail.value;
        this.applyDerivedState({
            noticeForm: {
                ...this.data.noticeForm,
                [field]: value,
            },
            noticeErrors: clearError(this.data.noticeErrors, field),
        });
    },
    onPickNoticeOption(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = `${event.currentTarget.dataset.value || ''}`;
        const nextNoticeForm = {
            ...this.data.noticeForm,
            [field]: value,
        };
        if (field === 'settlementType' && ['barter', 'free_experience'].includes(value)) {
            nextNoticeForm.budgetRange = 'not_applicable';
        }
        this.applyDerivedState({
            noticeForm: nextNoticeForm,
            noticeErrors: clearError(clearError(this.data.noticeErrors, field), 'budgetRange'),
        });
    },
    onDeadlineChange(event) {
        this.applyDerivedState({
            noticeForm: {
                ...this.data.noticeForm,
                deadlineAt: event.detail.value,
            },
            noticeErrors: clearError(this.data.noticeErrors, 'deadlineAt'),
        });
    },
    onAttachmentsChange(event) {
        this.applyDerivedState({
            noticeForm: {
                ...this.data.noticeForm,
                attachments: event.detail.files || [],
            },
            noticeErrors: clearError(this.data.noticeErrors, 'attachments'),
        });
    },
    async saveDraft() {
        this.setData({
            savingDraft: true,
        });
        try {
            await (0, notice_service_1.updateDraft)(this.data.noticeId, (0, notice_form_1.buildNoticeDraftInput)(this.data.noticeForm));
            this.setData({
                noticeErrors: {},
            });
            wx.showToast({
                title: '修改已保存',
                icon: 'success',
            });
        }
        catch (error) {
            if (error instanceof request_1.RequestError) {
                this.setData({
                    noticeErrors: error.fieldErrors || {},
                });
            }
            wx.showToast({
                title: error instanceof Error ? error.message : '保存失败',
                icon: 'none',
            });
        }
        finally {
            this.setData({
                savingDraft: false,
            });
        }
    },
    async onPrimaryAction() {
        const noticeErrors = (0, notice_form_1.validateNoticeForm)(this.data.noticeForm);
        if (Object.keys(noticeErrors).length) {
            this.setData({
                noticeErrors,
            });
            wx.showToast({
                title: '请先补齐通告必填项',
                icon: 'none',
            });
            return;
        }
        this.setData({
            primaryLoading: true,
        });
        try {
            await (0, notice_service_1.updateDraft)(this.data.noticeId, (0, notice_form_1.buildNoticeDraftInput)(this.data.noticeForm));
            await (0, notice_service_1.submitReview)(this.data.noticeId);
            wx.navigateTo({
                url: `/packages/publish/success/index?noticeId=${this.data.noticeId}`,
            });
        }
        catch (error) {
            if (error instanceof request_1.RequestError) {
                this.setData({
                    noticeErrors: error.fieldErrors || {},
                });
            }
            wx.showToast({
                title: error instanceof Error ? error.message : '提交失败',
                icon: 'none',
            });
        }
        finally {
            this.setData({
                primaryLoading: false,
            });
        }
    },
    async onSecondaryAction() {
        await this.saveDraft();
    },
});
