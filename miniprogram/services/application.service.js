"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWithdrawBlockReason = getWithdrawBlockReason;
exports.submit = submit;
exports.withdraw = withdraw;
exports.myList = myList;
exports.detail = detail;
exports.publisherList = publisherList;
exports.publisherDetail = publisherDetail;
exports.markViewed = markViewed;
exports.markContactPending = markContactPending;
exports.markCommunicating = markCommunicating;
exports.markRejected = markRejected;
exports.markCompleted = markCompleted;
exports.revealCreatorContact = revealCreatorContact;
const formatter_1 = require("../utils/formatter");
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'application-bff';
const PUBLISHER_ACTION_KEYS = [
    'markViewed',
    'markContactPending',
    'markCommunicating',
    'markRejected',
    'markCompleted',
    'revealCreatorContact',
];
const CREATOR_WITHDRAWABLE_STATUSES = ['applied', 'viewed'];
function mapApplicationListItem(item) {
    return {
        applicationId: item.applicationId,
        noticeId: item.noticeId,
        noticeTitle: item.noticeTitle,
        budgetSummary: item.budgetSummary,
        city: item.city,
        status: item.status,
        publisherSummary: {
            publisherUserId: item.publisherSummary?.publisherUserId,
            displayName: item.publisherSummary?.displayName || '',
        },
        canViewPublisherContact: !!item.canViewPublisherContact,
        updatedAt: item.updatedAt,
        stageHint: item.stageHint || (0, formatter_1.formatApplicationStatus)(item.status),
    };
}
function mapContactText(contact) {
    if (typeof contact === 'string') {
        return contact;
    }
    if (!contact?.contactValue) {
        return '';
    }
    return `${contact.contactType || '联系方式'}：${contact.contactValue}`;
}
function mapTimelineItem(item) {
    return {
        key: item.key,
        label: item.label,
        time: item.time || item.at || '待更新',
        description: item.description,
    };
}
function mapRevealState(state) {
    const code = typeof state === 'string' ? state : state?.stage;
    return code === 'revealed' || code === 'masked' || code === 'hidden' ? code : 'hidden';
}
function mapApplicationDetail(data) {
    return {
        application: {
            applicationId: data.application.applicationId,
            noticeId: data.application.noticeId,
            status: data.application.status,
            selfIntroduction: data.application.selfIntroduction,
            deliverablePlan: data.application.deliverablePlan,
            expectedTerms: data.application.expectedTerms,
            portfolioImages: data.application.portfolioImages || [],
            createdAt: data.application.createdAt,
        },
        noticeSummary: {
            noticeId: data.noticeSummary.noticeId,
            title: data.noticeSummary.title,
            city: data.noticeSummary.city,
            budgetSummary: data.noticeSummary.budgetSummary,
            status: data.noticeSummary.status,
        },
        publisherSummary: {
            publisherUserId: data.publisherSummary.publisherUserId,
            publisherProfileId: data.publisherSummary.publisherProfileId,
            displayName: data.publisherSummary.displayName,
            city: data.publisherSummary.city,
        },
        permissionState: {
            canViewPublisherContact: !!data.permissionState.canViewPublisherContact,
        },
        timeline: (data.timeline || []).map(mapTimelineItem),
        publisherContactRevealState: mapRevealState(data.publisherContactRevealState),
        maskedOrFullPublisherContact: mapContactText(data.maskedOrFullPublisherContact),
    };
}
function mapPublisherListItem(item) {
    return {
        applicationId: item.applicationId,
        creatorCardSnapshot: item.creatorCardSnapshot,
        status: item.status,
        publisherViewedAt: item.publisherViewedAt || undefined,
        contactRevealState: item.contactRevealState,
    };
}
function mapAvailableActions(actions) {
    return (actions || []).filter((action) => PUBLISHER_ACTION_KEYS.includes(action));
}
function mapPublisherDetail(data) {
    return {
        application: {
            applicationId: data.application.applicationId,
            status: data.application.status,
            selfIntroduction: data.application.selfIntroduction,
            deliverablePlan: data.application.deliverablePlan,
            expectedTerms: data.application.expectedTerms || undefined,
        },
        creatorSummary: data.creatorSummary,
        maskedOrFullCreatorContact: data.maskedOrFullCreatorContact,
        creatorContactRevealState: data.creatorContactRevealState,
        availableActions: mapAvailableActions(data.availableActions),
    };
}
function getWithdrawBlockReason(status) {
    if (!status) {
        return '';
    }
    if (!CREATOR_WITHDRAWABLE_STATUSES.includes(status)) {
        return '当前报名已进入处理阶段，暂不支持撤回。';
    }
    return '';
}
function submit(payload) {
    return (0, request_1.request)(FUNCTION_NAME, 'submit', payload);
}
function withdraw(applicationId, options = {}) {
    const blockedReason = getWithdrawBlockReason(options.currentStatus);
    if (blockedReason) {
        return Promise.reject(new Error(blockedReason));
    }
    return (0, request_1.request)(FUNCTION_NAME, 'withdraw', {
        applicationId,
    });
}
function myList(payload = {}) {
    return (0, request_1.request)(FUNCTION_NAME, 'myList', payload, (data) => ({
        list: (data.list || []).map(mapApplicationListItem),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
    }));
}
function detail(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'detail', {
        applicationId,
    }, mapApplicationDetail);
}
function publisherList(payload) {
    return (0, request_1.request)(FUNCTION_NAME, 'publisherList', payload, (data) => ({
        list: (data.list || []).map(mapPublisherListItem),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
    }));
}
function publisherDetail(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'publisherDetail', {
        applicationId,
    }, mapPublisherDetail);
}
function markViewed(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'markViewed', {
        applicationId,
    });
}
function markContactPending(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'markContactPending', {
        applicationId,
    });
}
function markCommunicating(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'markCommunicating', {
        applicationId,
    });
}
function markRejected(applicationId, reasonText) {
    return (0, request_1.request)(FUNCTION_NAME, 'markRejected', {
        applicationId,
        reasonText,
    });
}
function markCompleted(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'markCompleted', {
        applicationId,
    });
}
function revealCreatorContact(applicationId) {
    return (0, request_1.request)(FUNCTION_NAME, 'revealCreatorContact', {
        applicationId,
    });
}
