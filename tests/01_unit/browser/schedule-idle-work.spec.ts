import { describe, expect, it, vi } from "vitest";

import { scheduleIdleWork } from "../../../browser/schedule-idle-work.js";

describe("scheduleIdleWork", () => {
  it("优先使用 requestIdleCallback", () => {
    const requestIdleCallback = vi.fn(() => 123);
    const cancelIdleCallback = vi.fn();
    const callback = vi.fn();

    const cancel = scheduleIdleWork({
      scheduler: {
        requestIdleCallback,
        cancelIdleCallback,
        setTimeout,
        clearTimeout
      },
      callback
    });

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(123);
  });

  it("没有 requestIdleCallback 时退回到 setTimeout", () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    scheduleIdleWork({
      scheduler: {
        setTimeout,
        clearTimeout
      },
      callback
    });

    vi.advanceTimersByTime(79);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
