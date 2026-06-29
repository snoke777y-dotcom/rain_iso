import { describe, expect, it } from "vitest";

import { buildFrameCalendar } from "../../../app/application/rain_iso/series/frame-calendar.js";

describe("buildFrameCalendar", () => {
  it("把无序时间键整理成升序帧日历，并保留原始索引映射", () => {
    const calendar = buildFrameCalendar([
      "2026-06-24T15:00:00+08:00",
      "2026-06-24T13:00:00+08:00",
      "2026-06-24T14:00:00+08:00"
    ]);

    expect(calendar).toEqual([
      {
        frameTime: "2026-06-24T13:00:00+08:00",
        sourceIndex: 1
      },
      {
        frameTime: "2026-06-24T14:00:00+08:00",
        sourceIndex: 2
      },
      {
        frameTime: "2026-06-24T15:00:00+08:00",
        sourceIndex: 0
      }
    ]);
  });
});
