<template>
  <el-tag :type="tagType" effect="light" round>{{ resolvedLabel }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_TYPE_MAP } from '@/constants/status'

const props = defineProps<{
  status: string
  label?: string
}>()

const resolvedLabel = computed(() => props.label || props.status || '--')
const tagType = computed(() => STATUS_TYPE_MAP[props.status] || 'info')
</script>
