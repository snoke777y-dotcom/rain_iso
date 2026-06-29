import "./styles.css";
import { ensureAssetBundle } from "./ensure-asset-bundle.js";
import { fitCanvasToStage } from "./fit-canvas-to-stage.js";
import { createBrowserFrameRenderer } from "./frame-renderer.js";
import { formatFrameElapsed } from "./format-frame-elapsed.js";
import { loadRainPackageOffThread } from "./load-rain-package-off-thread.js";
import { createPerfReporter } from "./perf-monitor.js";
import { scheduleIdleWork } from "./schedule-idle-work.js";
import { shouldRenderFrame } from "./should-render-frame.js";

import { BackendKind, FrameType, type FrameResult } from "../app/domain/rain_iso/models.js";
import type { RainIsoAssetBundle } from "../app/infrastructure/rain_iso/assets/asset-types.js";
import {
  createRainIsoBrowserSession,
  createTimelinePlayer,
  drawRenderedFrameToCanvas,
  loadAssetBundleFromDirectory,
  loadAssetBundleFromZip,
  renderFrameToImageData,
  type BrowserRainDataPackage,
  type RenderedFrameImageData
} from "../app/interfaces/rain_iso/browser/index.js";

const sampleFiles = [
  {
    relativePath: "bj_1000m_union_assets/asset_manifest.json",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/asset_manifest.json",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/grid_meta.bin",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/grid_meta.bin",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/grid_mask.bin",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/grid_mask.bin",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/grid_neighbors.bin",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/grid_neighbors.bin",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/station_to_grid.bin",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/station_to_grid.bin",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/station_meta.json",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/station_meta.json",
      import.meta.url
    ).href
  },
  {
    relativePath: "bj_1000m_union_assets/render_boundary.geojson",
    url: new URL(
      "../datas/03_dictionary/rain_iso/bj_1000m_union_assets/render_boundary.geojson",
      import.meta.url
    ).href
  },
  {
    relativePath: "fixed_anchor_stations.json",
    url: new URL(
      "../datas/03_dictionary/rain_iso/fixed_anchor_stations.json",
      import.meta.url
    ).href
  },
  {
    relativePath: "station_neighbor_relations_5km.json",
    url: new URL(
      "../datas/03_dictionary/rain_iso/station_neighbor_relations_5km.json",
      import.meta.url
    ).href
  }
] as const;

const sampleRain5mUrl = new URL(
  "../datas/01_raw/realtime_5m_response.json",
  import.meta.url
).href;
const sampleRain1hUrl = new URL(
  "../datas/01_raw/realtime_1h_response.json",
  import.meta.url
).href;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("缺少页面根节点");
}

