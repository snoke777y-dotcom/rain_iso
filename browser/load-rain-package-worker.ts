import { loadRainPackageFromFiles } from "../app/interfaces/rain_iso/browser/index.js";

self.onmessage = (event: MessageEvent<{ source: Parameters<typeof loadRainPackageFromFiles>[0] }>) => {
  void loadRainPackageFromFiles(event.data.source)
    .then((dataPackage) => {
      const transfer = [
        dataPackage.rain5m.values.buffer,
        dataPackage.accum1h.values.buffer
      ].filter((buffer) => buffer.byteLength > 0);

      self.postMessage(
        {
          ok: true,
          dataPackage
        },
        transfer
      );
    })
    .catch((error) => {
      self.postMessage({
        ok: false,
        message: error instanceof Error ? error.message : "动态数据解析失败"
      });
    });
};

export {};
