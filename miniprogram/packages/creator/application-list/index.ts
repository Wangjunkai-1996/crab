import { MY_APPLICATION_STATUS_TABS } from '../../../constants/ui';
import type { ApplicationListItem } from '../../../models/application';
import { myList } from '../../../services/application.service';
import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { uiStore } from '../../../stores/ui.store';
import { formatApplicationStatus } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';

function buildStats(list: ApplicationListItem[]) {
  return [
    { label: '全部', value: list.length },
    { label: '待联系', value: list.filter((item) => item.status === 'contact_pending').length },
    { label: '已沟通', value: list.filter((item) => item.status === 'communicating').length },
  ];
}

function decorate(list: ApplicationListItem[]) {
  return list.map((item) => ({
    ...item,
    statusText: formatApplicationStatus(item.status),
    contactText: item.canViewPublisherContact ? '联系方式可见' : '联系方式未释放',
  }));
}

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    tabs: MY_APPLICATION_STATUS_TABS,
    activeStatus: 'all',
    rawList: [] as ApplicationListItem[],
    list: [] as Array<ApplicationListItem & { statusText?: string; contactText?: string }>,
    stats: [] as Array<{ label: string; value: number }>,
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

    this.setData({
      list: decorate(nextList),
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
});
