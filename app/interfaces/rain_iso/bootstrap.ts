import {
  type WorkerLike
} from "./types.js";
import {
  createRainIsoWorkerClient,
  type RainIsoWorkerClient
} from "./worker-client.js";

export type RainIsoBootstrap = {
  client: RainIsoWorkerClient;
  dispose: () => void;
};

export type CreateRainIsoBootstrapOptions = {
  requestIdFactory?: () => string;
  workerFactory: () => WorkerLike;
};

export function createRainIsoBootstrap(
  options: CreateRainIsoBootstrapOptions
): RainIsoBootstrap {
  const worker = options.workerFactory();
  const client = createRainIsoWorkerClient({
    requestIdFactory: options.requestIdFactory,
    worker
  });

  return {
    client,
    dispose(): void {
      client.dispose();
    }
  };
}
