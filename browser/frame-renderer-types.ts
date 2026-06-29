import type { FrameResult } from "../app/domain/rain_iso/models.js";
import type { GridMetaColumns } from "../app/infrastructure/rain_iso/assets/asset-types.js";

export type FrameRendererAssetsPayload = {
  gridMeta: GridMetaColumns;
  gridResolutionM?: number;
  renderBoundary?: Record<string, unknown>;
};

export type LoadRenderAssetsRequest = {
  type: "load_assets";
  requestId: string;
  payload: FrameRendererAssetsPayload;
};

export type RenderFrameRequest = {
  type: "render_frame";
  requestId: string;
  payload: {
    frame: FrameResult;
    pixelScale: number;
  };
};

export type FrameRendererWorkerRequest =
  | LoadRenderAssetsRequest
  | RenderFrameRequest;

export type RenderAssetsLoadedResponse = {
  type: "assets_loaded";
  requestId: string;
};

export type FrameRenderedResponse = {
  type: "frame_rendered";
  requestId: string;
  payload: {
    frameKey: string;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
  };
};

export type FrameRenderFailedResponse = {
  type: "render_failed";
  requestId: string;
  payload: {
    message: string;
  };
};

export type FrameRendererWorkerResponse =
  | RenderAssetsLoadedResponse
  | FrameRenderedResponse
  | FrameRenderFailedResponse;

export type FrameRendererWorkerLike = {
  onmessage: ((event: MessageEvent<FrameRendererWorkerResponse>) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage: (
    message: FrameRendererWorkerRequest,
    transfer?: Transferable[]
  ) => void;
  terminate: () => void;
};
