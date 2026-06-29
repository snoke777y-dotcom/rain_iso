import type { FrameResult } from "../app/domain/rain_iso/models.js";
import type { RainIsoAssetBundle } from "../app/infrastructure/rain_iso/assets/asset-types.js";
import type { RenderedFrameImageData } from "../app/interfaces/rain_iso/browser/index.js";
import defaultWorkerScriptUrl from "./frame-renderer-runtime.ts?worker&url";
import type {
  FrameRendererAssetsPayload,
  FrameRendererWorkerLike,
  FrameRendererWorkerRequest,
  FrameRendererWorkerResponse
} from "./frame-renderer-types.js";

export function createBrowserFrameRenderer(options: {
  requestIdFactory?: () => string;
  workerFactory?: () => FrameRendererWorkerLike;
  workerScriptUrl?: URL;
} = {}) {
  const requestIdFactory = options.requestIdFactory ?? createRequestId;
  const worker =
    options.workerFactory?.() ??
    (new Worker(
      options.workerScriptUrl ?? new URL(defaultWorkerScriptUrl, import.meta.url),
      { type: "module" }
    ) as unknown as FrameRendererWorkerLike);
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
      kind: "load_assets" | "render_frame";
    }
  >();

  worker.onmessage = (event: MessageEvent<FrameRendererWorkerResponse>) => {
    const response = event.data;
    const pending = pendingRequests.get(response.requestId);
    if (!pending) {
      return;
    }

    pendingRequests.delete(response.requestId);
    if (response.type === "assets_loaded" && pending.kind === "load_assets") {
      pending.resolve(undefined);
      return;
    }

    if (response.type === "frame_rendered" && pending.kind === "render_frame") {
      pending.resolve({
        frameKey: response.payload.frameKey,
        width: response.payload.width,
        height: response.payload.height,
        imageData: new ImageData(
          response.payload.pixels,
          response.payload.width,
          response.payload.height
        )
      } satisfies RenderedFrameImageData);
      return;
    }

    const message =
      response.type === "render_failed"
        ? response.payload.message
        : `Unsupported render worker response: ${response.type}`;
    pending.reject(new Error(message));
  };

  worker.onerror = () => {
    for (const [requestId, pending] of pendingRequests) {
      pending.reject(new Error("渲染 worker 异常"));
      pendingRequests.delete(requestId);
    }
  };

  return {
    loadAssets(bundle: Pick<RainIsoAssetBundle, "gridMeta" | "manifest" | "renderBoundary">) {
      const request = {
        type: "load_assets",
        requestId: requestIdFactory(),
        payload: toRenderAssetsPayload(bundle)
      } satisfies FrameRendererWorkerRequest;
      return new Promise<void>((resolve, reject) => {
        pendingRequests.set(request.requestId, {
          kind: "load_assets",
          resolve,
          reject
        });
        worker.postMessage(request);
      });
    },
    renderFrame(options: {
      frame: FrameResult;
      pixelScale?: number;
    }) {
      const request = {
        type: "render_frame",
        requestId: requestIdFactory(),
        payload: {
          frame: options.frame,
          pixelScale: options.pixelScale ?? 2
        }
      } satisfies FrameRendererWorkerRequest;
      return new Promise<RenderedFrameImageData>((resolve, reject) => {
        pendingRequests.set(request.requestId, {
          kind: "render_frame",
          resolve,
          reject
        });
        worker.postMessage(request);
      });
    },
    dispose() {
      worker.terminate();
    }
  };
}

function toRenderAssetsPayload(
  bundle: Pick<RainIsoAssetBundle, "gridMeta" | "manifest" | "renderBoundary">
): FrameRendererAssetsPayload {
  return {
    gridMeta: bundle.gridMeta,
    gridResolutionM: bundle.manifest.grid_resolution_m,
    renderBoundary: bundle.renderBoundary
  };
}

function createRequestId() {
  return `render_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
