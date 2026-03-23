<template>
  <el-dialog
    :model-value="modelValue"
    :title="schema?.title || '确认操作'"
    width="560px"
    :close-on-click-modal="false"
    @close="$emit('update:modelValue', false)"
  >
    <template v-if="schema">
      <p class="confirm-dialog__description">{{ schema.description }}</p>
      <el-form ref="formRef" :model="formData" label-position="top">
        <el-form-item
          v-for="field in schema.fields || []"
          :key="field.key"
          :label="field.label"
          :prop="field.key"
          :rules="field.required ? [{ required: true, message: `请填写${field.label}`, trigger: 'change' }] : undefined"
        >
          <el-input
            v-if="field.type === 'input'"
            v-model="formData[field.key]"
            :placeholder="field.placeholder"
          />
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.key]"
            type="textarea"
            :rows="4"
            :placeholder="field.placeholder"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formData[field.key]"
            :placeholder="field.placeholder"
          >
            <el-option
              v-for="option in field.options || []"
              :key="String(option.value)"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-switch v-else-if="field.type === 'switch'" v-model="formData[field.key]" />
          <el-date-picker
            v-else-if="field.type === 'datetime'"
            v-model="formData[field.key]"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss[Z]"
            placeholder="请选择时间"
          />
        </el-form-item>
      </el-form>
    </template>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button :type="schema?.danger ? 'danger' : 'primary'" :loading="loading" @click="handleConfirm">
        {{ schema?.confirmText || '确认' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance } from 'element-plus'
import type { ActionDialogSchema } from '@/models/common'

const props = defineProps<{
  modelValue: boolean
  schema: ActionDialogSchema | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: Record<string, unknown>]
}>()

const formRef = ref<FormInstance>()
const formData = reactive<Record<string, any>>({})

watch(
  () => props.schema,
  (schema) => {
    Object.keys(formData).forEach((key) => delete formData[key])
    Object.assign(formData, schema?.initialValues || {})
  },
  { immediate: true },
)

const handleConfirm = async () => {
  await formRef.value?.validate()
  emit('confirm', { ...formData })
}
</script>

<style scoped lang="scss">
.confirm-dialog__description {
  margin: 0 0 16px;
  color: var(--dm-color-text-secondary);
  font-size: 14px;
  line-height: 22px;
}
</style>
