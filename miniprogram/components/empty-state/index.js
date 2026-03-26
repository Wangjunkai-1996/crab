"use strict";
Component({
    properties: {
        title: String,
        description: String,
        actionText: String,
    },
    methods: {
        onActionTap() {
            this.triggerEvent('action');
        },
    },
});
