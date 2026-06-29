import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { FrameResult } from "../../../domain/rain_iso/models.js";
import { renderGridLayer } from "../render/render-grid-layer.js";
import type { RenderFrameToCanvasResult } from "./types.js";

export function renderFrameToCanvas(options: {
  frame: FrameResult;
  assets: Pick<RainIsoAssetBundle, "gridMeta" | "manifest" | "renderBoundary">;
  canvas:
    | HTMLCanvasElement
    | OffscreenCanvas
    | {
        width: number;
        height: number;
        getContext: (
          contextId: "2d"
        ) => Pick<CanvasRenderingContext2D, "putImageData"> | null;
      };
  pixelScale?: number;
}): RenderFrameToCanvasResult {
  const rendered = renderGridLayer({
    frameResult: options.frame,
    gridMeta: options.assets.gridMeta,
    renderBoundary: options.assets.renderBoundary,
    gridResolutionM: options.assets.manifest.grid_resolution_m,
    pixelScale: options.pixelScale ?? 1
  });

  const context = options.canvas.getContext("2d");
  if (!context) {
    throw new Error("2d canvas context is not available");
  }

  options.canvas.width = rendered.width;
  options.canvas.height = rendered.height;
  context.putImageData(new ImageData(rendered.pixels, rendered.width, rendered.height), 0, 0);

  return {
    width: rendered.width,
    height: rendered.height,
    frameKey: rendered.frameKey
  };
}
