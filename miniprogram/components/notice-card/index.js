"use strict";
Component({
    properties: {
        notice: Object,
        featured: {
            type: Boolean,
            value: false,
        },
    },
    methods: {
        onCardTap() {
            this.triggerEvent('tapcard', this.data.notice);
        },
    },
});
