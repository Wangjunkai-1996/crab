Component({
    properties: {
        message: Object,
    },
    methods: {
        onItemTap() {
            this.triggerEvent('tapitem', this.data.message);
        },
    },
});
