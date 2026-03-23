<template>
  <div class="risk-flag-list">
    <el-tag v-for="flag in displayFlags" :key="flag" type="danger" effect="plain">{{ flag }}</el-tag>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { formatRiskFlagList } from '@/utils/admin-labels'

const props = defineProps<{
  flags: string[]
}>()

const displayFlags = computed(() => formatRiskFlagList(props.flags))
</script>

<style scoped lang="scss">
.risk-flag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
