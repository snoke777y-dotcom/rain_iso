import { describe, expect, it } from "vitest";

import {
  createRainIsoBootstrap,
  RainIsoTaskStatus,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload
} from "../../../app/interfaces/rain_iso/index.js";
import { createRainIsoWorkerEntry } from "../../../app/interfaces/rain_iso/worker-entry.js";
import { RAIN_ISO_ALGORITHM_PROFILE_VERSION, RAIN_ISO_PROTOCOL_VERSION } from "../../../app/domain/rain_iso/constants.js";
import type { RainIsoDirectSequence } from "../../../app/infrastructure/rain_iso/package/raw-api-adapter.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";

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
    },
    yieldControl: async () => {
      await Promise.resolve();
    }
  });

  postMessage(message: RainIsoWorkerRequest): void {
    void this.entry.handleMessage(message);
  }

  terminate(): void {}
}

describe("rain iso worker task runner", () => {
  it("加载静态资产后按时间顺序逐帧回传结果和进度", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker()
    });

    const assetsLoaded = await bootstrap.client.loadAssets(createWorkerAssetsPayload());
    expect(assetsLoaded.assetVersion).toBe("2026-06-bj-grid-v1");
    expect(assetsLoaded.bboxRender).toEqual([111.718209, 38.512551, 118.563088, 42.009949]);

    const started: Array<{ taskId: string; totalFrames: number }> = [];
    const progress: number[] = [];
    const frameKeys: string[] = [];

    const result = await bootstrap.client.startTask(
      {
        taskId: "task-1",
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: ["2026-06-24T13:55:00+08:00"],
          values: [1.2, 0.8]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: ["2026-06-24T14:00:00+08:00"],
          values: [6.2, 3.1]
        })
      },
      {
        onTaskStarted(event) {
          started.push({
            taskId: event.taskId,
            totalFrames: event.totalFrames
          });
        },
        onTaskProgress(event) {
          progress.push(event.completedFrames);
        },
        onFrameReady(event) {
          frameKeys.push(event.frameKey);
        }
      }
    );

    expect(started).toEqual([
      {
        taskId: "task-1",
        totalFrames: 2
      }
    ]);
    expect(progress).toEqual([1, 2]);
    expect(frameKeys).toEqual([
      "rain_5m|2026-06-24T13:55:00+08:00",
      "accum_1h_step|2026-06-24T14:00:00+08:00"
    ]);
    expect(result).toMatchObject({
      taskId: "task-1",
      status: "completed",
      completedFrames: 2,
      totalFrames: 2
    });
    expect(bootstrap.client.getStatus()).toBe(RainIsoTaskStatus.Idle);
  });

  it("任务运行中收到取消指令后停止后续帧计算", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker()
    });

    await bootstrap.client.loadAssets(createWorkerAssetsPayload());

    const frameKeys: string[] = [];

    const result = await bootstrap.client.startTask(
      {
        taskId: "task-2",
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: [
            "2026-06-24T13:50:00+08:00",
            "2026-06-24T13:55:00+08:00"
          ],
          values: [
            0.2,
            0.1,
            1.2,
            0.8
          ]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: ["2026-06-24T14:00:00+08:00"],
          values: [6.2, 3.1]
        })
      },
      {
        onFrameReady(event) {
          frameKeys.push(event.frameKey);
          if (frameKeys.length === 1) {
            bootstrap.client.cancelTask("task-2");
          }
        }
      }
    );

    expect(frameKeys).toEqual([
      "rain_5m|2026-06-24T13:50:00+08:00"
    ]);
    expect(result).toMatchObject({
      taskId: "task-2",
      status: "cancelled",
      completedFrames: 1,
      totalFrames: 3
    });
    expect(bootstrap.client.getStatus()).toBe(RainIsoTaskStatus.Idle);
  });

  it("启动任务时可透传 rain mask 半径偏移量", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker()
    });

    await bootstrap.client.loadAssets(createWorkerAssetsPayload(5));

    let firstFrameRainMask: number[] | null = null;
    await bootstrap.client.startTask(
      {
        taskId: "task-3",
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: ["2026-06-24T13:55:00+08:00"],
          values: [1.2, 0]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: [],
          values: []
        }),
        rainMaskRadiusConfig: {
          minRadius: 1,
          maxRadius: 1,
          expansionOffset: 1,
          hardAnchorBonus: 0
        }
      },
      {
        onFrameReady(event) {
          firstFrameRainMask = Array.from(event.frameResult.rainMask);
        }
      }
    );

    expect(firstFrameRainMask).toEqual([1, 1, 1, 0, 0]);
  });
});

function createWorkerAssetsPayload(gridCount = 3): WorkerAssetPayload {
  return {
    asset_manifest: {
      protocol_version: RAIN_ISO_PROTOCOL_VERSION,
      asset_version: "2026-06-bj-grid-v1",
      algorithm_profile_version: RAIN_ISO_ALGORITHM_PROFILE_VERSION,
      grid_resolution_m: 1000,
      grid_rows: 1,
      grid_cols: gridCount,
      grid_count: gridCount,
      grid_crs: "EPSG:3857",
      render_crs: "EPSG:4326",
      bbox_render: [111.718209, 38.512551, 118.563088, 42.009949],
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
      grid_id: new Int32Array(Array.from({ length: gridCount }, (_, index) => index)),
      row: new Int32Array(Array.from({ length: gridCount }, () => 0)),
      col: new Int32Array(Array.from({ length: gridCount }, (_, index) => index)),
      center_x: new Float32Array(
        Array.from({ length: gridCount }, (_, index) => index * 1000)
      ),
      center_y: new Float32Array(Array.from({ length: gridCount }, () => 0))
    },
    grid_mask: new Uint8Array(Array.from({ length: gridCount }, () => 1)),
    grid_neighbors: createLineNeighbors(gridCount),
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
    },
    render_boundary: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "北京+境外"
          },
          geometry: {
            type: "MultiPolygon",
            coordinates: []
          }
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
