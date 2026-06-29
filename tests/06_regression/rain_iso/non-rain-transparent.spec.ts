import { describe, expect, it } from "vitest";

import { FrameType, LegendId } from "../../../app/domain/rain_iso/models.js";
import { renderGridLayer } from "../../../app/interfaces/rain_iso/render/render-grid-layer.js";

describe("non rain transparent", () => {
  it("rain_mask=0 的格点透明", () => {
    const rendered = renderGridLayer({
      frameResult: {
        frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
        frameType: FrameType.Rain5m,
        frameTime: "2026-06-24T13:55:00+08:00",
        selectedBackend: "cpu",
        legendId: LegendId.Legend5mV1,
        valueGrid: new Float32Array([25, 25]),
        rainMask: new Uint8Array([1, 0]),
        hardAnchorMask: new Uint8Array([1, 0]),
        softObsMask: new Uint8Array([0, 0]),
        summary: {
          maxValue: 25,
          renderableGridCount: 1,
          hardAnchorCount: 1,
          softObsCount: 0,
          suspectStationCount: 0,
          ordinaryOnlyMode: false
        }
      },
      gridMeta: {
        gridId: new Int32Array([0, 1]),
        row: new Int32Array([0, 0]),
        col: new Int32Array([0, 1]),
        centerX: new Float32Array([0, 1000]),
        centerY: new Float32Array([0, 0])
      }
    });

    expect(Array.from(rendered.getPixel(0))).toEqual([153, 51, 255, 255]);
    expect(Array.from(rendered.getPixel(1))).toEqual([0, 0, 0, 0]);
  });
});
