import {GPU, type IKernelRunShortcut, type KernelFunction, type Pixel} from 'gpu.js'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import kernels from './transform.kernels.js?raw'

declare global {
  interface Window {
    getBrightnessKernel: KernelFunction
    getCharactersKernel: KernelFunction
  }
}

export const useTransform = (
  image: MaybeRefOrGetter<ImageBitmap | HTMLCanvasElement | null>,
  outputSize: MaybeRefOrGetter<[number, number]>,
  granularity: MaybeRefOrGetter<[number, number]>,
  charactersPixels: MaybeRefOrGetter<[string, number[] | null][]>,
) => {
  // preload kernels
  // gpu.js can't pass the kernels after vite transforms them
  eval(kernels)

  const gpu = new GPU()

  const getBrightness = gpu.createKernel<[Pixel[][], [number, number]], {}>(
    window.getBrightnessKernel,
    {
      dynamicArguments: true,
      dynamicOutput: true,
      pipeline: true,
    },
  )

  const getCharacters = computed<IKernelRunShortcut>((prev) => {
    let isChanged = !prev

    const maxIterations = Math.max(2 ** Math.ceil(Math.log2(toValue(charactersPixels).length)), 256)

    isChanged ||= prev?.loopMaxIterations !== maxIterations

    if (!isChanged) return prev!

    if (prev) prev.destroy()
    return gpu
      .createKernel(window.getCharactersKernel, {
        dynamicArguments: true,
        dynamicOutput: true,
      })
      .setLoopMaxIterations(maxIterations)
  })

  const output = computed(() => {
    const $image = toValue(image)
    const $granularity = toValue(granularity)
    const $charactersPixels = toValue(charactersPixels)

    if (!$image || !$image.width || !$image.height) return ''

    const mappedPixels = $charactersPixels.filter(([, pixels]) => pixels)

    if (!mappedPixels.length) return ''

    const brightnessSize = [
      Math.floor(toValue(outputSize)[0] * $granularity[0]),
      Math.floor(toValue(outputSize)[1] * $granularity[1]),
    ]
    const brightness = getBrightness.setOutput(brightnessSize)($image, [
      $image.width / brightnessSize[0],
      $image.height / brightnessSize[1],
    ])

    const mappedCharacters = getCharacters.value.setOutput(toValue(outputSize))(
      brightness,
      $granularity,
      mappedPixels.map(([, pixels]) => pixels as number[]),
      mappedPixels.length,
    ) as number[][]

    return mappedCharacters
      .map((y) =>
        Array.from(y)
          .map((c) => mappedPixels[c][0])
          .join(''),
      )
      .join('\n')
  })

  return {
    image,
    output,
  }
}
