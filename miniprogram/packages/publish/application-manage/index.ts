import type {
  PublisherApplicationAction,
  PublisherApplicationDetailResponse,
  PublisherApplicationListItem,
} from '../../../models/application';
import {
  markCommunicating,
  markCompleted,
  markContactPending,
  markRejected,
  markViewed,
  publisherDetail,
  publisherList,
  revealCreatorContact,
} from '../../../services/application.service';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { uiStore } from '../../../stores/ui.store';
import { formatApplicationStatus, formatCategory, formatPlatform } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { navigateByRoute } from '../../../utils/router';

const ACTION_LABELS: Record<PublisherApplicationAction, string> = {
  markViewed: '标记已查看',
  markContactPending: '标记待联系',
  markCommunicating: '标记已沟通',
  markRejected: '标记未入选',
  markCompleted: '标记已完成',
  revealCreatorContact: '查看联系方式',
};

interface DetailItem {
  label: string;
  value: string;
  required?: boolean;
}

interface ActionButton {
  key: PublisherApplicationAction;
  label: string;
  tone: 'primary' | 'neutral' | 'danger';
}

interface DecoratedPublisherApplicationListItem extends PublisherApplicationListItem {
  statusText: string;
  platformLabel: string;
  categoryLabel: string;
  contactStateText: string;
  priorityHint: string;
}

interface DecoratedPublisherApplicationDetail extends PublisherApplicationDetailResponse {
  statusText: string;
  creatorItems: DetailItem[];
  applicationItems: DetailItem[];
  actionButtons: ActionButton[];
  contactTitle: string;
  contactCopy: string;
}

interface FocusApplicationCard {
  title: string;
  badgeText: string;
  copy: string;
}

function getPriorityHint(item: PublisherApplicationListItem) {
  if (item.contactRevealState === 'revealed') {
    return '联系方式已经释放，优先判断要不要立刻联系达人并推进合作。';
  }

  if (item.status === 'contact_pending') {
    return '当前最适合继续推进到联系阶段，先看详情区允许执行哪些动作。';
  }

  if (item.status === 'communicating') {
    return '当前已经在沟通中，优先确认交付意向和后续收口动作。';
  }

  if (item.status === 'viewed') {
    return '当前已查看过这条报名，可以继续推进到待联系或直接淘汰。';
  }

  return '先用列表判断优先级，再到详情区查看完整报名内容和可执行动作。';
}

function resolveActionTone(action: PublisherApplicationAction): ActionButton['tone'] {
  if (action === 'markRejected') {
    return 'danger';
  }

  if (action === 'revealCreatorContact' || action === 'markCompleted') {
    return 'primary';
  }

  return 'neutral';
}

function decorateList(list: PublisherApplicationListItem[]): DecoratedPublisherApplicationListItem[] {
  return list.map((item) => ({
    ...item,
    statusText: formatApplicationStatus(item.status),
    platformLabel: formatPlatform(item.creatorCardSnapshot.primaryPlatform),
    categoryLabel: formatCategory(item.creatorCardSnapshot.primaryCategory),
    contactStateText:
      item.contactRevealState === 'revealed'
        ? '联系方式已释放'
        : item.contactRevealState === 'masked'
          ? '已留联系方式'
          : '联系方式未释放',
    priorityHint: getPriorityHint(item),
  }));
}

function buildStats(list: PublisherApplicationListItem[]) {
  const pendingCount = list.filter((item) => ['applied', 'viewed', 'contact_pending', 'communicating'].includes(item.status)).length;
  const handledCount = list.filter((item) => ['rejected', 'completed', 'withdrawn'].includes(item.status)).length;

  return [
    { label: '全部报名', value: list.length },
    { label: '待推进', value: pendingCount },
    { label: '已处理', value: handledCount },
  ];
}

function buildFocusApplication(list: PublisherApplicationListItem[]): FocusApplicationCard | null {
  const candidate =
    list.find((item) => item.contactRevealState === 'revealed') ||
    list.find((item) => item.status === 'contact_pending') ||
    list.find((item) => item.status === 'communicating') ||
    list[0];

  if (!candidate) {
    return null;
  }

  return {
    title: candidate.creatorCardSnapshot.nickname,
    badgeText: formatApplicationStatus(candidate.status),
    copy: getPriorityHint(candidate),
  };
}

