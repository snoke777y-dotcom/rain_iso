import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { FrameResult } from "../../../domain/rain_iso/models.js";
import { renderGridLayer } from "../render/render-grid-layer.js";
import type { RenderFrameToCanvasResult, RenderedFrameImageData } from "./types.js";

type CanvasLike =
  | HTMLCanvasElement
  | OffscreenCanvas
  | {
      width: number;
      height: number;
      getContext: (
        contextId: "2d"
      ) => Pick<CanvasRenderingContext2D, "putImageData"> | null;
    };

export function renderFrameToImageData(options: {
  frame: FrameResult;
  assets: Pick<RainIsoAssetBundle, "gridMeta" | "manifest" | "renderBoundary">;
  pixelScale?: number;
}): RenderedFrameImageData {
  const rendered = renderGridLayer({
    frameResult: options.frame,
    gridMeta: options.assets.gridMeta,
    renderBoundary: options.assets.renderBoundary,
    gridResolutionM: options.assets.manifest.grid_resolution_m,
    pixelScale: options.pixelScale ?? 1
  });

  return {
    width: rendered.width,
    height: rendered.height,
    frameKey: rendered.frameKey,
    imageData: new ImageData(rendered.pixels, rendered.width, rendered.height)
  };
}

export function drawRenderedFrameToCanvas(options: {
  renderedFrame: RenderedFrameImageData;
  canvas: CanvasLike;
}): RenderFrameToCanvasResult {
  const context = options.canvas.getContext("2d");
  if (!context) {
    throw new Error("2d canvas context is not available");
  }

  options.canvas.width = options.renderedFrame.width;
  options.canvas.height = options.renderedFrame.height;
  context.putImageData(options.renderedFrame.imageData, 0, 0);

  return {
    width: options.renderedFrame.width,
    height: options.renderedFrame.height,
    frameKey: options.renderedFrame.frameKey
  };
}

export function renderFrameToCanvas(options: {
  frame: FrameResult;
  assets: Pick<RainIsoAssetBundle, "gridMeta" | "manifest" | "renderBoundary">;
  canvas: CanvasLike;
  pixelScale?: number;
}): RenderFrameToCanvasResult {
  const renderedFrame = renderFrameToImageData(options);
  return drawRenderedFrameToCanvas({
    renderedFrame,
    canvas: options.canvas
  });
}
