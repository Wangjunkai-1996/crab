import { MY_NOTICE_STATUS_TABS } from '../../../constants/ui';
import type { NoticeCardItem } from '../../../models/notice';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { closeNotice, getRepublishBlockReason, myList } from '../../../services/notice.service';
import { uiStore } from '../../../stores/ui.store';
import { formatNoticeStatus } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { navigateByRoute } from '../../../utils/router';

interface NoticeActionConfig {
  primaryText: string;
  primaryAction: string;
  secondaryText: string;
  secondaryAction: string;
  dangerText: string;
  dangerAction: string;
}

interface FocusNoticeCard {
  title: string;
  badgeText: string;
  copy: string;
}

type DecoratedNoticeCard = NoticeCardItem & {
  statusText: string;
  actionConfig: NoticeActionConfig;
  actionHint: string;
};

function getActionConfig(item: NoticeCardItem): NoticeActionConfig {
  if (item.statusTag === 'active') {
    return {
      primaryText: '报名管理',
      primaryAction: 'manage',
      secondaryText: '查看详情',
      secondaryAction: 'view',
      dangerText: '关闭',
      dangerAction: 'close',
    };
  }

  if (item.statusTag === 'pending_review') {
    return {
      primaryText: '查看详情',
      primaryAction: 'view',
      secondaryText: '',
      secondaryAction: '',
      dangerText: '',
      dangerAction: '',
    };
  }

  if (item.statusTag === 'supplement_required' || item.statusTag === 'rejected' || item.statusTag === 'draft') {
    return {
      primaryText: '编辑',
      primaryAction: 'edit',
      secondaryText: '查看详情',
      secondaryAction: 'view',
      dangerText: '',
      dangerAction: '',
    };
  }

  return {
    primaryText: '查看报名',
    primaryAction: 'manage',
    secondaryText: '查看详情',
    secondaryAction: 'view',
    dangerText: '',
    dangerAction: '',
  };
}

function getActionHint(item: NoticeCardItem) {
  if (item.statusTag === 'active') {
    return '当前已经在广场曝光，优先看报名量和报名管理，再决定是否需要关闭。';
  }

  if (item.statusTag === 'pending_review') {
    return '当前在审核中，先看详情页里的资料是否完整，避免来回切页。';
  }

  if (item.statusTag === 'supplement_required' || item.statusTag === 'rejected') {
    return '当前更适合先回编辑页补信息，再决定是否重新提审。';
  }

  if (item.statusTag === 'draft') {
    return '当前还是草稿，先把核心字段补齐，再回发布页决定是否提交审核。';
  }

  return '先看当前状态，再决定是继续管理报名还是回详情页复核。';
}

function decorate(list: NoticeCardItem[]): DecoratedNoticeCard[] {
  return list.map((item) => ({
    ...item,
    statusText: formatNoticeStatus(item.statusTag),
    actionConfig: getActionConfig(item),
    actionHint: getActionHint(item),
  }));
}

function buildStats(list: NoticeCardItem[]) {
  return [
    { label: '全部', value: list.length },
    { label: '待审核', value: list.filter((item) => item.statusTag === 'pending_review').length },
    { label: '进行中', value: list.filter((item) => item.statusTag === 'active').length },
  ];
}

function buildFocusNotice(list: NoticeCardItem[]): FocusNoticeCard | null {
  const candidate =
    list.find((item) => item.statusTag === 'supplement_required') ||
    list.find((item) => item.statusTag === 'pending_review') ||
    list.find((item) => item.statusTag === 'active') ||
    list[0];

  if (!candidate) {
    return null;
  }

  return {
    title: candidate.title,
    badgeText: formatNoticeStatus(candidate.statusTag),
    copy: getActionHint(candidate),
  };
}

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    tabs: MY_NOTICE_STATUS_TABS,
    activeStatus: 'all',
    rawNotices: [] as NoticeCardItem[],
    notices: [] as DecoratedNoticeCard[],
    stats: [] as Array<{ label: string; value: number }>,
    focusNotice: null as FocusNoticeCard | null,
    filteredEmpty: false,
    errorText: '',
  },

  onLoad() {
    this.setData({ topInset: uiStore.getState().safeArea.statusBarHeight });
    this.loadPage();
  },

  applyFilter() {
    const activeStatus = this.data.activeStatus;
    const rawList = this.data.rawNotices || [];
    const nextList = activeStatus === 'all' ? rawList : rawList.filter((item) => item.statusTag === activeStatus);
    const hasAnyData = rawList.length > 0;

    this.setData({
      notices: decorate(nextList),
      stats: buildStats(rawList),
      focusNotice: buildFocusNotice(rawList),
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
        rawNotices: result.list || [],
      });
      this.applyFilter();
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '列表加载失败',
      });
    }
  },

  onSwitchStatus(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      activeStatus: `${event.currentTarget.dataset.value}`,
    });
    this.applyFilter();
  },

  async onTapAction(event: WechatMiniprogram.TouchEvent) {
    const noticeId = `${event.currentTarget.dataset.id}`;
    const action = `${event.currentTarget.dataset.action}`;
    const currentNotice = (this.data.rawNotices || []).find((item) => item.noticeId === noticeId);

    if (action === 'republish') {
      wx.showToast({
        title: getRepublishBlockReason(currentNotice?.statusTag) || '当前暂不开放重新发布',
        icon: 'none',
      });
      return;
    }

    if (action === 'view') {
      navigateByRoute(`/pages/plaza/notice-detail?noticeId=${noticeId}`);
      return;
    }

    if (action === 'edit') {
      navigateByRoute(`/packages/publish/edit/index?noticeId=${noticeId}`);
      return;
    }

    if (action === 'manage') {
      navigateByRoute(`/packages/publish/application-manage/index?noticeId=${noticeId}`);
      return;
    }

    if (action === 'close') {
      try {
        await closeNotice(noticeId);
        wx.showToast({ title: '已提交关闭', icon: 'success' });
        this.loadPage();
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : '关闭失败',
          icon: 'none',
        });
      }
    }
  },

  onEmptyAction() {
    navigateByRoute('/pages/publish/index');
  },
});
