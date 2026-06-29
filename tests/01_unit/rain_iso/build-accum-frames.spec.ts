import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildDirectFrames } from "../../../app/application/rain_iso/series/build-5m-frames.js";

describe("rain iso direct frame builders", () => {
  it("直接按接口给出的 5 分钟序列拆分分时帧", () => {
    const frames = buildDirectFrames({
      productType: FrameType.Rain5m,
      stationIds: ["A001", "B002"],
      frameTimes: [
        "2026-06-24T13:50:00+08:00",
        "2026-06-24T13:55:00+08:00"
      ],
      values: new Float32Array([0.2, 0, 0.5, 1.2])
    });

    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      frameKey: "rain_5m|2026-06-24T13:50:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:50:00+08:00"
    });
    expect(Array.from(frames[1].stationValues).map((value) => Number(value.toFixed(3)))).toEqual([
      0.5,
      1.2
    ]);
  });

  it("直接按接口给出的 1 小时累计序列拆分累计帧，不再由 5 分钟数据推导", () => {
    const frames = buildDirectFrames({
      productType: FrameType.Accum1hStep,
      stationIds: ["A001", "B002"],
      frameTimes: [
        "2026-06-24T14:00:00+08:00",
        "2026-06-24T15:00:00+08:00"
      ],
      values: new Float32Array([6.2, 8.5, 10.4, 12.8])
    });

    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      frameType: FrameType.Accum1hStep,
      frameTime: "2026-06-24T14:00:00+08:00"
    });
    expect(Array.from(frames[0].stationValues).map((value) => Number(value.toFixed(3)))).toEqual([
      6.2,
      8.5
    ]);
    expect(Array.from(frames[1].stationValues).map((value) => Number(value.toFixed(3)))).toEqual([
      10.4,
      12.8
    ]);
  });
});
