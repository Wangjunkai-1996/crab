import {
  BUDGET_RANGE_OPTIONS,
  COOPERATION_CATEGORY_OPTIONS,
  COOPERATION_PLATFORM_OPTIONS,
  COOPERATION_TYPE_OPTIONS,
  SETTLEMENT_TYPE_OPTIONS,
} from '../../../constants/enums';
import { detail, submitReview, updateDraft } from '../../../services/notice.service';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { uiStore } from '../../../stores/ui.store';
import {
  formatBudgetRange,
  formatCategory,
  formatCooperationType,
  formatNoticeStatus,
  formatPlatform,
  formatSettlementType,
} from '../../../utils/formatter';
import {
  applySettlementDefaults,
  buildNoticeDraftInput,
  mapNoticeDetailToForm,
  type NoticeFormState,
  validateNoticeForm,
} from '../../../utils/notice-form';
import { PAGE_STATUS } from '../../../utils/page-state';
import { RequestError } from '../../../utils/request';

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
    noticeId: '',
    currentStatusText: '',
    infoCopy: '',
    savingDraft: false,
    primaryLoading: false,
    primaryDisabled: true,
    noticeForm: mapNoticeDetailToForm(),
    noticeErrors: {} as Record<string, string>,
    summaryPills: [] as Array<{ label: string; active: boolean }>,
    platformOptions: COOPERATION_PLATFORM_OPTIONS,
    categoryOptions: COOPERATION_CATEGORY_OPTIONS,
    cooperationTypeOptions: COOPERATION_TYPE_OPTIONS,
    settlementTypeOptions: SETTLEMENT_TYPE_OPTIONS,
    budgetRangeOptions: BUDGET_RANGE_OPTIONS,
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
      noticeId: query.noticeId || '',
    });
    this.loadPage();
  },

  applyDerivedState(partial: Record<string, unknown> = {}) {
    const noticeForm = applySettlementDefaults((partial.noticeForm as NoticeFormState) || this.data.noticeForm);
    const noticeReady = Object.keys(validateNoticeForm(noticeForm)).length === 0;

    this.setData({
      ...partial,
      noticeForm,
      primaryDisabled: !noticeReady,
      summaryPills: [
        { label: formatPlatform(noticeForm.cooperationPlatform), active: !!noticeForm.cooperationPlatform },
        { label: formatCategory(noticeForm.cooperationCategory), active: !!noticeForm.cooperationCategory },
        { label: formatCooperationType(noticeForm.cooperationType), active: !!noticeForm.cooperationType },
        { label: formatSettlementType(noticeForm.settlementType), active: !!noticeForm.settlementType },
        { label: formatBudgetRange(noticeForm.budgetRange), active: !!noticeForm.budgetRange },
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
      const result = await detail(this.data.noticeId);

      this.applyDerivedState({
        pageState: PAGE_STATUS.ready,
        noticeForm: mapNoticeDetailToForm(result.notice),
        currentStatusText: formatNoticeStatus(result.notice.statusTag),
        infoCopy: result.notice.statusTag === 'rejected' || result.notice.statusTag === 'supplement_required'
          ? '本次修改后可重新提交审核，历史驳回原因以后端最新结果为准。'
          : '编辑页保存后不会直接改线上展示；重新提交审核通过后才会再次进入广场。',
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '编辑页加载失败',
      });
    }
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

  onAttachmentsChange(event: WechatMiniprogram.CustomEvent<{ files: string[] }>) {
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
      await updateDraft(this.data.noticeId, buildNoticeDraftInput(this.data.noticeForm));
      this.setData({
        noticeErrors: {},
      });
      wx.showToast({
        title: '修改已保存',
        icon: 'success',
      });
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          noticeErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        savingDraft: false,
      });
    }
  },

  async onPrimaryAction() {
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
      await updateDraft(this.data.noticeId, buildNoticeDraftInput(this.data.noticeForm));
      await submitReview(this.data.noticeId);

      wx.navigateTo({
        url: `/packages/publish/success/index?noticeId=${this.data.noticeId}`,
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
