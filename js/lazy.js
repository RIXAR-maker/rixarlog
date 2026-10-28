// Carga diferida de librerías pesadas: solo se descargan/ejecutan cuando hacen falta (el service worker las tiene en caché para modo avión)
window.RXLoad = (function () {
  const libs = {
    chart: ["vendor/chart.umd.js"],
    pdf: ["vendor/jspdf.umd.min.js", "vendor/jspdf.plugin.autotable.min.js"],
    xlsx: ["vendor/xlsx.mini.min.js"],
    map: ["vendor/leaflet/leaflet.js"],
  };
  const test = { chart: () => window.Chart, pdf: () => window.jspdf && window.jspdf.jsPDF.API.autoTable, xlsx: () => window.XLSX, map: () => window.L };
  const done = {};
  const one = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src)); document.head.appendChild(s); });
  return (name) => {
    if (test[name] && test[name]()) return Promise.resolve();
    if (!done[name]) done[name] = libs[name].reduce((p, src) => p.then(() => one(src)), Promise.resolve()).catch((e) => { delete done[name]; throw e; });
    return done[name];
  };
})();
