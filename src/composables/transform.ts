import { GPU, type KernelFunction, type Pixel } from 'gpu.js'
import { computed, ref, watch } from 'vue'
import kernels from "./transform.kernels.js?raw"

declare global {
  interface Window {
    getBrightnessKernel: KernelFunction,
    getCharactersKernel: KernelFunction,
  }
}

export const useTransform = () => {

  // preload kernels
  eval(kernels)

  const image = ref<ImageBitmap>()
  const granularity = ref([1, 2] as [number, number])
  const outputSize = ref([64, 64] as [number, number])
  const characters = ref(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;\':",.\\/<>?`~ ',
  )

  const gpu = new GPU()
  const charactersMapper = (() => {
    const measureCanvas = new OffscreenCanvas(64, 64)
    const measureCtx = measureCanvas.getContext('2d')!

    measureCtx.textBaseline = 'top'
    measureCtx.fillStyle = 'black'
    measureCtx.font = `64px monospace`

    const cache = new Map<string, number[]>()
    watch(granularity, () => cache.clear(), { deep: true })

    return computed(() => {
      const canvas = new OffscreenCanvas(...granularity.value)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.imageSmoothingQuality = 'high'

      const sets = new Set<string>(['\n'])
      return characters.value
        .split('')
        .filter((v) => {
          const has = sets.has(v)
          sets.add(v)
          return !has
        })
        .map((char) => {
          if (cache.has(char)) return [char, cache.get(char)!] as const

          measureCtx.fillText(char, 0, 0, 64)
          const { width } = measureCtx.measureText(char)
          ctx.drawImage(measureCanvas, 0, 0, width, 64, 0, 0, ...granularity.value)
          const brightness = Array.from(
            ctx.getImageData(0, 0, ...granularity.value).data.filter((_, i) => i % 4 === 3),
          ).map((a) => a / 255)

          ctx.clearRect(0, 0, ...(granularity.value.map((v) => v * 128) as [number, number]))
          measureCtx.clearRect(0, 0, 64, 64)

          cache.set(char, brightness)
          console.log(char, brightness)
          return [char, brightness] as const
        })
    })
  })()

  const getBrightness = gpu.createKernel<[Pixel[][], [number, number]], {}>(
    window.getBrightnessKernel,
    {
      dynamicArguments: true,
      dynamicOutput: true,
      pipeline: true,
    },
  )

  const getCharacters = gpu.createKernel<[number[][], [number, number], number[][], number], {}>(
    window.getCharactersKernel,
    {
      dynamicArguments: true,
      dynamicOutput: true,
    },
  )

  const output = computed(() => {
    if (!image.value) return

    const brightnessSize = [
      Math.floor(outputSize.value[0] * granularity.value[0]),
      Math.floor(outputSize.value[1] * granularity.value[1]),
    ]
    const brightness = getBrightness.setOutput(brightnessSize)(image.value, [
      image.value.width / brightnessSize[0],
      image.value.height / brightnessSize[1],
    ])

    const mappedCharacters = getCharacters.setOutput(outputSize.value)(
      brightness,
      granularity.value,
      charactersMapper.value.map((c) => c[1]),
      charactersMapper.value.length,
    ) as number[][]

    return mappedCharacters
      .map((y) =>
        Array.from(y)
          .map((character) => charactersMapper.value[character][0])
          .join(''),
      )
      .join('\n')
  })

  return {
    image,
    granularity,
    outputSize,
    characters,
    output,
  }
}
