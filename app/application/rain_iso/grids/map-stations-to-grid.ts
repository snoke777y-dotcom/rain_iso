import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { ClassifiedStation } from "../preprocess/types.js";

export type MappedStation = ClassifiedStation & {
  gridId: number;
};

export function mapStationsToGrid(
  stations: ClassifiedStation[],
  options: Pick<RainIsoAssetBundle, "stationMeta" | "stationToGrid"> & {
    gridIdByStationId?: ReadonlyMap<string, number>;
  }
): MappedStation[] {
  const gridIdByStationId =
    options.gridIdByStationId ??
    new Map<string, number>(
      options.stationMeta.stations.map((station, index) => [
        String(station.station_id),
        options.stationToGrid[index]
      ])
    );

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
