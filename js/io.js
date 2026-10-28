// Exportación (CSV, Excel, JSON, PDF EASA, informe de selección) e importación
(function () {
  const S = () => window.RX;
  const T = (k) => window.RXApp.t(k);
  const hm = (m) => { m = Math.round(m || 0); return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"); };
  const hmBlank = (m) => (m ? hm(m) : "");
  const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
  const dmy = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");
  const DUR = ["se_min","me_min","mp_min","total_min","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min","fstd_min"];
  const INT = ["ldg_day","ldg_night","to_day","to_night"];
  const FIELDS = ["date","kind","dep","off_time","arr","on_time","ac_type","registration","se_min","me_min","mp_min","total_min",
    "pic_name","ldg_day","ldg_night","to_day","to_night","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min",
    "picus","pf","fstd_type","fstd_min","remarks","id"];

  function download(name, blob) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  const pname = () => (S().profile && S().profile.full_name) || "";
  const fileBase = () => "RIXARLOG_" + (pname().replace(/[^\w]+/g, "_") || "logbook") + "_" + stamp();

  // ---------- CSV
  const esc = (v) => { v = v == null ? "" : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function rowOut(r) {
    return FIELDS.map((f) => DUR.includes(f) ? hmBlank(r[f]) : (f === "off_time" || f === "on_time") ? hhmm(r[f]) :
      (f === "picus" || f === "pf") ? (r[f] ? "1" : "") : r[f] ?? "");
  }
  function exportCsv() {
    const lines = [FIELDS.join(",")].concat(S().entries.map((r) => rowOut(r).map(esc).join(",")));
    download(fileBase() + ".csv", new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  }
  function exportJson() {
    const data = { app: "RIXARLOG", version: window.RX_CONFIG.version, exported_at: new Date().toISOString(),
      profile: S().profile, entries: S().entries, aircraft: S().aircraft, documents: S().documents };
    download(fileBase() + ".json", new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
  }

  // ---------- Excel
  function exportXlsx() {
    const X = window.XLSX;
    const head = ["Fecha","Tipo anot.","Salida","OFF UTC","Llegada","ON UTC","Tipo","Matrícula","SP SE","SP ME","MP","Total","PIC",
      "Aterr. día","Aterr. noche","Noche","IFR","PIC","Copiloto","Doble mando","Instructor","PICUS","FSTD tipo","FSTD","Observaciones"];
    const rows = S().entries.map((r) => [
      r.date ? Date.parse(r.date + "T00:00:00Z") / 86400000 + 25569 : null, r.kind, r.dep, hhmm(r.off_time), r.arr, hhmm(r.on_time), r.ac_type, r.registration,
      ...["se_min","me_min","mp_min","total_min"].map((f) => r[f] ? r[f] / 1440 : null), r.pic_name,
      r.ldg_day || null, r.ldg_night || null,
      ...["night_min","ifr_min","pic_min","cop_min","dual_min","instr_min"].map((f) => r[f] ? r[f] / 1440 : null),
      r.picus ? "Sí" : "", r.fstd_type, r.fstd_min ? r.fstd_min / 1440 : null, r.remarks]);
    const ws = X.utils.aoa_to_sheet([head, ...rows]);
    const durCols = [8,9,10,11,15,16,17,18,19,20,23];
    for (let i = 1; i <= rows.length; i++) {
      const c0 = ws[X.utils.encode_cell({ r: i, c: 0 })]; if (c0) c0.z = "dd/mm/yyyy";
      for (const c of durCols) { const cell = ws[X.utils.encode_cell({ r: i, c })]; if (cell) cell.z = "[h]:mm"; }
    }
    ws["!cols"] = head.map((h, i) => ({ wch: i === 24 ? 40 : i === 12 || i === 22 ? 16 : 9 }));
    ws["!autofilter"] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: head.length - 1 } }) };
    const t = S().totals(S().entries);
    const tot = [["Concepto","Total"],["Tiempo de vuelo",hm(t.total_min)],["SP SE",hm(t.se_min)],["SP ME",hm(t.me_min)],["Multipiloto",hm(t.mp_min)],
      ["PIC",hm(t.pic_min)],["PICUS",hm(t.picus_min)],["Copiloto",hm(t.cop_min)],["Doble mando",hm(t.dual_min)],["Instructor",hm(t.instr_min)],
      ["Noche",hm(t.night_min)],["IFR",hm(t.ifr_min)],["Aterrizajes día",t.ldg_day],["Aterrizajes noche",t.ldg_night],["FSTD",hm(t.fstd_min)],
      ["Vuelos",t.n],["Sesiones FSTD",t.nFstd],["Exportado",new Date().toISOString()]];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Logbook");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(tot), "Totales");
    X.writeFile(wb, fileBase() + ".xlsx");
  }

  // ---------- PDF EASA (AMC1 FCL.050)
  function exportPdf(opts = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const rows = opts.rows || S().entries;
    const per = (S().profile && S().profile.rows_per_page) || 20;
    const P = S().profile || {};
    const W = [15,10,8,10,8,12,13,9,9,9,10,20,7,7,9,9,9,9,9,9,15,18,9,38];
    const sumCols = { 7:"se_min",8:"me_min",9:"mp_min",10:"total_min",12:"ldg_day",13:"ldg_night",14:"night_min",15:"ifr_min",
      16:"pic_min",17:"cop_min",18:"dual_min",19:"instr_min",22:"fstd_min" };
    const g = [
      [{ content: "1", colSpan: 1 }, { content: "2 DEPARTURE", colSpan: 2 }, { content: "3 ARRIVAL", colSpan: 2 },
       { content: "4 AIRCRAFT", colSpan: 2 }, { content: "5 SINGLE / MULTI-PILOT", colSpan: 3 }, { content: "6", colSpan: 1 },
       { content: "7", colSpan: 1 }, { content: "8 LANDINGS", colSpan: 2 }, { content: "9 OP. CONDITION", colSpan: 2 },
       { content: "10 PILOT FUNCTION TIME", colSpan: 4 }, { content: "11 FSTD SESSION", colSpan: 3 }, { content: "12", colSpan: 1 }],
      ["DATE", "PLACE", "TIME", "PLACE", "TIME", "TYPE", "REG.", "SE", "ME", "MULTI\nPILOT", "TOTAL\nTIME", "NAME PIC", "DAY", "NGT",
       "NIGHT", "IFR", "PIC", "CO-\nPILOT", "DUAL", "INSTR.", "DATE", "TYPE", "TOTAL", "REMARKS AND ENDORSEMENTS"],
    ];
    const pages = Math.max(1, Math.ceil(rows.length / per));
    const prev = {}; Object.values(sumCols).forEach((f) => (prev[f] = 0));
    const fmt = (f, v) => (f.startsWith("ldg") ? String(v || 0) : hm(v));
    for (let p = 0; p < pages; p++) {
      if (p) doc.addPage();
      const chunk = rows.slice(p * per, (p + 1) * per);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("PILOT LOGBOOK — EASA AMC1 FCL.050", 8, 9);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(`${P.full_name || ""}${P.licence_type ? "  ·  " + P.licence_type : ""}${P.licence_number ? "  " + P.licence_number : ""}`, 8, 13.5);
      doc.text(`${T("page")} ${p + 1} / ${pages}`, 289, 9, { align: "right" });
      doc.setFontSize(6.5); doc.text("RIXARLOG · UTC", 289, 13.5, { align: "right" });
      const body = chunk.map((r) => r.kind === "FSTD"
        ? ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", dmy(r.date), r.fstd_type || "", hmBlank(r.fstd_min), r.remarks || ""]
        : [dmy(r.date), r.dep || "", hhmm(r.off_time), r.arr || "", hhmm(r.on_time), r.ac_type || "", r.registration || "",
           hmBlank(r.se_min), hmBlank(r.me_min), hmBlank(r.mp_min), hmBlank(r.total_min), r.pic_name || "",
           r.ldg_day ? String(r.ldg_day) : "", r.ldg_night ? String(r.ldg_night) : "", hmBlank(r.night_min), hmBlank(r.ifr_min),
           hmBlank(r.pic_min) + (r.picus ? "*" : ""), hmBlank(r.cop_min), hmBlank(r.dual_min), hmBlank(r.instr_min), "", "", "", r.remarks || ""]);
      while (body.length < per) body.push(new Array(24).fill(""));
      const pageSum = {}; Object.values(sumCols).forEach((f) => (pageSum[f] = S().sum(chunk, f)));
      const totRow = (label, src) => {
        const r = [{ content: label, colSpan: 7, styles: { halign: "right", fontStyle: "bold" } }];
        for (let c = 7; c < 24; c++) {
          if (sumCols[c]) r.push(fmt(sumCols[c], src[sumCols[c]]));
          else if (c === 11 || c === 20 || c === 21) r.push("");
          else if (c === 23) r.push("");
        }
        return r;
      };
      const grand = {}; Object.keys(prev).forEach((f) => (grand[f] = prev[f] + pageSum[f]));
      const foot = [totRow(T("pageTotal"), pageSum), totRow(T("prevTotal"), prev), totRow(T("grandTotal"), grand)];
      doc.autoTable({
        startY: 16, head: g, body, foot, theme: "grid", margin: { left: 8, right: 8 },
        styles: { font: "helvetica", fontSize: per > 28 ? 5.2 : 6, cellPadding: 0.6, lineColor: [120, 130, 140], lineWidth: 0.15, overflow: "ellipsize", valign: "middle", halign: "center", minCellHeight: Math.min(7, 140 / per) },
        headStyles: { fillColor: [11, 45, 91], textColor: 255, fontSize: 5.5, fontStyle: "bold", halign: "center" },
        footStyles: { fillColor: [232, 237, 243], textColor: [11, 31, 58], fontSize: 6, fontStyle: "bold" },
        columnStyles: Object.fromEntries(W.map((w, i) => [i, { cellWidth: w, halign: i === 11 || i === 21 || i === 23 ? "left" : "center" }])),
        showFoot: "lastPage", pageBreak: "avoid",
      });
      const y = doc.lastAutoTable.finalY + 5;
      doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text(T("certify"), 8, y);
      doc.setFont("helvetica", "normal"); doc.text(T("signature") + ": ______________________________", 289, y, { align: "right" });
      Object.keys(prev).forEach((f) => (prev[f] = grand[f]));
    }
    if (opts.blob) return doc.output("blob");
    doc.save(fileBase() + "_EASA.pdf");
  }

  // ---------- Informe para selección
  function selectionData() {
    const R = S(); const all = R.totals(R.entries);
    const l12 = R.totals(R.sinceDays(365)), l90 = R.totals(R.sinceDays(90)), l28 = R.totals(R.sinceDays(28));
    const flights = R.entries.filter((r) => r.kind === "FLT");
    const last = flights.length ? flights[flights.length - 1] : null;
    const byType = [...R.groupBy(flights, (r) => r.ac_type)].map(([k, rows]) => {
      const t = R.totals(rows); return [k, hm(t.total_min), hm(t.pic_min), hm(t.picus_min), hm(t.cop_min), hm(t.mp_min), String(t.ldg_day + t.ldg_night)];
    }).sort((a, b) => R.toMin(b[1]) - R.toMin(a[1]));
    const fstdByType = [...R.groupBy(R.entries.filter((r) => r.kind === "FSTD"), (r) => (r.fstd_type || "").toUpperCase().includes("A320") ? "A320" : r.fstd_type)]
      .map(([k, rows]) => [k, hm(R.sum(rows, "fstd_min"))]);
    return { all, l12, l90, l28, last, byType, fstdByType };
  }
  function selectionText() {
    const d = selectionData(); const P = S().profile || {};
    const L = [
      `${P.full_name || ""} — ${P.licence_type || ""} ${P.licence_number || ""}`.trim(),
      `${T("totalFlight")}: ${hm(d.all.total_min)}`,
      `  Multi-pilot: ${hm(d.all.mp_min)} · PIC: ${hm(d.all.pic_min)} (PICUS ${hm(d.all.picus_min)}) · ${T("cop")}: ${hm(d.all.cop_min)} · ${T("dual")}: ${hm(d.all.dual_min)}`,
      `  SE: ${hm(d.all.se_min)} · ME: ${hm(d.all.me_min)} · ${T("night")}: ${hm(d.all.night_min)} · IFR: ${hm(d.all.ifr_min)}`,
      `  ${T("ldgDay")}: ${d.all.ldg_day} · ${T("ldgNight")}: ${d.all.ldg_night}`,
      `${T("last12")}: ${hm(d.l12.total_min)} · ${T("last90")}: ${hm(d.l90.total_min)} · ${T("last28")}: ${hm(d.l28.total_min)}`,
      `FSTD: ${hm(d.all.fstd_min)} (${d.all.nFstd})`,
      `${T("lastFlight")}: ${d.last ? dmy(d.last.date) + " " + d.last.ac_type + " " + d.last.registration : "—"}`,
      "", T("byType") + ":",
      ...d.byType.map((r) => `  ${r[0]}: ${r[1]} (PIC ${r[2]}, PICUS ${r[3]}, COP ${r[4]})`),
      ...d.fstdByType.map((r) => `  FSTD ${r[0]}: ${r[1]}`),
      "", `RIXARLOG · ${stamp()}`];
    return L.join("\n");
  }
  function selectionPdf() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4" });
    const d = selectionData(); const P = S().profile || {};
    doc.setFillColor(11, 45, 91); doc.rect(0, 0, 210, 26, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(T("selection").toUpperCase(), 12, 12);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`${P.full_name || ""}  ·  ${P.licence_type || ""} ${P.licence_number || ""}  ·  ${stamp()}`, 12, 19);
    doc.setTextColor(11, 31, 58);
    const sty = { theme: "grid", styles: { font: "helvetica", fontSize: 9, cellPadding: 1.6 }, headStyles: { fillColor: [11, 45, 91] }, margin: { left: 12, right: 12 } };
    doc.autoTable({ ...sty, startY: 32, head: [["", "Total", T("last12"), T("last90")]], body: [
      [T("totalFlight"), hm(d.all.total_min), hm(d.l12.total_min), hm(d.l90.total_min)],
      ["Multi-pilot", hm(d.all.mp_min), hm(d.l12.mp_min), hm(d.l90.mp_min)],
      ["PIC", hm(d.all.pic_min), hm(d.l12.pic_min), hm(d.l90.pic_min)],
      ["PICUS", hm(d.all.picus_min), hm(d.l12.picus_min), hm(d.l90.picus_min)],
      [T("cop"), hm(d.all.cop_min), hm(d.l12.cop_min), hm(d.l90.cop_min)],
      [T("dual"), hm(d.all.dual_min), hm(d.l12.dual_min), hm(d.l90.dual_min)],
      ["SP SE / SP ME", hm(d.all.se_min) + " / " + hm(d.all.me_min), hm(d.l12.se_min) + " / " + hm(d.l12.me_min), hm(d.l90.se_min) + " / " + hm(d.l90.me_min)],
      [T("night"), hm(d.all.night_min), hm(d.l12.night_min), hm(d.l90.night_min)],
      ["IFR", hm(d.all.ifr_min), hm(d.l12.ifr_min), hm(d.l90.ifr_min)],
      [T("ldgDay") + " / " + T("ldgNight"), d.all.ldg_day + " / " + d.all.ldg_night, d.l12.ldg_day + " / " + d.l12.ldg_night, d.l90.ldg_day + " / " + d.l90.ldg_night],
      ["FSTD", hm(d.all.fstd_min), hm(d.l12.fstd_min), hm(d.l90.fstd_min)]] });
    doc.autoTable({ ...sty, startY: doc.lastAutoTable.finalY + 6, head: [[T("type"), "Total", "PIC", "PICUS", T("cop"), "MP", "Ldg"]], body: d.byType });
    if (d.fstdByType.length) doc.autoTable({ ...sty, startY: doc.lastAutoTable.finalY + 6, head: [["FSTD", "Total"]], body: d.fstdByType });
    doc.setFontSize(8); doc.text(`${T("lastFlight")}: ${d.last ? dmy(d.last.date) + "  " + d.last.ac_type + "  " + d.last.registration : "—"}`, 12, doc.lastAutoTable.finalY + 8);
    doc.text(T("utcNote") + " " + T("notFlightTime"), 12, doc.lastAutoTable.finalY + 13);
    doc.save(fileBase() + "_seleccion.pdf");
  }

  // ---------- Importación
  function parseCsv(text) {
    text = text.replace(/^﻿/, "");
    const first = text.split(/\r?\n/)[0] || "";
    const delim = [";", "\t", ","].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ""));
  }
  function parseDate(v) {
    v = (v || "").trim(); let m;
    if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    if ((m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/))) {
      let y = m[3]; if (y.length === 2) y = (Number(y) > 70 ? "19" : "20") + y;
      return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    return null;
  }
  function parseTime(v) {
    v = (v || "").trim(); let m;
    if ((m = v.match(/^(\d{1,2}):(\d{2})/))) return `${m[1].padStart(2, "0")}:${m[2]}`;
    if ((m = v.match(/^(\d{3,4})$/))) { const s = m[1].padStart(4, "0"); return `${s.slice(0, 2)}:${s.slice(2)}`; }
    return null;
  }
  function parseDur(v, mode = "auto") {
    v = (v == null ? "" : String(v)).trim().replace(",", ".");
    if (!v) return 0; let m;
    if ((m = v.match(/^(\d+):(\d{1,2})/))) return Number(m[1]) * 60 + Number(m[2]);
    const n = Number(v); if (!isFinite(n)) return 0;
    if (mode === "min") return Math.round(n);
    return Math.round(n * 60);
  }
  const truthy = (v) => /^(1|true|yes|si|sí|x|y)$/i.test(String(v || "").trim());

  // normaliza y completa campos derivables
  function normalize(r) {
    const R = S(); const st = (R.profile && R.profile.settings) || {};
    const o = { kind: r.kind === "FSTD" || (!r.total_min && r.fstd_min) ? "FSTD" : "FLT" };
    Object.assign(o, r); o.kind = o.kind === "FSTD" || (!o.total_min && o.fstd_min && !o.dep) ? "FSTD" : "FLT";
    for (const f of [...DUR, ...INT]) o[f] = Number(o[f]) || 0;
    o.picus = !!o.picus;
    if (o.dep) o.dep = window.RXApp.icao(o.dep); if (o.arr) o.arr = window.RXApp.icao(o.arr);
    if (o.registration) o.registration = o.registration.toUpperCase().trim();
    if (o.kind === "FLT") {
      if (!o.total_min && o.off_time && o.on_time) o.total_min = ((R.toMin(o.on_time) - R.toMin(o.off_time)) % 1440 + 1440) % 1440;
      if (!o.se_min && !o.me_min && !o.mp_min && o.total_min) {
        const ac = R.aircraft.find((a) => a.registration === o.registration);
        const cls = ac ? ac.class : "SE"; o[cls.toLowerCase() + "_min"] = o.total_min;
      }
      if (!o.pic_min && !o.cop_min && !o.dual_min && !o.instr_min && o.total_min) o[(st.defRole || "pic") + "_min"] = o.total_min;
      if (!o.ac_type && o.registration) { const ac = R.aircraft.find((a) => a.registration === o.registration); if (ac) o.ac_type = ac.ac_type; }
    }
    for (const k of Object.keys(o)) if (!S().ENTRY_COLS.includes(k) && k !== "user_id") delete o[k];
    if (o.id && !/^[0-9a-f-]{36}$/i.test(o.id)) delete o.id;
    return o;
  }
  function mapRows(rows, mapping, durMode) {
    const head = rows[0];
    return rows.slice(1).map((cells) => {
      const r = {};
      for (const [field, col] of Object.entries(mapping)) {
        if (col === "" || col == null) continue;
        const v = cells[col]; if (v == null) continue;
        if (field === "date") r.date = parseDate(v);
        else if (field === "off_time" || field === "on_time") r[field] = parseTime(v);
        else if (DUR.includes(field)) r[field] = parseDur(v, durMode);
        else if (INT.includes(field)) r[field] = parseInt(v, 10) || 0;
        else if (field === "picus" || field === "pf") r[field] = truthy(v);
        else if (field === "kind") r.kind = /fstd|sim|ffs|fnpt/i.test(v) ? "FSTD" : "FLT";
        else r[field] = v.trim() || null;
      }
      return r;
    }).filter((r) => r.date).map(normalize);
  }
  function guessMapping(head) {
    const m = {};
    const lower = head.map((h) => h.toLowerCase().trim());
    for (const f of FIELDS) { const i = lower.indexOf(f); if (i >= 0) m[f] = i; }
    const syn = { date: ["fecha","date"], dep: ["salida","from","dep","origen"], arr: ["llegada","to","arr","destino"],
      off_time: ["off","out","off utc","dep time"], on_time: ["on","in","on utc","arr time"], ac_type: ["tipo","type","aircraft type"],
      registration: ["matrícula","matricula","reg","registration"], total_min: ["total","total time","tiempo total"], pic_name: ["pic name","nombre pic","captain","commander"],
      remarks: ["observaciones","remarks","notes"] };
    for (const [f, ss] of Object.entries(syn)) if (m[f] == null) { const i = lower.findIndex((h) => ss.includes(h)); if (i >= 0) m[f] = i; }
    return m;
  }

  window.RXIO = { exportCsv, exportJson, exportXlsx, exportPdf, selectionPdf, selectionText, selectionData,
    parseCsv, mapRows, guessMapping, normalize, parseDur, hm, hmBlank, hhmm, dmy, FIELDS, DUR };
})();
