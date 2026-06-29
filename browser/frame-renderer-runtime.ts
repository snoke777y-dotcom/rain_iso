import { createFrameRendererEntry } from "./frame-renderer-entry.js";
import type { FrameRendererWorkerRequest } from "./frame-renderer-types.js";

const entry = createFrameRendererEntry({
  postResponse(response, transfer) {
    (self as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    }).postMessage(response, transfer ?? []);
  }
});

self.onmessage = (event: MessageEvent<FrameRendererWorkerRequest>) => {
  void entry.handleMessage(event.data);
};