app.innerHTML = `
  <div class="app-shell">
    <aside class="side-panel">
      <div class="side-content">
        <div>
          <div class="small-note">Rain ISO Browser SDK</div>
          <h1 class="brand-title">雨量等值面浏览器壳</h1>
        </div>

        <div class="summary-card">
          <div class="summary-grid">
            <div><strong>资产版本</strong><span id="asset-version">未加载</span></div>
            <div><strong>站点数</strong><span id="station-count">-</span></div>
            <div><strong>已收帧数</strong><span id="frame-count">-</span></div>
            <div><strong>任务状态</strong><span id="task-status">idle</span></div>
          </div>
        </div>

        <section class="section">
          <h3 class="section-title">数据接入</h3>
          <div class="control-group">
            <button class="plain-button" id="pick-asset-dir">选择字典根目录</button>
            <button class="plain-button" id="pick-asset-zip">导入 ZIP</button>
            <button class="plain-button" id="pick-rain-json">导入动态数据</button>
            <button class="plain-button" id="load-sample">加载仓库样例</button>
          </div>
          <div class="field-row">
            <label for="backend-select">后端偏好</label>
            <select id="backend-select">
              <option value="${BackendKind.Auto}">auto</option>
              <option value="${BackendKind.WebGpu}">webgpu</option>
              <option value="${BackendKind.WebGl2}">webgl2</option>
              <option value="${BackendKind.Cpu}">cpu</option>
            </select>
          </div>
          <div class="field-row">
            <label for="product-filter">时间轴筛选</label>
            <select id="product-filter">
              <option value="all">全部帧</option>
              <option value="${FrameType.Rain5m}">仅 5 分钟</option>
              <option value="${FrameType.Accum1hStep}">仅 1 小时累计</option>
            </select>
          </div>
          <div class="error-text" id="error-text"></div>
        </section>

        <section class="section">
          <h3 class="section-title">任务控制</h3>
          <div class="field-row">
            <label for="loaded-range">当前时间范围</label>
            <input id="loaded-range" type="text" readonly value="未载入动态数据" />
          </div>
          <div class="field-row">
            <label for="selected-frame-key">当前帧</label>
            <input id="selected-frame-key" type="text" readonly value="-" />
          </div>
        </section>

        <div class="cta-row">
          <button class="cta-button primary" id="run-task">启动计算</button>
          <button class="cta-button" id="cancel-task">取消任务</button>
        </div>
      </div>
    </aside>

    <section class="preview-panel">
      <div class="preview-head">
        <div>
          <div class="small-note">真实浏览器逐帧预览</div>
          <h2>结果画布</h2>
        </div>
        <div class="status-stack">
          <strong id="selected-backend">后端: -</strong>
          <span id="task-progress">等待加载数据</span>
          <span id="current-frame-elapsed">当前帧生成: -</span>
        </div>
      </div>
      <div class="canvas-stage" id="canvas-stage">
        <canvas id="result-canvas"></canvas>
        <div class="canvas-placeholder" id="canvas-placeholder">
          <strong>等待输入动态数据</strong>
          <span>载入后将在浏览器环境里逐帧计算并回放</span>
        </div>
      </div>
    </section>

    <section class="timeline-panel">
      <div class="timeline-header">
        <h3 class="timeline-title">时间轴回放</h3>
        <div class="timeline-readout">
          <strong id="timeline-current-label">未开始</strong>
          <div id="timeline-progress-label">0 / 0</div>
        </div>
      </div>
      <div class="timeline-controls">
        <button class="plain-button" id="prev-frame">上一帧</button>
        <button class="plain-button" id="play-toggle">播放</button>
        <button class="plain-button" id="next-frame">下一帧</button>
        <select id="playback-rate-select" aria-label="播放速度">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
        </select>
        <input id="timeline-range" type="range" min="0" max="0" step="1" value="0" />
        <button class="plain-button" id="redraw-frame">重绘</button>
      </div>
      <div class="timeline-footer">
        <span id="timeline-summary">尚未收到帧</span>
        <span id="current-summary">峰值: - / 可渲染格点: -</span>
      </div>
    </section>
  </div>

  <input class="hidden-input" id="asset-dir-input" type="file" webkitdirectory multiple />
  <input class="hidden-input" id="asset-zip-input" type="file" accept=".zip,application/zip" />
  <input class="hidden-input" id="rain-json-input" type="file" multiple accept=".json,application/json" />
`;

const session = createRainIsoBrowserSession();
const frameRenderer = createBrowserFrameRenderer();
const timeline = createTimelinePlayer({ intervalMs: 120 });
const perfReporter = createPerfReporter();

const state: {
  assetBundle: RainIsoAssetBundle | null;
  dataPackage: BrowserRainDataPackage | null;
  frames: FrameResult[];
  currentTaskId: string | null;
  totalFrames: number;
  lastRenderedFrameKey: string | null;
  renderedFrameCache: Map<string, RenderedFrameImageData>;
  pendingRenderedFramePromises: Map<string, Promise<RenderedFrameImageData>>;
} = {
  assetBundle: null,
  dataPackage: null,
  frames: [],
  currentTaskId: null,
  totalFrames: 0,
  lastRenderedFrameKey: null,
  renderedFrameCache: new Map(),
  pendingRenderedFramePromises: new Map()
};
const builtInAssetBundlePromise = preloadBuiltInAssetBundle();

const canvas = byId<HTMLCanvasElement>("result-canvas");
const canvasStage = byId("canvas-stage");
const canvasPlaceholder = byId("canvas-placeholder");
const assetDirInput = byId<HTMLInputElement>("asset-dir-input");
const assetZipInput = byId<HTMLInputElement>("asset-zip-input");
const rainJsonInput = byId<HTMLInputElement>("rain-json-input");
const backendSelect = byId<HTMLSelectElement>("backend-select");
const productFilter = byId<HTMLSelectElement>("product-filter");
const timelineRange = byId<HTMLInputElement>("timeline-range");
const playbackRateSelect = byId<HTMLSelectElement>("playback-rate-select");
const loadedRange = byId<HTMLInputElement>("loaded-range");
const selectedFrameKey = byId<HTMLInputElement>("selected-frame-key");
let pendingRenderFrameId: number | null = null;
let pendingForceRender = false;
let cancelPendingCacheWarmup: (() => void) | null = null;
let cacheWarmupResumeTimerId: number | null = null;
let renderWorkerAssetVersion: string | null = null;
let renderWorkerAssetLoadPromise: Promise<void> | null = null;

