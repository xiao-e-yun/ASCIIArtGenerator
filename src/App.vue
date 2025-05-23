<script setup lang="ts">
import {breakpointsTailwind, createReusableTemplate, until, useBreakpoints, useDark, useLocalStorage} from '@vueuse/core'
import {computed, reactive, ref, triggerRef, useTemplateRef, watch, type Ref} from 'vue'
import {useTransform} from './composables/transform'
import AsciiOutput from './components/AsciiOutput.vue'
import {DisplayMode} from './utils'
import {Button} from './components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import NumberInput from './components/NumberInput.vue'
import {useTextRenderer} from './composables/text_renderer'
import {ArrowLeftFromLine, ArrowRightToLine, Github} from 'lucide-vue-next'
import {Separator} from './components/ui/separator'
import {Textarea} from './components/ui/textarea'
import {Toggle} from './components/ui/toggle'

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

const size = reactive<[number | undefined, number | undefined]>([64, undefined])
const doubleSize = useLocalStorage('double-size', true)
const isDouble = computed(() => mode.value === DisplayMode.Normal && doubleSize.value)

const outputSize = computed(() => {
  const aspectRatio = frame.value.width / frame.value.height
  return [
    (size[0] || Math.ceil((size[1] || 0) * aspectRatio)) * (isDouble.value ? 2 : 1) || 0,
    size[1] || Math.ceil((size[0] || 0) * (1 / aspectRatio)) || 0,
  ] as [number, number]
})

const {charactersPixels} = useTextRenderer(characters, granularity)
const {output} = useTransform(frame, outputSize, granularity, charactersPixels)

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
})

const imagePreview = computed<string | undefined>((prev) => {
  if (prev) URL.revokeObjectURL(prev)
  if (file.value) return URL.createObjectURL(file.value)
  return undefined
})

const [DefineSettings, Settings] = createReusableTemplate()

const collapse = ref(false)

const isSmall = useBreakpoints(breakpointsTailwind).smallerOrEqual('sm')

useDark()

const visibility = reactive({
  source: true,
  output: true,
})

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
  <DefineSettings>
    <aside class="flex flex-col gap-2 p-4 relative">
      <Button @click="collapse = true" class="absolute top-0 right-0 rounded-none" variant="ghost" v-if="!isSmall">
        <ArrowLeftFromLine />
      </Button>

      <p>Size</p>
      <NumberInput v-model="size[0]" :default-value="outputSize[0]" :max="2048" :min="0" class="w-full" />
      <NumberInput v-model="size[1]" :default-value="outputSize[1]" :max="2048" :min="0" class="w-full" :class="{
        placeholder: !size[1]
      }" />

      <p class="font-bold">Granularity</p>
      <NumberInput v-model="granularity[0]" :max="8" :min="1" class="w-full" />
      <NumberInput v-model="granularity[1]" :max="8" :min="1" class="w-full" />

      <p class="font-bold">Characters</p>
      <Textarea v-model="characters" class="p-2 w-full h-64 bg-secondary" placeholder="Characters" />

      <p class="font-bold">Display</p>
      <Select v-model="mode" class="w-full">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="DisplayMode.Normal">Normal</SelectItem>
          <SelectItem :value="DisplayMode.Square">Square</SelectItem>
        </SelectContent>
      </Select>

      <p class="font-bold">View</p>
      <div class="flex gap-2">
        <Toggle v-model="visibility.source">Source</Toggle>
        <Toggle v-model="visibility.output">Output</Toggle>
      </div>

      <p class="font-bold">Option</p>
      <div class="flex items-center gap-2">
        <Button variant="destructive" @click="file = null">Exit</Button>
        <Button @click="copy">Copy</Button>
      </div>

      <Separator />

      <a href="https://github.com/xiao-e-yun/ASCIIArtGenerator" target="_blank" class="flex
        items-center gap-2 underline">
        <Github />
        Source
      </a>
    </aside>
  </DefineSettings>

  <template v-if="file">
    <div class="flex sm:h-screen w-full">
      <Settings v-if="!isSmall && !collapse" class="w-sm border-r overflow-auto" />
      <main class="relative flex w-full">
        <Button @click="collapse = false" class="absolute top-0 left-0 rounded-none" variant="ghost"
          v-if="!isSmall && collapse">
          <ArrowRightToLine />
        </Button>


        <div v-if="file" v-show="visibility.source" class="flex-1 m-auto border-r">
          <img v-if="file.type.startsWith('image/')" ref="image" :src="imagePreview"
            class="w-full object-contain max-w-full max-h-full m-auto " />
          <video v-else :src="imagePreview" ref="video" class="w-full max-w-full max-h-full m-auto" controls autoplay />
        </div>
        <AsciiOutput v-if="visibility.output" :text="output" :size="outputSize" :mode="mode" class="flex-1 m-auto"
          :style="{
            maxWidth: (visibility.output &&
              visibility.source) ? '50%' : ''
          }" />
      </main>
    </div>
    <Settings v-if="isSmall" class="border-t" />
  </template>

  <label v-else class="relative w-screen h-screen flex items-center justify-center">
    <div class="text-center w-4/5 h-4/5 border flex flex-col justify-center rounded-lg">
      <h1 class="text-xl font-bold">ASCII Art Generator</h1>
      <p>Select or drag an image here</p>
    </div>
    <input class="opacity-0 absolute w-full h-full top-0" type="file" accept="image/*,video/*"
      @change="file = ($event.target as HTMLInputElement)?.files?.item(0)" />
  </label>
</template>
