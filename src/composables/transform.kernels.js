window.getBrightnessKernel = function(image, scale) {
  const x = Math.floor(scale[0] * this.thread.x)
  const y = Math.floor(scale[1] * this.thread.y)

  const pixel = image[y][x]
  return (1 - (pixel.r * 0.2126 + pixel.g * 0.7152 + pixel.b * 0.0722)) * pixel.a
}

window.getCharactersKernel = function(image, granularity, characters, characterSize) {
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
        characterOffset += Math.abs(pixel - characters[i][p])
      }
    }

    if (characterOffset < offset) {
      offset = characterOffset
      target = i
    }
  }

  return target
}
