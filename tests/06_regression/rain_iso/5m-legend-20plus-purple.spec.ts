import { describe, expect, it } from "vitest";

import { getLegendByFrameType, resolveLegendBin } from "../../../app/domain/rain_iso/legend.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";

describe("5m legend 20plus purple", () => {
  it("5 分钟产品 >=20mm 固定映射为深紫色", () => {
    const legend = getLegendByFrameType(FrameType.Rain5m);

    expect(resolveLegendBin(legend, 20)?.color).toBe("#9933FF");
    expect(resolveLegendBin(legend, 35)?.color).toBe("#9933FF");
  });
});
