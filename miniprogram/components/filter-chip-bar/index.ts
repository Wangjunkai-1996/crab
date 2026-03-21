Component({
  properties: {
    items: {
      type: Array,
      value: [],
    },
  },
  methods: {
    onChipTap(event: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('tapchip', {
        item: event.currentTarget.dataset.item,
      });
    },
    onOpenFilter() {
      this.triggerEvent('openfilter');
    },
  },
});
