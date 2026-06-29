type IdleScheduler = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: typeof window.setTimeout;
  clearTimeout: typeof window.clearTimeout;
};

export function scheduleIdleWork(options: {
  scheduler?: IdleScheduler;
  callback: () => void;
}) {
  const scheduler = options.scheduler ?? window;
  if (scheduler.requestIdleCallback) {
    const handle = scheduler.requestIdleCallback(options.callback);
    return () => {
      scheduler.cancelIdleCallback?.(handle);
    };
  }

  const handle = scheduler.setTimeout(options.callback, 80);
  return () => {
    scheduler.clearTimeout(handle);
  };
}
