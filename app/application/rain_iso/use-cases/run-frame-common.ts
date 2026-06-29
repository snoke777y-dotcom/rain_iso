import type { DirectFrame } from "../series/build-5m-frames.js";
import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { StationObservation } from "../preprocess/types.js";

export function buildFrameObservations(
  frame: DirectFrame,
  options: Pick<RainIsoAssetBundle, "stationMeta"> & {
    stationMetaById?: ReadonlyMap<
      string,
      {
        station_id: string | number;
        lon: number;
        lat: number;
      }
    >;
  }
): StationObservation[] {
  const stationMetaById =
    options.stationMetaById ??
    new Map(
      options.stationMeta.stations.map((station) => [
        String(station.station_id),
        station
      ])
    );

  return frame.stationIds.flatMap((stationId, index) => {
    const stationMeta = stationMetaById.get(stationId);
    if (!stationMeta) {
      return [];
    }

    return [
      {
        stationId,
        longitude: stationMeta.lon,
        latitude: stationMeta.lat,
        value: frame.stationValues[index]
      }
    ];
  });
}