timeline.subscribe(() => {
  refreshTimeline();
  scheduleRenderCurrentFrame();
});

wireEvents();
refreshMeta();
window.addEventListener("resize", () => fitRenderedCanvas());

function wireEvents() {
  const markUserInteraction = () => pauseCacheWarmupForInteraction();
  byId("pick-asset-dir").addEventListener("click", () => assetDirInput.click());
  byId("pick-asset-zip").addEventListener("click", () => assetZipInput.click());
  byId("pick-rain-json").addEventListener("click", () => rainJsonInput.click());
  byId("load-sample").addEventListener("click", () => {
    markUserInteraction();
    void withErrorBoundary(loadSample);
  });
  byId("run-task").addEventListener("click", () => {
    markUserInteraction();
    void withErrorBoundary(runTask);
  });
  byId("cancel-task").addEventListener("click", () => {
    markUserInteraction();
    if (state.currentTaskId) {
      session.cancelTask(state.currentTaskId);
    }
  });
  byId("prev-frame").addEventListener("click", () => {
    markUserInteraction();
    timeline.previous();
  });
  byId("next-frame").addEventListener("click", () => {
    markUserInteraction();
    timeline.next();
  });
  byId("redraw-frame").addEventListener("click", () => {
    markUserInteraction();
    scheduleRenderCurrentFrame(true);
  });
  byId("play-toggle").addEventListener("click", () => {
    markUserInteraction();
    const current = timeline.getState();
    if (current.isPlaying) {
      timeline.pause();
    } else {
      timeline.play();
    }
  });
  timelineRange.addEventListener("input", () => {
    markUserInteraction();
    timeline.selectFrame(Number(timelineRange.value));
  });
  playbackRateSelect.addEventListener("change", () => {
    markUserInteraction();
    timeline.setPlaybackRate(Number(playbackRateSelect.value));
  });
  productFilter.addEventListener("change", () => {
    markUserInteraction();
    syncTimelineFrames();
  });

  assetDirInput.addEventListener("change", () =>
    void withErrorBoundary(async () => {
      if (!assetDirInput.files?.length) {
        return;
      }
      state.assetBundle = await loadAssetBundleFromDirectory({
        files: Array.from(assetDirInput.files)
      });
      resetFrames();
      refreshMeta();
    })
  );

  assetZipInput.addEventListener("change", () =>
    void withErrorBoundary(async () => {
      const file = assetZipInput.files?.[0];
      if (!file) {
        return;
      }
      state.assetBundle = await loadAssetBundleFromZip(file);
      resetFrames();
      refreshMeta();
    })
  );

  rainJsonInput.addEventListener("change", () =>
    void withErrorBoundary(async () => {
      if (!rainJsonInput.files?.length) {
        return;
      }
      byId("task-progress").textContent = "正在后台解析动态数据";
      const files = Array.from(rainJsonInput.files);
      const realtime5mFile = files.find((file) => file.name.includes("5m"));
      const realtime1hFile = files.find((file) => file.name.includes("1h"));
      if (!realtime5mFile && !realtime1hFile) {
        throw new Error("请至少选择一个 realtime JSON 文件");
      }
      state.dataPackage = await loadRainPackageOffThread({
        realtime5mFile,
        realtime1hFile
      });
      resetFrames();
      refreshMeta();
      byId("task-progress").textContent = "动态数据已加载";
    })
  );
}

async function loadSample() {
  const [sampleRain5m, sampleRain1h] = await Promise.all([
    fetchOptionalSampleFile(sampleRain5mUrl, "realtime_5m_response.json"),
    fetchOptionalSampleFile(sampleRain1hUrl, "realtime_1h_response.json")
  ]);
  state.assetBundle = await loadBuiltInAssetBundle();
  byId("task-progress").textContent = "正在后台解析动态数据";
  state.dataPackage = await loadRainPackageOffThread({
    realtime5mFile: sampleRain5m ?? undefined,
    realtime1hFile: sampleRain1h ?? undefined
  });
  resetFrames();
  refreshMeta();
  byId("task-progress").textContent = "动态数据已加载";
}

