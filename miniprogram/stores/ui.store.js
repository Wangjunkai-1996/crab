"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiStore = void 0;
exports.setSafeAreaInfo = setSafeAreaInfo;
exports.setGlobalLoading = setGlobalLoading;
exports.setFeedbackMessage = setFeedbackMessage;
const create_store_1 = require("./create-store");
const initialState = {
    safeArea: {
        statusBarHeight: 0,
        navigationBarHeight: 44,
        topInset: 44,
        bottomInset: 0,
    },
    globalLoading: false,
    feedbackMessage: '',
};
exports.uiStore = (0, create_store_1.createStore)(initialState);
function setSafeAreaInfo(safeArea) {
    exports.uiStore.setState({ safeArea });
}
function setGlobalLoading(globalLoading) {
    exports.uiStore.setState({ globalLoading });
}
function setFeedbackMessage(feedbackMessage) {
    exports.uiStore.setState({ feedbackMessage });
}
