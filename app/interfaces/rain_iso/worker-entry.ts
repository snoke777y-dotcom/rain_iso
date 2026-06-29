import {
  RAIN_ISO_ALGORITHM_PROFILE_VERSION,
  RAIN_ISO_PROTOCOL_VERSION
} from "../../domain/rain_iso/constants.js";
import type { RainIsoAssetBundle } from "../../infrastructure/rain_iso/assets/asset-types.js";
import {
  AssetValidationError,
  validateAssetBundle
} from "../../infrastructure/rain_iso/assets/asset-validator.js";
import { detectBackend } from "../../infrastructure/rain_iso/backends/detect-backend.js";
import type { BackendDetectionResult } from "../../infrastructure/rain_iso/backends/backend-types.js";
import { PackageValidationError } from "../../infrastructure/rain_iso/package/package-validator.js";
import { runTaskFrames } from "../../application/rain_iso/scheduler/task-runner.js";
import {
  RainIsoErrorCode,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload
} from "./types.js";

type WorkerRuntimeState = {
  assets: Pick<
    RainIsoAssetBundle,
    | "manifest"
    | "gridMeta"
    | "gridMask"
    | "gridNeighbors"
    | "stationMeta"
    | "stationToGrid"
    | "fixedAnchorStationIds"
    | "fallbackNeighborStationIdsByStationId"
  > | null;
  runningTask:
    | {
        requestId: string;
        taskId: string;
        cancelRequested: boolean;
      }
    | null;
};

export function createRainIsoWorkerEntry(options: {
  detectBackend?: (input: {
    preferredBackend?: "auto" | "webgpu" | "webgl2" | "cpu";
  }) => Promise<BackendDetectionResult>;
  now?: () => number;
  postResponse: (
    response: RainIsoWorkerResponse,
    transfer?: Transferable[]
  ) => void;
  yieldControl?: () => Promise<void>;
}) {
  const state: WorkerRuntimeState = {
    assets: null,
    runningTask: null
  };

  return {
    async handleMessage(request: RainIsoWorkerRequest): Promise<void> {
      switch (request.type) {
        case "detect_backend": {
          try {
            const detection = await resolveBackendSelection(
              options.detectBackend,
              "auto"
            );

            options.postResponse({
              type: "backend_detected",
              request_id: request.request_id,
              payload: {
                selected_backend: detection.selectedBackend,
                available_backends: detection.availableBackends
              }
            });
          } catch (error) {
            postTaskFailed(options.postResponse, request.request_id, null, error);
          }

          return;
        }

        case "load_assets": {
          try {
            const assets = hydrateAssets(request.payload);
            state.assets = assets;

            options.postResponse({
              type: "assets_loaded",
              request_id: request.request_id,
              payload: {
                asset_version: assets.manifest.asset_version,
                grid_count: assets.manifest.grid_count,
                station_count: assets.stationMeta.station_count,
                bbox_render: assets.manifest.bbox_render
              }
            });
          } catch (error) {
            postTaskFailed(options.postResponse, request.request_id, null, error);
          }
          return;
        }

        case "start_task": {
          if (state.runningTask) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              createWorkerError(
                RainIsoErrorCode.TaskAlreadyRunning,
                "已有任务正在运行"
              )
            );
            return;
          }

          if (!state.assets) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              createWorkerError(
                RainIsoErrorCode.AssetValidationFailed,
                "静态资产尚未加载"
              )
            );
            return;
          }

          if (
            request.payload.algorithm_profile_version &&
            request.payload.algorithm_profile_version !==
              state.assets.manifest.algorithm_profile_version
          ) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              new PackageValidationError("algorithm_profile_version 不匹配")
            );
            return;
          }

          let selectedBackend: "webgpu" | "webgl2" | "cpu";
          try {
            selectedBackend = (
              await resolveBackendSelection(
                options.detectBackend,
                request.payload.preferred_backend ?? "auto"
              )
            ).selectedBackend;
          } catch (error) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              error
            );
            return;
          }

          state.runningTask = {
            requestId: request.request_id,
            taskId: request.payload.task_id,
            cancelRequested: false
          };

          try {
            const result = await runTaskFrames({
              taskId: request.payload.task_id,
              rain5mSequence: request.payload.rain_5m_sequence,
              accum1hSequence: request.payload.accum_1h_sequence,
              assets: state.assets,
              selectedBackend,
              rainMaskRadiusConfig: request.payload.rain_mask_radius_config
                ? {
                    minRadius: request.payload.rain_mask_radius_config.min_radius,
                    maxRadius: request.payload.rain_mask_radius_config.max_radius,
                    hardAnchorBonus:
                      request.payload.rain_mask_radius_config.hard_anchor_bonus,
                    expansionOffset:
                      request.payload.rain_mask_radius_config.expansion_offset
                  }
                : undefined,
              now: options.now,
              yieldControl: options.yieldControl,
              isCancelled: () => state.runningTask?.cancelRequested === true,
              onTaskStarted: (event) => {
                options.postResponse({
                  type: "task_started",
                  request_id: request.request_id,
                  payload: {
                    task_id: event.taskId,
                    selected_backend: event.selectedBackend,
                    total_frames: event.totalFrames
                  }
                });
              },
              onTaskProgress: (event) => {
                options.postResponse({
                  type: "task_progress",
                  request_id: request.request_id,
                  payload: {
                    task_id: event.taskId,
                    completed_frames: event.completedFrames,
                    total_frames: event.totalFrames,
                    current_frame_key: event.currentFrameKey,
                    phase: event.phase
                  }
                });
              },
              onFrameReady: (event) => {
                options.postResponse(
                  {
                    type: "frame_ready",
                    request_id: request.request_id,
                    payload: {
                      task_id: event.taskId,
                      frame_key: event.frameKey,
                      frame_result: event.frameResult
                    }
                  },
                  collectFrameTransferables(event.frameResult)
                );
              }
            });

            if (result.status === "cancelled") {
              options.postResponse({
                type: "task_cancelled",
                request_id: request.request_id,
                payload: {
                  task_id: result.taskId,
                  completed_frames: result.completedFrames,
                  total_frames: result.totalFrames
                }
              });
            } else {
              options.postResponse({
                type: "task_completed",
                request_id: request.request_id,
                payload: {
                  task_id: result.taskId,
                  completed_frames: result.completedFrames,
                  total_frames: result.totalFrames,
                  elapsed_ms: result.elapsedMs,
                  metrics: result.metrics
                }
              });
            }
          } catch (error) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              error
            );
          } finally {
            state.runningTask = null;
          }

          return;
        }

        case "cancel_task": {
          if (!state.runningTask || state.runningTask.taskId !== request.payload.task_id) {
            postTaskFailed(
              options.postResponse,
              request.request_id,
              request.payload.task_id,
              createWorkerError(
                RainIsoErrorCode.TaskNotFound,
                "未找到可取消的任务"
              )
            );
            return;
          }

          state.runningTask.cancelRequested = true;
          return;
        }

        case "release_frame_cache": {
          return;
        }
      }
    }
  };
}

