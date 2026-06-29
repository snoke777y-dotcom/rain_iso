import { describe, expect, it } from "vitest";

import { buildFrameObservations } from "../../../app/application/rain_iso/use-cases/run-frame-common.js";
import { mapStationsToGrid } from "../../../app/application/rain_iso/grids/map-stations-to-grid.js";

describe("frame asset cache", () => {
  it("buildFrameObservations 支持复用预构建的 stationMetaById", () => {
    const observations = buildFrameObservations(
      {
        frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
        frameType: "rain_5m",
        frameTime: "2026-06-24T13:55:00+08:00",
        stationIds: ["A"],
        stationValues: new Float32Array([2])
      },
      {
        stationMeta: {
          station_count: 0,
          stations: []
        },
        stationMetaById: new Map([
          [
            "A",
            {
              station_id: "A",
              lon: 116.1,
              lat: 39.9
            }
          ]
        ])
      }
    );

    expect(observations).toEqual([
      {
        stationId: "A",
        longitude: 116.1,
        latitude: 39.9,
        value: 2
      }
    ]);
  });

  it("mapStationsToGrid 支持复用预构建的 gridIdByStationId", () => {
    const mapped = mapStationsToGrid(
      [
        {
          stationId: "A",
          longitude: 116.1,
          latitude: 39.9,
          value: 2,
          status: "normal",
          canBeDynamicAnchor: true
        }
      ],
      {
        stationMeta: {
          station_count: 0,
          stations: []
        },
        stationToGrid: new Int32Array(),
        gridIdByStationId: new Map([["A", 42]])
      }
    );

    expect(mapped).toEqual([
      {
        stationId: "A",
        longitude: 116.1,
        latitude: 39.9,
        value: 2,
        status: "normal",
        canBeDynamicAnchor: true,
        gridId: 42
      }
    ]);
  });
});
