import {
  CONTACT_TYPE_OPTIONS,
  COOPERATION_CATEGORY_OPTIONS,
  COOPERATION_PLATFORM_OPTIONS,
  FOLLOWER_BAND_OPTIONS,
  GENDER_OPTIONS,
} from '../../../constants/enums';
import type { CreatorCard, CreatorCardUpsertPayload } from '../../../models/user';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { getCard, upsertCard } from '../../../services/creator.service';
import { uiStore } from '../../../stores/ui.store';
import {
  formatCategory,
  formatCompleteness,
  formatContactType,
  formatFollowerBand,
  formatGender,
  formatPlatform,
} from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { RequestError } from '../../../utils/request';

const EMPTY_CREATOR_CARD: CreatorCardUpsertPayload = {
  nickname: '',
  city: '',
  primaryPlatform: '',
  primaryCategory: '',
  followerBand: '',
  contactType: '',
  contactValue: '',
  portfolioImages: [],
};

function mapCardToForm(card?: CreatorCard | null): CreatorCardUpsertPayload {
  return {
    ...EMPTY_CREATOR_CARD,
    nickname: card?.nickname || '',
    city: card?.city || '',
    primaryPlatform: card?.primaryPlatform || '',
    primaryCategory: card?.primaryCategory || '',
    followerBand: card?.followerBand || '',
    contactType: card?.contactType || '',
    contactValue: card?.contactValue || '',
    avatarUrl: card?.avatarUrl || undefined,
    gender: card?.gender || undefined,
    accountName: card?.accountName || undefined,
    accountIdOrLink: card?.accountIdOrLink || undefined,
    portfolioImages: card?.portfolioImages || [],
    caseDescription: card?.caseDescription || undefined,
    residentCity: card?.residentCity || undefined,
  };
}

