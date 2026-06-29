import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { summarizeDurations, trimWarmupSamples, type DurationSummary } from "../../app/shared/perf.js";
import { continuousPropagate } from "../../app/infrastructure/rain_iso/cpu/continuous-propagate.js";
import { constrainedSmooth } from "../../app/infrastructure/rain_iso/cpu/constrained-smooth.js";
import { continuousPropagateOnWebGl2 } from "../../app/infrastructure/rain_iso/gpu/webgl2/continuous-propagate.js";
import { constrainedSmoothOnWebGl2 } from "../../app/infrastructure/rain_iso/gpu/webgl2/constrained-smooth.js";
import { getOrCreateWebGl2Runtime, invalidateWebGl2Runtime } from "../../app/infrastructure/rain_iso/gpu/webgl2/runtime.js";
import { continuousPropagateOnWebGpu } from "../../app/infrastructure/rain_iso/gpu/webgpu/continuous-propagate.js";
import { constrainedSmoothOnWebGpu } from "../../app/infrastructure/rain_iso/gpu/webgpu/constrained-smooth.js";
import { ensureWebGpuContext } from "../../app/infrastructure/rain_iso/gpu/webgpu/context.js";

type BackendName = "cpu" | "webgl2" | "webgpu";

type SyntheticInput = {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  knownMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  gridNeighbors: Int32Array;
  gridCenterX: Float32Array;
  gridCenterY: Float32Array;
  ordinaryOnlyMode: boolean;
};

type BackendBenchmarkRow = {
  backend: BackendName;
  available: boolean;
  reason?: string;
  propagate?: DurationSummary;
  smooth?: DurationSummary;
  total?: DurationSummary;
};