function decorateDetail(detail: PublisherApplicationDetailResponse): DecoratedPublisherApplicationDetail {
  return {
    ...detail,
    statusText: formatApplicationStatus(detail.application.status),
    creatorItems: [
      { label: '达人昵称', value: detail.creatorSummary.displayName, required: true },
      { label: '所在城市', value: detail.creatorSummary.city, required: true },
      { label: '擅长平台', value: formatPlatform(detail.creatorSummary.primaryPlatform), required: true },
      { label: '擅长领域', value: formatCategory(detail.creatorSummary.primaryCategory), required: true },
      { label: '粉丝量级', value: detail.creatorSummary.followerBand, required: true },
      { label: '案例说明', value: detail.creatorSummary.caseDescription || '待补充' },
    ],
    applicationItems: [
      { label: '自我介绍', value: detail.application.selfIntroduction, required: true },
      { label: '可交付计划', value: detail.application.deliverablePlan, required: true },
      { label: '期望条件', value: detail.application.expectedTerms || '无额外补充' },
    ],
    actionButtons: detail.availableActions.map((action) => ({
      key: action,
      label: ACTION_LABELS[action] || action,
      tone: resolveActionTone(action),
    })),
    contactTitle: detail.creatorContactRevealState === 'revealed' ? '达人联系方式' : '联系方式说明',
    contactCopy:
      detail.creatorContactRevealState === 'revealed'
        ? detail.maskedOrFullCreatorContact || '已按服务端规则释放联系方式。'
        : '联系方式展示完全以后端裁剪为准；前端不自行显示原始值。',
  };
}

Page({
  data: {
    topInset: 0,
    bottomInset: 0,
    pageState: PAGE_STATUS.loading,
    noticeId: '',
    applications: [] as DecoratedPublisherApplicationListItem[],
    stats: [] as Array<{ label: string; value: number }>,
    focusApplication: null as FocusApplicationCard | null,
    selectedApplicationId: '',
    detail: null as DecoratedPublisherApplicationDetail | null,
    detailLoading: false,
    detailErrorText: '',
    errorText: '',
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
      noticeId: query.noticeId || 'my-notice-002',
    });
    this.loadPage();
  },

  async loadPage(selectedApplicationId = '') {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
      detailErrorText: '',
    });

    try {
      await ensureBootstrapReady();
      const result = await publisherList({
        noticeId: this.data.noticeId,
      });
      const applications = decorateList(result.list || []);
      const nextSelectedId = selectedApplicationId || this.data.selectedApplicationId || applications[0]?.applicationId || '';

      this.setData({
        applications,
        stats: buildStats(result.list || []),
        focusApplication: buildFocusApplication(result.list || []),
        selectedApplicationId: nextSelectedId,
        pageState: applications.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
        detail: null,
      });

      if (nextSelectedId) {
        await this.loadDetail(nextSelectedId);
      }
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '报名管理加载失败',
      });
    }
  },

  async loadDetail(applicationId: string) {
    this.setData({
      detailLoading: true,
      detailErrorText: '',
      selectedApplicationId: applicationId,
    });

    try {
      const detail = await publisherDetail(applicationId);
      this.setData({
        detail: decorateDetail(detail),
      });
    } catch (error) {
      this.setData({
        detailErrorText: error instanceof Error ? error.message : '报名详情加载失败',
      });
    } finally {
      this.setData({
        detailLoading: false,
      });
    }
  },

  onRetry() {
    this.loadPage(this.data.selectedApplicationId);
  },

  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const applicationId = `${event.currentTarget.dataset.id || ''}`;
    if (!applicationId) {
      return;
    }

    this.loadDetail(applicationId);
  },

  async onTapAction(event: WechatMiniprogram.TouchEvent) {
    const action = `${event.currentTarget.dataset.action || ''}` as PublisherApplicationAction;
    const applicationId = `${event.currentTarget.dataset.id || this.data.selectedApplicationId || ''}`;

    if (!applicationId) {
      return;
    }

    this.setData({
      detailLoading: true,
    });

    try {
      if (action === 'markViewed') {
        await markViewed(applicationId);
      }

      if (action === 'markContactPending') {
        await markContactPending(applicationId);
      }

      if (action === 'markCommunicating') {
        await markCommunicating(applicationId);
      }

      if (action === 'markRejected') {
        await markRejected(applicationId);
      }

      if (action === 'markCompleted') {
        await markCompleted(applicationId);
      }

      if (action === 'revealCreatorContact') {
        await revealCreatorContact(applicationId);
      }

      wx.showToast({
        title: ACTION_LABELS[action] || '已更新',
        icon: 'success',
      });
      await this.loadPage(applicationId);
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '操作失败',
        icon: 'none',
      });
      this.setData({
        detailLoading: false,
      });
    }
  },

  onPrimaryAction() {
    navigateByRoute(`/pages/plaza/notice-detail?noticeId=${this.data.noticeId}`);
  },

  onSecondaryAction() {
    this.loadPage(this.data.selectedApplicationId);
  },
});
