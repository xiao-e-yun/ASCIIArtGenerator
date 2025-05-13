<script setup lang="ts">
import { OutputMode } from '@/utils/output'
import { useElementSize } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

const TEXT_ASPECT_RATIO = 0.55

const props = defineProps<{
  text: string | undefined
  size: [number, number]
  mode: OutputMode
}>()

const el = useTemplateRef('el')
const { width } = useElementSize(el)

const fontSize = computed(() => {
  const widthSize =
    width.value / props.size[0] / (props.mode === OutputMode.Square ? 1 : TEXT_ASPECT_RATIO)
  return widthSize
})

const select = (event: MouseEvent) => {
  const target = event.target as HTMLPreElement
  const selection = window.getSelection()
  if (!selection) return

  // check if already selected
  if (selection.toString().includes(target.innerText)) {
    selection.removeAllRanges()
    return
  }

  const range = document.createRange()
  range.selectNodeContents(target)
  selection.removeAllRanges()
  selection.addRange(range)
}
</script>

<template>
  <div ref="el">
    <pre
      class="origin-left bg-white text-black w-fit leading-none font-mono"
      :style="{
        fontSize: fontSize.toString() + 'px',
      }"
      v-text="text"
      @click="select"
    />
  </div>
</template>
