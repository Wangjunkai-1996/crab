import { ROUTES } from '../../constants/routes';
import type { NoticeCardItem } from '../../models/notice';
import { list as listNotices } from '../../services/notice.service';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { discoveryStore, pushRecentKeyword, resetDiscoveryFilter } from '../../stores/discovery.store';
import { uiStore } from '../../stores/ui.store';
import { formatCategory, formatCooperationType, formatNoticeStatus, formatPlatform } from '../../utils/formatter';
import { PAGE_STATUS } from '../../utils/page-state';
import { navigateByRoute } from '../../utils/router';

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

function buildSuggestedKeywords(keyword: string, recentKeywords: string[], filterChips: string[]) {
  const seeds = [keyword, ...recentKeywords, ...filterChips, '上海', '探店', '小红书'];
  const seen = new Set<string>();

  return seeds.filter((item) => {
    const normalized = `${item || ''}`.trim();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  }).slice(0, 6);
}

function decodeKeyword(value: string) {
  const normalized = `${value || ''}`.trim();

  if (!normalized) {
    return '';
  }

  try {
    return decodeURIComponent(normalized);
  } catch (error) {
    return normalized;
  }
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
    exactNotices: [] as NoticeCardItem[],
    relaxedNotices: [] as NoticeCardItem[],
    recentKeywords: [] as string[],
    filterChips: [] as string[],
    suggestionKeywords: [] as string[],
    resultCountText: '未搜索',
    searchSummaryText: '还没开始搜索时，先想好品牌、城市或合作形式里的任意一个关键词就够了。',
    errorText: '',
    searchMode: 'idle' as 'idle' | 'exact' | 'relaxed' | 'empty',
  },

  onLoad(query: Record<string, string>) {
    const recentKeywords = discoveryStore.getState().recentKeywords;
    const filterChips = buildFilterChips();
    const keyword = decodeKeyword(query.keyword || '');

    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      keyword,
      recentKeywords,
      filterChips,
      suggestionKeywords: buildSuggestedKeywords(keyword, recentKeywords, filterChips),
    });

    if (keyword) {
      this.onSearchSubmit();
    }
  },

  onShow() {
    const recentKeywords = discoveryStore.getState().recentKeywords;
    const filterChips = buildFilterChips();

    this.setData({
      recentKeywords,
      filterChips,
      suggestionKeywords: buildSuggestedKeywords(this.data.keyword, recentKeywords, filterChips),
    });
  },

  onKeywordInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const keyword = event.detail.value;

    this.setData({
      keyword,
      suggestionKeywords: buildSuggestedKeywords(keyword, this.data.recentKeywords, this.data.filterChips),
    });
  },

  async onSearchSubmit() {
    const keyword = this.data.keyword.trim();

    if (!keyword) {
      this.setData({
        hasSearched: false,
        exactNotices: [],
        relaxedNotices: [],
        pageState: PAGE_STATUS.ready,
        resultCountText: '未搜索',
        searchMode: 'idle',
        searchSummaryText: '还没开始搜索时，先想好品牌、城市或合作形式里的任意一个关键词就够了。',
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
      const filterChips = buildFilterChips();
      const exactResult = await listNotices({
        ...filter,
        keyword,
      });
      const hasFilter = filterChips.length > 0;
      let relaxedNotices: NoticeCardItem[] = [];
      let searchMode: 'exact' | 'relaxed' | 'empty' = exactResult.list.length ? 'exact' : 'empty';

      if (!exactResult.list.length && hasFilter) {
        const relaxedResult = await listNotices({
          keyword,
        });
        relaxedNotices = decorate(relaxedResult.list);

        if (relaxedNotices.length) {
          searchMode = 'relaxed';
        }
      }

      pushRecentKeyword(keyword);

      const exactNotices = decorate(exactResult.list);
      const resultCountText = exactNotices.length
        ? `命中 ${exactNotices.length}`
        : relaxedNotices.length
          ? `当前筛选 0 / 放宽后 ${relaxedNotices.length}`
          : '暂无结果';
      const searchSummaryText = exactNotices.length
        ? '已按当前筛选命中结果，可以直接继续往详情页判断是否值得报名。'
        : relaxedNotices.length
          ? '当前筛选太窄，但同关键词下仍有真实合作。下面先给你放宽筛选后的建议结果，再决定要不要清空筛选重搜。'
          : hasFilter
            ? '当前筛选和关键词下都没有命中结果，建议放宽筛选后再试。'
            : '当前关键词下还没有更匹配的合作，可以换个品牌、城市或平台词继续试。';

      this.setData({
        exactNotices,
        relaxedNotices,
        recentKeywords: discoveryStore.getState().recentKeywords,
        filterChips,
        suggestionKeywords: buildSuggestedKeywords(keyword, discoveryStore.getState().recentKeywords, filterChips),
        resultCountText,
        searchSummaryText,
        searchMode,
        pageState: exactNotices.length || relaxedNotices.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
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
      suggestionKeywords: buildSuggestedKeywords(keyword, this.data.recentKeywords, this.data.filterChips),
    });
    this.onSearchSubmit();
  },

  onTapSuggestion(event: WechatMiniprogram.TouchEvent) {
    const keyword = `${event.currentTarget.dataset.keyword || ''}`;
    this.setData({
      keyword,
      suggestionKeywords: buildSuggestedKeywords(keyword, this.data.recentKeywords, this.data.filterChips),
    });
    this.onSearchSubmit();
  },

  onTapNotice(event: WechatMiniprogram.CustomEvent<NoticeCardItem>) {
    wx.navigateTo({
      url: `/pages/plaza/notice-detail?noticeId=${event.detail.noticeId}`,
    });
  },

  onClearFiltersAndSearch() {
    resetDiscoveryFilter();
    const filterChips = buildFilterChips();

    this.setData({
      filterChips,
      suggestionKeywords: buildSuggestedKeywords(this.data.keyword, this.data.recentKeywords, filterChips),
    });
    this.onSearchSubmit();
  },

  onBackToPlaza() {
    navigateByRoute(ROUTES.plaza);
  },
});
