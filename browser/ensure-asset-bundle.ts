import type { RainIsoAssetBundle } from "../app/infrastructure/rain_iso/assets/asset-types.js";

export async function ensureAssetBundle(options: {
  assetBundle: RainIsoAssetBundle | null;
  loadDefaultAssetBundle: () => Promise<RainIsoAssetBundle>;
}) {
  if (options.assetBundle) {
    return options.assetBundle;
  }
  return options.loadDefaultAssetBundle();
}
