export function shouldRenderFrame(options: {
  lastFrameKey: string | null;
  nextFrameKey: string | null;
  force?: boolean;
}) {
  if (options.force) {
    return true;
  }

  return options.lastFrameKey !== options.nextFrameKey;
}
