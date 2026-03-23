import {
  BUDGET_RANGE_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  COOPERATION_CATEGORY_OPTIONS,
  COOPERATION_PLATFORM_OPTIONS,
  COOPERATION_TYPE_OPTIONS,
  IDENTITY_TYPE_OPTIONS,
  SETTLEMENT_TYPE_OPTIONS,
} from '../../constants/enums';
import type { PublisherProfile, PublisherProfileUpsertPayload } from '../../models/user';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { createDraft, submitReview, updateDraft } from '../../services/notice.service';
import { getProfile, upsertProfile } from '../../services/publisher.service';
import { resolveRuntimeDescription } from '../../services/runtime-config';
import { uiStore } from '../../stores/ui.store';
import {
  formatBudgetRange,
  formatCategory,
  formatContactType,
  formatCooperationType,
  formatIdentityType,
  formatPlatform,
  formatSettlementType,
} from '../../utils/formatter';
import {
  applySettlementDefaults,
  buildNoticeDraftInput,
  createEmptyNoticeForm,
  type NoticeFormState,
  validateNoticeForm,
} from '../../utils/notice-form';
import { PAGE_STATUS } from '../../utils/page-state';
import { RequestError } from '../../utils/request';

interface PublisherFormState {
  identityType: string;
  displayName: string;
  city: string;
  contactType: string;
  contactValue: string;
  intro: string;
}

const EMPTY_PUBLISHER_FORM: PublisherFormState = {
  identityType: '',
  displayName: '',
  city: '',
  contactType: '',
  contactValue: '',
  intro: '',
};

function mapProfileToForm(profile?: PublisherProfile | null): PublisherFormState {
  return {
    identityType: profile?.identityType || '',
    displayName: profile?.displayName || '',
    city: profile?.city || '',
    contactType: profile?.contactType || '',
    contactValue: profile?.contactValue || '',
    intro: profile?.intro || '',
  };
}

function validatePublisherForm(form: PublisherFormState) {
  const errors: Record<string, string> = {};

  if (!form.identityType) {
    errors.identityType = '请选择身份类型';
  }

  if (!form.displayName.trim()) {
    errors.displayName = '请填写对外展示名称';
  } else if (form.displayName.trim().length > 20) {
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
  } else if (form.contactValue.trim().length > 40) {
    errors.contactValue = '联系方式最多 40 字';
  }

  if (form.intro.trim().length > 80) {
    errors.intro = '简介最多 80 字';
  }

  return errors;
}

function buildPublisherPayload(form: PublisherFormState): PublisherProfileUpsertPayload {
  return {
    identityType: form.identityType,
    displayName: form.displayName.trim(),
    city: form.city.trim(),
    contactType: form.contactType,
    contactValue: form.contactValue.trim(),
    intro: form.intro.trim() || undefined,
  };
}

