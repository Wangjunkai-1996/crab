import type { NoticeCardItem } from '../../models/notice';
import { list as listNotices } from '../../services/notice.service';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { discoveryStore, pushRecentKeyword } from '../../stores/discovery.store';
import { uiStore } from '../../stores/ui.store';
import { formatCategory, formatCooperationType, formatNoticeStatus, formatPlatform } from '../../utils/formatter';
import { PAGE_STATUS } from '../../utils/page-state';

function buildFilterChips() {
  const filter = discoveryStore.getState().filter as Record<string, string>;
  const chips: string[] = [];

  if (filter.cooperationPlatform) {
    chips.push(formatPlatform(filter.cooperationPlatform));
  }

  if (filter.cooperationCategory) {
    chips.push(formatCategory(filter.cooperationCategory));
  }

  if (filter.city) {
    chips.push(filter.city);
  }

  return chips;
}

function decorate(list: NoticeCardItem[]) {
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

Page({
  data: {
    topInset: 0,
    keyword: '',
    hasSearched: false,
    pageState: PAGE_STATUS.ready,
    notices: [] as NoticeCardItem[],
    recentKeywords: [] as string[],
    filterChips: [] as string[],
    resultCountText: '未搜索',
    errorText: '',
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      keyword: query.keyword || '',
      recentKeywords: discoveryStore.getState().recentKeywords,
      filterChips: buildFilterChips(),
    });

    if (query.keyword) {
      this.onSearchSubmit();
    }
  },

  onShow() {
    this.setData({
      recentKeywords: discoveryStore.getState().recentKeywords,
      filterChips: buildFilterChips(),
    });
  },

  onKeywordInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      keyword: event.detail.value,
    });
  },

  async onSearchSubmit() {
    const keyword = this.data.keyword.trim();

    if (!keyword) {
      this.setData({
        hasSearched: false,
        notices: [],
        pageState: PAGE_STATUS.ready,
        resultCountText: '未搜索',
      });
      return;
    }

    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
      hasSearched: true,
    });

    try {
      await ensureBootstrapReady();
      const filter = discoveryStore.getState().filter;
      const result = await listNotices({
        ...filter,
        keyword,
      });

      pushRecentKeyword(keyword);
      this.setData({
        notices: decorate(result.list),
        recentKeywords: discoveryStore.getState().recentKeywords,
        filterChips: buildFilterChips(),
        resultCountText: `结果 ${result.list.length}`,
        pageState: result.list.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '搜索失败，请稍后重试',
      });
    }
  },

  onTapRecent(event: WechatMiniprogram.TouchEvent) {
    const keyword = `${event.currentTarget.dataset.keyword || ''}`;
    this.setData({
      keyword,
    });
    this.onSearchSubmit();
  },

  onTapNotice(event: WechatMiniprogram.CustomEvent<NoticeCardItem>) {
    wx.navigateTo({
      url: `/pages/plaza/notice-detail?noticeId=${event.detail.noticeId}`,
    });
  },
});
