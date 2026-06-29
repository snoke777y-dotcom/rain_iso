import {
  type StartTaskHandlers,
  type StartTaskInput,
  type TaskRunResult,
  RainIsoError,
  RainIsoErrorCode,
  RainIsoTaskStatus,
  type DetectBackendResult,
  type LoadAssetsResult,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload,
  type WorkerLike
} from "./types.js";

type PendingRequest<TResponse> = {
  reject: (error: unknown) => void;
  resolve: (value: TResponse) => void;
};

type PendingDetectBackendRequest = PendingRequest<DetectBackendResult> & {
  kind: "detect_backend";
};

type PendingLoadAssetsRequest = PendingRequest<LoadAssetsResult> & {
  kind: "load_assets";
};

type PendingStartTaskRequest = PendingRequest<TaskRunResult> & {
  kind: "start_task";
  handlers?: StartTaskHandlers;
  lastCompletedFrames: number;
  totalFrames: number;
};

type PendingRequestState =
  | PendingDetectBackendRequest
  | PendingLoadAssetsRequest
  | PendingStartTaskRequest;

export type RainIsoWorkerClient = {
  detectBackend: () => Promise<DetectBackendResult>;
  loadAssets: (payload: WorkerAssetPayload) => Promise<LoadAssetsResult>;
  startTask: (
    input: StartTaskInput,
    handlers?: StartTaskHandlers
  ) => Promise<TaskRunResult>;
  cancelTask: (taskId: string) => void;
  dispose: () => void;
  getStatus: () => typeof RainIsoTaskStatus[keyof typeof RainIsoTaskStatus];
};

export type CreateRainIsoWorkerClientOptions = {
  requestIdFactory?: () => string;
  worker: WorkerLike;
};

