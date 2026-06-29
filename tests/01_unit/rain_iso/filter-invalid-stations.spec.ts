import { describe, expect, it } from "vitest";

import { filterInvalidStations } from "../../../app/application/rain_iso/preprocess/filter-invalid-stations.js";

describe("filterInvalidStations", () => {
  it("剔除缺测、非法值、负值和未映射站点", () => {
    const result = filterInvalidStations(
      [
        station("A001", 1.2),
        station("A002", Number.NaN),
        station("A003", -0.1),
        station("A004", Number.POSITIVE_INFINITY),
        station("A999", 2.5)
      ],
      {
        validStationIds: new Set(["A001", "A002", "A003", "A004"])
      }
    );

    expect(result.validStations).toEqual([station("A001", 1.2)]);
    expect(result.invalidStations).toEqual([
      { ...station("A002", Number.NaN), reason: "missing_value" },
      { ...station("A003", -0.1), reason: "negative_value" },
      { ...station("A004", Number.POSITIVE_INFINITY), reason: "non_finite_value" },
      { ...station("A999", 2.5), reason: "station_not_mapped" }
    ]);
  });
});

function station(stationId: string, value: number) {
  return {
    stationId,
    longitude: 116.1,
    latitude: 39.9,
    value
  };
}
