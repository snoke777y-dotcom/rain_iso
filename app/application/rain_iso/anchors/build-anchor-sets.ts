import type { FrameType } from "../../../domain/rain_iso/models.js";
import { selectTop30Stations } from "./select-top30-stations.js";
import type { ClassifiedStation } from "../preprocess/types.js";

export type AnchorSets = {
  hardAnchorStations: ClassifiedStation[];
  fixedAnchorStations: ClassifiedStation[];
  dynamicAnchorStations: ClassifiedStation[];
  ordinaryStations: ClassifiedStation[];
  excludedStations: ClassifiedStation[];
};

export function buildAnchorSets(
  effectiveStations: ClassifiedStation[],
  options: {
    frameType: FrameType;
    fixedAnchorStationIds: Set<string>;
  }
): AnchorSets {
  const fixedAnchorStations = effectiveStations.filter((station) =>
    options.fixedAnchorStationIds.has(station.stationId)
  );
  const fixedAnchorIds = new Set(
    fixedAnchorStations.map((station) => station.stationId)
  );
  const dynamicAnchorStations = selectTop30Stations(
    effectiveStations.filter((station) => !fixedAnchorIds.has(station.stationId))
  );

  const hardAnchorById = new Map<string, ClassifiedStation>();
  for (const station of [...fixedAnchorStations, ...dynamicAnchorStations]) {
    if (!hardAnchorById.has(station.stationId)) {
      hardAnchorById.set(station.stationId, station);
    }
  }

  const hardAnchorStations = Array.from(hardAnchorById.values());
  const hardAnchorIds = new Set(hardAnchorStations.map((station) => station.stationId));
  const ordinaryStations = effectiveStations.filter(
    (station) => !hardAnchorIds.has(station.stationId)
  );

  return {
    hardAnchorStations,
    fixedAnchorStations,
    dynamicAnchorStations,
    ordinaryStations,
    excludedStations: []
  };
}
