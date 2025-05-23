<script lang="ts" setup>
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'

defineProps<{
  defaultValue?: number
}>()
</script>

<template>
  <NumberField>
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput :placeholder="defaultValue" />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
