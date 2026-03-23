"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRequestDebugEnabled = isRequestDebugEnabled;
exports.setRequestDebugEnabled = setRequestDebugEnabled;
exports.getRequestDebugRecords = getRequestDebugRecords;
exports.clearRequestDebugRecords = clearRequestDebugRecords;
exports.appendRequestDebugRecord = appendRequestDebugRecord;
const storage_keys_1 = require("../constants/storage-keys");
const MAX_DEBUG_RECORDS = 40;
function safeGetStorage(key, defaultValue) {
    try {
        const value = wx.getStorageSync(key);
        return (value || defaultValue);
    }
    catch (error) {
        return defaultValue;
    }
}
function safeSetStorage(key, value) {
    try {
        wx.setStorageSync(key, value);
    }
    catch (error) {
        return;
    }
}
function serializePreview(input, maxLength = 500) {
    try {
        const text = JSON.stringify(input);
        if (!text) {
            return '';
        }
        return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }
    catch (error) {
        return '[unserializable]';
    }
}
function isRequestDebugEnabled() {
    return safeGetStorage(storage_keys_1.STORAGE_KEYS.requestDebugEnabled, false);
}
function setRequestDebugEnabled(enabled) {
    safeSetStorage(storage_keys_1.STORAGE_KEYS.requestDebugEnabled, enabled);
}
function getRequestDebugRecords() {
    return safeGetStorage(storage_keys_1.STORAGE_KEYS.requestDebugRecords, []);
}
function clearRequestDebugRecords() {
    safeSetStorage(storage_keys_1.STORAGE_KEYS.requestDebugRecords, []);
}
function appendRequestDebugRecord(input) {
    if (!isRequestDebugEnabled()) {
        return;
    }
    const current = getRequestDebugRecords();
    const record = {
        timestamp: Date.now(),
        functionName: input.functionName,
        action: input.action,
        mode: input.mode,
        durationMs: input.durationMs,
        success: input.success,
        code: input.code,
        message: input.message,
        requestId: input.requestId || '',
        payloadPreview: serializePreview(input.payload),
        responsePreview: serializePreview(input.response),
    };
    const next = [record, ...current].slice(0, MAX_DEBUG_RECORDS);
    safeSetStorage(storage_keys_1.STORAGE_KEYS.requestDebugRecords, next);
}
