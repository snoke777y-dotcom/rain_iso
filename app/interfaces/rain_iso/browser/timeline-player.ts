import type { FrameResult } from "../../../domain/rain_iso/models.js";
import type { TimelinePlaybackState, TimelinePlayer } from "./types.js";

export function createTimelinePlayer(options: {
  frames?: FrameResult[];
  intervalMs?: number;
} = {}): TimelinePlayer {
  const intervalMs = options.intervalMs ?? 500;
  const state: TimelinePlaybackState = {
    frames: [...(options.frames ?? [])],
    currentIndex: 0,
    currentFrame: options.frames?.[0] ?? null,
    isPlaying: false
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(state: TimelinePlaybackState) => void>();

  const emit = () => {
    const snapshot = {
      frames: [...state.frames],
      currentIndex: state.currentIndex,
      currentFrame: state.currentFrame,
      isPlaying: state.isPlaying
    };
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const syncCurrentFrame = () => {
    state.currentFrame = state.frames[state.currentIndex] ?? null;
    emit();
    return state.currentFrame;
  };

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    getState() {
      return {
        frames: [...state.frames],
        currentIndex: state.currentIndex,
        currentFrame: state.currentFrame,
        isPlaying: state.isPlaying
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(this.getState());
      return () => {
        listeners.delete(listener);
      };
    },
    setFrames(frames) {
      const nextFrames = [...frames];
      const currentFrameKey = state.currentFrame?.frameKey;
      state.frames = nextFrames;
      if (nextFrames.length === 0) {
        state.currentIndex = 0;
        state.currentFrame = null;
        emit();
        return;
      }
      const preservedIndex =
        currentFrameKey == null
          ? -1
          : nextFrames.findIndex((frame) => frame.frameKey === currentFrameKey);
      state.currentIndex =
        preservedIndex >= 0
          ? preservedIndex
          : Math.min(state.currentIndex, nextFrames.length - 1);
      syncCurrentFrame();
    },
    selectFrame(index) {
      if (state.frames.length === 0) {
        state.currentIndex = 0;
        state.currentFrame = null;
        emit();
        return null;
      }
      state.currentIndex = Math.max(0, Math.min(index, state.frames.length - 1));
      return syncCurrentFrame();
    },
    selectFrameByKey(frameKey) {
      const index = state.frames.findIndex((frame) => frame.frameKey === frameKey);
      return index >= 0 ? this.selectFrame(index) : null;
    },
    next() {
      if (state.frames.length === 0) {
        return null;
      }
      return this.selectFrame((state.currentIndex + 1) % state.frames.length);
    },
    previous() {
      if (state.frames.length === 0) {
        return null;
      }
      return this.selectFrame(
        (state.currentIndex - 1 + state.frames.length) % state.frames.length
      );
    },
    play() {
      if (state.isPlaying || state.frames.length <= 1) {
        state.isPlaying = state.frames.length > 1;
        emit();
        return;
      }
      state.isPlaying = true;
      emit();
      timer = setInterval(() => {
        this.next();
      }, intervalMs);
    },
    pause() {
      state.isPlaying = false;
      stopTimer();
      emit();
    },
    dispose() {
      state.isPlaying = false;
      stopTimer();
      state.frames = [];
      state.currentIndex = 0;
      state.currentFrame = null;
      emit();
      listeners.clear();
    }
  };
}
