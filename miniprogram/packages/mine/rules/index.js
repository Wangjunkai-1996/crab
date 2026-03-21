"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ui_store_1 = require("../../../stores/ui.store");
Page({
    data: {
        topInset: 0,
    },
    onLoad() {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
        });
    },
});
