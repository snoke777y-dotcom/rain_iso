import { describe, expect, it } from "vitest";

import { createPerfReporter } from "../../../browser/perf-monitor.js";
import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";

describe("perf monitor", () => {
  it("输出帧生成与重绘日志，并计算相邻重绘间隔", () => {
    const lines: string[] = [];
    let nowMs = 10;
    const reporter = createPerfReporter({
      emit: (line) => lines.push(line),
      now: () => nowMs
    });
    const frame = createFrameResult("rain_5m|2026-06-28T10:00:00+08:00", 12.3);

    reporter.logFrameReady({
      frame,
      index: 1,
      total: 3
    });

    nowMs = 18;
    reporter.logFrameRendered({
      frame,
      index: 1,
      total: 3,
      renderElapsedMs: 4.5
    });

    nowMs = 30;
    reporter.logFrameRendered({
      frame,
      index: 1,
      total: 3,
      renderElapsedMs: 5
    });

    expect(lines).toEqual([
      "[perf][frame-ready] 1/3 rain_5m|2026-06-28T10:00:00+08:00 gen=12.3ms backend=cpu",
      "[perf][frame-rendered] 1/3 rain_5m|2026-06-28T10:00:00+08:00 gen=12.3ms draw=4.5ms delta=- backend=cpu",
      "[perf][frame-rendered] 1/3 rain_5m|2026-06-28T10:00:00+08:00 gen=12.3ms draw=5ms delta=12ms backend=cpu"
    ]);
  });

  it("重置后清空上一帧间隔，并输出任务汇总", () => {
    const lines: string[] = [];
    const reporter = createPerfReporter({
      emit: (line) => lines.push(line),
      now: () => 100
    });
    const frame = createFrameResult("rain_5m|2026-06-28T10:05:00+08:00", 9);

    reporter.logFrameRendered({
      frame,
      index: 2,
      total: 3,
      renderElapsedMs: 2
    });
    reporter.reset();
    reporter.logFrameRendered({
      frame,
      index: 2,
      total: 3,
      renderElapsedMs: 3
    });
    reporter.logTaskSummary({
      status: "completed",
      completedFrames: 3,
      totalFrames: 3,
      elapsedMs: 90,
      metrics: {
        firstFrameMs: 8,
        averageFrameMs: 10,
        maxFrameMs: 12,
        totalFrameMs: 30,
        totalTaskMs: 90,
        frameCount: 3
      }
    });

    expect(lines.at(-2)).toBe(
      "[perf][frame-rendered] 2/3 rain_5m|2026-06-28T10:05:00+08:00 gen=9ms draw=3ms delta=- backend=cpu"
    );
    expect(lines.at(-1)).toBe(
      "[perf][task-summary] status=completed frames=3/3 first=8ms avg=10ms max=12ms total-frame=30ms total-task=90ms"
    );
  });
});

function createFrameResult(frameKey: string, elapsedMs: number): FrameResult {
  return {
    frameKey,
    frameType: FrameType.Rain5m,
    frameTime: frameKey.split("|")[1],
    selectedBackend: "cpu",
    legendId: LegendId.Legend5mV1,
    valueGrid: new Float32Array([1]),
    rainMask: new Uint8Array([1]),
    hardAnchorMask: new Uint8Array([0]),
    softObsMask: new Uint8Array([0]),
    summary: {
      maxValue: 1,
      renderableGridCount: 1,
      hardAnchorCount: 0,
      softObsCount: 0,
      suspectStationCount: 0,
      ordinaryOnlyMode: false,
      elapsedMs
    }
  };
}
