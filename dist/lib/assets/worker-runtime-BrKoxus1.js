const Ne = "1.0.0", De = "rain-iso-profile-v1";
class R extends Error {
  code = "ASSET_VALIDATION_FAILED";
  constructor(a) {
    super(a), this.name = "AssetValidationError";
  }
}
function Pe(e, a = {}) {
  const { manifest: r, gridMeta: t, gridMask: n, gridNeighbors: s, stationMeta: i, stationToGrid: o } = e;
  if (!r.asset_version)
    throw new R("asset_version is required");
  if (a.expectedAssetVersion && r.asset_version !== a.expectedAssetVersion)
    throw new R(
      `asset_version mismatch: expected ${a.expectedAssetVersion}, got ${r.asset_version}`
    );
  if (r.grid_rows * r.grid_cols < r.grid_count)
    throw new R("grid_rows * grid_cols must cover grid_count");
  if (n.length !== r.grid_count)
    throw new R("grid_mask length mismatch");
  if (s.length !== r.grid_count * 8)
    throw new R("grid_neighbors length mismatch");
  if (i.station_count !== o.length)
    throw new R("station_meta and station_to_grid length mismatch");
  if (t.gridId.length !== r.grid_count || t.row.length !== r.grid_count || t.col.length !== r.grid_count || t.centerX.length !== r.grid_count || t.centerY.length !== r.grid_count)
    throw new R("grid_meta column length mismatch");
}
const D = {
  Rain5m: "rain_5m",
  Accum1hStep: "accum_1h_step"
}, K = {
  Auto: "auto",
  WebGpu: "webgpu",
  WebGl2: "webgl2",
  Cpu: "cpu"
}, Se = {
  Legend5mV1: "legend_5m_v1",
  LegendAccum24hV1: "legend_accum_24h_v1"
};
let L = null, U = null, j = null;
const ue = /* @__PURE__ */ new WeakMap(), de = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap();
async function ae() {
  const e = globalThis.navigator, a = e?.gpu?.requestAdapter;
  return a ? (j !== a && (L = null, U = null, j = a), L || (U || (U = (async () => {
    const r = await a.call(e.gpu);
    if (!r)
      return null;
    const t = await r.requestDevice();
    return {
      kind: "webgpu",
      adapterName: r.info?.description,
      device: t
    };
  })()), L = await U, L)) : (L = null, U = null, j = null, null);
}
function xe(e) {
  let a = ue.get(e.device);
  a || (a = /* @__PURE__ */ new Map(), ue.set(e.device, a));
  const r = a.get(e.cacheKey);
  if (r)
    return r;
  const t = e.device.createComputePipeline({
    layout: "auto",
    compute: {
      module: e.device.createShaderModule({
        code: e.shaderCode
      }),
      entryPoint: e.entryPoint ?? "main"
    }
  });
  return a.set(e.cacheKey, t), t;
}
function y(e) {
  let a = de.get(e.device);
  a || (a = /* @__PURE__ */ new Map(), de.set(e.device, a));
  let r = a.get(e.cacheKey);
  return (!r || r.size !== e.size) && (r?.buffer.destroy?.(), r = {
    size: e.size,
    buffer: e.device.createBuffer({
      size: e.size,
      usage: e.usage
    })
  }, a.set(e.cacheKey, r)), e.initialData && e.device.queue.writeBuffer(r.buffer, 0, e.initialData), r.buffer;
}
function re(e) {
  let a = ce.get(e.device);
  a || (a = /* @__PURE__ */ new Map(), ce.set(e.device, a));
  let r = a.get(e.cacheKey);
  return (!r || r.size !== e.size) && (r?.buffer.destroy?.(), r = {
    size: e.size,
    buffer: e.device.createBuffer({
      size: e.size,
      usage: e.usage
    })
  }, a.set(e.cacheKey, r)), r.buffer;
}
async function Le(e = {}) {
  const a = e.probeWebGpu ?? Ye, r = e.probeWebGl2 ?? Ke, t = [];
  return le(await a()).available && t.push(K.WebGpu), le(r()).available && t.push(K.WebGl2), t.push(K.Cpu), {
    selectedBackend: Ve(
      e.preferredBackend ?? K.Auto,
      t
    ),
    availableBackends: t
  };
}
function Ve(e, a) {
  if (e === K.Auto)
    return a[0];
  if (a.includes(e))
    return e;
  throw Ue(
    `请求后端 ${e} 不可用`
  );
}
function Ue(e) {
  const a = new Error(e);
  return a.code = "BACKEND_UNAVAILABLE", a;
}
function le(e) {
  return typeof e == "boolean" ? { available: e } : e;
}
async function Ye() {
  const e = await ae();
  return {
    available: e !== null,
    adapterName: e?.adapterName
  };
}
function Ke() {
  const e = globalThis;
  return typeof e.OffscreenCanvas == "function" ? {
    available: new e.OffscreenCanvas(1, 1).getContext("webgl2") !== null
  } : {
    available: e.document?.createElement?.("canvas")?.getContext?.("webgl2") !== null
  };
}
class H extends Error {
  code = "PACKAGE_VALIDATION_FAILED";
  constructor(a) {
    super(a), this.name = "PackageValidationError";
  }
}
function Xe(e) {
  if (e.rain5m.stationIds.join("|") !== e.accum1h.stationIds.join("|"))
    throw new H("5 分钟和 1 小时接口的站点集合不一致");
  fe(e.rain5m.frameTimes, 5, "5 分钟"), fe(e.accum1h.frameTimes, 60, "1 小时");
}
function fe(e, a, r) {
  for (let t = 1; t < e.length; t += 1) {
    const n = Date.parse(e[t - 1]);
    if (Date.parse(e[t]) - n !== a * 60 * 1e3)
      throw new H(`${r}序列时间步长不正确`);
  }
}
function $e() {
  const e = [];
  return {
    recordFrame(a) {
      e.push(a);
    },
    buildSummary(a) {
      const r = e.reduce((n, s) => n + s, 0), t = e.length;
      return {
        firstFrameMs: e[0],
        averageFrameMs: t > 0 ? r / t : 0,
        maxFrameMs: t > 0 ? Math.max(...e) : 0,
        totalFrameMs: r,
        totalTaskMs: a,
        frameCount: t
      };
    }
  };
}
function ze(e) {
  return [...e].filter((a) => a.canBeDynamicAnchor).sort((a, r) => r.value - a.value).slice(0, 30);
}
function We(e, a) {
  const r = e.filter(
    (d) => a.fixedAnchorStationIds.has(d.stationId)
  ), t = new Set(
    r.map((d) => d.stationId)
  ), n = ze(
    e.filter((d) => !t.has(d.stationId))
  ), s = /* @__PURE__ */ new Map();
  for (const d of [...r, ...n])
    s.has(d.stationId) || s.set(d.stationId, d);
  const i = Array.from(s.values()), o = new Set(i.map((d) => d.stationId)), c = e.filter(
    (d) => !o.has(d.stationId)
  );
  return {
    hardAnchorStations: i,
    fixedAnchorStations: r,
    dynamicAnchorStations: n,
    ordinaryStations: c,
    excludedStations: []
  };
}
const F = {
  CoreGuard: "core_guard",
  TongzhouGuard: "tongzhou_guard",
  CrossBorderChannel: "cross_border_channel",
  DynamicTop30: "dynamic_top30",
  OrdinaryStation: "ordinary_station"
}, Y = {
  Highest: 3,
  Normal: 1,
  None: 0
}, He = {
  [F.CoreGuard]: Y.Highest,
  [F.TongzhouGuard]: Y.Highest,
  [F.CrossBorderChannel]: Y.Highest,
  [F.DynamicTop30]: Y.Normal,
  [F.OrdinaryStation]: Y.None
};
function ge(e) {
  return He[e];
}
function je(e, a) {
  const r = ge(e.kind), t = ge(a.kind);
  return r > t ? e : t > r || a.value > e.value ? a : e;
}
function q(e, a) {
  const r = a.gridIdByStationId ?? new Map(
    a.stationMeta.stations.map((t, n) => [
      String(t.station_id),
      a.stationToGrid[n]
    ])
  );
  return e.flatMap((t) => {
    const n = r.get(t.stationId);
    return n === void 0 || n < 0 ? [] : [
      {
        ...t,
        gridId: n
      }
    ];
  });
}
function qe(e, a) {
  return [...e].sort((t, n) => {
    if (a.referenceValue === null)
      return n.value !== t.value ? n.value - t.value : t.stationId.localeCompare(n.stationId);
    const s = Math.abs(t.value - a.referenceValue), i = Math.abs(n.value - a.referenceValue);
    return s !== i ? s - i : n.value !== t.value ? n.value - t.value : t.stationId.localeCompare(n.stationId);
  })[0];
}
function Je(e, a) {
  const r = a.assets.manifest.grid_count, t = new Float32Array(r), n = new Uint8Array(r), s = new Uint8Array(r), i = q(e.fixedAnchorStations, {
    ...a.assets,
    gridIdByStationId: a.gridIdByStationId
  }).map((u) => ({
    ...u,
    kind: F.CoreGuard
  })), o = q(
    e.dynamicAnchorStations,
    {
      ...a.assets,
      gridIdByStationId: a.gridIdByStationId
    }
  ).map((u) => ({
    ...u,
    kind: F.DynamicTop30
  })), c = q(e.ordinaryStations, {
    ...a.assets,
    gridIdByStationId: a.gridIdByStationId
  }), d = /* @__PURE__ */ new Map();
  for (const u of [...i, ...o]) {
    const g = d.get(u.gridId);
    if (!g) {
      d.set(u.gridId, u);
      continue;
    }
    const b = je(
      {
        kind: g.kind,
        stationId: g.stationId,
        value: g.value
      },
      {
        kind: u.kind,
        stationId: u.stationId,
        value: u.value
      }
    );
    d.set(
      u.gridId,
      b.stationId === g.stationId ? g : u
    );
  }
  for (const [u, g] of d)
    t[u] = g.value, n[u] = 1;
  const f = d.size === 0, l = /* @__PURE__ */ new Map();
  for (const u of c) {
    const g = l.get(u.gridId);
    g ? g.push(u) : l.set(u.gridId, [u]);
  }
  for (const [u, g] of l) {
    if (d.has(u))
      continue;
    const b = qe(g, {
      referenceValue: f ? null : Qe(u, d, t, a.assets)
    });
    t[u] = b.value, s[u] = 1;
  }
  return {
    valueGrid: t,
    hardAnchorMask: n,
    softObsMask: s,
    ordinaryOnlyMode: f
  };
}
function Qe(e, a, r, t) {
  let n = null, s = Number.POSITIVE_INFINITY;
  for (const i of a.keys()) {
    const o = t.gridMeta.centerX[i] - t.gridMeta.centerX[e], c = t.gridMeta.centerY[i] - t.gridMeta.centerY[e], d = o * o + c * c;
    (d < s || d === s && n !== null && r[i] > r[n]) && (n = i, s = d);
  }
  return n === null ? null : r[n];
}
function Ze(e) {
  const a = new Uint8Array(e.hardAnchorMask.length);
  for (let r = 0; r < a.length; r += 1)
    a[r] = e.hardAnchorMask[r] === 1 || e.softObsMask[r] === 1 ? 1 : 0;
  return a;
}
function ea(e) {
  if (e.knownGridCount === 0)
    return 0;
  const a = e.frameType === D.Accum1hStep ? 6 : 3, r = e.frameType === D.Accum1hStep ? 20 : 10, t = e.minRadius ?? a, n = e.maxRadius ?? r, s = Math.ceil(Math.sqrt(e.knownGridCount)), i = aa(e);
  return ra(Math.max(s, i), t, n);
}
function aa(e) {
  if (e.hardAnchorGridIds.length < 2)
    return 0;
  let a = 0;
  for (const r of e.hardAnchorGridIds) {
    let t = Number.POSITIVE_INFINITY;
    for (const n of e.hardAnchorGridIds) {
      if (n === r)
        continue;
      const s = e.gridCenterX[n] - e.gridCenterX[r], i = e.gridCenterY[n] - e.gridCenterY[r], o = Math.sqrt(s * s + i * i);
      t = Math.min(t, o);
    }
    Number.isFinite(t) && (a = Math.max(a, t));
  }
  return Math.ceil(a / 2e3);
}
function ra(e, a, r) {
  return Math.max(a, Math.min(r, e));
}
function ta(e) {
  const a = Ze({
    hardAnchorMask: e.hardAnchorMask,
    softObsMask: e.softObsMask
  }), r = J(e.hardAnchorMask), t = J(e.softObsMask), n = J(a).length, s = ea({
    frameType: e.frameType,
    knownGridCount: n,
    hardAnchorGridIds: r,
    gridCenterX: e.gridCenterX,
    gridCenterY: e.gridCenterY,
    minRadius: e.radiusConfig?.minRadius,
    maxRadius: e.radiusConfig?.maxRadius
  }), i = s === 0 ? 0 : Math.max(
    0,
    s + (e.radiusConfig?.expansionOffset ?? 0)
  ), o = new Uint8Array(e.gridMask.length);
  if (i === 0)
    return {
      knownMask: a,
      rainMask: o,
      expansionRadius: i
    };
  const c = e.radiusConfig?.hardAnchorBonus ?? 1, d = new Int32Array(e.gridMask.length).fill(-1), f = [], l = [];
  let u = 0;
  for (const g of r)
    f.push(g), l.push(i + c);
  for (const g of t)
    f.push(g), l.push(i);
  for (; u < f.length; ) {
    const g = f[u], b = l[u];
    if (u += 1, g < 0 || e.gridMask[g] !== 1 || b <= d[g] || (d[g] = b, o[g] = 1, b === 0))
      continue;
    const C = g * 8;
    for (let S = 0; S < 8; S += 1) {
      const M = e.gridNeighbors[C + S];
      M < 0 || (f.push(M), l.push(b - 1));
    }
  }
  return {
    knownMask: a,
    rainMask: o,
    expansionRadius: i
  };
}
function J(e) {
  const a = [];
  for (let r = 0; r < e.length; r += 1)
    e[r] === 1 && a.push(r);
  return a;
}
const Re = {
  legendId: Se.Legend5mV1,
  productType: D.Rain5m,
  bins: [
    v(0.1, 0.4, "#97F297", "#333333"),
    v(0.4, 1, "#3DCE3D", "#333333"),
    v(1, 2, "#6ACEF2", "#333333"),
    v(2, 5, "#1010F2", "#ffffff"),
    v(5, 10, "#F210F2", "#ffffff"),
    v(10, 15, "#A0103D", "#ffffff"),
    v(15, 20, "#f8aa0a", "#ffffff"),
    v(20, null, "#9933FF", "#ffffff")
  ]
}, Ee = {
  legendId: Se.LegendAccum24hV1,
  productType: D.Accum1hStep,
  bins: [
    v(0.1, 10, "#97F297", "#333333"),
    v(10, 25, "#3DCE3D", "#333333"),
    v(25, 50, "#6ACEF2", "#333333"),
    v(50, 100, "#1010F2", "#ffffff"),
    v(100, 250, "#A0103D", "#ffffff"),
    v(250, 400, "#f8aa0a", "#ffffff"),
    v(400, null, "#9933FF", "#ffffff")
  ]
}, na = {
  [D.Rain5m]: Re,
  [D.Accum1hStep]: Ee
};
we(Re, 8);
we(Ee, 7);
function Oe(e) {
  return na[e];
}
function v(e, a, r, t) {
  return {
    min: e,
    max: a,
    color: r,
    textColor: t,
    label: a === null ? `${e}+` : `${e}~${a}`
  };
}
function we(e, a) {
  if (e.bins.length !== a)
    throw new Error(
      `Legend ${e.legendId} bin count mismatch: expected ${a}, got ${e.bins.length}`
    );
}
function sa(e, a) {
  const r = a.allValidStations.filter(
    (l) => l.stationId !== e.stationId && oa(e, l) <= 5e3
  ), t = ia(
    e,
    r,
    {
      stationById: a.stationById ?? new Map(a.allValidStations.map((l) => [l.stationId, l])),
      fallbackNeighborStationIdsByStationId: a.fallbackNeighborStationIdsByStationId
    }
  );
  if (t.length < 4)
    return {
      ...e,
      status: "normal",
      canBeDynamicAnchor: !0
    };
  const n = t.map((l) => l.value).sort((l, u) => u - l), s = n[0], i = n[1];
  if (i === void 0 || s > i * 2)
    return {
      ...e,
      status: "normal",
      canBeDynamicAnchor: !0
    };
  const o = Oe(a.frameType), c = he(o.bins, s), d = he(o.bins, e.value), f = Math.abs(d - c);
  return f <= 1 ? {
    ...e,
    status: "normal",
    canBeDynamicAnchor: !0
  } : f === 2 ? {
    ...e,
    status: "suspect",
    canBeDynamicAnchor: !1,
    reason: "outside_normal_bins"
  } : {
    ...e,
    status: "invalid",
    canBeDynamicAnchor: !1,
    reason: "outside_suspect_bins"
  };
}
function ia(e, a, r) {
  if (a.length >= 4)
    return a;
  const t = r.fallbackNeighborStationIdsByStationId?.get(e.stationId), n = r.stationById;
  if (!t || t.length === 0 || !n)
    return a;
  const s = [...a], i = new Set(
    s.map((o) => o.stationId)
  );
  for (const o of t) {
    if (o === e.stationId || i.has(o))
      continue;
    const c = n.get(o);
    if (c && (s.push(c), i.add(o), s.length >= 4))
      break;
  }
  return s;
}
function he(e, a) {
  if (a < e[0].min)
    return 0;
  for (let r = 0; r < e.length; r += 1) {
    const t = e[r], n = t.max === null && a >= t.min, s = t.max !== null && a >= t.min && a < t.max;
    if (n || s)
      return r;
  }
  return e.length - 1;
}
function oa(e, a) {
  const t = $(a.latitude - e.latitude), n = $(a.longitude - e.longitude), s = $(e.latitude), i = $(a.latitude), o = Math.sin(t / 2) ** 2 + Math.cos(s) * Math.cos(i) * Math.sin(n / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(o));
}
function $(e) {
  return e * Math.PI / 180;
}
function ua(e, a) {
  const r = [], t = [];
  for (const n of e) {
    if (!a.validStationIds.has(n.stationId)) {
      t.push({
        ...n,
        reason: "station_not_mapped"
      });
      continue;
    }
    if (Number.isNaN(n.value)) {
      t.push({
        ...n,
        reason: "missing_value"
      });
      continue;
    }
    if (!Number.isFinite(n.value)) {
      t.push({
        ...n,
        reason: "non_finite_value"
      });
      continue;
    }
    if (n.value < 0) {
      t.push({
        ...n,
        reason: "negative_value"
      });
      continue;
    }
    r.push(n);
  }
  return {
    validStations: r,
    invalidStations: t
  };
}
function da(e, a) {
  const { validStations: r, invalidStations: t } = ua(e, {
    validStationIds: a.validStationIds
  }), n = [...t], s = r.filter((c) => c.value === 0 ? (n.push({
    ...c,
    reason: "zero_rain_filtered"
  }), !1) : !0), i = [], o = new Map(
    s.map((c) => [c.stationId, c])
  );
  for (const c of s) {
    const d = sa(c, {
      frameType: a.frameType,
      allValidStations: s,
      stationById: o,
      fallbackNeighborStationIdsByStationId: a.fallbackNeighborStationIdsByStationId
    });
    if (d.status === "invalid") {
      n.push({
        stationId: d.stationId,
        longitude: d.longitude,
        latitude: d.latitude,
        value: d.value,
        reason: d.reason
      });
      continue;
    }
    i.push(d);
  }
  return {
    effectiveStations: i,
    excludedStations: n
  };
}
function me(e) {
  const a = e.threshold ?? 0.1, r = new Float32Array(e.valueGrid), t = new Uint8Array(e.rainMask);
  for (let n = 0; n < r.length; n += 1) {
    if (t[n] !== 1) {
      r[n] = Number.NaN;
      continue;
    }
    r[n] < a && (r[n] = Number.NaN, t[n] = 0);
  }
  return {
    valueGrid: r,
    rainMask: t
  };
}
function ca(e) {
  const a = Oe(e.frameType), r = [];
  for (let i = 0; i < e.valueGrid.length; i += 1)
    e.rainMask[i] === 1 && Number.isFinite(e.valueGrid[i]) && r.push(e.valueGrid[i]);
  const t = r.length > 0 ? Math.max(...r) : 0, n = r.length > 0 ? Math.min(...r) : void 0, s = r.length > 0 ? r.reduce((i, o) => i + o, 0) / r.length : void 0;
  return {
    frameKey: e.frameKey,
    frameType: e.frameType,
    frameTime: e.frameTime,
    selectedBackend: e.selectedBackend,
    legendId: a.legendId,
    valueGrid: e.valueGrid,
    rainMask: e.rainMask,
    hardAnchorMask: e.hardAnchorMask,
    softObsMask: e.softObsMask,
    knownMask: e.knownMask,
    summary: {
      maxValue: t,
      renderableGridCount: r.length,
      hardAnchorCount: be(e.hardAnchorMask),
      softObsCount: be(e.softObsMask),
      suspectStationCount: e.suspectStationCount,
      ordinaryOnlyMode: e.ordinaryOnlyMode,
      minRenderableValue: n,
      meanRenderableValue: s
    }
  };
}
function be(e) {
  let a = 0;
  for (let r = 0; r < e.length; r += 1)
    e[r] === 1 && (a += 1);
  return a;
}
function la(e, a) {
  const r = a.stationMetaById ?? new Map(
    a.stationMeta.stations.map((t) => [
      String(t.station_id),
      t
    ])
  );
  return e.stationIds.flatMap((t, n) => {
    const s = r.get(t);
    return s ? [
      {
        stationId: t,
        longitude: s.lon,
        latitude: s.lat,
        value: e.stationValues[n]
      }
    ] : [];
  });
}
const te = 12, ne = 20;
function se(e) {
  const a = e.rounds ?? te, r = e.softObsMaxDelta ?? ne, t = new Float32Array(e.valueGrid);
  let n = new Float32Array(e.valueGrid);
  for (let s = 0; s < a; s += 1) {
    const i = new Float32Array(n);
    for (let o = 0; o < n.length; o += 1) {
      if (e.rainMask[o] !== 1 || e.hardAnchorMask[o] === 1)
        continue;
      const c = [n[o]], d = o * 8;
      for (let l = 0; l < 8; l += 1) {
        const u = e.gridNeighbors[d + l];
        u < 0 || e.rainMask[u] !== 1 || c.push(n[u]);
      }
      const f = c.reduce((l, u) => l + u, 0) / c.length;
      if (e.softObsMask[o] === 1) {
        const l = t[o], u = t[o] + r;
        i[o] = fa(f, l, u);
        continue;
      }
      i[o] = f;
    }
    n = i;
  }
  return n;
}
function fa(e, a, r) {
  return Math.max(a, Math.min(r, e));
}
function ie(e) {
  const a = new Float32Array(e.valueGrid), r = new Uint8Array(e.knownMask), t = a.length;
  let n = !0;
  for (; n; ) {
    n = !1;
    for (let s = 0; s < t; s += 1) {
      if (e.rainMask[s] === 0 || r[s] === 1)
        continue;
      const i = [], o = [];
      for (let d = 0; d < 8; d += 1) {
        const f = e.gridNeighbors[s * 8 + d];
        if (f < 0 || r[f] === 0)
          continue;
        (e.hardAnchorMask[f] === 1 ? o : i).push(a[f]);
      }
      const c = i.length > 0 ? i : o;
      c.length !== 0 && (a[s] = ga(c), r[s] = 1, n = !0);
    }
  }
  return {
    valueGrid: a,
    knownMask: r
  };
}
function ga(e) {
  const a = [...e].sort((r, t) => r - t);
  return a[Math.floor((a.length - 1) / 2)];
}
const m = {
  MAP_READ: 1,
  COPY_SRC: 4,
  COPY_DST: 8,
  STORAGE: 128
}, pe = 1;
async function ha(e) {
  const a = await ae();
  if (!a)
    return ie(e);
  const r = a.device, t = e.valueGrid.length, n = e.valueGrid.byteLength, s = e.knownMask.byteLength, i = e.gridNeighbors.byteLength, o = `${t}`;
  let c = y({
    device: r,
    cacheKey: `propagate:valueA:${o}`,
    size: Math.max(4, O(n)),
    initialData: e.valueGrid,
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), d = y({
    device: r,
    cacheKey: `propagate:knownA:${o}`,
    size: Math.max(4, O(s * 4)),
    initialData: Q(e.knownMask),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), f = y({
    device: r,
    cacheKey: `propagate:valueB:${o}`,
    size: Math.max(4, O(n)),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), l = y({
    device: r,
    cacheKey: `propagate:knownB:${o}`,
    size: Math.max(4, O(s * 4)),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  });
  const u = y({
    device: r,
    cacheKey: `propagate:rain:${o}`,
    size: Math.max(4, O(s * 4)),
    initialData: Q(e.rainMask),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), g = y({
    device: r,
    cacheKey: `propagate:hardAnchor:${o}`,
    size: Math.max(4, O(s * 4)),
    initialData: Q(e.hardAnchorMask),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), b = y({
    device: r,
    cacheKey: `propagate:neighbor:${o}`,
    size: Math.max(4, O(i)),
    initialData: e.gridNeighbors,
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), C = y({
    device: r,
    cacheKey: `propagate:change:${o}`,
    size: Math.max(4, O(s * 4)),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), S = y({
    device: r,
    cacheKey: `propagate:params:${o}`,
    size: 16,
    initialData: new Uint32Array([t]),
    usage: m.STORAGE | m.COPY_DST | m.COPY_SRC
  }), M = xe({
    device: r,
    cacheKey: "continuous-propagate:v1",
    shaderCode: ka
  });
  for (; ; ) {
    const T = r.createBindGroup({
      layout: M.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: c } },
        { binding: 1, resource: { buffer: d } },
        { binding: 2, resource: { buffer: f } },
        { binding: 3, resource: { buffer: l } },
        { binding: 4, resource: { buffer: u } },
        { binding: 5, resource: { buffer: g } },
        { binding: 6, resource: { buffer: b } },
        { binding: 7, resource: { buffer: C } },
        { binding: 8, resource: { buffer: S } }
      ]
    }), A = r.createCommandEncoder(), k = A.beginComputePass();
    k.setPipeline(M), k.setBindGroup(0, T), k.dispatchWorkgroups(Math.ceil(t / 64)), k.end(), r.queue.submit([A.finish()]);
    const V = await _e(
      r,
      C,
      t,
      `propagate:change-readback:${o}`
    );
    if (!_a(V)) {
      const I = await ma(
        r,
        f,
        t,
        `propagate:value-readback:${o}`
      ), E = ba(
        await _e(
          r,
          l,
          t,
          `propagate:known-readback:${o}`
        )
      );
      return { valueGrid: I, knownMask: E };
    }
    [c, f] = [f, c], [d, l] = [l, d];
  }
}
async function ma(e, a, r, t) {
  const n = re({
    device: e,
    cacheKey: t,
    size: r * 4,
    usage: m.COPY_DST | m.MAP_READ
  }), s = e.createCommandEncoder();
  s.copyBufferToBuffer(a, 0, n, 0, r * 4), e.queue.submit([s.finish()]), await n.mapAsync?.(pe);
  const i = n.getMappedRange?.() ?? new ArrayBuffer(r * 4), o = new Float32Array(i.slice(0));
  return n.unmap?.(), o;
}
async function _e(e, a, r, t) {
  const n = re({
    device: e,
    cacheKey: t,
    size: r * 4,
    usage: m.COPY_DST | m.MAP_READ
  }), s = e.createCommandEncoder();
  s.copyBufferToBuffer(a, 0, n, 0, r * 4), e.queue.submit([s.finish()]), await n.mapAsync?.(pe);
  const i = n.getMappedRange?.() ?? new ArrayBuffer(r * 4), o = new Uint32Array(i.slice(0));
  return n.unmap?.(), o;
}
function O(e) {
  return Math.ceil(e / 4) * 4;
}
function Q(e) {
  return Uint32Array.from(e, (a) => a);
}
function ba(e) {
  return Uint8Array.from(e, (a) => a > 0 ? 1 : 0);
}
function _a(e) {
  for (const a of e)
    if (a !== 0)
      return !0;
  return !1;
}
const ka = `
struct Params {
  gridCount: u32,
}

@group(0) @binding(0) var<storage, read> valueCurrent: array<f32>;
@group(0) @binding(1) var<storage, read> knownCurrent: array<u32>;
@group(0) @binding(2) var<storage, read_write> valueNext: array<f32>;
@group(0) @binding(3) var<storage, read_write> knownNext: array<u32>;
@group(0) @binding(4) var<storage, read> rainMask: array<u32>;
@group(0) @binding(5) var<storage, read> hardAnchorMask: array<u32>;
@group(0) @binding(6) var<storage, read> gridNeighbors: array<i32>;
@group(0) @binding(7) var<storage, read_write> changedFlags: array<u32>;
@group(0) @binding(8) var<storage, read> params: Params;

fn lowerMedian(values: ptr<function, array<f32, 8>>, count: i32) -> f32 {
  for (var i = 1; i < count; i = i + 1) {
    let current = (*values)[i];
    var j = i - 1;
    loop {
      if (j < 0 || (*values)[j] <= current) {
        break;
      }
      (*values)[j + 1] = (*values)[j];
      j = j - 1;
    }
    (*values)[j + 1] = current;
  }

  return (*values)[(count - 1) / 2];
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let gridId = globalId.x;
  if (gridId >= params.gridCount) {
    return;
  }

  if (rainMask[gridId] == 0u || knownCurrent[gridId] == 1u) {
    valueNext[gridId] = valueCurrent[gridId];
    knownNext[gridId] = knownCurrent[gridId];
    changedFlags[gridId] = 0u;
    return;
  }

  var ordinary: array<f32, 8>;
  var anchor: array<f32, 8>;
  var ordinaryCount = 0;
  var anchorCount = 0;

  for (var offset = 0; offset < 8; offset = offset + 1) {
    let neighborId = gridNeighbors[gridId * 8u + u32(offset)];
    if (neighborId < 0 || knownCurrent[u32(neighborId)] == 0u) {
      continue;
    }

    let value = valueCurrent[u32(neighborId)];
    if (hardAnchorMask[u32(neighborId)] == 1u) {
      anchor[anchorCount] = value;
      anchorCount = anchorCount + 1;
    } else {
      ordinary[ordinaryCount] = value;
      ordinaryCount = ordinaryCount + 1;
    }
  }

  if (ordinaryCount > 0) {
    valueNext[gridId] = lowerMedian(&ordinary, ordinaryCount);
    knownNext[gridId] = 1u;
    changedFlags[gridId] = 1u;
    return;
  }

  if (anchorCount > 0) {
    valueNext[gridId] = lowerMedian(&anchor, anchorCount);
    knownNext[gridId] = 1u;
    changedFlags[gridId] = 1u;
    return;
  }

  valueNext[gridId] = valueCurrent[gridId];
  knownNext[gridId] = knownCurrent[gridId];
  changedFlags[gridId] = 0u;
}`, _ = {
  MAP_READ: 1,
  COPY_SRC: 4,
  COPY_DST: 8,
  STORAGE: 128
}, ya = 1;
async function Ma(e) {
  const a = await ae();
  if (!a)
    return se(e);
  const r = a.device, t = e.rounds ?? te, n = e.softObsMaxDelta ?? ne, s = e.valueGrid.length, i = e.valueGrid.byteLength, o = `${s}`;
  let c = y({
    device: r,
    cacheKey: `smooth:valueA:${o}`,
    size: Math.max(4, G(i)),
    initialData: e.valueGrid,
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), d = y({
    device: r,
    cacheKey: `smooth:valueB:${o}`,
    size: Math.max(4, G(i)),
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  });
  const f = y({
    device: r,
    cacheKey: `smooth:original:${o}`,
    size: Math.max(4, G(i)),
    initialData: e.valueGrid,
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), l = y({
    device: r,
    cacheKey: `smooth:rain:${o}`,
    size: Math.max(4, G(e.rainMask.byteLength * 4)),
    initialData: Z(e.rainMask),
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), u = y({
    device: r,
    cacheKey: `smooth:hardAnchor:${o}`,
    size: Math.max(4, G(e.hardAnchorMask.byteLength * 4)),
    initialData: Z(e.hardAnchorMask),
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), g = y({
    device: r,
    cacheKey: `smooth:softObs:${o}`,
    size: Math.max(4, G(e.softObsMask.byteLength * 4)),
    initialData: Z(e.softObsMask),
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), b = y({
    device: r,
    cacheKey: `smooth:neighbor:${o}`,
    size: Math.max(4, G(e.gridNeighbors.byteLength)),
    initialData: e.gridNeighbors,
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), C = y({
    device: r,
    cacheKey: `smooth:params:${o}`,
    size: 16,
    initialData: new Float32Array([s, n, 0, 0]),
    usage: _.STORAGE | _.COPY_DST | _.COPY_SRC
  }), S = xe({
    device: r,
    cacheKey: "constrained-smooth:v1",
    shaderCode: Aa
  });
  for (let M = 0; M < t; M += 1) {
    const T = r.createBindGroup({
      layout: S.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: c } },
        { binding: 1, resource: { buffer: d } },
        { binding: 2, resource: { buffer: f } },
        { binding: 3, resource: { buffer: l } },
        { binding: 4, resource: { buffer: u } },
        { binding: 5, resource: { buffer: g } },
        { binding: 6, resource: { buffer: b } },
        { binding: 7, resource: { buffer: C } }
      ]
    }), A = r.createCommandEncoder(), k = A.beginComputePass();
    k.setPipeline(S), k.setBindGroup(0, T), k.dispatchWorkgroups(Math.ceil(s / 64)), k.end(), r.queue.submit([A.finish()]), [c, d] = [d, c];
  }
  return Ta(r, c, s, `smooth:readback:${o}`);
}
async function Ta(e, a, r, t) {
  const n = re({
    device: e,
    cacheKey: t,
    size: r * 4,
    usage: _.COPY_DST | _.MAP_READ
  }), s = e.createCommandEncoder();
  s.copyBufferToBuffer(a, 0, n, 0, r * 4), e.queue.submit([s.finish()]), await n.mapAsync?.(ya);
  const i = n.getMappedRange?.() ?? new ArrayBuffer(r * 4), o = new Float32Array(i.slice(0));
  return n.unmap?.(), o;
}
function G(e) {
  return Math.ceil(e / 4) * 4;
}
function Z(e) {
  return Uint32Array.from(e, (a) => a);
}
const Aa = `
struct Params {
  gridCount: f32,
  softObsMaxDelta: f32,
  _unused0: f32,
  _unused1: f32,
}

@group(0) @binding(0) var<storage, read> currentValue: array<f32>;
@group(0) @binding(1) var<storage, read_write> nextValue: array<f32>;
@group(0) @binding(2) var<storage, read> originalValue: array<f32>;
@group(0) @binding(3) var<storage, read> rainMask: array<u32>;
@group(0) @binding(4) var<storage, read> hardAnchorMask: array<u32>;
@group(0) @binding(5) var<storage, read> softObsMask: array<u32>;
@group(0) @binding(6) var<storage, read> gridNeighbors: array<i32>;
@group(0) @binding(7) var<storage, read> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let gridId = globalId.x;
  if (f32(gridId) >= params.gridCount) {
    return;
  }

  if (rainMask[gridId] != 1u || hardAnchorMask[gridId] == 1u) {
    nextValue[gridId] = currentValue[gridId];
    return;
  }

  var sum = currentValue[gridId];
  var count = 1.0;
  for (var offset = 0; offset < 8; offset = offset + 1) {
    let neighborId = gridNeighbors[gridId * 8u + u32(offset)];
    if (neighborId < 0 || rainMask[u32(neighborId)] != 1u) {
      continue;
    }

    sum = sum + currentValue[u32(neighborId)];
    count = count + 1.0;
  }

  let average = sum / count;
  if (softObsMask[gridId] == 1u) {
    let minValue = originalValue[gridId];
    let maxValue = originalValue[gridId] + params.softObsMaxDelta;
    nextValue[gridId] = clamp(average, minValue, maxValue);
    return;
  }

  nextValue[gridId] = average;
}`, p = {
  ContinuousPropagate: "continuousPropagate",
  ConstrainedSmooth: "constrainedSmooth"
}, Ia = `#version 300 es
precision highp float;
void main() {
  vec2 positions[3] = vec2[3](
    vec2(-1.0, -1.0),
    vec2(3.0, -1.0),
    vec2(-1.0, 3.0)
  );
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`, ke = {
  [p.ContinuousPropagate]: {
    uniformNames: [
      "uStateTex",
      "uMaskTex",
      "uNeighborTexA",
      "uNeighborTexB",
      "uGridCount"
    ],
    fragmentSource: `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uStateTex;
uniform sampler2D uMaskTex;
uniform sampler2D uNeighborTexA;
uniform sampler2D uNeighborTexB;
uniform int uGridCount;

out vec4 outColor;

float lowerMedian(float values[8], int count) {
  for (int i = 1; i < 8; i += 1) {
    if (i >= count) {
      break;
    }

    float current = values[i];
    int j = i - 1;
    while (j >= 0 && values[j] > current) {
      values[j + 1] = values[j];
      j -= 1;
    }
    values[j + 1] = current;
  }

  return values[(count - 1) / 2];
}

void main() {
  int gridId = int(floor(gl_FragCoord.x));
  if (gridId < 0 || gridId >= uGridCount) {
    outColor = vec4(0.0);
    return;
  }

  vec4 state = texelFetch(uStateTex, ivec2(gridId, 0), 0);
  vec4 mask = texelFetch(uMaskTex, ivec2(gridId, 0), 0);

  if (mask.r < 0.5 || state.g >= 0.5) {
    outColor = vec4(state.r, state.g, 0.0, 1.0);
    return;
  }

  float ordinary[8];
  float anchor[8];
  int ordinaryCount = 0;
  int anchorCount = 0;

  for (int i = 0; i < 8; i += 1) {
    vec4 texel = i < 4
      ? texelFetch(uNeighborTexA, ivec2(gridId, 0), 0)
      : texelFetch(uNeighborTexB, ivec2(gridId, 0), 0);
    int neighborId = int(i < 4 ? texel[i] : texel[i - 4]);
    if (neighborId < 0 || neighborId >= uGridCount) {
      continue;
    }

    vec4 neighborState = texelFetch(uStateTex, ivec2(neighborId, 0), 0);
    if (neighborState.g < 0.5) {
      continue;
    }

    vec4 neighborMask = texelFetch(uMaskTex, ivec2(neighborId, 0), 0);
    if (neighborMask.g >= 0.5) {
      anchor[anchorCount] = neighborState.r;
      anchorCount += 1;
    } else {
      ordinary[ordinaryCount] = neighborState.r;
      ordinaryCount += 1;
    }
  }

  if (ordinaryCount > 0) {
    outColor = vec4(lowerMedian(ordinary, ordinaryCount), 1.0, 1.0, 1.0);
    return;
  }

  if (anchorCount > 0) {
    outColor = vec4(lowerMedian(anchor, anchorCount), 1.0, 1.0, 1.0);
    return;
  }

  outColor = vec4(state.r, state.g, 0.0, 1.0);
}`
  },
  [p.ConstrainedSmooth]: {
    uniformNames: [
      "uValueTex",
      "uOriginalTex",
      "uMaskTex",
      "uNeighborTexA",
      "uNeighborTexB",
      "uGridCount",
      "uSoftObsMaxDelta"
    ],
    fragmentSource: `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uValueTex;
uniform sampler2D uOriginalTex;
uniform sampler2D uMaskTex;
uniform sampler2D uNeighborTexA;
uniform sampler2D uNeighborTexB;
uniform int uGridCount;
uniform float uSoftObsMaxDelta;

out vec4 outColor;

float clampRange(float value, float minValue, float maxValue) {
  return max(minValue, min(maxValue, value));
}

void main() {
  int gridId = int(floor(gl_FragCoord.x));
  if (gridId < 0 || gridId >= uGridCount) {
    outColor = vec4(0.0);
    return;
  }

  vec4 mask = texelFetch(uMaskTex, ivec2(gridId, 0), 0);
  float current = texelFetch(uValueTex, ivec2(gridId, 0), 0).r;

  if (mask.r < 0.5 || mask.g >= 0.5) {
    outColor = vec4(current, 0.0, 0.0, 1.0);
    return;
  }

  float sum = current;
  float count = 1.0;
  for (int i = 0; i < 8; i += 1) {
    vec4 texel = i < 4
      ? texelFetch(uNeighborTexA, ivec2(gridId, 0), 0)
      : texelFetch(uNeighborTexB, ivec2(gridId, 0), 0);
    int neighborId = int(i < 4 ? texel[i] : texel[i - 4]);
    if (neighborId < 0 || neighborId >= uGridCount) {
      continue;
    }

    vec4 neighborMask = texelFetch(uMaskTex, ivec2(neighborId, 0), 0);
    if (neighborMask.r < 0.5) {
      continue;
    }

    sum += texelFetch(uValueTex, ivec2(neighborId, 0), 0).r;
    count += 1.0;
  }

  float average = sum / count;
  if (mask.b >= 0.5) {
    float originalValue = texelFetch(uOriginalTex, ivec2(gridId, 0), 0).r;
    outColor = vec4(
      clampRange(average, originalValue, originalValue + uSoftObsMaxDelta),
      0.0,
      0.0,
      1.0
    );
    return;
  }

  outColor = vec4(average, 0.0, 0.0, 1.0);
}`
  }
}, h = {
  CLAMP_TO_EDGE: 33071,
  COLOR_ATTACHMENT0: 36064,
  COLOR_BUFFER_BIT: 16384,
  COMPILE_STATUS: 35713,
  FLOAT: 5126,
  FRAMEBUFFER: 36160,
  FRAGMENT_SHADER: 35632,
  LINK_STATUS: 35714,
  NEAREST: 9728,
  RGBA: 6408,
  RGBA32F: 34836,
  TEXTURE0: 33984,
  TEXTURE_2D: 3553,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TRIANGLES: 4,
  VERTEX_SHADER: 35633
};
let B = null, ye = null;
function oe(e) {
  const a = Ca();
  if (ye !== a && (B = null, ye = a), B)
    return Sa(B, e), B;
  const r = va(e);
  if (!r)
    return null;
  const t = r.getContext("webgl2");
  if (!t || !t.getExtension("EXT_color_buffer_float"))
    return null;
  try {
    const n = xa(t), s = {
      canvas: r,
      gl: t,
      vao: t.createVertexArray?.() ?? null,
      framebuffer: X(t.createFramebuffer()),
      scratchTextures: /* @__PURE__ */ new Map(),
      initializedTextures: /* @__PURE__ */ new Set(),
      readbackBuffers: /* @__PURE__ */ new Map(),
      programs: {
        [p.ContinuousPropagate]: Me(
          t,
          p.ContinuousPropagate,
          n
        ),
        [p.ConstrainedSmooth]: Me(
          t,
          p.ConstrainedSmooth,
          n
        )
      }
    };
    return B = s, s;
  } catch (n) {
    throw B = null, n;
  }
}
function Ge() {
  B = null;
}
function x(e) {
  const { gl: a } = e.runtime;
  let r = e.runtime.scratchTextures.get(e.key) ?? null;
  return r || (r = X(a.createTexture()), e.runtime.scratchTextures.set(e.key, r)), a.bindTexture(a.TEXTURE_2D ?? h.TEXTURE_2D, r), e.runtime.initializedTextures.has(r) || (a.texParameteri(
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    a.TEXTURE_MIN_FILTER ?? h.TEXTURE_MIN_FILTER,
    h.NEAREST
  ), a.texParameteri(
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    a.TEXTURE_MAG_FILTER ?? h.TEXTURE_MAG_FILTER,
    h.NEAREST
  ), a.texParameteri(
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    a.TEXTURE_WRAP_S ?? h.TEXTURE_WRAP_S,
    h.CLAMP_TO_EDGE
  ), a.texParameteri(
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    a.TEXTURE_WRAP_T ?? h.TEXTURE_WRAP_T,
    h.CLAMP_TO_EDGE
  ), e.runtime.initializedTextures.add(r)), a.texImage2D(
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    0,
    a.RGBA32F ?? h.RGBA32F,
    e.width,
    1,
    0,
    a.RGBA ?? h.RGBA,
    a.FLOAT ?? h.FLOAT,
    e.pixels
  ), r;
}
function W(e) {
  const { gl: a } = e.runtime;
  return a.bindFramebuffer(a.FRAMEBUFFER ?? h.FRAMEBUFFER, e.runtime.framebuffer), a.framebufferTexture2D(
    a.FRAMEBUFFER ?? h.FRAMEBUFFER,
    a.COLOR_ATTACHMENT0 ?? h.COLOR_ATTACHMENT0,
    a.TEXTURE_2D ?? h.TEXTURE_2D,
    e.texture,
    0
  ), e.runtime.framebuffer;
}
function Be(e) {
  const { gl: a } = e.runtime, r = e.runtime.programs[e.programKey];
  a.useProgram(r.program), a.viewport(0, 0, e.width, 1), a.bindFramebuffer(a.FRAMEBUFFER ?? h.FRAMEBUFFER, e.framebuffer), a.bindVertexArray?.(e.runtime.vao), a.clear(a.COLOR_BUFFER_BIT ?? h.COLOR_BUFFER_BIT);
  for (const t of e.textures)
    a.activeTexture((a.TEXTURE0 ?? h.TEXTURE0) + t.unit), a.bindTexture(a.TEXTURE_2D ?? h.TEXTURE_2D, t.texture), a.uniform1i(
      r.uniforms[t.uniformName] ?? null,
      t.unit
    );
  for (const t of e.uniforms ?? []) {
    const n = r.uniforms[t.name] ?? null;
    if (t.type === "float") {
      a.uniform1f?.(n, t.value);
      continue;
    }
    a.uniform1i(n, t.value);
  }
  a.drawArrays(a.TRIANGLES ?? h.TRIANGLES, 0, 3);
}
function Fe(e, a) {
  const { gl: r } = e;
  let t = e.readbackBuffers.get(a);
  return t || (t = new Float32Array(a * 4), e.readbackBuffers.set(a, t)), r.readPixels(
    0,
    0,
    a,
    1,
    r.RGBA ?? h.RGBA,
    r.FLOAT ?? h.FLOAT,
    t
  ), t;
}
function va(e) {
  const a = globalThis, r = typeof a.OffscreenCanvas == "function" ? new a.OffscreenCanvas(e, 1) : a.document?.createElement?.("canvas");
  return r ? (r.width = e, r.height = 1, r) : null;
}
function Ca() {
  const e = globalThis;
  return e.OffscreenCanvas ?? e.document?.createElement ?? null;
}
function Sa(e, a) {
  e.canvas.width !== a && (e.canvas.width = a), e.canvas.height !== 1 && (e.canvas.height = 1);
}
function Me(e, a, r) {
  const t = X(e.createShader(e.FRAGMENT_SHADER ?? h.FRAGMENT_SHADER));
  if (e.shaderSource(t, ke[a].fragmentSource), e.compileShader(t), !e.getShaderParameter(t, e.COMPILE_STATUS ?? h.COMPILE_STATUS))
    throw new Error(
      e.getShaderInfoLog(t) ?? "WebGL2 fragment shader compile failed"
    );
  const n = X(e.createProgram());
  if (e.attachShader(n, r), e.attachShader(n, t), e.linkProgram(n), !e.getProgramParameter(n, e.LINK_STATUS ?? h.LINK_STATUS))
    throw new Error(e.getProgramInfoLog(n) ?? "WebGL2 program link failed");
  const s = Object.fromEntries(
    ke[a].uniformNames.map((i) => [
      i,
      e.getUniformLocation(n, i)
    ])
  );
  return {
    program: n,
    uniforms: s
  };
}
function xa(e) {
  const a = X(e.createShader(e.VERTEX_SHADER ?? h.VERTEX_SHADER));
  if (e.shaderSource(a, Ia), e.compileShader(a), !e.getShaderParameter(a, e.COMPILE_STATUS ?? h.COMPILE_STATUS))
    throw new Error(e.getShaderInfoLog(a) ?? "WebGL2 vertex shader compile failed");
  return a;
}
function X(e) {
  if (e == null)
    throw new Error("WebGL2 runtime returned null");
  return e;
}
async function Ra(e) {
  const a = oe(e.valueGrid.length);
  if (!a)
    return ie(e);
  try {
    const { gl: r } = a, t = e.valueGrid.length, n = new Float32Array(t * 4), s = new Float32Array(t * 4), i = new Float32Array(t * 4), o = new Float32Array(t * 4);
    for (let T = 0; T < t; T += 1) {
      const A = T * 4;
      n[A] = e.valueGrid[T], n[A + 1] = e.knownMask[T], s[A] = e.rainMask[T], s[A + 1] = e.hardAnchorMask[T];
      for (let k = 0; k < 4; k += 1)
        i[A + k] = e.gridNeighbors[T * 8 + k], o[A + k] = e.gridNeighbors[T * 8 + k + 4];
    }
    const c = `propagate:stateA:${t}`, d = `propagate:stateB:${t}`;
    let f = !0, l = x({
      runtime: a,
      key: c,
      width: t,
      pixels: n
    }), u = x({
      runtime: a,
      key: d,
      width: t,
      pixels: n
    });
    const g = x({
      runtime: a,
      key: `propagate:mask:${t}`,
      width: t,
      pixels: s
    }), b = x({
      runtime: a,
      key: `propagate:neighborA:${t}`,
      width: t,
      pixels: i
    }), C = x({
      runtime: a,
      key: `propagate:neighborB:${t}`,
      width: t,
      pixels: o
    });
    let S = W({
      runtime: a,
      texture: u
    }), M = n;
    for (; Be({
      runtime: a,
      programKey: p.ContinuousPropagate,
      width: t,
      framebuffer: S,
      uniforms: [{ name: "uGridCount", type: "int", value: t }],
      textures: [
        { texture: l, unit: 0, uniformName: "uStateTex" },
        { texture: g, unit: 1, uniformName: "uMaskTex" },
        { texture: b, unit: 2, uniformName: "uNeighborTexA" },
        { texture: C, unit: 3, uniformName: "uNeighborTexB" }
      ]
    }), M = Fe(a, t), !!Ea(M); ) {
      const A = M;
      l = u, f = !f, u = x({
        runtime: a,
        key: f ? d : c,
        width: t,
        pixels: A
      }), S = W({
        runtime: a,
        texture: u
      });
    }
    return {
      valueGrid: Te(M, 0),
      knownMask: Oa(Te(M, 1))
    };
  } catch (r) {
    throw Ge(), r;
  }
}
function Ea(e) {
  for (let a = 2; a < e.length; a += 4)
    if (e[a] >= 0.5)
      return !0;
  return !1;
}
function Te(e, a) {
  const r = new Float32Array(e.length / 4);
  for (let t = 0; t < r.length; t += 1)
    r[t] = e[t * 4 + a];
  return r;
}
function Oa(e) {
  const a = new Uint8Array(e.length);
  for (let r = 0; r < e.length; r += 1)
    a[r] = e[r] >= 0.5 ? 1 : 0;
  return a;
}
async function wa(e) {
  const a = oe(e.valueGrid.length);
  if (!a)
    return se(e);
  try {
    const { gl: r } = a, t = e.valueGrid.length, n = e.rounds ?? te, s = e.softObsMaxDelta ?? ne, i = new Float32Array(t * 4), o = new Float32Array(t * 4), c = new Float32Array(t * 4), d = new Float32Array(t * 4), f = new Float32Array(t * 4);
    for (let I = 0; I < t; I += 1) {
      const E = I * 4;
      i[E] = e.valueGrid[I], o[E] = e.valueGrid[I], c[E] = e.rainMask[I], c[E + 1] = e.hardAnchorMask[I], c[E + 2] = e.softObsMask[I];
      for (let P = 0; P < 4; P += 1)
        d[E + P] = e.gridNeighbors[I * 8 + P], f[E + P] = e.gridNeighbors[I * 8 + P + 4];
    }
    const l = `smooth:valueA:${t}`, u = `smooth:valueB:${t}`;
    let g = !0, b = x({
      runtime: a,
      key: l,
      width: t,
      pixels: i
    }), C = x({
      runtime: a,
      key: u,
      width: t,
      pixels: i
    });
    const S = x({
      runtime: a,
      key: `smooth:original:${t}`,
      width: t,
      pixels: o
    }), M = x({
      runtime: a,
      key: `smooth:mask:${t}`,
      width: t,
      pixels: c
    }), T = x({
      runtime: a,
      key: `smooth:neighborA:${t}`,
      width: t,
      pixels: d
    }), A = x({
      runtime: a,
      key: `smooth:neighborB:${t}`,
      width: t,
      pixels: f
    });
    let k = W({
      runtime: a,
      texture: C
    }), V = i;
    for (let I = 0; I < n; I += 1)
      Be({
        runtime: a,
        programKey: p.ConstrainedSmooth,
        width: t,
        framebuffer: k,
        uniforms: [
          { name: "uGridCount", type: "int", value: t },
          { name: "uSoftObsMaxDelta", type: "float", value: s }
        ],
        textures: [
          { texture: b, unit: 0, uniformName: "uValueTex" },
          { texture: S, unit: 1, uniformName: "uOriginalTex" },
          { texture: M, unit: 2, uniformName: "uMaskTex" },
          { texture: T, unit: 3, uniformName: "uNeighborTexA" },
          { texture: A, unit: 4, uniformName: "uNeighborTexB" }
        ]
      }), V = Fe(a, t), b = C, g = !g, C = x({
        runtime: a,
        key: g ? u : l,
        width: t,
        pixels: V
      }), k = W({
        runtime: a,
        texture: C
      });
    return pa(V, 0);
  } catch (r) {
    throw Ge(), r;
  }
}
function pa(e, a) {
  const r = new Float32Array(e.length / 4);
  for (let t = 0; t < r.length; t += 1)
    r[t] = e[t * 4 + a];
  return r;
}
async function Ga(e, a) {
  const r = la(e, {
    ...a.assets,
    stationMetaById: a.assetCaches?.stationMetaById
  }), t = a.assetCaches?.validStationIds ?? new Set(a.assets.stationMeta.stations.map((b) => String(b.station_id))), { effectiveStations: n } = da(r, {
    frameType: e.frameType,
    fallbackNeighborStationIdsByStationId: a.assets.fallbackNeighborStationIdsByStationId,
    validStationIds: t
  }), s = We(n, {
    frameType: e.frameType,
    fixedAnchorStationIds: a.assets.fixedAnchorStationIds
  }), i = Je(s, {
    assets: a.assets,
    gridIdByStationId: a.assetCaches?.gridIdByStationId
  }), o = ta({
    frameType: e.frameType,
    gridMask: a.assets.gridMask,
    gridNeighbors: a.assets.gridNeighbors,
    gridCenterX: a.assets.gridMeta.centerX,
    gridCenterY: a.assets.gridMeta.centerY,
    hardAnchorMask: i.hardAnchorMask,
    softObsMask: i.softObsMask,
    radiusConfig: a.rainMaskRadiusConfig
  }), { propagated: c, smoothedValueGrid: d, actualBackend: f } = await Fa({
    selectedBackend: a.selectedBackend,
    valueGrid: i.valueGrid,
    rainMask: o.rainMask,
    knownMask: o.knownMask,
    hardAnchorMask: i.hardAnchorMask,
    softObsMask: i.softObsMask,
    gridNeighbors: a.assets.gridNeighbors,
    gridCenterX: a.assets.gridMeta.centerX,
    gridCenterY: a.assets.gridMeta.centerY,
    ordinaryOnlyMode: i.ordinaryOnlyMode,
    smoothRounds: a.smoothConfig?.rounds,
    softObsMaxDelta: a.smoothConfig?.softObsMaxDelta
  });
  let l = f, u = me({
    valueGrid: d,
    rainMask: o.rainMask
  });
  if (f !== "cpu" && Ba({
    sourceValueGrid: i.valueGrid,
    sourceRainMask: o.rainMask,
    resultValueGrid: u.valueGrid,
    resultRainMask: u.rainMask
  })) {
    const b = await z({
      valueGrid: i.valueGrid,
      rainMask: o.rainMask,
      knownMask: o.knownMask,
      hardAnchorMask: i.hardAnchorMask,
      softObsMask: i.softObsMask,
      gridNeighbors: a.assets.gridNeighbors,
      gridCenterX: a.assets.gridMeta.centerX,
      gridCenterY: a.assets.gridMeta.centerY,
      ordinaryOnlyMode: i.ordinaryOnlyMode,
      smoothRounds: a.smoothConfig?.rounds,
      softObsMaxDelta: a.smoothConfig?.softObsMaxDelta
    });
    u = me({
      valueGrid: b.smoothedValueGrid,
      rainMask: o.rainMask
    }), l = "cpu";
  }
  const g = n.filter(
    (b) => b.status === "suspect"
  ).length;
  return ca({
    frameKey: e.frameKey,
    frameType: e.frameType,
    frameTime: e.frameTime,
    selectedBackend: l,
    valueGrid: u.valueGrid,
    rainMask: u.rainMask,
    hardAnchorMask: i.hardAnchorMask,
    softObsMask: i.softObsMask,
    knownMask: c.knownMask,
    suspectStationCount: g,
    ordinaryOnlyMode: i.ordinaryOnlyMode
  });
}
function Ba(e) {
  return Ae(e.sourceValueGrid, e.sourceRainMask) && !Ae(e.resultValueGrid, e.resultRainMask);
}
function Ae(e, a) {
  for (let r = 0; r < e.length; r += 1) {
    if (a[r] !== 1)
      continue;
    const t = e[r];
    if (Number.isFinite(t) && t >= 0.1)
      return !0;
  }
  return !1;
}
async function Fa(e) {
  if (e.selectedBackend === "webgpu") {
    const a = await ha({
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      knownMask: e.knownMask,
      hardAnchorMask: e.hardAnchorMask,
      gridNeighbors: e.gridNeighbors,
      gridCenterX: e.gridCenterX,
      gridCenterY: e.gridCenterY,
      ordinaryOnlyMode: e.ordinaryOnlyMode
    }), r = await Ma({
      valueGrid: a.valueGrid,
      rainMask: e.rainMask,
      hardAnchorMask: e.hardAnchorMask,
      softObsMask: e.softObsMask,
      gridNeighbors: e.gridNeighbors,
      rounds: e.smoothRounds,
      softObsMaxDelta: e.softObsMaxDelta
    });
    return {
      propagated: a,
      smoothedValueGrid: r,
      actualBackend: "webgpu"
    };
  }
  if (e.selectedBackend === "webgl2")
    try {
      if (!oe(e.valueGrid.length))
        return z(e);
      const a = await Ra({
        valueGrid: e.valueGrid,
        rainMask: e.rainMask,
        knownMask: e.knownMask,
        hardAnchorMask: e.hardAnchorMask,
        gridNeighbors: e.gridNeighbors,
        gridCenterX: e.gridCenterX,
        gridCenterY: e.gridCenterY,
        ordinaryOnlyMode: e.ordinaryOnlyMode
      }), r = await wa({
        valueGrid: a.valueGrid,
        rainMask: e.rainMask,
        hardAnchorMask: e.hardAnchorMask,
        softObsMask: e.softObsMask,
        gridNeighbors: e.gridNeighbors,
        rounds: e.smoothRounds,
        softObsMaxDelta: e.softObsMaxDelta
      });
      return {
        propagated: a,
        smoothedValueGrid: r,
        actualBackend: "webgl2"
      };
    } catch {
      return z(e);
    }
  return z(e);
}
async function z(e) {
  const a = ie({
    valueGrid: e.valueGrid,
    rainMask: e.rainMask,
    knownMask: e.knownMask,
    hardAnchorMask: e.hardAnchorMask,
    gridNeighbors: e.gridNeighbors,
    gridCenterX: e.gridCenterX,
    gridCenterY: e.gridCenterY,
    ordinaryOnlyMode: e.ordinaryOnlyMode
  }), r = se({
    valueGrid: a.valueGrid,
    rainMask: e.rainMask,
    hardAnchorMask: e.hardAnchorMask,
    softObsMask: e.softObsMask,
    gridNeighbors: e.gridNeighbors,
    rounds: e.smoothRounds,
    softObsMaxDelta: e.softObsMaxDelta
  });
  return {
    propagated: a,
    smoothedValueGrid: r,
    actualBackend: "cpu"
  };
}
function Na(e) {
  return e.map((a, r) => ({
    frameTime: a,
    sourceIndex: r
  })).sort((a, r) => a.frameTime.localeCompare(r.frameTime));
}
function Ie(e) {
  const a = Na(e.frameTimes), r = e.stationIds.length;
  return a.map(({ frameTime: t, sourceIndex: n }) => {
    const s = n * r, i = s + r;
    return {
      frameKey: `${e.productType}|${t}`,
      frameType: e.productType,
      frameTime: t,
      stationIds: e.stationIds,
      stationValues: e.values.slice(s, i)
    };
  });
}
function Da(e) {
  return [
    ...Ie(e.rain5mSequence),
    ...Ie(e.accum1hSequence)
  ].sort((a, r) => {
    const t = a.frameTime.localeCompare(r.frameTime);
    return t !== 0 ? t : Pa(a.frameType, r.frameType);
  });
}
function Pa(e, a) {
  return ve(e) - ve(a);
}
function ve(e) {
  return e === D.Rain5m ? 0 : 1;
}
const La = {
  Assembling: "assembling"
};
async function Va(e) {
  Xe({
    stationIds: e.rain5mSequence.stationIds,
    rain5m: e.rain5mSequence,
    accum1h: e.accum1hSequence
  });
  const a = e.now ?? (() => Date.now()), r = e.yieldControl ?? (async () => {
  }), t = Da({
    rain5mSequence: e.rain5mSequence,
    accum1hSequence: e.accum1hSequence
  }), n = t.length, s = a(), i = $e(), o = new Map(
    e.assets.stationMeta.stations.map((u) => [
      String(u.station_id),
      u
    ])
  ), c = new Set(o.keys()), d = new Map(
    e.assets.stationMeta.stations.map((u, g) => [
      String(u.station_id),
      e.assets.stationToGrid[g]
    ])
  );
  let f = 0, l = e.selectedBackend;
  e.onTaskStarted?.({
    taskId: e.taskId,
    selectedBackend: e.selectedBackend,
    totalFrames: n
  });
  for (const u of t) {
    if (e.isCancelled?.())
      return {
        taskId: e.taskId,
        status: "cancelled",
        completedFrames: f,
        totalFrames: n,
        elapsedMs: a() - s,
        metrics: i.buildSummary(a() - s)
      };
    if (await r(), e.isCancelled?.())
      return {
        taskId: e.taskId,
        status: "cancelled",
        completedFrames: f,
        totalFrames: n,
        elapsedMs: a() - s,
        metrics: i.buildSummary(a() - s)
      };
    const g = a(), b = await Ga(u, {
      assets: e.assets,
      selectedBackend: l,
      rainMaskRadiusConfig: e.rainMaskRadiusConfig,
      assetCaches: {
        stationMetaById: o,
        validStationIds: c,
        gridIdByStationId: d
      }
    });
    l = b.selectedBackend, b.summary.elapsedMs = a() - g, i.recordFrame(b.summary.elapsedMs), f += 1, e.onFrameReady?.({
      taskId: e.taskId,
      frameKey: u.frameKey,
      frameResult: b
    }), e.onTaskProgress?.({
      taskId: e.taskId,
      completedFrames: f,
      totalFrames: n,
      currentFrameKey: u.frameKey,
      phase: La.Assembling
    });
  }
  return {
    taskId: e.taskId,
    status: "completed",
    completedFrames: f,
    totalFrames: n,
    elapsedMs: a() - s,
    metrics: i.buildSummary(a() - s)
  };
}
const N = {
  AssetValidationFailed: "ASSET_VALIDATION_FAILED",
  PackageValidationFailed: "PACKAGE_VALIDATION_FAILED",
  TaskAlreadyRunning: "TASK_ALREADY_RUNNING",
  TaskNotFound: "TASK_NOT_FOUND",
  FrameComputeFailed: "FRAME_COMPUTE_FAILED",
  UnknownError: "UNKNOWN_ERROR"
};
function Ua(e) {
  const a = {
    assets: null,
    runningTask: null
  };
  return {
    async handleMessage(r) {
      switch (r.type) {
        case "detect_backend": {
          try {
            const t = await Ce(
              e.detectBackend,
              "auto"
            );
            e.postResponse({
              type: "backend_detected",
              request_id: r.request_id,
              payload: {
                selected_backend: t.selectedBackend,
                available_backends: t.availableBackends
              }
            });
          } catch (t) {
            w(e.postResponse, r.request_id, null, t);
          }
          return;
        }
        case "load_assets": {
          try {
            const t = Ya(r.payload);
            a.assets = t, e.postResponse({
              type: "assets_loaded",
              request_id: r.request_id,
              payload: {
                asset_version: t.manifest.asset_version,
                grid_count: t.manifest.grid_count,
                station_count: t.stationMeta.station_count,
                bbox_render: t.manifest.bbox_render
              }
            });
          } catch (t) {
            w(e.postResponse, r.request_id, null, t);
          }
          return;
        }
        case "start_task": {
          if (a.runningTask) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              ee(
                N.TaskAlreadyRunning,
                "已有任务正在运行"
              )
            );
            return;
          }
          if (!a.assets) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              ee(
                N.AssetValidationFailed,
                "静态资产尚未加载"
              )
            );
            return;
          }
          if (r.payload.algorithm_profile_version && r.payload.algorithm_profile_version !== a.assets.manifest.algorithm_profile_version) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              new H("algorithm_profile_version 不匹配")
            );
            return;
          }
          let t;
          try {
            t = (await Ce(
              e.detectBackend,
              r.payload.preferred_backend ?? "auto"
            )).selectedBackend;
          } catch (n) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              n
            );
            return;
          }
          a.runningTask = {
            requestId: r.request_id,
            taskId: r.payload.task_id,
            cancelRequested: !1
          };
          try {
            const n = await Va({
              taskId: r.payload.task_id,
              rain5mSequence: r.payload.rain_5m_sequence,
              accum1hSequence: r.payload.accum_1h_sequence,
              assets: a.assets,
              selectedBackend: t,
              rainMaskRadiusConfig: r.payload.rain_mask_radius_config ? {
                minRadius: r.payload.rain_mask_radius_config.min_radius,
                maxRadius: r.payload.rain_mask_radius_config.max_radius,
                hardAnchorBonus: r.payload.rain_mask_radius_config.hard_anchor_bonus,
                expansionOffset: r.payload.rain_mask_radius_config.expansion_offset
              } : void 0,
              now: e.now,
              yieldControl: e.yieldControl,
              isCancelled: () => a.runningTask?.cancelRequested === !0,
              onTaskStarted: (s) => {
                e.postResponse({
                  type: "task_started",
                  request_id: r.request_id,
                  payload: {
                    task_id: s.taskId,
                    selected_backend: s.selectedBackend,
                    total_frames: s.totalFrames
                  }
                });
              },
              onTaskProgress: (s) => {
                e.postResponse({
                  type: "task_progress",
                  request_id: r.request_id,
                  payload: {
                    task_id: s.taskId,
                    completed_frames: s.completedFrames,
                    total_frames: s.totalFrames,
                    current_frame_key: s.currentFrameKey,
                    phase: s.phase
                  }
                });
              },
              onFrameReady: (s) => {
                e.postResponse(
                  {
                    type: "frame_ready",
                    request_id: r.request_id,
                    payload: {
                      task_id: s.taskId,
                      frame_key: s.frameKey,
                      frame_result: s.frameResult
                    }
                  },
                  Xa(s.frameResult)
                );
              }
            });
            n.status === "cancelled" ? e.postResponse({
              type: "task_cancelled",
              request_id: r.request_id,
              payload: {
                task_id: n.taskId,
                completed_frames: n.completedFrames,
                total_frames: n.totalFrames
              }
            }) : e.postResponse({
              type: "task_completed",
              request_id: r.request_id,
              payload: {
                task_id: n.taskId,
                completed_frames: n.completedFrames,
                total_frames: n.totalFrames,
                elapsed_ms: n.elapsedMs,
                metrics: n.metrics
              }
            });
          } catch (n) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              n
            );
          } finally {
            a.runningTask = null;
          }
          return;
        }
        case "cancel_task": {
          if (!a.runningTask || a.runningTask.taskId !== r.payload.task_id) {
            w(
              e.postResponse,
              r.request_id,
              r.payload.task_id,
              ee(
                N.TaskNotFound,
                "未找到可取消的任务"
              )
            );
            return;
          }
          a.runningTask.cancelRequested = !0;
          return;
        }
        case "release_frame_cache":
          return;
      }
    }
  };
}
function Ya(e) {
  if (e.asset_manifest.protocol_version !== Ne)
    throw new R("protocol_version 不兼容");
  if (e.asset_manifest.algorithm_profile_version !== De)
    throw new R("algorithm_profile_version 不兼容");
  const a = {
    manifest: e.asset_manifest,
    gridMeta: {
      gridId: e.grid_meta.grid_id,
      row: e.grid_meta.row,
      col: e.grid_meta.col,
      centerX: e.grid_meta.center_x,
      centerY: e.grid_meta.center_y
    },
    gridMask: e.grid_mask,
    gridNeighbors: e.grid_neighbors,
    stationToGrid: e.station_to_grid,
    stationMeta: e.station_meta,
    fixedAnchorStationIds: new Set(
      e.station_meta.stations.filter(
        (r) => r.is_fortress_anchor || r.is_tongzhou_anchor || r.is_cross_boundary_anchor
      ).map((r) => String(r.station_id))
    ),
    fallbackNeighborStationIdsByStationId: new Map(
      Object.entries(e.fallback_neighbor_station_ids_by_station_id ?? {})
    )
  };
  return Pe(a, {
    expectedAssetVersion: e.asset_manifest.asset_version
  }), a;
}
async function Ce(e, a) {
  return (e ?? ((r) => Le(r)))({
    preferredBackend: a ?? "auto"
  });
}
function ee(e, a) {
  const r = new Error(a);
  return r.code = e, r;
}
function w(e, a, r, t) {
  const n = Ka(t);
  e({
    type: "task_failed",
    request_id: a,
    payload: {
      task_id: r ?? "",
      error_code: n.code,
      message: n.message,
      details: n.details
    }
  });
}
function Ka(e) {
  return e instanceof R ? {
    code: N.AssetValidationFailed,
    message: e.message
  } : e instanceof H ? {
    code: N.PackageValidationFailed,
    message: e.message
  } : e instanceof Error && "code" in e && typeof e.code == "string" ? {
    code: e.code,
    message: e.message
  } : e instanceof Error ? {
    code: N.FrameComputeFailed,
    message: e.message
  } : {
    code: N.UnknownError,
    message: "未知 Worker 错误"
  };
}
function Xa(e) {
  const a = [
    e.valueGrid.buffer,
    e.rainMask.buffer,
    e.hardAnchorMask.buffer,
    e.softObsMask.buffer
  ];
  return e.knownMask && a.push(e.knownMask.buffer), a;
}
const $a = Ua({
  postResponse(e, a) {
    self.postMessage(e, a ?? []);
  },
  yieldControl: async () => {
    await Promise.resolve();
  }
});
self.onmessage = (e) => {
  $a.handleMessage(e.data);
};
