import { describe, expect, it } from "vitest";

import { createFrameCache } from "../../../app/interfaces/rain_iso/cache/frame-cache.js";
import { createMetricsCollector } from "../../../app/shared/metrics.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";

describe("frame cache and metrics", () => {
  it("结果帧按 LRU 缓存，并支持按任务释放指定帧", () => {
    const cache = createFrameCache({
      maxEntries: 2
    });

    cache.set("task-1", "f1", createFrameResult("f1"));
    cache.set("task-1", "f2", createFrameResult("f2"));
    cache.set("task-1", "f3", createFrameResult("f3"));

    expect(cache.get("task-1", "f1")).toBeNull();
    expect(cache.get("task-1", "f2")?.frameKey).toBe("f2");
    expect(cache.get("task-1", "f3")?.frameKey).toBe("f3");

    cache.release("task-1", ["f2"]);
    expect(cache.get("task-1", "f2")).toBeNull();
    expect(cache.size()).toBe(1);
  });

  it("输出首帧、均帧和总耗时摘要", () => {
    const metrics = createMetricsCollector();
    metrics.recordFrame(120);
    metrics.recordFrame(80);

    expect(metrics.buildSummary(260)).toEqual({
      firstFrameMs: 120,
      averageFrameMs: 100,
      maxFrameMs: 120,
      totalFrameMs: 200,
      totalTaskMs: 260,
      frameCount: 2
    });
  });
});

function createFrameResult(frameKey: string) {
  return {
    frameKey,
    frameType: FrameType.Rain5m,
    frameTime: "2026-06-24T13:55:00+08:00",
    selectedBackend: "cpu" as const,
    legendId: "legend_5m_v1" as const,
    valueGrid: new Float32Array([1, 2, 3]),
    rainMask: new Uint8Array([1, 1, 1]),
    hardAnchorMask: new Uint8Array([1, 0, 0]),
    softObsMask: new Uint8Array([0, 1, 0]),
    summary: {
      maxValue: 3,
      renderableGridCount: 3,
      hardAnchorCount: 1,
      softObsCount: 1,
      suspectStationCount: 0,
      ordinaryOnlyMode: false
    }
  };
}