type BenchmarkCase = {
  gridCount: number;
  rows: BackendBenchmarkRow[];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const gridCounts = parseGridCounts(args["grid-counts"] ?? "256,1024,4096,16384");
  const sampleCount = parsePositiveInteger(args.samples, 8);
  const warmupCount = parseNonNegativeInteger(args.warmup, 2);
  const rounds = parsePositiveInteger(args.rounds, 12);
  const backends = parseBackends(args.backends ?? "cpu,webgl2,webgpu");
  const outPath = args.out ? resolve(args.out) : null;

  const cases: BenchmarkCase[] = [];

  for (const gridCount of gridCounts) {
    const input = createSyntheticInput(gridCount);
    const rows: BackendBenchmarkRow[] = [];

    for (const backend of backends) {
      rows.push(
        backend === "cpu"
          ? await benchmarkCpuBackend(input, sampleCount, warmupCount, rounds)
          : backend === "webgl2"
            ? await benchmarkWebGl2Backend(input, sampleCount, warmupCount, rounds)
            : await benchmarkWebGpuBackend(input, sampleCount, warmupCount, rounds)
      );
    }

    cases.push({
      gridCount,
      rows
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    sampleCount,
    warmupCount,
    rounds,
    gridCounts,
    cases
  };

  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  }

  printReport(report);
  if (outPath) {
    console.log(`\n已写出: ${outPath}`);
  }
}

async function benchmarkCpuBackend(
  input: SyntheticInput,
  sampleCount: number,
  warmupCount: number,
  rounds: number
): Promise<BackendBenchmarkRow> {
  const propagate = await measureSamples(sampleCount, warmupCount, async () => {
    continuousPropagate(input);
  });

  const propagated = continuousPropagate(input);
  const smooth = await measureSamples(sampleCount, warmupCount, async () => {
    constrainedSmooth({
      valueGrid: propagated.valueGrid,
      rainMask: input.rainMask,
      hardAnchorMask: input.hardAnchorMask,
      softObsMask: input.softObsMask,
      gridNeighbors: input.gridNeighbors,
      rounds
    });
  });

  const total = await measureSamples(sampleCount, warmupCount, async () => {
    const current = continuousPropagate(input);
    constrainedSmooth({
      valueGrid: current.valueGrid,
      rainMask: input.rainMask,
      hardAnchorMask: input.hardAnchorMask,
      softObsMask: input.softObsMask,
      gridNeighbors: input.gridNeighbors,
      rounds
    });
  });

  return {
    backend: "cpu",
    available: true,
    propagate,
    smooth,
    total
  };
}

async function benchmarkWebGl2Backend(
  input: SyntheticInput,
  sampleCount: number,
  warmupCount: number,
  rounds: number
): Promise<BackendBenchmarkRow> {
  try {
    if (!getOrCreateWebGl2Runtime(input.valueGrid.length)) {
      return {
        backend: "webgl2",
        available: false,
        reason: "当前环境没有 WebGL2 / OffscreenCanvas"
      };
    }

    const propagate = await measureSamples(sampleCount, warmupCount, async () => {
      await continuousPropagateOnWebGl2(input);
    });
    const propagated = await continuousPropagateOnWebGl2(input);
    const smooth = await measureSamples(sampleCount, warmupCount, async () => {
      await constrainedSmoothOnWebGl2({
        valueGrid: propagated.valueGrid,
        rainMask: input.rainMask,
        hardAnchorMask: input.hardAnchorMask,
        softObsMask: input.softObsMask,
        gridNeighbors: input.gridNeighbors,
        rounds
      });
    });
    const total = await measureSamples(sampleCount, warmupCount, async () => {
      const current = await continuousPropagateOnWebGl2(input);
      await constrainedSmoothOnWebGl2({
        valueGrid: current.valueGrid,
        rainMask: input.rainMask,
        hardAnchorMask: input.hardAnchorMask,
        softObsMask: input.softObsMask,
        gridNeighbors: input.gridNeighbors,
        rounds
      });
    });

    return {
      backend: "webgl2",
      available: true,
      propagate,
      smooth,
      total
    };
  } catch (error) {
    invalidateWebGl2Runtime();
    return {
      backend: "webgl2",
      available: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

async function benchmarkWebGpuBackend(
  input: SyntheticInput,
  sampleCount: number,
  warmupCount: number,
  rounds: number
): Promise<BackendBenchmarkRow> {
  const context = await ensureWebGpuContext();
  if (!context) {
    return {
      backend: "webgpu",
      available: false,
      reason: "当前环境没有 navigator.gpu"
    };
  }

  const propagate = await measureSamples(sampleCount, warmupCount, async () => {
    await continuousPropagateOnWebGpu(input);
  });
  const propagated = await continuousPropagateOnWebGpu(input);
  const smooth = await measureSamples(sampleCount, warmupCount, async () => {
    await constrainedSmoothOnWebGpu({
      valueGrid: propagated.valueGrid,
      rainMask: input.rainMask,
      hardAnchorMask: input.hardAnchorMask,
      softObsMask: input.softObsMask,
      gridNeighbors: input.gridNeighbors,
      rounds
    });
  });
  const total = await measureSamples(sampleCount, warmupCount, async () => {
    const current = await continuousPropagateOnWebGpu(input);
    await constrainedSmoothOnWebGpu({
      valueGrid: current.valueGrid,
      rainMask: input.rainMask,
      hardAnchorMask: input.hardAnchorMask,
      softObsMask: input.softObsMask,
      gridNeighbors: input.gridNeighbors,
      rounds
    });
  });

  return {
    backend: "webgpu",
    available: true,
    propagate,
    smooth,
    total
  };
}

async function measureSamples(
  sampleCount: number,
  warmupCount: number,
  run: () => Promise<void>
) {
  const durationsMs: number[] = [];

  for (let index = 0; index < sampleCount + warmupCount; index += 1) {
    const startedAt = performance.now();
    await run();
    durationsMs.push(performance.now() - startedAt);
  }

  return summarizeDurations(trimWarmupSamples(durationsMs, warmupCount));
}

function createSyntheticInput(gridCount: number): SyntheticInput {
  const columns = Math.max(1, Math.ceil(Math.sqrt(gridCount)));
  const rows = Math.max(1, Math.ceil(gridCount / columns));
  const valueGrid = new Float32Array(gridCount);
  const rainMask = new Uint8Array(gridCount);
  const knownMask = new Uint8Array(gridCount);
  const hardAnchorMask = new Uint8Array(gridCount);
  const softObsMask = new Uint8Array(gridCount);
  const gridCenterX = new Float32Array(gridCount);
  const gridCenterY = new Float32Array(gridCount);
  const gridNeighbors = new Int32Array(gridCount * 8).fill(-1);

  for (let index = 0; index < gridCount; index += 1) {
    const row = Math.floor(index / columns);
    const col = index % columns;
    gridCenterX[index] = col * 1000;
    gridCenterY[index] = row * 1000;
    rainMask[index] = ((row + col) % 7 === 0) ? 0 : 1;
    knownMask[index] = index % 9 === 0 ? 1 : 0;
    hardAnchorMask[index] = index % 23 === 0 ? 1 : 0;
    softObsMask[index] = index % 11 === 0 ? 1 : 0;
    valueGrid[index] =
      rainMask[index] === 1
        ? ((row * 13 + col * 17) % 200) / 10 + ((index % 5) * 0.1)
        : 0;

    let neighborOffset = 0;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const neighborRow = row + rowOffset;
        const neighborCol = col + colOffset;
        if (
          neighborRow < 0 ||
          neighborCol < 0 ||
          neighborRow >= rows ||
          neighborCol >= columns
        ) {
          neighborOffset += 1;
          continue;
        }

        const neighborIndex = neighborRow * columns + neighborCol;
        gridNeighbors[index * 8 + neighborOffset] =
          neighborIndex < gridCount ? neighborIndex : -1;
        neighborOffset += 1;
      }
    }
  }

  for (let index = 0; index < gridCount; index += 1) {
    if (rainMask[index] !== 1) {
      knownMask[index] = 0;
      hardAnchorMask[index] = 0;
      softObsMask[index] = 0;
      continue;
    }

    if (hardAnchorMask[index] === 1) {
      knownMask[index] = 1;
    }
  }

  return {
    valueGrid,
    rainMask,
    knownMask,
    hardAnchorMask,
    softObsMask,
    gridNeighbors,
    gridCenterX,
    gridCenterY,
    ordinaryOnlyMode: false
  };
}

function printReport(report: {
  sampleCount: number;
  warmupCount: number;
  rounds: number;
  cases: BenchmarkCase[];
}) {
  console.log(
    `field backend benchmark | samples=${report.sampleCount} warmup=${report.warmupCount} rounds=${report.rounds}`
  );

  for (const currentCase of report.cases) {
    console.log(`\n[gridCount=${currentCase.gridCount}]`);
    for (const row of currentCase.rows) {
      if (!row.available) {
        console.log(`- ${row.backend}: skipped (${row.reason ?? "unavailable"})`);
        continue;
      }

      console.log(
        `- ${row.backend}: total median ${formatMs(row.total?.medianMs)} | propagate median ${formatMs(row.propagate?.medianMs)} | smooth median ${formatMs(row.smooth?.medianMs)}`
      );
    }
  }
}

function formatMs(value: number | undefined) {
  return `${(value ?? 0).toFixed(3)} ms`;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    index += 1;
  }
  return args;
}

function parseGridCounts(value: string) {
  const counts = value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.floor(entry));
  if (counts.length === 0) {
    throw new Error("grid-counts 不能为空");
  }
  return counts;
}

function parseBackends(value: string): BackendName[] {
  const backends = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is BackendName => entry === "cpu" || entry === "webgl2" || entry === "webgpu");
  if (backends.length === 0) {
    throw new Error("backends 至少要有一个 cpu/webgl2/webgpu");
  }
  return backends;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`参数必须是正整数: ${value}`);
  }
  return Math.floor(parsed);
}

function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`参数必须是非负整数: ${value}`);
  }
  return Math.floor(parsed);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
