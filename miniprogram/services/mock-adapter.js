"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCallFunction = mockCallFunction;
const routes_1 = require("../constants/routes");
const formatter_1 = require("../utils/formatter");
let requestSeed = 0;
let draftSeed = 1;
let feedbackSeed = 1;
let reportSeed = 1;
function buildMockIsoTime() {
    return new Date().toISOString();
}
const roleFlags = {
    publisherEnabled: true,
    creatorEnabled: true,
};
let preferredView = 'publisher';
let publisherProfile = {
    publisherProfileId: 'publisher-profile-001',
    userId: 'user-publisher-001',
    identityType: 'personal_pr',
    displayName: '多米品牌合作',
    city: '杭州',
    contactType: '微信号',
    contactValue: 'duomi-brand',
    intro: '主营餐饮与本地生活合作，偏好资料完整、预算明确的合作对接。',
    profileCompleteness: 92,
    status: 'complete',
};
let creatorCard = {
    creatorCardId: 'creator-card-001',
    userId: 'user-creator-001',
    nickname: '西湖探店手记',
    city: '杭州',
    gender: 'female',
    primaryPlatform: 'xiaohongshu',
    primaryCategory: 'food_beverage',
    followerBand: '1w-5w',
    accountName: '西湖探店手记',
    accountIdOrLink: 'xiaohongshu://duomi-demo',
    portfolioImages: ['mock://creator-portfolio/cover-1.png', 'mock://creator-portfolio/cover-2.png'],
    caseDescription: '偏好门店探店、开业活动与城市生活方式内容。',
    residentCity: '杭州',
    contactType: '微信号',
    contactValue: 'duomi-creator',
    profileCompleteness: 88,
    status: 'complete',
};
const publicNoticeFixtures = [
    {
        noticeId: 'notice-001',
        title: '杭州甜品品牌招募小红书探店达人，支持到店拍摄与短视频同步',
        brandName: '甜屿甜品实验室',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'food_beverage',
        cooperationType: 'store_visit',
        settlementType: 'fixed_price',
        budgetRange: '1000_3000',
        budgetSummary: '固定报价 · ¥1000-3000',
        city: '杭州',
        deadlineAt: '2026-03-20 18:00',
        creatorRequirements: '优先杭州本地，美食或本地生活方向，粉丝量级 1 万以上。',
        cooperationDescription: '支持到店探店，需图文或短视频其一，可同步预约拍摄时间。',
        attachments: [],
        status: 'active',
        statusTag: 'active',
        recruitCount: 6,
        createdAt: '2 小时前',
        publisherSummary: {
            displayName: '甜屿甜品实验室',
            city: '杭州',
            historyLabel: '历史发布',
            profileCompleteness: 92,
        },
        permissionState: {
            canApply: true,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: false,
        },
        ctaState: {
            primaryAction: 'apply',
            primaryText: '立即报名',
        },
        maskedOrFullContact: '微信号：duo***lab',
        highlightTag: '急招',
        applicationCount: 3,
    },
    {
        noticeId: 'notice-003',
        title: '杭州新中式茶饮店开业招募图文达人，可同步短视频内容',
        brandName: '西湖茶局',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'local_life',
        cooperationType: 'article',
        settlementType: 'negotiable',
        budgetRange: '500_1000',
        budgetSummary: '可议价 · ¥500-1000',
        city: '杭州',
        deadlineAt: '2026-03-18 20:00',
        creatorRequirements: '支持探店图文或短视频，适合门店新开张种草。',
        cooperationDescription: '门店可提供简餐与拍摄支持，需提前预约。',
        attachments: [],
        status: 'active',
        statusTag: 'active',
        recruitCount: 5,
        createdAt: '1 小时前',
        publisherSummary: {
            displayName: '西湖茶局',
            city: '杭州',
            historyLabel: '新发布',
            profileCompleteness: 90,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: true,
            isOwner: false,
        },
        ctaState: {
            primaryAction: 'view_application',
            primaryText: '查看我的报名',
        },
        maskedOrFullContact: '微信号：xh***tea',
        highlightTag: '推荐匹配',
        applicationCount: 8,
    },
    {
        noticeId: 'notice-006',
        title: '杭州甜品品牌招募小红书探店达人',
        brandName: '多米联调样本',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'food_beverage',
        cooperationType: 'store_visit',
        settlementType: 'fixed_price',
        budgetRange: '1000_3000',
        budgetSummary: '固定报价 · ¥1000-3000',
        city: '杭州',
        deadlineAt: '2026-03-22 18:00',
        creatorRequirements: '需先完善达人名片后才可报名。',
        cooperationDescription: '当前用于游客态 CTA 联调占位。',
        attachments: [],
        status: 'active',
        statusTag: 'active',
        recruitCount: 4,
        createdAt: '刚刚',
        publisherSummary: {
            displayName: '多米联调样本',
            city: '杭州',
            historyLabel: '联调样本',
            profileCompleteness: 95,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: false,
        },
        ctaState: {
            primaryAction: 'complete_creator_card',
            primaryText: '完善达人名片后报名',
            disabledReason: '你还没有完成达人名片',
        },
        maskedOrFullContact: '微信号：duo***demo',
    },
    {
        noticeId: 'notice-002',
        title: '上海精品民宿招募周末探店体验博主，接受图文或 vlog 形式',
        brandName: '山海民宿',
        cooperationPlatform: 'shipinhao',
        cooperationCategory: 'travel_outdoor',
        cooperationType: 'store_visit',
        settlementType: 'free_experience',
        budgetRange: 'not_applicable',
        budgetSummary: '免费体验',
        city: '上海',
        deadlineAt: '2026-03-17 12:00',
        creatorRequirements: '支持周末到店体验，优先旅行户外方向达人。',
        cooperationDescription: '可图文或 vlog 二选一，需提前沟通拍摄时间。',
        attachments: [],
        status: 'expired',
        statusTag: 'expired',
        recruitCount: 3,
        createdAt: '昨天',
        publisherSummary: {
            displayName: '山海民宿',
            city: '上海',
            historyLabel: '历史发布',
            profileCompleteness: 88,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: false,
        },
        ctaState: {
            primaryAction: 'disabled',
            primaryText: '已截止',
            disabledReason: '当前通告已截止，不可新增报名',
        },
        maskedOrFullContact: '微信号：shan***stay',
    },
];
const myNoticeFixtures = [
    {
        noticeId: 'my-notice-001',
        title: '杭州甜品品牌招募小红书探店达人',
        brandName: '多米品牌合作',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'food_beverage',
        cooperationType: 'store_visit',
        settlementType: 'fixed_price',
        budgetRange: '1000_3000',
        budgetSummary: '固定报价 · ¥1000-3000',
        city: '杭州',
        deadlineAt: '2026-03-21 18:00',
        creatorRequirements: '优先杭州本地，美食方向达人。',
        cooperationDescription: '审核通过后会自动进入合作广场。',
        attachments: [],
        status: 'pending_review',
        statusTag: 'pending_review',
        recruitCount: 6,
        createdAt: '今天 10:20',
        publisherSummary: {
            displayName: '多米品牌合作',
            city: '杭州',
            profileCompleteness: 92,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: true,
        },
        ctaState: {
            primaryAction: 'disabled',
            primaryText: '待审核中',
            disabledReason: '待审核阶段不可报名',
        },
        applicationCount: 0,
    },
    {
        noticeId: 'my-notice-002',
        title: '上海咖啡店试营业探店招募',
        brandName: '多米品牌合作',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'local_life',
        cooperationType: 'short_video',
        settlementType: 'free_experience',
        budgetRange: 'not_applicable',
        budgetSummary: '免费体验',
        city: '上海',
        deadlineAt: '2026-03-23 18:00',
        creatorRequirements: '支持图文或短视频，优先上海本地。',
        cooperationDescription: '当前为进行中，可查看报名。',
        attachments: [],
        status: 'active',
        statusTag: 'active',
        recruitCount: 10,
        createdAt: '报名 18',
        publisherSummary: {
            displayName: '多米品牌合作',
            city: '上海',
            profileCompleteness: 92,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: true,
        },
        ctaState: {
            primaryAction: 'view_applications',
            primaryText: '查看报名',
        },
        applicationCount: 18,
    },
    {
        noticeId: 'my-notice-003',
        title: '杭州门店寄拍招募',
        brandName: '多米品牌合作',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'food_beverage',
        cooperationType: 'mail_shoot',
        settlementType: 'negotiable',
        budgetRange: '500_1000',
        budgetSummary: '可议价 · ¥500-1000',
        city: '杭州',
        deadlineAt: '2026-03-15 18:00',
        creatorRequirements: '已收尾。',
        cooperationDescription: '发布方已主动关闭。',
        attachments: [],
        status: 'closed',
        statusTag: 'closed',
        recruitCount: 4,
        createdAt: '昨天',
        publisherSummary: {
            displayName: '多米品牌合作',
            city: '杭州',
            profileCompleteness: 92,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: true,
        },
        ctaState: {
            primaryAction: 'view_applications',
            primaryText: '查看报名',
        },
        applicationCount: 7,
    },
    {
        noticeId: 'my-notice-004',
        title: '杭州新店试营业合作说明补充',
        brandName: '多米品牌合作',
        cooperationPlatform: 'xiaohongshu',
        cooperationCategory: 'local_life',
        cooperationType: 'article',
        settlementType: 'fixed_price',
        budgetRange: '500_1000',
        budgetSummary: '固定报价 · ¥500-1000',
        city: '杭州',
        deadlineAt: '2026-03-24 18:00',
        creatorRequirements: '需要补充达人要求与案例图。',
        cooperationDescription: '当前处于需补充资料阶段，可继续编辑。',
        attachments: [],
        status: 'supplement_required',
        statusTag: 'supplement_required',
        recruitCount: 4,
        createdAt: '补资料中',
        publisherSummary: {
            displayName: '多米品牌合作',
            city: '杭州',
            profileCompleteness: 92,
        },
        permissionState: {
            canApply: false,
            canViewPublisherContact: false,
            hasApplied: false,
            isOwner: true,
        },
        ctaState: {
            primaryAction: 'disabled',
            primaryText: '补资料后重提',
            disabledReason: '当前需补充资料',
        },
        applicationCount: 0,
    },
];
let messages = [
    {
        messageId: 'message-001',
        messageType: 'review',
        title: '你的通告已审核通过',
        summary: '杭州甜品品牌招募小红书探店达人已进入合作广场',
        relatedObjectType: 'notice',
        relatedObjectId: 'notice-001',
        isRead: false,
        timeText: '刚刚',
    },
    {
        messageId: 'message-002',
        messageType: 'application',
        title: '有 3 位达人报名了你的通告',
        summary: '其中 1 位资料完整度较高，建议优先查看作品。',
        relatedObjectType: 'notice',
        relatedObjectId: 'my-notice-002',
        isRead: true,
        readAt: '今天 10:24',
        timeText: '10:24',
    },
    {
        messageId: 'message-003',
        messageType: 'system',
        title: '规则更新提醒',
        summary: '平台补充了置换合作与免费体验的填写规范。',
        relatedObjectType: 'notice',
        relatedObjectId: 'notice-002',
        isRead: true,
        readAt: '昨天 20:18',
        timeText: '昨天',
    },
    {
        messageId: 'message-004',
        messageType: 'application',
        title: '发布方已将你的报名推进到待联系',
        summary: '你的联系方式和发布方联系方式都已按规则释放。',
        relatedObjectType: 'application',
        relatedObjectId: 'application-002',
        isRead: false,
        timeText: '09:18',
    },
];
let applications = [
    {
        applicationId: 'application-001',
        noticeId: 'notice-001',
        noticeTitle: '杭州甜品品牌招募小红书探店达人，支持到店拍摄与短视频同步',
        budgetSummary: '固定报价 · ¥1000-3000',
        city: '杭州',
        status: 'viewed',
        publisherSummary: {
            displayName: '甜屿甜品实验室',
        },
        canViewPublisherContact: false,
        updatedAt: '今天 11:24',
        stageHint: '发布方已查看你的报名',
    },
    {
        applicationId: 'application-002',
        noticeId: 'notice-003',
        noticeTitle: '杭州新中式茶饮店开业招募图文达人，可同步短视频内容',
        budgetSummary: '可议价 · ¥500-1000',
        city: '杭州',
        status: 'contact_pending',
        publisherSummary: {
            displayName: '西湖茶局',
        },
        canViewPublisherContact: true,
        updatedAt: '今天 14:18',
        stageHint: '发布方已标记待联系',
    },
    {
        applicationId: 'application-003',
        noticeId: 'notice-001',
        noticeTitle: '杭州甜品品牌招募小红书探店达人，支持到店拍摄与短视频同步',
        budgetSummary: '固定报价 · ¥1000-3000',
        city: '杭州',
        status: 'communicating',
        publisherSummary: {
            displayName: '甜屿甜品实验室',
        },
        canViewPublisherContact: true,
        updatedAt: '昨天 18:30',
        stageHint: '双方已进入线下沟通',
    },
    {
        applicationId: 'application-004',
        noticeId: 'notice-002',
        noticeTitle: '上海精品民宿招募周末探店体验博主，接受图文或 vlog 形式',
        budgetSummary: '免费体验',
        city: '上海',
        status: 'rejected',
        publisherSummary: {
            displayName: '山海民宿',
        },
        canViewPublisherContact: false,
        updatedAt: '昨天 09:12',
        stageHint: '本次合作未继续推进',
    },
    {
        applicationId: 'application-005',
        noticeId: 'notice-003',
        noticeTitle: '杭州新中式茶饮店开业招募图文达人，可同步短视频内容',
        budgetSummary: '可议价 · ¥500-1000',
        city: '杭州',
        status: 'completed',
        publisherSummary: {
            displayName: '西湖茶局',
        },
        canViewPublisherContact: true,
        updatedAt: '03/15 18:05',
        stageHint: '合作已完成',
    },
];
let publisherApplications = [
    {
        applicationId: 'publisher-application-001',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '西湖探店手记',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'food_beverage',
            followerBand: '1w-5w',
            caseDescription: '擅长甜品探店与门店开业内容。',
        },
        status: 'applied',
        publisherViewedAt: undefined,
        contactRevealState: 'masked',
        creatorContact: '微信号：duomi-creator',
        creatorSummary: {
            displayName: '西湖探店手记',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'food_beverage',
            followerBand: '1w-5w',
            caseDescription: '擅长甜品探店与门店开业内容。',
        },
        application: {
            applicationId: 'publisher-application-001',
            status: 'applied',
            selfIntroduction: '可在 48 小时内完成门店探店图文，并配合一次修改。',
            deliverablePlan: '图文 1 篇，可补充短视频开箱片段。',
            expectedTerms: '希望支持工作日下午到店拍摄。',
        },
    },
    {
        applicationId: 'publisher-application-002',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '城市咖啡日志',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'local_life',
            followerBand: '5k-1w',
            caseDescription: '偏好门店试营业、城市生活方式内容。',
        },
        status: 'viewed',
        publisherViewedAt: '今天 10:32',
        contactRevealState: 'masked',
        creatorContact: '微信号：citycoffee-note',
        creatorSummary: {
            displayName: '城市咖啡日志',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'local_life',
            followerBand: '5k-1w',
            caseDescription: '偏好门店试营业、城市生活方式内容。',
        },
        application: {
            applicationId: 'publisher-application-002',
            status: 'viewed',
            selfIntroduction: '擅长新店试营业种草，适合图文首发。',
            deliverablePlan: '图文 1 篇，必要时补充 9 宫格封面。',
            expectedTerms: '希望预留 1 次文案校对。',
        },
    },
    {
        applicationId: 'publisher-application-003',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '甜品短视频手账',
            city: '杭州',
            primaryPlatform: 'douyin',
            primaryCategory: 'food_beverage',
            followerBand: '1w-5w',
            caseDescription: '可快速产出 15s-30s 门店短视频。',
        },
        status: 'contact_pending',
        publisherViewedAt: '今天 09:18',
        contactRevealState: 'revealed',
        creatorContact: '微信号：dessert-video',
        creatorSummary: {
            displayName: '甜品短视频手账',
            city: '杭州',
            primaryPlatform: 'douyin',
            primaryCategory: 'food_beverage',
            followerBand: '1w-5w',
            caseDescription: '可快速产出 15s-30s 门店短视频。',
        },
        application: {
            applicationId: 'publisher-application-003',
            status: 'contact_pending',
            selfIntroduction: '可在 24 小时内完成到店拍摄与粗剪。',
            deliverablePlan: '短视频 1 条，可加拍 1 条口播版。',
            expectedTerms: '希望到店前确认脚本重点。',
        },
    },
    {
        applicationId: 'publisher-application-004',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '开业探店地图',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'local_life',
            followerBand: '1w-5w',
            caseDescription: '擅长新店开业探店与路线型内容。',
        },
        status: 'communicating',
        publisherViewedAt: '昨天 18:30',
        contactRevealState: 'revealed',
        creatorContact: '微信号：newstore-map',
        creatorSummary: {
            displayName: '开业探店地图',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'local_life',
            followerBand: '1w-5w',
            caseDescription: '擅长新店开业探店与路线型内容。',
        },
        application: {
            applicationId: 'publisher-application-004',
            status: 'communicating',
            selfIntroduction: '可配合门店试营业与开业活动的节点发布。',
            deliverablePlan: '图文 1 篇 + 可选短视频 1 条。',
            expectedTerms: '希望提前确认活动物料。',
        },
    },
    {
        applicationId: 'publisher-application-005',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '城市吃喝研究所',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'food_beverage',
            followerBand: '5w+',
            caseDescription: '粉丝偏本地消费决策，适合门店首发。',
        },
        status: 'rejected',
        publisherViewedAt: '昨天 09:12',
        contactRevealState: 'hidden',
        creatorContact: '微信号：eating-lab',
        creatorSummary: {
            displayName: '城市吃喝研究所',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'food_beverage',
            followerBand: '5w+',
            caseDescription: '粉丝偏本地消费决策，适合门店首发。',
        },
        application: {
            applicationId: 'publisher-application-005',
            status: 'rejected',
            selfIntroduction: '擅长品牌首发与集中口碑种草。',
            deliverablePlan: '图文 1 篇，可联合评论区互动。',
            expectedTerms: '本轮暂无额外补充。',
        },
    },
    {
        applicationId: 'publisher-application-006',
        noticeId: 'my-notice-002',
        creatorCardSnapshot: {
            nickname: '本地生活周报',
            city: '杭州',
            primaryPlatform: 'shipinhao',
            primaryCategory: 'local_life',
            followerBand: '1w-5w',
            caseDescription: '擅长门店试营业、生活方式记录。',
        },
        status: 'completed',
        publisherViewedAt: '03/15 18:05',
        contactRevealState: 'revealed',
        creatorContact: '微信号：weekly-life',
        creatorSummary: {
            displayName: '本地生活周报',
            city: '杭州',
            primaryPlatform: 'shipinhao',
            primaryCategory: 'local_life',
            followerBand: '1w-5w',
            caseDescription: '擅长门店试营业、生活方式记录。',
        },
        application: {
            applicationId: 'publisher-application-006',
            status: 'completed',
            selfIntroduction: '适合门店试营业与活动总结向内容。',
            deliverablePlan: '视频号短视频 1 条，可追加图文回顾。',
            expectedTerms: '合作已完成，当前仅保留历史记录。',
        },
    },
];
let reports = [
    {
        reportId: 'report-001',
        targetType: 'notice',
        targetId: 'notice-002',
        reasonCode: 'false_information',
        status: '处理中',
        resultAction: '待核查',
    },
];
function sleep(duration = 180) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}
function createResponse(data, code = 0, message = 'ok') {
    requestSeed += 1;
    return {
        code,
        message,
        data: data,
        requestId: `mock-${Date.now()}-${requestSeed}`,
    };
}
function buildFilterSummary(filter, total) {
    return {
        total,
        activeCity: filter.city || null,
        activePlatform: filter.cooperationPlatform || null,
        activeCategory: filter.cooperationCategory || null,
    };
}
function buildFilterEcho(filter) {
    return {
        keyword: filter.keyword || '',
        cooperationPlatform: filter.cooperationPlatform || null,
        cooperationCategory: filter.cooperationCategory || null,
        city: filter.city || null,
    };
}
function getUnreadCount() {
    return messages.filter((item) => !item.isRead).length;
}
function buildContactInfo(contactText) {
    if (!contactText) {
        return null;
    }
    const [contactType = '', ...rest] = contactText.split('：');
    const contactValue = rest.join('：') || '';
    return {
        contactType: contactType || null,
        contactValue: contactValue || null,
        isMasked: contactValue.includes('*'),
    };
}
function toNoticeCardDto(item) {
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
        statusTag: {
            code: item.statusTag,
            label: (0, formatter_1.formatNoticeStatus)(item.statusTag),
        },
        highlightTag: item.highlightTag,
        applicationCount: item.applicationCount,
    };
}
function buildMineSummary() {
    const unreadCount = getUnreadCount();
    const isTourist = !roleFlags.publisherEnabled && !roleFlags.creatorEnabled;
    const entryStates = {
        noticeList: {
            locked: !roleFlags.publisherEnabled,
            reason: roleFlags.publisherEnabled ? '' : '需发布方资料',
            actionText: roleFlags.publisherEnabled ? '查看' : '去完善',
        },
        applicationList: {
            locked: !roleFlags.creatorEnabled,
            reason: roleFlags.creatorEnabled ? '' : '需达人名片',
            actionText: roleFlags.creatorEnabled ? '查看' : '去完善',
        },
        creatorCard: {
            locked: false,
            actionText: roleFlags.creatorEnabled ? '维护' : '去完善',
        },
        messages: {
            locked: false,
            actionText: '查看',
        },
    };
    return {
        userSummary: {
            displayName: publisherProfile.displayName,
            avatarText: '多',
            city: publisherProfile.city,
        },
        publisherSummary: {
            noticeCount: myNoticeFixtures.length,
            profileCompleteness: 92,
        },
        creatorSummary: {
            applicationCount: applications.length,
            cardCompleteness: 88,
        },
        messageSummary: {
            unreadCount,
        },
        quickActions: [
            {
                key: 'myNotice',
                label: '我的通告',
                route: routes_1.ROUTES.publishNoticeList,
                badgeText: entryStates.noticeList.locked ? '需发布方资料' : '查看',
                locked: entryStates.noticeList.locked,
                lockedReason: entryStates.noticeList.reason,
            },
            {
                key: 'myApplication',
                label: '我的报名',
                route: routes_1.ROUTES.creatorApplicationList,
                badgeText: entryStates.applicationList.locked ? '需达人名片' : '查看',
                locked: entryStates.applicationList.locked,
                lockedReason: entryStates.applicationList.reason,
            },
            {
                key: 'creatorCard',
                label: '达人名片',
                route: routes_1.ROUTES.creatorCard,
                badgeText: roleFlags.creatorEnabled ? '维护' : '去完善',
            },
            {
                key: 'messages',
                label: '消息中心',
                route: routes_1.ROUTES.messages,
                badgeText: unreadCount ? `${unreadCount} 条未读` : '查看',
            },
            {
                key: 'rules',
                label: '规则说明',
                route: routes_1.ROUTES.mineRules,
                badgeText: '查看',
            },
            {
                key: 'feedback',
                label: '意见反馈',
                route: routes_1.ROUTES.mineFeedback,
                badgeText: '提交',
            },
        ],
        isTourist,
        roleFlags,
        preferredView,
        restrictionSummary: undefined,
        entryStates,
    };
}
function filterPublicNotices(payload) {
    return publicNoticeFixtures.filter((item) => {
        if (item.statusTag !== 'active') {
            return false;
        }
        if (payload.keyword && !`${item.title}${item.brandName}`.includes(payload.keyword)) {
            return false;
        }
        if (payload.cooperationPlatform && item.cooperationPlatform !== payload.cooperationPlatform) {
            return false;
        }
        if (payload.cooperationCategory && item.cooperationCategory !== payload.cooperationCategory) {
            return false;
        }
        if (payload.city && item.city !== payload.city) {
            return false;
        }
        return true;
    });
}
function findNoticeById(noticeId) {
    return [...publicNoticeFixtures, ...myNoticeFixtures].find((item) => item.noticeId === noticeId);
}
function maskContact(value) {
    if (!value) {
        return '';
    }
    const [label, rawValue = ''] = value.split('：');
    if (rawValue.length <= 6) {
        return `${label}：${rawValue.slice(0, 2)}***`;
    }
    return `${label}：${rawValue.slice(0, 3)}***${rawValue.slice(-4)}`;
}
function getPublisherApplicationActions(current) {
    const actions = [];
    if (current.status === 'applied') {
        actions.push('markViewed');
    }
    if (current.status === 'viewed') {
        actions.push('markContactPending', 'markRejected');
    }
    if (current.status === 'contact_pending') {
        actions.push('markCommunicating', 'markRejected');
    }
    if (current.status === 'communicating') {
        actions.push('markCompleted', 'markRejected');
    }
    if (!['rejected', 'withdrawn', 'completed'].includes(current.status) && current.contactRevealState !== 'revealed') {
        actions.push('revealCreatorContact');
    }
    return actions;
}
function findPublisherApplication(applicationId) {
    return publisherApplications.find((item) => item.applicationId === applicationId);
}
function updatePublisherApplication(applicationId, updater) {
    let nextItem;
    publisherApplications = publisherApplications.map((item) => {
        if (item.applicationId !== applicationId) {
            return item;
        }
        nextItem = updater(item);
        return nextItem;
    });
    return nextItem;
}
function buildPublisherApplicationDetail(current) {
    return {
        application: current?.application || {
            applicationId: 'publisher-application-001',
            status: 'applied',
            selfIntroduction: '可在 48 小时内完成门店探店图文，并配合一次修改。',
            deliverablePlan: '图文 1 篇，可补充短视频开箱片段。',
            expectedTerms: '希望支持工作日下午到店拍摄。',
        },
        creatorSummary: current?.creatorSummary || {
            displayName: '西湖探店手记',
            city: '杭州',
            primaryPlatform: 'xiaohongshu',
            primaryCategory: 'food_beverage',
            followerBand: '1w-5w',
            caseDescription: '擅长甜品探店与门店开业内容。',
        },
        maskedOrFullCreatorContact: current?.contactRevealState === 'revealed' ? current.creatorContact : undefined,
        creatorContactRevealState: current?.contactRevealState || 'masked',
        availableActions: current ? getPublisherApplicationActions(current) : ['markViewed', 'revealCreatorContact'],
    };
}
function buildApplicationDetail(current) {
    const status = current?.status || 'contact_pending';
    const canViewPublisherContact = !!current?.canViewPublisherContact;
    const relatedNotice = current?.noticeId ? findNoticeById(current.noticeId) : undefined;
    const timelineMap = {
        applied: [
            {
                label: '你已完成报名',
                time: current?.updatedAt || '刚刚',
                description: '报名理由与名片快照已提交，等待发布方查看。',
            },
            {
                label: '等待发布方查看',
                time: '后续更新',
                description: '查看、待联系、已沟通等进展会在消息中心同步提醒。',
            },
        ],
        viewed: [
            {
                label: '发布方已查看你的报名',
                time: current?.updatedAt || '今天 11:24',
                description: '你的作品和名片已被打开。',
            },
            {
                label: '你已完成报名',
                time: '03/15 09:28',
                description: '报名理由与名片快照已提交。',
            },
            {
                label: '等待进一步沟通',
                time: '后续更新',
                description: '联系方式释放后，会在消息中心同步提醒。',
            },
        ],
        contact_pending: [
            {
                label: '发布方已标记待联系',
                time: current?.updatedAt || '今天 14:18',
                description: '你的联系方式和发布方联系方式都已按规则释放。',
            },
            {
                label: '发布方已查看你的报名',
                time: '今天 11:24',
                description: '作品与名片已被打开。',
            },
            {
                label: '你已完成报名',
                time: '03/15 09:28',
                description: '报名理由与名片快照已提交。',
            },
        ],
        communicating: [
            {
                label: '双方已进入沟通阶段',
                time: current?.updatedAt || '昨天 18:30',
                description: '后续合作进展可继续在这里查看。',
            },
            {
                label: '发布方已标记待联系',
                time: '昨天 17:40',
                description: '联系方式已按规则释放。',
            },
            {
                label: '你已完成报名',
                time: '03/15 09:28',
                description: '报名理由与名片快照已提交。',
            },
        ],
        rejected: [
            {
                label: '本次合作未继续推进',
                time: current?.updatedAt || '昨天 09:12',
                description: '当前记录保留，但不再进入下一阶段。',
            },
            {
                label: '发布方已查看你的报名',
                time: '昨天 08:50',
                description: '你的资料已被查看。',
            },
            {
                label: '你已完成报名',
                time: '03/13 14:08',
            },
        ],
        completed: [
            {
                label: '合作已完成',
                time: current?.updatedAt || '03/15 18:05',
                description: '本次合作已按计划完成。',
            },
            {
                label: '双方已沟通',
                time: '03/15 11:30',
                description: '联系方式已按规则释放。',
            },
            {
                label: '你已完成报名',
                time: '03/14 09:28',
            },
        ],
        withdrawn: [
            {
                label: '你已撤回报名',
                time: current?.updatedAt || '刚刚',
                description: '当前记录保留，但不再继续推进。',
            },
            {
                label: '你已完成报名',
                time: '03/14 09:28',
            },
        ],
    };
    return {
        application: {
            applicationId: current?.applicationId || 'application-002',
            status,
            selfIntroduction: '我擅长门店探店和本地生活内容，可在 48 小时内完成初稿。',
            deliverablePlan: '到店探店图文 1 篇，可选加拍 1 条短视频。',
            expectedTerms: '希望支持工作日下午到店拍摄。',
        },
        noticeSummary: {
            noticeId: current?.noticeId || 'notice-003',
            title: current?.noticeTitle || '杭州新中式茶饮店开业招募图文达人，可同步短视频内容',
            city: current?.city || relatedNotice?.city,
            budgetSummary: current?.budgetSummary || '可议价 · ¥500-1000',
            status: relatedNotice?.statusTag || relatedNotice?.status,
        },
        publisherSummary: {
            displayName: current?.publisherSummary.displayName || '西湖茶局',
            city: relatedNotice?.publisherSummary.city,
        },
        permissionState: {
            canViewPublisherContact,
        },
        timeline: timelineMap[status] || timelineMap.contact_pending,
        publisherContactRevealState: canViewPublisherContact ? 'revealed' : 'hidden',
        maskedOrFullPublisherContact: canViewPublisherContact ? '微信号：duomi-brand' : undefined,
    };
}
const handlers = {
    'user-bff:bootstrap': () => createResponse({
        user: {
            userId: 'user-001',
            roleFlags,
            accountStatus: 'normal',
            preferredView,
        },
        message: {
            unreadCount: getUnreadCount(),
        },
    }),
    'user-bff:mine': () => createResponse(buildMineSummary()),
    'user-bff:setPreferredView': (payload) => {
        const next = payload.preferredView;
        if (next !== 'publisher' && next !== 'creator') {
            return createResponse({
                errorType: 'field_validation',
                fieldErrors: {
                    preferredView: 'preferredView 仅支持 publisher 或 creator',
                },
            }, 40003, '参数校验失败');
        }
        preferredView = next;
        return createResponse({ preferredView });
    },
    'publisher-bff:getProfile': () => createResponse({
        publisherProfile,
        editableFields: ['identityType', 'displayName', 'city', 'contactType', 'contactValue', 'intro'],
        profileCompleteness: publisherProfile?.profileCompleteness || 0,
        missingFieldKeys: [],
    }),
    'publisher-bff:upsertProfile': (payload) => {
        publisherProfile = {
            publisherProfileId: publisherProfile?.publisherProfileId || 'publisher-profile-001',
            userId: publisherProfile?.userId || 'user-publisher-001',
            identityType: `${payload.identityType || publisherProfile?.identityType || ''}`,
            displayName: `${payload.displayName || publisherProfile?.displayName || ''}`,
            city: `${payload.city || publisherProfile?.city || ''}`,
            contactType: `${payload.contactType || publisherProfile?.contactType || ''}`,
            contactValue: `${payload.contactValue || publisherProfile?.contactValue || ''}`,
            intro: `${payload.intro || publisherProfile?.intro || ''}` || undefined,
            profileCompleteness: 100,
            status: 'complete',
        };
        return createResponse({
            publisherProfileId: publisherProfile.publisherProfileId,
            status: 'complete',
            profileCompleteness: 100,
            roleFlags: {
                publisherEnabled: true,
            },
            missingFieldKeys: [],
        });
    },
    'creator-bff:getCard': () => createResponse({
        creatorCard,
        editableFields: ['nickname', 'avatarUrl', 'city', 'gender', 'primaryPlatform', 'primaryCategory', 'followerBand', 'accountName', 'accountIdOrLink', 'portfolioImages', 'caseDescription', 'residentCity', 'contactType', 'contactValue'],
        profileCompleteness: creatorCard?.profileCompleteness || 0,
        missingFieldKeys: [],
    }),
    'creator-bff:upsertCard': (payload) => {
        creatorCard = {
            creatorCardId: creatorCard?.creatorCardId || 'creator-card-001',
            userId: creatorCard?.userId || 'user-creator-001',
            nickname: `${payload.nickname || creatorCard?.nickname || ''}`,
            avatarUrl: `${payload.avatarUrl || creatorCard?.avatarUrl || ''}` || undefined,
            city: `${payload.city || creatorCard?.city || ''}`,
            gender: `${payload.gender || creatorCard?.gender || ''}` || undefined,
            primaryPlatform: `${payload.primaryPlatform || creatorCard?.primaryPlatform || ''}`,
            primaryCategory: `${payload.primaryCategory || creatorCard?.primaryCategory || ''}`,
            followerBand: `${payload.followerBand || creatorCard?.followerBand || ''}`,
            accountName: `${payload.accountName || creatorCard?.accountName || ''}` || undefined,
            accountIdOrLink: `${payload.accountIdOrLink || creatorCard?.accountIdOrLink || ''}` || undefined,
            portfolioImages: payload.portfolioImages || creatorCard?.portfolioImages || [],
            caseDescription: `${payload.caseDescription || creatorCard?.caseDescription || ''}` || undefined,
            residentCity: `${payload.residentCity || creatorCard?.residentCity || ''}` || undefined,
            contactType: `${payload.contactType || creatorCard?.contactType || ''}`,
            contactValue: `${payload.contactValue || creatorCard?.contactValue || ''}`,
            profileCompleteness: 100,
            status: 'complete',
        };
        return createResponse({
            creatorCardId: creatorCard.creatorCardId,
            status: 'complete',
            profileCompleteness: 100,
            roleFlags: {
                creatorEnabled: true,
            },
            missingFieldKeys: [],
        });
    },
    'notice-bff:list': (payload) => {
        const filter = payload;
        const list = filterPublicNotices(filter).map(toNoticeCardDto);
        return createResponse({
            list,
            nextCursor: '',
            hasMore: false,
            filterSummary: buildFilterSummary(filter, list.length),
            filterEcho: buildFilterEcho(filter),
        });
    },
    'notice-bff:detail': (payload) => {
        const current = findNoticeById(`${payload.noticeId || ''}`);
        if (!current) {
            return createResponse({}, 30001, '无对象访问权限');
        }
        return createResponse({
            notice: current,
            publisherSummary: current.publisherSummary,
            permissionState: current.permissionState,
            ctaState: current.ctaState,
            maskedOrFullContact: buildContactInfo(current.maskedOrFullContact),
        });
    },
    'notice-bff:createDraft': (payload) => {
        const notice = payload.notice;
        if (!notice?.title) {
            return createResponse({
                errorType: 'field_validation',
                fieldErrors: {
                    title: '请填写通告标题',
                },
                missingFieldKeys: ['title'],
            }, 40003, '参数校验失败');
        }
        draftSeed += 1;
        return createResponse({
            noticeId: `draft-notice-${draftSeed}`,
            status: 'draft',
        });
    },
    'notice-bff:updateDraft': (payload) => createResponse({
        noticeId: payload.noticeId,
        status: 'draft',
        updatedAt: buildMockIsoTime(),
    }),
    'notice-bff:submitReview': (payload) => createResponse({
        noticeId: payload.noticeId,
        status: 'pending_review',
        reviewRoundCount: 1,
        currentReviewTaskId: 'review-task-001',
    }),
    'notice-bff:myList': (payload) => {
        const status = `${payload.status || ''}`;
        const list = status && status !== 'all' ? myNoticeFixtures.filter((item) => item.statusTag === status).map(toNoticeCardDto) : myNoticeFixtures.map(toNoticeCardDto);
        return createResponse({
            list,
            nextCursor: '',
            hasMore: false,
        });
    },
    'notice-bff:close': (payload) => createResponse({
        noticeId: payload.noticeId,
        status: 'closed',
        closedAt: buildMockIsoTime(),
    }),
    'notice-bff:republish': (payload) => createResponse({
        noticeId: payload.noticeId,
        status: 'pending_review',
        reviewRoundCount: 2,
        currentReviewTaskId: 'review-task-002',
    }),
    'application-bff:submit': (payload) => {
        const noticeId = `${payload.noticeId || 'notice-001'}`;
        const notice = findNoticeById(noticeId);
        const applicationId = `application-${applications.length + 1}`;
        applications.unshift({
            applicationId,
            noticeId,
            noticeTitle: notice?.title || '待补充通告标题',
            budgetSummary: notice?.budgetSummary || '预算待确认',
            city: notice?.city || '城市待确认',
            status: 'applied',
            publisherSummary: {
                displayName: notice?.publisherSummary.displayName || '发布方待确认',
            },
            canViewPublisherContact: false,
            updatedAt: buildMockIsoTime(),
            stageHint: '报名已提交，等待发布方查看',
        });
        return createResponse({
            applicationId,
            status: 'applied',
            noticeId,
        });
    },
    'application-bff:withdraw': (payload) => {
        const applicationId = `${payload.applicationId || ''}`;
        const current = applications.find((item) => item.applicationId === applicationId);
        if (!current) {
            return createResponse({}, 30001, '无对象访问权限');
        }
        if (!['applied', 'viewed'].includes(current.status)) {
            return createResponse({}, 50002, '当前报名状态不允许执行该操作');
        }
        const withdrawnAt = buildMockIsoTime();
        applications = applications.map((item) => item.applicationId === applicationId
            ? {
                ...item,
                status: 'withdrawn',
                canViewPublisherContact: false,
                updatedAt: '刚刚',
                stageHint: '你已撤回报名',
            }
            : item);
        return createResponse({
            applicationId,
            status: 'withdrawn',
            withdrawnAt,
        });
    },
    'application-bff:myList': (payload) => {
        const status = `${payload.status || ''}`;
        const list = status && status !== 'all' ? applications.filter((item) => item.status === status) : applications;
        return createResponse({
            list,
            nextCursor: '',
            hasMore: false,
        });
    },
    'application-bff:detail': (payload) => {
        const current = applications.find((item) => item.applicationId === payload.applicationId);
        return createResponse(buildApplicationDetail(current));
    },
    'application-bff:publisherList': (payload) => {
        const noticeId = `${payload.noticeId || ''}`;
        const status = `${payload.status || ''}`;
        let list = publisherApplications;
        if (noticeId) {
            list = list.filter((item) => item.noticeId === noticeId);
        }
        if (status) {
            list = list.filter((item) => item.status === status);
        }
        return createResponse({
            list: list.map((item) => ({
                applicationId: item.applicationId,
                creatorCardSnapshot: item.creatorCardSnapshot,
                status: item.status,
                publisherViewedAt: item.publisherViewedAt || null,
                contactRevealState: item.contactRevealState,
            })),
            nextCursor: '',
            hasMore: false,
        });
    },
    'application-bff:publisherDetail': (payload) => {
        const current = findPublisherApplication(`${payload.applicationId || ''}`);
        if (!current) {
            return createResponse({}, 30001, '无对象访问权限');
        }
        return createResponse(buildPublisherApplicationDetail(current));
    },
    'application-bff:markViewed': (payload) => {
        const publisherViewedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            status: 'viewed',
            publisherViewedAt,
            application: {
                ...item.application,
                status: 'viewed',
            },
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: 'viewed',
            publisherViewedAt: current?.publisherViewedAt || publisherViewedAt,
        });
    },
    'application-bff:markContactPending': (payload) => {
        const revealedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            status: 'contact_pending',
            publisherViewedAt: item.publisherViewedAt || revealedAt,
            contactRevealState: 'revealed',
            application: {
                ...item.application,
                status: 'contact_pending',
            },
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: 'contact_pending',
            publisherContactRevealedAt: revealedAt,
            creatorContactRevealedAt: revealedAt,
            creatorContact: current?.creatorContact || '微信号：duomi-creator',
        });
    },
    'application-bff:markCommunicating': (payload) => {
        const revealedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            status: 'communicating',
            publisherViewedAt: item.publisherViewedAt || revealedAt,
            contactRevealState: 'revealed',
            application: {
                ...item.application,
                status: 'communicating',
            },
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: 'communicating',
            publisherContactRevealedAt: revealedAt,
            creatorContactRevealedAt: revealedAt,
            creatorContact: current?.creatorContact || '微信号：duomi-creator',
        });
    },
    'application-bff:markRejected': (payload) => {
        const publisherViewedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            status: 'rejected',
            publisherViewedAt: item.publisherViewedAt || publisherViewedAt,
            application: {
                ...item.application,
                status: 'rejected',
            },
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: 'rejected',
            publisherViewedAt: current?.publisherViewedAt || publisherViewedAt,
        });
    },
    'application-bff:markCompleted': (payload) => {
        const completedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            status: 'completed',
            publisherViewedAt: item.publisherViewedAt || completedAt,
            contactRevealState: 'revealed',
            application: {
                ...item.application,
                status: 'completed',
            },
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: 'completed',
            completedAt,
            publisherContactRevealedAt: completedAt,
            creatorContactRevealedAt: completedAt,
            creatorContact: current?.creatorContact || '微信号：duomi-creator',
        });
    },
    'application-bff:revealCreatorContact': (payload) => {
        const creatorContactRevealedAt = buildMockIsoTime();
        const current = updatePublisherApplication(`${payload.applicationId || ''}`, (item) => ({
            ...item,
            publisherViewedAt: item.publisherViewedAt || creatorContactRevealedAt,
            contactRevealState: 'revealed',
        }));
        return createResponse({
            applicationId: payload.applicationId,
            status: current?.status || 'viewed',
            publisherViewedAt: current?.publisherViewedAt || creatorContactRevealedAt,
            creatorContact: current?.creatorContact || '微信号：duomi-creator',
            creatorContactRevealedAt,
        });
    },
    'message-bff:list': (payload) => {
        const messageType = `${payload.messageType || 'all'}`;
        const list = messageType !== 'all' ? messages.filter((item) => item.messageType === messageType) : messages;
        return createResponse({
            list,
            nextCursor: '',
            hasMore: false,
            unreadCount: getUnreadCount(),
        });
    },
    'message-bff:markRead': (payload) => {
        messages = messages.map((item) => item.messageId === payload.messageId
            ? {
                ...item,
                isRead: true,
                readAt: '刚刚',
            }
            : item);
        return createResponse({
            messageId: payload.messageId,
            isRead: true,
            readAt: '刚刚',
        });
    },
    'message-bff:markAllRead': () => {
        const updatedCount = messages.filter((item) => !item.isRead).length;
        messages = messages.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt || '刚刚',
        }));
        return createResponse({
            updatedCount,
        });
    },
    'report-bff:submit': (payload) => {
        reportSeed += 1;
        const reportId = `report-${reportSeed}`;
        reports = [
            {
                reportId,
                targetType: `${payload.targetType || 'notice'}`,
                targetId: `${payload.targetId || ''}`,
                reasonCode: `${payload.reasonCode || 'other'}`,
                status: '处理中',
                resultAction: '待核查',
            },
            ...reports,
        ];
        return createResponse({
            reportId,
            status: 'pending',
        });
    },
    'report-bff:myList': () => createResponse({
        list: reports,
        nextCursor: '',
        hasMore: false,
    }),
    'feedback-bff:submit': () => {
        feedbackSeed += 1;
        return createResponse({
            feedbackId: `feedback-${feedbackSeed}`,
            status: 'pending',
        });
    },
};
async function mockCallFunction(name, data) {
    await sleep();
    const handler = handlers[`${name}:${data.action}`];
    if (!handler) {
        return createResponse({
            name,
            action: data.action,
            payload: data.payload,
        });
    }
    return handler(data.payload);
}
