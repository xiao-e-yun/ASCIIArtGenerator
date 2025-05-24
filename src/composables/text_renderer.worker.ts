import {chain, isEqual} from 'lodash'
import type {TexTRenderingRequest, TexTRenderingResult} from './text_renderer'

const EACH_PROCESS_TAKE_CHAR = 128
const RENDER_SIZE = 64

let granularity = [1, 2] as [number, number]

const measureCanvas = new OffscreenCanvas(RENDER_SIZE, RENDER_SIZE)
const measureCtx = measureCanvas.getContext('2d')!

measureCtx.textBaseline = 'middle'
measureCtx.fillStyle = 'black'
measureCtx.font = `bold ${RENDER_SIZE}px monospace`
measureCtx.textRendering = 'optimizeSpeed'

const canvas = new OffscreenCanvas(...granularity)
const ctx = canvas.getContext('2d', {willReadFrequently: true})!
ctx.imageSmoothingQuality = 'high'

let queue = [] as string[]

onmessage = ({data}: MessageEvent<TexTRenderingRequest>) => {
  const isPaused = queue.length === 0
  syncGranularity(data.granularity)
  queue.push(...data.characters)
  if (isPaused) process()
}

const checkEvents = async () => {
  const oldGranularity = granularity
  await new Promise((r) => setTimeout(r))
  return !isEqual(oldGranularity, granularity)
}

const syncGranularity = (newGranularity: [number, number]) => {
  if (!isEqual(newGranularity, granularity)) {
    granularity = newGranularity
    canvas.width = granularity[0]
    canvas.height = granularity[1]
    ctx.imageSmoothingQuality = 'high'

    queue = []
  }
}

async function process() {
  while (queue.length) {
    const chars = queue.splice(0, EACH_PROCESS_TAKE_CHAR)

    const brightnessBounds = [1, 0] as [number, number]

    const result = chars.map((char) => {
      const {width} = measureCtx.measureText(char)

      measureCtx.fillText(char, 0, RENDER_SIZE / 2, RENDER_SIZE)
      ctx.drawImage(measureCanvas, 0, 0, width, RENDER_SIZE, 0, 0, ...granularity)

      const brightness = chain(Array.from(ctx.getImageData(0, 0, ...granularity).data))
        .filter((_, i) => i % 4 === 3)
        .map((a) => a / 255)
        .forEach(v => {
          if (v < brightnessBounds[0]) brightnessBounds[0] = v
          if (v > brightnessBounds[1]) brightnessBounds[1] = v
        })
        .value()

      ctx.clearRect(0, 0, ...granularity)
      measureCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE)

      return [char, brightness]
    })

    const isGranularityChanged = await checkEvents()
    if (!isGranularityChanged) postMessage({
      bounds: brightnessBounds,
      characters: result,
    } as TexTRenderingResult)
  }
}