function validateCardForm(form: CreatorCardUpsertPayload) {
  const errors: Record<string, string> = {};

  if (!form.nickname?.trim()) {
    errors.nickname = '请填写昵称';
  } else if (form.nickname.trim().length > 20) {
    errors.nickname = '昵称最多 20 字';
  }

  if (!form.city?.trim()) {
    errors.city = '请填写所在城市';
  }

  if (!form.primaryPlatform) {
    errors.primaryPlatform = '请选择擅长平台';
  }

  if (!form.primaryCategory) {
    errors.primaryCategory = '请选择擅长领域';
  }

  if (!form.followerBand) {
    errors.followerBand = '请选择粉丝量级';
  }

  if (form.accountName && form.accountName.trim().length > 30) {
    errors.accountName = '账号名称最多 30 字';
  }

  if (form.accountIdOrLink && form.accountIdOrLink.trim().length > 100) {
    errors.accountIdOrLink = '账号链接或 ID 最多 100 字';
  }

  if ((form.portfolioImages || []).length < 1) {
    errors.portfolioImages = '至少上传 1 张代表作品';
  } else if ((form.portfolioImages || []).length > 6) {
    errors.portfolioImages = '代表作品最多 6 张';
  }

  if (form.caseDescription && form.caseDescription.trim().length > 200) {
    errors.caseDescription = '案例说明最多 200 字';
  }

  if (!form.contactType) {
    errors.contactType = '请选择联系方式类型';
  }

  if (!form.contactValue?.trim()) {
    errors.contactValue = '请填写联系方式内容';
  } else if (form.contactValue.trim().length > 40) {
    errors.contactValue = '联系方式最多 40 字';
  }

  return errors;
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
    saving: false,
    primaryDisabled: true,
    completenessText: '',
    bridgeText: '',
    fieldSourceText: '',
    uploadCopy: '',
    previewName: '',
    previewAvatarText: '羽',
    previewSummary: '',
    previewTags: [] as Array<{ label: string; active: boolean }>,
    isFirstCreate: false,
    cardForm: EMPTY_CREATOR_CARD,
    fieldErrors: {} as Record<string, string>,
    genderOptions: GENDER_OPTIONS,
    platformOptions: COOPERATION_PLATFORM_OPTIONS,
    categoryOptions: COOPERATION_CATEGORY_OPTIONS,
    followerBandOptions: FOLLOWER_BAND_OPTIONS,
    contactTypeOptions: CONTACT_TYPE_OPTIONS,
  },

  onLoad() {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
    });
    this.loadPage();
  },

  applyDerivedState(partial: Record<string, unknown> = {}) {
    const cardForm = (partial.cardForm as CreatorCardUpsertPayload) || this.data.cardForm;
    const ready = Object.keys(validateCardForm(cardForm)).length === 0;

    this.setData({
      ...partial,
      cardForm,
      primaryDisabled: !ready,
      previewName: cardForm.nickname?.trim() || '还没有达人名片',
      previewAvatarText: cardForm.nickname?.trim() ? cardForm.nickname.trim().slice(0, 1) : '羽',
      previewSummary:
        cardForm.primaryPlatform && cardForm.primaryCategory && cardForm.followerBand
          ? `${formatPlatform(cardForm.primaryPlatform)} · ${formatFollowerBand(cardForm.followerBand)} · ${formatCategory(cardForm.primaryCategory)}`
          : '先补齐平台、领域、粉丝量级和联系方式，发布方才能快速判断是否适合合作。',
      previewTags: [
        { label: cardForm.city?.trim() || '待补城市', active: !!cardForm.city?.trim() },
        { label: formatGender(cardForm.gender) || '性别未设置', active: !!cardForm.gender },
        { label: formatContactType(cardForm.contactType), active: !!cardForm.contactType },
        { label: `${cardForm.portfolioImages?.length || 0} 张作品`, active: (cardForm.portfolioImages?.length || 0) > 0 },
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
      const result = await getCard();
      const isFirstCreate = !result.creatorCard;

      this.applyDerivedState({
        pageState: PAGE_STATUS.ready,
        cardForm: mapCardToForm(result.creatorCard),
        isFirstCreate,
        completenessText: isFirstCreate ? '待创建' : formatCompleteness(result.profileCompleteness),
        bridgeText: isFirstCreate
          ? '首次报名时会直接使用当前名片资料；保存成功后无需回头重新补录。'
          : '当前名片已接到真实读写结构，后续报名会直接复用这份资料快照。',
        fieldSourceText: `当前字段来源：${result.editableFields.length ? result.editableFields.join('、') : '服务端字段清单'}`,
        uploadCopy: '作品截图至少 1 张、最多 6 张；当前支持本地选择与预览，后续再接云存储链路。',
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '达人名片加载失败',
      });
    }
  },

  onFieldInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = `${event.currentTarget.dataset.field || ''}`;
    const value = event.detail.value;

    this.applyDerivedState({
      cardForm: {
        ...this.data.cardForm,
        [field]: value,
      },
      fieldErrors: clearError(this.data.fieldErrors, field),
    });
  },

  onPickOption(event: WechatMiniprogram.TouchEvent) {
    const field = `${event.currentTarget.dataset.field || ''}`;
    const value = `${event.currentTarget.dataset.value || ''}`;

    this.applyDerivedState({
      cardForm: {
        ...this.data.cardForm,
        [field]: value,
      },
      fieldErrors: clearError(this.data.fieldErrors, field),
    });
  },

  onPortfolioChange(event: WechatMiniprogram.CustomEvent<{ files: string[] }>) {
    this.applyDerivedState({
      cardForm: {
        ...this.data.cardForm,
        portfolioImages: event.detail.files || [],
      },
      fieldErrors: clearError(this.data.fieldErrors, 'portfolioImages'),
    });
  },

  onPreview() {
    wx.showToast({
      title: this.data.previewName ? '上方预览会随表单实时更新' : '请先填写基础资料',
      icon: 'none',
    });
  },

  async onSave() {
    const fieldErrors = validateCardForm(this.data.cardForm);

    if (Object.keys(fieldErrors).length) {
      this.setData({
        fieldErrors,
      });
      wx.showToast({
        title: '请先补齐达人名片必填项',
        icon: 'none',
      });
      return;
    }

    this.setData({
      saving: true,
    });

    try {
      const result = await upsertCard(this.data.cardForm);
      this.setData({
        fieldErrors: {},
        completenessText: formatCompleteness(result.profileCompleteness),
        isFirstCreate: false,
      });
      wx.showToast({
        title: '名片已保存',
        icon: 'success',
      });
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          fieldErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        saving: false,
      });
    }
  },
});
