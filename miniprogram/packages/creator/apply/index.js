"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../../constants/routes");
const application_service_1 = require("../../../services/application.service");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const creator_service_1 = require("../../../services/creator.service");
const notice_service_1 = require("../../../services/notice.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
const router_1 = require("../../../utils/router");
const request_1 = require("../../../utils/request");
const EMPTY_APPLICATION_FORM = {
    selfIntroduction: '',
    deliverablePlan: '',
    expectedTerms: '',
    portfolioImages: [],
};
function buildApplyPayload(noticeId, form, card) {
    return {
        noticeId,
        selfIntroduction: form.selfIntroduction.trim(),
        deliverablePlan: form.deliverablePlan.trim(),
        expectedTerms: form.expectedTerms.trim() || undefined,
        portfolioImages: form.portfolioImages || [],
        contactType: card?.contactType,
        contactValue: card?.contactValue,
    };
}
function buildInitialForm(card) {
    return {
        selfIntroduction: '我擅长门店探店与本地生活内容，支持图文或短视频交付。',
        deliverablePlan: '默认交付 1 篇图文，可根据沟通补充 1 条短视频。',
        expectedTerms: '希望支持工作日下午到店拍摄，发布前可配合一次修改。',
        portfolioImages: card?.portfolioImages?.slice(0, 3) || [],
    };
}
function validateApplicationForm(form) {
    const errors = {};
    if (!form.selfIntroduction.trim()) {
        errors.selfIntroduction = '请填写自我介绍';
    }
    else if (form.selfIntroduction.trim().length > 200) {
        errors.selfIntroduction = '自我介绍最多 200 字';
    }
    if (!form.deliverablePlan.trim()) {
        errors.deliverablePlan = '请填写可交付计划';
    }
    else if (form.deliverablePlan.trim().length > 200) {
        errors.deliverablePlan = '可交付计划最多 200 字';
    }
    if (form.expectedTerms.trim().length > 120) {
        errors.expectedTerms = '期望条件最多 120 字';
    }
    if ((form.portfolioImages || []).length > 3) {
        errors.portfolioImages = '案例截图最多 3 张';
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
function buildCreatorItems(card, missingFieldKeys = []) {
    const missingSet = new Set(missingFieldKeys);
    return [
        {
            label: '昵称',
            value: card?.nickname || '待补充',
            required: true,
            error: missingSet.has('nickname') ? '请先补齐昵称' : '',
        },
        {
            label: '擅长平台',
            value: card?.primaryPlatform ? (0, formatter_1.formatPlatform)(card.primaryPlatform) : '待补充',
            required: true,
            error: missingSet.has('primaryPlatform') ? '请先补齐擅长平台' : '',
        },
        {
            label: '擅长领域',
            value: card?.primaryCategory ? (0, formatter_1.formatCategory)(card.primaryCategory) : '待补充',
            required: true,
            error: missingSet.has('primaryCategory') ? '请先补齐擅长领域' : '',
        },
        {
            label: '联系方式',
            value: card?.contactType && card?.contactValue ? `${(0, formatter_1.formatContactType)(card.contactType)} · ${card.contactValue}` : '待补充',
            required: true,
            hint: '报名联系方式默认沿用达人名片快照',
            error: missingSet.has('contactValue') ? '请先补齐联系方式' : '',
        },
    ];
}
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        noticeId: '',
        errorText: '',
        submitting: false,
        submitSuccess: false,
        isFirstCreate: false,
        ctaAction: 'apply',
        primaryText: '确认提交报名',
        secondaryText: '返回通告',
        primaryDisabled: false,
        helperText: '',
        successTitle: '报名已提交',
        successCopy: '后续查看、待联系、已沟通等进展会在我的报名与消息中心同步。',
        completenessText: '',
        noticeSummary: null,
        creatorItems: [],
        applicationForm: EMPTY_APPLICATION_FORM,
        fieldErrors: {},
        creatorContactText: '',
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            noticeId: query.noticeId || 'notice-001',
        });
        this.loadPage();
    },
    applyDerivedState(partial = {}) {
        const applicationForm = partial.applicationForm || this.data.applicationForm;
        const ctaAction = `${partial.ctaAction || this.data.ctaAction}`;
        const ready = Object.keys(validateApplicationForm(applicationForm)).length === 0;
        this.setData({
            ...partial,
            applicationForm,
            primaryDisabled: ctaAction === 'disabled' ? true : ctaAction === 'apply' ? !ready : false,
        });
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const [noticeResult, creatorResult] = await Promise.all([(0, notice_service_1.detail)(this.data.noticeId), (0, creator_service_1.getCard)()]);
            const card = creatorResult.creatorCard;
            const isFirstCreate = !card;
            const ctaAction = noticeResult.ctaState.primaryAction;
            const primaryTextMap = {
                complete_creator_card: '先完善达人名片',
                apply: '确认提交报名',
                view_application: '查看我的报名',
                view_applications: '返回通告',
                disabled: noticeResult.ctaState.primaryText,
            };
            const helperTextMap = {
                complete_creator_card: '当前还没有完整达人名片；先去补齐资料，再返回当前页继续完成报名。',
                apply: '联系方式是否释放、是否进入下一阶段，完全以后端返回为准。',
                view_application: '你已提交过这条报名，当前页保留报名摘要和返回入口。',
                view_applications: '当前通告归属于发布方本人，不可在此提交报名。',
                disabled: noticeResult.ctaState.disabledReason || '当前不可报名。',
            };
            this.applyDerivedState({
                pageState: page_state_1.PAGE_STATUS.ready,
                submitSuccess: false,
                isFirstCreate,
                ctaAction,
                primaryText: primaryTextMap[ctaAction] || '确认提交报名',
                secondaryText: '返回通告',
                helperText: helperTextMap[ctaAction] || '当前动作和可见范围以后端最新返回为准。',
                completenessText: isFirstCreate ? '待创建' : (0, formatter_1.formatCompleteness)(creatorResult.profileCompleteness),
                noticeSummary: {
                    title: noticeResult.notice.title,
                    budgetSummary: noticeResult.notice.budgetSummary,
                    city: noticeResult.notice.city,
                    platformLabel: (0, formatter_1.formatPlatform)(noticeResult.notice.cooperationPlatform),
                    categoryLabel: (0, formatter_1.formatCategory)(noticeResult.notice.cooperationCategory),
                    statusText: (0, formatter_1.formatNoticeStatus)(noticeResult.notice.statusTag),
                    cooperationType: (0, formatter_1.formatCooperationType)(noticeResult.notice.cooperationType),
                },
                creatorItems: buildCreatorItems(card, creatorResult.missingFieldKeys),
                applicationForm: buildInitialForm(card),
                creatorContactText: card?.contactType && card?.contactValue ? `${(0, formatter_1.formatContactType)(card.contactType)} · ${card.contactValue}` : '将沿用达人名片里的联系方式',
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '报名页初始化失败',
            });
        }
    },
    onApplicationInput(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = event.detail.value;
        this.applyDerivedState({
            applicationForm: {
                ...this.data.applicationForm,
                [field]: value,
            },
            fieldErrors: clearError(this.data.fieldErrors, field),
        });
    },
    onPortfolioChange(event) {
        this.applyDerivedState({
            applicationForm: {
                ...this.data.applicationForm,
                portfolioImages: event.detail.files || [],
            },
            fieldErrors: clearError(this.data.fieldErrors, 'portfolioImages'),
        });
    },
    async onPrimaryAction() {
        if (this.data.submitSuccess) {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorApplicationList);
            return;
        }
        if (this.data.ctaAction === 'view_application') {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorApplicationList);
            return;
        }
        if (this.data.ctaAction === 'view_applications') {
            (0, router_1.navigateByRoute)(`${routes_1.ROUTES.noticeDetail}?noticeId=${this.data.noticeId}`);
            return;
        }
        if (this.data.ctaAction === 'disabled') {
            wx.showToast({
                title: this.data.helperText || '当前不可报名',
                icon: 'none',
            });
            return;
        }
        if (this.data.ctaAction === 'complete_creator_card') {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorCard);
            return;
        }
        const fieldErrors = validateApplicationForm(this.data.applicationForm);
        if (Object.keys(fieldErrors).length) {
            this.setData({
                fieldErrors,
            });
            wx.showToast({
                title: '请先补齐报名必填项',
                icon: 'none',
            });
            return;
        }
        this.setData({
            submitting: true,
        });
        try {
            const creatorResult = await (0, creator_service_1.getCard)();
            const payload = buildApplyPayload(this.data.noticeId, this.data.applicationForm, creatorResult.creatorCard);
            await (0, application_service_1.submit)(payload);
            this.setData({
                submitSuccess: true,
                primaryText: '查看我的报名',
                secondaryText: '返回通告',
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
                title: error instanceof Error ? error.message : '报名失败',
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
        (0, router_1.navigateByRoute)(`${routes_1.ROUTES.noticeDetail}?noticeId=${this.data.noticeId}`);
    },
});
