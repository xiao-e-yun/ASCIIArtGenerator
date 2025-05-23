<script setup lang="ts">
import {DisplayMode} from '@/utils'
import {useElementSize} from '@vueuse/core'
import {computed, useTemplateRef} from 'vue'

const TEXT_ASPECT_RATIO = 0.55

const props = defineProps<{
  text: string | undefined
  size: [number, number]
  mode: DisplayMode
}>()

const el = useTemplateRef('el')
const {width} = useElementSize(el)

const fontSize = computed(() => {
  const widthSize =
    width.value / props.size[0] / (props.mode === DisplayMode.Square ? 1 : TEXT_ASPECT_RATIO)
  return widthSize
})
</script>

<template>
  <div ref="el">
    <pre class="origin-left bg-white text-black w-fit leading-none font-mono" :style="{
      fontSize: fontSize.toString() + 'px',
    }" v-text="text" />
  </div>
</template>