export function createRainIsoWorkerClient(
  options: CreateRainIsoWorkerClientOptions
): RainIsoWorkerClient {
  const requestIdFactory = options.requestIdFactory ?? createRequestId;
  const pendingRequests = new Map<string, PendingRequestState>();
  let status: typeof RainIsoTaskStatus[keyof typeof RainIsoTaskStatus] =
    RainIsoTaskStatus.Idle;

  options.worker.onmessage = (
    event: MessageEvent<RainIsoWorkerResponse>
  ): void => {
    const response = event.data;
    const pendingRequest = pendingRequests.get(response.request_id);
    if (!pendingRequest) {
      return;
    }

    if (response.type === "backend_detected" && pendingRequest.kind === "detect_backend") {
      pendingRequests.delete(response.request_id);
      status = RainIsoTaskStatus.Idle;
      pendingRequest.resolve({
        selectedBackend: response.payload.selected_backend,
        availableBackends: response.payload.available_backends
      } satisfies DetectBackendResult);
      return;
    }

    if (response.type === "assets_loaded" && pendingRequest.kind === "load_assets") {
      pendingRequests.delete(response.request_id);
      status = RainIsoTaskStatus.Idle;
      pendingRequest.resolve({
        assetVersion: response.payload.asset_version,
        gridCount: response.payload.grid_count,
        stationCount: response.payload.station_count,
        bboxRender: response.payload.bbox_render
      });
      return;
    }

    if (response.type === "task_started" && pendingRequest.kind === "start_task") {
      pendingRequest.totalFrames = response.payload.total_frames;
      pendingRequest.handlers?.onTaskStarted?.({
        taskId: response.payload.task_id,
        selectedBackend: response.payload.selected_backend,
        totalFrames: response.payload.total_frames
      });
      return;
    }

    if (response.type === "task_progress" && pendingRequest.kind === "start_task") {
      pendingRequest.lastCompletedFrames = response.payload.completed_frames;
      pendingRequest.totalFrames = response.payload.total_frames;
      pendingRequest.handlers?.onTaskProgress?.({
        taskId: response.payload.task_id,
        completedFrames: response.payload.completed_frames,
        totalFrames: response.payload.total_frames,
        currentFrameKey: response.payload.current_frame_key,
        phase: response.payload.phase
      });
      return;
    }

    if (response.type === "frame_ready" && pendingRequest.kind === "start_task") {
      pendingRequest.handlers?.onFrameReady?.({
        taskId: response.payload.task_id,
        frameKey: response.payload.frame_key,
        frameResult: response.payload.frame_result
      });
      return;
    }

    if (response.type === "task_completed" && pendingRequest.kind === "start_task") {
      pendingRequests.delete(response.request_id);
      status = RainIsoTaskStatus.Idle;
      pendingRequest.resolve({
        taskId: response.payload.task_id,
        status: "completed",
        completedFrames: response.payload.completed_frames,
        totalFrames: response.payload.total_frames,
        elapsedMs: response.payload.elapsed_ms,
        metrics: response.payload.metrics
      });
      return;
    }

    if (response.type === "task_cancelled" && pendingRequest.kind === "start_task") {
      pendingRequests.delete(response.request_id);
      status = RainIsoTaskStatus.Idle;
      pendingRequest.resolve({
        taskId: response.payload.task_id,
        status: "cancelled",
        completedFrames:
          response.payload.completed_frames ?? pendingRequest.lastCompletedFrames,
        totalFrames: response.payload.total_frames ?? pendingRequest.totalFrames
      });
      return;
    }

    if (response.type === "task_failed") {
      pendingRequests.delete(response.request_id);
      status = RainIsoTaskStatus.Idle;
      pendingRequest.reject(
        new RainIsoError(
          normalizeErrorCode(response.payload.error_code),
          response.payload.message,
          response.payload.details
        )
      );
      return;
    }

    pendingRequest.reject(
      new RainIsoError(
        RainIsoErrorCode.UnknownError,
        `Unsupported worker response: ${response.type}`
      )
    );
  };

  options.worker.onerror = (): void => {
    status = RainIsoTaskStatus.Idle;
    for (const [requestId, pendingRequest] of pendingRequests) {
      pendingRequest.reject(
        new RainIsoError(
          RainIsoErrorCode.UnknownError,
          "Worker runtime error"
        )
      );
      pendingRequests.delete(requestId);
    }
  };

    return {
    async detectBackend(): Promise<DetectBackendResult> {
      const request: RainIsoWorkerRequest = {
        type: "detect_backend",
        request_id: requestIdFactory(),
        payload: {}
      };

      status = RainIsoTaskStatus.Busy;

      return new Promise<DetectBackendResult>((resolve, reject) => {
        pendingRequests.set(request.request_id, {
          kind: "detect_backend",
          resolve,
          reject
        });
        options.worker.postMessage(request);
      });
    },
    async loadAssets(payload: WorkerAssetPayload): Promise<LoadAssetsResult> {
      const request: RainIsoWorkerRequest = {
        type: "load_assets",
        request_id: requestIdFactory(),
        payload
      };

      status = RainIsoTaskStatus.Busy;

      return new Promise<LoadAssetsResult>((resolve, reject) => {
        pendingRequests.set(request.request_id, {
          kind: "load_assets",
          resolve,
          reject
        });
        options.worker.postMessage(request);
      });
    },
    async startTask(
      input: StartTaskInput,
      handlers?: StartTaskHandlers
    ): Promise<TaskRunResult> {
      const request: RainIsoWorkerRequest = {
        type: "start_task",
        request_id: requestIdFactory(),
        payload: {
          task_id: input.taskId,
          rain_5m_sequence: input.rain5mSequence,
          accum_1h_sequence: input.accum1hSequence,
          preferred_backend: input.preferredBackend ?? "auto",
          algorithm_profile_version: input.algorithmProfileVersion,
          rain_mask_radius_config: input.rainMaskRadiusConfig
            ? {
                min_radius: input.rainMaskRadiusConfig.minRadius,
                max_radius: input.rainMaskRadiusConfig.maxRadius,
                hard_anchor_bonus: input.rainMaskRadiusConfig.hardAnchorBonus,
                expansion_offset: input.rainMaskRadiusConfig.expansionOffset
              }
            : undefined
        }
      };

      status = RainIsoTaskStatus.Busy;

      return new Promise<TaskRunResult>((resolve, reject) => {
        pendingRequests.set(request.request_id, {
          kind: "start_task",
          resolve,
          reject,
          handlers,
          lastCompletedFrames: 0,
          totalFrames: 0
        });
        options.worker.postMessage(request);
      });
    },
    cancelTask(taskId: string): void {
      const request: RainIsoWorkerRequest = {
        type: "cancel_task",
        request_id: requestIdFactory(),
        payload: {
          task_id: taskId
        }
      };

      options.worker.postMessage(request);
    },
    dispose(): void {
      status = RainIsoTaskStatus.Terminated;
      options.worker.terminate();
    },
    getStatus() {
      return status;
    }
  };
}

function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeErrorCode(value: string) {
  const codes = Object.values(RainIsoErrorCode);
  return codes.includes(value as (typeof codes)[number])
    ? (value as typeof codes[number])
    : RainIsoErrorCode.UnknownError;
}
