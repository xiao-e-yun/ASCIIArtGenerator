window.getBrightnessKernel = function (image, scale, colorInversion, brightnessBounds) {
  const x = Math.floor(scale[0] * this.thread.x)
  const y = Math.floor(scale[1] * this.thread.y)

  const pixel = image[y][x]
  if (colorInversion) {
    return (1.0 - (pixel.r * 0.2126 + pixel.g * 0.7152 + pixel.b * 0.0722) * pixel.a
      - brightnessBounds[0]) / (brightnessBounds[1] - brightnessBounds[0])
  } else {
    return ((pixel.r * 0.2126 + pixel.g * 0.7152 + pixel.b * 0.0722) * pixel.a
      - brightnessBounds[0]) / (brightnessBounds[1] - brightnessBounds[0])
  }
}

window.getCharactersKernel = function (image, granularity, characters, characterSize, characterBrightnessBounds) {
  let target = 0
  let offset = Infinity

  for (let i = 0; i < characterSize; i++) {
    let characterOffset = 0

    for (let rx = 0; rx < granularity[0]; rx++) {
      const x = this.thread.x * granularity[0] + rx

      for (let ry = 0; ry < granularity[1]; ry++) {
        const y = this.thread.y * granularity[1] + ry
        const pixel = image[y][x]

        const p = rx + ry * granularity[0]
        const character = characters[i][p]
        const characterBrightness = (character - characterBrightnessBounds[0]) / (characterBrightnessBounds[1] - characterBrightnessBounds[0])
        characterOffset += Math.abs(pixel - characterBrightness) ** 2
      }
    }

    if (characterOffset < offset) {
      offset = characterOffset
      target = i
    }
  }

  return target
}
