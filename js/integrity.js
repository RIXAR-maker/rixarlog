// Integridad del libro: solapes de horario, duplicados probables y clasificación de importaciones
(function () {
  const R = () => window.RX;
  const toMin = (t) => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
  const dayMs = 86400000;
  // intervalo absoluto [inicio, fin] en minutos desde época, o null si faltan horas
  function interval(r) {
    if (r.kind !== "FLT" || !r.date || !r.off_time) return null;
    const off = toMin(r.off_time); let dur = r.total_min || 0;
    if (!dur && r.on_time) dur = ((toMin(r.on_time) - off) % 1440 + 1440) % 1440;
    if (!dur) return null;
    const s = Date.parse(r.date + "T00:00:00Z") / 60000 + off;
    return [s, s + dur];
  }
  const normFstd = (x) => String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/I(?=A\d)/g, "1");
  const sig = (r) => [r.kind, r.date, r.kind === "FSTD" ? normFstd(r.fstd_type) : r.dep, String(r.off_time || "").slice(0, 5), r.arr,
    String(r.on_time || "").slice(0, 5), r.kind === "FSTD" ? String(r.remarks || "").trim().toUpperCase() : r.registration, r.kind === "FSTD" ? r.fstd_min : r.total_min].join("|");
  const overlapsI = (a, b) => a && b && a[0] < b[1] && b[0] < a[1];
  // ¿es b un duplicado probable de a?
  function probable(a, b) {
    if (a.kind !== b.kind || a.date !== b.date) return false;
    if (a.kind === "FSTD") return (a.fstd_min || 0) === (b.fstd_min || 0) && (normFstd(a.fstd_type) === normFstd(b.fstd_type) || (a.fstd_min || 0) > 0);
    if (overlapsI(interval(a), interval(b))) return true;
    if (a.dep && a.dep === b.dep && a.arr === b.arr) {
      const x = toMin(a.off_time), y = toMin(b.off_time);
      if (x == null || y == null) return (a.total_min || 0) === (b.total_min || 0);
      return Math.abs(x - y) <= 20;
    }
    return false;
  }
  function byDate(rows) { const m = new Map(); for (const r of rows) { if (!m.has(r.date)) m.set(r.date, []); m.get(r.date).push(r); } return m; }
  // índice que incluye el día anterior (vuelos que cruzan medianoche)
  function near(idx, date) {
    const prev = new Date(Date.parse(date + "T00:00:00Z") - dayMs).toISOString().slice(0, 10);
    return [...(idx.get(date) || []), ...(idx.get(prev) || [])];
  }

  // clasifica filas a importar frente al libro existente y frente al propio archivo
  function classify(rows, existing) {
    const exSig = new Map(existing.map((r) => [sig(r), r]));
    const idx = byDate(existing);
    const seen = new Map(); const seenIdx = new Map();
    return rows.map((r, i) => {
      const s = sig(r);
      if (exSig.has(s)) return { row: r, status: "same", match: exSig.get(s), action: "skip" };
      if (seen.has(s)) return { row: r, status: "filedup", match: seen.get(s), action: "skip" };
      const m = near(idx, r.date).find((x) => probable(x, r) || probable(r, x));
      const fm = !m && near(seenIdx, r.date).find((x) => probable(x, r) || probable(r, x));
      seen.set(s, r); if (!seenIdx.has(r.date)) seenIdx.set(r.date, []); seenIdx.get(r.date).push(r);
      if (m) return { row: r, status: "probable", match: m, action: "skip" };
      if (fm) return { row: r, status: "fileprob", match: fm, action: "keep" };
      return { row: r, status: "new", action: "keep" };
    });
  }

  // avisos del libro completo
  function issues(entries) {
    const out = [];
    const fl = entries.filter((r) => r.kind === "FLT").map((r) => ({ r, i: interval(r) })).filter((x) => x.i).sort((a, b) => a.i[0] - b.i[0]);
    let maxEnd = null;
    for (let k = 0; k < fl.length; k++) {
      for (let j = k + 1; j < fl.length && fl[j].i[0] < fl[k].i[1]; j++) out.push({ type: "overlap", rows: [fl[k].r, fl[j].r] });
    }
    const pairs = new Set(out.map((o) => o.rows.map((x) => x.id).sort().join()));
    const idx = byDate(entries);
    for (const [, list] of idx) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const x = list[a], y = list[b]; const key = [x.id, y.id].sort().join();
      if (!pairs.has(key) && probable(x, y)) { out.push({ type: x.kind === "FSTD" ? "fstddup" : "probable", rows: [x, y] }); pairs.add(key); }
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const r of entries) {
      if (r.date > today) out.push({ type: "future", rows: [r] });
      const c = R().checks(r); if (c.length) out.push({ type: "check", rows: [r], codes: c });
    }
    return out;
  }
  // solapes de una anotación concreta (formulario)
  function overlapsWith(r, entries) {
    const a = interval(r); const out = [];
    for (const x of near(byDate(entries), r.date).concat(entries.filter((e) => e.date === new Date(Date.parse(r.date + "T00:00:00Z") + dayMs).toISOString().slice(0, 10)))) {
      if (x.id && x.id === r.id) continue;
      if (r.kind === "FLT" && overlapsI(a, interval(x))) out.push(x);
    }
    return out;
  }
  window.RXInt = { classify, issues, overlapsWith, interval, sig };
})();
