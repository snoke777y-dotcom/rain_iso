import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { ClassifiedStation } from "../preprocess/types.js";

export type MappedStation = ClassifiedStation & {
  gridId: number;
};

export function mapStationsToGrid(
  stations: ClassifiedStation[],
  options: Pick<RainIsoAssetBundle, "stationMeta" | "stationToGrid">
): MappedStation[] {
  const gridIdByStationId = new Map<string, number>();

  options.stationMeta.stations.forEach((station, index) => {
    gridIdByStationId.set(String(station.station_id), options.stationToGrid[index]);
  });

  return stations.flatMap((station) => {
    const gridId = gridIdByStationId.get(station.stationId);
    if (gridId === undefined || gridId < 0) {
      return [];
    }

    return [
      {
        ...station,
        gridId
      }
    ];
  });
}
