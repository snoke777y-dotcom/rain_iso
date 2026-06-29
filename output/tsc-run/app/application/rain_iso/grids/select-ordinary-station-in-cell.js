export function selectOrdinaryStationInCell(stations, options) {
    const ranked = [...stations].sort((left, right) => {
        if (options.referenceValue === null) {
            if (right.value !== left.value) {
                return right.value - left.value;
            }
            return left.stationId.localeCompare(right.stationId);
        }
        const leftDistance = Math.abs(left.value - options.referenceValue);
        const rightDistance = Math.abs(right.value - options.referenceValue);
        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }
        if (right.value !== left.value) {
            return right.value - left.value;
        }
        return left.stationId.localeCompare(right.stationId);
    });
    return ranked[0];
}
