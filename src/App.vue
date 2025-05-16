<script setup lang="ts">
import { useDark, useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable'
import { useTransform } from './composables/transform'
import AsciiOutput from './components/AsciiOutput.vue'
import { OutputMode } from './utils/output'
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

const image = ref<ImageBitmap | null>(null)

const { charactersPixels } = useTextRenderer(characters, granularity)
const { outputSize, output } = useTransform(image, granularity, charactersPixels)

const mode = ref<OutputMode>(OutputMode.Normal)

granularity.value = [1, 2]
watch(file, async (file) => {
  if (!file) return
  image.value = await createImageBitmap(file)
  outputSize.value = [
    mode.value === OutputMode.Square ? 64 : 64 * 2,
    Math.floor((64 * image.value.height) / image.value.width),
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
        <NumberInput v-model="granularity[0]" :max="16" :min="1" class="w-full mt-2" />
        <NumberInput v-model="granularity[1]" :max="16" :min="1" class="w-full mt-2" />

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
            <SelectItem :value="OutputMode.Normal">Normal</SelectItem>
            <SelectItem :value="OutputMode.Square">Square</SelectItem>
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
        <img
          :src="imagePreview"
          class="w-1/2 max-w-full max-h-full object-contain m-auto border-r"
        />
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
      accept="image/*"
      @change="file = ($event.target as HTMLInputElement)?.files?.item(0)"
    />
  </label>
</template>
