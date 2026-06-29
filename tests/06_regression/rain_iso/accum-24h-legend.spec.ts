import { describe, expect, it } from "vitest";

import { getLegendByFrameType, resolveLegendBin } from "../../../app/domain/rain_iso/legend.js";
import { FrameType, LegendId } from "../../../app/domain/rain_iso/models.js";

describe("accum 24h legend", () => {
  it("累计产品使用 24 小时固定图例", () => {
    const legend = getLegendByFrameType(FrameType.Accum1hStep);

    expect(legend.legendId).toBe(LegendId.LegendAccum24hV1);
    expect(resolveLegendBin(legend, 120)?.label).toBe("100~250");
    expect(resolveLegendBin(legend, 450)?.label).toBe("400+");
  });
});
