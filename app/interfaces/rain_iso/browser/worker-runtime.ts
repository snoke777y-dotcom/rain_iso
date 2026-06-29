import { createRainIsoWorkerEntry } from "../worker-entry.js";

const entry = createRainIsoWorkerEntry({
  postResponse(response, transfer) {
    (self as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    }).postMessage(response, transfer ?? []);
  },
  yieldControl: async () => {
    await Promise.resolve();
  }
});

self.onmessage = (event: MessageEvent<import("../types.js").RainIsoWorkerRequest>) => {
  void entry.handleMessage(event.data);
};
