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
const dur = await p.evaluate(() => [RXIO.parseDur("1:35"), RXIO.parseDur("1.5"), RXIO.parseDur("90", "min"), RXIO.hm(605)]);
ok("duration parsing", JSON.stringify(dur) === JSON.stringify([95, 90, 90, "10:05"]), JSON.stringify(dur));
await b.close();
for (const x of res) console.log(...x);
const fail = res.filter((x) => x[0] === "FAIL").length;
console.log(`SUMMARY ${res.length - fail}/${res.length}`);
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
