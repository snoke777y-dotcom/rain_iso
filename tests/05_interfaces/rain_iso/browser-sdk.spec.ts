import { describe, expect, it } from "vitest";

import {
  createRainIsoBrowserSession
} from "../../../app/interfaces/rain_iso/browser/index.js";
import {
  createRainIsoWorkerEntry,
  type LoadAssetsRequest,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse
} from "../../../app/interfaces/rain_iso/index.js";
import {
  createRawRainPackageFiles,
  createSampleBrowserAssetFiles
} from "../../helpers/rain_iso_browser_fixtures.js";

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

  postMessage(message: RainIsoWorkerRequest, transfer?: Transferable[]): void {
    void transfer;
    void this.entry.handleMessage(message);
  }

  terminate(): void {}
}

class RecordingWorker {
  public onmessage: ((event: MessageEvent<RainIsoWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readonly messages: RainIsoWorkerRequest[] = [];

  postMessage(message: RainIsoWorkerRequest): void {
    this.messages.push(message);

    if (message.type === "load_assets") {
      const request = message as LoadAssetsRequest;
      queueMicrotask(() => {
        this.onmessage?.({
          data: {
            type: "assets_loaded",
            request_id: request.request_id,
            payload: {
              asset_version: request.payload.asset_manifest.asset_version,
              grid_count: request.payload.asset_manifest.grid_count,
              station_count: request.payload.station_meta.station_count,
              bbox_render: request.payload.asset_manifest.bbox_render
            }
          }
        } as MessageEvent<RainIsoWorkerResponse>);
      });
      return;
    }

    if (message.type === "start_task") {
      queueMicrotask(() => {
        this.onmessage?.({
          data: {
            type: "task_started",
            request_id: message.request_id,
            payload: {
              task_id: message.payload.task_id,
              selected_backend: "cpu",
              total_frames: 1
            }
          }
        } as MessageEvent<RainIsoWorkerResponse>);
        this.onmessage?.({
          data: {
            type: "task_completed",
            request_id: message.request_id,
            payload: {
              task_id: message.payload.task_id,
              completed_frames: 1,
              total_frames: 1,
              elapsed_ms: 1,
              metrics: {
                firstFrameMs: 1,
                lastFrameMs: 1,
                minFrameMs: 1,
                maxFrameMs: 1,
                avgFrameMs: 1,
                p95FrameMs: 1,
                frameCount: 1
              }
            }
          }
        } as MessageEvent<RainIsoWorkerResponse>);
      });
    }
  }

  terminate(): void {}
}

describe("browser sdk session", () => {
  it("能把浏览器资产和动态数据送入 worker 并收到逐帧结果", async () => {
    const assetsFixture = createSampleBrowserAssetFiles();
    const dataFixture = createRawRainPackageFiles();
    const session = createRainIsoBrowserSession({
      workerFactory: () => new LoopbackWorker()
    });

    const assets = await session.loadAssetBundleFromDirectory({
      files: assetsFixture.files
    });
    const dataPackage = await session.loadRainPackageFromFiles(dataFixture);
    const frameKeys: string[] = [];

    const runResult = await session.startTask(
      {
        taskId: "browser-sdk-task",
        dataPackage
      },
      {
        onFrameReady(event) {
          frameKeys.push(event.frameKey);
        }
      }
    );

    expect(assets.assetVersion).toBe("2026-06-bj-grid-v1");
    expect(runResult.status).toBe("completed");
    expect(frameKeys).toEqual([
      "accum_1h_step|2026-06-24T13:00:00+08:00",
      "rain_5m|2026-06-24T13:55:00+08:00",
      "rain_5m|2026-06-24T14:00:00+08:00",
      "accum_1h_step|2026-06-24T14:00:00+08:00"
    ]);

    session.dispose();
  });

  it("发往 worker 的负载会剔除浏览器侧不需要再搬运的大字段", async () => {
    const assetsFixture = createSampleBrowserAssetFiles();
    const dataFixture = createRawRainPackageFiles();
    const worker = new RecordingWorker();
    const session = createRainIsoBrowserSession({
      workerFactory: () => worker
    });

    await session.loadAssetBundleFromDirectory({
      files: assetsFixture.files
    });
    const dataPackage = await session.loadRainPackageFromFiles(dataFixture);
    await session.startTask({
      taskId: "browser-sdk-lightweight-payload",
      dataPackage
    });

    const loadAssetsRequest = worker.messages.find(
      (message): message is LoadAssetsRequest => message.type === "load_assets"
    );
    const startTaskRequest = worker.messages.find(
      (message) => message.type === "start_task"
    );

    expect(loadAssetsRequest?.payload.render_boundary).toBeUndefined();
    expect(startTaskRequest?.payload.rain_5m_sequence.stationMetaById).toEqual({});
    expect(startTaskRequest?.payload.accum_1h_sequence.stationMetaById).toEqual({});

    session.dispose();
  });
});
