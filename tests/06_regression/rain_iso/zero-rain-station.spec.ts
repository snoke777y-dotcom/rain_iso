import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildEffectiveStations } from "../../../app/application/rain_iso/preprocess/build-effective-stations.js";

describe("buildEffectiveStations", () => {
  it("P=0 站点绝不进入有效站点列表，suspect 站点保留但不能进动态锚点", () => {
    const result = buildEffectiveStations(
      [
        { stationId: "A001", longitude: 116.0, latitude: 40.0, value: 0 },
        { stationId: "A002", longitude: 116.001, latitude: 40.0, value: 3.2 },
        { stationId: "A003", longitude: 116.002, latitude: 40.0, value: 1.3 },
        { stationId: "A004", longitude: 116.003, latitude: 40.0, value: 12.0 },
        { stationId: "A005", longitude: 116.004, latitude: 40.0, value: 8.0 },
        { stationId: "A006", longitude: 116.005, latitude: 40.0, value: 6.0 },
        { stationId: "A007", longitude: 116.006, latitude: 40.0, value: 11.0 }
      ],
      {
        frameType: FrameType.Rain5m,
        validStationIds: new Set([
          "A001",
          "A002",
          "A003",
          "A004",
          "A005",
          "A006",
          "A007"
        ])
      }
    );

    expect(result.effectiveStations).toEqual(
      expect.arrayContaining([
        {
          stationId: "A002",
          longitude: 116.001,
          latitude: 40.0,
          value: 3.2,
          status: "suspect",
          canBeDynamicAnchor: false,
          reason: "outside_normal_bins"
        }
      ])
    );
    expect(result.effectiveStations).toHaveLength(5);
    expect(result.excludedStations).toEqual(
      expect.arrayContaining([
        {
          stationId: "A001",
          longitude: 116.0,
          latitude: 40.0,
          value: 0,
          reason: "zero_rain_filtered"
        },
        {
          stationId: "A003",
          longitude: 116.002,
          latitude: 40.0,
          value: 1.3,
          reason: "outside_suspect_bins"
        }
      ])
    );
    expect(result.excludedStations).toHaveLength(2);
  });
});
