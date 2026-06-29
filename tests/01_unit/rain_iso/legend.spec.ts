import { describe, expect, it } from "vitest";

import {
  getLegendByFrameType,
  getLegendById,
  resolveLegendBin
} from "../../../app/domain/rain_iso/legend.js";
import {
  FrameType,
  LegendId
} from "../../../app/domain/rain_iso/models.js";

describe("rain iso legends", () => {
  it("返回固定的 5 分钟图例配置", () => {
    const legend = getLegendById(LegendId.Legend5mV1);

    expect(legend.productType).toBe(FrameType.Rain5m);
    expect(legend.bins).toHaveLength(8);
    expect(legend.bins[0]).toMatchObject({
      min: 0.1,
      max: 0.4,
      color: "#97F297",
      textColor: "#333333"
    });
    expect(legend.bins[7]).toMatchObject({
      min: 20,
      max: null,
      color: "#9933FF",
      textColor: "#ffffff"
    });
  });

  it("按产品类型绑定正确图例", () => {
    expect(getLegendByFrameType(FrameType.Rain5m).legendId).toBe(
      LegendId.Legend5mV1
    );
    expect(getLegendByFrameType(FrameType.Accum1hStep).legendId).toBe(
      LegendId.LegendAccum24hV1
    );
  });

  it("按固定分档映射 5 分钟值和累计值", () => {
    const rain5mLegend = getLegendByFrameType(FrameType.Rain5m);
    const accumLegend = getLegendByFrameType(FrameType.Accum1hStep);

    expect(resolveLegendBin(rain5mLegend, 0.05)).toBeNull();
    expect(resolveLegendBin(rain5mLegend, 0.4)?.color).toBe("#3DCE3D");
    expect(resolveLegendBin(rain5mLegend, 19.99)?.color).toBe("#f8aa0a");
    expect(resolveLegendBin(rain5mLegend, 20)?.color).toBe("#9933FF");

    expect(resolveLegendBin(accumLegend, 9.9)?.color).toBe("#97F297");
    expect(resolveLegendBin(accumLegend, 24.9)?.color).toBe("#3DCE3D");
    expect(resolveLegendBin(accumLegend, 400)?.color).toBe("#9933FF");
  });
});
