import { describe, expect, it } from "vitest";

import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";
import {
  loadAssetBundleFromDirectory,
  renderFrameToCanvas
} from "../../../app/interfaces/rain_iso/browser/index.js";
import { createSampleBrowserAssetFiles } from "../../helpers/rain_iso_browser_fixtures.js";

describe("renderFrameToCanvas", () => {
  it("能把渲染结果写入 2d canvas 上下文", async () => {
    if (!("ImageData" in globalThis)) {
      class TestImageData {
        constructor(
          public readonly data: Uint8ClampedArray,
          public readonly width: number,
          public readonly height: number
        ) {}
      }
      Object.assign(globalThis, { ImageData: TestImageData });
    }

    const assets = await loadAssetBundleFromDirectory({
      files: createSampleBrowserAssetFiles().files
    });
    const calls: Array<{ x: number; y: number; width: number; height: number }> = [];
    const canvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          putImageData(imageData: { width: number; height: number }, x: number, y: number) {
            calls.push({
              x,
              y,
              width: imageData.width,
              height: imageData.height
            });
          }
        };
      }
    };

    const result = renderFrameToCanvas({
      frame: createFrameResult(),
      assets,
      canvas
    });

    expect(result.frameKey).toBe("rain_5m|2026-06-24T13:55:00+08:00");
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(calls).toHaveLength(1);
  });
});

function createFrameResult(): FrameResult {
  return {
    frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
    frameType: FrameType.Rain5m,
    frameTime: "2026-06-24T13:55:00+08:00",
    selectedBackend: "cpu",
    legendId: LegendId.Legend5mV1,
    valueGrid: new Float32Array([2, 1]),
    rainMask: new Uint8Array([1, 1]),
    hardAnchorMask: new Uint8Array([0, 0]),
    softObsMask: new Uint8Array([0, 0]),
    summary: {
      maxValue: 2,
      renderableGridCount: 2,
      hardAnchorCount: 0,
      softObsCount: 0,
      suspectStationCount: 0,
      ordinaryOnlyMode: false
    }
  };
}
