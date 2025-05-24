<script setup lang="ts">
import {DisplayMode} from '@/utils'
import {useElementSize} from '@vueuse/core'
import {computed, useTemplateRef, watchEffect} from 'vue'

const TEXT_ASPECT_RATIO = 0.55

const props = defineProps<{
  text: string | undefined
  size: [number, number]
  mode: DisplayMode
}>()

const canvas = useTemplateRef('canvas')
const {width, height} = useElementSize(canvas)

const fontSize = computed(() => {
  const numberFontSize = width.value / props.size[0] / (props.mode === DisplayMode.Square ? 1 : TEXT_ASPECT_RATIO)
  return numberFontSize.toString() + 'px'
})

const context = computed(() => canvas.value && canvas.value.getContext('2d')!)

watchEffect(() => {
  if (!canvas.value || !props.text) return
  const ctx = context.value!

  canvas.value.width = width.value
  canvas.value.height = width.value / props.size[0] * props.size[1]

  ctx.font = `${fontSize.value} monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
})

watchEffect(() => {
  if (!canvas.value || !props.text) return
  const ctx = context.value!

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width.value, height.value)

  ctx.fillStyle = 'black'
  ctx.font = `${fontSize.value} monospace`

  const lines = props.text.split('\n')
  const lineHeight = parseFloat(fontSize.value)

  lines.forEach((line, index) => {
    const y = (height.value / 2) + (index - lines.length / 2) * lineHeight
    ctx!.fillText(line, width.value / 2, y)
  })

})
</script>

<template>
  <canvas ref="canvas" />
</template>
