Component({
  properties: {
    primaryText: String,
    secondaryText: String,
    primaryDisabled: {
      type: Boolean,
      value: false,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    bottomInset: {
      type: Number,
      value: 0,
    },
  },
  methods: {
    onPrimaryTap() {
      if (this.data.primaryDisabled || this.data.loading) {
        return;
      }

      this.triggerEvent('primary');
    },
    onSecondaryTap() {
      this.triggerEvent('secondary');
    },
  },
});
