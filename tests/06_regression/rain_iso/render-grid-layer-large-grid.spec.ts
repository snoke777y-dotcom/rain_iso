import { describe, expect, it } from "vitest";

import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";
import { renderGridLayer } from "../../../app/interfaces/rain_iso/render/render-grid-layer.js";

describe("renderGridLayer large grid", () => {
  it("大网格时不会因为展开 typed array 而栈溢出", () => {
    const gridCount = 200_000;
    const cols = 500;
    const rows = Math.ceil(gridCount / cols);
    const row = new Int32Array(gridCount);
    const col = new Int32Array(gridCount);
    for (let index = 0; index < gridCount; index += 1) {
      row[index] = Math.floor(index / cols);
      col[index] = index % cols;
    }

    const rendered = renderGridLayer({
      frameResult: createFrameResult(gridCount),
      gridMeta: {
        gridId: Int32Array.from({ length: gridCount }, (_, index) => index),
        row,
        col,
        centerX: new Float32Array(gridCount),
        centerY: new Float32Array(gridCount)
      }
    });

    expect(rendered.width).toBe(cols);
    expect(rendered.height).toBe(rows);
  });
});

function createFrameResult(gridCount: number): FrameResult {
  return {
    frameKey: "accum_1h_step|2025-07-23T23:00:00+08:00",
    frameType: FrameType.Accum1hStep,
    frameTime: "2025-07-23T23:00:00+08:00",
    selectedBackend: "cpu",
    legendId: LegendId.LegendAccum24hV1,
    valueGrid: new Float32Array(gridCount).fill(1),
    rainMask: new Uint8Array(gridCount).fill(1),
    hardAnchorMask: new Uint8Array(gridCount),
    softObsMask: new Uint8Array(gridCount),
    summary: {
      maxValue: 1,
      renderableGridCount: gridCount,
      hardAnchorCount: 0,
      softObsCount: 0,
      suspectStationCount: 0,
      ordinaryOnlyMode: false
    }
  };
}
