import type { FrameType } from "../../../domain/rain_iso/models.js";

export type StationObservation = {
  stationId: string;
  longitude: number;
  latitude: number;
  value: number;
};

export type InvalidStationReason =
  | "missing_value"
  | "negative_value"
  | "non_finite_value"
  | "station_not_mapped"
  | "zero_rain_filtered"
  | "outside_suspect_bins";

export type StationStatus = "normal" | "suspect" | "invalid";

export type InvalidStation = StationObservation & {
  reason: InvalidStationReason;
};

export type ValidStation = StationObservation;

export type ClassifiedStation = StationObservation & {
  status: Exclude<StationStatus, "invalid">;
  canBeDynamicAnchor: boolean;
  reason?: "outside_normal_bins";
};

export type PreprocessOptions = {
  frameType: FrameType;
  validStationIds: Set<string>;
  fallbackNeighborStationIdsByStationId?: ReadonlyMap<string, string[]>;
};

export type AnomalyDetectionResult =
  | ClassifiedStation
  | (StationObservation & {
      status: "invalid";
      canBeDynamicAnchor: false;
      reason: "outside_suspect_bins";
    });
