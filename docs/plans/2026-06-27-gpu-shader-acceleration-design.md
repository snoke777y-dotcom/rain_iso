# GPU Shader Acceleration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `webgpu` 和 `webgl2` 两套后端补齐真实 GPU 传播与平滑实现，并保持结果与 CPU 基线一致。

**Architecture:** 保留现有 `run-frame-on-cpu` 编排，只替换 `app/infrastructure/rain_iso/gpu/` 下四个算子实现。`WebGPU` 使用最小 compute shader + storage buffer 方案，`WebGL2` 使用最小 fragment shader + 1xN 纹理 ping-pong 方案；两者都在运行时能力缺失时回退 CPU。

**Tech Stack:** TypeScript, Vitest, WebGPU API, WebGL2 API

---

### Task 1: GPU 路径红灯测试

**Files:**
- Modify: `tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`

**Step 1: Write the failing test**

补两组测试：
- `WebGPU` 路径在可用时调用 `requestAdapter/requestDevice/createComputePipeline`
- `WebGL2` 路径在可用时调用 `createShader/linkProgram/drawArrays/readPixels`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: FAIL，当前实现不会触发任何 GPU API。

**Step 3: Write minimal implementation**

先不改业务编排，只让四个 GPU 入口真正尝试 GPU 路径。

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: 新增红灯测试转绿。

### Task 2: WebGPU 传播与平滑

**Files:**
- Modify: `app/infrastructure/rain_iso/gpu/webgpu/context.ts`
- Modify: `app/infrastructure/rain_iso/gpu/webgpu/continuous-propagate.ts`
- Modify: `app/infrastructure/rain_iso/gpu/webgpu/constrained-smooth.ts`

**Step 1: Write the failing test**

使用 Task 1 中的红灯测试作为入口，再补结果一致性断言需要的最小 mock 读回。

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: FAIL，尚未产生 WebGPU pipeline / dispatch / readback。

**Step 3: Write minimal implementation**

实现：
- 运行时拿 `navigator.gpu`
- 创建 adapter/device
- 为传播和平滑分别创建 compute pipeline
- 用 storage buffer 传入网格数组
- 通过 CPU 侧循环控制传播迭代轮次与平滑轮次
- 读回结果并转换回 `Float32Array/Uint8Array`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: PASS。

### Task 3: WebGL2 传播与平滑

**Files:**
- Modify: `app/infrastructure/rain_iso/gpu/webgl2/continuous-propagate.ts`
- Modify: `app/infrastructure/rain_iso/gpu/webgl2/constrained-smooth.ts`

**Step 1: Write the failing test**

沿用 Task 1 红灯测试，要求真正创建 shader/program/texture/framebuffer 并执行 draw。

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: FAIL。

**Step 3: Write minimal implementation**

实现：
- 通过 `OffscreenCanvas` 或 `document.createElement("canvas")` 获取 `webgl2`
- 采用 1xN 纹理承载网格数据
- 传播与平滑分别使用 fragment shader
- CPU 侧控制传播收敛和平滑轮次
- `readPixels` 读回结果

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
Expected: PASS。

### Task 4: 全量回归

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

无需新增测试文件，直接跑现有相关测试集合。

**Step 2: Run test to verify it fails**

只在实现引入回归时修复，不主动造失败。

**Step 3: Write minimal implementation**

更新 README 对 GPU 现状的描述。

**Step 4: Run test to verify it passes**

Run:
- `npm test -- tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
- `npm test -- tests/02_integration/rain_iso/run-frame-on-cpu.spec.ts`
- `npm test -- tests/06_regression/rain_iso/hard-anchor-lock.spec.ts`
- `npm test -- tests/06_regression/rain_iso/soft-observation-bounded.spec.ts`

Expected: PASS。
