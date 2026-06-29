import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("export_accum1h_single_frame", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("能直接从 1 小时接口数据导出单帧 BMP", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "rain-iso-export-single-"));
    tempDirs.push(outputRoot);

    const chartsDir = join(outputRoot, "charts");
    const exportsDir = join(outputRoot, "exports");
    const scriptPath = resolve("scripts/02_jobs/export_accum1h_single_frame.ts");
    const viteNodePath = resolve("node_modules/.bin/vite-node");

    const { stdout } = await execFileAsync(viteNodePath, [
      scriptPath,
      "--realtime-1h",
      "datas/01_raw/realtime_1h_response.json",
      "--frame-time",
      "2026-06-19T10:00:00+08:00",
      "--charts-dir",
      chartsDir,
      "--exports-dir",
      exportsDir
    ]);

    const commandResult = JSON.parse(stdout) as {
      summaryPath: string;
    };
    const summary = JSON.parse(
      await readFile(commandResult.summaryPath, "utf8")
    ) as { bmpPath: string; frameTime: string };

    await access(summary.bmpPath);
    expect(summary.frameTime).toBe("2026-06-19T10:00:00+08:00");
  }, 20000);
});
