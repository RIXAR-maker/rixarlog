// Posición solar (aprox. NOAA) y cálculo de tiempo de noche EASA:
// noche = sol por debajo de -6° (entre fin del crepúsculo civil vespertino e inicio del matutino).
(function () {
  const RAD = Math.PI / 180;
  function sunAltitude(ms, lat, lon) {
    const n = ms / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.0000004 * n) * RAD;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const gmst = ((280.46061837 + 360.98564736629 * n) % 360) * RAD;
    const ha = gmst + lon * RAD - ra;
    const la = lat * RAD;
    return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha)) / RAD;
  }
  function interp(a, b, f) {
    // interpolación por círculo máximo
    const [la1, lo1, la2, lo2] = [a[0] * RAD, a[1] * RAD, b[0] * RAD, b[1] * RAD];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    if (d < 1e-9) return a;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    return [Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD, Math.atan2(y, x) / RAD];
  }
  const isNight = (ms, p) => sunAltitude(ms, p[0], p[1]) < -6;
  // dateISO 'YYYY-MM-DD', off/on 'HH:MM' UTC, dep/arr [lat,lon]
  function nightCalc(dateISO, off, on, dep, arr) {
    if (!dateISO || !off || !on || !dep || !arr) return null;
    const [h1, m1] = off.split(":").map(Number), [h2, m2] = on.split(":").map(Number);
    let total = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (total < 0) total += 1440;
    const t0 = Date.parse(dateISO + "T00:00:00Z") + (h1 * 60 + m1) * 60000;
    let night = 0;
    for (let i = 0; i < total; i++) {
      const f = total ? (i + 0.5) / total : 0;
      if (isNight(t0 + (i + 0.5) * 60000, interp(dep, arr, f))) night++;
    }
    return { total, night, toNight: isNight(t0, dep), ldgNight: isNight(t0 + total * 60000, arr) };
  }
  window.RXSun = { sunAltitude, nightCalc };
})();
