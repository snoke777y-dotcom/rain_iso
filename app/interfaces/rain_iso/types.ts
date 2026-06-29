import {
  type BackendKind,
  type FrameResult
} from "../../domain/rain_iso/models.js";
import type {
  AssetManifest,
  StationMetaFile
} from "../../infrastructure/rain_iso/assets/asset-types.js";
import type { RainIsoDirectSequence } from "../../infrastructure/rain_iso/package/raw-api-adapter.js";
import type { MetricsSummary } from "../../shared/metrics.js";

export const RainIsoTaskStatus = {
  Idle: "idle",
  Busy: "busy",
  Terminated: "terminated"
} as const;

export type RainIsoTaskStatus =
  (typeof RainIsoTaskStatus)[keyof typeof RainIsoTaskStatus];

export const RainIsoErrorCode = {
  AssetValidationFailed: "ASSET_VALIDATION_FAILED",
  PackageValidationFailed: "PACKAGE_VALIDATION_FAILED",
  BackendUnavailable: "BACKEND_UNAVAILABLE",
  TaskAlreadyRunning: "TASK_ALREADY_RUNNING",
  TaskNotFound: "TASK_NOT_FOUND",
  GpuContextLost: "GPU_CONTEXT_LOST",
  GpuMemoryExceeded: "GPU_MEMORY_EXCEEDED",
  FrameComputeFailed: "FRAME_COMPUTE_FAILED",
  UnknownError: "UNKNOWN_ERROR"
} as const;

export type RainIsoErrorCode =
  (typeof RainIsoErrorCode)[keyof typeof RainIsoErrorCode];

export type DetectBackendRequest = {
  type: "detect_backend";
  request_id: string;
  payload: Record<string, never>;
};

export type LoadAssetsRequest = {
  type: "load_assets";
  request_id: string;
  payload: WorkerAssetPayload;
};

export type StartTaskRequest = {
  type: "start_task";
  request_id: string;
  payload: {
    task_id: string;
    rain_5m_sequence: RainIsoDirectSequence;
    accum_1h_sequence: RainIsoDirectSequence;
    preferred_backend?: BackendKind;
    algorithm_profile_version?: string;
    rain_mask_radius_config?: {
      min_radius?: number;
      max_radius?: number;
      hard_anchor_bonus?: number;
      expansion_offset?: number;
    };
  };
};

export type CancelTaskRequest = {
  type: "cancel_task";
  request_id: string;
  payload: {
    task_id: string;
  };
};

export type ReleaseFrameCacheRequest = {
  type: "release_frame_cache";
  request_id: string;
  payload: {
    task_id: string;
    frame_keys: string[];
  };
};

export type WorkerAssetPayload = {
  asset_manifest: AssetManifest;
  grid_meta: {
    grid_id: Int32Array;
    row: Int32Array;
    col: Int32Array;
    center_x: Float32Array;
    center_y: Float32Array;
  };
  grid_mask: Uint8Array;
  grid_neighbors: Int32Array;
  station_to_grid: Int32Array;
  station_meta: StationMetaFile;
  fallback_neighbor_station_ids_by_station_id?: Record<string, string[]>;
  render_boundary?: Record<string, unknown>;
};

export type RainIsoWorkerRequest =
  | DetectBackendRequest
  | LoadAssetsRequest
  | StartTaskRequest
  | CancelTaskRequest
  | ReleaseFrameCacheRequest;

export type AssetsLoadedResponse = {
  type: "assets_loaded";
  request_id: string;
  payload: {
    asset_version: string;
    grid_count: number;
    station_count: number;
    bbox_render?: number[];
  };
};

export type BackendDetectedResponse = {
  type: "backend_detected";
  request_id: string;
  payload: {
    selected_backend: Exclude<BackendKind, "auto">;
    available_backends: Array<Exclude<BackendKind, "auto">>;
  };
};

