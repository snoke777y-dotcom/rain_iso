import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildAnchorSets } from "../../../app/application/rain_iso/anchors/build-anchor-sets.js";

describe("buildAnchorSets", () => {
  it("识别固定锚点、动态锚点并去重，普通站集合不含锚点", () => {
    const effectiveStations = [
      station("FORT-1", 12),
      station("TZ-1", 11),
      station("DYN-1", 20),
      station("ORD-1", 1),
      station("SUS-1", 30, {
        status: "suspect",
        canBeDynamicAnchor: false,
        reason: "outside_normal_bins"
      }),
      ...Array.from({ length: 31 }, (_, index) =>
        station(`TOP-${String(index + 1).padStart(2, "0")}`, 19 - index * 0.1)
      )
    ];

    const anchorSets = buildAnchorSets(effectiveStations, {
      frameType: FrameType.Rain5m,
      fixedAnchorStationIds: new Set(["FORT-1", "TZ-1"])
    });

    expect(anchorSets.hardAnchorStations.map((station) => station.stationId)).toEqual(
      expect.arrayContaining(["FORT-1", "TZ-1", "DYN-1"])
    );
    expect(anchorSets.dynamicAnchorStations.map((station) => station.stationId)).toEqual(
      expect.arrayContaining(["DYN-1", "TOP-01", "TOP-29"])
    );
    expect(anchorSets.dynamicAnchorStations).toHaveLength(30);
    expect(anchorSets.ordinaryStations.map((station) => station.stationId)).toEqual([
      "ORD-1",
      "SUS-1",
      "TOP-30",
      "TOP-31"
    ]);
    expect(anchorSets.excludedStations).toEqual([]);
  });

  it("累计产品仍按当前累计值选择动态锚点", () => {
    const effectiveStations = [
      station("A001", 50),
      station("A002", 80)
    ];

    const anchorSets = buildAnchorSets(effectiveStations, {
      frameType: FrameType.Accum1hStep,
      fixedAnchorStationIds: new Set()
    });

    expect(anchorSets.dynamicAnchorStations.map((station) => station.stationId)).toEqual([
      "A002",
      "A001"
    ]);
  });
});

function station(
  stationId: string,
  value: number,
  overrides?: {
    status?: "normal" | "suspect";
    canBeDynamicAnchor?: boolean;
    reason?: "outside_normal_bins";
  }
) {
  return {
    stationId,
    longitude: 116.1,
    latitude: 39.9,
    value,
    status: overrides?.status ?? "normal",
    canBeDynamicAnchor: overrides?.canBeDynamicAnchor ?? true,
    ...(overrides?.reason ? { reason: overrides.reason } : {})
  } as const;
}
