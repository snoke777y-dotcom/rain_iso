import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { estimateExpansionRadius } from "../../../app/application/rain_iso/mask/estimate-expansion-radius.js";

describe("estimateExpansionRadius", () => {
  it("无已知格时返回 0，否则按产品类型夹逼到最小半径", () => {
    expect(
      estimateExpansionRadius({
        frameType: FrameType.Rain5m,
        knownGridCount: 0,
        hardAnchorGridIds: [],
        gridCenterX: new Float32Array([0]),
        gridCenterY: new Float32Array([0])
      })
    ).toBe(0);

    expect(
      estimateExpansionRadius({
        frameType: FrameType.Rain5m,
        knownGridCount: 1,
        hardAnchorGridIds: [0],
        gridCenterX: new Float32Array([0]),
        gridCenterY: new Float32Array([0])
      })
    ).toBe(3);

    expect(
      estimateExpansionRadius({
        frameType: FrameType.Accum1hStep,
        knownGridCount: 1,
        hardAnchorGridIds: [0],
        gridCenterX: new Float32Array([0]),
        gridCenterY: new Float32Array([0])
      })
    ).toBe(6);
  });

  it("活动锚点间距很大时半径增大，但不超过上限", () => {
    const radius = estimateExpansionRadius({
      frameType: FrameType.Rain5m,
      knownGridCount: 2,
      hardAnchorGridIds: [0, 20],
      gridCenterX: new Float32Array(
        Array.from({ length: 21 }, (_, index) => index * 1000)
      ),
      gridCenterY: new Float32Array(Array.from({ length: 21 }, () => 0))
    });

    expect(radius).toBe(10);
  });
});
