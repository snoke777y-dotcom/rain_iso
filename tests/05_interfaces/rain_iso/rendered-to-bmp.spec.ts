import { describe, expect, it } from "vitest";

import { encodeRenderedBmp } from "../../../app/interfaces/rain_iso/render/rendered-to-bmp.js";

describe("encodeRenderedBmp", () => {
  it("能把 RGBA 像素编码成 32 位 BMP", () => {
    const rendered = {
      width: 2,
      height: 2,
      pixels: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        0, 0, 0, 0
      ])
    };

    const bmp = encodeRenderedBmp(rendered);
    const view = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);

    expect(String.fromCharCode(bmp[0], bmp[1])).toBe("BM");
    expect(view.getUint32(2, true)).toBe(54 + 2 * 2 * 4);
    expect(view.getInt32(18, true)).toBe(2);
    expect(view.getInt32(22, true)).toBe(2);
    expect(view.getUint16(28, true)).toBe(32);
    expect(Array.from(bmp.slice(54, 62))).toEqual([
      255, 0, 0, 255,
      0, 0, 0, 0
    ]);
  });
});
