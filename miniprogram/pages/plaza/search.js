"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../constants/routes");
const notice_service_1 = require("../../services/notice.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const discovery_store_1 = require("../../stores/discovery.store");
const ui_store_1 = require("../../stores/ui.store");
const formatter_1 = require("../../utils/formatter");
const page_state_1 = require("../../utils/page-state");
const router_1 = require("../../utils/router");
function buildFilterChips() {
    const filter = discovery_store_1.discoveryStore.getState().filter;
    const chips = [];
    if (filter.cooperationPlatform) {
        chips.push((0, formatter_1.formatPlatform)(filter.cooperationPlatform));
    }
    if (filter.cooperationCategory) {
        chips.push((0, formatter_1.formatCategory)(filter.cooperationCategory));
    }
    if (filter.city) {
        chips.push(filter.city);
    }
    return chips;
}
function buildSuggestedKeywords(keyword, recentKeywords, filterChips) {
    const seeds = [keyword, ...recentKeywords, ...filterChips, '上海', '探店', '小红书'];
    const seen = new Set();
    return seeds.filter((item) => {
        const normalized = `${item || ''}`.trim();
        if (!normalized || seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    }).slice(0, 6);
}
function decodeKeyword(value) {
    const normalized = `${value || ''}`.trim();
    if (!normalized) {
        return '';
    }
    try {
        return decodeURIComponent(normalized);
    }
    catch (error) {
        return normalized;
    }
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        platformLabel: (0, formatter_1.formatPlatform)(item.cooperationPlatform),
        categoryLabel: (0, formatter_1.formatCategory)(item.cooperationCategory),
        cooperationTypeLabel: item.cooperationType ? (0, formatter_1.formatCooperationType)(item.cooperationType) : '待补充',
        metaText: item.createdAt ? `${item.city} · ${item.createdAt}` : item.city,
        publisherText: typeof item.publisherSummary?.profileCompleteness === 'number'
            ? `${item.publisherSummary.displayName} · 资料完整度 ${item.publisherSummary.profileCompleteness}%`
            : item.publisherSummary.displayName,
        statusText: (0, formatter_1.formatNoticeStatus)(item.statusTag),
    }));
}
Page({
    data: {
        topInset: 0,
        keyword: '',
        hasSearched: false,
        pageState: page_state_1.PAGE_STATUS.ready,
        exactNotices: [],
        relaxedNotices: [],
        recentKeywords: [],
        filterChips: [],
        suggestionKeywords: [],
        resultCountText: '未搜索',
        searchSummaryText: '还没开始搜索时，先想好品牌、城市或合作形式里的任意一个关键词就够了。',
        errorText: '',
        searchMode: 'idle',
    },
    onLoad(query) {
        const recentKeywords = discovery_store_1.discoveryStore.getState().recentKeywords;
        const filterChips = buildFilterChips();
        const keyword = decodeKeyword(query.keyword || '');
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
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
        const recentKeywords = discovery_store_1.discoveryStore.getState().recentKeywords;
        const filterChips = buildFilterChips();
        this.setData({
            recentKeywords,
            filterChips,
            suggestionKeywords: buildSuggestedKeywords(this.data.keyword, recentKeywords, filterChips),
        });
    },
    onKeywordInput(event) {
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
                pageState: page_state_1.PAGE_STATUS.ready,
                resultCountText: '未搜索',
                searchMode: 'idle',
                searchSummaryText: '还没开始搜索时，先想好品牌、城市或合作形式里的任意一个关键词就够了。',
            });
            return;
        }
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
            hasSearched: true,
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const filter = discovery_store_1.discoveryStore.getState().filter;
            const filterChips = buildFilterChips();
            const exactResult = await (0, notice_service_1.list)({
                ...filter,
                keyword,
            });
            const hasFilter = filterChips.length > 0;
            let relaxedNotices = [];
            let searchMode = exactResult.list.length ? 'exact' : 'empty';
            if (!exactResult.list.length && hasFilter) {
                const relaxedResult = await (0, notice_service_1.list)({
                    keyword,
                });
                relaxedNotices = decorate(relaxedResult.list);
                if (relaxedNotices.length) {
                    searchMode = 'relaxed';
                }
            }
            (0, discovery_store_1.pushRecentKeyword)(keyword);
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
                recentKeywords: discovery_store_1.discoveryStore.getState().recentKeywords,
                filterChips,
                suggestionKeywords: buildSuggestedKeywords(keyword, discovery_store_1.discoveryStore.getState().recentKeywords, filterChips),
                resultCountText,
                searchSummaryText,
                searchMode,
                pageState: exactNotices.length || relaxedNotices.length ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '搜索失败，请稍后重试',
            });
        }
    },
    onTapRecent(event) {
        const keyword = `${event.currentTarget.dataset.keyword || ''}`;
        this.setData({
            keyword,
            suggestionKeywords: buildSuggestedKeywords(keyword, this.data.recentKeywords, this.data.filterChips),
        });
        this.onSearchSubmit();
    },
    onTapSuggestion(event) {
        const keyword = `${event.currentTarget.dataset.keyword || ''}`;
        this.setData({
            keyword,
            suggestionKeywords: buildSuggestedKeywords(keyword, this.data.recentKeywords, this.data.filterChips),
        });
        this.onSearchSubmit();
    },
    onTapNotice(event) {
        wx.navigateTo({
            url: `/pages/plaza/notice-detail?noticeId=${event.detail.noticeId}`,
        });
    },
    onClearFiltersAndSearch() {
        (0, discovery_store_1.resetDiscoveryFilter)();
        const filterChips = buildFilterChips();
        this.setData({
            filterChips,
            suggestionKeywords: buildSuggestedKeywords(this.data.keyword, this.data.recentKeywords, filterChips),
        });
        this.onSearchSubmit();
    },
    onBackToPlaza() {
        (0, router_1.navigateByRoute)(routes_1.ROUTES.plaza);
    },
});
