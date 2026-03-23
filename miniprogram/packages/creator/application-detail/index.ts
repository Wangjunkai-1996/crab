import type { ApplicationDetailResponse } from '../../../models/application';
import { detail, getWithdrawBlockReason, withdraw } from '../../../services/application.service';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { uiStore } from '../../../stores/ui.store';
import { formatApplicationStatus, formatNoticeStatus } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { navigateByRoute } from '../../../utils/router';

function confirmWithdraw() {
  return new Promise<boolean>((resolve) => {
    wx.showModal({
      title: '确认撤回报名？',
      content: '撤回后当前记录会保留为“已撤回”，不可恢复原记录。',
      confirmText: '确认撤回',
      cancelText: '再想想',
      confirmColor: '#E35D6A',
      success: (result) => resolve(!!result.confirm),
      fail: () => resolve(false),
    });
  });
}

Page({
  data: {
    topInset: 0,
    bottomInset: 0,
    pageState: PAGE_STATUS.loading,
    applicationId: '',
    detail: null as ApplicationDetailResponse | null,
    statusText: '',
    noticeStatusText: '待同步',
    contactTitle: '联系方式说明',
    contactCopy: '联系方式是否可见完全以服务端返回为准。',
    canWithdraw: false,
    secondaryText: '返回我的报名',
    withdrawing: false,
    errorText: '',
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
      applicationId: query.applicationId || 'application-001',
    });
    this.loadPage();
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
    });

    try {
      await ensureBootstrapReady();
      const result = await detail(this.data.applicationId);
      const canView = result.permissionState.canViewPublisherContact;
      const withdrawBlockReason = getWithdrawBlockReason(result.application.status);
      const canWithdraw = !withdrawBlockReason;

      this.setData({
        pageState: PAGE_STATUS.ready,
        detail: result,
        statusText: formatApplicationStatus(result.application.status),
        noticeStatusText: result.noticeSummary.status ? formatNoticeStatus(result.noticeSummary.status) : '待同步',
        contactTitle: canView ? '发布方联系方式' : '联系方式说明',
        contactCopy: canView
          ? '当前联系方式可见，是因为服务端已确认进入可联系阶段。'
          : 'V1 默认不在报名后立即完全公开联系方式，待服务端进入可联系阶段后再显示。',
        canWithdraw,
        secondaryText: canWithdraw ? '撤回报名' : '返回我的报名',
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '报名详情加载失败',
      });
    }
  },

  onPrimaryAction() {
    if (!this.data.detail || this.data.withdrawing) {
      return;
    }

    navigateByRoute(`/pages/plaza/notice-detail?noticeId=${this.data.detail.noticeSummary.noticeId}`);
  },

  async onSecondaryAction() {
    if (!this.data.detail || this.data.withdrawing) {
      return;
    }

    if (!this.data.canWithdraw) {
      navigateByRoute('/packages/creator/application-list/index');
      return;
    }

    const confirmed = await confirmWithdraw();

    if (!confirmed) {
      return;
    }

    this.setData({
      withdrawing: true,
      secondaryText: '撤回中...',
    });

    try {
      await withdraw(this.data.detail.application.applicationId, {
        currentStatus: this.data.detail.application.status,
      });
      wx.showToast({
        title: '已撤回报名',
        icon: 'success',
      });
      await this.loadPage();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '撤回失败',
        icon: 'none',
      });
      this.setData({
        secondaryText: this.data.canWithdraw ? '撤回报名' : '返回我的报名',
      });
    } finally {
      this.setData({
        withdrawing: false,
      });
    }
  },
});
