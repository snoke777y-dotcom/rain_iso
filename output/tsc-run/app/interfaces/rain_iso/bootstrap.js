import { createRainIsoWorkerClient } from "./worker-client.js";
export function createRainIsoBootstrap(options) {
    const worker = options.workerFactory();
    const client = createRainIsoWorkerClient({
        requestIdFactory: options.requestIdFactory,
        worker
    });
    return {
        client,
        dispose() {
            client.dispose();
        }
    };
}
