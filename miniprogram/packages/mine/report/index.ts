import { REPORT_REASON_OPTIONS, REPORT_TARGET_TYPE_OPTIONS } from '../../../constants/enums';
import { ROUTES } from '../../../constants/routes';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { submit } from '../../../services/report.service';
import { uiStore } from '../../../stores/ui.store';
import { formatReportReason, formatReportTargetType } from '../../../utils/formatter';
import { RequestError } from '../../../utils/request';

interface ReportFormState {
  targetType: string;
  targetId: string;
  targetSummary: string;
  reasonCode: string;
  description: string;
  evidenceImages: string[];
}

const EMPTY_REPORT_FORM: ReportFormState = {
  targetType: '',
  targetId: '',
  targetSummary: '',
  reasonCode: '',
  description: '',
  evidenceImages: [],
};

function validateReportForm(form: ReportFormState) {
  const errors: Record<string, string> = {};

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
    submitting: false,
    submitted: false,
    reportId: '',
    primaryDisabled: true,
    form: EMPTY_REPORT_FORM,
    fieldErrors: {} as Record<string, string>,
    targetTypeOptions: REPORT_TARGET_TYPE_OPTIONS,
    reasonOptions: REPORT_REASON_OPTIONS,
    summaryPills: [] as Array<{ label: string; active: boolean }>,
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
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

  applyDerivedState(partial: Record<string, unknown> = {}) {
    const form = (partial.form as ReportFormState) || this.data.form;
    const ready = Object.keys(validateReportForm(form)).length === 0;

    this.setData({
      ...partial,
      form,
      primaryDisabled: !ready,
      summaryPills: [
        { label: formatReportTargetType(form.targetType), active: !!form.targetType },
        { label: formatReportReason(form.reasonCode), active: !!form.reasonCode },
        { label: `${form.evidenceImages.length} 张证据`, active: form.evidenceImages.length > 0 },
      ],
    });
  },

  onFieldInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
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

  onPickOption(event: WechatMiniprogram.TouchEvent) {
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

  onEvidenceChange(event: WechatMiniprogram.CustomEvent<{ files: string[] }>) {
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
        url: ROUTES.mineReportRecords,
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
      await ensureBootstrapReady();
      const result = await submit({
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
    } catch (error) {
      if (error instanceof RequestError) {
        this.setData({
          fieldErrors: error.fieldErrors || {},
        });
      }
      wx.showToast({
        title: error instanceof Error ? error.message : '提交举报失败',
        icon: 'none',
      });
    } finally {
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
