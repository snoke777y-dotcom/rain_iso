export function mapStationsToGrid(stations, options) {
    const gridIdByStationId = new Map();
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
