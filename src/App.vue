<script setup lang="ts">
import { until, useDark, useLocalStorage } from '@vueuse/core'
import { computed, ref, triggerRef, useTemplateRef, watch, type Ref } from 'vue'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable'
import { useTransform } from './composables/transform'
import AsciiOutput from './components/AsciiOutput.vue'
import { DisplayMode } from './utils'
import { Button } from './components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import NumberInput from './components/NumberInput.vue'
import { useTextRenderer } from './composables/text_renderer'

const file = ref<File | null>()

const characters = useLocalStorage(
  'characters',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()_+[]{}|;\':",.\\/<>?`~',
)
const granularity = useLocalStorage('granularity', [1, 2] as [number, number])
const mode = useLocalStorage<DisplayMode>('display-mode', DisplayMode.Normal)

const frame = ref<HTMLCanvasElement>(document.createElement('canvas'))
const frameCtx = frame.value.getContext('2d')!

const image = useTemplateRef<HTMLImageElement>('image')
const video = useTemplateRef<HTMLVideoElement>('video')

const { charactersPixels } = useTextRenderer(characters, granularity)
const { outputSize, output } = useTransform(frame, granularity, charactersPixels)

watch(file, async (file) => {
  if (!file) {
    frame.value.width = 0
    frame.value.height = 0
    triggerRef(frame)
    return
  }

  const onLoaded = async <T extends HTMLImageElement | HTMLVideoElement>(el: Ref<T | null>) => {
    await until(el).not.toBeUndefined()
    await new Promise((r) => {
      el.value!.onload = r
      el.value!.onloadeddata = r
    })
    return el.value!
  }

  if (file.type.startsWith('image')) {
    const $image = await onLoaded(image)
    frame.value.width = $image.naturalWidth
    frame.value.height = $image.naturalHeight
    frameCtx.setTransform(1, 0, 0, -1, 0, frame.value.height)
    frameCtx.drawImage($image, 0, 0)
    triggerRef(frame)
  } else {
    await until(video).not.toBeUndefined()
    const $video = await onLoaded(video)
    $video.volume = 0.5
    frame.value.width = $video.videoWidth
    frame.value.height = $video.videoHeight
    frameCtx.setTransform(1, 0, 0, -1, 0, frame.value.height)

    const next = () => {
      if (!video.value) return
      frameCtx?.drawImage($video, 0, 0)
      triggerRef(frame)
      $video.requestVideoFrameCallback(next)
    }
    frameCtx.drawImage($video, 0, 0)
    $video.requestVideoFrameCallback(next)
  }

  outputSize.value = [
    mode.value === DisplayMode.Square ? 64 : 64 * 2,
    Math.floor((64 * frame.value!.height) / frame.value!.width),
  ]
})

const imagePreview = computed<string | undefined>((prev) => {
  if (prev) URL.revokeObjectURL(prev)
  if (file.value) return URL.createObjectURL(file.value)
  return undefined
})

useDark()

function dropFile(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  file.value = files.item(0)
}

window.ondrop = dropFile
window.ondragover = (event) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const copy = () => navigator.clipboard.writeText(output.value ?? '')
</script>

<template>
  <ResizablePanelGroup direction="horizontal" v-if="file" class="!h-screen">
    <ResizablePanel as-child class="min-w-[200px] p-4 !overflow-y-auto" :default-size="20">
      <aside>
        <p class="font-bold mt-2">Size</p>
        <NumberInput v-model="outputSize[0]" :max="2048" :min="1" class="w-full mt-2" />
        <NumberInput v-model="outputSize[1]" :max="2048" :min="1" class="w-full mt-2" />

        <p class="font-bold mt-2">Granularity</p>
        <NumberInput v-model="granularity[0]" :max="8" :min="1" class="w-full mt-2" />
        <NumberInput v-model="granularity[1]" :max="8" :min="1" class="w-full mt-2" />

        <p class="font-bold mt-2">Characters</p>
        <textarea
          v-model="characters"
          class="p-2 w-full h-64 mt-2 bg-secondary"
          placeholder="Characters"
        />

        <p class="font-bold mt-2">Mode</p>
        <Select v-model="mode" class="w-full mt-2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="DisplayMode.Normal">Normal</SelectItem>
            <SelectItem :value="DisplayMode.Square">Square</SelectItem>
          </SelectContent>
        </Select>

        <p class="font-bold mt-2">Option</p>
        <div class="flex items-center gap-2 mt-2">
          <Button variant="destructive" @click="file = null">Exit</Button>
          <Button @click="copy">Copy</Button>
        </div>
      </aside>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel as-child>
      <main class="flex min-w-1/2">
        <template v-if="file">
          <img
            v-if="file.type.startsWith('image/')"
            ref="image"
            :src="imagePreview"
            class="w-1/2 max-w-full max-h-full object-contain m-auto border-r"
          />
          <video
            v-else
            :src="imagePreview"
            ref="video"
            class="w-1/2 max-w-full max-h-full object-contain m-auto border-r"
            controls
            autoplay
          />
        </template>
        <AsciiOutput
          :text="output"
          :size="outputSize"
          :mode="mode"
          class="w-1/2 max-w-full max-h-full m-auto"
        />
      </main>
    </ResizablePanel>
  </ResizablePanelGroup>

  <label v-else class="relative w-screen h-screen flex items-center justify-center">
    <div class="text-center w-4/5 h-4/5 border flex flex-col justify-center rounded-lg">
      <h1 class="text-xl font-bold">ASCII Art Generator</h1>
      <p>Select or drag an image here</p>
    </div>
    <input
      class="opacity-0 absolute w-full h-full top-0"
      type="file"
      accept="image/*,video/*"
      @change="file = ($event.target as HTMLInputElement)?.files?.item(0)"
    />
  </label>
</template>
