import type { BackendKind, FrameResult } from "../../../domain/rain_iso/models.js";
import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { RainIsoDirectSequence } from "../../../infrastructure/rain_iso/package/raw-api-adapter.js";
import { validateLoadedRainIsoPackage } from "../../../infrastructure/rain_iso/package/package-validator.js";
import { createMetricsCollector, type MetricsSummary } from "../../../shared/metrics.js";
import { runFrameOnCpu } from "../use-cases/run-frame-on-cpu.js";
import { buildScheduledFrames } from "./frame-scheduler.js";

export const TaskRunnerPhase = {
  Assembling: "assembling"
} as const;

export type TaskRunnerPhase =
  (typeof TaskRunnerPhase)[keyof typeof TaskRunnerPhase];

export type TaskRunnerResult = {
  taskId: string;
  status: "completed" | "cancelled";
  completedFrames: number;
  totalFrames: number;
  elapsedMs: number;
  metrics: MetricsSummary;
};

export type TaskRunnerStartEvent = {
  taskId: string;
  selectedBackend: Exclude<BackendKind, "auto">;
  totalFrames: number;
};

export type TaskRunnerProgressEvent = {
  taskId: string;
  completedFrames: number;
  totalFrames: number;
  currentFrameKey: string;
  phase: TaskRunnerPhase;
};

export type TaskRunnerFrameEvent = {
  taskId: string;
  frameKey: string;
  frameResult: FrameResult;
};

export async function runTaskFrames(options: {
  taskId: string;
  rain5mSequence: RainIsoDirectSequence;
  accum1hSequence: RainIsoDirectSequence;
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
  >;
  selectedBackend: Exclude<BackendKind, "auto">;
  rainMaskRadiusConfig?: {
    minRadius?: number;
    maxRadius?: number;
    hardAnchorBonus?: number;
    expansionOffset?: number;
  };
  now?: () => number;
  isCancelled?: () => boolean;
  onFrameReady?: (event: TaskRunnerFrameEvent) => void;
  onTaskProgress?: (event: TaskRunnerProgressEvent) => void;
  onTaskStarted?: (event: TaskRunnerStartEvent) => void;
  yieldControl?: () => Promise<void>;
}): Promise<TaskRunnerResult> {
  validateLoadedRainIsoPackage({
    stationIds: options.rain5mSequence.stationIds,
    rain5m: options.rain5mSequence,
    accum1h: options.accum1hSequence
  });

  const now = options.now ?? (() => Date.now());
  const yieldControl = options.yieldControl ?? (async () => {});
  const scheduledFrames = buildScheduledFrames({
    rain5mSequence: options.rain5mSequence,
    accum1hSequence: options.accum1hSequence
  });
  const totalFrames = scheduledFrames.length;
  const taskStartedAt = now();
  const metrics = createMetricsCollector();
  let completedFrames = 0;
  let frameBackend = options.selectedBackend;

  options.onTaskStarted?.({
    taskId: options.taskId,
    selectedBackend: options.selectedBackend,
    totalFrames
  });

  for (const frame of scheduledFrames) {
    if (options.isCancelled?.()) {
      return {
        taskId: options.taskId,
        status: "cancelled",
        completedFrames,
        totalFrames,
        elapsedMs: now() - taskStartedAt,
        metrics: metrics.buildSummary(now() - taskStartedAt)
      };
    }

    await yieldControl();

    if (options.isCancelled?.()) {
      return {
        taskId: options.taskId,
        status: "cancelled",
        completedFrames,
        totalFrames,
        elapsedMs: now() - taskStartedAt,
        metrics: metrics.buildSummary(now() - taskStartedAt)
      };
    }

    const frameStartedAt = now();
    const frameResult = await runFrameOnCpu(frame, {
      assets: options.assets,
      selectedBackend: frameBackend,
      rainMaskRadiusConfig: options.rainMaskRadiusConfig
    });
    frameBackend = frameResult.selectedBackend;
    frameResult.summary.elapsedMs = now() - frameStartedAt;
    metrics.recordFrame(frameResult.summary.elapsedMs);
    completedFrames += 1;

    options.onFrameReady?.({
      taskId: options.taskId,
      frameKey: frame.frameKey,
      frameResult
    });
    options.onTaskProgress?.({
      taskId: options.taskId,
      completedFrames,
      totalFrames,
      currentFrameKey: frame.frameKey,
      phase: TaskRunnerPhase.Assembling
    });
  }

  return {
    taskId: options.taskId,
    status: "completed",
    completedFrames,
    totalFrames,
    elapsedMs: now() - taskStartedAt,
    metrics: metrics.buildSummary(now() - taskStartedAt)
  };
}
