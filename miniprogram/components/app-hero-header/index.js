"use strict";
Component({
    properties: {
        kicker: String,
        title: String,
        subtitle: String,
        theme: {
            type: String,
            value: 'surface',
        },
        badgeText: String,
        badgeType: {
            type: String,
            value: 'accent',
        },
        showBack: {
            type: Boolean,
            value: false,
        },
        actionText: String,
        topInset: {
            type: Number,
            value: 0,
        },
    },
    methods: {
        onBackTap() {
            wx.navigateBack({
                delta: 1,
            });
        },
        onActionTap() {
            this.triggerEvent('action');
        },
    },
});
