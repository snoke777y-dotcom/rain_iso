import { describe, expect, it } from "vitest";

import {
  createRainIsoBootstrap,
  RainIsoErrorCode,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload
} from "../../../app/interfaces/rain_iso/index.js";
import { createRainIsoWorkerEntry } from "../../../app/interfaces/rain_iso/worker-entry.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { RAIN_ISO_ALGORITHM_PROFILE_VERSION, RAIN_ISO_PROTOCOL_VERSION } from "../../../app/domain/rain_iso/constants.js";

class LoopbackWorker {
  public onmessage: ((event: MessageEvent<RainIsoWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private readonly entry = createRainIsoWorkerEntry({
    postResponse: (response) => {
      queueMicrotask(() => {
        this.onmessage?.({
          data: response
        } as MessageEvent<RainIsoWorkerResponse>);
      });
    }
  });

  postMessage(message: RainIsoWorkerRequest): void {
    void this.entry.handleMessage(message);
  }

  terminate(): void {}
}

describe("rain iso full package gating", () => {
  it("动态包未形成完整双序列时禁止启动计算且不产出 frame_ready", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker()
    });
    await bootstrap.client.loadAssets(createWorkerAssetsPayload());

    const frameKeys: string[] = [];

    await expect(
      bootstrap.client.startTask(
        {
          taskId: "task-invalid",
          rain5mSequence: {
            frameTimes: ["2026-06-24T13:55:00+08:00"],
            productType: FrameType.Rain5m,
            stationIds: ["FIX-1", "ORD-1"],
            stationMetaById: {},
            values: new Float32Array([1.2, 0.8])
          },
          accum1hSequence: {
            frameTimes: ["2026-06-24T14:00:00+08:00"],
            productType: FrameType.Accum1hStep,
            stationIds: ["FIX-1"],
            stationMetaById: {},
            values: new Float32Array([6.2])
          }
        },
        {
          onFrameReady(event) {
            frameKeys.push(event.frameKey);
          }
        }
      )
    ).rejects.toMatchObject({
      code: RainIsoErrorCode.PackageValidationFailed
    });

    expect(frameKeys).toEqual([]);
  });
});

function createWorkerAssetsPayload(): WorkerAssetPayload {
  return {
    asset_manifest: {
      protocol_version: RAIN_ISO_PROTOCOL_VERSION,
      asset_version: "2026-06-bj-grid-v1",
      algorithm_profile_version: RAIN_ISO_ALGORITHM_PROFILE_VERSION,
      grid_resolution_m: 1000,
      grid_rows: 1,
      grid_cols: 3,
      grid_count: 3,
      grid_crs: "EPSG:3857",
      render_crs: "EPSG:4326",
      files: {
        grid_meta: "grid_meta.bin",
        grid_mask: "grid_mask.bin",
        grid_neighbors: "grid_neighbors.bin",
        station_to_grid: "station_to_grid.bin",
        station_meta: "station_meta.json",
        render_boundary: "render_boundary.geojson"
      },
      checksums: {
        grid_meta: "sha256:test",
        grid_mask: "sha256:test",
        grid_neighbors: "sha256:test",
        station_to_grid: "sha256:test",
        station_meta: "sha256:test",
        render_boundary: "sha256:test"
      }
    },
    grid_meta: {
      grid_id: new Int32Array([0, 1, 2]),
      row: new Int32Array([0, 0, 0]),
      col: new Int32Array([0, 1, 2]),
      center_x: new Float32Array([0, 1000, 2000]),
      center_y: new Float32Array([0, 0, 0])
    },
    grid_mask: new Uint8Array([1, 1, 1]),
    grid_neighbors: createLineNeighbors(3),
    station_to_grid: new Int32Array([0, 2]),
    station_meta: {
      station_count: 2,
      stations: [
        {
          station_id: "FIX-1",
          station_name: "Fix",
          lon: 116,
          lat: 40,
          is_fortress_anchor: true,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        },
        {
          station_id: "ORD-1",
          station_name: "Ord",
          lon: 116.01,
          lat: 40,
          is_fortress_anchor: false,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        }
      ]
    }
  };
}

function createLineNeighbors(gridCount: number): Int32Array {
  const neighbors = new Int32Array(gridCount * 8).fill(-1);
  for (let index = 0; index < gridCount; index += 1) {
    if (index > 0) {
      neighbors[index * 8] = index - 1;
    }
    if (index < gridCount - 1) {
      neighbors[index * 8 + 1] = index + 1;
    }
  }
  return neighbors;
}
