export function selectTop30Stations(stations) {
    return [...stations]
        .filter((station) => station.canBeDynamicAnchor)
        .sort((left, right) => right.value - left.value)
        .slice(0, 30);
}
