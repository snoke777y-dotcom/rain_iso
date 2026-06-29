# 雨量等值面样例数据说明

## 当前可用样例

本目录作为可复用样例入口。当前仓库尚未收到单独整理后的业务验收样例包，联调暂使用现有原始资料和测试夹具：

- 原始 5 分钟接口：`datas/01_raw/realtime_5m_response.json`
- 原始 1 小时累计接口：`datas/01_raw/realtime_1h_response.json`
- 原始站点底表：`datas/01_raw/全部雨量站.xls`
- 固定锚点字典：`datas/03_dictionary/rain_iso/fixed_anchor_stations.json`
- 5km 邻域字典：`datas/03_dictionary/rain_iso/station_neighbor_relations_5km.json`

## 当前使用方式

- 单元和接口测试使用仓库内构造的小网格夹具，便于稳定复核算法规则。
- 原始接口文件用于后续真实样例联调前的数据格式和体量参考。
- 正式参数校准仍需业务确认的代表性时间范围、图面截图或对照产品。

## 临时收口样例产物

- 1 小时累计单帧：`uploads/03_exports/rain_iso_accum1h_single_2026-06-19_temporary_closure/summary.json`
- 5 分钟单帧：`uploads/03_exports/rain_iso_rain5m_single_2025-07-23_temporary_closure/summary.json`

说明：

- 当前仓库原始 5 分钟文件名保留为 `2025-07-23` 风格，但本次实际导出的样例帧时间为 `2026-06-19T23:00:00+08:00`。
- 临时收口只用于把代码默认参数、样例产物和记录口径对齐，不等于最终业务验收结论。

## 待补样例

- 典型小雨、局地强降雨、全市性降雨、无活动锚点、稀疏站区五类时间范围。
- 对照图面或人工判读结论。
- 参数调整前后的截图、指标和结论。
