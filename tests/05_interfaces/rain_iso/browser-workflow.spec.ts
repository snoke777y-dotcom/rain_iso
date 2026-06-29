import { describe, expect, it } from "vitest";

import {
  createRainIsoBootstrap,
  createRainIsoWorkerEntry,
  RainIsoErrorCode,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload
} from "../../../app/interfaces/rain_iso/index.js";
import {
  RAIN_ISO_ALGORITHM_PROFILE_VERSION,
  RAIN_ISO_PROTOCOL_VERSION
} from "../../../app/domain/rain_iso/constants.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";
import type { RainIsoDirectSequence } from "../../../app/infrastructure/rain_iso/package/raw-api-adapter.js";

class LoopbackWorker {
  public onmessage: ((event: MessageEvent<RainIsoWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private readonly entry = createRainIsoWorkerEntry({
    now: createClock([0, 15, 40, 55]),
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

describe("browser workflow", () => {
  it("静态资产加载完成后才允许启动计算，并返回性能摘要", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker()
    });

    await expect(
      bootstrap.client.startTask({
        taskId: "task-before-assets",
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: ["2026-06-24T13:55:00+08:00"],
          values: [2, 1]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: [],
          values: []
        })
      })
    ).rejects.toMatchObject({
      code: RainIsoErrorCode.AssetValidationFailed
    });

    await bootstrap.client.loadAssets(createWorkerAssetsPayload());

    const frameKeys: string[] = [];
    const result = await bootstrap.client.startTask(
      {
        taskId: "task-after-assets",
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: ["2026-06-24T13:55:00+08:00"],
          values: [2, 1]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: [],
          values: []
        })
      },
      {
        onFrameReady(event) {
          frameKeys.push(event.frameKey);
        }
      }
    );

    expect(frameKeys).toEqual(["rain_5m|2026-06-24T13:55:00+08:00"]);
    expect(result).toMatchObject({
      taskId: "task-after-assets",
      status: "completed",
      completedFrames: 1,
      totalFrames: 1,
      metrics: {
        firstFrameMs: 25,
        frameCount: 1
      }
    });
  });
});

function createClock(values: number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

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

function createSequence(input: {
  productType: FrameType;
  frameTimes: string[];
  values: number[];
}): RainIsoDirectSequence {
  return {
    frameTimes: input.frameTimes,
    productType: input.productType,
    stationIds: ["FIX-1", "ORD-1"],
    stationMetaById: {
      "FIX-1": createRawRecord("FIX-1", "Fix"),
      "ORD-1": createRawRecord("ORD-1", "Ord")
    },
    values: new Float32Array(input.values)
  };
}

function createRawRecord(stcd: string, stationName: string) {
  return {
    sysid: "1",
    stcd,
    stnm: stationName,
    rvnm: "",
    hnnm: "",
    lgtd: 116,
    lttd: 40,
    stlc: "",
    addvcd: "110000",
    addvnm: "北京",
    adnm: "",
    stlvl: "1",
    admauth: "",
    isOut: "",
    drp: 0,
    bscd: "",
    bsnm: "",
    area: "110000",
    star: 0
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
