"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCard = getCard;
exports.upsertCard = upsertCard;
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'creator-bff';
function mapCreatorCard(card) {
    if (!card) {
        return null;
    }
    return {
        creatorCardId: card.creatorCardId,
        userId: card.userId,
        nickname: card.nickname,
        avatarUrl: card.avatarUrl || undefined,
        city: card.city,
        gender: card.gender || undefined,
        primaryPlatform: card.primaryPlatform,
        primaryCategory: card.primaryCategory,
        followerBand: card.followerBand,
        accountName: card.accountName || undefined,
        accountIdOrLink: card.accountIdOrLink || undefined,
        portfolioImages: card.portfolioImages || [],
        caseDescription: card.caseDescription || undefined,
        residentCity: card.residentCity || undefined,
        contactType: card.contactType,
        contactValue: card.contactValue,
        profileCompleteness: card.profileCompleteness,
        status: card.status,
    };
}
function getCard() {
    return (0, request_1.request)(FUNCTION_NAME, 'getCard', {}, (data) => ({
        creatorCard: mapCreatorCard(data.creatorCard),
        editableFields: data.editableFields || [],
        profileCompleteness: data.profileCompleteness,
        missingFieldKeys: data.missingFieldKeys || [],
    }));
}
function upsertCard(payload) {
    return (0, request_1.request)(FUNCTION_NAME, 'upsertCard', payload);
}
