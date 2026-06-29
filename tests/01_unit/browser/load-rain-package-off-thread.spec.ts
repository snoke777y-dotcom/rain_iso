import { describe, expect, it } from "vitest";

import { loadRainPackageOffThread } from "../../../browser/load-rain-package-off-thread.js";
import { loadRainPackageFromFiles } from "../../../app/interfaces/rain_iso/browser/index.js";
import { createRawRainPackageFiles } from "../../helpers/rain_iso_browser_fixtures.js";

describe("loadRainPackageOffThread", () => {
  it("通过 worker 线程解析动态数据包", async () => {
    const files = createRawRainPackageFiles();
    const worker = new LoopbackLoaderWorker();

    const dataPackage = await loadRainPackageOffThread(files, {
      workerFactory: () => worker
    });

    expect(worker.postMessageCalls).toBe(1);
    expect(dataPackage.stationIds).toEqual(["cross-1", "fortress-1", "ordinary-1"]);
    expect(dataPackage.rain5m.frameTimes).toHaveLength(2);
    expect(dataPackage.accum1h.frameTimes).toHaveLength(2);
  });

  it("worker 返回错误时向上传递", async () => {
    await expect(
      loadRainPackageOffThread(createRawRainPackageFiles(), {
        workerFactory: () => new BrokenWorker("动态数据解析失败")
      })
    ).rejects.toThrow("动态数据解析失败");
  });
});

type LoaderWorkerRequest = Parameters<LoopbackLoaderWorker["postMessage"]>[0];
type LoaderWorkerResponse =
  | {
      ok: true;
      dataPackage: Awaited<ReturnType<typeof loadRainPackageFromFiles>>;
    }
  | {
      ok: false;
      message: string;
    };

class LoopbackLoaderWorker {
  public onmessage: ((event: MessageEvent<LoaderWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public postMessageCalls = 0;

  postMessage(message: LoaderWorkerRequest): void {
    this.postMessageCalls += 1;
    void loadRainPackageFromFiles(message.source)
      .then((dataPackage) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              ok: true,
              dataPackage
            }
          } as MessageEvent<LoaderWorkerResponse>);
        });
      })
      .catch((error) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              ok: false,
              message: error instanceof Error ? error.message : "unknown"
            }
          } as MessageEvent<LoaderWorkerResponse>);
        });
      });
  }

  terminate(): void {}
}

class BrokenWorker {
  public onmessage: ((event: MessageEvent<LoaderWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(private readonly message: string) {}

  postMessage(): void {
    queueMicrotask(() => {
      this.onmessage?.({
        data: {
          ok: false,
          message: this.message
        }
      } as MessageEvent<LoaderWorkerResponse>);
    });
  }

  terminate(): void {}
}
