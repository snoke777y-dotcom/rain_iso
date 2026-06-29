import { describe, expect, it } from "vitest";

import { shouldRenderFrame } from "../../../browser/should-render-frame.js";

describe("shouldRenderFrame", () => {
  it("首次出现帧时需要渲染", () => {
    expect(
      shouldRenderFrame({
        lastFrameKey: null,
        nextFrameKey: "rain_5m|2026-06-28T10:00:00+08:00"
      })
    ).toBe(true);
  });

  it("同一帧重复同步时不再重绘", () => {
    expect(
      shouldRenderFrame({
        lastFrameKey: "rain_5m|2026-06-28T10:00:00+08:00",
        nextFrameKey: "rain_5m|2026-06-28T10:00:00+08:00"
      })
    ).toBe(false);
  });

  it("切换到新帧时需要渲染", () => {
    expect(
      shouldRenderFrame({
        lastFrameKey: "rain_5m|2026-06-28T10:00:00+08:00",
        nextFrameKey: "rain_5m|2026-06-28T10:05:00+08:00"
      })
    ).toBe(true);
  });

  it("强制刷新时即使同一帧也会渲染", () => {
    expect(
      shouldRenderFrame({
        lastFrameKey: "rain_5m|2026-06-28T10:00:00+08:00",
        nextFrameKey: "rain_5m|2026-06-28T10:00:00+08:00",
        force: true
      })
    ).toBe(true);
  });
});
