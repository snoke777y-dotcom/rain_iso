export function formatFrameElapsed(elapsedMs?: number) {
  if (elapsedMs == null || !Number.isFinite(elapsedMs)) {
    return "当前帧生成: -";
  }

  const roundedMs =
    Math.abs(elapsedMs - Math.round(elapsedMs)) < 0.05
      ? String(Math.round(elapsedMs))
      : elapsedMs.toFixed(1);
  return `当前帧生成: ${roundedMs}ms`;
}
