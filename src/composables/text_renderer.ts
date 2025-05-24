import {computed, ref, toRaw, toValue, type MaybeRefOrGetter} from 'vue'
import {watchDeep} from '@vueuse/core'

import TextWorker from './text_renderer.worker?worker'
import {chain, cloneDeep, isEqual} from 'lodash'

export type TexTRenderingRequest = {
  granularity: [number, number]
  characters: string[]
}

export type TexTRenderingResult = {
  bounds: [number, number]
  characters: [string, number[]][]
}

export const useTextRenderer = (
  characters: MaybeRefOrGetter<string>,
  granularity: MaybeRefOrGetter<[number, number]>,
) => {
  const charactersData = ref({} as Record<string, number[] | null>)
  const characterBrightnessBounds = ref<[number, number]>([1, 0])

  const prevGranularity = ref([1, 2] as [number, number])

  const worker = new TextWorker()

  watchDeep(
    [characters, granularity] as const,
    ([characters, granularity]) => {
      if (!isEqual(toValue(granularity), prevGranularity.value)) {
        charactersData.value = {} as Record<string, number[]>
        prevGranularity.value = cloneDeep(toValue(granularity))
        characterBrightnessBounds.value = [1, 0]
      }

      const charactersSet = toValue(characters)
        .split('')
        .filter((c) => {
          if (c === '\n') return false
          if (charactersData.value[c] !== undefined) return false
          charactersData.value[c] = null
          return true
        })

      worker.postMessage({
        characters: charactersSet,
        granularity: toRaw(toValue(granularity)),
      } as TexTRenderingRequest)
    },
    {immediate: true},
  )

  worker.onmessage = ({data}: MessageEvent<TexTRenderingResult>) => {
    const {bounds, characters} = data
    charactersData.value = {...charactersData.value, ...Object.fromEntries(characters)}
    if (bounds[0] < characterBrightnessBounds.value[0]) characterBrightnessBounds.value[0] = bounds[0]
    if (bounds[1] > characterBrightnessBounds.value[1]) characterBrightnessBounds.value[1] = bounds[1]
  }

  const charactersPixels = computed(() =>
    chain(toValue(characters).split(''))
      .filter((c) => c !== '\n')
      .union()
      .map((c) => [c, charactersData.value[c]] as [string, number[] | null])
      .value(),
  )

  return {
    characters,
    granularity,
    charactersPixels,
    characterBrightnessBounds,
  }
}
