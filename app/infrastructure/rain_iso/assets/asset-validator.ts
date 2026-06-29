import type { RainIsoAssetBundle } from "./asset-types.js";

export class AssetValidationError extends Error {
  public readonly code = "ASSET_VALIDATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "AssetValidationError";
  }
}

export function validateAssetBundle(
  bundle: RainIsoAssetBundle,
  options: {
    expectedAssetVersion?: string;
  } = {}
): void {
  const { manifest, gridMeta, gridMask, gridNeighbors, stationMeta, stationToGrid } =
    bundle;

  if (!manifest.asset_version) {
    throw new AssetValidationError("asset_version is required");
  }

  if (
    options.expectedAssetVersion &&
    manifest.asset_version !== options.expectedAssetVersion
  ) {
    throw new AssetValidationError(
      `asset_version mismatch: expected ${options.expectedAssetVersion}, got ${manifest.asset_version}`
    );
  }

  if (manifest.grid_rows * manifest.grid_cols < manifest.grid_count) {
    throw new AssetValidationError("grid_rows * grid_cols must cover grid_count");
  }

  if (gridMask.length !== manifest.grid_count) {
    throw new AssetValidationError("grid_mask length mismatch");
  }

  if (gridNeighbors.length !== manifest.grid_count * 8) {
    throw new AssetValidationError("grid_neighbors length mismatch");
  }

  if (stationMeta.station_count !== stationToGrid.length) {
    throw new AssetValidationError("station_meta and station_to_grid length mismatch");
  }

  if (
    gridMeta.gridId.length !== manifest.grid_count ||
    gridMeta.row.length !== manifest.grid_count ||
    gridMeta.col.length !== manifest.grid_count ||
    gridMeta.centerX.length !== manifest.grid_count ||
    gridMeta.centerY.length !== manifest.grid_count
  ) {
    throw new AssetValidationError("grid_meta column length mismatch");
  }
}
