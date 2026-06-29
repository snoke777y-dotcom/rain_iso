import { describe, expect, it } from "vitest";

import { FrameType, LegendId } from "../../../app/domain/rain_iso/models.js";
import { buildFrameResult } from "../../../app/application/rain_iso/results/build-frame-result.js";

describe("buildFrameResult", () => {
  it("输出统一 FrameResult 与 summary 聚合字段", () => {
    const result = buildFrameResult({
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:55:00+08:00",
      selectedBackend: "cpu",
      valueGrid: Float32Array.from([Number.NaN, 2, 4]),
      rainMask: new Uint8Array([0, 1, 1]),
      hardAnchorMask: new Uint8Array([0, 1, 0]),
      softObsMask: new Uint8Array([0, 0, 1]),
      knownMask: new Uint8Array([0, 1, 1]),
      suspectStationCount: 2,
      ordinaryOnlyMode: false
    });

    expect(result.legendId).toBe(LegendId.Legend5mV1);
    expect(result.summary.maxValue).toBe(4);
    expect(result.summary.renderableGridCount).toBe(2);
    expect(result.summary.hardAnchorCount).toBe(1);
    expect(result.summary.softObsCount).toBe(1);
    expect(result.summary.suspectStationCount).toBe(2);
    expect(result.summary.ordinaryOnlyMode).toBe(false);
    expect(result.summary.minRenderableValue).toBe(2);
    expect(result.summary.meanRenderableValue).toBe(3);
  });
});
