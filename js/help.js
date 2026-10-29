// RIXARLOG — guía de uso (una sola fuente: se muestra en la app y se exporta a PDF)
// Formato: { h: título, p: párrafo opcional, li: [puntos], tip: nota opcional }. **texto** = negrita.
window.RX_HELP = {
  es: {
    title: "Guía de uso", sub: "Cómo llevar tu libro de vuelo EASA con RIXARLOG", pdf: "Descargar guía en PDF", toc: "Contenido",
    sections: [
      { h: "1. Primeros pasos", li: [
        "Crea tu cuenta con email y contraseña (mínimo 10 caracteres, con mayúsculas, minúsculas y números). Confirma el email que te llega.",
        "Ve a **Ajustes → Piloto** y rellena tu nombre, licencia, número y base. Salen en la portada y el pie del PDF EASA.",
        "En **Ajustes → Valores por defecto** elige tu función habitual (p. ej. Copiloto), si tus vuelos son IFR y si sueles ser pilot flying. Así cada vuelo nuevo viene ya rellenado.",
        "Si ya tienes un logbook, impórtalo en **Ajustes → Importar** (ver apartado 9)."] },
      { h: "2. Instalar la app", li: [
        "**iPhone:** abre la web en Safari → botón Compartir → «Añadir a pantalla de inicio». Ábrela siempre desde el icono: así funciona sin conexión y recibe notificaciones.",
        "**PC/Mac:** en Chrome o Edge pulsa el icono de instalar de la barra de direcciones.",
        "**Sin conexión (modo avión):** puedes consultar y añadir vuelos. Los cambios quedan pendientes y se sincronizan solos al volver la red; arriba verás «cambios pendientes».",
        "**Actualizaciones:** se instalan solas. Si no ves una novedad, cierra la app del todo y vuelve a abrirla. La versión aparece en **Más**."] },
      { h: "3. Anotar un vuelo", p: "Pulsa **+** (abajo en el móvil, o «Nueva anotación»). Elige **Vuelo** o **FSTD**.", li: [
        "**Fecha y aeronave:** escribe la matrícula; si ya existe, el tipo y la clase (SE/ME/MP) se rellenan solos. Una matrícula nueva se guarda en Aeronaves.",
        "**Ruta y horas (UTC):** aeropuertos en ICAO o IATA (MAD o LEMD). Horas OFF/ON en UTC; los dos puntos se ponen solos. «Ahora» pone la hora UTC actual y ⇄ invierte la ruta.",
        "**Tiempo y función:** el tiempo total se calcula de OFF/ON y se asigna a tu función (PIC, copiloto, doble mando, instructor, PICUS). Indica el nombre del PIC.",
        "**Noche, IFR, despegues y aterrizajes:** se calculan solos y verás el resumen. La noche se calcula con la posición real del sol a lo largo de la ruta (crepúsculo civil, −6°). Los despegues y aterrizajes se asignan al pilot flying, de día o de noche según la hora. Abre el bloque solo si necesitas corregir algo a mano.",
        "**Guardar + vuelta** guarda y abre el vuelo de regreso con la ruta invertida. **Duplicar** copia una anotación existente.",
        "Si el vuelo se solapa en el tiempo con otro ya anotado, la app te avisa antes de guardar."],
        tip: "Al editar un vuelo antiguo no se recalcula nada salvo que cambies horas o ruta, para no alterar datos ya revisados." },
      { h: "4. El libro", li: [
        "Filtra por **Todo / Vuelos / FSTD**, busca por fecha, aeropuerto, matrícula o nombre, y elige el año.",
        "Cada mes muestra sus totales. Toca una anotación para verla o editarla.",
        "Un aviso rojo en una anotación indica que algún control no cuadra (p. ej. la suma de funciones no da el total o falta el nombre del PIC).",
        "El botón **⋯** reúne: Firmar varias, PDF EASA, Excel, CSV y Nueva anotación."] },
      { h: "5. Panel y avisos", li: [
        "Arriba ves tus horas totales, las de los últimos 90 días y tu último vuelo.",
        "**Avisos** agrupa lo importante: recencia FCL.060 (3 despegues y aterrizajes en 90 días), documentos que caducan, firmas de formación pendientes, avisos de integridad y copia de seguridad antigua.",
        "Al tocar un aviso vas directo al problema: el documento que caduca, las anotaciones sin firmar (con «Firmar estas»), los aterrizajes que sostienen tu recencia o el aviso de integridad concreto.",
        "El **mapa de rutas** colorea cada ruta según las veces que la has volado; puedes ver todo, últimos 12 meses o el año.",
        "Los gráficos muestran horas por mes, por tipo e hitos alcanzados."] },
      { h: "6. Estadísticas", li: [
        "**Totales:** por función, clase, condición (noche, IFR), tipo, año y periodos móviles (28 días, 90 días, 12 meses). Los límites FTL son orientativos: los controla tu operador.",
        "**Informe:** informe para procesos de selección en un periodo que tú eliges, con rutas, aeropuertos, matrículas y tripulación. Se puede copiar como texto o descargar en PDF.",
        "**Resumen anual:** tu año en vuelo (horas, distancia, países, ruta favorita…) con una imagen para compartir."] },
      { h: "7. Caducidades y aeronaves", li: [
        "En **Caducidades** añade licencia, certificado médico, LPC/OPC, SEP, ELP, pasaporte, etc. con su fecha de caducidad. Avisa a 60, 30, 14, 7 y 1 días.",
        "En **Aeronaves** están las matrículas con su tipo y clase. Si corriges aquí el tipo o la clase, se usa en los vuelos nuevos."] },
      { h: "8. Firmas", li: [
        "**Tu firma:** dibújala en **Ajustes → Mi firma**. Aparece en el PDF EASA junto a «Certifico que las anotaciones de este libro son ciertas».",
        "**Firmar una anotación:** ábrela y pulsa Firmar en el apartado Firmas. Quien firma (TRI, examinador, comandante) pone nombre, función, licencia y firma con el dedo.",
        "**Firmar varias:** en el libro, **⋯ → Firmar varias**, toca las anotaciones y pulsa Firmar. Pulsa Cancelar para salir del modo selección.",
        "Cada firma guarda una huella de los datos. Si después se modifica la anotación, la firma queda **invalidada** y se marca en rojo en el libro y en el PDF."],
        tip: "Comprueba en el OM-A de tu operador si admite firmas electrónicas para endosos de formación." },
      { h: "9. Importar datos", li: [
        "**Ajustes → Importar → Importar CSV.** Sirve para Excel exportado como CSV y para la mayoría de logbooks. Asigna cada campo a una columna de tu archivo; la app propone la asignación.",
        "Antes de importar verás una **revisión**: nuevas, idénticas a las que ya tienes, repetidas en el archivo y probables duplicados. Por defecto se omiten las idénticas y los probables duplicados; puedes cambiarlo fila a fila.",
        "Cada importación queda registrada en **Importaciones** y se puede **Deshacer** entera.",
        "**Restaurar copia JSON** recupera una copia completa hecha con RIXARLOG.",
        "Los rosters de aerolínea están en desarrollo."] },
      { h: "10. Exportar y copias de seguridad", li: [
        "**PDF EASA:** formato AMC1 FCL.050 con totales de página, páginas anteriores y total acumulado, firmas y certificación. Es el que se imprime o se enseña en una inspección.",
        "**Excel** y **CSV:** datos en bruto para trabajar con ellos o pasarlos a otro programa.",
        "**Copia de seguridad (JSON):** todo tu libro, firmas incluidas. Guárdala en iCloud Drive, Archivos o tu PC con **Guardar copia**.",
        "La app te recuerda hacer una copia si la última tiene más de 30 días. Tus datos ya están en la nube, pero una copia propia te protege si pierdes el acceso a la cuenta."] },
      { h: "11. Calidad: integridad e historial", li: [
        "**Integridad** revisa el libro entero: vuelos que se solapan, posibles duplicados, sesiones FSTD repetidas, fechas futuras y controles que no cuadran.",
        "Para cada aviso puedes pulsar **Es correcto** (desaparece) o **Borrar la segunda** si es un duplicado real.",
        "**Historial** es un registro inalterable de cada alta, edición y borrado, con fecha y valores anteriores. Nadie puede modificarlo, ni siquiera tú."] },
      { h: "12. Notificaciones", li: [
        "**Ajustes → Notificaciones → Activar.** En iPhone solo funciona con la app instalada en la pantalla de inicio (iOS 16.4 o posterior).",
        "Avisa de recencia (14, 7, 3 y 1 días antes), caducidades, firmas de formación pendientes (lunes) y copia de seguridad antigua. Revisión diaria a las 08:00.",
        "Puedes elegir qué avisos quieres y enviarte una notificación de prueba. Se activan por dispositivo."] },
      { h: "13. Ajustes y cuenta", li: [
        "**Apariencia:** tema Cabina oscura (ECAM), Manual técnico (FCOM), Híbrido o Rojo aerolínea, e idioma español o inglés.",
        "**Objetivos de horas** para seguir tu progreso en el Panel.",
        "**Cambiar contraseña** y **Borrar mi cuenta**, que elimina de forma permanente la cuenta, los vuelos y el historial. Exporta antes una copia.",
        "Las secciones de Ajustes se pliegan; la app recuerda cuáles dejaste abiertas."] },
      { h: "14. EASA y responsabilidad", li: [
        "RIXARLOG sigue el formato de FCL.050 y AMC1 FCL.050: horas en UTC, columnas y totales del modelo EASA, y el tiempo FSTD separado del tiempo de vuelo.",
        "El responsable del contenido del libro es el piloto. Revisa tus anotaciones y los avisos de Controles e Integridad.",
        "Cálculos automáticos (noche, clase, aterrizajes) se basan en la base de datos de aeropuertos y en las horas que introduces; si el aeropuerto no se encuentra, la app te lo indica y debes rellenarlos a mano."] },
      { h: "15. Preguntas frecuentes", li: [
        "**No me cuadra la noche con la del operador:** algunos operadores usan tablas o la hora de llegada en lugar de la posición del sol en ruta. Ajusta a mano en el bloque de cálculo automático.",
        "**He importado dos veces:** ve a **Ajustes → Importaciones** y pulsa Deshacer en la importación repetida.",
        "**He borrado algo por error:** en **Historial** ves los valores anteriores para volver a anotarlo.",
        "**No veo los cambios en otro dispositivo:** comprueba la conexión; la sincronización es en tiempo real cuando hay red.",
        "**He olvidado la contraseña:** en la pantalla de inicio, «¿Has olvidado la contraseña?»."] },
    ],
  },
  en: {
    title: "User guide", sub: "How to keep your EASA logbook with RIXARLOG", pdf: "Download guide as PDF", toc: "Contents",
    sections: [
      { h: "1. Getting started", li: [
        "Create your account with email and password (at least 10 characters, with upper case, lower case and numbers). Confirm the email you receive.",
        "Go to **Settings → Pilot** and fill in your name, licence, number and base. They appear on the cover and footer of the EASA PDF.",
        "In **Settings → Defaults** choose your usual function (e.g. Co-pilot), whether your flights are IFR and whether you are usually pilot flying, so each new flight comes pre-filled.",
        "If you already have a logbook, import it in **Settings → Import** (see section 9)."] },
      { h: "2. Installing the app", li: [
        "**iPhone:** open the site in Safari → Share → “Add to Home Screen”. Always open it from the icon: that way it works offline and receives notifications.",
        "**PC/Mac:** in Chrome or Edge click the install icon in the address bar.",
        "**Offline (airplane mode):** you can view and add flights. Changes are queued and sync automatically when you are back online; you will see “pending changes”.",
        "**Updates:** install themselves. If you don't see a change, close the app completely and reopen it. The version is shown in **More**."] },
      { h: "3. Logging a flight", p: "Tap **+** (bottom bar on mobile, or “New entry”). Choose **Flight** or **FSTD**.", li: [
        "**Date and aircraft:** type the registration; if known, type and class (SE/ME/MP) fill in automatically. A new registration is saved to Aircraft.",
        "**Route and times (UTC):** airports in ICAO or IATA (MAD or LEMD). OFF/ON times in UTC; the colon is added for you. “Now” enters the current UTC time and ⇄ swaps the route.",
        "**Time and function:** total time is computed from OFF/ON and assigned to your function (PIC, co-pilot, dual, instructor, PICUS). Enter the PIC's name.",
        "**Night, IFR, take-offs and landings:** computed automatically, with a summary. Night uses the real sun position along the route (civil twilight, −6°). Take-offs and landings go to the pilot flying, day or night by time. Open the block only to correct something by hand.",
        "**Save + return** saves and opens the return flight with the route swapped. **Duplicate** copies an existing entry.",
        "If the flight overlaps in time with another entry, the app warns you before saving."],
        tip: "When you edit an old flight nothing is recalculated unless you change times or route, so reviewed data is not altered." },
      { h: "4. The logbook", li: [
        "Filter by **All / Flights / FSTD**, search by date, airport, registration or name, and pick the year.",
        "Each month shows its totals. Tap an entry to view or edit it.",
        "A red flag on an entry means a check does not add up (e.g. functions don't sum to total, or PIC name is missing).",
        "The **⋯** button holds: Sign several, EASA PDF, Excel, CSV and New entry."] },
      { h: "5. Dashboard and alerts", li: [
        "At the top: total hours, last 90 days and your last flight.",
        "**Alerts** gathers what matters: FCL.060 recency (3 take-offs and landings in 90 days), expiring documents, pending training signatures, integrity warnings and an old backup.",
        "Tapping an alert takes you straight to the problem: the expiring document, the unsigned entries (with “Sign these”), the landings behind your recency or the specific integrity warning.",
        "The **route map** colours each route by how often you have flown it; view all time, last 12 months or the year.",
        "Charts show hours per month, by type and milestones reached."] },
      { h: "6. Statistics", li: [
        "**Totals:** by function, class, condition (night, IFR), type, year and rolling periods (28 days, 90 days, 12 months). FTL limits are indicative only: your operator controls them.",
        "**Report:** a report for airline selection over a period you choose, with routes, airports, registrations and crew. Copy it as text or download a PDF.",
        "**Yearly summary:** your year in flight (hours, distance, countries, favourite route…) with a shareable image."] },
      { h: "7. Expiries and aircraft", li: [
        "In **Expiries** add licence, medical, LPC/OPC, SEP, ELP, passport, etc. with their expiry date. Alerts at 60, 30, 14, 7 and 1 days.",
        "**Aircraft** lists registrations with type and class. Corrections here are used for new flights."] },
      { h: "8. Signatures", li: [
        "**Your signature:** draw it in **Settings → My signature**. It appears in the EASA PDF next to “I certify that the entries in this logbook are true”.",
        "**Sign one entry:** open it and tap Sign under Signatures. The signer (TRI, examiner, captain) enters name, function, licence and signs with a finger.",
        "**Sign several:** in the logbook, **⋯ → Sign several**, tap the entries and press Sign. Press Cancel to leave selection mode.",
        "Each signature stores a fingerprint of the data. If the entry is changed later the signature is **voided** and shown in red in the logbook and PDF."],
        tip: "Check in your operator's OM-A whether electronic signatures are accepted for training endorsements." },
      { h: "9. Importing data", li: [
        "**Settings → Import → Import CSV.** Works with Excel saved as CSV and most logbooks. Map each field to a column in your file; the app suggests a mapping.",
        "Before importing you get a **review**: new, identical to existing, repeated within the file, and probable duplicates. Identical and probable duplicates are skipped by default; you can change it row by row.",
        "Each import is listed under **Imports** and can be **undone** as a whole.",
        "**Restore JSON backup** recovers a full RIXARLOG backup.",
        "Airline roster import is in development."] },
      { h: "10. Export and backups", li: [
        "**EASA PDF:** AMC1 FCL.050 layout with page totals, previous pages and grand total, signatures and certification. This is the one to print or show at an inspection.",
        "**Excel** and **CSV:** raw data to work with or move to another program.",
        "**Backup (JSON):** your whole logbook, signatures included. Save it to iCloud Drive, Files or your PC with **Save copy**.",
        "The app reminds you when your last backup is older than 30 days. Your data is already in the cloud, but your own copy protects you if you lose account access."] },
      { h: "11. Quality: integrity and history", li: [
        "**Integrity** checks the whole logbook: overlapping flights, probable duplicates, repeated FSTD sessions, future dates and checks that don't add up.",
        "For each warning tap **It's correct** (it disappears) or **Delete the second one** if it really is a duplicate.",
        "**History** is a tamper-proof record of every creation, edit and deletion, with date and previous values. Nobody can change it, not even you."] },
      { h: "12. Notifications", li: [
        "**Settings → Notifications → Enable.** On iPhone it only works with the app installed on the Home Screen (iOS 16.4 or later).",
        "Alerts for recency (14, 7, 3 and 1 days before), expiries, pending training signatures (Mondays) and an old backup. Daily check at 08:00.",
        "Choose which alerts you want and send yourself a test. They are enabled per device."] },
      { h: "13. Settings and account", li: [
        "**Appearance:** Dark cockpit (ECAM), Technical manual (FCOM), Hybrid or Airline red themes, and Spanish or English.",
        "**Hour targets** to track progress on the Dashboard.",
        "**Change password** and **Delete my account**, which permanently removes account, flights and history. Export a backup first.",
        "Settings sections collapse; the app remembers which ones you left open."] },
      { h: "14. EASA and responsibility", li: [
        "RIXARLOG follows FCL.050 and AMC1 FCL.050: times in UTC, EASA columns and totals, and FSTD time kept separate from flight time.",
        "The pilot is responsible for the logbook's content. Review your entries and the Checks and Integrity warnings.",
        "Automatic calculations (night, class, landings) rely on the airport database and the times you enter; if an airport is not found the app tells you and you must fill them in by hand."] },
      { h: "15. FAQ", li: [
        "**My night time differs from my operator's:** some operators use tables or arrival time instead of the sun position en route. Adjust by hand in the automatic calculation block.",
        "**I imported twice:** go to **Settings → Imports** and tap Undo on the repeated import.",
        "**I deleted something by mistake:** **History** shows the previous values so you can log it again.",
        "**Changes don't show on another device:** check your connection; sync is real-time when online.",
        "**Forgot password:** on the sign-in screen, “Forgot your password?”."] },
    ],
  },
};

