import { describe, expect, it } from "vitest";

import { formatFrameElapsed } from "../../../browser/format-frame-elapsed.js";

describe("formatFrameElapsed", () => {
  it("未提供耗时时显示占位", () => {
    expect(formatFrameElapsed()).toBe("当前帧生成: -");
  });

  it("整数毫秒直接显示", () => {
    expect(formatFrameElapsed(12)).toBe("当前帧生成: 12ms");
  });

  it("小数毫秒保留一位", () => {
    expect(formatFrameElapsed(12.34)).toBe("当前帧生成: 12.3ms");
  });
});
