"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_STATUS_LABELS = exports.APPLICATION_STATUS_LABELS = exports.NOTICE_STATUS_LABELS = exports.PREFERRED_VIEW_LABELS = exports.FEEDBACK_TYPE_OPTIONS = exports.REPORT_REASON_OPTIONS = exports.REPORT_TARGET_TYPE_OPTIONS = exports.FOLLOWER_BAND_OPTIONS = exports.GENDER_OPTIONS = exports.CONTACT_TYPE_OPTIONS = exports.BUDGET_RANGE_OPTIONS = exports.SETTLEMENT_TYPE_OPTIONS = exports.COOPERATION_TYPE_OPTIONS = exports.COOPERATION_CATEGORY_OPTIONS = exports.COOPERATION_PLATFORM_OPTIONS = exports.IDENTITY_TYPE_OPTIONS = void 0;
exports.IDENTITY_TYPE_OPTIONS = [
    { label: '商家', value: 'merchant' },
    { label: '个人 PR', value: 'personal_pr' },
    { label: '代理商', value: 'agency' },
    { label: '代运营', value: 'operator' },
    { label: '其他', value: 'other' },
];
exports.COOPERATION_PLATFORM_OPTIONS = [
    { label: '小红书', value: 'xiaohongshu' },
    { label: '抖音', value: 'douyin' },
    { label: '视频号', value: 'shipinhao' },
    { label: '快手', value: 'kuaishou' },
    { label: 'B 站', value: 'bilibili' },
    { label: '其他', value: 'other' },
];
exports.COOPERATION_CATEGORY_OPTIONS = [
    { label: '本地生活', value: 'local_life' },
    { label: '美食餐饮', value: 'food_beverage' },
    { label: '美妆穿搭', value: 'beauty_fashion' },
    { label: '母婴亲子', value: 'mother_baby' },
    { label: '家居生活', value: 'home_living' },
    { label: '数码汽车', value: 'digital_auto' },
    { label: '旅行户外', value: 'travel_outdoor' },
    { label: '教育服务', value: 'education_service' },
    { label: '其他', value: 'other' },
];
exports.COOPERATION_TYPE_OPTIONS = [
    { label: '探店', value: 'store_visit' },
    { label: '寄拍', value: 'mail_shoot' },
    { label: '图文', value: 'article' },
    { label: '短视频', value: 'short_video' },
    { label: '直播', value: 'livestream' },
    { label: '其他', value: 'other' },
];
exports.SETTLEMENT_TYPE_OPTIONS = [
    { label: '固定报价', value: 'fixed_price' },
    { label: '可议价', value: 'negotiable' },
    { label: '置换合作', value: 'barter' },
    { label: '免费体验', value: 'free_experience' },
    { label: '其他', value: 'other' },
];
exports.BUDGET_RANGE_OPTIONS = [
    { label: '200 元以下', value: 'below_200' },
    { label: '200-500 元', value: '200_500' },
    { label: '500-1000 元', value: '500_1000' },
    { label: '1000-3000 元', value: '1000_3000' },
    { label: '3000-5000 元', value: '3000_5000' },
    { label: '5000 元以上', value: '5000_plus' },
    { label: '不适用', value: 'not_applicable' },
];
exports.CONTACT_TYPE_OPTIONS = [
    { label: '微信', value: 'wechat' },
    { label: '手机号', value: 'phone' },
    { label: '企业微信', value: 'wechat_work' },
    { label: '邮箱', value: 'email' },
];
exports.GENDER_OPTIONS = [
    { label: '女', value: 'female' },
    { label: '男', value: 'male' },
    { label: '保密', value: 'secret' },
];
exports.FOLLOWER_BAND_OPTIONS = [
    { label: '1k 以下', value: 'below_1k' },
    { label: '1k-5k', value: '1k_5k' },
    { label: '5k-1w', value: '5k_10k' },
    { label: '1w-5w', value: '10k_50k' },
    { label: '5w-10w', value: '50k_100k' },
    { label: '10w+', value: '100k_plus' },
];
exports.REPORT_TARGET_TYPE_OPTIONS = [
    { label: '通告', value: 'notice' },
    { label: '发布方', value: 'publisher' },
    { label: '达人', value: 'creator' },
];
exports.REPORT_REASON_OPTIONS = [
    { label: '虚假信息', value: 'false_information' },
    { label: '联系方式异常', value: 'contact_risk' },
    { label: '内容违规', value: 'illegal_content' },
    { label: '骚扰或欺诈', value: 'harassment_or_fraud' },
    { label: '其他问题', value: 'other' },
];
exports.FEEDBACK_TYPE_OPTIONS = [
    { label: '功能建议', value: 'feature_request' },
    { label: 'Bug 反馈', value: 'bug_report' },
    { label: '体验吐槽', value: 'experience_feedback' },
    { label: '其他', value: 'other' },
];
exports.PREFERRED_VIEW_LABELS = {
    publisher: '发布方',
    creator: '达人',
};
exports.NOTICE_STATUS_LABELS = {
    draft: '草稿',
    pending_review: '待审核',
    rejected: '驳回待修改',
    supplement_required: '需补充资料',
    active: '进行中',
    expired: '已截止',
    closed: '已关闭',
    removed: '已下架',
};
exports.APPLICATION_STATUS_LABELS = {
    applied: '已报名',
    viewed: '已查看',
    contact_pending: '待联系',
    communicating: '已沟通',
    rejected: '未入选',
    withdrawn: '已撤回',
    completed: '已完成合作',
};
exports.ACCOUNT_STATUS_LABELS = {
    normal: '正常',
    watchlist: '观察名单',
    restricted_publish: '限制发布',
    restricted_apply: '限制报名',
    banned: '全量封禁',
};