export type TaskStartedResponse = {
  type: "task_started";
  request_id: string;
  payload: {
    task_id: string;
    selected_backend: Exclude<BackendKind, "auto">;
    total_frames: number;
  };
};

export const RainIsoTaskPhase = {
  Validating: "validating",
  Preprocessing: "preprocessing",
  SelectingAnchors: "selecting_anchors",
  SeedingGrid: "seeding_grid",
  BuildingMask: "building_mask",
  Propagating: "propagating",
  Smoothing: "smoothing",
  Assembling: "assembling"
} as const;

export type RainIsoTaskPhase =
  (typeof RainIsoTaskPhase)[keyof typeof RainIsoTaskPhase];

export type TaskProgressResponse = {
  type: "task_progress";
  request_id: string;
  payload: {
    task_id: string;
    completed_frames: number;
    total_frames: number;
    current_frame_key: string;
    phase: RainIsoTaskPhase;
  };
};

export type FrameReadyResponse = {
  type: "frame_ready";
  request_id: string;
  payload: {
    task_id: string;
    frame_key: string;
    frame_result: FrameResult;
  };
};

export type TaskCompletedResponse = {
  type: "task_completed";
  request_id: string;
  payload: {
    task_id: string;
    completed_frames: number;
    total_frames: number;
    elapsed_ms: number;
    metrics: MetricsSummary;
  };
};

export type TaskCancelledResponse = {
  type: "task_cancelled";
  request_id: string;
  payload: {
    task_id: string;
    completed_frames?: number;
    total_frames?: number;
  };
};

export type TaskFailedResponse = {
  type: "task_failed";
  request_id: string;
  payload: {
    task_id: string;
    error_code: RainIsoErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type RainIsoWorkerResponse =
  | AssetsLoadedResponse
  | BackendDetectedResponse
  | TaskStartedResponse
  | TaskProgressResponse
  | FrameReadyResponse
  | TaskCompletedResponse
  | TaskCancelledResponse
  | TaskFailedResponse
;

export type DetectBackendResult = {
  selectedBackend: Exclude<BackendKind, "auto">;
  availableBackends: Array<Exclude<BackendKind, "auto">>;
};

export type LoadAssetsResult = {
  assetVersion: string;
  gridCount: number;
  stationCount: number;
  bboxRender?: number[];
};

export type StartTaskInput = {
  taskId: string;
  rain5mSequence: RainIsoDirectSequence;
  accum1hSequence: RainIsoDirectSequence;
  preferredBackend?: BackendKind;
  algorithmProfileVersion?: string;
  rainMaskRadiusConfig?: {
    minRadius?: number;
    maxRadius?: number;
    hardAnchorBonus?: number;
    expansionOffset?: number;
  };
};

export type TaskStartedEvent = {
  taskId: string;
  selectedBackend: Exclude<BackendKind, "auto">;
  totalFrames: number;
};

export type TaskProgressEvent = {
  taskId: string;
  completedFrames: number;
  totalFrames: number;
  currentFrameKey: string;
  phase: RainIsoTaskPhase;
};

export type FrameReadyEvent = {
  taskId: string;
  frameKey: string;
  frameResult: FrameResult;
};

export type TaskRunResult = {
  taskId: string;
  status: "completed" | "cancelled";
  completedFrames: number;
  totalFrames: number;
  elapsedMs?: number;
  metrics?: MetricsSummary;
};

export type StartTaskHandlers = {
  onTaskStarted?: (event: TaskStartedEvent) => void;
  onTaskProgress?: (event: TaskProgressEvent) => void;
  onFrameReady?: (event: FrameReadyEvent) => void;
};

export type WorkerLike = {
  onmessage: ((event: MessageEvent<RainIsoWorkerResponse>) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage: (message: RainIsoWorkerRequest, transfer?: Transferable[]) => void;
  terminate: () => void;
};

export class RainIsoError extends Error {
  public readonly code: RainIsoErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: RainIsoErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RainIsoError";
    this.code = code;
    this.details = details;
  }
}