async function runTask() {
  if (!state.dataPackage) {
    setError("请先加载动态 JSON。");
    return;
  }

  const assetBundle = await ensureAssetBundle({
    assetBundle: state.assetBundle,
    loadDefaultAssetBundle: async () => {
      byId("task-progress").textContent = "正在加载内置静态资产";
      const builtInAssetBundle = await builtInAssetBundlePromise;
      if (!builtInAssetBundle) {
        throw new Error("内置静态资产加载失败，请手动导入字典或 ZIP。");
      }
      state.assetBundle = builtInAssetBundle;
      refreshMeta();
      return builtInAssetBundle;
    }
  });

  resetFrames();
  clearError();
  perfReporter.reset();
  const taskId = `browser_${Date.now().toString(36)}`;
  state.currentTaskId = taskId;
  byId("task-status").textContent = "running";
  byId("task-progress").textContent = "正在加载资产并启动任务";

  await session.loadAssetBundle(assetBundle);
  const result = await session.startTask(
    {
      taskId,
      dataPackage: state.dataPackage,
      preferredBackend: backendSelect.value as typeof BackendKind[keyof typeof BackendKind]
    },
    {
      onTaskStarted(event) {
        state.totalFrames = event.totalFrames;
        byId("selected-backend").textContent = `后端: ${event.selectedBackend}`;
        byId("task-progress").textContent = `任务启动，总帧数 ${event.totalFrames}`;
      },
      onTaskProgress(event) {
        byId("task-progress").textContent = `${event.phase} · ${event.completedFrames}/${event.totalFrames}`;
      },
      onFrameReady(event) {
        state.frames.push(event.frameResult);
        perfReporter.logFrameReady({
          frame: event.frameResult,
          index: state.frames.length,
          total: state.totalFrames
        });
        syncTimelineFrames();
        byId("frame-count").textContent = String(state.frames.length);
        byId("selected-backend").textContent = `后端: ${event.frameResult.selectedBackend}`;
      }
    }
  );

  byId("task-status").textContent = result.status;
  byId("task-progress").textContent =
    result.status === "completed"
      ? `完成，用时 ${result.elapsedMs ?? 0}ms`
      : "任务已取消";
  perfReporter.logTaskSummary(result);
  if (result.status === "completed") {
    primeRenderWorkerAssets();
    scheduleCacheWarmup();
  }
}

async function preloadBuiltInAssetBundle() {
  try {
    const assetBundle = await loadBuiltInAssetBundle();
    if (!state.assetBundle) {
      state.assetBundle = assetBundle;
      refreshMeta();
    }
    return assetBundle;
  } catch {
    return null;
  }
}

async function loadBuiltInAssetBundle() {
  const assetFiles = await Promise.all(
    sampleFiles.map((entry) =>
      fetchFile(entry.url, entry.relativePath.split("/").at(-1) ?? entry.relativePath, entry.relativePath)
    )
  );
  return loadAssetBundleFromDirectory({
    files: assetFiles
  });
}

function syncTimelineFrames() {
  const filter = productFilter.value;
  const frames =
    filter === "all"
      ? [...state.frames]
      : state.frames.filter((frame) => frame.frameType === filter);
  timeline.setFrames(frames);
}

function scheduleRenderCurrentFrame(force = false) {
  pendingForceRender = pendingForceRender || force;
  if (pendingRenderFrameId !== null) {
    return;
  }
  pendingRenderFrameId = requestAnimationFrame(() => {
    pendingRenderFrameId = null;
    const shouldForceRender = pendingForceRender;
    pendingForceRender = false;
    renderCurrentFrame(shouldForceRender);
  });
}

