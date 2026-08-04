import { isHeicFile, isLikelyImageFile } from '../image-upload'

const file = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type })

describe('isLikelyImageFile', () => {
  it('accepts normal image MIME', () => {
    expect(isLikelyImageFile(file('a.jpg', 'image/jpeg'))).toBe(true)
  })

  it('accepts empty MIME with HEIC extension (iOS)', () => {
    const heic = file('IMG_1234.HEIC', '')
    expect(isHeicFile(heic)).toBe(true)
    expect(isLikelyImageFile(heic)).toBe(true)
  })

  it('accepts empty MIME with jpeg extension', () => {
    expect(isLikelyImageFile(file('photo.JPG', ''))).toBe(true)
  })

  it('rejects non-image without image extension', () => {
    expect(isLikelyImageFile(file('notes.txt', 'text/plain'))).toBe(false)
    expect(isLikelyImageFile(file('evil.bin', ''))).toBe(false)
  })
})
