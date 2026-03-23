"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryStore = void 0;
exports.setDiscoveryFilter = setDiscoveryFilter;
exports.resetDiscoveryFilter = resetDiscoveryFilter;
exports.pushRecentKeyword = pushRecentKeyword;
const storage_keys_1 = require("../constants/storage-keys");
const create_store_1 = require("./create-store");
const initialState = {
    filter: wx.getStorageSync(storage_keys_1.STORAGE_KEYS.discoveryFilter) || {},
    recentKeywords: wx.getStorageSync(storage_keys_1.STORAGE_KEYS.recentKeywords) || [],
};
exports.discoveryStore = (0, create_store_1.createStore)(initialState);
function setDiscoveryFilter(filter) {
    exports.discoveryStore.setState({ filter });
    wx.setStorageSync(storage_keys_1.STORAGE_KEYS.discoveryFilter, filter);
    if (filter.city) {
        wx.setStorageSync(storage_keys_1.STORAGE_KEYS.recentCity, filter.city);
    }
}
function resetDiscoveryFilter() {
    setDiscoveryFilter({});
}
function pushRecentKeyword(keyword) {
    const normalized = keyword.trim();
    if (!normalized) {
        return;
    }
    const current = exports.discoveryStore.getState().recentKeywords.filter((item) => item !== normalized);
    const next = [normalized, ...current].slice(0, 8);
    exports.discoveryStore.setState({ recentKeywords: next });
    wx.setStorageSync(storage_keys_1.STORAGE_KEYS.recentKeywords, next);
}
