Component({
  properties: {
    files: {
      type: Array,
      value: [],
    },
    maxCount: {
      type: Number,
      value: 6,
    },
    readonly: {
      type: Boolean,
      value: false,
    },
    helperText: {
      type: String,
      value: '',
    },
    addText: {
      type: String,
      value: '添加图片',
    },
  },
  methods: {
    async onChoose() {
      if (this.data.readonly) {
        return;
      }

      const currentFiles = (this.data.files || []) as string[];
      const remaining = Number(this.data.maxCount) - currentFiles.length;

      if (remaining <= 0) {
        wx.showToast({
          title: `最多上传 ${this.data.maxCount} 张`,
          icon: 'none',
        });
        return;
      }

      try {
        const result = await wx.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
        });
        const nextFiles = [...currentFiles, ...(result.tempFiles || []).map((item) => item.tempFilePath)];

        this.triggerEvent('change', {
          files: nextFiles,
        });
      } catch (error) {
        if ((error as { errMsg?: string })?.errMsg?.includes('cancel')) {
          return;
        }

        wx.showToast({
          title: '选择图片失败，请重试',
          icon: 'none',
        });
      }
    },

    onRemove(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index);
      const currentFiles = (this.data.files || []) as string[];
      const nextFiles = currentFiles.filter((_, itemIndex) => itemIndex !== index);

      this.triggerEvent('change', {
        files: nextFiles,
      });
    },

    onPreview(event: WechatMiniprogram.TouchEvent) {
      const current = `${event.currentTarget.dataset.url || ''}`;
      const urls = ((this.data.files || []) as string[]).filter(Boolean);

      if (!current || !urls.length) {
        return;
      }

      wx.previewImage({
        current,
        urls,
      });
    },
  },
});
