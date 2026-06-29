# rain_iso

北京雨量等值面浏览器端计算原型仓库。项目目标是在浏览器本地完成 `5分钟分时雨量等值面` 与 `起报累计雨量等值面` 的数据整理、单帧计算、渲染输出与基础验证，服务端只负责提供静态资产和原始接口数据。

当前仓库重点不是页面壳子，而是把“能不能算对、接口能不能对上、资产能不能落地、结果能不能导出”这条链路先跑通。

## 1. 项目定位

- 面向北京雨量等值面业务的最小实现仓库
- 以 `1km x 1km` 规则网格作为固定计算空间
- 以浏览器端本地计算为目标架构
- 以 TypeScript + Worker + 可切换后端（`cpu / webgl2 / webgpu`）为运行模型
- 以 CPU 链路作为当前数值基线

当前已冻结的产品口径：

- `5分钟分时雨量等值面`
- `起报累计雨量等值面`

当前已冻结的核心规则：

- 全站参与，但 `P <= 0`、缺测、非法值不参与成图
- 锚点 = `固定锚点 + 当前帧 Top30`
- 锚点优先落格，普通站仅在无锚点时参与同格裁决
- 空白格先做连续传播，再做受约束平滑
- 硬锚点不可改写
- 软观测点在平滑阶段不允许低于原始观测值，只允许按上限阈值小幅上浮
- 栅格渲染使用局部窗口保峰值采样，窗口内最大量级不得在渲染阶段被稀释
- `0 < P < 0.1mm` 不渲染，非雨区透明

## 2. 当前实现状态

仓库已经具备以下能力：

- 静态资产加载与校验
- 原始接口数据校验与序列整理
- 单帧 CPU 计算链路
- Web Worker 启动与任务编排接口
- 连续色带栅格渲染与 BMP 导出
- 回归测试、接口测试、导入脚本测试

当前还没有做的事情：

- 真实业务页面与完整前端工程壳
- 正式业务验收样例包
- 完整参数校准结论

注意：代码里已经支持选择 `webgpu / webgl2 / cpu`。其中 `webgpu / webgl2` 现已接入真实 GPU 计算路径；若运行环境缺少对应能力或运行中失效，则自动回退到 CPU 基线实现。`task_started.selected_backend` 表示任务启动时选中的后端，单帧结果里的 `selectedBackend` 表示该帧实际执行后端，因此允许出现 `webgl2 -> cpu` 的帧级降级。

## 3. 核心计算链路

单帧计算主流程位于 [app/application/rain_iso/use-cases/run-frame-on-cpu.ts](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/app/application/rain_iso/use-cases/run-frame-on-cpu.ts)：

1. 将原始帧整理为观测集合
2. 过滤无效站点并识别可参与站点
3. 构建固定锚点与动态锚点集合
4. 将站点直接落到固定网格，处理同格冲突
5. 依据锚点与观测范围构建 `rain_mask`
6. 对空白格做连续传播补全
7. 对结果做受约束平滑
8. 应用最小渲染阈值
9. 生成 `FrameResult`
10. 渲染为连续色带并可导出 BMP

当前联调默认参数：

- 平滑轮数：`12`
- 软观测上浮上限：`20mm`
- 栅格导出超采样：`pixelScale = 4`

## 4. 目录说明

```text
app/
  application/      业务计算流程，串起各算法步骤
  domain/           领域模型、常量、图例、锚点规则
  infrastructure/   资产加载、原始接口适配、CPU/GPU 后端
  interfaces/       Worker 接口、渲染输出、缓存

datas/
  01_raw/           原始接口与原始资料
  03_dictionary/    站点字典、固定锚点、网格资产
  04_samples/       当前样例说明

scripts/02_jobs/
  build_rain_iso_assets_from_geojson.mjs   从边界与站点资料构建静态资产
  generate_rain_station_relations.py       生成站点邻域关系字典
  export_rain5m_single_frame.ts            导出单张 5 分钟分时图
  export_accum1h_iso_frames.ts             导出整组 1 小时累计图

tests/
  01_unit/          单元测试
  02_integration/   集成测试
  03_importers/     导入/构建脚本测试
  05_interfaces/    Worker 与接口层测试
  06_regression/    业务回归测试

workspace/
  01_prd/           需求与设计文档
  02_tasks/         开发任务拆解
  03_discussions/   参数校准与问题讨论

uploads/
  01_reports/       联调报告
  02_charts/        导出的 BMP 图
  03_exports/       导出的摘要 JSON
```

## 5. 数据与资产

### 原始输入

- `datas/01_raw/realtime_5m_response.txt`
  - 5 分钟分时原始接口样例
- `datas/01_raw/realtime_1h_response.json.txt`
  - 1 小时累计原始接口样例
- `datas/01_raw/全部雨量站.xls`
  - 原始站点底表

### 静态字典与资产

- `datas/03_dictionary/rain_iso/fixed_anchor_stations.json`
  - 固定锚点字典
- `datas/03_dictionary/rain_iso/station_neighbor_relations_5km.json`
  - 回退邻站关系
- `datas/03_dictionary/rain_iso/bj_1000m_union_assets/`
  - 北京 1km 规则网格资产包

资产包核心文件包括：

- `asset_manifest.json`
- `grid_meta.bin`
- `grid_mask.bin`
- `grid_neighbors.bin`
- `station_to_grid.bin`
- `station_meta.json`
- `render_boundary.geojson`

