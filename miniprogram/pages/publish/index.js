"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../constants/enums");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const notice_service_1 = require("../../services/notice.service");
const publisher_service_1 = require("../../services/publisher.service");
const runtime_config_1 = require("../../services/runtime-config");
const ui_store_1 = require("../../stores/ui.store");
const formatter_1 = require("../../utils/formatter");
const notice_form_1 = require("../../utils/notice-form");
const page_state_1 = require("../../utils/page-state");
const request_1 = require("../../utils/request");
const EMPTY_PUBLISHER_FORM = {
    identityType: '',
    displayName: '',
    city: '',
    contactType: '',
    contactValue: '',
    intro: '',
};
function mapProfileToForm(profile) {
    return {
        identityType: profile?.identityType || '',
        displayName: profile?.displayName || '',
        city: profile?.city || '',
        contactType: profile?.contactType || '',
        contactValue: profile?.contactValue || '',
        intro: profile?.intro || '',
    };
}
function validatePublisherForm(form) {
    const errors = {};
    if (!form.identityType) {
        errors.identityType = '请选择身份类型';
    }
    if (!form.displayName.trim()) {
        errors.displayName = '请填写对外展示名称';
    }
    else if (form.displayName.trim().length > 20) {
        errors.displayName = '展示名称最多 20 字';
    }
    if (!form.city.trim()) {
        errors.city = '请填写所在城市';
    }
    if (!form.contactType) {
        errors.contactType = '请选择联系方式类型';
    }
    if (!form.contactValue.trim()) {
        errors.contactValue = '请填写联系方式内容';
    }
    else if (form.contactValue.trim().length > 40) {
        errors.contactValue = '联系方式最多 40 字';
    }
    if (form.intro.trim().length > 80) {
        errors.intro = '简介最多 80 字';
    }
    return errors;
}
function buildPublisherPayload(form) {
    return {
        identityType: form.identityType,
        displayName: form.displayName.trim(),
        city: form.city.trim(),
        contactType: form.contactType,
        contactValue: form.contactValue.trim(),
        intro: form.intro.trim() || undefined,
    };
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
function countFilled(values) {
    return values.filter((item) => `${item ?? ''}`.trim().length > 0).length;
}
function buildProgressCards(profileForm, noticeForm) {
    const budgetFields = [
        noticeForm.city,
        noticeForm.settlementType,
        noticeForm.deadlineAt,
    ];
    const budgetTotal = noticeForm.settlementType === 'barter' || noticeForm.settlementType === 'free_experience' ? 3 : 4;
    const budgetDone = countFilled([
        ...budgetFields,
        budgetTotal === 4 ? noticeForm.budgetRange : undefined,
    ]);
    const cards = [
        {
            key: 'profile',
            title: '发布方资料',
            done: countFilled([profileForm.identityType, profileForm.displayName, profileForm.city, profileForm.contactType, profileForm.contactValue]),
            total: 5,
        },
        {
            key: 'core',
            title: '通告核心信息',
            done: countFilled([
                noticeForm.title,
                noticeForm.cooperationPlatform,
                noticeForm.cooperationCategory,
                noticeForm.cooperationType,
            ]),
            total: 4,
        },
        {
            key: 'budget',
            title: '合作方式与预算',
            done: budgetDone,
            total: budgetTotal,
        },
        {
            key: 'detail',
            title: '达人要求与说明',
            done: countFilled([noticeForm.creatorRequirements, noticeForm.cooperationDescription]),
            total: 2,
        },
    ];
    return cards.map((item) => ({
        ...item,
        complete: item.done >= item.total,
        statusText: item.done >= item.total ? '已完成' : `已完成 ${item.done}/${item.total}`,
    }));
}
function buildSectionProgress(progressCards) {
    const findCard = (key) => progressCards.find((item) => item.key === key)?.statusText || '';
    return {
        profile: findCard('profile'),
        core: findCard('core'),
        budget: findCard('budget'),
        detail: findCard('detail'),
    };
}
function buildNextStep(progressCards, profileIncomplete, draftNoticeId) {
    if (profileIncomplete) {
        return {
            title: '先完成发布方资料',
            copy: '资料保存成功后，当前页会继续保留下面已填写的通告内容，不需要重新录入。',
        };
    }
    const pendingCard = progressCards.find((item) => !item.complete);
    if (pendingCard) {
        return {
            title: `继续补齐「${pendingCard.title}」`,
            copy: '当前建议沿着页面顺序往下推进，先把当前段落补完整，再决定是保存草稿还是直接提交审核。',
        };
    }
    return {
        title: draftNoticeId ? '当前草稿已可直接提审' : '当前内容已具备提审条件',
        copy: '如果还需要和门店、品牌或同事对一次细节，可以先保存草稿；确认无误后再直接提交审核。',
    };
}
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        errorText: '',
        primaryLoading: false,
        savingDraft: false,
        runtimeCopy: '',
        draftStatusText: '可随时先存草稿，再回头完善。',
        profileHelperText: '',
        fieldSourceText: '',
        profileBadgeText: '首次必填',
        primaryText: '保存发布方资料',
        primaryDisabled: true,
        canSubmit: false,
        progressCards: [],
        sectionProgress: {
            profile: '',
            core: '',
            budget: '',
            detail: '',
        },
        nextStepTitle: '',
        nextStepCopy: '',
        isFirstProfile: true,
        profileIncomplete: true,
        draftNoticeId: '',
        profileSummaryPills: [],
        noticeSummaryPills: [],
        profileForm: EMPTY_PUBLISHER_FORM,
        profileErrors: {},
        noticeForm: (0, notice_form_1.createEmptyNoticeForm)(),
        noticeErrors: {},
        identityOptions: enums_1.IDENTITY_TYPE_OPTIONS,
        contactTypeOptions: enums_1.CONTACT_TYPE_OPTIONS,
        platformOptions: enums_1.COOPERATION_PLATFORM_OPTIONS,
        categoryOptions: enums_1.COOPERATION_CATEGORY_OPTIONS,
        cooperationTypeOptions: enums_1.COOPERATION_TYPE_OPTIONS,
        settlementTypeOptions: enums_1.SETTLEMENT_TYPE_OPTIONS,
        budgetRangeOptions: enums_1.BUDGET_RANGE_OPTIONS,
    },
    onLoad() {
        const app = getApp();
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            runtimeCopy: (0, runtime_config_1.resolveRuntimeDescription)(app.globalData.runtimeSwitchState),
            noticeForm: (0, notice_form_1.createEmptyNoticeForm)(),
        });
        this.loadPage();
    },
    applyDerivedState(partial = {}) {
        const profileForm = partial.profileForm || this.data.profileForm;
        const noticeForm = (0, notice_form_1.applySettlementDefaults)(partial.noticeForm || this.data.noticeForm);
        const profileReady = Object.keys(validatePublisherForm(profileForm)).length === 0;
        const noticeReady = Object.keys((0, notice_form_1.validateNoticeForm)(noticeForm)).length === 0;
        const draftNoticeId = `${partial.draftNoticeId ?? this.data.draftNoticeId ?? ''}`;
        const isFirstProfile = Boolean(partial.isFirstProfile ?? this.data.isFirstProfile);
        const profileIncomplete = !profileReady;
        const progressCards = buildProgressCards(profileForm, noticeForm);
        const nextStep = buildNextStep(progressCards, profileIncomplete, draftNoticeId);
        this.setData({
            ...partial,
            noticeForm,
            profileIncomplete,
            canSubmit: profileReady && noticeReady,
            primaryText: profileIncomplete ? '保存发布方资料' : '提交审核',
            primaryDisabled: profileIncomplete ? !profileReady : !noticeReady,
            progressCards,
            sectionProgress: buildSectionProgress(progressCards),
            nextStepTitle: nextStep.title,
            nextStepCopy: nextStep.copy,
            profileBadgeText: profileReady ? '资料已齐备' : isFirstProfile ? '首次必填' : '待补资料',
            draftStatusText: draftNoticeId ? '草稿已生成，可继续修改后提交审核。' : '可随时先存草稿，再回头完善。',
            profileSummaryPills: [
                {
                    label: (0, formatter_1.formatIdentityType)(profileForm.identityType),
                    active: !!profileForm.identityType,
                },
                {
                    label: profileForm.city || '待补城市',
                    active: !!profileForm.city,
                },
                {
                    label: (0, formatter_1.formatContactType)(profileForm.contactType),
                    active: !!profileForm.contactType,
                },
            ],
            noticeSummaryPills: [
                {
                    label: (0, formatter_1.formatPlatform)(noticeForm.cooperationPlatform),
                    active: !!noticeForm.cooperationPlatform,
                },
                {
                    label: (0, formatter_1.formatCategory)(noticeForm.cooperationCategory),
                    active: !!noticeForm.cooperationCategory,
                },
                {
                    label: (0, formatter_1.formatCooperationType)(noticeForm.cooperationType),
                    active: !!noticeForm.cooperationType,
                },
                {
                    label: (0, formatter_1.formatSettlementType)(noticeForm.settlementType),
                    active: !!noticeForm.settlementType,
                },
                {
                    label: (0, formatter_1.formatBudgetRange)(noticeForm.budgetRange),
                    active: !!noticeForm.budgetRange,
                },
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
            const profileResult = await (0, publisher_service_1.getProfile)();
            const missingText = profileResult.missingFieldKeys.length ? `待补字段：${profileResult.missingFieldKeys.join('、')}` : '发布方资料已齐备。';
            this.applyDerivedState({
                pageState: page_state_1.PAGE_STATUS.ready,
                profileForm: mapProfileToForm(profileResult.publisherProfile),
                isFirstProfile: !profileResult.publisherProfile,
                profileHelperText: !profileResult.publisherProfile
                    ? '首次进入发布页时，先补齐发布方资料；保存成功后仍停留在当前页继续填写通告。'
                    : missingText,
                fieldSourceText: `资料字段来源：${profileResult.editableFields.length ? profileResult.editableFields.join('、') : '服务端字段清单'}`,
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '发布页初始化失败',
            });
        }
    },
    onProfileInput(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = event.detail.value;
        this.applyDerivedState({
            profileForm: {
                ...this.data.profileForm,
                [field]: value,
            },
            profileErrors: clearError(this.data.profileErrors, field),
        });
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
    onPickProfileOption(event) {
        const field = `${event.currentTarget.dataset.field || ''}`;
        const value = `${event.currentTarget.dataset.value || ''}`;
        this.applyDerivedState({
            profileForm: {
                ...this.data.profileForm,
                [field]: value,
            },
            profileErrors: clearError(this.data.profileErrors, field),
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
    onNoticeAttachmentsChange(event) {
        this.applyDerivedState({
            noticeForm: {
                ...this.data.noticeForm,
                attachments: event.detail.files || [],
            },
            noticeErrors: clearError(this.data.noticeErrors, 'attachments'),
        });
    },
    async saveProfileIfNeeded() {
        const profileErrors = validatePublisherForm(this.data.profileForm);
        if (Object.keys(profileErrors).length) {
            this.setData({
                profileErrors,
            });
            wx.showToast({
                title: '请先补齐发布方资料',
                icon: 'none',
            });
            return false;
        }
        this.setData({
            primaryLoading: true,
        });
        try {
            const result = await (0, publisher_service_1.upsertProfile)(buildPublisherPayload(this.data.profileForm));
            this.applyDerivedState({
                isFirstProfile: false,
                profileErrors: {},
                profileHelperText: result.missingFieldKeys.length ? `仍待补字段：${result.missingFieldKeys.join('、')}` : '发布方资料已保存，当前页会继续保留你已填写的通告内容。',
            });
            wx.showToast({
                title: '资料已保存',
                icon: 'success',
            });
            return true;
        }
        catch (error) {
            if (error instanceof request_1.RequestError) {
                this.setData({
                    profileErrors: error.fieldErrors || {},
                });
            }
            wx.showToast({
                title: error instanceof Error ? error.message : '资料保存失败',
                icon: 'none',
            });
            return false;
        }
        finally {
            this.setData({
                primaryLoading: false,
            });
        }
    },
    async saveDraft() {
        this.setData({
            savingDraft: true,
        });
        try {
            const payload = (0, notice_form_1.buildNoticeDraftInput)(this.data.noticeForm);
            const result = this.data.draftNoticeId ? await (0, notice_service_1.updateDraft)(this.data.draftNoticeId, payload) : await (0, notice_service_1.createDraft)(payload);
            this.applyDerivedState({
                draftNoticeId: result.noticeId,
                noticeErrors: {},
            });
            wx.showToast({
                title: '草稿已保存',
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
                title: error instanceof Error ? error.message : '保存草稿失败',
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
        if (this.data.profileIncomplete) {
            await this.saveProfileIfNeeded();
            return;
        }
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
            let noticeId = this.data.draftNoticeId;
            if (!noticeId) {
                const draft = await (0, notice_service_1.createDraft)((0, notice_form_1.buildNoticeDraftInput)(this.data.noticeForm));
                noticeId = draft.noticeId;
            }
            else {
                await (0, notice_service_1.updateDraft)(noticeId, (0, notice_form_1.buildNoticeDraftInput)(this.data.noticeForm));
            }
            await (0, notice_service_1.submitReview)(noticeId);
            wx.navigateTo({
                url: `/packages/publish/success/index?noticeId=${noticeId}`,
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
