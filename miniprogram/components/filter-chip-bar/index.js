"use strict";
Component({
    properties: {
        items: {
            type: Array,
            value: [],
        },
    },
    methods: {
        onChipTap(event) {
            this.triggerEvent('tapchip', {
                item: event.currentTarget.dataset.item,
            });
        },
        onOpenFilter() {
            this.triggerEvent('openfilter');
        },
    },
});
