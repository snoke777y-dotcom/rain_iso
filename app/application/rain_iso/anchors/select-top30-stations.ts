import type { ClassifiedStation } from "../preprocess/types.js";

export function selectTop30Stations(
  stations: ClassifiedStation[]
): ClassifiedStation[] {
  return [...stations]
    .filter((station) => station.canBeDynamicAnchor)
    .sort((left, right) => right.value - left.value)
    .slice(0, 30);
}
