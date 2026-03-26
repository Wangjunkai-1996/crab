"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDevSmokeHelper = createDevSmokeHelper;
const application_service_1 = require("./application.service");
const creator_service_1 = require("./creator.service");
const notice_service_1 = require("./notice.service");
const publisher_service_1 = require("./publisher.service");
const report_service_1 = require("./report.service");
const request_debug_1 = require("../utils/request-debug");
const request_1 = require("../utils/request");
const FIXED_DEV_NOTICE_ID = 'notice_202603160001';
const MAX_PREVIEW_LENGTH = 600;
const PUBLISHER_PROFILE_SAMPLE_PAYLOAD = {
    identityType: 'merchant',
    displayName: '蟹宝品牌店',
    city: '上海',
    contactType: 'wechat',
    contactValue: 'crab_brand_ops',
    intro: '本地生活餐饮品牌，常规合作以到店探店为主',
};
const CREATOR_CARD_SAMPLE_PAYLOAD = {
    nickname: '阿柚探店',
    city: '上海',
    gender: 'female',
    primaryPlatform: 'xiaohongshu',
    primaryCategory: 'food_beverage',
    followerBand: '5k_10k',
    accountName: '阿柚探店日记',
    accountIdOrLink: 'xiaohongshu://user/creator_2001',
    portfolioImages: ['cloud://domi-dev/creator-portfolio/creator_2001/work-1.jpg'],
    caseDescription: '近 3 个月完成多条本地生活探店合作',
    residentCity: '上海',
    contactType: 'wechat',
    contactValue: 'creator_contact_2001',
};
const APPLICATION_SAMPLE_BASE_PAYLOAD = {
    selfIntroduction: '擅长本地生活探店短视频与图文内容制作。',
    deliverablePlan: '可在到店后 48 小时内交付 1 条短视频和 1 条图文笔记。',
    expectedTerms: '希望支持工作日白天拍摄。',
    portfolioImages: ['cloud://domi-dev/creator-portfolio/creator_2001/work-1.jpg'],
    contactType: 'wechat',
    contactValue: 'creator_contact_2001',
};
function buildInventoryNoticeDraftPayload() {
    return {
        title: 'R58 报名管理样本通告',
        brandName: '蟹宝品牌店',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'food_beverage',
        cooperationType: 'short_video',
        city: '上海',
        settlementType: 'fixed_price',
        budgetRange: '500_1000',
        recruitCount: 1,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        creatorRequirements: '用于技术盘点的最小样本通告',
        cooperationDescription: '仅用于报名管理页技术验收，不参与产品体验结论。',
        attachments: [],
    };
}
function buildInventoryReportPayload(target) {
    return {
        targetType: 'notice',
        targetId: target?.noticeId,
        targetSummary: target?.title || target?.city || 'R63 举报记录样本',
        reasonCode: 'false_information',
        description: '仅用于补齐举报记录页真实样本，不作为产品规则新增。',
        evidenceImages: [],
    };
}
const smokeState = {
    latestResolvedNoticeId: '',
    latestSubmittedApplicationId: '',
    latestWithdrawnApplicationId: '',
    lastBatchAt: 0,
    lastBatchOk: false,
    lastBatchSteps: [],
};
function resetSmokeState() {
    smokeState.latestResolvedNoticeId = '';
    smokeState.latestSubmittedApplicationId = '';
    smokeState.latestWithdrawnApplicationId = '';
    smokeState.lastBatchAt = 0;
    smokeState.lastBatchOk = false;
    smokeState.lastBatchSteps = [];
}
function serializePreview(input, maxLength = MAX_PREVIEW_LENGTH) {
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
function buildErrorPreview(error) {
    if (error instanceof request_1.RequestError) {
        return serializePreview({
            name: error.name,
            code: error.code,
            message: error.message,
            requestId: error.requestId,
            fieldErrors: error.fieldErrors,
            missingFieldKeys: error.missingFieldKeys,
            errorType: error.errorType,
        });
    }
    if (error instanceof Error) {
        return serializePreview({
            name: error.name,
            message: error.message,
        });
    }
    return serializePreview({
        message: 'unknown_error',
    });
}
function buildStepResult(params) {
    return {
        step: params.step,
        ok: params.ok,
        action: params.action,
        requestId: params.requestId || '',
        message: params.message,
        payloadPreview: serializePreview(params.payload),
        responsePreview: serializePreview(params.response),
    };
}
function getRequestRecord(functionName, actionName, startedAt) {
    return (0, request_debug_1.getRequestDebugRecords)().find((record) => record.functionName === functionName && record.action === actionName && record.timestamp >= startedAt - 50);
}
async function executeStep(config) {
    const startedAt = Date.now();
    try {
        const data = await config.run();
        const requestRecord = getRequestRecord(config.functionName, config.actionName, startedAt);
        return {
            data,
            result: {
                step: config.step,
                ok: true,
                action: `${config.functionName}.${config.actionName}`,
                requestId: requestRecord?.requestId || '',
                message: requestRecord?.message || 'ok',
                payloadPreview: requestRecord?.payloadPreview || serializePreview(config.payload),
                responsePreview: requestRecord?.responsePreview || serializePreview(data),
            },
        };
    }
    catch (error) {
        const requestRecord = getRequestRecord(config.functionName, config.actionName, startedAt);
        return {
            result: {
                step: config.step,
                ok: false,
                action: `${config.functionName}.${config.actionName}`,
                requestId: error instanceof request_1.RequestError ? error.requestId : requestRecord?.requestId || '',
                message: error instanceof Error ? error.message : 'unknown_error',
                payloadPreview: requestRecord?.payloadPreview || serializePreview(config.payload),
                responsePreview: requestRecord?.responsePreview || buildErrorPreview(error),
            },
        };
    }
}
async function inspectNoticeCandidate(noticeId, source) {
    try {
        const detail = await (0, notice_service_1.detail)(noticeId);
        const canApply = detail.permissionState.canApply && !detail.permissionState.isOwner && detail.ctaState.primaryAction === 'apply';
        return {
            noticeId,
            source,
            ok: canApply,
            reason: detail.ctaState.disabledReason ||
                detail.ctaState.primaryText ||
                `canApply=${detail.permissionState.canApply},hasApplied=${detail.permissionState.hasApplied},isOwner=${detail.permissionState.isOwner}`,
            ctaAction: detail.ctaState.primaryAction,
        };
    }
    catch (error) {
        return {
            noticeId,
            source,
            ok: false,
            reason: error instanceof Error ? error.message : 'notice_detail_failed',
        };
    }
}
async function resolveApplyableNotice(noticeId) {
    const candidateIds = [];
    const inspected = [];
    const seenNoticeIds = new Set();
    function pushCandidate(targetNoticeId, source) {
        if (!targetNoticeId || seenNoticeIds.has(targetNoticeId)) {
            return;
        }
        seenNoticeIds.add(targetNoticeId);
        candidateIds.push({
            noticeId: targetNoticeId,
            source,
        });
    }
    pushCandidate(noticeId, 'explicit');
    pushCandidate(FIXED_DEV_NOTICE_ID, 'fixed');
    try {
        const noticeList = await (0, notice_service_1.list)({});
        noticeList.list.slice(0, 8).forEach((item) => {
            pushCandidate(item.noticeId, 'list');
        });
    }
    catch (error) {
        inspected.push({
            noticeId: '',
            source: 'list',
            ok: false,
            reason: error instanceof Error ? `notice_list_failed:${error.message}` : 'notice_list_failed',
        });
    }
    for (const candidate of candidateIds) {
        const result = await inspectNoticeCandidate(candidate.noticeId, candidate.source);
        inspected.push(result);
        if (result.ok) {
            return {
                ok: true,
                noticeId: result.noticeId,
                inspected,
            };
        }
    }
    return {
        ok: false,
        noticeId: '',
        inspected,
    };
}
function buildApplicationPayload(noticeId) {
    return {
        noticeId,
        ...APPLICATION_SAMPLE_BASE_PAYLOAD,
    };
}
function createDevSmokeHelper(getRuntimeSummary) {
    function buildSummary() {
        return {
            runtime: getRuntimeSummary(),
            requestLogCount: (0, request_debug_1.getRequestDebugRecords)().length,
            fixedNoticeId: FIXED_DEV_NOTICE_ID,
            latestResolvedNoticeId: smokeState.latestResolvedNoticeId,
            latestSubmittedApplicationId: smokeState.latestSubmittedApplicationId,
            latestWithdrawnApplicationId: smokeState.latestWithdrawnApplicationId,
            lastBatchAt: smokeState.lastBatchAt,
            lastBatchOk: smokeState.lastBatchOk,
            lastBatchSteps: [...smokeState.lastBatchSteps],
        };
    }
    function prepare() {
        const app = getApp();
        (0, request_debug_1.setRequestDebugEnabled)(true);
        (0, request_debug_1.clearRequestDebugRecords)();
        resetSmokeState();
        app.globalData.requestDebug.enabled = true;
        return buildSummary();
    }
    async function rerunBootstrapStep() {
        return executeStep({
            step: 'bootstrap',
            functionName: 'user-bff',
            actionName: 'bootstrap',
            payload: {},
            run: async () => {
                await getApp().bootstrapApp(true);
                return buildSummary().runtime;
            },
        });
    }
    async function readPublisherProfile() {
        const execution = await executeStep({
            step: 'publisher.read',
            functionName: 'publisher-bff',
            actionName: 'getProfile',
            payload: {},
            run: () => (0, publisher_service_1.getProfile)(),
        });
        return execution.result;
    }
    async function upsertPublisherProfileStep() {
        const execution = await executeStep({
            step: 'publisher.write',
            functionName: 'publisher-bff',
            actionName: 'upsertProfile',
            payload: PUBLISHER_PROFILE_SAMPLE_PAYLOAD,
            run: () => (0, publisher_service_1.upsertProfile)(PUBLISHER_PROFILE_SAMPLE_PAYLOAD),
        });
        return execution.result;
    }
    async function readCreatorCard() {
        const execution = await executeStep({
            step: 'creator.read',
            functionName: 'creator-bff',
            actionName: 'getCard',
            payload: {},
            run: () => (0, creator_service_1.getCard)(),
        });
        return execution.result;
    }
    async function upsertCreatorCardStep() {
        const execution = await executeStep({
            step: 'creator.write',
            functionName: 'creator-bff',
            actionName: 'upsertCard',
            payload: CREATOR_CARD_SAMPLE_PAYLOAD,
            run: () => (0, creator_service_1.upsertCard)(CREATOR_CARD_SAMPLE_PAYLOAD),
        });
        return execution.result;
    }
    async function submitApplicationStep(noticeId) {
        const resolvedNotice = await resolveApplyableNotice(noticeId);
        if (!resolvedNotice.ok || !resolvedNotice.noticeId) {
            return buildStepResult({
                step: 'application.submit',
                ok: false,
                action: 'application-bff.submit',
                message: 'no_applyable_notice',
                payload: {
                    requestedNoticeId: noticeId || '',
                    fixedNoticeId: FIXED_DEV_NOTICE_ID,
                },
                response: {
                    inspected: resolvedNotice.inspected,
                },
            });
        }
        smokeState.latestResolvedNoticeId = resolvedNotice.noticeId;
        smokeState.latestSubmittedApplicationId = '';
        const submitPayload = buildApplicationPayload(resolvedNotice.noticeId);
        const execution = await executeStep({
            step: 'application.submit',
            functionName: 'application-bff',
            actionName: 'submit',
            payload: submitPayload,
            run: () => (0, application_service_1.submit)(submitPayload),
        });
        if (execution.result.ok && execution.data?.applicationId) {
            smokeState.latestSubmittedApplicationId = execution.data.applicationId;
        }
        return execution.result;
    }
    async function withdrawLatestApplicationStep() {
        if (!smokeState.latestSubmittedApplicationId) {
            return buildStepResult({
                step: 'application.withdraw',
                ok: true,
                action: 'application-bff.withdraw',
                message: 'skipped:no_current_session_application',
                payload: {},
                response: {
                    latestSubmittedApplicationId: '',
                },
            });
        }
        const applicationId = smokeState.latestSubmittedApplicationId;
        const execution = await executeStep({
            step: 'application.withdraw',
            functionName: 'application-bff',
            actionName: 'withdraw',
            payload: {
                applicationId,
            },
            run: () => (0, application_service_1.withdraw)(applicationId),
        });
        if (execution.result.ok) {
            smokeState.latestWithdrawnApplicationId = applicationId;
        }
        return execution.result;
    }
    async function runFirstBatch() {
        const startedAt = Date.now();
        const steps = [];
        prepare();
        const bootstrap = await rerunBootstrapStep();
        steps.push(bootstrap.result);
        if (bootstrap.result.ok) {
            const publisherRead = await readPublisherProfile();
            steps.push(publisherRead);
        }
        if (steps.every((item) => item.ok)) {
            const publisherWrite = await upsertPublisherProfileStep();
            steps.push(publisherWrite);
        }
        if (steps.every((item) => item.ok)) {
            const creatorRead = await readCreatorCard();
            steps.push(creatorRead);
        }
        if (steps.every((item) => item.ok)) {
            const creatorWrite = await upsertCreatorCardStep();
            steps.push(creatorWrite);
        }
        if (steps.every((item) => item.ok)) {
            const submitResult = await submitApplicationStep();
            steps.push(submitResult);
        }
        if (steps.every((item) => item.ok)) {
            const withdrawResult = await withdrawLatestApplicationStep();
            steps.push(withdrawResult);
        }
        const finishedAt = Date.now();
        const ok = steps.every((item) => item.ok);
        smokeState.lastBatchAt = finishedAt;
        smokeState.lastBatchOk = ok;
        smokeState.lastBatchSteps = [...steps];
        return {
            ...buildSummary(),
            ok,
            startedAt,
            finishedAt,
            steps,
            requestLogs: (0, request_debug_1.getRequestDebugRecords)(),
        };
    }
    async function resolveInventorySamples() {
        const result = {
            publisherNoticeId: '',
            creatorApplicationId: smokeState.latestWithdrawnApplicationId || smokeState.latestSubmittedApplicationId || '',
            searchKeyword: '',
            errors: {},
        };
        let publicSearchNotice = null;
        let preferredPublisherNotice = null;
        try {
            await getApp().bootstrapApp(true);
            const publicNoticeList = await (0, notice_service_1.list)({});
            publicSearchNotice = publicNoticeList.list[0] || null;
            if (publicSearchNotice) {
                result.searchKeyword = publicSearchNotice.title || publicSearchNotice.city || '';
            }
        }
        catch (error) {
            result.errors.searchKeyword = error instanceof Error ? error.message : 'public_notice_resolve_failed';
        }
        try {
            await getApp().bootstrapApp(true);
            const noticeList = await (0, notice_service_1.myList)({});
            const candidates = [...noticeList.list].sort((left, right) => Number(right.applicationCount || 0) - Number(left.applicationCount || 0));
            const inspectPayloadBase = {};
            for (const item of candidates.slice(0, 5)) {
                try {
                    const applications = await (0, application_service_1.publisherList)({
                        ...inspectPayloadBase,
                        noticeId: item.noticeId,
                    });
                    if ((applications.list || []).length > 0) {
                        preferredPublisherNotice = item;
                        break;
                    }
                }
                catch (error) {
                    result.errors.publisherNoticeInspect = error instanceof Error ? error.message : 'publisher_notice_inspect_failed';
                }
            }
            const preferredNotice = preferredPublisherNotice ||
                candidates.find((item) => Number(item.applicationCount || 0) > 0) ||
                candidates[0] ||
                null;
            if (preferredNotice?.noticeId) {
                result.publisherNoticeId = preferredNotice.noticeId;
                preferredPublisherNotice = preferredNotice;
                if (!result.searchKeyword) {
                    result.searchKeyword = preferredNotice.title || preferredNotice.city || '';
                }
            }
            else {
                const createdDraft = await (0, notice_service_1.createDraft)(buildInventoryNoticeDraftPayload());
                result.publisherNoticeId = createdDraft.noticeId || '';
                if (!result.searchKeyword) {
                    result.searchKeyword = '上海';
                }
            }
        }
        catch (error) {
            result.errors.publisherNoticeId = error instanceof Error ? error.message : 'publisher_notice_resolve_failed';
        }
        try {
            await getApp().bootstrapApp(true);
            const applicationList = await (0, application_service_1.myList)({});
            const candidate = applicationList.list.find((item) => item.applicationId && item.status !== 'withdrawn') ||
                applicationList.list[0] ||
                null;
            result.creatorApplicationId = candidate?.applicationId || result.creatorApplicationId;
        }
        catch (error) {
            result.errors.creatorApplicationId = error instanceof Error ? error.message : 'creator_application_resolve_failed';
        }
        try {
            await getApp().bootstrapApp(true);
            const reportList = await (0, report_service_1.myList)();
            if (!(reportList.list || []).length) {
                await (0, report_service_1.submit)(buildInventoryReportPayload(publicSearchNotice || preferredPublisherNotice));
            }
        }
        catch (error) {
            result.errors.reportRecordSample = error instanceof Error ? error.message : 'report_record_seed_failed';
        }
        return result;
    }
    return {
        prepare,
        getSummary: buildSummary,
        readPublisherProfile,
        upsertPublisherProfile: upsertPublisherProfileStep,
        readCreatorCard,
        upsertCreatorCard: upsertCreatorCardStep,
        submitApplication: submitApplicationStep,
        withdrawLatestApplication: withdrawLatestApplicationStep,
        runFirstBatch,
        resolveInventorySamples,
    };
}
