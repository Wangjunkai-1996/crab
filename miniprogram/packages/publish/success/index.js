"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../../constants/routes");
const ui_store_1 = require("../../../stores/ui.store");
const router_1 = require("../../../utils/router");
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        noticeId: '',
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            noticeId: query.noticeId || '',
        });
    },
    onPrimaryAction() {
        (0, router_1.navigateByRoute)(routes_1.ROUTES.publishNoticeList);
    },
    onSecondaryAction() {
        (0, router_1.navigateByRoute)(routes_1.ROUTES.plaza);
    },
});
