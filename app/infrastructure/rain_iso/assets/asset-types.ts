import type { GridMaskArray } from "../../../domain/rain_iso/models.js";

export type AssetFileKey =
  | "grid_meta"
  | "grid_mask"
  | "grid_neighbors"
  | "station_to_grid"
  | "station_meta"
  | "render_boundary";

export type AssetManifest = {
  protocol_version: string;
  asset_version: string;
  algorithm_profile_version: string;
  city_code?: string;
  grid_resolution_m: number;
  grid_rows: number;
  grid_cols: number;
  grid_count: number;
  valid_grid_count?: number;
  grid_crs: string;
  render_crs: string;
  bbox_projected?: number[];
  bbox_render?: number[];
  files: Record<AssetFileKey, string>;
  checksums: Record<AssetFileKey, string>;
};

export type StationMetaRecord = {
  station_id: string | number;
  system_id?: string;
  station_name?: string;
  basin_name?: string;
  admin_authority?: string;
  admin_division_name?: string;
  lon: number;
  lat: number;
  x?: number;
  y?: number;
  is_fortress_anchor: boolean;
  is_tongzhou_anchor: boolean;
  is_cross_boundary_anchor: boolean;
};

export type StationMetaFile = {
  station_count: number;
  stations: StationMetaRecord[];
};

export type GridMetaColumns = {
  gridId: Int32Array;
  row: Int32Array;
  col: Int32Array;
  centerX: Float32Array;
  centerY: Float32Array;
};

export type StationNeighborRelationsFile = {
  fallback_neighbor_count: number;
  station_count: number;
  relations: Array<{
    station_id: string;
    neighbor_count_within_5km: number;
    fallback_nearest_neighbors: Array<{
      station_id: string;
      distance_m: number;
    }>;
  }>;
};

export type RainIsoAssetBundle = {
  manifest: AssetManifest;
  gridMeta: GridMetaColumns;
  gridMask: GridMaskArray;
  gridNeighbors: Int32Array;
  stationToGrid: Int32Array;
  stationMeta: StationMetaFile;
  renderBoundary: Record<string, unknown>;
  fixedAnchorStationIds: Set<string>;
  fallbackNeighborStationIdsByStationId: Map<string, string[]>;
};
