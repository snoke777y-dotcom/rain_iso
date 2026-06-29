import type { BackendKind } from "../../../domain/rain_iso/models.js";
import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { RainIsoDirectSequence } from "../../../infrastructure/rain_iso/package/raw-api-adapter.js";
import type {
  DetectBackendResult,
  FrameReadyEvent,
  LoadAssetsResult,
  StartTaskHandlers,
  TaskRunResult,
  WorkerLike
} from "../types.js";

export type BrowserAssetBundleSource =
  | {
      directoryHandle: FileSystemDirectoryHandle;
    }
  | {
      files: Iterable<File>;
    };

export type BrowserRainPackageSource = {
  realtime5mFile?: File;
  realtime1hFile?: File;
};

export type BrowserRainDataPackage = {
  stationIds: string[];
  rain5m: RainIsoDirectSequence;
  accum1h: RainIsoDirectSequence;
};

export type TimelinePlaybackState = {
  frames: import("../../../domain/rain_iso/models.js").FrameResult[];
  currentIndex: number;
  currentFrame: import("../../../domain/rain_iso/models.js").FrameResult | null;
  isPlaying: boolean;
  playbackRate: number;
};

export type TimelinePlayer = {
  getState: () => TimelinePlaybackState;
  subscribe: (listener: (state: TimelinePlaybackState) => void) => () => void;
  setFrames: (frames: import("../../../domain/rain_iso/models.js").FrameResult[]) => void;
  selectFrame: (index: number) => import("../../../domain/rain_iso/models.js").FrameResult | null;
  selectFrameByKey: (frameKey: string) => import("../../../domain/rain_iso/models.js").FrameResult | null;
  next: () => import("../../../domain/rain_iso/models.js").FrameResult | null;
  previous: () => import("../../../domain/rain_iso/models.js").FrameResult | null;
  setPlaybackRate: (playbackRate: number) => void;
  play: () => void;
  pause: () => void;
  dispose: () => void;
};

export type BrowserSessionTaskInput = {
  taskId: string;
  dataPackage: BrowserRainDataPackage;
  preferredBackend?: BackendKind;
  algorithmProfileVersion?: string;
  rainMaskRadiusConfig?: {
    minRadius?: number;
    maxRadius?: number;
    hardAnchorBonus?: number;
    expansionOffset?: number;
  };
};

export type RainIsoBrowserSession = {
  detectBackend: () => Promise<DetectBackendResult>;
  loadAssetBundle: (bundle: RainIsoAssetBundle) => Promise<LoadAssetsResult>;
  loadAssetBundleFromDirectory: (
    source: BrowserAssetBundleSource
  ) => Promise<LoadAssetsResult>;
  loadAssetBundleFromZip: (file: Blob) => Promise<LoadAssetsResult>;
  loadRainPackageFromFiles: (
    source: BrowserRainPackageSource
  ) => Promise<BrowserRainDataPackage>;
  startTask: (
    input: BrowserSessionTaskInput,
    handlers?: StartTaskHandlers
  ) => Promise<TaskRunResult>;
  cancelTask: (taskId: string) => void;
  dispose: () => void;
  getStatus: () => ReturnType<
    import("../worker-client.js").RainIsoWorkerClient["getStatus"]
  >;
};

export type CreateRainIsoBrowserSessionOptions = {
  requestIdFactory?: () => string;
  workerFactory?: () => WorkerLike;
  workerScriptUrl?: URL;
};

export type RenderFrameToCanvasResult = {
  width: number;
  height: number;
  frameKey: string;
};

export type RenderedFrameImageData = RenderFrameToCanvasResult & {
  imageData: ImageData;
};
