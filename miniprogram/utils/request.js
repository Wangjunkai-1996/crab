"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestError = void 0;
exports.request = request;
const ui_1 = require("../constants/ui");
const cloud_1 = require("../services/cloud");
const request_debug_1 = require("./request-debug");
const FRIENDLY_ERROR_MESSAGE = {
    20001: '用户上下文获取失败，请稍后重试',
    30001: '当前无权访问该内容',
    40001: '当前账号被限制发布',
    40002: '当前账号被限制报名',
    40003: '参数校验失败，请检查填写内容',
    50001: '当前通告状态不允许执行该操作',
    50002: '当前报名状态不允许执行该操作',
    50003: '请先完善发布方资料',
    50004: '请先完善达人名片',
    50005: '请勿重复报名',
};
class RequestError extends Error {
    constructor(code, message, requestId, extra = {}) {
        super(message);
        const normalizedExtra = extra && typeof extra === 'object' ? extra : {};
        this.name = 'RequestError';
        this.code = code;
        this.requestId = requestId;
        this.fieldErrors = normalizedExtra.fieldErrors;
        this.missingFieldKeys = normalizedExtra.missingFieldKeys;
        this.errorType = normalizedExtra.errorType;
    }
}
exports.RequestError = RequestError;
async function request(functionName, action, payload = {}, adapter) {
    const startedAt = Date.now();
    const runtimeMode = (0, cloud_1.getRuntimeMode)();
    let response;
    try {
        response = await (0, cloud_1.invokeCloudFunction)(functionName, {
            action,
            payload,
            meta: {
                source: ui_1.CLIENT_SOURCE,
                clientVersion: ui_1.APP_VERSION,
            },
        });
    }
    catch (error) {
        (0, request_debug_1.appendRequestDebugRecord)({
            functionName,
            action,
            mode: runtimeMode,
            durationMs: Date.now() - startedAt,
            success: false,
            code: -1,
            message: error instanceof Error ? error.message : 'invokeCloudFunction failed',
            payload,
            response: {
                errorName: error instanceof Error ? error.name : 'UnknownError',
            },
        });
        throw error;
    }
    if (response.code !== 0) {
        (0, request_debug_1.appendRequestDebugRecord)({
            functionName,
            action,
            mode: runtimeMode,
            durationMs: Date.now() - startedAt,
            success: false,
            code: response.code,
            message: response.message || 'RequestError',
            requestId: response.requestId,
            payload,
            response,
        });
        throw new RequestError(response.code, FRIENDLY_ERROR_MESSAGE[response.code] || response.message || '服务开小差了，请稍后重试', response.requestId, response.data);
    }
    (0, request_debug_1.appendRequestDebugRecord)({
        functionName,
        action,
        mode: runtimeMode,
        durationMs: Date.now() - startedAt,
        success: true,
        code: response.code,
        message: response.message || 'ok',
        requestId: response.requestId,
        payload,
        response,
    });
    const data = response.data;
    return adapter ? adapter(data) : data;
}
