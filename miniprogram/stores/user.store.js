"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStore = void 0;
exports.hydrateUserStore = hydrateUserStore;
exports.setPreferredViewInStore = setPreferredViewInStore;
exports.setUnreadCount = setUnreadCount;
const storage_keys_1 = require("../constants/storage-keys");
const create_store_1 = require("./create-store");
function getStoredPreferredView() {
    const stored = wx.getStorageSync(storage_keys_1.STORAGE_KEYS.preferredView);
    return stored === 'publisher' || stored === 'creator' ? stored : null;
}
const initialState = {
    userId: '',
    roleFlags: {
        publisherEnabled: false,
        creatorEnabled: false,
    },
    accountStatus: 'normal',
    preferredView: getStoredPreferredView(),
    unreadCount: 0,
};
exports.userStore = (0, create_store_1.createStore)(initialState);
function hydrateUserStore(payload) {
    exports.userStore.setState(payload);
    if (Object.prototype.hasOwnProperty.call(payload, 'preferredView')) {
        if (payload.preferredView) {
            wx.setStorageSync(storage_keys_1.STORAGE_KEYS.preferredView, payload.preferredView);
        }
        else {
            wx.removeStorageSync(storage_keys_1.STORAGE_KEYS.preferredView);
        }
    }
}
function setPreferredViewInStore(preferredView) {
    exports.userStore.setState({ preferredView });
    wx.setStorageSync(storage_keys_1.STORAGE_KEYS.preferredView, preferredView);
}
function setUnreadCount(unreadCount) {
    exports.userStore.setState({ unreadCount });
}
