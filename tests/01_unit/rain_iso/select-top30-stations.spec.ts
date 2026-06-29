import { describe, expect, it } from "vitest";

import { selectTop30Stations } from "../../../app/application/rain_iso/anchors/select-top30-stations.js";

describe("selectTop30Stations", () => {
  it("只从具备动态锚点资格的站点里按数值降序取前 30 个", () => {
    const stations = Array.from({ length: 35 }, (_, index) =>
      station(`S${String(index + 1).padStart(3, "0")}`, 100 - index, {
        canBeDynamicAnchor: index !== 5
      })
    );

    const topStations = selectTop30Stations(stations);

    expect(topStations).toHaveLength(30);
    expect(topStations.some((station) => station.stationId === "S006")).toBe(false);
    expect(topStations[0].stationId).toBe("S001");
    expect(topStations.at(-1)?.stationId).toBe("S031");
  });
});

function station(
  stationId: string,
  value: number,
  overrides: {
    canBeDynamicAnchor: boolean;
  }
) {
  return {
    stationId,
    longitude: 116.1,
    latitude: 39.9,
    value,
    status: "normal" as const,
    canBeDynamicAnchor: overrides.canBeDynamicAnchor
  };
}
