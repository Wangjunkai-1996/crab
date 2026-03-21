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

type DecoratedNoticeCard = NoticeCardItem & {
  statusText: string;
  actionConfig: NoticeActionConfig;
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

function decorate(list: NoticeCardItem[]): DecoratedNoticeCard[] {
  return list.map((item) => ({
    ...item,
    statusText: formatNoticeStatus(item.statusTag),
    actionConfig: getActionConfig(item),
  }));
}

function buildStats(list: NoticeCardItem[]) {
  return [
    { label: '全部', value: list.length },
    { label: '待审核', value: list.filter((item) => item.statusTag === 'pending_review').length },
    { label: '进行中', value: list.filter((item) => item.statusTag === 'active').length },
  ];
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

    this.setData({
      notices: decorate(nextList),
      stats: buildStats(rawList),
      pageState: nextList.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
    });
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
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
});
