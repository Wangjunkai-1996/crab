import { MY_APPLICATION_STATUS_TABS } from '../../../constants/ui';
import { ROUTES } from '../../../constants/routes';
import type { ApplicationListItem } from '../../../models/application';
import { myList } from '../../../services/application.service';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { uiStore } from '../../../stores/ui.store';
import { formatApplicationStatus } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { navigateByRoute } from '../../../utils/router';

interface FocusCard {
  title: string;
  copy: string;
  badgeText: string;
}

function buildStats(list: ApplicationListItem[]) {
  return [
    { label: '全部', value: list.length },
    { label: '待联系', value: list.filter((item) => item.status === 'contact_pending').length },
    { label: '已沟通', value: list.filter((item) => item.status === 'communicating').length },
  ];
}

function getNextActionText(item: ApplicationListItem) {
  if (item.canViewPublisherContact) {
    return '联系方式已经释放，优先决定要不要立刻联系发布方并推进合作。';
  }

  if (item.status === 'contact_pending') {
    return '当前已进入待联系阶段，重点等发布方释放联系方式或进一步反馈。';
  }

  if (item.status === 'communicating') {
    return '当前已经进入沟通阶段，建议优先看详情页里的最新状态和说明。';
  }

  return item.stageHint || '当前报名仍在处理中，建议先看阶段提示再决定下一步。';
}

function buildFocusCard(list: ApplicationListItem[]): FocusCard | null {
  const candidate =
    list.find((item) => item.canViewPublisherContact) ||
    list.find((item) => item.status === 'contact_pending') ||
    list.find((item) => item.status === 'communicating') ||
    list[0];

  if (!candidate) {
    return null;
  }

  return {
    title: candidate.noticeTitle,
    badgeText: candidate.canViewPublisherContact ? '可联系' : formatApplicationStatus(candidate.status),
    copy: getNextActionText(candidate),
  };
}

function decorate(list: ApplicationListItem[]) {
  return list.map((item) => ({
    ...item,
    statusText: formatApplicationStatus(item.status),
    contactText: item.canViewPublisherContact ? '联系方式可见' : '联系方式未释放',
    nextActionText: getNextActionText(item),
  }));
}

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    tabs: MY_APPLICATION_STATUS_TABS,
    activeStatus: 'all',
    rawList: [] as ApplicationListItem[],
    list: [] as Array<ApplicationListItem & { statusText?: string; contactText?: string; nextActionText?: string }>,
    stats: [] as Array<{ label: string; value: number }>,
    focusCard: null as FocusCard | null,
    filteredEmpty: false,
    errorText: '',
  },

  onLoad() {
    this.setData({ topInset: uiStore.getState().safeArea.statusBarHeight });
    this.loadPage();
  },

  applyFilter() {
    const activeStatus = this.data.activeStatus;
    const rawList = this.data.rawList || [];
    const nextList = activeStatus === 'all' ? rawList : rawList.filter((item) => item.status === activeStatus);
    const hasAnyData = rawList.length > 0;

    this.setData({
      list: decorate(nextList),
      stats: buildStats(rawList),
      focusCard: buildFocusCard(rawList),
      filteredEmpty: hasAnyData && nextList.length === 0,
      pageState: hasAnyData ? PAGE_STATUS.ready : PAGE_STATUS.empty,
    });
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
      filteredEmpty: false,
    });

    try {
      await ensureBootstrapReady();
      const result = await myList();
      this.setData({
        rawList: result.list || [],
      });
      this.applyFilter();
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '我的报名加载失败',
      });
    }
  },

  onSwitchStatus(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      activeStatus: `${event.currentTarget.dataset.value}`,
    });
    this.applyFilter();
  },

  onTapItem(event: WechatMiniprogram.TouchEvent) {
    const applicationId = `${event.currentTarget.dataset.id}`;
    wx.navigateTo({
      url: `/packages/creator/application-detail/index?applicationId=${applicationId}`,
    });
  },

  onEmptyAction() {
    navigateByRoute(ROUTES.plaza);
  },
});