function renderCurrentFrame(force = false) {
  if (!state.assetBundle) {
    return;
  }
  const timelineState = timeline.getState();
  const currentFrame = timelineState.currentFrame;
  if (
    !shouldRenderFrame({
      lastFrameKey: state.lastRenderedFrameKey,
      nextFrameKey: currentFrame?.frameKey ?? null,
      force
    })
  ) {
    return;
  }
  if (!currentFrame) {
    canvasPlaceholder.hidden = false;
    selectedFrameKey.value = "-";
    byId("current-summary").textContent = "峰值: - / 可渲染格点: -";
    byId("current-frame-elapsed").textContent = formatFrameElapsed();
    state.lastRenderedFrameKey = null;
    return;
  }

  canvasPlaceholder.hidden = true;
  selectedFrameKey.value = currentFrame.frameKey;
  byId("current-summary").textContent =
    `峰值: ${currentFrame.summary.maxValue} / 可渲染格点: ${currentFrame.summary.renderableGridCount}`;
  byId("current-frame-elapsed").textContent = formatFrameElapsed(currentFrame.summary.elapsedMs);
  const cached = state.renderedFrameCache.get(currentFrame.frameKey);
  if (cached) {
    const renderStartedAt = performance.now();
    drawRenderedFrameToCanvas({ renderedFrame: cached, canvas });
    fitRenderedCanvas(cached.width, cached.height);
    const renderElapsedMs = performance.now() - renderStartedAt;
    state.lastRenderedFrameKey = currentFrame.frameKey;
    perfReporter.logFrameRendered({
      frame: currentFrame,
      index: timelineState.currentIndex + 1,
      total: timelineState.frames.length,
      renderElapsedMs
    });
    return;
  }

  const rendered = getRenderedFrame(currentFrame);
  const renderStartedAt = performance.now();
  drawRenderedFrameToCanvas({ renderedFrame: rendered, canvas });
  fitRenderedCanvas(rendered.width, rendered.height);
  const renderElapsedMs = performance.now() - renderStartedAt;
  state.lastRenderedFrameKey = currentFrame.frameKey;
  perfReporter.logFrameRendered({
    frame: currentFrame,
    index: timelineState.currentIndex + 1,
    total: timelineState.frames.length,
    renderElapsedMs
  });
}

function refreshTimeline() {
  const timelineState = timeline.getState();
  timelineRange.max = String(Math.max(0, timelineState.frames.length - 1));
  timelineRange.value = String(
    Math.min(timelineState.currentIndex, Math.max(0, timelineState.frames.length - 1))
  );
  byId("timeline-current-label").textContent =
    timelineState.currentFrame?.frameTime ?? "未开始";
  byId("timeline-progress-label").textContent =
    `${timelineState.frames.length === 0 ? 0 : timelineState.currentIndex + 1} / ${timelineState.frames.length}`;
  byId("timeline-summary").textContent = timelineState.isPlaying
    ? `播放中 ${timelineState.playbackRate}x`
    : timelineState.frames.length > 0
      ? `已暂停，可拖动时间轴（${timelineState.playbackRate}x）`
      : "尚未收到帧";
  byId("play-toggle").textContent = timelineState.isPlaying ? "暂停" : "播放";
  playbackRateSelect.value = String(timelineState.playbackRate);
}

function fitRenderedCanvas(
  renderedWidth = canvas.width,
  renderedHeight = canvas.height
) {
  if (renderedWidth <= 0 || renderedHeight <= 0) {
    return;
  }
  const fitted = fitCanvasToStage({
    canvasWidth: renderedWidth,
    canvasHeight: renderedHeight,
    stageWidth: canvasStage.clientWidth,
    stageHeight: canvasStage.clientHeight,
    padding: 32
  });
  canvas.style.width = `${fitted.width}px`;
  canvas.style.height = `${fitted.height}px`;
}

function getRenderedFrame(frame: FrameResult) {
  const cached = state.renderedFrameCache.get(frame.frameKey);
  if (cached) {
    return cached;
  }
  const rendered = renderFrameToImageData({
    frame,
    assets: state.assetBundle!,
    pixelScale: 2
  });
  state.renderedFrameCache.set(frame.frameKey, rendered);
  return rendered;
}

function primeRenderWorkerAssets() {
  if (!state.assetBundle) {
    return;
  }
  void ensureRenderWorkerAssetsLoaded();
}

function ensureRenderWorkerAssetsLoaded() {
  if (!state.assetBundle) {
    return Promise.resolve();
  }
  const assetVersion = state.assetBundle.manifest.asset_version;
  if (renderWorkerAssetVersion === assetVersion) {
    return Promise.resolve();
  }
  if (renderWorkerAssetLoadPromise) {
    return renderWorkerAssetLoadPromise;
  }
  renderWorkerAssetLoadPromise = frameRenderer
    .loadAssets(state.assetBundle)
    .then(() => {
      renderWorkerAssetVersion = assetVersion;
    })
    .finally(() => {
      renderWorkerAssetLoadPromise = null;
    });
  return renderWorkerAssetLoadPromise;
}

function ensureRenderedFrame(frame: FrameResult) {
  const cached = state.renderedFrameCache.get(frame.frameKey);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = state.pendingRenderedFramePromises.get(frame.frameKey);
  if (pending) {
    return pending;
  }
  const renderPromise = ensureRenderWorkerAssetsLoaded()
    .then(() =>
      frameRenderer.renderFrame({
        frame,
        pixelScale: 2
      })
    )
    .catch(() => getRenderedFrame(frame))
    .then((rendered) => {
      state.renderedFrameCache.set(frame.frameKey, rendered);
      return rendered;
    })
    .finally(() => {
      state.pendingRenderedFramePromises.delete(frame.frameKey);
    });
  state.pendingRenderedFramePromises.set(frame.frameKey, renderPromise);
  return renderPromise;
}

