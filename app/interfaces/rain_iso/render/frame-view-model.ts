import type { GridMetaColumns } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { FrameResult } from "../../../domain/rain_iso/models.js";
import { renderGridLayer } from "./render-grid-layer.js";

export function createFrameViewModel(options: {
  frames: FrameResult[];
  gridMeta: GridMetaColumns;
  renderBoundary?: Record<string, unknown>;
  gridResolutionM?: number;
}) {
  const orderedFrames = [...options.frames].sort((left, right) =>
    left.frameTime.localeCompare(right.frameTime) ||
    left.frameKey.localeCompare(right.frameKey)
  );
  const renderedByKey = new Map(
    orderedFrames.map((frame) => [
      frame.frameKey,
      renderGridLayer({
        frameResult: frame,
        gridMeta: options.gridMeta,
        renderBoundary: options.renderBoundary,
        gridResolutionM: options.gridResolutionM
      })
    ])
  );

  const state: {
    currentFrame: FrameResult | null;
    currentRendered:
      | ReturnType<typeof renderGridLayer>
      | null;
    frameKeys: string[];
    selectFrame: (frameKey: string) => {
      frame: FrameResult;
      rendered: ReturnType<typeof renderGridLayer>;
    };
  } = {
    currentFrame: orderedFrames[0] ?? null,
    currentRendered:
      orderedFrames.length > 0
        ? renderedByKey.get(orderedFrames[0].frameKey) ?? null
        : null,
    frameKeys: orderedFrames.map((frame) => frame.frameKey),
    selectFrame(frameKey: string) {
      const frame = orderedFrames.find((candidate) => candidate.frameKey === frameKey);
      const rendered = renderedByKey.get(frameKey);
      if (!frame || !rendered) {
        throw new Error(`Frame ${frameKey} 不存在`);
      }

      state.currentFrame = frame;
      state.currentRendered = rendered;
      return {
        frame,
        rendered
      };
    }
  };

  return state;
}
