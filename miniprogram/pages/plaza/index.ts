import { COOPERATION_CATEGORY_OPTIONS, COOPERATION_PLATFORM_OPTIONS } from '../../constants/enums';
import { ROUTES } from '../../constants/routes';
import { RUNTIME_MODE_LABELS } from '../../constants/ui';
import type { NoticeCardItem } from '../../models/notice';
import { list as listNotices } from '../../services/notice.service';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { discoveryStore, resetDiscoveryFilter, setDiscoveryFilter } from '../../stores/discovery.store';
import { uiStore } from '../../stores/ui.store';
import { formatCategory, formatCooperationType, formatNoticeStatus, formatPlatform } from '../../utils/formatter';
import { PAGE_STATUS, resolveListPageStatus } from '../../utils/page-state';

function sanitizeFilter(filter: Record<string, string>) {
  return Object.keys(filter).reduce<Record<string, string>>((result, key) => {
    if (filter[key]) {
      result[key] = filter[key];
    }

    return result;
  }, {});
}

function decorateCards(list: NoticeCardItem[]) {
  return list.map((item) => ({
    ...item,
    platformLabel: formatPlatform(item.cooperationPlatform),
    categoryLabel: formatCategory(item.cooperationCategory),
    cooperationTypeLabel: item.cooperationType ? formatCooperationType(item.cooperationType) : '待补充',
    metaText: item.createdAt ? `${item.city} · ${item.createdAt}` : item.city,
    publisherText:
      typeof item.publisherSummary?.profileCompleteness === 'number'
        ? `${item.publisherSummary.displayName} · 资料完整度 ${item.publisherSummary.profileCompleteness}%`
        : item.publisherSummary.displayName,
    statusText: formatNoticeStatus(item.statusTag),
  }));
}

function buildChips(filter: Record<string, string>) {
  const chips = [] as Array<{ label: string; value: string; active: boolean }>;

  if (filter.cooperationPlatform) {
    chips.push({
      label: formatPlatform(filter.cooperationPlatform),
      value: filter.cooperationPlatform,
      active: true,
    });
  }

  if (filter.cooperationCategory) {
    chips.push({
      label: formatCategory(filter.cooperationCategory),
      value: filter.cooperationCategory,
      active: true,
    });
  }

  if (filter.city) {
    chips.push({
      label: filter.city,
      value: 'city',
      active: true,
    });
  }

  if (!chips.length) {
    chips.push({
      label: '全部',
      value: 'all',
      active: true,
    });
  }

  return chips;
}

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    notices: [] as NoticeCardItem[],
    chipItems: [] as Array<{ label: string; value: string; active: boolean }>,
    filterVisible: false,
    selectedPlatform: '',
    selectedCategory: '',
    currentFilter: {} as Record<string, string>,
    platformOptions: COOPERATION_PLATFORM_OPTIONS,
    categoryOptions: COOPERATION_CATEGORY_OPTIONS,
    runtimeBadgeText: RUNTIME_MODE_LABELS.mock,
    emptyTitle: '暂时没有匹配通告',
    emptyDescription: '可以试着放宽平台或领域条件，看看更多合作机会。',
    errorText: '',
  },

  onLoad() {
    const app = getApp<IAppOption>();
    const filter = discoveryStore.getState().filter as Record<string, string>;

    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      runtimeBadgeText: RUNTIME_MODE_LABELS[app.globalData.runtimeMode],
      currentFilter: filter,
      selectedPlatform: filter.cooperationPlatform || '',
      selectedCategory: filter.cooperationCategory || '',
      chipItems: buildChips(filter),
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
      const filter = discoveryStore.getState().filter as Record<string, string>;
      const result = await listNotices(filter);
      const nextFilter = (result.filterEcho || filter) as Record<string, string>;
      const hasFilter = Object.keys(nextFilter).length > 0;

      this.setData({
        notices: decorateCards(result.list),
        pageState: resolveListPageStatus(result.list),
        chipItems: buildChips(nextFilter),
        currentFilter: nextFilter,
        selectedPlatform: nextFilter.cooperationPlatform || '',
        selectedCategory: nextFilter.cooperationCategory || '',
        emptyTitle: hasFilter ? '当前筛选下暂无通告' : '暂时没有匹配通告',
        emptyDescription: hasFilter ? '已选条件会保留，你可以继续调整平台或领域条件。' : '可以试着放宽平台或领域条件，看看更多合作机会。',
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '广场加载失败，请稍后重试',
      });
    }
  },

  onTapSearch() {
    wx.navigateTo({
      url: ROUTES.search,
    });
  },

  onOpenFilter() {
    this.setData({
      filterVisible: true,
    });
  },

  onCloseFilter() {
    this.setData({
      filterVisible: false,
      selectedPlatform: this.data.currentFilter.cooperationPlatform || '',
      selectedCategory: this.data.currentFilter.cooperationCategory || '',
    });
  },

  onSelectPlatform(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const value = event.detail.value;

    this.setData({
      selectedPlatform: this.data.selectedPlatform === value ? '' : value,
    });
  },

  onSelectCategory(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const value = event.detail.value;

    this.setData({
      selectedCategory: this.data.selectedCategory === value ? '' : value,
    });
  },

  onResetFilter() {
    resetDiscoveryFilter();
    this.setData({
      filterVisible: false,
      chipItems: buildChips({}),
      currentFilter: {},
      selectedPlatform: '',
      selectedCategory: '',
    });
    this.loadPage();
  },

  onConfirmFilter() {
    const nextFilter = sanitizeFilter({
      city: this.data.currentFilter.city || '',
      cooperationPlatform: this.data.selectedPlatform,
      cooperationCategory: this.data.selectedCategory,
    });

    setDiscoveryFilter(nextFilter);
    this.setData({
      filterVisible: false,
      currentFilter: nextFilter,
      chipItems: buildChips(nextFilter),
    });
    this.loadPage();
  },

  onTapChip(event: WechatMiniprogram.CustomEvent<{ item: { value: string } }>) {
    if (event.detail.item.value === 'all') {
      this.onResetFilter();
    }
  },

  onTapNotice(event: WechatMiniprogram.CustomEvent<NoticeCardItem>) {
    wx.navigateTo({
      url: `${ROUTES.noticeDetail}?noticeId=${event.detail.noticeId}`,
    });
  },

  onRetry() {
    this.loadPage();
  },
});
