"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.detail = detail;
exports.createDraft = createDraft;
exports.updateDraft = updateDraft;
exports.submitReview = submitReview;
exports.myList = myList;
exports.closeNotice = closeNotice;
exports.getRepublishBlockReason = getRepublishBlockReason;
exports.republish = republish;
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'notice-bff';
function mapNoticeCardDto(item) {
    return {
        noticeId: item.noticeId,
        title: item.title,
        cooperationPlatform: item.cooperationPlatform,
        cooperationCategory: item.cooperationCategory,
        cooperationType: item.cooperationType,
        budgetSummary: item.budgetSummary,
        city: item.city,
        deadlineAt: item.deadlineAt,
        createdAt: item.createdAt,
        publisherSummary: {
            displayName: item.publisherSummary.displayName,
            profileCompleteness: item.publisherSummary.profileCompleteness,
        },
        statusTag: item.statusTag.code,
        highlightTag: item.highlightTag,
        applicationCount: item.applicationCount,
    };
}
function mapFilterSummary(filterSummary) {
    return [filterSummary.activeCity, filterSummary.activePlatform, filterSummary.activeCategory].filter(Boolean);
}
function mapFilterEcho(filterEcho) {
    return {
        keyword: filterEcho.keyword || undefined,
        cooperationPlatform: filterEcho.cooperationPlatform || undefined,
        cooperationCategory: filterEcho.cooperationCategory || undefined,
        city: filterEcho.city || undefined,
    };
}
function mapContactText(contact) {
    if (!contact?.contactValue) {
        return '';
    }
    return `${contact.contactType || '联系方式'}：${contact.contactValue}`;
}
function list(payload = {}) {
    return (0, request_1.request)(FUNCTION_NAME, 'list', payload, (data) => ({
        list: (data.list || []).map(mapNoticeCardDto),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        filterSummary: mapFilterSummary(data.filterSummary),
        filterEcho: mapFilterEcho(data.filterEcho),
    }));
}
function detail(noticeId) {
    return (0, request_1.request)(FUNCTION_NAME, 'detail', { noticeId }, (data) => ({
        notice: {
            ...data.notice,
            status: data.notice.status,
            statusTag: data.notice.status,
            brandName: data.notice.brandName,
            recruitCount: data.notice.recruitCount,
            publishedAt: data.notice.publishedAt,
        },
        publisherSummary: data.publisherSummary,
        permissionState: data.permissionState,
        ctaState: {
            primaryAction: data.ctaState.primaryAction,
            primaryText: data.ctaState.primaryText,
            disabledReason: data.ctaState.disabledReason || undefined,
        },
        maskedOrFullContact: mapContactText(data.maskedOrFullContact),
    }));
}
function createDraft(notice) {
    return (0, request_1.request)(FUNCTION_NAME, 'createDraft', {
        notice,
    });
}
function updateDraft(noticeId, notice) {
    return (0, request_1.request)(FUNCTION_NAME, 'updateDraft', {
        noticeId,
        notice,
    });
}
function submitReview(noticeId) {
    return (0, request_1.request)(FUNCTION_NAME, 'submitReview', {
        noticeId,
    });
}
function myList(payload = {}) {
    return (0, request_1.request)(FUNCTION_NAME, 'myList', payload, (data) => ({
        list: (data.list || []).map(mapNoticeCardDto),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
    }));
}
function closeNotice(noticeId) {
    return (0, request_1.request)(FUNCTION_NAME, 'close', {
        noticeId,
    });
}
function getRepublishBlockReason(status) {
    if (status === 'expired') {
        return '已截止通告补新截止时间的规则仍待拍板，当前暂不开放重新发布。';
    }
    return '';
}
function republish(noticeId, options = {}) {
    const blockedReason = getRepublishBlockReason(options.currentStatus);
    if (blockedReason) {
        return Promise.reject(new Error(blockedReason));
    }
    return (0, request_1.request)(FUNCTION_NAME, 'republish', {
        noticeId,
    });
}