// Exporta la guía a PDF (A4 vertical) con jsPDF
window.RX_HELP_PDF = async function (lang, version) {
  await window.RXLoad("pdf");
  const G = window.RX_HELP[lang] || window.RX_HELP.es;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18, CW = W - 2 * M, BOT = 280;
  const ACC = [200, 16, 46], INK = [25, 30, 38], MUTED = [110, 118, 128];
  let y = 0;
  // Helvetica (WinAnsi) no tiene → ⇄ ⋯ − : se sustituyen en el PDF
  const pdfSafe = (s) => s.replace(/→/g, ">").replace(/⇄/g, "<->").replace(/⋯/g, "...").replace(/−/g, "-").replace(/[“”]/g, '"');
  const plain = (s) => pdfSafe(s).replace(/\*\*/g, "");
  const newPage = () => { doc.addPage(); y = 22; };
  const need = (hgt) => { if (y + hgt > BOT) newPage(); };
  // texto con **negrita** y salto de línea automático
  function rich(text, x, width, size, lh) {
    doc.setFontSize(size); text = pdfSafe(text);
    const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => ({ b: p.startsWith("**"), s: p.replace(/\*\*/g, "") }));
    const words = []; parts.forEach((p) => p.s.split(/(\s+)/).forEach((w) => { if (w) words.push({ b: p.b, w }); }));
    let lines = [[]], lw = 0;
    for (const w of words) {
      doc.setFont("helvetica", w.b ? "bold" : "normal");
      const ww = doc.getTextWidth(w.w);
      if (lw + ww > width && /\S/.test(w.w) && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      if (!lines[lines.length - 1].length && !/\S/.test(w.w)) continue;
      lines[lines.length - 1].push({ ...w, ww }); lw += ww;
    }
    for (const ln of lines) {
      need(lh); let cx = x;
      for (const w of ln) { doc.setFont("helvetica", w.b ? "bold" : "normal"); doc.text(w.w, cx, y); cx += w.ww; }
      y += lh;
    }
  }
  // portada
  doc.setFillColor(...ACC); doc.rect(0, 0, W, 60, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.text("RIXARLOG", M, 30);
  doc.setFontSize(15); doc.text(G.title, M, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(G.sub + "  ·  v" + version, M, 51);
  y = 76; doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(G.toc, M, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  G.sections.forEach((s) => { doc.text(s.h, M + 2, y); y += 6.5; });
  // contenido
  newPage();
  G.sections.forEach((s, i) => {
    need(20); if (i) y += 3;
    doc.setTextColor(...ACC); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(s.h, M, y); y += 2;
    doc.setDrawColor(...ACC); doc.setLineWidth(0.4); doc.line(M, y, M + CW, y); y += 6;
    doc.setTextColor(...INK);
    if (s.p) { rich(s.p, M, CW, 10.5, 5.2); y += 1.5; }
    s.li.forEach((li) => { need(6); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text("•", M + 1, y); rich(li, M + 6, CW - 6, 10.5, 5.2); y += 1.6; });
    if (s.tip) {
      doc.setFontSize(9.5); const lines = doc.splitTextToSize(plain(s.tip), CW - 8); const hb = lines.length * 4.6 + 5;
      need(hb + 2); doc.setFillColor(245, 240, 241); doc.rect(M, y - 4, CW, hb, "F"); doc.setFillColor(...ACC); doc.rect(M, y - 4, 1.2, hb, "F");
      doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); lines.forEach((l) => { doc.text(l, M + 5, y + 0.5); y += 4.6; }); y += 4; doc.setTextColor(...INK);
    }
  });
  // pie de página
  const n = doc.getNumberOfPages();
  for (let p = 2; p <= n; p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("RIXARLOG v" + version + " · " + G.title, M, 290); doc.text(p + " / " + n, W - M, 290, { align: "right" });
  }
  doc.save("RIXARLOG_" + (lang === "en" ? "User_Guide" : "Guia_de_uso") + "_v" + version + ".pdf");
};
