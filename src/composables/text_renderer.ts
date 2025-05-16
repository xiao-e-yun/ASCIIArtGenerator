import { computed, toRaw, toValue, type MaybeRefOrGetter } from 'vue'
import { useSessionStorage, watchDeep } from '@vueuse/core'

import TextWorker from './text_renderer.worker?worker'
import { chain, cloneDeep, isEqual } from 'lodash'

export type TexTRenderingRequest = {
  granularity: [number, number]
  characters: string[]
}

export type TexTRenderingResult = [string, number[]][]

export const useTextRenderer = (
  characters: MaybeRefOrGetter<string>,
  granularity: MaybeRefOrGetter<[number, number]>,
) => {
  const charactersData = useSessionStorage("charactersData",{} as Record<string, number[] | null>)
  const prevGranularity = useSessionStorage("charactersGranularity",[1, 2] as [number, number])

  const worker = new TextWorker()

  watchDeep([characters, granularity] as const, ([characters, granularity]) => {
    if (!isEqual(toValue(granularity), prevGranularity.value)) {
      charactersData.value = {} as Record<string, number[]>
      prevGranularity.value = cloneDeep(toValue(granularity))
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
  })

  worker.onmessage = ({ data }: MessageEvent<TexTRenderingResult>) => {
    for (const [char, pixels] of data) {
      charactersData.value[char] = pixels
    }
  }

  const charactersPixels = computed(
    () =>
      chain(toValue(characters).split(''))
        .map((c) => [c, charactersData.value[c]] as const)
        .filter(([_, v]) => Array.isArray(v))
        .value() as [string, number[]][],
  )

  return {
    characters,
    granularity,
    charactersPixels,
  }
}
