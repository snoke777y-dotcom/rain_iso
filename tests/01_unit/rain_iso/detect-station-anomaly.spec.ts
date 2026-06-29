import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { detectStationAnomaly } from "../../../app/application/rain_iso/preprocess/detect-station-anomaly.js";

describe("detectStationAnomaly", () => {
  it("邻域不足 4 个参考站时，只保留硬无效规则，其余按 normal", () => {
    expect(
      detectStationAnomaly(
        {
          stationId: "A001",
          longitude: 116.0,
          latitude: 40.0,
          value: 12.5
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "A001",
              longitude: 116.0,
              latitude: 40.0,
              value: 12.5
            },
            {
              stationId: "A002",
              longitude: 116.01,
              latitude: 40.0,
              value: 8
            },
            {
              stationId: "A003",
              longitude: 116.015,
              latitude: 40.0,
              value: 6
            },
            {
              stationId: "A004",
              longitude: 116.4,
              latitude: 40.0,
              value: 5
            }
          ]
        }
      )
    ).toMatchObject({
      stationId: "A001",
      status: "normal",
      canBeDynamicAnchor: true
    });
  });

  it("5km 邻域不足 4 站时，若提供 fallback_nearest_neighbors 则用备用邻站补足判定", () => {
    expect(
      detectStationAnomaly(
        {
          stationId: "F001",
          longitude: 116.0,
          latitude: 40.0,
          value: 0.2
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "F001",
              longitude: 116.0,
              latitude: 40.0,
              value: 0.2
            },
            {
              stationId: "F002",
              longitude: 116.01,
              latitude: 40.0,
              value: 0.1
            },
            {
              stationId: "F010",
              longitude: 116.4,
              latitude: 40.0,
              value: 12
            },
            {
              stationId: "F011",
              longitude: 116.41,
              latitude: 40.0,
              value: 11
            },
            {
              stationId: "F012",
              longitude: 116.42,
              latitude: 40.0,
              value: 10
            },
            {
              stationId: "F013",
              longitude: 116.43,
              latitude: 40.0,
              value: 9
            }
          ],
          fallbackNeighborStationIdsByStationId: new Map([
            ["F001", ["F010", "F011", "F012", "F013"]]
          ])
        }
      )
    ).toMatchObject({
      stationId: "F001",
      status: "invalid",
      canBeDynamicAnchor: false,
      reason: "outside_suspect_bins"
    });
  });

  it("可信邻域最大值所在档位及相邻 1 档判为 normal，再外扩 1 档判为 suspect", () => {
    expect(
      detectStationAnomaly(
        {
          stationId: "A001",
          longitude: 116.0,
          latitude: 40.0,
          value: 3.2
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "A001",
              longitude: 116.0,
              latitude: 40.0,
              value: 3.2
            },
            {
              stationId: "A002",
              longitude: 116.01,
              latitude: 40.0,
              value: 12
            },
            {
              stationId: "A003",
              longitude: 116.012,
              latitude: 40.0,
              value: 8
            },
            {
              stationId: "A004",
              longitude: 116.013,
              latitude: 40.0,
              value: 6
            },
            {
              stationId: "A005",
              longitude: 116.014,
              latitude: 40.0,
              value: 12
            }
          ]
        }
      )
    ).toMatchObject({
      stationId: "A001",
      status: "suspect",
      canBeDynamicAnchor: false,
      reason: "outside_normal_bins"
    });

    expect(
      detectStationAnomaly(
        {
          stationId: "A006",
          longitude: 116.005,
          latitude: 40.0,
          value: 6.5
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "A006",
              longitude: 116.005,
              latitude: 40.0,
              value: 6.5
            },
            {
              stationId: "A002",
              longitude: 116.01,
              latitude: 40.0,
              value: 12
            },
            {
              stationId: "A003",
              longitude: 116.012,
              latitude: 40.0,
              value: 8
            },
            {
              stationId: "A004",
              longitude: 116.013,
              latitude: 40.0,
              value: 6
            },
            {
              stationId: "A005",
              longitude: 116.014,
              latitude: 40.0,
              value: 12
            }
          ]
        }
      )
    ).toMatchObject({
      stationId: "A006",
      status: "normal",
      canBeDynamicAnchor: true
    });
  });

  it("超出 suspect 外扩档位时标记为 invalid，并且邻域最大值不可信时回退为 normal", () => {
    expect(
      detectStationAnomaly(
        {
          stationId: "A001",
          longitude: 116.0,
          latitude: 40.0,
          value: 30
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "A001",
              longitude: 116.0,
              latitude: 40.0,
              value: 30
            },
            {
              stationId: "A002",
              longitude: 116.01,
              latitude: 40.0,
              value: 1.4
            },
            {
              stationId: "A003",
              longitude: 116.012,
              latitude: 40.0,
              value: 1.3
            },
            {
              stationId: "A004",
              longitude: 116.013,
              latitude: 40.0,
              value: 1.2
            },
            {
              stationId: "A005",
              longitude: 116.014,
              latitude: 40.0,
              value: 1.1
            }
          ]
        }
      )
    ).toMatchObject({
      stationId: "A001",
      status: "invalid",
      canBeDynamicAnchor: false,
      reason: "outside_suspect_bins"
    });

    expect(
      detectStationAnomaly(
        {
          stationId: "B001",
          longitude: 116.0,
          latitude: 40.0,
          value: 9
        },
        {
          frameType: FrameType.Rain5m,
          allValidStations: [
            {
              stationId: "B001",
              longitude: 116.0,
              latitude: 40.0,
              value: 9
            },
            {
              stationId: "B002",
              longitude: 116.01,
              latitude: 40.0,
              value: 10
            },
            {
              stationId: "B003",
              longitude: 116.012,
              latitude: 40.0,
              value: 4
            },
            {
              stationId: "B004",
              longitude: 116.013,
              latitude: 40.0,
              value: 3
            },
            {
              stationId: "B005",
              longitude: 116.014,
              latitude: 40.0,
              value: 2
            }
          ]
        }
      )
    ).toMatchObject({
      stationId: "B001",
      status: "normal",
      canBeDynamicAnchor: true
    });
  });
});
