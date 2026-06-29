import type { FrameResult } from "../app/domain/rain_iso/models.js";
import type { TaskRunResult } from "../app/interfaces/rain_iso/types.js";

export function createPerfReporter(options: {
  emit?: (line: string) => void;
  now?: () => number;
} = {}) {
  const emit = options.emit ?? ((line: string) => console.info(line));
  const now = options.now ?? (() => performance.now());
  let lastRenderedAtMs: number | null = null;

  return {
    reset() {
      lastRenderedAtMs = null;
    },
    logFrameReady(input: {
      frame: FrameResult;
      index: number;
      total: number;
    }) {
      emit(
        `[perf][frame-ready] ${formatProgress(input.index, input.total)} ${input.frame.frameKey} ` +
          `gen=${formatMs(input.frame.summary.elapsedMs)} backend=${input.frame.selectedBackend}`
      );
    },
    logFrameRendered(input: {
      frame: FrameResult;
      index: number;
      total: number;
      renderElapsedMs: number;
    }) {
      const renderedAtMs = now();
      const deltaMs =
        lastRenderedAtMs == null ? undefined : renderedAtMs - lastRenderedAtMs;
      lastRenderedAtMs = renderedAtMs;
      emit(
        `[perf][frame-rendered] ${formatProgress(input.index, input.total)} ${input.frame.frameKey} ` +
          `gen=${formatMs(input.frame.summary.elapsedMs)} draw=${formatMs(input.renderElapsedMs)} ` +
          `delta=${formatMs(deltaMs)} backend=${input.frame.selectedBackend}`
      );
    },
    logTaskSummary(result: Pick<
      TaskRunResult,
      "completedFrames" | "totalFrames" | "elapsedMs" | "metrics" | "status"
    >) {
      emit(
        `[perf][task-summary] status=${result.status} frames=${result.completedFrames}/${result.totalFrames} ` +
          `first=${formatMs(result.metrics?.firstFrameMs)} avg=${formatMs(result.metrics?.averageFrameMs)} ` +
          `max=${formatMs(result.metrics?.maxFrameMs)} total-frame=${formatMs(result.metrics?.totalFrameMs)} ` +
          `total-task=${formatMs(result.elapsedMs ?? result.metrics?.totalTaskMs)}`
      );
    }
  };
}

function formatProgress(index: number, total: number) {
  return `${Math.max(0, index)}/${Math.max(0, total)}`;
}

function formatMs(value?: number) {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }
  return Math.abs(value - Math.round(value)) < 0.05
    ? `${Math.round(value)}ms`
    : `${value.toFixed(1)}ms`;
}
