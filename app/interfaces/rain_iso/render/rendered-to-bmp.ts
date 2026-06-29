export function encodeRenderedBmp(input: {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}): Uint8Array {
  const pixelBytes = input.width * input.height * 4;
  const fileSize = 54 + pixelBytes;
  const bytes = new Uint8Array(fileSize);
  const view = new DataView(bytes.buffer);

  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, input.width, true);
  view.setInt32(22, input.height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(34, pixelBytes, true);

  let offset = 54;
  for (let row = input.height - 1; row >= 0; row -= 1) {
    for (let col = 0; col < input.width; col += 1) {
      const pixelOffset = (row * input.width + col) * 4;
      bytes[offset] = input.pixels[pixelOffset + 2];
      bytes[offset + 1] = input.pixels[pixelOffset + 1];
      bytes[offset + 2] = input.pixels[pixelOffset];
      bytes[offset + 3] = input.pixels[pixelOffset + 3];
      offset += 4;
    }
  }

  return bytes;
}