## 6. 运行与测试

### 环境

- Node.js
- npm
- Python 3

仓库当前带两个 npm 脚本：

```bash
npm test
npm run bench:field-backends -- --grid-counts 256,1024,4096,16384
```

- `npm test` 执行全部 Vitest 用例
- `npm run bench:field-backends` 对 `cpu / webgl2 / webgpu` 的传播+平滑链路做基准测试，并输出每组 `gridCount` 的中位数耗时

### 运行测试

```bash
npm install
npm test
```

### 跑后端性能基线

```bash
npm run bench:field-backends -- --grid-counts 256,1024,4096,16384 --samples 8 --warmup 2
```

可选参数：

- `--backends cpu,webgl2,webgpu`
- `--rounds 12`
- `--out output/benchmarks/field-backends.json`

说明：

- 这个 benchmark 只覆盖 `continuous-propagate + constrained-smooth` 两段后端链路，不含前面站点预处理和后面渲染
- 如果当前运行环境没有 `OffscreenCanvas` 或 `navigator.gpu`，对应后端会直接标记为 `skipped`
- 当前 Codex 终端环境默认只能拿到 CPU 基线；真实 `webgl2 / webgpu` 数据需要在浏览器 Worker 环境里跑

### 构建静态资产

这个脚本是可直接用 `node` 运行的：

```bash
node scripts/02_jobs/build_rain_iso_assets_from_geojson.mjs \
  --city-boundary datas/01_raw/057_北京市界.geojson \
  --outside-boundary datas/01_raw/北京境外.geojson \
  --station-meta datas/03_dictionary/rain_iso/station_meta.json \
  --output-dir datas/03_dictionary/rain_iso/bj_1000m_union_assets \
  --resolution-m 1000 \
  --asset-version 2026-06-bj-grid-v1
```

### 生成站点邻域关系

```bash
python3 scripts/02_jobs/generate_rain_station_relations.py --help
```

### 导出样例图

这两个导出脚本是 TypeScript 文件，仓库目前没有在 `package.json` 中提供现成执行脚本；如果要直接运行，需要你在本地补一个 TS 运行方式，比如 `tsx`、`ts-node` 或先编译后执行。脚本入口分别是：

- `scripts/02_jobs/export_rain5m_single_frame.ts`
- `scripts/02_jobs/export_accum1h_iso_frames.ts`

它们会读取原始接口与资产目录，输出 BMP 和摘要 JSON 到 `uploads/`。

## 7. 代码分层

### `domain`

定义稳定业务概念：

- 产品类型
- 图例
- 锚点规则
- 常量与协议版本

### `application`

定义算法编排，不直接关心文件来源：

- 帧序列构建
- 有效站点过滤
- 锚点集构建
- 网格落点
- 雨区范围估计
- 单帧执行用例

### `infrastructure`

处理具体实现细节：

- 资产文件解码与校验
- 原始接口适配与校验
- CPU 传播/平滑
- WebGL2 / WebGPU 后端适配

### `interfaces`

暴露可被浏览器主线程调用的接口：

- bootstrap
- Worker client / entry
- 渲染层
- 帧缓存

## 8. 测试覆盖

测试分层比较完整，重点覆盖以下方面：

- 图例、锚点、阈值等规则单元测试
- 资产加载与数据包校验集成测试
- CPU 与 GPU 后端结果一致性测试
- Worker 任务生命周期接口测试
- 业务回归测试

代表性用例：

- `tests/02_integration/rain_iso/gpu-vs-cpu.spec.ts`
- `tests/05_interfaces/rain_iso/browser-workflow.spec.ts`
- `tests/06_regression/rain_iso/anchor-first.spec.ts`
- `tests/06_regression/rain_iso/non-rain-transparent.spec.ts`

## 9. 关键文档

建议先读这几份：

- [workspace/01_prd/2026-06-23-雨量等值面浏览器端详细设计说明.md](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/workspace/01_prd/2026-06-23-雨量等值面浏览器端详细设计说明.md)
- [workspace/01_prd/2026-06-23-雨量等值面接口定义清单.md](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/workspace/01_prd/2026-06-23-雨量等值面接口定义清单.md)
- [workspace/01_prd/2026-06-24-雨量等值面原始接口正式字段规范.md](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/workspace/01_prd/2026-06-24-雨量等值面原始接口正式字段规范.md)
- [workspace/02_tasks/2026-06-23-雨量等值面开发任务清单.md](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/workspace/02_tasks/2026-06-23-雨量等值面开发任务清单.md)
- [uploads/01_reports/2026-06-25-雨量等值面样例联调报告.md](/Users/snoke/Documents/2.慧图科技/1.项目管理/北京水务局/cc客供资料/huitu_tool/rain_iso/uploads/01_reports/2026-06-25-雨量等值面样例联调报告.md)

## 10. 已知限制

- 正式业务验收样例仍未入库
- 参数仍处于默认基线，不是最终校准值
- GPU 选择协议已就位，但真实 GPU 加速尚未落地
- 根目录暂未提供一键导出脚本，导出入口仍偏工程内部使用

## 11. 下一步建议

- 补齐根目录运行脚本，把导出链路做成一键命令
- 引入正式业务样例包和对照图面
- 完成参数校准记录闭环
- 真正实现 WebGPU / WebGL2 shader 计算，而不是只保一致性
