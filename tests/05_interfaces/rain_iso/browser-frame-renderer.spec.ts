import { describe, expect, it } from "vitest";

import { createBrowserFrameRenderer } from "../../../browser/frame-renderer.js";
import { createSampleBrowserAssetFiles } from "../../helpers/rain_iso_browser_fixtures.js";
import { loadAssetBundleFromDirectory } from "../../../app/interfaces/rain_iso/browser/index.js";
import { createFrameRendererEntry } from "../../../browser/frame-renderer-entry.js";
import type { FrameRendererWorkerRequest, FrameRendererWorkerResponse } from "../../../browser/frame-renderer-types.js";
import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";

class LoopbackRenderWorker {
  public onmessage: ((event: MessageEvent<FrameRendererWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private readonly entry = createFrameRendererEntry({
    postResponse: (response) => {
      queueMicrotask(() => {
        this.onmessage?.({
          data: response
        } as MessageEvent<FrameRendererWorkerResponse>);
      });
    }
  });

  postMessage(message: FrameRendererWorkerRequest): void {
    void this.entry.handleMessage(message);
  }

  terminate(): void {}
}

describe("browser frame renderer", () => {
  it("能在独立 worker 里渲染单帧", async () => {
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

    const bundle = await loadAssetBundleFromDirectory({
      files: createSampleBrowserAssetFiles().files
    });
    const renderer = createBrowserFrameRenderer({
      workerFactory: () => new LoopbackRenderWorker()
    });

    await renderer.loadAssets(bundle);
    const rendered = await renderer.renderFrame({
      frame: createFrameResult()
    });

    expect(rendered.frameKey).toBe("rain_5m|2026-06-24T13:55:00+08:00");
    expect(rendered.width).toBeGreaterThan(0);
    expect(rendered.height).toBeGreaterThan(0);
    expect(rendered.imageData.data.length).toBeGreaterThan(0);

    renderer.dispose();
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
