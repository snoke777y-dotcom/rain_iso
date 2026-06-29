import { describe, expect, it } from "vitest";

import {
  BackendKind,
  createRainIsoBootstrap,
  RainIsoErrorCode,
  RainIsoTaskStatus
} from "../../../app/interfaces/rain_iso/index.js";

class FakeWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readonly outboundMessages: unknown[] = [];

  postMessage(message: unknown): void {
    this.outboundMessages.push(message);

    const outbound = message as { type: string; request_id: string };
    if (outbound.type === "detect_backend") {
      queueMicrotask(() => {
        this.onmessage?.({
          data: {
            type: "backend_detected",
            request_id: outbound.request_id,
            payload: {
              selected_backend: "cpu",
              available_backends: ["cpu"]
            }
          }
        } as MessageEvent);
      });
    }
  }

  terminate(): void {}
}

describe("createRainIsoBootstrap", () => {
  it("对外复用统一的后端枚举", () => {
    expect(BackendKind).toMatchObject({
      Auto: "auto",
      WebGpu: "webgpu",
      WebGl2: "webgl2",
      Cpu: "cpu"
    });
  });

  it("发送空探测任务后可以收到 Worker 回执", async () => {
    const worker = new FakeWorker();
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => worker
    });

    const result = await bootstrap.client.detectBackend();

    expect(result.selectedBackend).toBe("cpu");
    expect(result.availableBackends).toEqual(["cpu"]);
    expect(bootstrap.client.getStatus()).toBe(RainIsoTaskStatus.Idle);
    expect(worker.outboundMessages).toHaveLength(1);
    expect(worker.outboundMessages[0]).toMatchObject({
      type: "detect_backend"
    });
  });

  it("收到未知回执时返回统一错误码", async () => {
    const worker = new FakeWorker();
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => worker
    });

    const pending = bootstrap.client.detectBackend();
    const outbound = worker.outboundMessages[0] as {
      request_id: string;
    };

    worker.onmessage?.({
      data: {
        type: "task_failed",
        request_id: outbound.request_id,
        payload: {
          task_id: "task-1",
          error_code: "UNKNOWN_ERROR",
          message: "unexpected"
        }
      }
    } as MessageEvent);

    await expect(pending).rejects.toMatchObject({
      code: RainIsoErrorCode.UnknownError
    });
  });
});