function clearError(errors: Record<string, string>, field: string) {
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
    pageState: PAGE_STATUS.loading,
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
    isFirstProfile: true,
    profileIncomplete: true,
    draftNoticeId: '',
    profileSummaryPills: [] as Array<{ label: string; active: boolean }>,
    noticeSummaryPills: [] as Array<{ label: string; active: boolean }>,
    profileForm: EMPTY_PUBLISHER_FORM,
    profileErrors: {} as Record<string, string>,
    noticeForm: createEmptyNoticeForm(),
    noticeErrors: {} as Record<string, string>,
    identityOptions: IDENTITY_TYPE_OPTIONS,
    contactTypeOptions: CONTACT_TYPE_OPTIONS,
    platformOptions: COOPERATION_PLATFORM_OPTIONS,
    categoryOptions: COOPERATION_CATEGORY_OPTIONS,
    cooperationTypeOptions: COOPERATION_TYPE_OPTIONS,
    settlementTypeOptions: SETTLEMENT_TYPE_OPTIONS,
    budgetRangeOptions: BUDGET_RANGE_OPTIONS,
  },

  onLoad() {
    const app = getApp<IAppOption>();

    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
      runtimeCopy: resolveRuntimeDescription(app.globalData.runtimeSwitchState),
      noticeForm: createEmptyNoticeForm(),
    });

    this.loadPage();
  },

  applyDerivedState(partial: Record<string, unknown> = {}) {
    const profileForm = (partial.profileForm as PublisherFormState) || this.data.profileForm;
    const noticeForm = applySettlementDefaults((partial.noticeForm as NoticeFormState) || this.data.noticeForm);
    const profileReady = Object.keys(validatePublisherForm(profileForm)).length === 0;
    const noticeReady = Object.keys(validateNoticeForm(noticeForm)).length === 0;
    const draftNoticeId = `${partial.draftNoticeId ?? this.data.draftNoticeId ?? ''}`;
    const isFirstProfile = Boolean(partial.isFirstProfile ?? this.data.isFirstProfile);
    const profileIncomplete = !profileReady;

    this.setData({
      ...partial,
      noticeForm,
      profileIncomplete,
      canSubmit: profileReady && noticeReady,
      primaryText: profileIncomplete ? '保存发布方资料' : '提交审核',
      primaryDisabled: profileIncomplete ? !profileReady : !noticeReady,
      profileBadgeText: profileReady ? '资料已齐备' : isFirstProfile ? '首次必填' : '待补资料',
      draftStatusText: draftNoticeId ? '草稿已生成，可继续修改后提交审核。' : '可随时先存草稿，再回头完善。',
      profileSummaryPills: [
        {
          label: formatIdentityType(profileForm.identityType),
          active: !!profileForm.identityType,
        },
        {
          label: profileForm.city || '待补城市',
          active: !!profileForm.city,
        },
        {
          label: formatContactType(profileForm.contactType),
          active: !!profileForm.contactType,
        },
      ],
      noticeSummaryPills: [
        {
          label: formatPlatform(noticeForm.cooperationPlatform),
          active: !!noticeForm.cooperationPlatform,
        },
        {
          label: formatCategory(noticeForm.cooperationCategory),
          active: !!noticeForm.cooperationCategory,
        },
        {
          label: formatCooperationType(noticeForm.cooperationType),
          active: !!noticeForm.cooperationType,
        },
        {
          label: formatSettlementType(noticeForm.settlementType),
          active: !!noticeForm.settlementType,
        },
        {
          label: formatBudgetRange(noticeForm.budgetRange),
          active: !!noticeForm.budgetRange,
        },
      ],
    });
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
    });

    try {
      await ensureBootstrapReady();
      const profileResult = await getProfile();
      const missingText = profileResult.missingFieldKeys.length ? `待补字段：${profileResult.missingFieldKeys.join('、')}` : '发布方资料已齐备。';

      this.applyDerivedState({
        pageState: PAGE_STATUS.ready,
        profileForm: mapProfileToForm(profileResult.publisherProfile),
        isFirstProfile: !profileResult.publisherProfile,
        profileHelperText: !profileResult.publisherProfile
          ? '首次进入发布页时，先补齐发布方资料；保存成功后仍停留在当前页继续填写通告。'
          : missingText,
        fieldSourceText: `资料字段来源：${profileResult.editableFields.length ? profileResult.editableFields.join('、') : '服务端字段清单'}`,
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '发布页初始化失败',
      });
    }
  },

  onProfileInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
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

  onNoticeInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
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

  onPickProfileOption(event: WechatMiniprogram.TouchEvent) {
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

  onPickNoticeOption(event: WechatMiniprogram.TouchEvent) {
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

  onDeadlineChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.applyDerivedState({
      noticeForm: {
        ...this.data.noticeForm,
        deadlineAt: event.detail.value,
      },
      noticeErrors: clearError(this.data.noticeErrors, 'deadlineAt'),
    });
  },

  onNoticeAttachmentsChange(event: WechatMiniprogram.CustomEvent<{ files: string[] }>) {
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
      const result = await upsertProfile(buildPublisherPayload(this.data.profileForm));
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
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          profileErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '资料保存失败',
        icon: 'none',
      });
      return false;
    } finally {
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
      const payload = buildNoticeDraftInput(this.data.noticeForm);
      const result = this.data.draftNoticeId ? await updateDraft(this.data.draftNoticeId, payload) : await createDraft(payload);

      this.applyDerivedState({
        draftNoticeId: result.noticeId,
        noticeErrors: {},
      });
      wx.showToast({
        title: '草稿已保存',
        icon: 'success',
      });
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          noticeErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '保存草稿失败',
        icon: 'none',
      });
    } finally {
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

    const noticeErrors = validateNoticeForm(this.data.noticeForm);

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
        const draft = await createDraft(buildNoticeDraftInput(this.data.noticeForm));
        noticeId = draft.noticeId;
      } else {
        await updateDraft(noticeId, buildNoticeDraftInput(this.data.noticeForm));
      }

      await submitReview(noticeId);

      wx.navigateTo({
        url: `/packages/publish/success/index?noticeId=${noticeId}`,
      });
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          noticeErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '提交失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        primaryLoading: false,
      });
    }
  },

  async onSecondaryAction() {
    await this.saveDraft();
  },
});
