import { afterEach, describe, expect, it, vi } from "vitest";

import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";
import { createTimelinePlayer } from "../../../app/interfaces/rain_iso/browser/index.js";

describe("timeline player", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("支持上一帧下一帧选择以及自动播放", () => {
    vi.useFakeTimers();
    const player = createTimelinePlayer({
      frames: [
        createFrameResult("rain_5m|2026-06-24T13:55:00+08:00"),
        createFrameResult("rain_5m|2026-06-24T14:00:00+08:00"),
        createFrameResult("accum_1h_step|2026-06-24T14:00:00+08:00", FrameType.Accum1hStep)
      ],
      intervalMs: 100
    });

    expect(player.getState().currentFrame?.frameKey).toBe("rain_5m|2026-06-24T13:55:00+08:00");

    player.next();
    expect(player.getState().currentFrame?.frameKey).toBe("rain_5m|2026-06-24T14:00:00+08:00");

    player.previous();
    expect(player.getState().currentIndex).toBe(0);

    player.play();
    vi.advanceTimersByTime(999);
    expect(player.getState().currentIndex).toBe(0);

    vi.advanceTimersByTime(1);
    expect(player.getState().currentIndex).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(player.getState().currentIndex).toBe(2);

    player.pause();
    expect(player.getState().isPlaying).toBe(false);
  });

  it("播放过程中追加新帧时不重置到首帧，并继续播放新帧", () => {
    vi.useFakeTimers();
    const first = createFrameResult("rain_5m|2026-06-24T13:55:00+08:00");
    const second = createFrameResult("rain_5m|2026-06-24T14:00:00+08:00");
    const third = createFrameResult("accum_1h_step|2026-06-24T14:00:00+08:00", FrameType.Accum1hStep);
    const player = createTimelinePlayer({
      frames: [first, second],
      intervalMs: 1000
    });

    player.play();
    vi.advanceTimersByTime(1000);
    expect(player.getState().currentFrame?.frameKey).toBe(second.frameKey);

    player.setFrames([first, second, third]);
    expect(player.getState().isPlaying).toBe(true);
    expect(player.getState().currentFrame?.frameKey).toBe(second.frameKey);

    vi.advanceTimersByTime(1000);
    expect(player.getState().currentFrame?.frameKey).toBe(third.frameKey);
  });

  it("支持切换到 2 倍和 3 倍速播放", () => {
    vi.useFakeTimers();
    const player = createTimelinePlayer({
      frames: [
        createFrameResult("rain_5m|2026-06-24T13:55:00+08:00"),
        createFrameResult("rain_5m|2026-06-24T14:00:00+08:00"),
        createFrameResult("rain_5m|2026-06-24T14:05:00+08:00"),
        createFrameResult("rain_5m|2026-06-24T14:10:00+08:00")
      ],
      intervalMs: 1000
    });

    player.setPlaybackRate(2);
    player.play();
    vi.advanceTimersByTime(499);
    expect(player.getState().currentIndex).toBe(0);
    vi.advanceTimersByTime(1);
    expect(player.getState().currentIndex).toBe(1);

    player.setPlaybackRate(3);
    vi.advanceTimersByTime(99);
    expect(player.getState().currentIndex).toBe(1);
    vi.advanceTimersByTime(1);
    expect(player.getState().currentIndex).toBe(2);
  });
});

function createFrameResult(
  frameKey: string,
  frameType: typeof FrameType[keyof typeof FrameType] = FrameType.Rain5m
): FrameResult {
  return {
    frameKey,
    frameType,
    frameTime: frameKey.split("|")[1],
    selectedBackend: "cpu",
    legendId:
      frameType === FrameType.Rain5m
        ? LegendId.Legend5mV1
        : LegendId.LegendAccum24hV1,
    valueGrid: new Float32Array([1, 0]),
    rainMask: new Uint8Array([1, 0]),
    hardAnchorMask: new Uint8Array([0, 0]),
    softObsMask: new Uint8Array([0, 0]),
    summary: {
      maxValue: 1,
      renderableGridCount: 1,
      hardAnchorCount: 0,
      softObsCount: 0,
      suspectStationCount: 0,
      ordinaryOnlyMode: false
    }
  };
}
