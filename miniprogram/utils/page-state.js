"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_STATUS = void 0;
exports.resolveListPageStatus = resolveListPageStatus;
exports.PAGE_STATUS = {
    loading: 'loading',
    ready: 'ready',
    empty: 'empty',
    error: 'error',
    submitting: 'submitting',
};
function resolveListPageStatus(list) {
    return list.length ? exports.PAGE_STATUS.ready : exports.PAGE_STATUS.empty;
}
