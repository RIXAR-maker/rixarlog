// Pruebas automáticas sin datos reales: carga de la app, cálculo de noche, controles, importación y duplicados.
const { chromium, devices } = require("playwright");
(async () => {
const BASE = process.argv[2] || "http://localhost:8765/";
const res = []; const ok = (n, c, i = "") => res.push([c ? "PASS" : "FAIL", n, i]);
const b = await chromium.launch();
for (const dev of [devices["iPhone 13"], { viewport: { width: 1280, height: 800 } }]) {
  const p = await (await b.newContext({ ...dev, locale: "es-ES" })).newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForSelector("#em", { timeout: 15000 });
  ok(`login screen (${dev.viewport.width}px)`, true);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok("no horizontal overflow", overflow <= 0, overflow);
  ok("no JS errors on load", errs.length === 0, errs.join(" | "));
  // maqueta de la app (sin login) con el menú plegado: en móvil no puede quedar columna lateral
  const lay = await p.evaluate(() => { document.body.className = "nav-mini v-more";
    document.getElementById("app").innerHTML = '<header class="top"><b>RIXARLOG</b></header><nav class="side"><a>x</a></nav><main id="view"><div class="panel">x</div></main><nav class="tabs"></nav>';
    const hd = document.querySelector("header.top").getBoundingClientRect(), vw = document.getElementById("view").getBoundingClientRect();
    return { hw: Math.round(hd.width), vl: Math.round(vw.left), side: getComputedStyle(document.querySelector("nav.side")).display, w: innerWidth }; });
  ok(`layout with collapsed menu (${dev.viewport.width}px)`, lay.hw === lay.w && (lay.w <= 860 ? lay.side === "none" && lay.vl === 0 : lay.vl === 68), JSON.stringify(lay));
  await p.close();
}
const p = await (await b.newContext()).newPage();
await p.goto(BASE); await p.waitForSelector("#em");
await p.waitForFunction(() => window.RXSun && window.RXIO && window.RXInt);
// noche EASA: LEMD→GCLP 20/11 16:05–18:52 UTC ≈ 30 min
const n = await p.evaluate(() => RXSun.nightCalc("2026-11-20", "16:05", "18:52", [40.4934, -3.5722], [27.9319, -15.3866]));
ok("night calc LEMD-GCLP", n.total === 167 && n.night >= 25 && n.night <= 40 && n.ldgNight, JSON.stringify(n));
const d = await p.evaluate(() => RXSun.nightCalc("2026-06-21", "10:00", "11:00", [40.4934, -3.5722], [41.2971, 2.0785]));
ok("day flight has no night", d.night === 0 && !d.ldgNight, JSON.stringify(d));
// importación y duplicados
const r = await p.evaluate(() => {
  const csv = "date,kind,dep,off_time,arr,on_time,ac_type,registration,mp_min,total_min,pic_name,ldg_day,cop_min,fstd_type,fstd_min,remarks\n" +
    "2026-01-10,FLT,LEMD,07:00,LPPT,08:10,A320,EC-AAA,1:10,1:10,CAPT A,1,1:10,,,\n" +
    "2026-01-10,FLT,LEMD,07:00,LPPT,08:10,A320,EC-AAA,1:10,1:10,CAPT A,1,1:10,,,\n" +
    "2026-01-10,FLT,LEMD,07:05,LPPT,08:15,A320,EC-BBB,1:10,1:10,CAPT A,1,1:10,,,edit\n" +
    "2026-01-11,FSTD,,,,,,,,,,,,FFS ES-1A-040,4:00,LPC\n" +
    "2026-01-11,FSTD,,,,,,,,,,,,FFS ES-1A-040,4:00,OPC\n";
  const rows = RXIO.parseCsv(csv); const m = RXIO.guessMapping(rows[0]); const list = RXIO.mapRows(rows, m, "auto");
  const c = RXInt.classify(list, []); return { n: list.length, st: c.map((x) => x.status), checks: list.map((x) => window.RX.checks(x).length) };
});
ok("CSV parsed (5 rows)", r.n === 5, r.n);
ok("in-file exact duplicate detected", r.st[1] === "filedup", r.st.join());
ok("overlapping edited flight flagged", r.st[2] === "fileprob", r.st.join());
ok("two different FSTD sessions both kept", r.st[3] === "new" && ["new", "fileprob"].includes(r.st[4]), r.st.join());
ok("valid rows pass checks", r.checks[0] === 0, r.checks.join());
// FSTD idénticas el mismo día: sesiones distintas posibles → se importan todas; al reimportar solo entra la que falta
const fx = await p.evaluate(() => {
  const S = (x) => ({ kind: "FSTD", date: "2022-08-02", fstd_min: 120, ...x });
  const a = RXInt.classify([S(), S()], []).map((c) => c.status + ":" + c.action).join();
  const b = RXInt.classify([S(), S(), S({ date: "2022-08-09" })], [{ ...S(), id: "x1" }]).map((c) => c.status + ":" + c.action).join();
  return { a, b };
});
ok("identical FSTD sessions in file all kept", fx.a === "new:keep,fileprob:keep", fx.a);
ok("re-import adds only the missing FSTD copy", fx.b === "same:skip,fileprob:keep,new:keep", fx.b);
// edición en bloque: PIC y aterrizajes PF (día/noche por el sol), sin sobrescribir lo ya relleno
const bk = await p.evaluate(() => {
  const APT = { LEMD: ["Madrid", 40.4934, -3.5722], GCLP: ["Gran Canaria", 27.9319, -15.3866] };
  const F = (x) => ({ kind: "FLT", date: "2026-11-20", dep: "LEMD", arr: "GCLP", total_min: 167, ldg_day: 0, ldg_night: 0, ...x });
  const rows = [F({ id: "a", off_time: "16:05", on_time: "18:52" }), F({ id: "b", off_time: "08:00", on_time: "10:47", pic_name: "CPT X" }),
    F({ id: "c", off_time: "08:00", on_time: "10:47", ldg_day: 1 }), { kind: "FSTD", id: "d", date: "2026-01-01", fstd_min: 240 }];
  const out = RXIO.bulkPatch(rows, { pic_name: "CPT Y", ldg: "pf", fstd_type: "FFS E2", onlyEmpty: true }, (c) => APT[c]);
  const g = (id) => out.find((r) => r.id === id) || {};
  const pm = RXIO.bulkPatch([F({ id: "e", ldg_day: 1, pf: true })], { ldg: "pm", onlyEmpty: false }, (c) => APT[c])[0];
  return { n: out.length, a: [g("a").pic_name, g("a").ldg_night, g("a").to_day].join(), b: [g("b").pic_name, g("b").ldg_day].join(), c: [g("c").pic_name, g("c").ldg_day].join(), d: g("d").fstd_type, pm: [pm.pf, pm.ldg_day].join() };
});
ok("bulk edit fills only empty fields, night landing by sun", bk.n === 4 && bk.a === "CPT Y,1,1" && bk.b === "CPT X,1" && bk.c === "CPT Y,1" && bk.d === "FFS E2" && bk.pm === "false,0", JSON.stringify(bk));
const dur = await p.evaluate(() => [RXIO.parseDur("1:35"), RXIO.parseDur("1.5"), RXIO.parseDur("90", "min"), RXIO.hm(605)]);
ok("duration parsing", JSON.stringify(dur) === JSON.stringify([95, 90, 90, "10:05"]), JSON.stringify(dur));
// Excel tipo libro por páginas: cabeceras repetidas que cambian de columnas, filas de totales, FSTD, fecha mal tecleada
const xp = await p.evaluate(async () => {
  await RXLoad("xlsx");
  const t = (h, m) => (h * 60 + m) / 1440, dd = (y, mo, d) => Date.UTC(y, mo - 1, d) / 86400000 + 25569;
  const H1 = ["", "DATE", "PLACE", "TIME", "PLACE", "TIME", "MODEL", "REGISTRATION", "SE", "ME", "TOTAL TIME FLIGHT", "LDG", "NIGHT", "IFR", "PIC", "DUAL", "SYNTHETIC TRAINING DEVICES SESSION"];
  const H2 = ["", "DATE", "PLACE", "TIME", "PLACE", "TIME", "MODEL", "REGISTRATION", "SE", "ME", "MULTI-PILOT", "TOTAL TIME FLIGHT", "LDG", "NIGHT", "IFR", "PIC", "COPILOT", "DUAL", "SYNTHETIC TRAINING DEVICES SESSION"];
  const aoa = [[], ["", "", "", "", "", "", "", "", "", "", "notas sueltas"], H1,
    ["", dd(2015, 3, 2), "LEMG", t(8, 0), "LEMG", t(9, 50), "DA20", "EC-XXA", "X", "", t(1, 50), 1, "", "", "", t(1, 50), "", "SUELTA"],
    ["", "28//11/20", "LEAX", t(11, 10), "LEAX", t(12, 15), "P28R", "EC-XXB", "X", "", t(1, 5), 7, "", "", t(1, 5)],
    ["", dd(2021, 4, 13), "LEAX", t(20, 0), "LECU", t(21, 0), "BE76", "EC-XXC", "", "X", t(1, 0), 1, t(1, 0), t(1, 0), t(1, 0)],
    ["", dd(2022, 7, 19), "", "", "", "", "", "", "", "", "", "", "", "", "", "", t(2, 0), "ERJ 190-E2 (XX-1)"],
    ["", "", "", "", "", "", "", "TOTAL THIS PAGE", "", "", t(3, 55)], ["", "", "", "", "", "", "", "TOTAL TIME", "", "", t(3, 55)],
    H2, ["", dd(2024, 10, 22), "GCXO", t(7, 4), "LEMD", t(9, 48), "E295", "EC-XXD", "", "", t(2, 44), t(2, 44), 1, "", t(2, 44), "", t(2, 44)],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", t(4, 0), "OPC"],
    ["", "", "", "", "", "", "", "TOTAL THIS PAGE", "", "", t(2, 44), t(2, 44)]];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Hoja1");
  const res = RXIO.parseWorkbook(XLSX.read(XLSX.write(wb, { type: "array", bookType: "xlsx" }), { type: "array" }));
  const R = res.rows;
  return { kind: res.kind, n: R.length, dates: R.map((r) => r.date).join(), fixed: res.issues.filter((i) => i.msg === "dateFixed").length,
    noDate: res.issues.filter((i) => i.msg === "noDate").length, first: [R[0].off_time, R[0].total_min, R[0].se_min, R[0].dual_min, R[0].ldg_day, R[0].remarks].join(),
    me: [R[2].me_min, R[2].night_min, R[2].ldg_night].join(), fstd: [R[3].kind, R[3].fstd_min, R[3].fstd_type].join(), mp: [R[4].mp_min, R[4].total_min, R[4].cop_min, R[4].ifr_min, R[4].ldg_day].join() };
});
ok("Excel page-style logbook detected", xp.kind === "paper" && xp.n === 5, JSON.stringify(xp));
ok("Excel: typo date repaired, undated row flagged", xp.dates === "2015-03-02,2020-11-28,2021-04-13,2022-07-19,2024-10-22" && xp.fixed === 1 && xp.noDate === 1, xp.dates);
ok("Excel: columns follow each page header", xp.first === "08:00,110,110,110,1,SUELTA" && xp.me === "60,60,1" && xp.fstd === "FSTD,120,ERJ 190-E2 (XX-1)" && xp.mp === "164,164,164,164,1", JSON.stringify(xp));
// PDF EASA: respeta las filas por página del perfil y el total cuadra
const pdfp = await p.evaluate(async () => {
  const keep = { e: RX.entries, pr: RX.profile }; const out = {};
  RX.entries = Array.from({ length: 40 }, (_, i) => ({ id: "t" + i, kind: "FLT", date: "2026-01-" + String(1 + (i % 28)).padStart(2, "0"), dep: "LEMD", arr: "LEBL", off_time: "07:00", on_time: "08:10", ac_type: "A320", registration: "EC-AAA", mp_min: 70, total_min: 70, cop_min: 70, ldg_day: 1 }));
  for (const n of [10, 20, 30]) { RX.profile = { ...(keep.pr || {}), rows_per_page: n };
    const txt = await (await RXIO.exportPdf({ blob: true })).text(); out[n] = (txt.match(/\/Type \/Page[^s]/g) || []).length; }
  RX.entries = keep.e; RX.profile = keep.pr; return out; });
ok("EASA PDF honours rows per page", pdfp[10] === 4 && pdfp[20] === 2 && pdfp[30] === 2, JSON.stringify(pdfp));
// guía de uso: contenido ES/EN paralelo y PDF generado
const g = await p.evaluate(() => ({ es: RX_HELP.es.sections.length, en: RX_HELP.en.sections.length, li: RX_HELP.es.sections.map((x) => x.li.length).join() === RX_HELP.en.sections.map((x) => x.li.length).join() }));
ok("help guide ES/EN in sync", g.es >= 10 && g.es === g.en && g.li, JSON.stringify(g));
const dlCtx = await b.newContext({ acceptDownloads: true }); const p2 = await dlCtx.newPage(); await p2.goto(BASE); await p2.waitForFunction(() => window.RX_HELP_PDF);
const [dl] = await Promise.all([p2.waitForEvent("download"), p2.evaluate(() => RX_HELP_PDF("es", "test"))]);
ok("help PDF generated", /Guia_de_uso/.test(dl.suggestedFilename()), dl.suggestedFilename());
await b.close();
for (const x of res) console.log(...x);
const fail = res.filter((x) => x[0] === "FAIL").length;
console.log(`SUMMARY ${res.length - fail}/${res.length}`);
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
