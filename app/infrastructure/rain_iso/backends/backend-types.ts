import type { BackendKind } from "../../../domain/rain_iso/models.js";

export type AvailableBackend = Exclude<BackendKind, "auto">;

export type BackendProbeResult = {
  available: boolean;
  adapterName?: string;
  renderer?: string;
};

export type BackendDetectionResult = {
  selectedBackend: AvailableBackend;
  availableBackends: AvailableBackend[];
};

export type DetectBackendOptions = {
  preferredBackend?: BackendKind;
  probeWebGpu?: () => Promise<BackendProbeResult | boolean>;
  probeWebGl2?: () => BackendProbeResult | boolean;
};
