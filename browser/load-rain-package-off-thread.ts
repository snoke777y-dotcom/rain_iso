import type {
  BrowserRainDataPackage,
  BrowserRainPackageSource
} from "../app/interfaces/rain_iso/browser/types.js";

import loaderWorkerScriptUrl from "./load-rain-package-worker.ts?worker&url";

type LoadRainPackageWorkerRequest = {
  source: BrowserRainPackageSource;
};

type LoadRainPackageWorkerResponse =
  | {
      ok: true;
      dataPackage: BrowserRainDataPackage;
    }
  | {
      ok: false;
      message: string;
    };

type RainPackageLoaderWorker = {
  onmessage: ((event: MessageEvent<LoadRainPackageWorkerResponse>) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage: (message: LoadRainPackageWorkerRequest) => void;
  terminate: () => void;
};

export async function loadRainPackageOffThread(
  source: BrowserRainPackageSource,
  options: {
    workerFactory?: () => RainPackageLoaderWorker;
  } = {}
): Promise<BrowserRainDataPackage> {
  const worker = (options.workerFactory ?? createDefaultWorkerFactory())();

  return new Promise<BrowserRainDataPackage>((resolve, reject) => {
    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (event) => {
      cleanup();
      if (event.data.ok) {
        resolve(event.data.dataPackage);
        return;
      }
      reject(new Error(event.data.message));
    };

    worker.onerror = () => {
      cleanup();
      reject(new Error("动态数据解析失败"));
    };

    worker.postMessage({
      source
    });
  });
}

function createDefaultWorkerFactory() {
  return () =>
    new Worker(new URL(loaderWorkerScriptUrl, import.meta.url), {
      type: "module"
    }) as unknown as RainPackageLoaderWorker;
}
