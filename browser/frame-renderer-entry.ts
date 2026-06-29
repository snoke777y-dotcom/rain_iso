import { renderGridLayer } from "../app/interfaces/rain_iso/render/render-grid-layer.js";
import type {
  FrameRendererAssetsPayload,
  FrameRendererWorkerRequest,
  FrameRendererWorkerResponse
} from "./frame-renderer-types.js";

export function createFrameRendererEntry(options: {
  postResponse: (
    response: FrameRendererWorkerResponse,
    transfer?: Transferable[]
  ) => void;
}) {
  let assets: FrameRendererAssetsPayload | null = null;

  return {
    async handleMessage(request: FrameRendererWorkerRequest) {
      try {
        if (request.type === "load_assets") {
          assets = request.payload;
          options.postResponse({
            type: "assets_loaded",
            requestId: request.requestId
          });
          return;
        }

        if (!assets) {
          throw new Error("渲染资产尚未加载");
        }

        const rendered = renderGridLayer({
          frameResult: request.payload.frame,
          gridMeta: assets.gridMeta,
          renderBoundary: assets.renderBoundary,
          gridResolutionM: assets.gridResolutionM,
          pixelScale: request.payload.pixelScale
        });

        options.postResponse(
          {
            type: "frame_rendered",
            requestId: request.requestId,
            payload: {
              frameKey: rendered.frameKey,
              width: rendered.width,
              height: rendered.height,
              pixels: rendered.pixels
            }
          },
          [rendered.pixels.buffer]
        );
      } catch (error) {
        options.postResponse({
          type: "render_failed",
          requestId: request.requestId,
          payload: {
            message: error instanceof Error ? error.message : "渲染失败"
          }
        });
      }
    }
  };
}
