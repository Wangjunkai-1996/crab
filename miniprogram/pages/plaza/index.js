"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../constants/enums");
const routes_1 = require("../../constants/routes");
const ui_1 = require("../../constants/ui");
const notice_service_1 = require("../../services/notice.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const discovery_store_1 = require("../../stores/discovery.store");
const ui_store_1 = require("../../stores/ui.store");
const formatter_1 = require("../../utils/formatter");
const page_state_1 = require("../../utils/page-state");
function sanitizeFilter(filter) {
    return Object.keys(filter).reduce((result, key) => {
        if (filter[key]) {
            result[key] = filter[key];
        }
        return result;
    }, {});
}
function decorateCards(list) {
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
function buildChips(filter) {
    const chips = [];
    if (filter.cooperationPlatform) {
        chips.push({
            label: (0, formatter_1.formatPlatform)(filter.cooperationPlatform),
            value: filter.cooperationPlatform,
            active: true,
        });
    }
    if (filter.cooperationCategory) {
        chips.push({
            label: (0, formatter_1.formatCategory)(filter.cooperationCategory),
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
        pageState: page_state_1.PAGE_STATUS.loading,
        notices: [],
        chipItems: [],
        filterVisible: false,
        selectedPlatform: '',
        selectedCategory: '',
        currentFilter: {},
        platformOptions: enums_1.COOPERATION_PLATFORM_OPTIONS,
        categoryOptions: enums_1.COOPERATION_CATEGORY_OPTIONS,
        runtimeBadgeText: ui_1.RUNTIME_MODE_LABELS.mock,
        emptyTitle: '暂时没有匹配通告',
        emptyDescription: '可以试着放宽平台或领域条件，看看更多合作机会。',
        errorText: '',
    },
    onLoad() {
        const app = getApp();
        const filter = discovery_store_1.discoveryStore.getState().filter;
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            runtimeBadgeText: ui_1.RUNTIME_MODE_LABELS[app.globalData.runtimeMode],
            currentFilter: filter,
            selectedPlatform: filter.cooperationPlatform || '',
            selectedCategory: filter.cooperationCategory || '',
            chipItems: buildChips(filter),
        });
        this.loadPage();
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const filter = discovery_store_1.discoveryStore.getState().filter;
            const result = await (0, notice_service_1.list)(filter);
            const nextFilter = (result.filterEcho || filter);
            const hasFilter = Object.keys(nextFilter).length > 0;
            this.setData({
                notices: decorateCards(result.list),
                pageState: (0, page_state_1.resolveListPageStatus)(result.list),
                chipItems: buildChips(nextFilter),
                currentFilter: nextFilter,
                selectedPlatform: nextFilter.cooperationPlatform || '',
                selectedCategory: nextFilter.cooperationCategory || '',
                emptyTitle: hasFilter ? '当前筛选下暂无通告' : '暂时没有匹配通告',
                emptyDescription: hasFilter ? '已选条件会保留，你可以继续调整平台或领域条件。' : '可以试着放宽平台或领域条件，看看更多合作机会。',
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '广场加载失败，请稍后重试',
            });
        }
    },
    onTapSearch() {
        wx.navigateTo({
            url: routes_1.ROUTES.search,
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
    onSelectPlatform(event) {
        const value = event.detail.value;
        this.setData({
            selectedPlatform: this.data.selectedPlatform === value ? '' : value,
        });
    },
    onSelectCategory(event) {
        const value = event.detail.value;
        this.setData({
            selectedCategory: this.data.selectedCategory === value ? '' : value,
        });
    },
    onResetFilter() {
        (0, discovery_store_1.resetDiscoveryFilter)();
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
        (0, discovery_store_1.setDiscoveryFilter)(nextFilter);
        this.setData({
            filterVisible: false,
            currentFilter: nextFilter,
            chipItems: buildChips(nextFilter),
        });
        this.loadPage();
    },
    onTapChip(event) {
        if (event.detail.item.value === 'all') {
            this.onResetFilter();
        }
    },
    onTapNotice(event) {
        wx.navigateTo({
            url: `${routes_1.ROUTES.noticeDetail}?noticeId=${event.detail.noticeId}`,
        });
    },
    onRetry() {
        this.loadPage();
    },
});
