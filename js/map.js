// Mapa de rutas: Leaflet + teselas CARTO/OpenStreetMap (gratuitas con atribución)
(function () {
  const RAD = Math.PI / 180;
  let map = null;
  function gc(a, b, n = 48) { // puntos por círculo máximo
    const [la1, lo1, la2, lo2] = [a[0] * RAD, a[1] * RAD, b[0] * RAD, b[1] * RAD];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    if (d < 1e-6) return [a, b];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      const z = A * Math.sin(la1) + B * Math.sin(la2);
      pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD, Math.atan2(y, x) / RAD]);
    }
    return pts;
  }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (c1, c2, f) => "#" + c1.map((v, i) => Math.round(v + (c2[i] - v) * f).toString(16).padStart(2, "0")).join("");
  function scale(stops, f) { // f en [0,1] → color interpolado entre paradas
    f = Math.max(0, Math.min(1, f)); const k = f * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(k));
    return mix(hex(stops[i]), hex(stops[i + 1]), k - i);
  }
  function render(el, entries, apt, opts = {}) {
    if (!window.L) { el.innerHTML = ""; return; }
    if (map) { map.remove(); map = null; }
    const dark = opts.dark;
    const stops = dark ? ["#2bb3ff", "#3ddc84", "#ffb020", "#ff4fd8"] : ["#4b7bd6", "#2e9e5b", "#e08a00", "#c8102e"];
    const routes = new Map(), visits = new Map();
    for (const r of entries) {
      if (r.kind !== "FLT" || !r.dep || !r.arr) continue;
      const A = apt(r.dep), B = apt(r.arr); if (!A || !B) continue;
      visits.set(r.dep, (visits.get(r.dep) || 0) + 1); if (r.arr !== r.dep) visits.set(r.arr, (visits.get(r.arr) || 0) + 1);
      if (r.dep === r.arr) continue;
      const k = [r.dep, r.arr].sort().join("|");
      const o = routes.get(k) || { n: 0, min: 0 }; o.n++; o.min += r.total_min || 0; routes.set(k, o);
    }
    map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true, scrollWheelZoom: false,
      dragging: !L.Browser.mobile, tap: false }); // en móvil no captura el desplazamiento de la página; zoom con los botones
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? "Dark" : "Light"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 12, attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    }).addTo(map);
    const maxN = Math.max(1, ...[...routes.values()].map((o) => o.n));
    const f = (n) => (maxN === 1 ? 0.5 : Math.log(n) / Math.log(maxN));
    const bounds = [];
    [...routes.entries()].sort((a, b) => a[1].n - b[1].n).forEach(([k, o]) => {
      const [a, b] = k.split("|"); const A = apt(a), B = apt(b);
      const pts = gc([A[1], A[2]], [B[1], B[2]]); bounds.push(...[pts[0], pts[pts.length - 1]]);
      L.polyline(pts, { color: scale(stops, f(o.n)), weight: 1.5 + 4.5 * f(o.n), opacity: 0.85 })
        .bindTooltip(`<b>${a} ⇄ ${b}</b><br>${o.n} ${opts.t("sectors")} · ${window.RXIO.hm(o.min)}`, { sticky: true }).addTo(map);
    });
    const maxV = Math.max(1, ...visits.values());
    for (const [c, n] of visits) {
      const A = apt(c); bounds.push([A[1], A[2]]);
      L.circleMarker([A[1], A[2]], { radius: 3 + 7 * Math.sqrt(n / maxV), color: dark ? "#e6ecf0" : "#1d1d1b", weight: 1, fillColor: scale(stops, Math.log(n + 1) / Math.log(maxV + 1)), fillOpacity: 0.9 })
        .bindTooltip(`<b>${c}</b> · ${A[0]}<br>${n} ${opts.t("visits")}`).addTo(map);
    }
    const fit = () => { if (!map) return; map.invalidateSize(); if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 }); else map.setView([40.4, -3.7], 5); };
    fit();
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => { const d = L.DomUtil.create("div", "map-legend");
      d.innerHTML = `<span>1</span><i style="background:linear-gradient(90deg,${stops.join(",")})"></i><span>${maxN}</span><small>${opts.t("sectors")}</small>`; return d; };
    legend.addTo(map);
    setTimeout(fit, 60); setTimeout(fit, 400);
    return { routes: routes.size, airports: visits.size, maxN };
  }
  window.RXMap = { render, destroy: () => { if (map) { map.remove(); map = null; } } };
})();
