"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notice_service_1 = require("../../services/notice.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const discovery_store_1 = require("../../stores/discovery.store");
const ui_store_1 = require("../../stores/ui.store");
const formatter_1 = require("../../utils/formatter");
const page_state_1 = require("../../utils/page-state");
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
        notices: [],
        recentKeywords: [],
        filterChips: [],
        resultCountText: '未搜索',
        errorText: '',
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            keyword: query.keyword || '',
            recentKeywords: discovery_store_1.discoveryStore.getState().recentKeywords,
            filterChips: buildFilterChips(),
        });
        if (query.keyword) {
            this.onSearchSubmit();
        }
    },
    onShow() {
        this.setData({
            recentKeywords: discovery_store_1.discoveryStore.getState().recentKeywords,
            filterChips: buildFilterChips(),
        });
    },
    onKeywordInput(event) {
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
                pageState: page_state_1.PAGE_STATUS.ready,
                resultCountText: '未搜索',
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
            const result = await (0, notice_service_1.list)({
                ...filter,
                keyword,
            });
            (0, discovery_store_1.pushRecentKeyword)(keyword);
            this.setData({
                notices: decorate(result.list),
                recentKeywords: discovery_store_1.discoveryStore.getState().recentKeywords,
                filterChips: buildFilterChips(),
                resultCountText: `结果 ${result.list.length}`,
                pageState: result.list.length ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
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
        });
        this.onSearchSubmit();
    },
    onTapNotice(event) {
        wx.navigateTo({
            url: `/pages/plaza/notice-detail?noticeId=${event.detail.noticeId}`,
        });
    },
});
