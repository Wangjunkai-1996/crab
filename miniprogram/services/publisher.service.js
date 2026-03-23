"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.upsertProfile = upsertProfile;
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'publisher-bff';
function mapPublisherProfile(profile) {
    if (!profile) {
        return null;
    }
    return {
        publisherProfileId: profile.publisherProfileId,
        userId: profile.userId,
        identityType: profile.identityType,
        displayName: profile.displayName,
        city: profile.city,
        contactType: profile.contactType,
        contactValue: profile.contactValue,
        intro: profile.intro || undefined,
        profileCompleteness: profile.profileCompleteness,
        status: profile.status,
    };
}
function getProfile() {
    return (0, request_1.request)(FUNCTION_NAME, 'getProfile', {}, (data) => ({
        publisherProfile: mapPublisherProfile(data.publisherProfile),
        editableFields: data.editableFields || [],
        profileCompleteness: data.profileCompleteness,
        missingFieldKeys: data.missingFieldKeys || [],
    }));
}
function upsertProfile(payload) {
    return (0, request_1.request)(FUNCTION_NAME, 'upsertProfile', payload);
}