function hydrateAssets(
  payload: WorkerAssetPayload
): Pick<
  RainIsoAssetBundle,
  | "manifest"
  | "gridMeta"
  | "gridMask"
  | "gridNeighbors"
  | "stationMeta"
  | "stationToGrid"
  | "fixedAnchorStationIds"
  | "fallbackNeighborStationIdsByStationId"
> {
  if (payload.asset_manifest.protocol_version !== RAIN_ISO_PROTOCOL_VERSION) {
    throw new AssetValidationError("protocol_version 不兼容");
  }

  if (
    payload.asset_manifest.algorithm_profile_version !==
    RAIN_ISO_ALGORITHM_PROFILE_VERSION
  ) {
    throw new AssetValidationError("algorithm_profile_version 不兼容");
  }

  const assets = {
    manifest: payload.asset_manifest,
    gridMeta: {
      gridId: payload.grid_meta.grid_id,
      row: payload.grid_meta.row,
      col: payload.grid_meta.col,
      centerX: payload.grid_meta.center_x,
      centerY: payload.grid_meta.center_y
    },
    gridMask: payload.grid_mask,
    gridNeighbors: payload.grid_neighbors,
    stationToGrid: payload.station_to_grid,
    stationMeta: payload.station_meta,
    fixedAnchorStationIds: new Set(
      payload.station_meta.stations
        .filter(
          (station) =>
            station.is_fortress_anchor ||
            station.is_tongzhou_anchor ||
            station.is_cross_boundary_anchor
        )
        .map((station) => String(station.station_id))
    ),
    fallbackNeighborStationIdsByStationId: new Map(
      Object.entries(payload.fallback_neighbor_station_ids_by_station_id ?? {})
    )
  };

  validateAssetBundle(assets, {
    expectedAssetVersion: payload.asset_manifest.asset_version
  });

  return assets;
}

async function resolveBackendSelection(
  detector:
    | ((input: {
        preferredBackend?: "auto" | "webgpu" | "webgl2" | "cpu";
      }) => Promise<BackendDetectionResult>)
    | undefined,
  preferredBackend: "auto" | "webgpu" | "webgl2" | "cpu"
) {
  return (detector ?? ((input) => detectBackend(input)))({
    preferredBackend: preferredBackend ?? "auto"
  });
}

function createWorkerError(code: RainIsoErrorCode, message: string) {
  const error = new Error(message) as Error & {
    code: RainIsoErrorCode;
  };
  error.code = code;
  return error;
}

function postTaskFailed(
  postResponse: (
    response: RainIsoWorkerResponse,
    transfer?: Transferable[]
  ) => void,
  requestId: string,
  taskId: string | null,
  error: unknown
): void {
  const normalized = normalizeWorkerError(error);
  postResponse({
    type: "task_failed",
    request_id: requestId,
    payload: {
      task_id: taskId ?? "",
      error_code: normalized.code,
      message: normalized.message,
      details: normalized.details
    }
  });
}

function normalizeWorkerError(error: unknown): {
  code: RainIsoErrorCode;
  message: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof AssetValidationError) {
    return {
      code: RainIsoErrorCode.AssetValidationFailed,
      message: error.message
    };
  }

  if (error instanceof PackageValidationError) {
    return {
      code: RainIsoErrorCode.PackageValidationFailed,
      message: error.message
    };
  }

  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return {
      code: error.code as RainIsoErrorCode,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: RainIsoErrorCode.FrameComputeFailed,
      message: error.message
    };
  }

  return {
    code: RainIsoErrorCode.UnknownError,
    message: "未知 Worker 错误"
  };
}

function collectFrameTransferables(frameResult: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  knownMask?: Uint8Array;
}): Transferable[] {
  const transferables: Transferable[] = [
    frameResult.valueGrid.buffer,
    frameResult.rainMask.buffer,
    frameResult.hardAnchorMask.buffer,
    frameResult.softObsMask.buffer
  ];

  if (frameResult.knownMask) {
    transferables.push(frameResult.knownMask.buffer);
  }

  return transferables;
}
