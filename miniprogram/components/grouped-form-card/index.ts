Component({
  properties: {
    title: String,
    badgeText: String,
    badgeType: {
      type: String,
      value: 'accent',
    },
    items: {
      type: Array,
      value: [],
    },
  },
});
