import { GPU, type KernelFunction, type Pixel } from 'gpu.js'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import kernels from './transform.kernels.js?raw'

declare global {
  interface Window {
    getBrightnessKernel: KernelFunction
    getCharactersKernel: KernelFunction
  }
}

export const useTransform = (
  image: MaybeRefOrGetter<ImageBitmap | null>,
  granularity: MaybeRefOrGetter<[number, number]>,
  charactersPixels: MaybeRefOrGetter<[string, number[]][]>,
) => {
  // preload kernels
  // gpu.js can't pass the kernels after vite transforms them
  eval(kernels)

  const outputSize = ref([0, 0] as [number, number])

  const gpu = new GPU()

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
    const $image = toValue(image)
    const $granularity = toValue(granularity)
    const $charactersPixels = toValue(charactersPixels)

    if (!$image) return

    if (!$charactersPixels.length) return ''

    const brightnessSize = [
      Math.floor(outputSize.value[0] * $granularity[0]),
      Math.floor(outputSize.value[1] * $granularity[1]),
    ]
    const brightness = getBrightness.setOutput(brightnessSize)($image, [
      $image.width / brightnessSize[0],
      $image.height / brightnessSize[1],
    ])

    const mappedCharacters = getCharacters.setOutput(outputSize.value)(
      brightness,
      $granularity,
      $charactersPixels.map((c) => c[1]),
      $charactersPixels.length,
    ) as number[][]

    return mappedCharacters
      .map((y) =>
        Array.from(y)
          .map((c) => $charactersPixels[c][0])
          .join(''),
      )
      .join('\n')
  })

  return {
    image,
    output,
    outputSize,
  }
}
