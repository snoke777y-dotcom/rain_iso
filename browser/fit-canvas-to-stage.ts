export function fitCanvasToStage(options: {
  canvasWidth: number;
  canvasHeight: number;
  stageWidth: number;
  stageHeight: number;
  padding?: number;
}) {
  const availableWidth = Math.max(1, options.stageWidth - (options.padding ?? 0));
  const availableHeight = Math.max(1, options.stageHeight - (options.padding ?? 0));
  const scale = Math.min(
    1,
    availableWidth / Math.max(1, options.canvasWidth),
    availableHeight / Math.max(1, options.canvasHeight)
  );

  return {
    width: Math.max(1, Math.floor(options.canvasWidth * scale)),
    height: Math.max(1, Math.floor(options.canvasHeight * scale))
  };
}
