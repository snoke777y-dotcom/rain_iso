import { describe, expect, it } from "vitest";

import {
  DEFAULT_SMOOTH_ROUNDS,
  DEFAULT_SOFT_OBS_MAX_DELTA
} from "../../../app/infrastructure/rain_iso/cpu/smooth-params.js";

describe("smooth params defaults", () => {
  it("默认值与当前临时收口口径一致", () => {
    expect(DEFAULT_SMOOTH_ROUNDS).toBe(12);
    expect(DEFAULT_SOFT_OBS_MAX_DELTA).toBe(20);
  });
});
