"use strict";
Component({
    properties: {
        visible: {
            type: Boolean,
            value: false,
        },
        platformOptions: {
            type: Array,
            value: [],
        },
        categoryOptions: {
            type: Array,
            value: [],
        },
        selectedPlatform: String,
        selectedCategory: String,
        selectedCity: {
            type: String,
            value: '',
        },
    },
    methods: {
        onOverlayTap() {
            this.triggerEvent('close');
        },
        onSelectPlatform(event) {
            this.triggerEvent('selectplatform', {
                value: event.currentTarget.dataset.value,
            });
        },
        onSelectCategory(event) {
            this.triggerEvent('selectcategory', {
                value: event.currentTarget.dataset.value,
            });
        },
        onReset() {
            this.triggerEvent('reset');
        },
        onConfirm() {
            this.triggerEvent('confirm');
        },
    },
});
