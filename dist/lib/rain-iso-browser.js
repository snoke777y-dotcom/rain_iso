var b = Uint8Array, W = Uint16Array, sr = Int32Array, Ve = new b([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), De = new b([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), cr = new b([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), Le = function(e, r) {
  for (var n = new W(31), t = 0; t < 31; ++t)
    n[t] = r += 1 << e[t - 1];
  for (var i = new sr(n[30]), t = 1; t < 30; ++t)
    for (var a = n[t]; a < n[t + 1]; ++a)
      i[a] = a - n[t] << 5 | t;
  return { b: n, r: i };
}, Ue = Le(Ve, 2), qe = Ue.b, lr = Ue.r;
qe[28] = 258, lr[258] = 28;
var or = Le(De, 0), dr = or.b, ue = new W(32768);
for (var y = 0; y < 32768; ++y) {
  var O = (y & 43690) >> 1 | (y & 21845) << 1;
  O = (O & 52428) >> 2 | (O & 13107) << 2, O = (O & 61680) >> 4 | (O & 3855) << 4, ue[y] = ((O & 65280) >> 8 | (O & 255) << 8) >> 1;
}
var H = (function(e, r, n) {
  for (var t = e.length, i = 0, a = new W(r); i < t; ++i)
    e[i] && ++a[e[i] - 1];
  var s = new W(r);
  for (i = 1; i < r; ++i)
    s[i] = s[i - 1] + a[i - 1] << 1;
  var c;
  if (n) {
    c = new W(1 << r);
    var o = 15 - r;
    for (i = 0; i < t; ++i)
      if (e[i])
        for (var u = i << 4 | e[i], f = r - e[i], l = s[e[i] - 1]++ << f, d = l | (1 << f) - 1; l <= d; ++l)
          c[ue[l] >> o] = u;
  } else
    for (c = new W(t), i = 0; i < t; ++i)
      e[i] && (c[i] = ue[s[e[i] - 1]++] >> 15 - e[i]);
  return c;
}), Y = new b(288);
for (var y = 0; y < 144; ++y)
  Y[y] = 8;
for (var y = 144; y < 256; ++y)
  Y[y] = 9;
for (var y = 256; y < 280; ++y)
  Y[y] = 7;
for (var y = 280; y < 288; ++y)
  Y[y] = 8;
var pe = new b(32);
for (var y = 0; y < 32; ++y)
  pe[y] = 5;
var ur = /* @__PURE__ */ H(Y, 9, 1), fr = /* @__PURE__ */ H(pe, 5, 1), ie = function(e) {
  for (var r = e[0], n = 1; n < e.length; ++n)
    e[n] > r && (r = e[n]);
  return r;
}, B = function(e, r, n) {
  var t = r / 8 | 0;
  return (e[t] | e[t + 1] << 8) >> (r & 7) & n;
}, se = function(e, r) {
  var n = r / 8 | 0;
  return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (r & 7);
}, gr = function(e) {
  return (e + 7) / 8 | 0;
}, me = function(e, r, n) {
  return (r == null || r < 0) && (r = 0), (n == null || n > e.length) && (n = e.length), new b(e.subarray(r, n));
}, mr = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], v = function(e, r, n) {
  var t = new Error(r || mr[e]);
  if (t.code = e, Error.captureStackTrace && Error.captureStackTrace(t, v), !n)
    throw t;
  return t;
}, hr = function(e, r, n, t) {
  var i = e.length, a = t ? t.length : 0;
  if (!i || r.f && !r.l)
    return n || new b(0);
  var s = !n, c = s || r.i != 2, o = r.i;
  s && (n = new b(i * 3));
  var u = function(be) {
    var Ce = n.length;
    if (be > Ce) {
      var Ae = new b(Math.max(Ce * 2, be));
      Ae.set(n), n = Ae;
    }
  }, f = r.f || 0, l = r.p || 0, d = r.b || 0, g = r.l, m = r.d, h = r.m, I = r.n, N = i * 8;
  do {
    if (!g) {
      f = B(e, l, 1);
      var w = B(e, l + 1, 3);
      if (l += 3, w)
        if (w == 1)
          g = ur, m = fr, h = 9, I = 5;
        else if (w == 2) {
          var L = B(e, l, 31) + 257, ye = B(e, l + 10, 15) + 4, we = L + B(e, l + 5, 31) + 1;
          l += 14;
          for (var X = new b(we), re = new b(19), C = 0; C < ye; ++C)
            re[cr[C]] = B(e, l + C * 3, 7);
          l += ye * 3;
          for (var xe = ie(re), rr = (1 << xe) - 1, tr = H(re, xe, 1), C = 0; C < we; ) {
            var Ie = tr[B(e, l, rr)];
            l += Ie & 15;
            var x = Ie >> 4;
            if (x < 16)
              X[C++] = x;
            else {
              var U = 0, J = 0;
              for (x == 16 ? (J = 3 + B(e, l, 3), l += 2, U = X[C - 1]) : x == 17 ? (J = 3 + B(e, l, 7), l += 3) : x == 18 && (J = 11 + B(e, l, 127), l += 7); J--; )
                X[C++] = U;
            }
          }
          var ke = X.subarray(0, L), E = X.subarray(L);
          h = ie(ke), I = ie(E), g = H(ke, h, 1), m = H(E, I, 1);
        } else
          v(1);
      else {
        var x = gr(l) + 4, k = e[x - 4] | e[x - 3] << 8, K = x + k;
        if (K > i) {
          o && v(0);
          break;
        }
        c && u(d + k), n.set(e.subarray(x, K), d), r.b = d += k, r.p = l = K * 8, r.f = f;
        continue;
      }
      if (l > N) {
        o && v(0);
        break;
      }
    }
    c && u(d + 131072);
    for (var nr = (1 << h) - 1, ar = (1 << I) - 1, te = l; ; te = l) {
      var U = g[se(e, l) & nr], q = U >> 4;
      if (l += U & 15, l > N) {
        o && v(0);
        break;
      }
      if (U || v(2), q < 256)
        n[d++] = q;
      else if (q == 256) {
        te = l, g = null;
        break;
      } else {
        var _e = q - 254;
        if (q > 264) {
          var C = q - 257, j = Ve[C];
          _e = B(e, l, (1 << j) - 1) + qe[C], l += j;
        }
        var ne = m[se(e, l) & ar], ae = ne >> 4;
        ne || v(3), l += ne & 15;
        var E = dr[ae];
        if (ae > 3) {
          var j = De[ae];
          E += se(e, l) & (1 << j) - 1, l += j;
        }
        if (l > N) {
          o && v(0);
          break;
        }
        c && u(d + 131072);
        var Me = d + _e;
        if (d < E) {
          var ve = a - E, ir = Math.min(E, Me);
          for (ve + d < 0 && v(3); d < ir; ++d)
            n[d] = t[ve + d];
        }
        for (; d < Me; ++d)
          n[d] = n[d - E];
      }
    }
    r.l = g, r.p = te, r.b = d, r.f = f, g && (f = 1, r.m = h, r.d = m, r.n = I);
  } while (!f);
  return d != n.length && s ? me(n, 0, d) : n.subarray(0, d);
}, yr = /* @__PURE__ */ new b(0), S = function(e, r) {
  return e[r] | e[r + 1] << 8;
}, A = function(e, r) {
  return (e[r] | e[r + 1] << 8 | e[r + 2] << 16 | e[r + 3] << 24) >>> 0;
}, ce = function(e, r) {
  return A(e, r) + A(e, r + 4) * 4294967296;
};
function wr(e, r) {
  return hr(e, { i: 2 }, r && r.out, r && r.dictionary);
}
var fe = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), xr = 0;
try {
  fe.decode(yr, { stream: !0 }), xr = 1;
} catch {
}
var Ir = function(e) {
  for (var r = "", n = 0; ; ) {
    var t = e[n++], i = (t > 127) + (t > 223) + (t > 239);
    if (n + i > e.length)
      return { s: r, r: me(e, n - 1) };
    i ? i == 3 ? (t = ((t & 15) << 18 | (e[n++] & 63) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) - 65536, r += String.fromCharCode(55296 | t >> 10, 56320 | t & 1023)) : i & 1 ? r += String.fromCharCode((t & 31) << 6 | e[n++] & 63) : r += String.fromCharCode((t & 15) << 12 | (e[n++] & 63) << 6 | e[n++] & 63) : r += String.fromCharCode(t);
  }
};
function kr(e, r) {
  if (r) {
    for (var n = "", t = 0; t < e.length; t += 16384)
      n += String.fromCharCode.apply(null, e.subarray(t, t + 16384));
    return n;
  } else {
    if (fe)
      return fe.decode(e);
    var i = Ir(e), a = i.s, n = i.r;
    return n.length && v(8), a;
  }
}
var _r = function(e, r) {
  return r + 30 + S(e, r + 26) + S(e, r + 28);
}, Mr = function(e, r, n) {
  var t = S(e, r + 28), i = S(e, r + 30), a = kr(e.subarray(r + 46, r + 46 + t), !(S(e, r + 8) & 2048)), s = r + 46 + t, c = vr(e, s, i, n, A(e, r + 20), A(e, r + 24), A(e, r + 42)), o = c[0], u = c[1], f = c[2];
  return [S(e, r + 10), o, u, a, s + i + S(e, r + 32), f];
}, vr = function(e, r, n, t, i, a, s) {
  var c = i == 4294967295, o = a == 4294967295, u = s == 4294967295, f = r + n, l = c + o + u;
  if (t && l) {
    for (; r + 4 < f; r += 4 + S(e, r + 2))
      if (S(e, r) == 1)
        return [
          c ? ce(e, r + 4 + 8 * o) : i,
          o ? ce(e, r + 4) : a,
          u ? ce(e, r + 4 + 8 * (o + c)) : s,
          1
        ];
    t < 2 && v(13);
  }
  return [i, a, s, 0];
};
function br(e, r) {
  for (var n = {}, t = e.length - 22; A(e, t) != 101010256; --t)
    (!t || e.length - t > 65558) && v(13);
  var i = S(e, t + 8);
  if (!i)
    return {};
  var a = A(e, t + 16), s = A(e, t - 20) == 117853008;
  if (s) {
    var c = A(e, t - 12);
    s = A(e, c) == 101075792, s && (i = A(e, c + 32), a = A(e, c + 48));
  }
  for (var o = 0; o < i; ++o) {
    var u = Mr(e, a, s), f = u[0], l = u[1], d = u[2], g = u[3], m = u[4], h = u[5], I = _r(e, h);
    a = m, f ? f == 8 ? n[g] = wr(e.subarray(I, I + l), { out: new b(d) }) : v(14, "unknown compression type " + f) : n[g] = me(e, I, I + l);
  }
  return n;
}
const Cr = "RTA1";
function le(e) {
  const r = Br(e), n = new DataView(
    r.buffer,
    r.byteOffset,
    r.byteLength
  ), t = new TextDecoder().decode(r.subarray(0, 4));
  if (t !== Cr)
    throw new Error(`Unsupported typed array binary magic: ${t}`);
  const i = n.getUint32(4, !0), a = 8, s = a + i, c = JSON.parse(
    new TextDecoder().decode(r.subarray(a, s))
  ), o = {}, u = s;
  for (const f of c.fields) {
    const l = r.slice(
      u + f.byteOffset,
      u + f.byteOffset + f.byteLength
    );
    o[f.name] = Ar(f.type, l.buffer, f.length);
  }
  return o;
}
function Ar(e, r, n) {
  switch (e) {
    case "Int32Array":
      return new Int32Array(r.slice(0), 0, n);
    case "Float32Array":
      return new Float32Array(r.slice(0), 0, n);
    case "Uint8Array":
      return new Uint8Array(r.slice(0), 0, n);
  }
}
function Br(e) {
  return e instanceof Uint8Array ? e : new Uint8Array(e);
}
class F extends Error {
  code = "ASSET_VALIDATION_FAILED";
  constructor(r) {
    super(r), this.name = "AssetValidationError";
  }
}
function Rr(e, r = {}) {
  const { manifest: n, gridMeta: t, gridMask: i, gridNeighbors: a, stationMeta: s, stationToGrid: c } = e;
  if (!n.asset_version)
    throw new F("asset_version is required");
  if (r.expectedAssetVersion && n.asset_version !== r.expectedAssetVersion)
    throw new F(
      `asset_version mismatch: expected ${r.expectedAssetVersion}, got ${n.asset_version}`
    );
  if (n.grid_rows * n.grid_cols < n.grid_count)
    throw new F("grid_rows * grid_cols must cover grid_count");
  if (i.length !== n.grid_count)
    throw new F("grid_mask length mismatch");
  if (a.length !== n.grid_count * 8)
    throw new F("grid_neighbors length mismatch");
  if (s.station_count !== c.length)
    throw new F("station_meta and station_to_grid length mismatch");
  if (t.gridId.length !== n.grid_count || t.row.length !== n.grid_count || t.col.length !== n.grid_count || t.centerX.length !== n.grid_count || t.centerY.length !== n.grid_count)
    throw new F("grid_meta column length mismatch");
}
function Fr(e) {
  const r = le(e.gridMetaBytes), n = le(e.gridNeighborsBytes), t = le(e.stationToGridBytes), i = JSON.parse(
    new TextDecoder().decode(e.stationMetaBytes)
  ), a = JSON.parse(
    new TextDecoder().decode(e.renderBoundaryBytes)
  ), s = new Set(
    i.stations.map((o) => String(o.station_id))
  ), c = {
    manifest: e.manifest,
    gridMeta: {
      gridId: r.grid_id,
      row: r.row,
      col: r.col,
      centerX: r.center_x,
      centerY: r.center_y
    },
    gridMask: new Uint8Array(e.gridMaskBytes.buffer.slice(0)),
    gridNeighbors: n.neighbors,
    stationToGrid: t.grid_id,
    stationMeta: i,
    renderBoundary: a,
    fixedAnchorStationIds: new Set(
      e.fixedAnchorDictionary.stations.map((o) => o.station_id).filter((o) => s.has(o))
    ),
    fallbackNeighborStationIdsByStationId: Sr(
      e.stationNeighborRelations,
      s
    )
  };
  return Rr(c, {
    expectedAssetVersion: e.expectedAssetVersion
  }), c;
}
function Sr(e, r) {
  const n = /* @__PURE__ */ new Map();
  for (const t of e.relations) {
    if (!r.has(t.station_id))
      continue;
    const i = t.fallback_nearest_neighbors.map((a) => a.station_id).filter((a) => r.has(a));
    n.set(t.station_id, i);
  }
  return n;
}
async function p(e, r, n) {
  const t = new Uint8Array(r.byteLength);
  t.set(r);
  const i = await crypto.subtle.digest(
    "SHA-256",
    t.buffer
  ), a = `sha256:${Array.from(new Uint8Array(i)).map((s) => s.toString(16).padStart(2, "0")).join("")}`;
  if (a !== n)
    throw new F(
      `${e} checksum mismatch: expected ${n}, got ${a}`
    );
}
const V = {
  Rain5m: "rain_5m",
  Accum1hStep: "accum_1h_step"
}, $e = {
  Legend5mV1: "legend_5m_v1",
  LegendAccum24hV1: "legend_accum_24h_v1"
};
function Nr(e, r) {
  const n = Object.keys(e.data).map(Be).sort(), t = /* @__PURE__ */ new Map();
  for (const [o, u] of Object.entries(e.data))
    t.set(Be(o), u);
  const i = {}, a = Array.from(
    new Set(
      Object.values(e.data).flat().map((o) => o.stcd)
    )
  ).sort();
  for (const o of Object.values(e.data))
    for (const u of o)
      i[u.stcd] || (i[u.stcd] = u);
  const s = new Float32Array(n.length * a.length);
  s.fill(Number.NaN);
  const c = new Map(
    a.map((o, u) => [o, u])
  );
  return n.forEach((o, u) => {
    const f = t.get(o) ?? [];
    for (const l of f) {
      const d = c.get(l.stcd);
      d !== void 0 && (s[u * a.length + d] = l.drp);
    }
  }), {
    frameTimes: n,
    productType: r.productType,
    stationIds: a,
    stationMetaById: i,
    values: s
  };
}
function Be(e) {
  const [r, n] = e.split(" ");
  return `${r}T${n}+08:00`;
}
class T extends Error {
  code = "PACKAGE_VALIDATION_FAILED";
  constructor(r) {
    super(r), this.name = "PackageValidationError";
  }
}
function Gr(e, r) {
  if (e.code !== "0")
    throw new T(
      `${r.expectedProductType} response code must be 0`
    );
  const n = Object.keys(e.data ?? {});
  if (n.length === 0)
    throw new T(
      `${r.expectedProductType} response must contain at least one frame`
    );
  const t = new Set(
    (e.data[n[0]] ?? []).map((i) => i.stcd)
  );
  if (t.size === 0)
    throw new T(
      `${r.expectedProductType} response must contain at least one station`
    );
  for (const i of n.slice(1)) {
    const a = new Set(
      (e.data[i] ?? []).map((s) => s.stcd)
    );
    if (a.size !== t.size)
      throw new T(
        `${r.expectedProductType} station count mismatch across frames`
      );
    for (const s of t)
      if (!a.has(s))
        throw new T(
          `${r.expectedProductType} station set mismatch across frames`
        );
  }
}
function Tr(e) {
  if (e.rain5m.stationIds.join("|") !== e.accum1h.stationIds.join("|"))
    throw new T("5 分钟和 1 小时接口的站点集合不一致");
  Re(e.rain5m.frameTimes, 5, "5 分钟"), Re(e.accum1h.frameTimes, 60, "1 小时");
}
function Re(e, r, n) {
  for (let t = 1; t < e.length; t += 1) {
    const i = Date.parse(e[t - 1]);
    if (Date.parse(e[t]) - i !== r * 60 * 1e3)
      throw new T(`${n}序列时间步长不正确`);
  }
}
async function Pr(e) {
  const r = await ("directoryHandle" in e ? await Vr(e.directoryHandle) : Dr(e.files));
  return We(r);
}
async function Er(e) {
  const r = br(new Uint8Array(await e.arrayBuffer())), n = /* @__PURE__ */ new Map();
  for (const [t, i] of Object.entries(r))
    t.endsWith("/") || n.set(D(t), i);
  return We(n);
}
async function Or(e) {
  const r = e.realtime5mFile ? Se(await Fe(e.realtime5mFile), V.Rain5m) : null, n = e.realtime1hFile ? Se(await Fe(e.realtime1hFile), V.Accum1hStep) : null;
  if (!r && !n)
    throw new T("请至少导入一个 JSON 文件");
  const t = r?.stationIds ?? n?.stationIds ?? [], i = r ?? Ne(V.Rain5m, t), a = n ?? Ne(V.Accum1hStep, t), s = {
    stationIds: t,
    rain5m: i,
    accum1h: a
  };
  return Tr(s), s;
}
async function We(e) {
  const r = oe(e, "asset_manifest.json"), n = G(e, r), t = JSON.parse(new TextDecoder().decode(n)), i = Ur(r), a = $(i, t.files.grid_meta), s = $(i, t.files.grid_mask), c = $(i, t.files.grid_neighbors), o = $(i, t.files.station_to_grid), u = $(i, t.files.station_meta), f = $(i, t.files.render_boundary), l = G(e, a), d = G(e, s), g = G(e, c), m = G(e, o), h = G(e, u), I = G(e, f);
  await p(t.files.grid_meta, l, t.checksums.grid_meta), await p(t.files.grid_mask, d, t.checksums.grid_mask), await p(
    t.files.grid_neighbors,
    g,
    t.checksums.grid_neighbors
  ), await p(
    t.files.station_to_grid,
    m,
    t.checksums.station_to_grid
  ), await p(
    t.files.station_meta,
    h,
    t.checksums.station_meta
  ), await p(
    t.files.render_boundary,
    I,
    t.checksums.render_boundary
  );
  const N = oe(
    e,
    "fixed_anchor_stations.json"
  ), w = oe(
    e,
    "station_neighbor_relations_5km.json"
  );
  return Fr({
    manifest: t,
    gridMetaBytes: l,
    gridMaskBytes: d,
    gridNeighborsBytes: g,
    stationToGridBytes: m,
    stationMetaBytes: h,
    renderBoundaryBytes: I,
    fixedAnchorDictionary: JSON.parse(
      new TextDecoder().decode(G(e, N))
    ),
    stationNeighborRelations: JSON.parse(
      new TextDecoder().decode(G(e, w))
    )
  });
}
async function Vr(e) {
  const r = /* @__PURE__ */ new Map();
  return await Ke(e, "", r), r;
}
async function Ke(e, r, n) {
  for await (const [t, i] of e.entries()) {
    const a = r ? `${r}/${t}` : t;
    if (i.kind === "directory") {
      await Ke(i, a, n);
      continue;
    }
    n.set(
      D(a),
      new Uint8Array(
        await (await i.getFile()).arrayBuffer()
      )
    );
  }
}
function Dr(e) {
  const r = /* @__PURE__ */ new Map(), n = [];
  for (const t of e) {
    const i = Lr(t);
    n.push(
      t.arrayBuffer().then((a) => {
        r.set(D(i), new Uint8Array(a));
      })
    );
  }
  return Promise.all(n).then(() => r);
}
async function Fe(e) {
  try {
    return JSON.parse(await e.text());
  } catch (r) {
    throw new T(
      r instanceof Error ? r.message : "无法读取原始接口文件"
    );
  }
}
function Se(e, r) {
  return Gr(e, {
    expectedProductType: r
  }), Nr(e, {
    productType: r
  });
}
function Ne(e, r) {
  return {
    frameTimes: [],
    productType: e,
    stationIds: r,
    stationMetaById: {},
    values: new Float32Array(0)
  };
}
function G(e, r) {
  const n = e.get(D(r));
  if (!n)
    throw new F(`缺少文件: ${r}`);
  return n;
}
function oe(e, r) {
  const n = Array.from(e.keys()).filter(
    (t) => t.split("/").at(-1) === r
  );
  if (n.length !== 1)
    throw new F(`无法唯一定位文件: ${r}`);
  return n[0];
}
function Lr(e) {
  const r = e.webkitRelativePath || e.name;
  return D(r);
}
function D(e) {
  return e.replace(/\\/g, "/").replace(/^\/+/, "");
}
function Ur(e) {
  const r = D(e), n = r.lastIndexOf("/");
  return n >= 0 ? r.slice(0, n) : "";
}
function $(e, r) {
  return D([e, r].filter(Boolean).join("/"));
}
function Et(e = {}) {
  const r = e.intervalMs ?? 500, n = {
    1: 1e3,
    2: 500,
    3: 100
  }, t = {
    frames: [...e.frames ?? []],
    currentIndex: 0,
    currentFrame: e.frames?.[0] ?? null,
    isPlaying: !1,
    playbackRate: 1
  };
  let i = null;
  const a = /* @__PURE__ */ new Set(), s = () => {
    const l = {
      frames: [...t.frames],
      currentIndex: t.currentIndex,
      currentFrame: t.currentFrame,
      isPlaying: t.isPlaying,
      playbackRate: t.playbackRate
    };
    for (const d of a)
      d(l);
  }, c = () => (t.currentFrame = t.frames[t.currentIndex] ?? null, s(), t.currentFrame), o = () => {
    i !== null && (clearTimeout(i), i = null);
  }, u = () => {
    if (o(), !t.isPlaying || t.frames.length <= 1)
      return;
    const l = n[t.playbackRate] ?? r / t.playbackRate;
    i = setTimeout(() => {
      if (i = null, !t.isPlaying)
        return;
      f.next() && t.isPlaying && u();
    }, l);
  }, f = {
    getState() {
      return {
        frames: [...t.frames],
        currentIndex: t.currentIndex,
        currentFrame: t.currentFrame,
        isPlaying: t.isPlaying,
        playbackRate: t.playbackRate
      };
    },
    subscribe(l) {
      return a.add(l), l(this.getState()), () => {
        a.delete(l);
      };
    },
    setFrames(l) {
      const d = [...l], g = t.currentFrame?.frameKey;
      if (t.frames = d, d.length === 0) {
        t.currentIndex = 0, t.currentFrame = null, t.isPlaying = !1, o(), s();
        return;
      }
      const m = g == null ? -1 : d.findIndex((h) => h.frameKey === g);
      t.currentIndex = m >= 0 ? m : Math.min(t.currentIndex, d.length - 1), c(), t.isPlaying && u();
    },
    selectFrame(l) {
      return t.frames.length === 0 ? (t.currentIndex = 0, t.currentFrame = null, s(), null) : (t.currentIndex = Math.max(0, Math.min(l, t.frames.length - 1)), c());
    },
    selectFrameByKey(l) {
      const d = t.frames.findIndex((g) => g.frameKey === l);
      return d >= 0 ? this.selectFrame(d) : null;
    },
    next() {
      return t.frames.length === 0 ? null : this.selectFrame((t.currentIndex + 1) % t.frames.length);
    },
    previous() {
      return t.frames.length === 0 ? null : this.selectFrame(
        (t.currentIndex - 1 + t.frames.length) % t.frames.length
      );
    },
    setPlaybackRate(l) {
      !Number.isFinite(l) || l <= 0 || (t.playbackRate = l, s(), t.isPlaying && u());
    },
    play() {
      if (t.frames.length <= 1) {
        t.isPlaying = !1, s();
        return;
      }
      if (t.isPlaying) {
        u(), s();
        return;
      }
      t.isPlaying = !0, s(), u();
    },
    pause() {
      t.isPlaying = !1, o(), s();
    },
    dispose() {
      t.isPlaying = !1, o(), t.frames = [], t.currentIndex = 0, t.currentFrame = null, s(), a.clear();
    }
  };
  return f;
}
const R = {
  Idle: "idle",
  Busy: "busy",
  Terminated: "terminated"
}, Q = {
  AssetValidationFailed: "ASSET_VALIDATION_FAILED",
  PackageValidationFailed: "PACKAGE_VALIDATION_FAILED",
  BackendUnavailable: "BACKEND_UNAVAILABLE",
  TaskAlreadyRunning: "TASK_ALREADY_RUNNING",
  TaskNotFound: "TASK_NOT_FOUND",
  GpuContextLost: "GPU_CONTEXT_LOST",
  GpuMemoryExceeded: "GPU_MEMORY_EXCEEDED",
  FrameComputeFailed: "FRAME_COMPUTE_FAILED",
  UnknownError: "UNKNOWN_ERROR"
};
class de extends Error {
  code;
  details;
  constructor(r, n, t) {
    super(n), this.name = "RainIsoError", this.code = r, this.details = t;
  }
}
function qr(e) {
  const r = e.requestIdFactory ?? pr, n = /* @__PURE__ */ new Map();
  let t = R.Idle;
  return e.worker.onmessage = (i) => {
    const a = i.data, s = n.get(a.request_id);
    if (s) {
      if (a.type === "backend_detected" && s.kind === "detect_backend") {
        n.delete(a.request_id), t = R.Idle, s.resolve({
          selectedBackend: a.payload.selected_backend,
          availableBackends: a.payload.available_backends
        });
        return;
      }
      if (a.type === "assets_loaded" && s.kind === "load_assets") {
        n.delete(a.request_id), t = R.Idle, s.resolve({
          assetVersion: a.payload.asset_version,
          gridCount: a.payload.grid_count,
          stationCount: a.payload.station_count,
          bboxRender: a.payload.bbox_render
        });
        return;
      }
      if (a.type === "task_started" && s.kind === "start_task") {
        s.totalFrames = a.payload.total_frames, s.handlers?.onTaskStarted?.({
          taskId: a.payload.task_id,
          selectedBackend: a.payload.selected_backend,
          totalFrames: a.payload.total_frames
        });
        return;
      }
      if (a.type === "task_progress" && s.kind === "start_task") {
        s.lastCompletedFrames = a.payload.completed_frames, s.totalFrames = a.payload.total_frames, s.handlers?.onTaskProgress?.({
          taskId: a.payload.task_id,
          completedFrames: a.payload.completed_frames,
          totalFrames: a.payload.total_frames,
          currentFrameKey: a.payload.current_frame_key,
          phase: a.payload.phase
        });
        return;
      }
      if (a.type === "frame_ready" && s.kind === "start_task") {
        s.handlers?.onFrameReady?.({
          taskId: a.payload.task_id,
          frameKey: a.payload.frame_key,
          frameResult: a.payload.frame_result,
          renderedFrame: a.payload.rendered_frame ? {
            frameKey: a.payload.rendered_frame.frame_key,
            width: a.payload.rendered_frame.width,
            height: a.payload.rendered_frame.height,
            pixels: a.payload.rendered_frame.pixels
          } : void 0
        });
        return;
      }
      if (a.type === "task_completed" && s.kind === "start_task") {
        n.delete(a.request_id), t = R.Idle, s.resolve({
          taskId: a.payload.task_id,
          status: "completed",
          completedFrames: a.payload.completed_frames,
          totalFrames: a.payload.total_frames,
          elapsedMs: a.payload.elapsed_ms,
          metrics: a.payload.metrics
        });
        return;
      }
      if (a.type === "task_cancelled" && s.kind === "start_task") {
        n.delete(a.request_id), t = R.Idle, s.resolve({
          taskId: a.payload.task_id,
          status: "cancelled",
          completedFrames: a.payload.completed_frames ?? s.lastCompletedFrames,
          totalFrames: a.payload.total_frames ?? s.totalFrames
        });
        return;
      }
      if (a.type === "task_failed") {
        n.delete(a.request_id), t = R.Idle, s.reject(
          new de(
            $r(a.payload.error_code),
            a.payload.message,
            a.payload.details
          )
        );
        return;
      }
      s.reject(
        new de(
          Q.UnknownError,
          `Unsupported worker response: ${a.type}`
        )
      );
    }
  }, e.worker.onerror = () => {
    t = R.Idle;
    for (const [i, a] of n)
      a.reject(
        new de(
          Q.UnknownError,
          "Worker runtime error"
        )
      ), n.delete(i);
  }, {
    async detectBackend() {
      const i = {
        type: "detect_backend",
        request_id: r(),
        payload: {}
      };
      return t = R.Busy, new Promise((a, s) => {
        n.set(i.request_id, {
          kind: "detect_backend",
          resolve: a,
          reject: s
        }), e.worker.postMessage(i);
      });
    },
    async loadAssets(i) {
      const a = {
        type: "load_assets",
        request_id: r(),
        payload: i
      };
      return t = R.Busy, new Promise((s, c) => {
        n.set(a.request_id, {
          kind: "load_assets",
          resolve: s,
          reject: c
        }), e.worker.postMessage(a);
      });
    },
    async startTask(i, a) {
      const s = {
        type: "start_task",
        request_id: r(),
        payload: {
          task_id: i.taskId,
          rain_5m_sequence: i.rain5mSequence,
          accum_1h_sequence: i.accum1hSequence,
          preferred_backend: i.preferredBackend ?? "auto",
          algorithm_profile_version: i.algorithmProfileVersion,
          rain_mask_radius_config: i.rainMaskRadiusConfig ? {
            min_radius: i.rainMaskRadiusConfig.minRadius,
            max_radius: i.rainMaskRadiusConfig.maxRadius,
            hard_anchor_bonus: i.rainMaskRadiusConfig.hardAnchorBonus,
            expansion_offset: i.rainMaskRadiusConfig.expansionOffset
          } : void 0
        }
      };
      return t = R.Busy, new Promise((c, o) => {
        n.set(s.request_id, {
          kind: "start_task",
          resolve: c,
          reject: o,
          handlers: a,
          lastCompletedFrames: 0,
          totalFrames: 0
        }), e.worker.postMessage(s);
      });
    },
    cancelTask(i) {
      const a = {
        type: "cancel_task",
        request_id: r(),
        payload: {
          task_id: i
        }
      };
      e.worker.postMessage(a);
    },
    dispose() {
      t = R.Terminated, e.worker.terminate();
    },
    getStatus() {
      return t;
    }
  };
}
function pr() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
function $r(e) {
  return Object.values(Q).includes(e) ? e : Q.UnknownError;
}
function Wr(e) {
  const r = e.workerFactory(), n = qr({
    requestIdFactory: e.requestIdFactory,
    worker: r
  });
  return {
    client: n,
    dispose() {
      n.dispose();
    }
  };
}
const Kr = "/assets/worker-runtime-BrKoxus1.js";
function Ot(e = {}) {
  const r = Wr({
    requestIdFactory: e.requestIdFactory,
    workerFactory: e.workerFactory ?? Xr(e.workerScriptUrl)
  });
  return {
    detectBackend() {
      return r.client.detectBackend();
    },
    async loadAssetBundle(n) {
      return r.client.loadAssets(jr(n));
    },
    async loadAssetBundleFromDirectory(n) {
      const t = await Pr(n);
      return this.loadAssetBundle(t);
    },
    async loadAssetBundleFromZip(n) {
      const t = await Er(n);
      return this.loadAssetBundle(t);
    },
    loadRainPackageFromFiles(n) {
      return Or(n);
    },
    startTask(n, t) {
      return r.client.startTask(
        {
          taskId: n.taskId,
          rain5mSequence: Ge(n.dataPackage.rain5m),
          accum1hSequence: Ge(n.dataPackage.accum1h),
          preferredBackend: n.preferredBackend,
          algorithmProfileVersion: n.algorithmProfileVersion,
          rainMaskRadiusConfig: n.rainMaskRadiusConfig
        },
        t
      );
    },
    cancelTask(n) {
      r.client.cancelTask(n);
    },
    dispose() {
      r.dispose();
    },
    getStatus() {
      return r.client.getStatus();
    }
  };
}
function Xr(e) {
  return () => new Worker(e ?? new URL(Kr, import.meta.url), {
    type: "module"
  });
}
function jr(e) {
  const r = e.fixedAnchorStationIds;
  return {
    asset_manifest: e.manifest,
    grid_meta: {
      grid_id: e.gridMeta.gridId,
      row: e.gridMeta.row,
      col: e.gridMeta.col,
      center_x: e.gridMeta.centerX,
      center_y: e.gridMeta.centerY
    },
    grid_mask: e.gridMask,
    grid_neighbors: e.gridNeighbors,
    station_to_grid: e.stationToGrid,
    station_meta: {
      station_count: e.stationMeta.station_count,
      stations: e.stationMeta.stations.map((n) => {
        const t = r.has(String(n.station_id));
        return {
          ...n,
          is_fortress_anchor: t || n.is_fortress_anchor,
          is_tongzhou_anchor: t || n.is_tongzhou_anchor,
          is_cross_boundary_anchor: t || n.is_cross_boundary_anchor
        };
      })
    },
    fallback_neighbor_station_ids_by_station_id: Object.fromEntries(
      e.fallbackNeighborStationIdsByStationId
    )
  };
}
function Ge(e) {
  return {
    frameTimes: e.frameTimes,
    productType: e.productType,
    stationIds: e.stationIds,
    stationMetaById: {},
    values: e.values
  };
}
const ee = 0.1, zr = 8, Hr = 7, Xe = {
  legendId: $e.Legend5mV1,
  productType: V.Rain5m,
  bins: [
    M(0.1, 0.4, "#97F297", "#333333"),
    M(0.4, 1, "#3DCE3D", "#333333"),
    M(1, 2, "#6ACEF2", "#333333"),
    M(2, 5, "#1010F2", "#ffffff"),
    M(5, 10, "#F210F2", "#ffffff"),
    M(10, 15, "#A0103D", "#ffffff"),
    M(15, 20, "#f8aa0a", "#ffffff"),
    M(20, null, "#9933FF", "#ffffff")
  ]
}, je = {
  legendId: $e.LegendAccum24hV1,
  productType: V.Accum1hStep,
  bins: [
    M(0.1, 10, "#97F297", "#333333"),
    M(10, 25, "#3DCE3D", "#333333"),
    M(25, 50, "#6ACEF2", "#333333"),
    M(50, 100, "#1010F2", "#ffffff"),
    M(100, 250, "#A0103D", "#ffffff"),
    M(250, 400, "#f8aa0a", "#ffffff"),
    M(400, null, "#9933FF", "#ffffff")
  ]
}, Yr = {
  [V.Rain5m]: Xe,
  [V.Accum1hStep]: je
};
ze(Xe, zr);
ze(je, Hr);
function Jr(e) {
  return Yr[e];
}
function ge(e, r) {
  if (!Number.isFinite(r) || r < ee)
    return null;
  for (const n of e.bins) {
    const t = n.max === null && r >= n.min, i = n.max !== null && r >= n.min && r < n.max;
    if (t || i)
      return n;
  }
  return null;
}
function M(e, r, n, t) {
  return {
    min: e,
    max: r,
    color: n,
    textColor: t,
    label: r === null ? `${e}+` : `${e}~${r}`
  };
}
function ze(e, r) {
  if (e.bins.length !== r)
    throw new Error(
      `Legend ${e.legendId} bin count mismatch: expected ${r}, got ${e.bins.length}`
    );
}
function Zr(e) {
  return Jr(e).bins.map((r) => ({
    ...r,
    rgba: Qr(r.color)
  }));
}
function Qr(e) {
  const r = e.replace("#", ""), n = Number.parseInt(r.slice(0, 2), 16), t = Number.parseInt(r.slice(2, 4), 16), i = Number.parseInt(r.slice(4, 6), 16);
  return [n, t, i, 255];
}
function et(e) {
  const r = Te(e.gridMeta.col) + 1, n = Te(e.gridMeta.row) + 1, t = Math.max(1, Math.floor(e.pixelScale ?? 1)), i = (r - 1) * t + 1, a = (n - 1) * t + 1, s = new Uint8ClampedArray(i * a * 4), c = Zr(e.frameResult.frameType), o = rt(e.gridMeta, r, n), u = t > 1 ? _t({
    frameResult: {
      ...e.frameResult,
      rainMask: e.frameResult.rainMask
    },
    gridMeta: e.gridMeta,
    gridIndexByCell: o,
    legend: c
  }) : {
    valueGrid: e.frameResult.valueGrid,
    rainMask: e.frameResult.rainMask
  };
  for (let f = 0; f < a; f += 1)
    for (let l = 0; l < i; l += 1) {
      const d = tt({
        valueGrid: u.valueGrid,
        rainMask: u.rainMask,
        baseValueGrid: e.frameResult.valueGrid,
        baseRainMask: e.frameResult.rainMask,
        transitionValueGrid: u.transitionValueGrid,
        transitionMask: u.transitionMask,
        isolatedSpotCoreMask: u.isolatedSpotCoreMask,
        gridIndexByCell: o,
        sourceRow: f / t,
        sourceCol: l / t,
        legend: c,
        pixelScale: t
      }), g = P(c, d);
      if (g < 0)
        continue;
      const m = (f * i + l) * 4, h = c[g].rgba;
      s[m] = h[0], s[m + 1] = h[1], s[m + 2] = h[2], s[m + 3] = h[3];
    }
  return t > 1 && (nt({
    pixels: s,
    width: i,
    height: a,
    pixelScale: t,
    sourceWidth: r,
    sourceHeight: n,
    gridIndexByCell: o,
    rainMask: u.rainMask,
    valueGrid: u.valueGrid,
    isolatedSpotCoreMask: u.isolatedSpotCoreMask,
    legend: c,
    legendId: e.frameResult.legendId,
    frameType: e.frameResult.frameType
  }), it({
    pixels: s,
    width: i,
    height: a,
    pixelScale: t,
    sourceWidth: r,
    sourceHeight: n,
    valueGrid: e.frameResult.valueGrid,
    rainMask: e.frameResult.rainMask,
    gridIndexByCell: o,
    legend: c,
    legendId: e.frameResult.legendId,
    frameType: e.frameResult.frameType
  })), dt({
    pixels: s,
    width: i,
    height: a,
    pixelScale: t,
    gridMeta: e.gridMeta,
    renderBoundary: e.renderBoundary,
    gridResolutionM: e.gridResolutionM
  }), {
    frameKey: e.frameResult.frameKey,
    legendId: e.frameResult.legendId,
    width: i,
    height: a,
    pixels: s,
    getPixel(f) {
      const l = e.gridMeta.row[f], d = e.gridMeta.col[f], g = (l * t * i + d * t) * 4;
      return s.slice(g, g + 4);
    },
    queryGridValue(f, l) {
      const d = _(o, f, l);
      return d === void 0 || e.frameResult.rainMask[d] !== 1 ? null : e.frameResult.valueGrid[d];
    }
  };
}
function rt(e, r, n) {
  const t = new Int32Array(r * n);
  t.fill(-1);
  for (let i = 0; i < e.row.length; i += 1) {
    const a = e.row[i], s = e.col[i];
    a < 0 || a >= n || s < 0 || s >= r || (t[a * r + s] = i);
  }
  return {
    width: r,
    height: n,
    cells: t
  };
}
function _(e, r, n) {
  if (!Number.isInteger(r) || !Number.isInteger(n) || r < 0 || r >= e.height || n < 0 || n >= e.width)
    return;
  const t = e.cells[r * e.width + n];
  return t >= 0 ? t : void 0;
}
function tt(e) {
  const r = Number.isInteger(e.sourceRow) && Number.isInteger(e.sourceCol) ? _(e.gridIndexByCell, e.sourceRow, e.sourceCol) : void 0;
  return r !== void 0 ? e.pixelScale === 1 ? e.rainMask[r] === 1 ? e.valueGrid[r] : Number.NaN : e.rainMask[r] !== 1 || P(e.legend, e.valueGrid[r]) < 0 ? Number.NaN : e.isolatedSpotCoreMask?.[r] === 1 ? e.valueGrid[r] : ot(e) : He(e);
}
function nt(e) {
  for (let r = 0; r < e.sourceHeight; r += 1)
    for (let n = 0; n < e.sourceWidth; n += 1) {
      const t = _(e.gridIndexByCell, r, n);
      if (t === void 0 || e.rainMask[t] !== 1 || e.isolatedSpotCoreMask?.[t] === 1 || !ge(
        {
          legendId: e.legendId,
          productType: e.frameType,
          bins: e.legend
        },
        e.valueGrid[t]
      ))
        continue;
      const i = r * e.pixelScale, a = n * e.pixelScale, s = at({
        width: e.width,
        height: e.height,
        pixelRow: i,
        pixelCol: a
      });
      if (s === null)
        continue;
      const c = (i * e.width + a) * 4;
      if (e.pixels[s + 3] === 0) {
        const o = ge(
          {
            legendId: e.legendId,
            productType: e.frameType,
            bins: e.legend
          },
          e.valueGrid[t]
        );
        if (!o)
          continue;
        const f = e.legend.find((l) => l.color === o.color)?.rgba ?? [0, 0, 0, 0];
        e.pixels[c] = f[0], e.pixels[c + 1] = f[1], e.pixels[c + 2] = f[2], e.pixels[c + 3] = f[3];
        continue;
      }
      e.pixels[c] = e.pixels[s], e.pixels[c + 1] = e.pixels[s + 1], e.pixels[c + 2] = e.pixels[s + 2], e.pixels[c + 3] = e.pixels[s + 3];
    }
}
function at(e) {
  const r = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ];
  for (const [n, t] of r) {
    const i = e.pixelRow + n, a = e.pixelCol + t;
    if (!(i < 0 || i >= e.height || a < 0 || a >= e.width))
      return (i * e.width + a) * 4;
  }
  return null;
}
function it(e) {
  for (let r = 0; r < e.sourceHeight; r += 1)
    for (let n = 0; n < e.sourceWidth; n += 1) {
      const t = r * e.pixelScale, i = n * e.pixelScale, a = (t * e.width + i) * 4;
      if (e.pixels[a + 3] !== 0)
        continue;
      const s = _(e.gridIndexByCell, r, n), c = st({
        pixels: e.pixels,
        width: e.width,
        height: e.height,
        pixelRow: t,
        pixelCol: i,
        ownValue: s !== void 0 && e.rainMask[s] === 1 ? e.valueGrid[s] : Number.NaN,
        legend: e.legend
      });
      c && (e.pixels[a] = c[0], e.pixels[a + 1] = c[1], e.pixels[a + 2] = c[2], e.pixels[a + 3] = c[3]);
    }
}
function st(e) {
  const r = /* @__PURE__ */ new Map();
  let n = 0;
  for (let a = -1; a <= 1; a += 1)
    for (let s = -1; s <= 1; s += 1) {
      if (a === 0 && s === 0)
        continue;
      const c = e.pixelRow + a, o = e.pixelCol + s;
      if (c < 0 || c >= e.height || o < 0 || o >= e.width)
        continue;
      const u = (c * e.width + o) * 4, f = e.pixels[u + 3];
      if (f === 0)
        continue;
      const l = e.pixels[u], d = e.pixels[u + 1], g = e.pixels[u + 2];
      if (l === 0 && d === 0 && g === 0)
        continue;
      n += 1;
      const m = `${l},${d},${g},${f}`, h = r.get(m);
      if (h) {
        h.offsets.push([a, s]);
        continue;
      }
      r.set(m, {
        rgba: [l, d, g, f],
        offsets: [[a, s]]
      });
    }
  let t = null, i = 0;
  for (const a of r.values())
    lt(a.offsets) && a.offsets.length > i && (i = a.offsets.length, t = a.rgba);
  return i < 2 ? n < 2 ? null : ct(e) : t;
}
function ct(e) {
  const r = ge(
    {
      bins: e.legend
    },
    e.ownValue
  );
  return r ? e.legend.find((t) => t.color === r.color)?.rgba ?? null : null;
}
function lt(e) {
  for (let r = 0; r < e.length; r += 1)
    for (let n = r + 1; n < e.length; n += 1) {
      const [t, i] = e[r], [a, s] = e[n];
      if (Math.max(Math.abs(t - a), Math.abs(i - s)) <= 1)
        return !0;
    }
  return !1;
}
function ot(e) {
  const r = 1 / e.pixelScale, n = [
    [-r, -r],
    [-r, r],
    [r, -r],
    [r, r]
  ];
  let t = 0, i = 0;
  for (const [a, s] of n) {
    const c = He({
      ...e,
      sourceRow: e.sourceRow + a,
      sourceCol: e.sourceCol + s
    });
    Number.isFinite(c) && (t += c, i += 1);
  }
  return i > 0 ? t / i : Number.NaN;
}
function He(e) {
  const r = bt(e);
  if (Number.isFinite(r))
    return r;
  if (Ct(e))
    return Number.NaN;
  const n = Math.floor(e.sourceRow), t = Math.floor(e.sourceCol), i = Math.ceil(e.sourceRow), a = Math.ceil(e.sourceCol), s = e.sourceRow - n, c = e.sourceCol - t, o = [
    { row: n, col: t, weight: (1 - s) * (1 - c) },
    { row: n, col: a, weight: (1 - s) * c },
    { row: i, col: t, weight: s * (1 - c) },
    { row: i, col: a, weight: s * c }
  ];
  let u = Number.NEGATIVE_INFINITY, f = 0;
  const l = [], d = {
    weightedSum: 0,
    totalWeight: 0
  };
  let g = 0, m = 0;
  const h = /* @__PURE__ */ new Set();
  for (const w of o) {
    if (w.weight <= 0)
      continue;
    const x = _(e.gridIndexByCell, w.row, w.col);
    if (x === void 0)
      continue;
    const k = Je({
      gridIndex: x,
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      transitionValueGrid: e.transitionValueGrid,
      transitionMask: e.transitionMask
    });
    if (!Number.isFinite(k))
      continue;
    const K = e.rainMask[x] !== 1 && e.transitionMask?.[x] === 1, L = P(e.legend, k);
    l.push(L), k > u && (u = k), f += k * w.weight, K ? (g += k * w.weight, m += w.weight) : h.add(x), L > -1 && (d.weightedSum += k * w.weight, d.totalWeight += w.weight);
  }
  if (m > 0 && h.size <= 1)
    return g / m;
  if (!Number.isFinite(u))
    return Oe({
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      transitionValueGrid: e.transitionValueGrid,
      transitionMask: e.transitionMask,
      gridIndexByCell: e.gridIndexByCell,
      sourceRow: e.sourceRow,
      sourceCol: e.sourceCol,
      legend: e.legend,
      fallbackValue: Number.NaN
    });
  const I = Ze(l);
  if (I >= 0) {
    const w = Bt({
      corners: o,
      relativePeakBin: I,
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      gridIndexByCell: e.gridIndexByCell,
      legend: e.legend
    });
    if (Number.isFinite(w))
      return w;
  }
  const N = P(e.legend, u);
  return Qe(N, e.legend.length) ? u : Oe({
    valueGrid: e.valueGrid,
    rainMask: e.rainMask,
    transitionValueGrid: e.transitionValueGrid,
    transitionMask: e.transitionMask,
    gridIndexByCell: e.gridIndexByCell,
    sourceRow: e.sourceRow,
    sourceCol: e.sourceCol,
    legend: e.legend,
    fallbackValue: f
  });
}
function Te(e) {
  let r = -1;
  for (let n = 0; n < e.length; n += 1)
    e[n] > r && (r = e[n]);
  return r;
}
function dt(e) {
  if (!e.renderBoundary)
    return;
  const r = ut(e.gridMeta, e.gridResolutionM);
  if (r)
    for (const n of ft(e.renderBoundary))
      for (let t = 1; t < n.length; t += 1) {
        const i = Ee(n[t - 1], r, e.pixelScale), a = Ee(n[t], r, e.pixelScale);
        mt(e.pixels, e.width, e.height, i, a);
      }
}
function ut(e, r) {
  const n = Pe(
    e.centerX,
    e.col,
    e.row,
    r,
    "row"
  ), t = Pe(
    e.centerY,
    e.row,
    e.col,
    r ? -r : void 0,
    "col"
  );
  return !Number.isFinite(n) || !Number.isFinite(t) || n === 0 || t === 0 ? null : {
    originX: e.centerX[0] - (e.col[0] + 0.5) * n,
    originY: e.centerY[0] - (e.row[0] + 0.5) * t,
    colStep: n,
    rowStep: t
  };
}
function Pe(e, r, n, t, i) {
  for (let a = 0; a < e.length; a += 1)
    for (let s = a + 1; s < e.length; s += 1) {
      if (n[a] !== n[s])
        continue;
      const c = r[s] - r[a];
      if (c === 0)
        continue;
      const u = (e[s] - e[a]) / c;
      if (Number.isFinite(u) && u !== 0)
        return u;
    }
  return t !== void 0 ? t : i === "row" ? 1 : -1;
}
function ft(e) {
  const r = [], n = Array.isArray(e.features) ? e.features : [];
  for (const t of n) {
    const i = t.geometry;
    if (i) {
      if (i.type === "Polygon" && Array.isArray(i.coordinates)) {
        for (const a of i.coordinates)
          Array.isArray(a) && r.push(a);
        continue;
      }
      if (i.type === "MultiPolygon" && Array.isArray(i.coordinates)) {
        for (const a of i.coordinates)
          if (Array.isArray(a))
            for (const s of a)
              Array.isArray(s) && r.push(s);
      }
    }
  }
  return r;
}
function Ee(e, r, n) {
  const t = gt(e[0], e[1]), i = (t.x - r.originX) / r.colStep - 0.5, a = (t.y - r.originY) / r.rowStep - 0.5;
  return {
    x: Math.round(i * n),
    y: Math.round(a * n)
  };
}
function gt(e, r) {
  const t = Math.max(-85.05112878, Math.min(85.05112878, r)), i = Math.PI / 180;
  return {
    x: 6378137 * e * i,
    y: 6378137 * Math.log(Math.tan(Math.PI / 4 + t * i / 2))
  };
}
function mt(e, r, n, t, i) {
  let a = t.x, s = t.y;
  const c = Math.abs(i.x - t.x), o = Math.abs(i.y - t.y), u = t.x < i.x ? 1 : -1, f = t.y < i.y ? 1 : -1;
  let l = c - o;
  for (; ; ) {
    if (ht(e, r, n, a, s), a === i.x && s === i.y)
      return;
    const d = l * 2;
    d > -o && (l -= o, a += u), d < c && (l += c, s += f);
  }
}
function ht(e, r, n, t, i) {
  if (t < 0 || i < 0 || t >= r || i >= n)
    return;
  const a = (i * r + t) * 4;
  e[a] = 0, e[a + 1] = 0, e[a + 2] = 0, e[a + 3] = 255;
}
const yt = 2, z = yt + 1, wt = 1, he = 3, Z = 2, xt = 8, It = 4, kt = 64;
function _t(e) {
  const r = new Float32Array(e.frameResult.valueGrid), n = new Uint8Array(e.frameResult.rainMask), t = new Int16Array(r.length).fill(-1), i = new Uint8Array(r.length);
  for (let s = 0; s < r.length; s += 1)
    n[s] === 1 && (t[s] = P(e.legend, r[s]));
  for (let s = 0; s < r.length; s += 1) {
    const c = t[s];
    if (c < 0)
      continue;
    const o = e.gridMeta.row[s], u = e.gridMeta.col[s];
    c === Nt({
      row: o,
      col: u,
      radius: z,
      binIndexByGrid: t,
      gridIndexByCell: e.gridIndexByCell
    }) && (i[s] = 1);
  }
  for (let s = 0; s < r.length; s += 1) {
    if (i[s] !== 1)
      continue;
    const c = e.gridMeta.row[s], o = e.gridMeta.col[s], u = t[s];
    for (let f = -z; f <= z; f += 1)
      for (let l = -z; l <= z; l += 1) {
        if (f === 0 && l === 0 || Math.max(Math.abs(f), Math.abs(l)) < 2)
          continue;
        const d = _(e.gridIndexByCell, c + f, o + l);
        if (d === void 0 || d <= s || i[d] !== 1 || t[d] !== u)
          continue;
        const g = Math.max(r[s], r[d]), m = Gt({
          startRow: c,
          startCol: o,
          targetRow: c + f,
          targetCol: o + l,
          gridIndexByCell: e.gridIndexByCell
        });
        for (const h of m)
          g > r[h] && (r[h] = g), n[h] = 1;
      }
  }
  for (let s = 0; s < r.length; s += 1) {
    if (n[s] !== 1) {
      t[s] = -1;
      continue;
    }
    t[s] = P(e.legend, r[s]);
  }
  Rt({
    rainMask: n,
    hardAnchorMask: e.frameResult.hardAnchorMask,
    binIndexByGrid: t,
    gridMeta: e.gridMeta,
    gridIndexByCell: e.gridIndexByCell
  }), vt({
    rainMask: n,
    hardAnchorMask: e.frameResult.hardAnchorMask,
    softObsMask: e.frameResult.softObsMask,
    binIndexByGrid: t,
    gridMeta: e.gridMeta,
    gridIndexByCell: e.gridIndexByCell
  });
  const a = Mt({
    valueGrid: r,
    rainMask: n,
    gridMeta: e.gridMeta,
    gridIndexByCell: e.gridIndexByCell,
    legend: e.legend
  });
  return {
    valueGrid: r,
    rainMask: n,
    transitionValueGrid: a.valueGrid,
    transitionMask: a.rainMask,
    isolatedSpotCoreMask: a.isolatedSpotCoreMask
  };
}
function Mt(e) {
  const r = new Float32Array(e.valueGrid.length), n = new Uint8Array(e.valueGrid.length), t = new Uint8Array(e.valueGrid.length), i = new Uint8Array(e.rainMask.length);
  for (let a = 0; a < e.rainMask.length; a += 1) {
    if (i[a] === 1 || e.rainMask[a] !== 1)
      continue;
    const s = At({
      startGridIndex: a,
      visited: i,
      rainMask: e.rainMask,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    });
    if (!(s.length === 0 || s.length > he)) {
      if (s.length === 1) {
        t[s[0]] = 1;
        continue;
      }
      for (const c of s) {
        const o = e.gridMeta.row[c], u = e.gridMeta.col[c];
        for (let f = -1; f <= 1; f += 1)
          for (let l = -1; l <= 1; l += 1) {
            if (f === 0 && l === 0)
              continue;
            const d = _(e.gridIndexByCell, o + f, u + l);
            if (d === void 0 || e.rainMask[d] === 1)
              continue;
            const g = Ye({
              sourceValue: e.valueGrid[c],
              legend: e.legend,
              distance: Math.hypot(f, l)
            });
            Number.isFinite(g) && (n[d] !== 1 || g > r[d]) && (n[d] = 1, r[d] = g);
          }
      }
    }
  }
  return {
    valueGrid: r,
    rainMask: n,
    isolatedSpotCoreMask: t
  };
}
function vt(e) {
  const r = new Uint8Array(e.rainMask.length);
  for (let n = 0; n < e.rainMask.length; n += 1) {
    const t = e.binIndexByGrid[n];
    if (r[n] === 1 || e.rainMask[n] !== 1 || t < 0)
      continue;
    const i = er({
      startGridIndex: n,
      targetBinIndex: t,
      visited: r,
      rainMask: e.rainMask,
      binIndexByGrid: e.binIndexByGrid,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    });
    if (i.length <= he)
      continue;
    let a = 0;
    for (const c of i)
      (e.hardAnchorMask[c] === 1 || e.softObsMask[c] === 1) && (a += 1);
    if (a === 0)
      continue;
    const s = a <= xt ? It : kt;
    if (!(i.length < a * s))
      for (const c of i)
        e.hardAnchorMask[c] === 1 || e.softObsMask[c] === 1 || (e.rainMask[c] = 0, e.binIndexByGrid[c] = -1);
  }
}
function bt(e) {
  if (!e.isolatedSpotCoreMask)
    return Number.NaN;
  const r = Math.floor(e.sourceRow) - 1, n = Math.ceil(e.sourceRow) + 1, t = Math.floor(e.sourceCol) - 1, i = Math.ceil(e.sourceCol) + 1;
  let a = Number.NaN, s = Number.POSITIVE_INFINITY;
  for (let c = r; c <= n; c += 1)
    for (let o = t; o <= i; o += 1) {
      const u = _(e.gridIndexByCell, c, o);
      if (u === void 0 || e.isolatedSpotCoreMask[u] !== 1)
        continue;
      const f = Math.abs(e.sourceCol - o), l = Math.abs(e.sourceRow - c), d = f + l;
      if (d <= 0 || d > 0.75)
        continue;
      const g = Ye({
        sourceValue: e.valueGrid[u],
        legend: e.legend,
        distance: d
      });
      Number.isFinite(g) && (d < s || !Number.isFinite(a)) && (s = d, a = g);
    }
  return a;
}
function Ct(e) {
  if (!e.isolatedSpotCoreMask)
    return !1;
  const r = Math.floor(e.sourceRow) - 1, n = Math.ceil(e.sourceRow) + 1, t = Math.floor(e.sourceCol) - 1, i = Math.ceil(e.sourceCol) + 1;
  for (let a = r; a <= n; a += 1)
    for (let s = t; s <= i; s += 1) {
      const c = _(e.gridIndexByCell, a, s);
      if (c !== void 0 && e.isolatedSpotCoreMask[c] === 1)
        return !0;
    }
  return !1;
}
function At(e) {
  const r = [], n = [e.startGridIndex];
  for (e.visited[e.startGridIndex] = 1; n.length > 0; ) {
    const t = n.shift();
    if (t === void 0)
      continue;
    r.push(t);
    const i = e.gridMeta.row[t], a = e.gridMeta.col[t];
    for (let s = -1; s <= 1; s += 1)
      for (let c = -1; c <= 1; c += 1) {
        if (s === 0 && c === 0)
          continue;
        const o = _(e.gridIndexByCell, i + s, a + c);
        o === void 0 || e.visited[o] === 1 || e.rainMask[o] !== 1 || (e.visited[o] = 1, n.push(o));
      }
  }
  return r;
}
function Ye(e) {
  const r = P(e.legend, e.sourceValue);
  if (r < 0)
    return Number.NaN;
  if (r === 0)
    return Math.max(
      ee,
      (e.sourceValue + ee) / 2
    );
  const n = e.legend[r - 1];
  if (!n)
    return Number.NaN;
  const t = n.max === null ? n.min : (n.min + n.max) / 2, i = e.distance > 1 ? 0.85 : 1;
  return Math.min(e.sourceValue - Number.EPSILON, t * i);
}
function Je(e) {
  return e.rainMask[e.gridIndex] === 1 ? e.valueGrid[e.gridIndex] : e.transitionMask?.[e.gridIndex] === 1 && e.transitionValueGrid ? e.transitionValueGrid[e.gridIndex] : Number.NaN;
}
function P(e, r) {
  if (!Number.isFinite(r) || r < ee)
    return -1;
  for (let n = 0; n < e.length; n += 1) {
    const t = e[n], i = t.max === null && r >= t.min, a = t.max !== null && r >= t.min && r < t.max;
    if (i || a)
      return n;
  }
  return -1;
}
function Ze(e) {
  const r = Array.from(new Set(e.filter((n) => n >= 0))).sort(
    (n, t) => t - n
  );
  return r.length < 2 ? -1 : r[0] > r[1] ? r[0] : -1;
}
function Qe(e, r) {
  return e >= Math.floor(r / 2);
}
function Bt(e) {
  let r = 0, n = 0;
  for (const t of e.corners) {
    if (t.weight <= 0)
      continue;
    const i = _(e.gridIndexByCell, t.row, t.col);
    if (i === void 0 || e.rainMask[i] !== 1)
      continue;
    const a = e.valueGrid[i];
    P(e.legend, a) === e.relativePeakBin && (r += a * t.weight, n += t.weight);
  }
  return n <= 0 ? Number.NaN : r / n;
}
function Rt(e) {
  const r = new Uint8Array(e.rainMask.length);
  for (let n = 0; n < e.rainMask.length; n += 1) {
    const t = e.binIndexByGrid[n];
    if (r[n] === 1 || e.rainMask[n] !== 1 || t < 0 || t > wt)
      continue;
    const i = er({
      startGridIndex: n,
      targetBinIndex: t,
      visited: r,
      rainMask: e.rainMask,
      binIndexByGrid: e.binIndexByGrid,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    });
    if (!(i.length > he) && !(i.some((a) => e.hardAnchorMask[a] === 1) || Ft({
      patch: i,
      patchBinIndex: t,
      rainMask: e.rainMask,
      binIndexByGrid: e.binIndexByGrid,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    })))
      for (const a of i)
        e.rainMask[a] = 0, e.binIndexByGrid[a] = -1;
  }
}
function er(e) {
  const r = [], n = [e.startGridIndex];
  for (e.visited[e.startGridIndex] = 1; n.length > 0; ) {
    const t = n.shift();
    if (t === void 0)
      continue;
    r.push(t);
    const i = e.gridMeta.row[t], a = e.gridMeta.col[t];
    for (let s = -1; s <= 1; s += 1)
      for (let c = -1; c <= 1; c += 1) {
        if (s === 0 && c === 0)
          continue;
        const o = _(e.gridIndexByCell, i + s, a + c);
        o === void 0 || e.visited[o] === 1 || e.rainMask[o] !== 1 || e.binIndexByGrid[o] !== e.targetBinIndex || (e.visited[o] = 1, n.push(o));
      }
  }
  return r;
}
function Ft(e) {
  const r = new Set(e.patch);
  for (const n of e.patch) {
    const t = e.gridMeta.row[n], i = e.gridMeta.col[n];
    for (let a = -Z; a <= Z; a += 1)
      for (let s = -Z; s <= Z; s += 1) {
        if (a === 0 && s === 0)
          continue;
        const c = _(e.gridIndexByCell, t + a, i + s);
        if (!(c === void 0 || r.has(c) || e.rainMask[c] !== 1) && e.binIndexByGrid[c] >= e.patchBinIndex)
          return !0;
      }
  }
  return !1;
}
const St = 1;
function Oe(e) {
  const r = e.radius ?? St, n = r + 0.5, t = e.preservePeakBins ?? !0, i = Math.round(e.sourceRow), a = Math.round(e.sourceCol);
  let s = 0, c = 0, o = 0;
  const u = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), l = [];
  for (let d = -r; d <= r; d += 1)
    for (let g = -r; g <= r; g += 1) {
      const m = i + d, h = a + g, I = _(e.gridIndexByCell, m, h);
      if (I === void 0)
        continue;
      const N = Math.hypot(e.sourceRow - m, e.sourceCol - h), w = n - N;
      if (w <= 0)
        continue;
      c += w;
      const x = Je({
        gridIndex: I,
        valueGrid: e.valueGrid,
        rainMask: e.rainMask,
        transitionValueGrid: e.transitionValueGrid,
        transitionMask: e.transitionMask
      });
      if (!Number.isFinite(x))
        continue;
      const k = P(e.legend, x);
      l.push(k), s += x * w, o += w, u.set(k, (u.get(k) ?? 0) + x * w), f.set(k, (f.get(k) ?? 0) + w);
    }
  if (t) {
    const d = Ze(l);
    if (d >= 0) {
      const m = f.get(d) ?? 0;
      if (m > 0)
        return (u.get(d) ?? 0) / m;
    }
    const g = l.reduce(
      (m, h) => h > m ? h : m,
      -1
    );
    if (Qe(g, e.legend.length)) {
      const m = f.get(g) ?? 0;
      if (m > 0)
        return (u.get(g) ?? 0) / m;
    }
  }
  return c <= 0 || o <= 0 ? e.fallbackValue : e.normalizeByRainyWeight ? s / o : s / c;
}
function Nt(e) {
  let r = -1;
  for (let n = -3; n <= e.radius; n += 1)
    for (let t = -3; t <= e.radius; t += 1) {
      const i = _(e.gridIndexByCell, e.row + n, e.col + t);
      if (i === void 0)
        continue;
      const a = e.binIndexByGrid[i];
      a > r && (r = a);
    }
  return r;
}
function Gt(e) {
  const r = [];
  let n = e.startRow, t = e.startCol;
  for (; ; ) {
    const i = e.targetRow - n, a = e.targetCol - t;
    if (i === 0 && a === 0 || (n += Math.sign(i), t += Math.sign(a), n === e.targetRow && t === e.targetCol))
      return r;
    const s = _(e.gridIndexByCell, n, t);
    if (s === void 0)
      return [];
    r.push(s);
  }
}
function Tt(e) {
  const r = et({
    frameResult: e.frame,
    gridMeta: e.assets.gridMeta,
    renderBoundary: e.assets.renderBoundary,
    gridResolutionM: e.assets.manifest.grid_resolution_m,
    pixelScale: e.pixelScale ?? 1
  });
  return {
    width: r.width,
    height: r.height,
    frameKey: r.frameKey,
    imageData: new ImageData(r.pixels, r.width, r.height)
  };
}
function Pt(e) {
  const r = e.canvas.getContext("2d");
  if (!r)
    throw new Error("2d canvas context is not available");
  return e.canvas.width = e.renderedFrame.width, e.canvas.height = e.renderedFrame.height, r.putImageData(e.renderedFrame.imageData, 0, 0), {
    width: e.renderedFrame.width,
    height: e.renderedFrame.height,
    frameKey: e.renderedFrame.frameKey
  };
}
function Vt(e) {
  const r = Tt(e);
  return Pt({
    renderedFrame: r,
    canvas: e.canvas
  });
}
export {
  Ot as createRainIsoBrowserSession,
  Et as createTimelinePlayer,
  Pt as drawRenderedFrameToCanvas,
  Pr as loadAssetBundleFromDirectory,
  Er as loadAssetBundleFromZip,
  Or as loadRainPackageFromFiles,
  Vt as renderFrameToCanvas,
  Tt as renderFrameToImageData
};
