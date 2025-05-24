<script setup lang="ts">
import {DisplayMode} from '@/utils'
import {useElementSize} from '@vueuse/core'
import {computed, useTemplateRef} from 'vue'

const TEXT_ASPECT_RATIO = 0.55

const props = defineProps<{
  text: string | undefined
  colorInversion: boolean
  size: [number, number]
  mode: DisplayMode
}>()

const canvas = useTemplateRef('container')
const {width} = useElementSize(canvas)

const fontSize = computed(() => {
  const numberFontSize = width.value / props.size[0] / (props.mode === DisplayMode.Square ? 1 : TEXT_ASPECT_RATIO)
  return numberFontSize
})

const style = computed(() => {
  const actualFontSize = Math.max(6, fontSize.value)
  const scale = Math.min(1,fontSize.value / actualFontSize)

  return {
    transform: `scale(${scale})`,
    fontSize: `${actualFontSize.toString()}px`,
    color: props.colorInversion ? 'black' : 'white',
    backgroundColor: props.colorInversion ? 'white' : 'black',
  }
})

const containerStlye = computed(() => {
  return {
    aspectRatio: (props.size[0] / props.size[1] * (props.mode ===
      DisplayMode.Square ? 1 : TEXT_ASPECT_RATIO)).toString()
  }
})
</script>

<template>
  <div ref="container" :style="containerStlye" class="relative overflow-hidden">
    <pre v-text="text" class="absolute top-0 left-0 leading-none origin-top-left
    will-change-contents pointer-none select-none" :style="style" />
  </div>
</template>
