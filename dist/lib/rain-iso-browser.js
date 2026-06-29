var M = Uint8Array, $ = Uint16Array, rr = Int32Array, Ee = new M([
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
]), Pe = new M([
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
]), tr = new M([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), Ge = function(e, r) {
  for (var t = new $(31), n = 0; n < 31; ++n)
    t[n] = r += 1 << e[n - 1];
  for (var i = new rr(t[30]), n = 1; n < 30; ++n)
    for (var a = t[n]; a < t[n + 1]; ++a)
      i[a] = a - t[n] << 5 | n;
  return { b: t, r: i };
}, Oe = Ge(Ee, 2), De = Oe.b, nr = Oe.r;
De[28] = 258, nr[258] = 28;
var ar = Ge(Pe, 0), ir = ar.b, de = new $(32768);
for (var y = 0; y < 32768; ++y) {
  var P = (y & 43690) >> 1 | (y & 21845) << 1;
  P = (P & 52428) >> 2 | (P & 13107) << 2, P = (P & 61680) >> 4 | (P & 3855) << 4, de[y] = ((P & 65280) >> 8 | (P & 255) << 8) >> 1;
}
var z = (function(e, r, t) {
  for (var n = e.length, i = 0, a = new $(r); i < n; ++i)
    e[i] && ++a[e[i] - 1];
  var s = new $(r);
  for (i = 1; i < r; ++i)
    s[i] = s[i - 1] + a[i - 1] << 1;
  var c;
  if (t) {
    c = new $(1 << r);
    var l = 15 - r;
    for (i = 0; i < n; ++i)
      if (e[i])
        for (var d = i << 4 | e[i], f = r - e[i], o = s[e[i] - 1]++ << f, u = o | (1 << f) - 1; o <= u; ++o)
          c[de[o] >> l] = d;
  } else
    for (c = new $(n), i = 0; i < n; ++i)
      e[i] && (c[i] = de[s[e[i] - 1]++] >> 15 - e[i]);
  return c;
}), X = new M(288);
for (var y = 0; y < 144; ++y)
  X[y] = 8;
for (var y = 144; y < 256; ++y)
  X[y] = 9;
for (var y = 256; y < 280; ++y)
  X[y] = 7;
for (var y = 280; y < 288; ++y)
  X[y] = 8;
var Le = new M(32);
for (var y = 0; y < 32; ++y)
  Le[y] = 5;
var sr = /* @__PURE__ */ z(X, 9, 1), or = /* @__PURE__ */ z(Le, 5, 1), ae = function(e) {
  for (var r = e[0], t = 1; t < e.length; ++t)
    e[t] > r && (r = e[t]);
  return r;
}, F = function(e, r, t) {
  var n = r / 8 | 0;
  return (e[n] | e[n + 1] << 8) >> (r & 7) & t;
}, ie = function(e, r) {
  var t = r / 8 | 0;
  return (e[t] | e[t + 1] << 8 | e[t + 2] << 16) >> (r & 7);
}, cr = function(e) {
  return (e + 7) / 8 | 0;
}, fe = function(e, r, t) {
  return (r == null || r < 0) && (r = 0), (t == null || t > e.length) && (t = e.length), new M(e.subarray(r, t));
}, lr = [
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
], k = function(e, r, t) {
  var n = new Error(r || lr[e]);
  if (n.code = e, Error.captureStackTrace && Error.captureStackTrace(n, k), !t)
    throw n;
  return n;
}, dr = function(e, r, t, n) {
  var i = e.length, a = n ? n.length : 0;
  if (!i || r.f && !r.l)
    return t || new M(0);
  var s = !t, c = s || r.i != 2, l = r.i;
  s && (t = new M(i * 3));
  var d = function(ve) {
    var ke = t.length;
    if (ve > ke) {
      var Me = new M(Math.max(ke * 2, ve));
      Me.set(t), t = Me;
    }
  }, f = r.f || 0, o = r.p || 0, u = r.b || 0, m = r.l, g = r.d, h = r.m, w = r.n, _ = i * 8;
  do {
    if (!m) {
      f = F(e, o, 1);
      var x = F(e, o + 1, 3);
      if (o += 3, x)
        if (x == 1)
          m = sr, g = or, h = 9, w = 5;
        else if (x == 2) {
          var Q = F(e, o, 31) + 257, ge = F(e, o + 10, 15) + 4, me = Q + F(e, o + 5, 31) + 1;
          o += 14;
          for (var W = new M(me), ee = new M(19), A = 0; A < ge; ++A)
            ee[tr[A]] = F(e, o + A * 3, 7);
          o += ge * 3;
          for (var he = ae(ee), He = (1 << he) - 1, Je = z(ee, he, 1), A = 0; A < me; ) {
            var ye = Je[F(e, o, He)];
            o += ye & 15;
            var v = ye >> 4;
            if (v < 16)
              W[A++] = v;
            else {
              var L = 0, Y = 0;
              for (v == 16 ? (Y = 3 + F(e, o, 3), o += 2, L = W[A - 1]) : v == 17 ? (Y = 3 + F(e, o, 7), o += 3) : v == 18 && (Y = 11 + F(e, o, 127), o += 7); Y--; )
                W[A++] = L;
            }
          }
          var we = W.subarray(0, Q), E = W.subarray(Q);
          h = ae(we), w = ae(E), m = z(we, h, 1), g = z(E, w, 1);
        } else
          k(1);
      else {
        var v = cr(o) + 4, T = e[v - 4] | e[v - 3] << 8, Z = v + T;
        if (Z > i) {
          l && k(0);
          break;
        }
        c && d(u + T), t.set(e.subarray(v, Z), u), r.b = u += T, r.p = o = Z * 8, r.f = f;
        continue;
      }
      if (o > _) {
        l && k(0);
        break;
      }
    }
    c && d(u + 131072);
    for (var Ze = (1 << h) - 1, Qe = (1 << w) - 1, re = o; ; re = o) {
      var L = m[ie(e, o) & Ze], q = L >> 4;
      if (o += L & 15, o > _) {
        l && k(0);
        break;
      }
      if (L || k(2), q < 256)
        t[u++] = q;
      else if (q == 256) {
        re = o, m = null;
        break;
      } else {
        var _e = q - 254;
        if (q > 264) {
          var A = q - 257, j = Ee[A];
          _e = F(e, o, (1 << j) - 1) + De[A], o += j;
        }
        var te = g[ie(e, o) & Qe], ne = te >> 4;
        te || k(3), o += te & 15;
        var E = ir[ne];
        if (ne > 3) {
          var j = Pe[ne];
          E += ie(e, o) & (1 << j) - 1, o += j;
        }
        if (o > _) {
          l && k(0);
          break;
        }
        c && d(u + 131072);
        var Ie = u + _e;
        if (u < E) {
          var xe = a - E, er = Math.min(E, Ie);
          for (xe + u < 0 && k(3); u < er; ++u)
            t[u] = n[xe + u];
        }
        for (; u < Ie; ++u)
          t[u] = t[u - E];
      }
    }
    r.l = m, r.p = re, r.b = u, r.f = f, m && (f = 1, r.m = h, r.d = g, r.n = w);
  } while (!f);
  return u != t.length && s ? fe(t, 0, u) : t.subarray(0, u);
}, ur = /* @__PURE__ */ new M(0), S = function(e, r) {
  return e[r] | e[r + 1] << 8;
}, B = function(e, r) {
  return (e[r] | e[r + 1] << 8 | e[r + 2] << 16 | e[r + 3] << 24) >>> 0;
}, se = function(e, r) {
  return B(e, r) + B(e, r + 4) * 4294967296;
};
function fr(e, r) {
  return dr(e, { i: 2 }, r && r.out, r && r.dictionary);
}
var ue = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), gr = 0;
try {
  ue.decode(ur, { stream: !0 }), gr = 1;
} catch {
}
var mr = function(e) {
  for (var r = "", t = 0; ; ) {
    var n = e[t++], i = (n > 127) + (n > 223) + (n > 239);
    if (t + i > e.length)
      return { s: r, r: fe(e, t - 1) };
    i ? i == 3 ? (n = ((n & 15) << 18 | (e[t++] & 63) << 12 | (e[t++] & 63) << 6 | e[t++] & 63) - 65536, r += String.fromCharCode(55296 | n >> 10, 56320 | n & 1023)) : i & 1 ? r += String.fromCharCode((n & 31) << 6 | e[t++] & 63) : r += String.fromCharCode((n & 15) << 12 | (e[t++] & 63) << 6 | e[t++] & 63) : r += String.fromCharCode(n);
  }
};
function hr(e, r) {
  if (r) {
    for (var t = "", n = 0; n < e.length; n += 16384)
      t += String.fromCharCode.apply(null, e.subarray(n, n + 16384));
    return t;
  } else {
    if (ue)
      return ue.decode(e);
    var i = mr(e), a = i.s, t = i.r;
    return t.length && k(8), a;
  }
}
var yr = function(e, r) {
  return r + 30 + S(e, r + 26) + S(e, r + 28);
}, wr = function(e, r, t) {
  var n = S(e, r + 28), i = S(e, r + 30), a = hr(e.subarray(r + 46, r + 46 + n), !(S(e, r + 8) & 2048)), s = r + 46 + n, c = _r(e, s, i, t, B(e, r + 20), B(e, r + 24), B(e, r + 42)), l = c[0], d = c[1], f = c[2];
  return [S(e, r + 10), l, d, a, s + i + S(e, r + 32), f];
}, _r = function(e, r, t, n, i, a, s) {
  var c = i == 4294967295, l = a == 4294967295, d = s == 4294967295, f = r + t, o = c + l + d;
  if (n && o) {
    for (; r + 4 < f; r += 4 + S(e, r + 2))
      if (S(e, r) == 1)
        return [
          c ? se(e, r + 4 + 8 * l) : i,
          l ? se(e, r + 4) : a,
          d ? se(e, r + 4 + 8 * (l + c)) : s,
          1
        ];
    n < 2 && k(13);
  }
  return [i, a, s, 0];
};
function Ir(e, r) {
  for (var t = {}, n = e.length - 22; B(e, n) != 101010256; --n)
    (!n || e.length - n > 65558) && k(13);
  var i = S(e, n + 8);
  if (!i)
    return {};
  var a = B(e, n + 16), s = B(e, n - 20) == 117853008;
  if (s) {
    var c = B(e, n - 12);
    s = B(e, c) == 101075792, s && (i = B(e, c + 32), a = B(e, c + 48));
  }
  for (var l = 0; l < i; ++l) {
    var d = wr(e, a, s), f = d[0], o = d[1], u = d[2], m = d[3], g = d[4], h = d[5], w = yr(e, h);
    a = g, f ? f == 8 ? t[m] = fr(e.subarray(w, w + o), { out: new M(u) }) : k(14, "unknown compression type " + f) : t[m] = fe(e, w, w + o);
  }
  return t;
}
const xr = "RTA1";
function oe(e) {
  const r = kr(e), t = new DataView(
    r.buffer,
    r.byteOffset,
    r.byteLength
  ), n = new TextDecoder().decode(r.subarray(0, 4));
  if (n !== xr)
    throw new Error(`Unsupported typed array binary magic: ${n}`);
  const i = t.getUint32(4, !0), a = 8, s = a + i, c = JSON.parse(
    new TextDecoder().decode(r.subarray(a, s))
  ), l = {}, d = s;
  for (const f of c.fields) {
    const o = r.slice(
      d + f.byteOffset,
      d + f.byteOffset + f.byteLength
    );
    l[f.name] = vr(f.type, o.buffer, f.length);
  }
  return l;
}
function vr(e, r, t) {
  switch (e) {
    case "Int32Array":
      return new Int32Array(r.slice(0), 0, t);
    case "Float32Array":
      return new Float32Array(r.slice(0), 0, t);
    case "Uint8Array":
      return new Uint8Array(r.slice(0), 0, t);
  }
}
function kr(e) {
  return e instanceof Uint8Array ? e : new Uint8Array(e);
}
class C extends Error {
  code = "ASSET_VALIDATION_FAILED";
  constructor(r) {
    super(r), this.name = "AssetValidationError";
  }
}
function Mr(e, r = {}) {
  const { manifest: t, gridMeta: n, gridMask: i, gridNeighbors: a, stationMeta: s, stationToGrid: c } = e;
  if (!t.asset_version)
    throw new C("asset_version is required");
  if (r.expectedAssetVersion && t.asset_version !== r.expectedAssetVersion)
    throw new C(
      `asset_version mismatch: expected ${r.expectedAssetVersion}, got ${t.asset_version}`
    );
  if (t.grid_rows * t.grid_cols < t.grid_count)
    throw new C("grid_rows * grid_cols must cover grid_count");
  if (i.length !== t.grid_count)
    throw new C("grid_mask length mismatch");
  if (a.length !== t.grid_count * 8)
    throw new C("grid_neighbors length mismatch");
  if (s.station_count !== c.length)
    throw new C("station_meta and station_to_grid length mismatch");
  if (n.gridId.length !== t.grid_count || n.row.length !== t.grid_count || n.col.length !== t.grid_count || n.centerX.length !== t.grid_count || n.centerY.length !== t.grid_count)
    throw new C("grid_meta column length mismatch");
}
function Ar(e) {
  const r = oe(e.gridMetaBytes), t = oe(e.gridNeighborsBytes), n = oe(e.stationToGridBytes), i = JSON.parse(
    new TextDecoder().decode(e.stationMetaBytes)
  ), a = JSON.parse(
    new TextDecoder().decode(e.renderBoundaryBytes)
  ), s = new Set(
    i.stations.map((l) => String(l.station_id))
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
    gridNeighbors: t.neighbors,
    stationToGrid: n.grid_id,
    stationMeta: i,
    renderBoundary: a,
    fixedAnchorStationIds: new Set(
      e.fixedAnchorDictionary.stations.map((l) => l.station_id).filter((l) => s.has(l))
    ),
    fallbackNeighborStationIdsByStationId: Br(
      e.stationNeighborRelations,
      s
    )
  };
  return Mr(c, {
    expectedAssetVersion: e.expectedAssetVersion
  }), c;
}
function Br(e, r) {
  const t = /* @__PURE__ */ new Map();
  for (const n of e.relations) {
    if (!r.has(n.station_id))
      continue;
    const i = n.fallback_nearest_neighbors.map((a) => a.station_id).filter((a) => r.has(a));
    t.set(n.station_id, i);
  }
  return t;
}
async function U(e, r, t) {
  const n = new Uint8Array(r.byteLength);
  n.set(r);
  const i = await crypto.subtle.digest(
    "SHA-256",
    n.buffer
  ), a = `sha256:${Array.from(new Uint8Array(i)).map((s) => s.toString(16).padStart(2, "0")).join("")}`;
  if (a !== t)
    throw new C(
      `${e} checksum mismatch: expected ${t}, got ${a}`
    );
}
const G = {
  Rain5m: "rain_5m",
  Accum1hStep: "accum_1h_step"
}, qe = {
  Legend5mV1: "legend_5m_v1",
  LegendAccum24hV1: "legend_accum_24h_v1"
};
function br(e, r) {
  const t = Object.keys(e.data).map(Ae).sort(), n = /* @__PURE__ */ new Map();
  for (const [l, d] of Object.entries(e.data))
    n.set(Ae(l), d);
  const i = {}, a = Array.from(
    new Set(
      Object.values(e.data).flat().map((l) => l.stcd)
    )
  ).sort();
  for (const l of Object.values(e.data))
    for (const d of l)
      i[d.stcd] || (i[d.stcd] = d);
  const s = new Float32Array(t.length * a.length);
  s.fill(Number.NaN);
  const c = new Map(
    a.map((l, d) => [l, d])
  );
  return t.forEach((l, d) => {
    const f = n.get(l) ?? [];
    for (const o of f) {
      const u = c.get(o.stcd);
      u !== void 0 && (s[d * a.length + u] = o.drp);
    }
  }), {
    frameTimes: t,
    productType: r.productType,
    stationIds: a,
    stationMetaById: i,
    values: s
  };
}
function Ae(e) {
  const [r, t] = e.split(" ");
  return `${r}T${t}+08:00`;
}
class N extends Error {
  code = "PACKAGE_VALIDATION_FAILED";
  constructor(r) {
    super(r), this.name = "PackageValidationError";
  }
}
function Fr(e, r) {
  if (e.code !== "0")
    throw new N(
      `${r.expectedProductType} response code must be 0`
    );
  const t = Object.keys(e.data ?? {});
  if (t.length === 0)
    throw new N(
      `${r.expectedProductType} response must contain at least one frame`
    );
  const n = new Set(
    (e.data[t[0]] ?? []).map((i) => i.stcd)
  );
  if (n.size === 0)
    throw new N(
      `${r.expectedProductType} response must contain at least one station`
    );
  for (const i of t.slice(1)) {
    const a = new Set(
      (e.data[i] ?? []).map((s) => s.stcd)
    );
    if (a.size !== n.size)
      throw new N(
        `${r.expectedProductType} station count mismatch across frames`
      );
    for (const s of n)
      if (!a.has(s))
        throw new N(
          `${r.expectedProductType} station set mismatch across frames`
        );
  }
}
function Rr(e) {
  if (e.rain5m.stationIds.join("|") !== e.accum1h.stationIds.join("|"))
    throw new N("5 分钟和 1 小时接口的站点集合不一致");
  Be(e.rain5m.frameTimes, 5, "5 分钟"), Be(e.accum1h.frameTimes, 60, "1 小时");
}
function Be(e, r, t) {
  for (let n = 1; n < e.length; n += 1) {
    const i = Date.parse(e[n - 1]);
    if (Date.parse(e[n]) - i !== r * 60 * 1e3)
      throw new N(`${t}序列时间步长不正确`);
  }
}
async function Cr(e) {
  const r = await ("directoryHandle" in e ? await pr(e.directoryHandle) : Nr(e.files));
  return Ue(r);
}
async function Sr(e) {
  const r = Ir(new Uint8Array(await e.arrayBuffer())), t = /* @__PURE__ */ new Map();
  for (const [n, i] of Object.entries(r))
    n.endsWith("/") || t.set(D(n), i);
  return Ue(t);
}
async function Tr(e) {
  const r = e.realtime5mFile ? Fe(await be(e.realtime5mFile), G.Rain5m) : null, t = e.realtime1hFile ? Fe(await be(e.realtime1hFile), G.Accum1hStep) : null;
  if (!r && !t)
    throw new N("请至少导入一个 JSON 文件");
  const n = r?.stationIds ?? t?.stationIds ?? [], i = r ?? Re(G.Rain5m, n), a = t ?? Re(G.Accum1hStep, n), s = {
    stationIds: n,
    rain5m: i,
    accum1h: a
  };
  return Rr(s), s;
}
async function Ue(e) {
  const r = ce(e, "asset_manifest.json"), t = p(e, r), n = JSON.parse(new TextDecoder().decode(t)), i = Pr(r), a = V(i, n.files.grid_meta), s = V(i, n.files.grid_mask), c = V(i, n.files.grid_neighbors), l = V(i, n.files.station_to_grid), d = V(i, n.files.station_meta), f = V(i, n.files.render_boundary), o = p(e, a), u = p(e, s), m = p(e, c), g = p(e, l), h = p(e, d), w = p(e, f);
  await U(n.files.grid_meta, o, n.checksums.grid_meta), await U(n.files.grid_mask, u, n.checksums.grid_mask), await U(
    n.files.grid_neighbors,
    m,
    n.checksums.grid_neighbors
  ), await U(
    n.files.station_to_grid,
    g,
    n.checksums.station_to_grid
  ), await U(
    n.files.station_meta,
    h,
    n.checksums.station_meta
  ), await U(
    n.files.render_boundary,
    w,
    n.checksums.render_boundary
  );
  const _ = ce(
    e,
    "fixed_anchor_stations.json"
  ), x = ce(
    e,
    "station_neighbor_relations_5km.json"
  );
  return Ar({
    manifest: n,
    gridMetaBytes: o,
    gridMaskBytes: u,
    gridNeighborsBytes: m,
    stationToGridBytes: g,
    stationMetaBytes: h,
    renderBoundaryBytes: w,
    fixedAnchorDictionary: JSON.parse(
      new TextDecoder().decode(p(e, _))
    ),
    stationNeighborRelations: JSON.parse(
      new TextDecoder().decode(p(e, x))
    )
  });
}
async function pr(e) {
  const r = /* @__PURE__ */ new Map();
  return await Ve(e, "", r), r;
}
async function Ve(e, r, t) {
  for await (const [n, i] of e.entries()) {
    const a = r ? `${r}/${n}` : n;
    if (i.kind === "directory") {
      await Ve(i, a, t);
      continue;
    }
    t.set(
      D(a),
      new Uint8Array(
        await (await i.getFile()).arrayBuffer()
      )
    );
  }
}
function Nr(e) {
  const r = /* @__PURE__ */ new Map(), t = [];
  for (const n of e) {
    const i = Er(n);
    t.push(
      n.arrayBuffer().then((a) => {
        r.set(D(i), new Uint8Array(a));
      })
    );
  }
  return Promise.all(t).then(() => r);
}
async function be(e) {
  try {
    return JSON.parse(await e.text());
  } catch (r) {
    throw new N(
      r instanceof Error ? r.message : "无法读取原始接口文件"
    );
  }
}
function Fe(e, r) {
  return Fr(e, {
    expectedProductType: r
  }), br(e, {
    productType: r
  });
}
function Re(e, r) {
  return {
    frameTimes: [],
    productType: e,
    stationIds: r,
    stationMetaById: {},
    values: new Float32Array(0)
  };
}
function p(e, r) {
  const t = e.get(D(r));
  if (!t)
    throw new C(`缺少文件: ${r}`);
  return t;
}
function ce(e, r) {
  const t = Array.from(e.keys()).filter(
    (n) => n.split("/").at(-1) === r
  );
  if (t.length !== 1)
    throw new C(`无法唯一定位文件: ${r}`);
  return t[0];
}
function Er(e) {
  const r = e.webkitRelativePath || e.name;
  return D(r);
}
function D(e) {
  return e.replace(/\\/g, "/").replace(/^\/+/, "");
}
function Pr(e) {
  const r = D(e), t = r.lastIndexOf("/");
  return t >= 0 ? r.slice(0, t) : "";
}
function V(e, r) {
  return D([e, r].filter(Boolean).join("/"));
}
function xt(e = {}) {
  const r = e.intervalMs ?? 500, t = {
    frames: [...e.frames ?? []],
    currentIndex: 0,
    currentFrame: e.frames?.[0] ?? null,
    isPlaying: !1
  };
  let n = null;
  const i = /* @__PURE__ */ new Set(), a = () => {
    const l = {
      frames: [...t.frames],
      currentIndex: t.currentIndex,
      currentFrame: t.currentFrame,
      isPlaying: t.isPlaying
    };
    for (const d of i)
      d(l);
  }, s = () => (t.currentFrame = t.frames[t.currentIndex] ?? null, a(), t.currentFrame), c = () => {
    n !== null && (clearInterval(n), n = null);
  };
  return {
    getState() {
      return {
        frames: [...t.frames],
        currentIndex: t.currentIndex,
        currentFrame: t.currentFrame,
        isPlaying: t.isPlaying
      };
    },
    subscribe(l) {
      return i.add(l), l(this.getState()), () => {
        i.delete(l);
      };
    },
    setFrames(l) {
      const d = [...l], f = t.currentFrame?.frameKey;
      if (t.frames = d, d.length === 0) {
        t.currentIndex = 0, t.currentFrame = null, a();
        return;
      }
      const o = f == null ? -1 : d.findIndex((u) => u.frameKey === f);
      t.currentIndex = o >= 0 ? o : Math.min(t.currentIndex, d.length - 1), s();
    },
    selectFrame(l) {
      return t.frames.length === 0 ? (t.currentIndex = 0, t.currentFrame = null, a(), null) : (t.currentIndex = Math.max(0, Math.min(l, t.frames.length - 1)), s());
    },
    selectFrameByKey(l) {
      const d = t.frames.findIndex((f) => f.frameKey === l);
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
    play() {
      if (t.isPlaying || t.frames.length <= 1) {
        t.isPlaying = t.frames.length > 1, a();
        return;
      }
      t.isPlaying = !0, a(), n = setInterval(() => {
        this.next();
      }, r);
    },
    pause() {
      t.isPlaying = !1, c(), a();
    },
    dispose() {
      t.isPlaying = !1, c(), t.frames = [], t.currentIndex = 0, t.currentFrame = null, a(), i.clear();
    }
  };
}
const R = {
  Idle: "idle",
  Busy: "busy",
  Terminated: "terminated"
}, J = {
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
class le extends Error {
  code;
  details;
  constructor(r, t, n) {
    super(t), this.name = "RainIsoError", this.code = r, this.details = n;
  }
}
function Gr(e) {
  const r = e.requestIdFactory ?? Or, t = /* @__PURE__ */ new Map();
  let n = R.Idle;
  return e.worker.onmessage = (i) => {
    const a = i.data, s = t.get(a.request_id);
    if (s) {
      if (a.type === "backend_detected" && s.kind === "detect_backend") {
        t.delete(a.request_id), n = R.Idle, s.resolve({
          selectedBackend: a.payload.selected_backend,
          availableBackends: a.payload.available_backends
        });
        return;
      }
      if (a.type === "assets_loaded" && s.kind === "load_assets") {
        t.delete(a.request_id), n = R.Idle, s.resolve({
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
          frameResult: a.payload.frame_result
        });
        return;
      }
      if (a.type === "task_completed" && s.kind === "start_task") {
        t.delete(a.request_id), n = R.Idle, s.resolve({
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
        t.delete(a.request_id), n = R.Idle, s.resolve({
          taskId: a.payload.task_id,
          status: "cancelled",
          completedFrames: a.payload.completed_frames ?? s.lastCompletedFrames,
          totalFrames: a.payload.total_frames ?? s.totalFrames
        });
        return;
      }
      if (a.type === "task_failed") {
        t.delete(a.request_id), n = R.Idle, s.reject(
          new le(
            Dr(a.payload.error_code),
            a.payload.message,
            a.payload.details
          )
        );
        return;
      }
      s.reject(
        new le(
          J.UnknownError,
          `Unsupported worker response: ${a.type}`
        )
      );
    }
  }, e.worker.onerror = () => {
    n = R.Idle;
    for (const [i, a] of t)
      a.reject(
        new le(
          J.UnknownError,
          "Worker runtime error"
        )
      ), t.delete(i);
  }, {
    async detectBackend() {
      const i = {
        type: "detect_backend",
        request_id: r(),
        payload: {}
      };
      return n = R.Busy, new Promise((a, s) => {
        t.set(i.request_id, {
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
      return n = R.Busy, new Promise((s, c) => {
        t.set(a.request_id, {
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
      return n = R.Busy, new Promise((c, l) => {
        t.set(s.request_id, {
          kind: "start_task",
          resolve: c,
          reject: l,
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
      n = R.Terminated, e.worker.terminate();
    },
    getStatus() {
      return n;
    }
  };
}
function Or() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
function Dr(e) {
  return Object.values(J).includes(e) ? e : J.UnknownError;
}
function Lr(e) {
  const r = e.workerFactory(), t = Gr({
    requestIdFactory: e.requestIdFactory,
    worker: r
  });
  return {
    client: t,
    dispose() {
      t.dispose();
    }
  };
}
const qr = "/assets/worker-runtime-CZ3_3q_Y.js";
function vt(e = {}) {
  const r = Lr({
    requestIdFactory: e.requestIdFactory,
    workerFactory: e.workerFactory ?? Ur(e.workerScriptUrl)
  });
  return {
    detectBackend() {
      return r.client.detectBackend();
    },
    async loadAssetBundle(t) {
      return r.client.loadAssets(Vr(t));
    },
    async loadAssetBundleFromDirectory(t) {
      const n = await Cr(t);
      return this.loadAssetBundle(n);
    },
    async loadAssetBundleFromZip(t) {
      const n = await Sr(t);
      return this.loadAssetBundle(n);
    },
    loadRainPackageFromFiles(t) {
      return Tr(t);
    },
    startTask(t, n) {
      return r.client.startTask(
        {
          taskId: t.taskId,
          rain5mSequence: Ce(t.dataPackage.rain5m),
          accum1hSequence: Ce(t.dataPackage.accum1h),
          preferredBackend: t.preferredBackend,
          algorithmProfileVersion: t.algorithmProfileVersion,
          rainMaskRadiusConfig: t.rainMaskRadiusConfig
        },
        n
      );
    },
    cancelTask(t) {
      r.client.cancelTask(t);
    },
    dispose() {
      r.dispose();
    },
    getStatus() {
      return r.client.getStatus();
    }
  };
}
function Ur(e) {
  return () => new Worker(e ?? new URL(qr, import.meta.url), {
    type: "module"
  });
}
function Vr(e) {
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
      stations: e.stationMeta.stations.map((t) => {
        const n = r.has(String(t.station_id));
        return {
          ...t,
          is_fortress_anchor: n || t.is_fortress_anchor,
          is_tongzhou_anchor: n || t.is_tongzhou_anchor,
          is_cross_boundary_anchor: n || t.is_cross_boundary_anchor
        };
      })
    },
    fallback_neighbor_station_ids_by_station_id: Object.fromEntries(
      e.fallbackNeighborStationIdsByStationId
    )
  };
}
function Ce(e) {
  return {
    frameTimes: e.frameTimes,
    productType: e.productType,
    stationIds: e.stationIds,
    stationMetaById: {},
    values: e.values
  };
}
const $r = 0.1, Wr = 8, jr = 7, $e = {
  legendId: qe.Legend5mV1,
  productType: G.Rain5m,
  bins: [
    I(0.1, 0.4, "#97F297", "#333333"),
    I(0.4, 1, "#3DCE3D", "#333333"),
    I(1, 2, "#6ACEF2", "#333333"),
    I(2, 5, "#1010F2", "#ffffff"),
    I(5, 10, "#F210F2", "#ffffff"),
    I(10, 15, "#A0103D", "#ffffff"),
    I(15, 20, "#f8aa0a", "#ffffff"),
    I(20, null, "#9933FF", "#ffffff")
  ]
}, We = {
  legendId: qe.LegendAccum24hV1,
  productType: G.Accum1hStep,
  bins: [
    I(0.1, 10, "#97F297", "#333333"),
    I(10, 25, "#3DCE3D", "#333333"),
    I(25, 50, "#6ACEF2", "#333333"),
    I(50, 100, "#1010F2", "#ffffff"),
    I(100, 250, "#A0103D", "#ffffff"),
    I(250, 400, "#f8aa0a", "#ffffff"),
    I(400, null, "#9933FF", "#ffffff")
  ]
}, Kr = {
  [G.Rain5m]: $e,
  [G.Accum1hStep]: We
};
Ke($e, Wr);
Ke(We, jr);
function zr(e) {
  return Kr[e];
}
function je(e, r) {
  if (!Number.isFinite(r) || r < $r)
    return null;
  for (const t of e.bins) {
    const n = t.max === null && r >= t.min, i = t.max !== null && r >= t.min && r < t.max;
    if (n || i)
      return t;
  }
  return null;
}
function I(e, r, t, n) {
  return {
    min: e,
    max: r,
    color: t,
    textColor: n,
    label: r === null ? `${e}+` : `${e}~${r}`
  };
}
function Ke(e, r) {
  if (e.bins.length !== r)
    throw new Error(
      `Legend ${e.legendId} bin count mismatch: expected ${r}, got ${e.bins.length}`
    );
}
function Xr(e) {
  return zr(e).bins.map((r) => ({
    ...r,
    rgba: Yr(r.color)
  }));
}
function Yr(e) {
  const r = e.replace("#", ""), t = Number.parseInt(r.slice(0, 2), 16), n = Number.parseInt(r.slice(2, 4), 16), i = Number.parseInt(r.slice(4, 6), 16);
  return [t, n, i, 255];
}
function Hr(e) {
  const r = Se(e.gridMeta.col) + 1, t = Se(e.gridMeta.row) + 1, n = Math.max(1, Math.floor(e.pixelScale ?? 1)), i = (r - 1) * n + 1, a = (t - 1) * n + 1, s = new Uint8ClampedArray(i * a * 4), c = Xr(e.frameResult.frameType), l = Jr(e.renderBoundary), d = /* @__PURE__ */ new Map();
  for (let o = 0; o < e.gridMeta.gridId.length; o += 1) {
    const u = e.gridMeta.row[o], m = e.gridMeta.col[o];
    d.set(b(u, m), o);
  }
  const f = n > 1 ? ft({
    frameResult: {
      ...e.frameResult,
      rainMask: e.frameResult.rainMask
    },
    gridMeta: e.gridMeta,
    gridIndexByCell: d,
    legend: c
  }) : {
    valueGrid: e.frameResult.valueGrid,
    rainMask: e.frameResult.rainMask
  };
  for (let o = 0; o < a; o += 1)
    for (let u = 0; u < i; u += 1) {
      const m = Zr({
        valueGrid: f.valueGrid,
        rainMask: f.rainMask,
        baseValueGrid: e.frameResult.valueGrid,
        baseRainMask: e.frameResult.rainMask,
        gridIndexByCell: d,
        sourceRow: o / n,
        sourceCol: u / n,
        legend: c,
        pixelScale: n
      }), g = je(
        {
          legendId: e.frameResult.legendId,
          productType: e.frameResult.frameType,
          bins: c
        },
        m
      );
      if (!g)
        continue;
      const h = (o * i + u) * 4, _ = c.find((x) => x.color === g.color)?.rgba ?? [0, 0, 0, 0];
      s[h] = _[0], s[h + 1] = _[1], s[h + 2] = _[2], s[h + 3] = _[3];
    }
  return n > 1 && Qr({
    pixels: s,
    width: i,
    height: a,
    pixelScale: n,
    sourceWidth: r,
    sourceHeight: t,
    gridIndexByCell: d,
    rainMask: f.rainMask,
    valueGrid: f.valueGrid,
    legend: c,
    legendId: e.frameResult.legendId,
    frameType: e.frameResult.frameType
  }), tt({
    pixels: s,
    width: i,
    height: a,
    pixelScale: n,
    gridMeta: e.gridMeta,
    renderBoundary: l,
    gridResolutionM: e.gridResolutionM
  }), {
    frameKey: e.frameResult.frameKey,
    legendId: e.frameResult.legendId,
    width: i,
    height: a,
    pixels: s,
    getPixel(o) {
      const u = e.gridMeta.row[o], m = e.gridMeta.col[o], g = (u * n * i + m * n) * 4;
      return s.slice(g, g + 4);
    },
    queryGridValue(o, u) {
      const m = d.get(b(o, u));
      return m === void 0 || e.frameResult.rainMask[m] !== 1 ? null : e.frameResult.valueGrid[m];
    }
  };
}
function Jr(e) {
  if (!e)
    return;
  const t = (Array.isArray(e.features) ? e.features : []).filter((n) => st(n));
  return t.length === 0 ? e : {
    ...e,
    features: t
  };
}
function b(e, r) {
  return `${e}:${r}`;
}
function Zr(e) {
  const r = Number.isInteger(e.sourceRow) && Number.isInteger(e.sourceCol) ? e.gridIndexByCell.get(b(e.sourceRow, e.sourceCol)) : void 0;
  return r !== void 0 ? e.pixelScale === 1 ? e.rainMask[r] === 1 ? e.valueGrid[r] : Number.NaN : e.rainMask[r] !== 1 || O(e.legend, e.valueGrid[r]) < 0 ? Number.NaN : rt(e) : ze(e);
}
function Qr(e) {
  for (let r = 0; r < e.sourceHeight; r += 1)
    for (let t = 0; t < e.sourceWidth; t += 1) {
      const n = e.gridIndexByCell.get(b(r, t));
      if (n === void 0 || e.rainMask[n] !== 1 || !je(
        {
          legendId: e.legendId,
          productType: e.frameType,
          bins: e.legend
        },
        e.valueGrid[n]
      ))
        continue;
      const i = r * e.pixelScale, a = t * e.pixelScale, s = et({
        width: e.width,
        height: e.height,
        pixelRow: i,
        pixelCol: a
      });
      if (s === null)
        continue;
      const c = (i * e.width + a) * 4;
      e.pixels[c] = e.pixels[s], e.pixels[c + 1] = e.pixels[s + 1], e.pixels[c + 2] = e.pixels[s + 2], e.pixels[c + 3] = e.pixels[s + 3];
    }
}
function et(e) {
  const r = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ];
  for (const [t, n] of r) {
    const i = e.pixelRow + t, a = e.pixelCol + n;
    if (!(i < 0 || i >= e.height || a < 0 || a >= e.width))
      return (i * e.width + a) * 4;
  }
  return null;
}
function rt(e) {
  const r = 1 / e.pixelScale, t = [
    [-r, -r],
    [-r, r],
    [r, -r],
    [r, r]
  ];
  let n = 0, i = 0;
  for (const [a, s] of t) {
    const c = ze({
      ...e,
      sourceRow: e.sourceRow + a,
      sourceCol: e.sourceCol + s
    });
    Number.isFinite(c) && (n += c, i += 1);
  }
  return i > 0 ? n / i : Number.NaN;
}
function ze(e) {
  const r = Math.floor(e.sourceRow), t = Math.floor(e.sourceCol), n = Math.ceil(e.sourceRow), i = Math.ceil(e.sourceCol), a = e.sourceRow - r, s = e.sourceCol - t, c = [
    { row: r, col: t, weight: (1 - a) * (1 - s) },
    { row: r, col: i, weight: (1 - a) * s },
    { row: n, col: t, weight: a * (1 - s) },
    { row: n, col: i, weight: a * s }
  ];
  let l = Number.NEGATIVE_INFINITY, d = 0;
  const f = [], o = {
    weightedSum: 0,
    totalWeight: 0
  };
  for (const g of c) {
    if (g.weight <= 0)
      continue;
    const h = e.gridIndexByCell.get(b(g.row, g.col));
    if (h === void 0 || e.rainMask[h] !== 1)
      continue;
    const w = e.valueGrid[h], _ = O(e.legend, w);
    f.push(_), w > l && (l = w), d += w * g.weight, _ > -1 && (o.weightedSum += w * g.weight, o.totalWeight += g.weight);
  }
  if (!Number.isFinite(l))
    return Ne({
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      gridIndexByCell: e.gridIndexByCell,
      sourceRow: e.sourceRow,
      sourceCol: e.sourceCol,
      legend: e.legend,
      fallbackValue: Number.NaN
    });
  const u = Xe(f);
  if (u >= 0) {
    const g = gt({
      corners: c,
      relativePeakBin: u,
      valueGrid: e.valueGrid,
      rainMask: e.rainMask,
      gridIndexByCell: e.gridIndexByCell,
      legend: e.legend
    });
    if (Number.isFinite(g))
      return g;
  }
  const m = O(e.legend, l);
  return Ye(m, e.legend.length) ? l : Ne({
    valueGrid: e.valueGrid,
    rainMask: e.rainMask,
    gridIndexByCell: e.gridIndexByCell,
    sourceRow: e.sourceRow,
    sourceCol: e.sourceCol,
    legend: e.legend,
    fallbackValue: d
  });
}
function Se(e) {
  let r = -1;
  for (let t = 0; t < e.length; t += 1)
    e[t] > r && (r = e[t]);
  return r;
}
function tt(e) {
  if (!e.renderBoundary)
    return;
  const r = nt(e.gridMeta, e.gridResolutionM);
  if (r)
    for (const t of at(e.renderBoundary))
      for (let n = 1; n < t.length; n += 1) {
        const i = pe(t[n - 1], r, e.pixelScale), a = pe(t[n], r, e.pixelScale);
        ot(e.pixels, e.width, e.height, i, a);
      }
}
function nt(e, r) {
  const t = Te(
    e.centerX,
    e.col,
    e.row,
    r,
    "row"
  ), n = Te(
    e.centerY,
    e.row,
    e.col,
    r ? -r : void 0,
    "col"
  );
  return !Number.isFinite(t) || !Number.isFinite(n) || t === 0 || n === 0 ? null : {
    originX: e.centerX[0] - (e.col[0] + 0.5) * t,
    originY: e.centerY[0] - (e.row[0] + 0.5) * n,
    colStep: t,
    rowStep: n
  };
}
function Te(e, r, t, n, i) {
  for (let a = 0; a < e.length; a += 1)
    for (let s = a + 1; s < e.length; s += 1) {
      if (t[a] !== t[s])
        continue;
      const c = r[s] - r[a];
      if (c === 0)
        continue;
      const d = (e[s] - e[a]) / c;
      if (Number.isFinite(d) && d !== 0)
        return d;
    }
  return n !== void 0 ? n : i === "row" ? 1 : -1;
}
function at(e) {
  const r = [], t = Array.isArray(e.features) ? e.features : [];
  for (const n of t) {
    const i = n.geometry;
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
function pe(e, r, t) {
  const n = it(e[0], e[1]), i = (n.x - r.originX) / r.colStep - 0.5, a = (n.y - r.originY) / r.rowStep - 0.5;
  return {
    x: Math.round(i * t),
    y: Math.round(a * t)
  };
}
function it(e, r) {
  const n = Math.max(-85.05112878, Math.min(85.05112878, r)), i = Math.PI / 180;
  return {
    x: 6378137 * e * i,
    y: 6378137 * Math.log(Math.tan(Math.PI / 4 + n * i / 2))
  };
}
function st(e) {
  const r = e.properties ?? {};
  return r.xzqhdm === "110000" || r.adcode === 11e4;
}
function ot(e, r, t, n, i) {
  let a = n.x, s = n.y;
  const c = Math.abs(i.x - n.x), l = Math.abs(i.y - n.y), d = n.x < i.x ? 1 : -1, f = n.y < i.y ? 1 : -1;
  let o = c - l;
  for (; ; ) {
    if (ct(e, r, t, a, s), a === i.x && s === i.y)
      return;
    const u = o * 2;
    u > -l && (o -= l, a += d), u < c && (o += c, s += f);
  }
}
function ct(e, r, t, n, i) {
  if (n < 0 || i < 0 || n >= r || i >= t)
    return;
  const a = (i * r + n) * 4;
  e[a] = 0, e[a + 1] = 0, e[a + 2] = 0, e[a + 3] = 255;
}
const lt = 2, K = lt + 1, dt = 1, ut = 3, H = 2;
function ft(e) {
  const r = new Float32Array(e.frameResult.valueGrid), t = new Uint8Array(e.frameResult.rainMask), n = new Int16Array(r.length).fill(-1), i = new Uint8Array(r.length);
  for (let a = 0; a < r.length; a += 1)
    t[a] === 1 && (n[a] = O(e.legend, r[a]));
  for (let a = 0; a < r.length; a += 1) {
    const s = n[a];
    if (s < 0)
      continue;
    const c = e.gridMeta.row[a], l = e.gridMeta.col[a];
    s === _t({
      row: c,
      col: l,
      radius: K,
      binIndexByGrid: n,
      gridIndexByCell: e.gridIndexByCell
    }) && (i[a] = 1);
  }
  for (let a = 0; a < r.length; a += 1) {
    if (i[a] !== 1)
      continue;
    const s = e.gridMeta.row[a], c = e.gridMeta.col[a], l = n[a];
    for (let d = -K; d <= K; d += 1)
      for (let f = -K; f <= K; f += 1) {
        if (d === 0 && f === 0 || Math.max(Math.abs(d), Math.abs(f)) < 2)
          continue;
        const o = e.gridIndexByCell.get(
          b(s + d, c + f)
        );
        if (o === void 0 || o <= a || i[o] !== 1 || n[o] !== l)
          continue;
        const u = Math.max(r[a], r[o]), m = It({
          startRow: s,
          startCol: c,
          targetRow: s + d,
          targetCol: c + f,
          gridIndexByCell: e.gridIndexByCell
        });
        for (const g of m)
          u > r[g] && (r[g] = u), t[g] = 1;
      }
  }
  for (let a = 0; a < r.length; a += 1) {
    if (t[a] !== 1) {
      n[a] = -1;
      continue;
    }
    n[a] = O(e.legend, r[a]);
  }
  return mt({
    rainMask: t,
    hardAnchorMask: e.frameResult.hardAnchorMask,
    binIndexByGrid: n,
    gridMeta: e.gridMeta,
    gridIndexByCell: e.gridIndexByCell
  }), {
    valueGrid: r,
    rainMask: t
  };
}
function O(e, r) {
  for (let t = 0; t < e.length; t += 1) {
    const n = e[t], i = n.max === null && r >= n.min, a = n.max !== null && r >= n.min && r < n.max;
    if (i || a)
      return t;
  }
  return -1;
}
function Xe(e) {
  const r = Array.from(new Set(e.filter((t) => t >= 0))).sort(
    (t, n) => n - t
  );
  return r.length < 2 ? -1 : r[0] > r[1] ? r[0] : -1;
}
function Ye(e, r) {
  return e >= Math.floor(r / 2);
}
function gt(e) {
  let r = 0, t = 0;
  for (const n of e.corners) {
    if (n.weight <= 0)
      continue;
    const i = e.gridIndexByCell.get(b(n.row, n.col));
    if (i === void 0 || e.rainMask[i] !== 1)
      continue;
    const a = e.valueGrid[i];
    O(e.legend, a) === e.relativePeakBin && (r += a * n.weight, t += n.weight);
  }
  return t <= 0 ? Number.NaN : r / t;
}
function mt(e) {
  const r = new Uint8Array(e.rainMask.length);
  for (let t = 0; t < e.rainMask.length; t += 1) {
    const n = e.binIndexByGrid[t];
    if (r[t] === 1 || e.rainMask[t] !== 1 || n < 0 || n > dt)
      continue;
    const i = ht({
      startGridIndex: t,
      targetBinIndex: n,
      visited: r,
      rainMask: e.rainMask,
      binIndexByGrid: e.binIndexByGrid,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    });
    if (!(i.length > ut) && !(i.some((a) => e.hardAnchorMask[a] === 1) || yt({
      patch: i,
      patchBinIndex: n,
      rainMask: e.rainMask,
      binIndexByGrid: e.binIndexByGrid,
      gridMeta: e.gridMeta,
      gridIndexByCell: e.gridIndexByCell
    })))
      for (const a of i)
        e.rainMask[a] = 0, e.binIndexByGrid[a] = -1;
  }
}
function ht(e) {
  const r = [], t = [e.startGridIndex];
  for (e.visited[e.startGridIndex] = 1; t.length > 0; ) {
    const n = t.shift();
    if (n === void 0)
      continue;
    r.push(n);
    const i = e.gridMeta.row[n], a = e.gridMeta.col[n];
    for (let s = -1; s <= 1; s += 1)
      for (let c = -1; c <= 1; c += 1) {
        if (s === 0 && c === 0)
          continue;
        const l = e.gridIndexByCell.get(
          b(i + s, a + c)
        );
        l === void 0 || e.visited[l] === 1 || e.rainMask[l] !== 1 || e.binIndexByGrid[l] !== e.targetBinIndex || (e.visited[l] = 1, t.push(l));
      }
  }
  return r;
}
function yt(e) {
  const r = new Set(e.patch);
  for (const t of e.patch) {
    const n = e.gridMeta.row[t], i = e.gridMeta.col[t];
    for (let a = -H; a <= H; a += 1)
      for (let s = -H; s <= H; s += 1) {
        if (a === 0 && s === 0)
          continue;
        const c = e.gridIndexByCell.get(
          b(n + a, i + s)
        );
        if (!(c === void 0 || r.has(c) || e.rainMask[c] !== 1) && e.binIndexByGrid[c] >= e.patchBinIndex)
          return !0;
      }
  }
  return !1;
}
const wt = 1;
function Ne(e) {
  const r = e.radius ?? wt, t = r + 0.5, n = e.preservePeakBins ?? !0, i = Math.round(e.sourceRow), a = Math.round(e.sourceCol);
  let s = 0, c = 0, l = 0;
  const d = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), o = [];
  for (let u = -r; u <= r; u += 1)
    for (let m = -r; m <= r; m += 1) {
      const g = i + u, h = a + m, w = e.gridIndexByCell.get(b(g, h));
      if (w === void 0)
        continue;
      const _ = Math.hypot(e.sourceRow - g, e.sourceCol - h), x = t - _;
      if (x <= 0 || (c += x, e.rainMask[w] !== 1))
        continue;
      const v = e.valueGrid[w], T = O(e.legend, v);
      o.push(T), s += v * x, l += x, d.set(T, (d.get(T) ?? 0) + v * x), f.set(T, (f.get(T) ?? 0) + x);
    }
  if (n) {
    const u = Xe(o);
    if (u >= 0) {
      const g = f.get(u) ?? 0;
      if (g > 0)
        return (d.get(u) ?? 0) / g;
    }
    const m = o.reduce(
      (g, h) => h > g ? h : g,
      -1
    );
    if (Ye(m, e.legend.length)) {
      const g = f.get(m) ?? 0;
      if (g > 0)
        return (d.get(m) ?? 0) / g;
    }
  }
  return c <= 0 || l <= 0 ? e.fallbackValue : e.normalizeByRainyWeight ? s / l : s / c;
}
function _t(e) {
  let r = -1;
  for (let t = -3; t <= e.radius; t += 1)
    for (let n = -3; n <= e.radius; n += 1) {
      const i = e.gridIndexByCell.get(
        b(e.row + t, e.col + n)
      );
      if (i === void 0)
        continue;
      const a = e.binIndexByGrid[i];
      a > r && (r = a);
    }
  return r;
}
function It(e) {
  const r = [];
  let t = e.startRow, n = e.startCol;
  for (; ; ) {
    const i = e.targetRow - t, a = e.targetCol - n;
    if (i === 0 && a === 0 || (t += Math.sign(i), n += Math.sign(a), t === e.targetRow && n === e.targetCol))
      return r;
    const s = e.gridIndexByCell.get(b(t, n));
    if (s === void 0)
      return [];
    r.push(s);
  }
}
function kt(e) {
  const r = Hr({
    frameResult: e.frame,
    gridMeta: e.assets.gridMeta,
    renderBoundary: e.assets.renderBoundary,
    gridResolutionM: e.assets.manifest.grid_resolution_m,
    pixelScale: e.pixelScale ?? 1
  }), t = e.canvas.getContext("2d");
  if (!t)
    throw new Error("2d canvas context is not available");
  return e.canvas.width = r.width, e.canvas.height = r.height, t.putImageData(new ImageData(r.pixels, r.width, r.height), 0, 0), {
    width: r.width,
    height: r.height,
    frameKey: r.frameKey
  };
}
export {
  vt as createRainIsoBrowserSession,
  xt as createTimelinePlayer,
  Cr as loadAssetBundleFromDirectory,
  Sr as loadAssetBundleFromZip,
  Tr as loadRainPackageFromFiles,
  kt as renderFrameToCanvas
};
