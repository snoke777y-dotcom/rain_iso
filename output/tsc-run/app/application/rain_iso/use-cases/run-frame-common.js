export function buildFrameObservations(frame, options) {
    const stationMetaById = new Map(options.stationMeta.stations.map((station) => [
        String(station.station_id),
        station
    ]));
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