function scheduleCacheWarmup() {
  if (cancelPendingCacheWarmup || !state.assetBundle || timeline.getState().isPlaying) {
    return;
  }
  cancelPendingCacheWarmup = scheduleIdleWork({
    callback: () => {
      cancelPendingCacheWarmup = null;
      if (!state.assetBundle || timeline.getState().isPlaying) {
        return;
      }
      const nextFrame = state.frames.find(
        (frame) => !state.renderedFrameCache.has(frame.frameKey)
      );
      if (!nextFrame) {
        return;
      }
      void ensureRenderedFrame(nextFrame).finally(() => {
        scheduleCacheWarmup();
      });
    }
  });
}

function pauseCacheWarmupForInteraction() {
  stopCacheWarmup();
  if (cacheWarmupResumeTimerId !== null) {
    clearTimeout(cacheWarmupResumeTimerId);
  }
  cacheWarmupResumeTimerId = window.setTimeout(() => {
    cacheWarmupResumeTimerId = null;
    scheduleCacheWarmup();
  }, 300);
}

function stopCacheWarmup() {
  cancelPendingCacheWarmup?.();
  cancelPendingCacheWarmup = null;
  if (cacheWarmupResumeTimerId !== null) {
    clearTimeout(cacheWarmupResumeTimerId);
    cacheWarmupResumeTimerId = null;
  }
}

function refreshMeta() {
  byId("asset-version").textContent = state.assetBundle?.manifest.asset_version ?? "未加载";
  byId("station-count").textContent = state.assetBundle
    ? String(state.assetBundle.stationMeta.station_count)
    : "-";
  byId("frame-count").textContent = state.frames.length > 0 ? String(state.frames.length) : "-";
  loadedRange.value = formatRange(state.dataPackage);
  refreshTimeline();
}

function formatRange(dataPackage: BrowserRainDataPackage | null) {
  if (!dataPackage) {
    return "未载入动态数据";
  }
  const times = [...dataPackage.rain5m.frameTimes, ...dataPackage.accum1h.frameTimes].sort();
  return `${times[0]} -> ${times[times.length - 1]}`;
}

function resetFrames() {
  if (pendingRenderFrameId !== null) {
    cancelAnimationFrame(pendingRenderFrameId);
    pendingRenderFrameId = null;
  }
  stopCacheWarmup();
  pendingForceRender = false;
  state.frames = [];
  state.totalFrames = 0;
  state.renderedFrameCache.clear();
  state.pendingRenderedFramePromises.clear();
  perfReporter.reset();
  timeline.pause();
  timeline.setFrames([]);
  state.lastRenderedFrameKey = null;
  canvasPlaceholder.hidden = false;
  canvas.style.width = "";
  canvas.style.height = "";
  byId("frame-count").textContent = "-";
  byId("current-frame-elapsed").textContent = formatFrameElapsed();
}

async function fetchFile(url: string, fileName: string, webkitRelativePath?: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法读取样例文件: ${fileName}`);
  }
  if (response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`样例文件不存在或路径错误: ${fileName}`);
  }
  const file = new File([await response.blob()], fileName);
  if (webkitRelativePath) {
    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      enumerable: true,
      value: webkitRelativePath
    });
  }
  return file;
}

async function fetchOptionalSampleFile(url: string, fileName: string) {
  try {
    return await fetchFile(url, fileName);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `样例文件不存在或路径错误: ${fileName}`
    ) {
      return null;
    }
    throw error;
  }
}

async function withErrorBoundary(fn: () => Promise<void>) {
  try {
    clearError();
    await fn();
  } catch (error) {
    byId("task-status").textContent = "error";
    byId("task-progress").textContent = "执行失败";
    setError(error instanceof Error ? error.message : "未知错误");
  }
}

function setError(message: string) {
  byId("error-text").textContent = message;
}

function clearError() {
  byId("error-text").textContent = "";
}

function byId<T extends HTMLElement = HTMLElement>(id: string) {
  const element = document.getElementById(id) as T | null;
  if (!element) {
    throw new Error(`missing element: ${id}`);
  }
  return element;
}
