import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { RainIsoDirectSequence } from "../../../infrastructure/rain_iso/package/raw-api-adapter.js";
import { createRainIsoBootstrap } from "../bootstrap.js";
import type { StartTaskHandlers } from "../types.js";
import { loadAssetBundleFromDirectory, loadAssetBundleFromZip, loadRainPackageFromFiles } from "./file-loaders.js";
import defaultWorkerScriptUrl from "./worker-runtime.ts?worker&url";
import type {
  BrowserAssetBundleSource,
  BrowserRainPackageSource,
  BrowserSessionTaskInput,
  CreateRainIsoBrowserSessionOptions,
  RainIsoBrowserSession
} from "./types.js";

export function createRainIsoBrowserSession(
  options: CreateRainIsoBrowserSessionOptions = {}
): RainIsoBrowserSession {
  const bootstrap = createRainIsoBootstrap({
    requestIdFactory: options.requestIdFactory,
    workerFactory: options.workerFactory ?? createDefaultWorkerFactory(options.workerScriptUrl)
  });

  return {
    detectBackend() {
      return bootstrap.client.detectBackend();
    },
    async loadAssetBundle(bundle: RainIsoAssetBundle) {
      return bootstrap.client.loadAssets(toWorkerAssetPayload(bundle));
    },
    async loadAssetBundleFromDirectory(source: BrowserAssetBundleSource) {
      const bundle = await loadAssetBundleFromDirectory(source);
      return this.loadAssetBundle(bundle);
    },
    async loadAssetBundleFromZip(file: Blob) {
      const bundle = await loadAssetBundleFromZip(file);
      return this.loadAssetBundle(bundle);
    },
    loadRainPackageFromFiles(source: BrowserRainPackageSource) {
      return loadRainPackageFromFiles(source);
    },
    startTask(input: BrowserSessionTaskInput, handlers?: StartTaskHandlers) {
      return bootstrap.client.startTask(
        {
          taskId: input.taskId,
          rain5mSequence: toWorkerSequence(input.dataPackage.rain5m),
          accum1hSequence: toWorkerSequence(input.dataPackage.accum1h),
          preferredBackend: input.preferredBackend,
          algorithmProfileVersion: input.algorithmProfileVersion,
          rainMaskRadiusConfig: input.rainMaskRadiusConfig
        },
        handlers
      );
    },
    cancelTask(taskId: string) {
      bootstrap.client.cancelTask(taskId);
    },
    dispose() {
      bootstrap.dispose();
    },
    getStatus() {
      return bootstrap.client.getStatus();
    }
  };
}

function createDefaultWorkerFactory(workerScriptUrl?: URL) {
  return () =>
    new Worker(workerScriptUrl ?? new URL(defaultWorkerScriptUrl, import.meta.url), {
      type: "module"
    }) as unknown as import("../types.js").WorkerLike;
}

function toWorkerAssetPayload(bundle: RainIsoAssetBundle) {
  const fixedAnchorStationIds = bundle.fixedAnchorStationIds;
  return {
    asset_manifest: bundle.manifest,
    grid_meta: {
      grid_id: bundle.gridMeta.gridId,
      row: bundle.gridMeta.row,
      col: bundle.gridMeta.col,
      center_x: bundle.gridMeta.centerX,
      center_y: bundle.gridMeta.centerY
    },
    grid_mask: bundle.gridMask,
    grid_neighbors: bundle.gridNeighbors,
    station_to_grid: bundle.stationToGrid,
    station_meta: {
      station_count: bundle.stationMeta.station_count,
      stations: bundle.stationMeta.stations.map((station) => {
        const isFixed = fixedAnchorStationIds.has(String(station.station_id));
        return {
          ...station,
          is_fortress_anchor: isFixed || station.is_fortress_anchor,
          is_tongzhou_anchor: isFixed || station.is_tongzhou_anchor,
          is_cross_boundary_anchor: isFixed || station.is_cross_boundary_anchor
        };
      })
    },
    fallback_neighbor_station_ids_by_station_id: Object.fromEntries(
      bundle.fallbackNeighborStationIdsByStationId
    )
  };
}

function toWorkerSequence(sequence: RainIsoDirectSequence): RainIsoDirectSequence {
  return {
    frameTimes: sequence.frameTimes,
    productType: sequence.productType,
    stationIds: sequence.stationIds,
    stationMetaById: {},
    values: sequence.values
  };
}
