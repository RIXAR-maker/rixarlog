// RIXARLOG — interfaz
(function () {
  const R = window.RX, IO = window.RXIO, sb = R.sb;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hm = IO.hm, hmB = IO.hmBlank, hh = IO.hhmm, dmy = IO.dmy;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const st = () => (R.profile && R.profile.settings) || {};

  // ---------- idioma, tema, aeropuertos
  let lang = (() => { try { return localStorage.getItem("rx:lang") || (navigator.language || "es").slice(0, 2); } catch { return "es"; } })();
  if (!["es", "en"].includes(lang)) lang = "en";
  const t = (k) => (window.RX_I18N[lang] && window.RX_I18N[lang][k]) || window.RX_I18N.es[k] || k;
  const setLang = (l) => { lang = l; try { localStorage.setItem("rx:lang", l); } catch {} document.documentElement.lang = l; };
  const setTheme = (th) => { document.documentElement.dataset.theme = th; try { localStorage.setItem("rx:theme", th); } catch {}
    const m = $('meta[name="theme-color"]'); if (m) m.content = th === "fcom" ? "#0b2d5b" : "#0a0e13"; };
  try { setTheme(localStorage.getItem("rx:theme") || "ecam"); } catch { setTheme("ecam"); }
  setLang(lang);

  let APT = {}, IATA = {};
  fetch("airports.json").then((r) => r.json()).then((d) => {
    APT = d; for (const [k, v] of Object.entries(d)) if (v[4]) IATA[v[4]] = k;
  }).catch(() => {});
  const icao = (c) => { c = (c || "").toUpperCase().trim(); if (c.length === 3 && IATA[c]) return IATA[c]; return c; };
  const apt = (c) => APT[icao(c)];

  window.RXApp = { t, icao };

  // ---------- toasts / modal
  function toast(msg, kind = "") {
    const d = document.createElement("div"); d.className = "toast " + kind; d.textContent = msg;
    document.body.appendChild(d); setTimeout(() => d.classList.add("show"), 10);
    setTimeout(() => { d.classList.remove("show"); setTimeout(() => d.remove(), 300); }, 2600);
  }
  function modal(html, onMount) {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(o);
    const close = () => o.remove();
    o.addEventListener("click", (e) => { if (e.target === o) close(); });
    $$("[data-close]", o).forEach((b) => b.addEventListener("click", close));
    onMount && onMount(o, close);
    return close;
  }

  function showPrivacy() {
    const c = window.RX_CONFIG.contact;
    modal(`<h3>${t("privacy")}</h3><div class="legal">${t("privacyBody").replace("{contact}", c ? `<a href="mailto:${h(c)}">${h(c)}</a>` : t("privacyNoContact"))}</div>
      <div class="factions"><span class="grow"></span><button class="btn primary" data-close>OK</button></div>`);
  }
  window.RXApp.showPrivacy = showPrivacy;

  // ---------- auth
  const root = $("#app");
  let mode = "login";
  function renderAuth(msg = "", isErr = false) {
    document.body.classList.add("auth");
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card panel">
          <div class="brand big"><img src="icons/icon-192.png" alt=""><div><b>RIXARLOG</b><small>${t("tagline")}</small></div></div>
          ${mode === "recover" ? `
            <label>${t("newPassword")}<input id="pw" type="password" autocomplete="new-password" minlength="8" required></label>
            <button class="btn primary" id="go">${t("savePassword")}</button>` : `
          ${mode === "signup" ? `<label>${t("fullName")}<input id="fn" autocomplete="name" required></label>` : ""}
          <label>${t("email")}<input id="em" type="email" autocomplete="email" required></label>
          ${mode !== "reset" ? `<label>${t("password")}<input id="pw" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" minlength="8" required></label>` : ""}
          <button class="btn primary" id="go">${mode === "signup" ? t("signup") : mode === "reset" ? t("sendReset") : t("login")}</button>
          <div class="auth-links">
            ${mode === "login" ? `<a href="#" data-m="reset">${t("forgot")}</a><a href="#" data-m="signup">${t("noAccount")}</a>` : `<a href="#" data-m="login">${t("haveAccount")}</a>`}
          </div>`}
          <p class="msg ${isErr ? "err" : ""}">${h(msg)}</p>
          <p class="fine">${t("privacyNote")} <a href="#" id="privL">${t("privacy")}</a></p>
          <div class="seg small">${["es", "en"].map((l) => `<button data-l="${l}" class="${l === lang ? "on" : ""}">${l.toUpperCase()}</button>`).join("")}</div>
        </div>
      </div>`;
    $$("[data-m]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); mode = a.dataset.m; renderAuth(); }));
    $$("[data-l]").forEach((b) => b.addEventListener("click", () => { setLang(b.dataset.l); renderAuth(); }));
    $("#privL").addEventListener("click", (e) => { e.preventDefault(); showPrivacy(); });
    const redirect = location.origin + location.pathname;
    $("#go").addEventListener("click", async () => {
      const em = $("#em") && $("#em").value.trim(), pw = $("#pw") && $("#pw").value;
      $("#go").disabled = true;
      try {
        if (mode === "login") {
          const { error } = await sb.auth.signInWithPassword({ email: em, password: pw }); if (error) throw error;
        } else if (mode === "signup") {
          const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: $("#fn").value.trim() }, emailRedirectTo: redirect } });
          if (error) throw error;
          if (!data.session) { mode = "login"; renderAuth(t("checkEmail")); }
        } else if (mode === "reset") {
          const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: redirect }); if (error) throw error;
          renderAuth(t("resetSent"));
        } else if (mode === "recover") {
          const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error;
          mode = "login"; toast(t("savedOk"), "ok"); route();
        }
      } catch (err) { renderAuth(err.message, true); }
    });
    root.addEventListener("keydown", (e) => { if (e.key === "Enter" && $("#go")) $("#go").click(); }, { once: true });
  }

  // ---------- shell
  const NAV = [
    ["dashboard", "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"],
    ["logbook", "M6 2h11a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm1 4v2h9V6H7zm0 4v2h9v-2H7zm0 4v2h6v-2H7z"],
    ["totals", "M4 20h16v2H4zM6 10h3v8H6zm5-6h3v14h-3zm5 9h3v5h-3z"],
    ["reports", "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z"],
    ["docs", "M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-5v-2h3V6h2v7z"],
    ["aircraft", "M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"],
    ["integrity", "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"],
    ["history", "M13 3a9 9 0 00-9 9H1l4 4 4-4H6a7 7 0 112.05 4.95l-1.42 1.42A9 9 0 1013 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z"],
    ["settings", "M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 00-1.7-1L15 3h-4l-.3 2.9a7.6 7.6 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 001.7 1L11 21h4l.3-2.9a7.6 7.6 0 001.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"],
  ];
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  function shell() {
    document.body.classList.remove("auth");
    root.innerHTML = `
      <header class="top">
        <a class="brand" href="#dashboard"><img src="icons/icon-192.png" alt=""><b>RIXARLOG</b></a>
        <div class="who">${h((R.profile && R.profile.full_name) || R.user.email)}</div>
        <div id="sync" class="sync"></div>
        <button class="btn primary add" id="addBtn">+ <span>${t("newEntry")}</span></button>
      </header>
      <nav class="side">${NAV.map(([k, d]) => `<a href="#${k}" data-v="${k}">${ico(d)}<span>${t(k)}</span></a>`).join("")}</nav>
      <main id="view"></main>
      <nav class="tabs">
        ${["dashboard", "logbook"].map((k) => `<a href="#${k}" data-v="${k}">${ico(NAV.find((n) => n[0] === k)[1])}<span>${t(k)}</span></a>`).join("")}
        <a href="#entry/new" class="fab" aria-label="${t("newEntry")}">+</a>
        <a href="#totals" data-v="totals">${ico(NAV[2][1])}<span>${t("totals")}</span></a>
        <a href="#more" data-v="more">${ico("M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z")}<span>${t("more")}</span></a>
      </nav>`;
    $("#addBtn").addEventListener("click", () => (location.hash = "#entry/new"));
    syncBadge();
  }
  function syncBadge() {
    const el = $("#sync"); if (!el) return;
    const n = R.outbox().length;
    const s = !navigator.onLine ? "offline" : R.status;
    const txt = s === "offline" ? (innerWidth < 860 ? t("offlineShort") : t("offline")) : s === "syncing" ? t("syncing") : n ? `${n} ${t("pending")}` : t("synced");
    el.className = "sync " + (s === "offline" || n ? "amber" : s === "syncing" ? "cyan" : "green");
    el.innerHTML = `<i></i><span>${h(txt)}</span>`; el.title = s === "offline" ? t("offline") : "";
  }
  document.addEventListener("rx-status", syncBadge);

  // ---------- router
  let current = "";
  function route() {
    if (!R.user) return;
    if (!$("#view")) shell();
    const [v, arg] = (location.hash.slice(1) || "dashboard").split("/");
    current = v;
    document.body.className = document.body.className.replace(/\bv-\S+/g, "").trim() + " v-" + v;
    $$("nav a[data-v]").forEach((a) => a.classList.toggle("on", a.dataset.v === v));
    $$(".overlay").forEach((o) => o.remove());
    const view = $("#view");
    const fn = VIEWS[v] || VIEWS.dashboard;
    view.innerHTML = ""; window.scrollTo(0, 0);
    fn(view, arg);
  }
  window.addEventListener("hashchange", route);
  let rerenderTimer;
  R.on(() => { clearTimeout(rerenderTimer); rerenderTimer = setTimeout(() => {
    if (["dashboard", "logbook", "totals", "reports", "docs", "aircraft", "integrity"].includes(current) && !document.querySelector(".overlay")) route();
    syncBadge(); }, 150); });
  document.addEventListener("rx-profile", () => { applyProfile(); });

  function applyProfile() {
    const p = R.profile || {};
    if (p.theme) setTheme(p.theme);
    if (p.lang && p.lang !== lang) { setLang(p.lang); shell(); route(); }
  }

  // ---------- componentes
  const tile = (label, val, sub = "", cls = "") => `<div class="tile ${cls}"><small>${h(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ""}</div>`;
  const statusOf = (iso) => {
    if (!iso) return ["muted", "—", null];
    const days = Math.floor((Date.parse(iso + "T00:00:00Z") - Date.parse(todayISO() + "T00:00:00Z")) / 86400000);
    return [days < 0 ? "red" : days <= 30 ? "amber" : days <= 90 ? "amber" : "green", days, days];
  };
  const DEFAULT_TARGETS = { total: 1500, mp: 500, pic: 500, night: 100, ifr: 75 };
  const targets = () => ({ ...DEFAULT_TARGETS, ...(st().targets || {}) });
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const VIEWS = {};

  // ---------- PANEL
  VIEWS.dashboard = (el) => {
    const all = R.totals(R.entries), l28 = R.totals(R.sinceDays(28)), l90 = R.totals(R.sinceDays(90)), l12 = R.totals(R.sinceDays(365));
    const fl = R.entries.filter((r) => r.kind === "FLT"); const last = fl[fl.length - 1];
    const recentTypes = [...new Set(fl.filter((r) => r.date >= new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10)).map((r) => r.ac_type))].filter(Boolean);
    const tg = targets();
    const prog = [["total", t("totalFlight"), all.total_min], ["mp", "Multi-pilot", all.mp_min], ["pic", "PIC", all.pic_min], ["night", t("night"), all.night_min], ["ifr", "IFR", all.ifr_min]];
    const docs = R.documents.filter((d) => d.expires).map((d) => [d, statusOf(d.expires)]).sort((a, b) => a[1][1] - b[1][1]).slice(0, 6);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    let dismissed = false; try { dismissed = localStorage.getItem("rx:installDismissed") === "1"; } catch {}
    el.innerHTML = `
      ${isIOS && !standalone && !dismissed ? `<div class="panel install"><div><b>${t("installTitle")}</b><p class="fine">${t("installHint")}</p></div><button class="btn small" id="instX">✕</button></div>` : ""}
      ${(() => { const lb = lastBackup(); if (!R.entries.length || (lb && lb.days < 30)) return "";
        return `<div class="panel install"><div><b>${lb ? t("backupOld").replace("{n}", lb.days) : t("backupNever")}</b><p class="fine">${t("backupHint")}</p>
          <div class="btnrow"><button class="btn small primary" id="bkDev">${t("backupDevice")}</button><a class="btn small" href="#settings">${t("backupSettings")}</a></div></div></div>`; })()}
      ${(() => { const n = openIssues().filter((x) => x.type !== "check").length; return n ? `<a class="panel install alert" href="#integrity"><div><b>${n} ${t("issuesOpen")}</b><p class="fine">${t("issuesHint")}</p></div><span class="chev">›</span></a>` : ""; })()}
      ${!R.entries.length ? `<div class="panel hero"><h2>${t("welcome")}</h2><p>${t("onboarding")}</p><p class="fine">${t("installHint")}</p>
        <a class="btn primary" href="#settings">${t("settings")}</a> <a class="btn" href="#entry/new">${t("newEntry")}</a></div>` : ""}
      <section class="tiles">
        ${tile(t("totalFlight"), hm(all.total_min), `${all.n} ${t("sectors")}`, "green")}
        ${tile("PIC", hm(all.pic_min), all.picus_min ? "PICUS " + hm(all.picus_min) : "")}
        ${tile("Multi-pilot", hm(all.mp_min), `${t("cop")} ${hm(all.cop_min)}`)}
        ${tile("FSTD", hm(all.fstd_min), `${all.nFstd} ${t("sessions").toLowerCase()}`, "cyan")}
        ${tile(t("last28"), hm(l28.total_min), "", "")}
        ${tile(t("last90"), hm(l90.total_min), `${l90.ldg_day + l90.ldg_night} ldg`)}
        ${tile(t("last12"), hm(l12.total_min), "")}
        ${tile(t("lastFlight"), last ? dmy(last.date) : "—", last ? h(`${last.dep}–${last.arr} · ${last.ac_type}`) : "")}
      </section>
      <section class="grid2">
        <div class="panel"><h3>${t("hoursByMonth")}</h3><div class="chart"><canvas id="cMonth"></canvas></div></div>
        <div class="panel"><h3>${t("recency")}</h3><p class="fine">${t("recencyTxt")}</p>
          ${recentTypes.length ? recentTypes.map((ty) => { const until = R.recency(ty); const [c, d] = statusOf(until);
            return `<div class="row-status"><span class="dot ${c}"></span><b>${h(ty)}</b><span>${until ? (d < 0 ? t("expired") + " " + dmy(until) : t("validUntil") + " " + dmy(until) + ` · ${d} ${t("daysLeft")}`) : t("expired")}</span></div>`; }).join("") : `<p class="muted">—</p>`}
          <h3 class="mt">${t("docs")}</h3>
          ${docs.length ? docs.map(([d, [c, n]]) => `<div class="row-status"><span class="dot ${c}"></span><b>${h(d.kind)}</b><span>${h(d.name || "")} · ${dmy(d.expires)} · ${n < 0 ? t("expired") : n + " " + t("daysLeft")}</span></div>`).join("")
            : `<p class="muted">${t("noDocs")}</p><a class="btn small" href="#docs">${t("addDoc")}</a>`}
        </div>
      </section>
      <section class="grid2">
        <div class="panel"><h3>${t("milestones")}</h3>
          ${prog.map(([k, l, v]) => { const p = Math.min(100, (v / 60) / tg[k] * 100);
            return `<div class="prog"><div><b>${h(l)}</b><span>${hm(v)} / ${tg[k]} h</span></div><div class="bar"><i style="width:${p.toFixed(1)}%" class="${p >= 100 ? "done" : ""}"></i></div></div>`; }).join("")}
        </div>
        <div class="panel"><h3>${t("byType")}</h3><div class="chart"><canvas id="cType"></canvas></div></div>
      </section>`;
    const bk = $("#bkDev"); if (bk) bk.addEventListener("click", saveDevice);
    const ix = $("#instX"); if (ix) ix.addEventListener("click", () => { try { localStorage.setItem("rx:installDismissed", "1"); } catch {} ix.parentElement.remove(); });
    // gráficos
    if (!window.Chart) return;
    const months = []; const d0 = new Date(); d0.setUTCDate(1);
    for (let i = 23; i >= 0; i--) { const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - i, 1)); months.push(d.toISOString().slice(0, 7)); }
    const by = (f) => months.map((m) => R.sum(R.entries.filter((r) => r.date && r.date.startsWith(m)), f) / 60);
    Chart.defaults.font.family = css("--font"); Chart.defaults.color = css("--muted");
    const grid = { color: css("--line") };
    new Chart($("#cMonth"), { type: "bar", data: { labels: months.map((m) => m.slice(5) + "/" + m.slice(2, 4)), datasets: [
      { label: "PIC", data: by("pic_min"), backgroundColor: css("--green"), stack: "f" },
      { label: t("cop"), data: by("cop_min"), backgroundColor: css("--cyan"), stack: "f" },
      { label: t("dual"), data: by("dual_min"), backgroundColor: css("--amber"), stack: "f" },
      { label: "FSTD", data: by("fstd_min"), backgroundColor: css("--magenta"), stack: "s" }] },
      options: { maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10 } } }, scales: { x: { stacked: true, grid, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: innerWidth < 600 ? 6 : 12 } }, y: { stacked: true, grid, title: { display: true, text: "h" } } } } });
    const types = [...R.groupBy(R.entries.filter((r) => r.kind === "FLT"), (r) => r.ac_type)].map(([k, rows]) => [k, R.sum(rows, "total_min") / 60]).sort((a, b) => b[1] - a[1]);
    new Chart($("#cType"), { type: "bar", data: { labels: types.map((x) => x[0]), datasets: [{ label: "h", data: types.map((x) => x[1]), backgroundColor: css("--cyan") }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid }, y: { grid: { display: false } } } } });
  };

  // ---------- LIBRO
  let logFilter = { kind: "all", q: "", year: "", limit: 150 };
  VIEWS.logbook = (el) => {
    const years = [...new Set(R.entries.map((r) => r.date.slice(0, 4)))].sort().reverse();
    el.innerHTML = `
      <div class="toolbar panel">
        <div class="seg">${[["all", t("all")], ["FLT", t("flights")], ["FSTD", "FSTD"]].map(([k, l]) => `<button data-k="${k}" class="${logFilter.kind === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <select id="yr" aria-label="${t("year")}"><option value="">${t("year")}: ${t("all").toLowerCase()}</option>${years.map((y) => `<option ${y === logFilter.year ? "selected" : ""}>${y}</option>`).join("")}</select>
        <input id="q" type="search" placeholder="${t("search")}" value="${h(logFilter.q)}">
        <button class="btn" id="pdfBtn">PDF EASA</button>
      </div>
      <div id="list"></div>`;
    const draw = () => {
      const q = logFilter.q.toLowerCase();
      let rows = R.entries.filter((r) => (logFilter.kind === "all" || r.kind === logFilter.kind) && (!logFilter.year || r.date.startsWith(logFilter.year)) &&
        (!q || [dmy(r.date), r.dep, r.arr, r.ac_type, r.registration, r.pic_name, r.remarks, r.fstd_type].join(" ").toLowerCase().includes(q)));
      const n = rows.length; const allRows = rows; rows = rows.slice().reverse().slice(0, logFilter.limit);
      const mtot = new Map(); for (const r of allRows) { const k = r.date.slice(0, 7); const o = mtot.get(k) || { f: 0, s: 0, n: 0 }; o.f += r.total_min || 0; o.s += r.fstd_min || 0; o.n++; mtot.set(k, o); }
      const mlabel = (k) => new Date(k + "-01T00:00:00Z").toLocaleDateString(lang, { month: "long", year: "numeric", timeZone: "UTC" });
      const msum = (k) => { const o = mtot.get(k); return `<b>${hm(o.f)}</b>${o.s ? ` · FSTD ${hm(o.s)}` : ""} · ${o.n}`; };
      const withHeads = (fn, headFn) => { let last = ""; return rows.map((r) => { const k = r.date.slice(0, 7); const hd = k !== last ? headFn(k) : ""; last = k; return hd + fn(r); }).join(""); };
      $("#list").innerHTML = !R.entries.length ? `<div class="panel muted">${t("noEntries")}</div>` : `
        <table class="log">
          <thead><tr><th>${t("date")}</th><th>${t("dep")}</th><th>${t("arr")}</th><th>${t("type")}</th><th>${t("reg")}</th><th>${t("total")}</th>
            <th>${t("role")}</th><th>${t("picName")}</th><th>${t("night")}</th><th>IFR</th><th>Ldg</th><th>${t("remarks")}</th><th></th></tr></thead>
          <tbody>${withHeads(rowHtml, (k) => `<tr class="mhead"><td colspan="13"><span>${h(mlabel(k))}</span><span>${msum(k)}</span></td></tr>`)}</tbody></table>
        <div class="cards">${withHeads(cardHtml, (k) => `<div class="mhead"><span>${h(mlabel(k))}</span><span>${msum(k)}</span></div>`)}</div>
        ${n > rows.length ? `<button class="btn wide" id="more">${t("loadMore")} (${rows.length}/${n})</button>` : `<p class="fine center">${n} ${t("entries")}</p>`}`;
      $$("[data-id]", el).forEach((x) => x.addEventListener("click", () => (location.hash = "#entry/" + x.dataset.id)));
      const m = $("#more"); if (m) m.addEventListener("click", () => { logFilter.limit += 300; draw(); });
    };
    $$(".seg button", el).forEach((b) => b.addEventListener("click", () => { logFilter.kind = b.dataset.k; VIEWS.logbook(el); }));
    $("#yr").addEventListener("change", (e) => { logFilter.year = e.target.value; draw(); });
    $("#q").addEventListener("input", (e) => { logFilter.q = e.target.value; draw(); });
    $("#pdfBtn").addEventListener("click", () => IO.exportPdf());
    draw();
  };
  const roleOf = (r) => r.kind === "FSTD" ? "FSTD" : r.instr_min ? "INS" : r.picus ? "PICUS" : r.pic_min ? "PIC" : r.cop_min ? "COP" : r.dual_min ? "DUAL" : "—";
  const chk = (r) => { const e = R.checks(r); return e.length ? `<span class="warn" title="${h(e.map(t).join(" · "))}">!</span>` : `<span class="okmark">✓</span>`; };
  function rowHtml(r) {
    if (r.kind === "FSTD") return `<tr data-id="${r.id}" class="fstd"><td>${dmy(r.date)}</td><td colspan="4"><b>FSTD</b> ${h(r.fstd_type || "")}</td><td class="num">${hm(r.fstd_min)}</td><td>FSTD</td><td colspan="4"></td><td class="rem">${h(r.remarks || "")}</td><td>${chk(r)}</td></tr>`;
    return `<tr data-id="${r.id}"><td>${dmy(r.date)}</td><td>${h(r.dep || "")} <small>${hh(r.off_time)}</small></td><td>${h(r.arr || "")} <small>${hh(r.on_time)}</small></td>
      <td>${h(r.ac_type || "")}</td><td>${h(r.registration || "")}</td><td class="num">${hm(r.total_min)}</td><td><span class="role ${roleOf(r)}">${roleOf(r)}</span></td>
      <td>${h(r.pic_name || "")}</td><td class="num">${hmB(r.night_min)}</td><td class="num">${hmB(r.ifr_min)}</td><td class="num">${(r.ldg_day || 0) + (r.ldg_night || 0) || ""}</td>
      <td class="rem">${h(r.remarks || "")}</td><td>${chk(r)}</td></tr>`;
  }
  function cardHtml(r) {
    if (r.kind === "FSTD") return `<div class="card fstd" data-id="${r.id}"><div class="c1"><b>${dmy(r.date)}</b><span class="role FSTD">FSTD</span><b class="num">${hm(r.fstd_min)}</b></div>
      <div class="c2">${h(r.fstd_type || "")}</div><div class="c3">${h(r.remarks || "")}</div></div>`;
    return `<div class="card" data-id="${r.id}"><div class="c1"><b>${dmy(r.date)}</b><span class="route">${h(r.dep || "")} → ${h(r.arr || "")}</span><b class="num">${hm(r.total_min)}</b></div>
      <div class="c2"><span>${h(r.ac_type || "")} · ${h(r.registration || "")}</span><span class="role ${roleOf(r)}">${roleOf(r)}</span>${chk(r)}</div>
      <div class="c3">${hh(r.off_time)}–${hh(r.on_time)} · ${h(r.pic_name || "")}${r.night_min ? " · ☾ " + hm(r.night_min) : ""}${r.ifr_min ? " · IFR " + hm(r.ifr_min) : ""}</div></div>`;
  }

  // ---------- FORMULARIO
  VIEWS.entry = (el, id) => {
    const isNew = !id || id === "new";
    const old = isNew ? null : R.entries.find((x) => x.id === id);
    if (!isNew && !old) { el.innerHTML = `<div class="panel">404</div>`; return; }
    const S0 = st();
    const lastF = [...R.entries].reverse().find((x) => x.kind === "FLT");
    let draft = null; if (isNew) { try { draft = JSON.parse(sessionStorage.getItem("rx:draft") || "null"); sessionStorage.removeItem("rx:draft"); } catch {} }
    const r = old ? { ...old } : { kind: "FLT", date: todayISO(), dep: lastF ? lastF.arr : (R.profile && R.profile.home_base) || "", ldg_day: 0, ldg_night: 0, pf: S0.defPf !== false, ...(draft || {}) };
    const roleFrom = (x) => x.instr_min ? "instr" : x.picus ? "pic" : x.pic_min ? "pic" : x.cop_min ? "cop" : x.dual_min ? "dual" : null;
    let role = old ? (roleFrom(old) || S0.defRole || "pic") : (draft && draft.role) || S0.defRole || "pic";
    let picus = !!r.picus, ifrFull = old ? (old.ifr_min > 0 && old.ifr_min === old.total_min) : S0.defIfr !== false;
    let manual = old ? (R.checks(old).length === 0 && (([old.pic_min, old.cop_min, old.dual_min, old.instr_min].filter(Boolean).length > 1) || (old.ifr_min && old.ifr_min !== old.total_min))) : false;
    let nightManual = false;
    const regs = R.aircraft.map((a) => a.registration);
    const names = [...new Set(R.entries.map((x) => x.pic_name).filter(Boolean))];
    const fstdTypes = [...new Set(R.entries.map((x) => x.fstd_type).filter(Boolean))];
    el.innerHTML = `
      <form class="panel form" id="f" autocomplete="off">
        <div class="fhead"><h2>${isNew ? t("newEntry") : t("editEntry")}</h2>
          <div class="seg">${["FLT", "FSTD"].map((k) => `<button type="button" data-kind="${k}" class="${r.kind === k ? "on" : ""}">${k === "FLT" ? t("flight") : "FSTD"}</button>`).join("")}</div></div>
        <div id="fbody"></div>
        <div class="checks" id="checks"></div>
        <div class="factions">
          ${!isNew ? `<button type="button" class="btn danger" id="del">${t("del")}</button>` : ""}
          <span class="grow"></span>
          <button type="button" class="btn" id="cancel">${t("cancel")}</button>
          ${isNew ? `<button type="submit" class="btn" data-next="return" id="saveRet" title="${t("saveReturn")}">${t("saveReturn")}</button>` : `<button type="submit" class="btn" data-next="dup">${t("duplicate")}</button>`}
          <button type="submit" class="btn primary">${t("save")}</button>
        </div>
      </form>
      <datalist id="dl-reg">${regs.map((x) => `<option value="${h(x)}">`).join("")}</datalist>
      <datalist id="dl-names">${names.map((x) => `<option value="${h(x)}">`).join("")}</datalist>
      <datalist id="dl-fstd">${fstdTypes.map((x) => `<option value="${h(x)}">`).join("")}</datalist>`;
    const body = $("#fbody");
    const v = (n) => { const x = $(`[name="${n}"]`, el); return x ? x.value.trim() : ""; };
    const setV = (n, val) => { const x = $(`[name="${n}"]`, el); if (x && document.activeElement !== x) x.value = val ?? ""; };
    const durIn = (n, label, val, extra = "") => `<label>${label}<input name="${n}" inputmode="numeric" placeholder="h:mm" value="${val ? hm(val) : ""}" ${extra}></label>`;
    function drawBody() {
      if (r.kind === "FSTD") {
        body.innerHTML = `<div class="g3">
          <label>${t("date")}<input type="date" name="date" value="${r.date}" required></label>
          <label>${t("fstdType")}<input name="fstd_type" list="dl-fstd" value="${h(r.fstd_type || "")}" placeholder="FFS A320 · ES-1A-040"></label>
          ${durIn("fstd_min", t("fstdTime"), r.fstd_min)}</div>
          <label>${t("remarks")}<textarea name="remarks" rows="3">${h(r.remarks || "")}</textarea></label>
          <p class="fine">${t("notFlightTime")}</p>`;
      } else {
        body.innerHTML = `
          <div class="g4">
            <label class="fspan">${t("date")} <small>UTC</small><input type="date" name="date" value="${r.date}" required></label>
            <label>${t("reg")}<input name="registration" list="dl-reg" value="${h(r.registration || "")}" style="text-transform:uppercase" required></label>
            <label>${t("type")}<input name="ac_type" value="${h(r.ac_type || "")}" style="text-transform:uppercase"></label>
            <label>${t("class")}<select name="cls"><option value="SE">SP SE</option><option value="ME">SP ME</option><option value="MP">MP</option></select></label>
          </div>
          <p class="hint" id="newAc" hidden>${t("newAircraft")}</p>
          <div class="g4">
            <label>${t("dep")} <button type="button" class="mini" id="swap" title="${t("swap")}">⇄</button><input name="dep" value="${h(r.dep || "")}" maxlength="4" style="text-transform:uppercase" placeholder="ICAO"><small class="apt" id="depN"></small></label>
            <label>${t("off")} <button type="button" class="mini" data-now="off_time">${t("now")}</button><input name="off_time" class="tm" inputmode="numeric" maxlength="5" placeholder="hh:mm" value="${hh(r.off_time)}"></label>
            <label>${t("arr")}<input name="arr" value="${h(r.arr || "")}" maxlength="4" style="text-transform:uppercase" placeholder="ICAO"><small class="apt" id="arrN"></small></label>
            <label>${t("on")} <button type="button" class="mini" data-now="on_time">${t("now")}</button><input name="on_time" class="tm" inputmode="numeric" maxlength="5" placeholder="hh:mm" value="${hh(r.on_time)}"></label>
          </div>
          <div class="g4">
            ${durIn("total_min", t("total") + ` <small class="auto">${t("auto")}</small>`, r.total_min)}
            <label>${t("role")}<select name="role">${[["pic", "PIC"], ["cop", t("cop")], ["dual", t("dual")], ["instr", t("instr")]].map(([k, l]) => `<option value="${k}" ${role === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
            <label>${t("picName")}<input name="pic_name" list="dl-names" value="${h(r.pic_name || "")}" placeholder="${role === "pic" ? "SELF" : t("picNamePh")}"></label>
            <div class="toggles">
              <label class="tg"><input type="checkbox" name="picus" ${picus ? "checked" : ""}> PICUS</label>
              <label class="tg"><input type="checkbox" name="pf" ${r.pf ? "checked" : ""}> PF</label>
              <label class="tg"><input type="checkbox" name="ifrFull" ${ifrFull ? "checked" : ""}> IFR</label>
            </div>
          </div>
          <div class="g6">
            ${durIn("night_min", t("night") + ` <small class="auto" id="nAuto">${t("auto")}</small>`, r.night_min)}
            ${durIn("ifr_min", "IFR", r.ifr_min)}
            <label>${t("toDay")}<input name="to_day" type="number" min="0" value="${r.to_day || 0}"></label>
            <label>${t("toNight")}<input name="to_night" type="number" min="0" value="${r.to_night || 0}"></label>
            <label>${t("ldgDay")}<input name="ldg_day" type="number" min="0" value="${r.ldg_day || 0}"></label>
            <label>${t("ldgNight")}<input name="ldg_night" type="number" min="0" value="${r.ldg_night || 0}"></label>
          </div>
          <details ${manual ? "open" : ""} id="man"><summary>${t("manual")}</summary>
            <div class="g7">
              ${durIn("se_min", "SP SE", r.se_min)}${durIn("me_min", "SP ME", r.me_min)}${durIn("mp_min", "MP", r.mp_min)}
              ${durIn("pic_min", "PIC", r.pic_min)}${durIn("cop_min", t("cop"), r.cop_min)}${durIn("dual_min", t("dual"), r.dual_min)}${durIn("instr_min", t("instr"), r.instr_min)}
            </div></details>
          <label>${t("remarks")}<textarea name="remarks" rows="2">${h(r.remarks || "")}</textarea></label>
          <p class="fine" id="nightInfo"></p>`;
        const ac = R.aircraft.find((a) => a.registration === r.registration);
        $('[name="cls"]', el).value = ac ? ac.class : r.mp_min ? "MP" : r.me_min ? "ME" : "SE";
      }
      bind();
      compute(false);
    }
    const P = (n) => IO.parseDur(v(n));
    const tm = (x) => { x = (x || "").replace(/[^0-9:]/g, ""); let m = x.match(/^(\d{1,2}):(\d{2})$/) || (x.length === 4 && !x.includes(":") ? [0, x.slice(0, 2), x.slice(2)] : null);
      if (!m) return null; const H = Number(m[1]), M = Number(m[2]); return H < 24 && M < 60 ? String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0") : null; };
    function compute(fromUser = true) {
      if (r.kind === "FSTD") { r.fstd_type = v("fstd_type"); r.fstd_min = P("fstd_min"); r.date = v("date"); r.remarks = v("remarks"); showChecks(); return; }
      const g = (n) => $(`[name="${n}"]`, el);
      r.date = v("date"); r.registration = v("registration").toUpperCase(); r.dep = icao(v("dep")); r.arr = icao(v("arr"));
      r.off_time = tm(v("off_time")); r.on_time = tm(v("on_time")); r.pic_name = v("pic_name"); r.remarks = v("remarks");
      // aeronave
      const ac = R.aircraft.find((a) => a.registration === r.registration);
      $("#newAc").hidden = !r.registration || !!ac;
      if (ac && fromUser && document.activeElement === g("registration")) { setV("ac_type", ac.ac_type); g("cls").value = ac.class; }
      r.ac_type = v("ac_type").toUpperCase();
      const cls = g("cls").value;
      // tiempo total
      if (r.off_time && r.on_time) {
        const b = ((R.toMin(r.on_time) - R.toMin(r.off_time)) % 1440 + 1440) % 1440;
        if (document.activeElement !== g("total_min")) setV("total_min", hm(b));
      }
      r.total_min = P("total_min");
      role = g("role").value; picus = g("picus").checked;
      g("pic_name").placeholder = role === "pic" && !picus ? "SELF" : t("picNamePh"); r.pf = g("pf").checked; ifrFull = g("ifrFull").checked;
      if (role === "pic" && !r.pic_name && document.activeElement !== g("pic_name")) { /* SELF por defecto */ }
      const man = $("#man").open;
      if (!man) {
        for (const c of ["se", "me", "mp"]) r[c + "_min"] = cls.toLowerCase() === c ? r.total_min : 0;
        for (const c of ["pic", "cop", "dual", "instr"]) r[c + "_min"] = 0;
        if (role === "instr") { r.pic_min = r.total_min; r.instr_min = r.total_min; }
        else if (picus) r.pic_min = r.total_min;
        else r[role + "_min"] = r.total_min;
        for (const c of ["se", "me", "mp", "pic", "cop", "dual", "instr"]) setV(c + "_min", hmB(r[c + "_min"]));
      } else for (const c of ["se", "me", "mp", "pic", "cop", "dual", "instr"]) r[c + "_min"] = P(c + "_min");
      r.picus = picus;
      if (ifrFull && document.activeElement !== g("ifr_min")) setV("ifr_min", hmB(r.total_min));
      if (!ifrFull && fromUser && document.activeElement === g("ifrFull")) setV("ifr_min", "");
      r.ifr_min = P("ifr_min");
      // noche y aterrizajes automáticos
      const A = apt(r.dep), B = apt(r.arr);
      $("#depN").textContent = A ? A[0] : r.dep && r.dep.length === 4 ? "?" : "";
      $("#arrN").textContent = B ? B[0] : r.arr && r.arr.length === 4 ? "?" : "";
      const info = $("#nightInfo");
      if (A && B && r.date && r.off_time && r.on_time) {
        const n = RXSun.nightCalc(r.date, hh(r.off_time), hh(r.on_time), [A[1], A[2]], [B[1], B[2]]);
        if (n && !nightManual) {
          setV("night_min", hmB(n.night));
          if (r.pf && document.activeElement !== g("ldg_day") && document.activeElement !== g("ldg_night")) {
            setV("ldg_day", n.ldgNight ? 0 : 1); setV("ldg_night", n.ldgNight ? 1 : 0);
            setV("to_day", n.toNight ? 0 : 1); setV("to_night", n.toNight ? 1 : 0);
          }
          if (!r.pf && fromUser && document.activeElement === g("pf")) { setV("ldg_day", 0); setV("ldg_night", 0); setV("to_day", 0); setV("to_night", 0); }
        }
        info.textContent = t("nightAuto") + (nightManual ? " (manual)" : "");
      } else info.textContent = (r.dep && r.arr && (!A || !B)) ? t("unknownApt") : t("utcNote");
      $("#nAuto").style.display = nightManual ? "none" : "";
      r.night_min = P("night_min");
      for (const n of ["ldg_day", "ldg_night", "to_day", "to_night"]) r[n] = parseInt(v(n), 10) || 0;
      if (!r.pic_name && role === "pic" && !picus) r.pic_name = "SELF";
      showChecks();
    }
    function showChecks() {
      const e = R.checks(r);
      const ov = r.kind === "FLT" ? RXInt.overlapsWith({ ...r, id }, R.entries) : [];
      $("#checks").innerHTML = ov.map((x) => `<span class="chip red">${t("overlapWith")} ${h(desc(x))}</span>`).join("") +
        (e.length ? e.map((k) => `<span class="chip amber">${t(k)}</span>`).join("") : `<span class="chip green">${t("checks")}: ${t("ok")}</span>`);
    }
    function bind() {
      $$("input,select,textarea", body).forEach((x) => {
        x.addEventListener("input", () => { if (x.name === "night_min") nightManual = true; compute(true); });
        x.addEventListener("change", () => compute(true));
      });
      const man = $("#man"); if (man) man.addEventListener("toggle", () => compute(true));
      $$('[name="dep"],[name="arr"]', body).forEach((x) => x.addEventListener("blur", () => { x.value = icao(x.value); compute(true); }));
      $$(".tm", body).forEach((x) => {
        x.addEventListener("blur", () => { const v2 = tm(x.value); if (v2) x.value = v2; compute(true); });
        x.addEventListener("input", () => { if (/^\d{4}$/.test(x.value)) { x.value = x.value.slice(0, 2) + ":" + x.value.slice(2); compute(true); } });
      });
      $$("[data-now]", body).forEach((b) => b.addEventListener("click", (ev) => { ev.preventDefault(); const d = new Date();
        $(`[name="${b.dataset.now}"]`, el).value = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
        if (!$('[name="date"]', el).value) $('[name="date"]', el).value = d.toISOString().slice(0, 10); compute(true); }));
      const sw = $("#swap"); if (sw) sw.addEventListener("click", (ev) => { ev.preventDefault(); const a = $('[name="dep"]', el), b2 = $('[name="arr"]', el); [a.value, b2.value] = [b2.value, a.value]; compute(true); });
      $$('[name$="_min"]', body).forEach((x) => x.addEventListener("blur", () => { if (x.value.trim()) x.value = hm(IO.parseDur(x.value)); }));
    }
    $$("[data-kind]", el).forEach((b) => b.addEventListener("click", () => { r.kind = b.dataset.kind; $$("[data-kind]", el).forEach((x) => x.classList.toggle("on", x === b)); drawBody(); }));
    $("#cancel").addEventListener("click", () => history.length > 1 ? history.back() : (location.hash = "#logbook"));
    if ($("#del")) $("#del").addEventListener("click", async () => { if (!confirm(t("confirmDel"))) return; await R.remove("entries", id); toast(t("deleted")); location.hash = "#logbook"; });
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault(); compute(false);
      const next = e.submitter && e.submitter.dataset.next;
      const row = {};
      for (const k of R.ENTRY_COLS) if (k in r && !["created_at", "updated_at"].includes(k)) row[k] = r[k];
      if (r.kind === "FSTD") {
        Object.assign(row, { dep: null, arr: null, off_time: null, on_time: null, ac_type: null, registration: null, pic_name: null });
        for (const k of ["se_min","me_min","mp_min","total_min","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min","ldg_day","ldg_night","to_day","to_night"]) row[k] = 0;
        row.picus = false;
      } else {
        row.fstd_type = null; row.fstd_min = 0;
        const cls = $('[name="cls"]', el).value;
        if (row.registration && !R.aircraft.find((a) => a.registration === row.registration) && row.ac_type)
          await R.save("aircraft", { registration: row.registration, ac_type: row.ac_type, class: cls });
      }
      if (!row.date) return;
      await R.save("entries", row);
      toast(t("savedOk"), "ok");
      if (next && r.kind === "FLT") {
        const d = { kind: "FLT", date: row.date, registration: row.registration, ac_type: row.ac_type, pic_name: row.pic_name, picus: row.picus, pf: next === "return" ? !row.pf : row.pf, role };
        if (next === "return") Object.assign(d, { dep: row.arr, arr: row.dep });
        else Object.assign(d, { dep: row.dep, arr: row.arr, remarks: row.remarks });
        try { sessionStorage.setItem("rx:draft", JSON.stringify(d)); } catch {}
        if (location.hash === "#entry/new") route(); else location.hash = "#entry/new";
        return;
      }
      if (next && r.kind === "FSTD") { try { sessionStorage.setItem("rx:draft", JSON.stringify({ kind: "FSTD", date: row.date, fstd_type: row.fstd_type, fstd_min: row.fstd_min })); } catch {}
        if (location.hash === "#entry/new") route(); else location.hash = "#entry/new"; return; }
      location.hash = "#logbook";
    });
    drawBody();
  };

  // ---------- TOTALES
  VIEWS.totals = (el) => {
    const all = R.totals(R.entries);
    const rowT = (l, x) => `<tr><th>${h(l)}</th><td>${hm(x.total_min)}</td><td>${hm(x.pic_min)}</td><td>${hm(x.cop_min)}</td><td>${hm(x.dual_min)}</td><td>${hm(x.mp_min)}</td><td>${hm(x.night_min)}</td><td>${hm(x.ifr_min)}</td><td>${x.ldg_day + x.ldg_night}</td><td>${hm(x.fstd_min)}</td></tr>`;
    const head = `<tr><th></th><th>Total</th><th>PIC</th><th>${t("cop")}</th><th>${t("dual")}</th><th>MP</th><th>${t("night")}</th><th>IFR</th><th>Ldg</th><th>FSTD</th></tr>`;
    const types = [...R.groupBy(R.entries, (r) => r.kind === "FLT" ? r.ac_type : null)].sort((a, b) => R.sum(b[1], "total_min") - R.sum(a[1], "total_min"));
    const years = [...R.groupBy(R.entries, (r) => r.date.slice(0, 4))].sort((a, b) => b[0].localeCompare(a[0]));
    const yStart = todayISO().slice(0, 4) + "-01-01";
    el.innerHTML = `
      <section class="tiles">
        ${tile(t("totalFlight"), hm(all.total_min), "", "green")}${tile("SP SE", hm(all.se_min))}${tile("SP ME", hm(all.me_min))}${tile("Multi-pilot", hm(all.mp_min))}
        ${tile("PIC", hm(all.pic_min), "PICUS " + hm(all.picus_min))}${tile(t("cop"), hm(all.cop_min))}${tile(t("dual"), hm(all.dual_min))}${tile(t("instr"), hm(all.instr_min))}
        ${tile(t("night"), hm(all.night_min))}${tile("IFR", hm(all.ifr_min))}${tile(t("ldgDay") + " / " + t("ldgNight"), all.ldg_day + " / " + all.ldg_night)}${tile("FSTD", hm(all.fstd_min), "", "cyan")}
      </section>
      <div class="panel"><h3>${t("periods")}</h3><div class="tscroll"><table class="tt">${head}
        ${rowT(t("last28"), R.totals(R.sinceDays(28)))}${rowT(t("last90"), R.totals(R.sinceDays(90)))}${rowT(t("last12"), R.totals(R.sinceDays(365)))}
        ${rowT(t("thisYear"), R.totals(R.entries.filter((r) => r.date >= yStart)))}</table></div><p class="fine">${t("ftlNote")}</p></div>
      <div class="panel"><h3>${t("byType")}</h3><div class="tscroll"><table class="tt">${head}${types.map(([k, rows]) => rowT(k, R.totals(rows))).join("")}</table></div></div>
      <div class="panel"><h3>${t("byYear")}</h3><div class="tscroll"><table class="tt">${head}${years.map(([k, rows]) => rowT(k, R.totals(rows))).join("")}</table></div></div>`;
  };

  // ---------- INFORMES
  function selTable() {
    const d = IO.selectionData();
    const L = [[t("totalFlight"), "total_min"], ["Multi-pilot", "mp_min"], ["PIC", "pic_min"], ["PICUS", "picus_min"], [t("cop"), "cop_min"], [t("dual"), "dual_min"],
      ["SP SE", "se_min"], ["SP ME", "me_min"], [t("night"), "night_min"], ["IFR", "ifr_min"], ["FSTD", "fstd_min"]];
    return `<div class="tscroll"><table class="tt sel"><tr><th></th><th>Total</th><th>${t("last12")}</th><th>${t("last90")}</th></tr>
      ${L.map(([l, f]) => `<tr><th>${h(l)}</th><td>${hm(d.all[f])}</td><td>${hm(d.l12[f])}</td><td>${hm(d.l90[f])}</td></tr>`).join("")}
      <tr><th>${t("ldgDay")} / ${t("ldgNight")}</th><td>${d.all.ldg_day} / ${d.all.ldg_night}</td><td>${d.l12.ldg_day} / ${d.l12.ldg_night}</td><td>${d.l90.ldg_day} / ${d.l90.ldg_night}</td></tr></table></div>
      <h4>${t("byType")}</h4><div class="tscroll"><table class="tt sel"><tr><th>${t("type")}</th><th>Total</th><th>PIC</th><th>PICUS</th><th>${t("cop")}</th><th>MP</th><th>Ldg</th></tr>
      ${d.byType.map((r) => `<tr>${r.map((c, i) => i ? `<td>${h(c)}</td>` : `<th>${h(c)}</th>`).join("")}</tr>`).join("")}
      ${d.fstdByType.map((r) => `<tr><th>FSTD ${h(r[0])}</th><td>${r[1]}</td><td colspan="5"></td></tr>`).join("")}</table></div>
      <p class="fine">${t("lastFlight")}: ${d.last ? `${dmy(d.last.date)} · ${h(d.last.ac_type)} · ${h(d.last.registration)}` : "—"}</p>`;
  }
  VIEWS.reports = (el) => {
    const fl = R.entries.filter((r) => r.kind === "FLT");
    const cnt = (keyf) => [...R.groupBy(fl, keyf)].map(([k, rows]) => [k, rows.length, R.sum(rows, "total_min")]).sort((a, b) => b[1] - a[1]);
    const aptCount = new Map();
    for (const r of fl) for (const a of [r.dep, r.arr]) if (a) aptCount.set(a, (aptCount.get(a) || 0) + 1);
    const apts = [...aptCount].sort((a, b) => b[1] - a[1]);
    const routes = cnt((r) => r.dep && r.arr && r.dep !== r.arr ? [r.dep, r.arr].join(" – ") : null).slice(0, 12);
    const regs = cnt((r) => r.registration).slice(0, 12);
    const crew = cnt((r) => r.pic_name && r.pic_name !== "SELF" ? r.pic_name : null).slice(0, 12);
    const countries = new Set(apts.map(([a]) => (apt(a) || [])[3]).filter(Boolean));
    const list = (rows, unit) => `<table class="tt mini">${rows.map(([k, n, m]) => `<tr><th>${h(k)}</th><td>${n} ${unit}</td>${m != null ? `<td>${hm(m)}</td>` : ""}</tr>`).join("")}</table>`;
    el.innerHTML = `
      <div class="panel"><div class="fhead"><h3>${t("selection")}</h3><div><button class="btn" id="cp">${t("copy")}</button> <button class="btn primary" id="sp">${t("printPdf")}</button></div></div>
        ${selTable()}</div>
      <section class="tiles">${tile(t("airports"), apts.length, countries.size + " países", "cyan")}${tile(t("topRoutes"), routes.length ? routes[0][0] : "—")}
        ${tile(t("regs"), new Set(fl.map((r) => r.registration)).size)}${tile(t("type"), new Set(fl.map((r) => r.ac_type)).size)}</section>
      <section class="grid2">
        <div class="panel"><h3>${t("airports")}</h3>${list(apts.slice(0, 15).map(([a, n]) => [`${a} · ${(apt(a) || [""])[0]}`, n, null]), t("visits"))}</div>
        <div class="panel"><h3>${t("topRoutes")}</h3>${list(routes, t("sectors"))}</div>
        <div class="panel"><h3>${t("regs")}</h3>${list(regs, t("sectors"))}</div>
        <div class="panel"><h3>${t("crew")}</h3>${list(crew, t("sectors"))}</div>
      </section>`;
    $("#cp").addEventListener("click", async () => { try { await navigator.clipboard.writeText(IO.selectionText()); toast(t("copied"), "ok"); } catch { toast("✗"); } });
    $("#sp").addEventListener("click", () => IO.selectionPdf());
  };

  // ---------- CADUCIDADES
  const DOC_KINDS = ["Licencia / Licence", "Médico Clase 1", "Médico Clase 2", "Habilitación de tipo (LPC/OPC)", "OPC", "Line check", "IR", "SEP(A)", "MEP(A)",
    "ELP (inglés)", "Formación SEP / Safety", "CRM", "Mercancías peligrosas", "Pasaporte", "Tarjeta de identificación aeroportuaria", "Otro"];
  VIEWS.docs = (el) => {
    const rows = R.documents.slice().sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999"));
    el.innerHTML = `<div class="panel"><div class="fhead"><h3>${t("docs")}</h3><button class="btn primary" id="add">${t("addDoc")}</button></div>
      ${rows.length ? `<div class="doclist">${rows.map((d) => { const [c, n] = statusOf(d.expires);
        return `<div class="docrow" data-d="${d.id}"><span class="dot ${c}"></span><div><b>${h(d.kind)}</b><small>${h(d.name || "")} ${d.ref_number ? "· " + h(d.ref_number) : ""}</small></div>
        <div class="right"><b>${d.expires ? dmy(d.expires) : "—"}</b><small class="${c}">${d.expires ? (n < 0 ? t("expired") : n + " " + t("daysLeft")) : ""}</small></div></div>`; }).join("")}</div>` : `<p class="muted">${t("noDocs")}</p>`}</div>`;
    $("#add").addEventListener("click", () => docForm());
    $$("[data-d]", el).forEach((x) => x.addEventListener("click", () => docForm(R.documents.find((d) => d.id === x.dataset.d))));
  };
  function docForm(d = {}) {
    modal(`<h3>${d.id ? t("docs") : t("addDoc")}</h3>
      <label>${t("docKind")}<input name="kind" list="dl-dk" value="${h(d.kind || "")}" required><datalist id="dl-dk">${DOC_KINDS.map((k) => `<option value="${k}">`).join("")}</datalist></label>
      <label>${t("docName")}<input name="name" value="${h(d.name || "")}"></label>
      <label>${t("docNumber")}<input name="ref_number" value="${h(d.ref_number || "")}"></label>
      <div class="g2"><label>${t("issued")}<input type="date" name="issued" value="${d.issued || ""}"></label><label>${t("expires")}<input type="date" name="expires" value="${d.expires || ""}"></label></div>
      <label>${t("remarks")}<textarea name="notes" rows="2">${h(d.notes || "")}</textarea></label>
      <div class="factions">${d.id ? `<button class="btn danger" id="dd">${t("del")}</button>` : ""}<span class="grow"></span><button class="btn" data-close>${t("cancel")}</button><button class="btn primary" id="ds">${t("save")}</button></div>`,
      (o, close) => {
        const g = (n) => $(`[name="${n}"]`, o).value.trim() || null;
        $("#ds", o).addEventListener("click", async () => { if (!g("kind")) return;
          await R.save("documents", { id: d.id, kind: g("kind"), name: g("name") || "", ref_number: g("ref_number"), issued: g("issued"), expires: g("expires"), notes: g("notes") }); close(); route(); });
        const dd = $("#dd", o); if (dd) dd.addEventListener("click", async () => { if (!confirm(t("del") + "?")) return; await R.remove("documents", d.id); close(); route(); });
      });
  }

  // ---------- AERONAVES
  VIEWS.aircraft = (el) => {
    const fl = R.entries.filter((r) => r.kind === "FLT");
    const rows = R.aircraft.slice().sort((a, b) => a.ac_type.localeCompare(b.ac_type) || a.registration.localeCompare(b.registration));
    el.innerHTML = `<div class="panel"><div class="fhead"><h3>${t("aircraft")}</h3><button class="btn primary" id="add">${t("addAircraft")}</button></div>
      ${rows.length ? `<table class="tt"><tr><th>${t("reg")}</th><th>${t("type")}</th><th>${t("class")}</th><th>${t("sectors")}</th><th>Total</th></tr>
      ${rows.map((a) => { const f = fl.filter((r) => r.registration === a.registration); return `<tr data-a="${a.id}" class="click"><th>${h(a.registration)}</th><td>${h(a.ac_type)}</td><td>${a.class}</td><td>${f.length}</td><td>${hm(R.sum(f, "total_min"))}</td></tr>`; }).join("")}</table>`
      : `<p class="muted">${t("noAircraft")}</p>`}</div>`;
    const form = (a = {}) => modal(`<h3>${t("aircraft")}</h3>
      <label>${t("reg")}<input name="registration" value="${h(a.registration || "")}" style="text-transform:uppercase"></label>
      <label>${t("type")}<input name="ac_type" value="${h(a.ac_type || "")}" style="text-transform:uppercase"></label>
      <label>${t("class")}<select name="class">${["SE", "ME", "MP"].map((c) => `<option ${a.class === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <div class="factions">${a.id ? `<button class="btn danger" id="ad">${t("del")}</button>` : ""}<span class="grow"></span><button class="btn" data-close>${t("cancel")}</button><button class="btn primary" id="as">${t("save")}</button></div>`,
      (o, close) => {
        $("#as", o).addEventListener("click", async () => {
          const reg = $('[name="registration"]', o).value.trim().toUpperCase(), ty = $('[name="ac_type"]', o).value.trim().toUpperCase();
          if (!reg || !ty) return;
          await R.save("aircraft", { id: a.id, registration: reg, ac_type: ty, class: $('[name="class"]', o).value }); close(); route(); });
        const ad = $("#ad", o); if (ad) ad.addEventListener("click", async () => { await R.remove("aircraft", a.id); close(); route(); });
      });
    $("#add").addEventListener("click", () => form());
    $$("[data-a]", el).forEach((x) => x.addEventListener("click", () => form(R.aircraft.find((a) => a.id === x.dataset.a))));
  };

  // ---------- HISTORIAL
  VIEWS.history = async (el) => {
    el.innerHTML = `<div class="panel"><h3>${t("history")}</h3><p class="fine">${t("historyTxt")}</p><div id="hl" class="hist"></div><button class="btn wide" id="hm">${t("loadMore")}</button></div>`;
    let last = null;
    const label = (d) => d ? (d.kind === "FSTD" ? `FSTD ${dmy(d.date)} ${d.fstd_type || ""}` : d.date ? `${dmy(d.date)} ${d.dep || ""}–${d.arr || ""} ${d.registration || ""}` : d.registration || d.kind || d.name || "") : "";
    const diff = (a, b) => !a || !b ? "" : Object.keys(b).filter((k) => !["updated_at", "created_at"].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
      .map((k) => { const f = (x) => x == null ? "∅" : k.endsWith("_min") ? hm(x) : x; return `<code>${h(k)}</code> ${h(f(a[k]))} → <b>${h(f(b[k]))}</b>`; }).join(" · ");
    const load = async () => {
      try {
        const rows = await R.audit(last);
        if (!rows.length) { $("#hm").hidden = true; return; }
        last = rows[rows.length - 1].changed_at;
        $("#hl").insertAdjacentHTML("beforeend", rows.map((x) => `<div class="hrow ${x.action}"><time>${new Date(x.changed_at).toLocaleString(lang)}</time>
          <span class="chip ${x.action === "DELETE" ? "red" : x.action === "INSERT" ? "green" : "amber"}">${x.action === "INSERT" ? t("created") : x.action === "UPDATE" ? t("updated") : t("deleted")}</span>
          <span class="tbl">${h(t("tbl_" + x.table_name))}</span><b>${h(label(x.new_data || x.old_data))}</b>${x.action === "UPDATE" ? `<div class="diff">${diff(x.old_data, x.new_data)}</div>` : ""}</div>`).join(""));
        if (rows.length < 100) $("#hm").hidden = true;
      } catch (e) { $("#hl").innerHTML = `<p class="msg err">${h(e.message)}</p>`; }
    };
    $("#hm").addEventListener("click", load);
    load();
  };

  // ---------- MÁS (móvil)
  VIEWS.more = (el) => {
    el.innerHTML = `<div class="panel menu">${NAV.slice(2).map(([k, d]) => `<a href="#${k}">${ico(d)}<span>${t(k)}</span></a>`).join("")}
      <a href="#" id="lo">${ico("M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4V5z")}<span>${t("logout")}</span></a></div>`;
    $("#lo").addEventListener("click", (e) => { e.preventDefault(); sb.auth.signOut(); });
  };

  // ---------- AJUSTES
  VIEWS.settings = (el) => {
    const p = R.profile || {}; const s = st(); const tg = targets();
    el.innerHTML = `
      <div class="panel"><h3>${t("appearance")}</h3>
        <div class="themes">${["ecam", "fcom", "hybrid"].map((k) => `<button class="theme-card ${(p.theme || "ecam") === k ? "on" : ""}" data-th="${k}"><i class="sw ${k}"><b></b><b></b><b></b></i><span>${t(k)}</span></button>`).join("")}</div>
        <div class="g3">
          <label>${t("language")}<select id="lg"><option value="es">Español</option><option value="en">English</option></select></label>
          <label>${t("pdfRows")}<input id="rpp" type="number" min="10" max="40" value="${p.rows_per_page || 20}"></label>
        </div></div>
      <div class="panel"><h3>${t("pilot")}</h3>
        <div class="g2">
          <label>${t("fullName")}<input id="pn" value="${h(p.full_name || "")}"></label>
          <label>${t("licenceType")}<input id="lt" value="${h(p.licence_type || "")}" placeholder="ATPL(A) / CPL(A)"></label>
          <label>${t("licenceNo")}<input id="ln" value="${h(p.licence_number || "")}" placeholder="ESP.FCL.000…"></label>
          <label>${t("homeBase")}<input id="hb" value="${h(p.home_base || "")}" maxlength="4" style="text-transform:uppercase" placeholder="LEMD"></label>
        </div></div>
      <div class="panel"><h3>${t("defaults")}</h3>
        <div class="g3">
          <label>${t("defRole")}<select id="dr">${[["pic", "PIC"], ["cop", t("cop")], ["dual", t("dual")], ["instr", t("instr")]].map(([k, l]) => `<option value="${k}" ${(s.defRole || "pic") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="tg"><input type="checkbox" id="di" ${s.defIfr !== false ? "checked" : ""}> ${t("defIfr")}</label>
          <label class="tg"><input type="checkbox" id="dp" ${s.defPf !== false ? "checked" : ""}> ${t("defPf")}</label>
        </div>
        <h4>${t("targets")}</h4>
        <div class="g5">${Object.keys(DEFAULT_TARGETS).map((k) => `<label>${k === "total" ? "Total" : k === "mp" ? "MP" : k === "pic" ? "PIC" : k === "night" ? t("night") : "IFR"} (h)<input type="number" min="0" data-tg="${k}" value="${tg[k]}"></label>`).join("")}</div>
        <button class="btn primary" id="saveP">${t("save")}</button></div>
      <div class="panel"><h3>${t("backups")}</h3>
        <p class="fine">${(() => { const lb = lastBackup(); return lb ? `${t("lastBackup")}: ${new Date(lb.at).toLocaleString(lang)} (${lb.days} ${t("daysLeft")})` : t("backupNever"); })()}</p>
        <div class="g3">
          <label class="tg"><input type="checkbox" id="bkOn" ${(s.backup || {}).enabled ? "checked" : ""}> ${t("backupEmail")}</label>
          <label>${t("backupFreq")}<select id="bkFreq"><option value="weekly">${t("weekly")}</option><option value="monthly">${t("monthly")}</option></select></label>
          <label>${t("backupTo")}<input id="bkTo" type="email" placeholder="${h(R.user.email)}" value="${h((s.backup || {}).email || "")}"></label>
        </div>
        <p class="fine">${t("backupInfo")}</p>
        <div class="btnrow"><button class="btn primary" id="bkSave">${t("save")}</button><button class="btn" id="bkNow">${t("backupNow")}</button><button class="btn" id="bkDev2">${t("backupDevice")}</button></div></div>
      <div class="panel"><h3>${t("exportT")}</h3>
        <div class="btnrow"><button class="btn" id="xPdf">${t("exportPdf")}</button><button class="btn" id="xXlsx">${t("exportXlsx")}</button>
          <button class="btn" id="xCsv">${t("exportCsv")}</button><button class="btn" id="xJson">${t("exportJson")}</button></div></div>
      <div class="panel"><h3>${t("importT")}</h3>
        <div class="btnrow"><label class="btn">${t("importCsv")}<input type="file" id="iCsv" accept=".csv,.txt,text/csv" hidden></label>
          <label class="btn">${t("importJson")}<input type="file" id="iJson" accept=".json,application/json" hidden></label></div>
        <p class="fine"><span class="chip amber">beta</span> ${t("importDev")}</p><div id="imp"></div>
        <h4>${t("batches")}</h4><div id="batches" class="fine">…</div></div>
      <div class="panel"><h3>${t("account")}</h3><p class="fine">${h(R.user.email)} · ${t("privacyNote")}</p>
        <div class="btnrow"><button class="btn" id="lo2">${t("logout")}</button><button class="btn danger" id="delAcc">${t("deleteAccount")}</button></div>
        <p class="fine"><a href="#" id="privS">${t("privacy")}</a> · RIXARLOG v${window.RX_CONFIG.version}</p></div>`;
    $("#privS").addEventListener("click", (e) => { e.preventDefault(); showPrivacy(); });
    drawBatches();
    $("#bkFreq").value = (s.backup || {}).freq || "weekly";
    $("#bkSave").addEventListener("click", async () => {
      await R.saveProfile({ settings: { ...st(), backup: { enabled: $("#bkOn").checked, freq: $("#bkFreq").value, email: $("#bkTo").value.trim() || null } } });
      toast(t("savedOk"), "ok"); });
    $("#bkNow").addEventListener("click", (e) => sendBackupNow(e.currentTarget));
    $("#bkDev2").addEventListener("click", saveDevice);
    $("#lg").value = p.lang || lang;
    $$("[data-th]", el).forEach((b) => b.addEventListener("click", async () => { setTheme(b.dataset.th); $$("[data-th]", el).forEach((x) => x.classList.toggle("on", x === b)); await R.saveProfile({ theme: b.dataset.th }); }));
    $("#lg").addEventListener("change", async (e) => { setLang(e.target.value); await R.saveProfile({ lang: e.target.value }); shell(); route(); });
    $("#saveP").addEventListener("click", async () => {
      const targetsNew = {}; $$("[data-tg]", el).forEach((x) => (targetsNew[x.dataset.tg] = Number(x.value) || DEFAULT_TARGETS[x.dataset.tg]));
      await R.saveProfile({ full_name: $("#pn").value.trim(), licence_type: $("#lt").value.trim(), licence_number: $("#ln").value.trim(),
        home_base: icao($("#hb").value), rows_per_page: Math.min(40, Math.max(10, Number($("#rpp").value) || 20)),
        settings: { ...s, defRole: $("#dr").value, defIfr: $("#di").checked, defPf: $("#dp").checked, targets: targetsNew } });
      toast(t("savedOk"), "ok"); shell(); route();
    });
    $("#xPdf").addEventListener("click", () => IO.exportPdf());
    $("#xXlsx").addEventListener("click", () => IO.exportXlsx());
    $("#xCsv").addEventListener("click", () => IO.exportCsv());
    $("#xJson").addEventListener("click", () => IO.exportJson());
    $("#lo2").addEventListener("click", () => sb.auth.signOut());
    $("#delAcc").addEventListener("click", async () => {
      const w = prompt(t("confirmDeleteAccount")); if (!w || !/^(BORRAR|DELETE)$/i.test(w.trim())) return;
      try { await R.deleteAccount(); location.reload(); } catch (e) { alert(e.message); }
    });
    $("#iJson").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text()); if (!d.entries) throw new Error("JSON");
        for (const a of d.aircraft || []) if (!R.aircraft.find((x) => x.registration === a.registration)) await R.save("aircraft", { registration: a.registration, ac_type: a.ac_type, class: a.class, notes: a.notes });
        for (const x of d.documents || []) await R.save("documents", { id: x.id, kind: x.kind, name: x.name, ref_number: x.ref_number, issued: x.issued, expires: x.expires, notes: x.notes });
        const rows = d.entries.map((r) => { const o = {}; for (const k of R.ENTRY_COLS) if (k in r && !["updated_at", "batch_id", "id"].includes(k)) o[k] = r[k]; return o; });
        reviewImport(rows, { filename: f.name, source: "json" });
      } catch (err) { alert(err.message); }
    });
    $("#iCsv").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rows = IO.parseCsv(await f.text()); if (rows.length < 2) return;
      const head = rows[0]; const m = IO.guessMapping(head);
      const fields = IO.FIELDS.filter((x) => x !== "id");
      $("#imp").innerHTML = `<p><b>${h(f.name)}</b> · ${rows.length - 1} ${t("entries")}</p>
        <details ${fields.every((fl) => m[fl] != null) ? "" : "open"}><summary>${t("mapCols")}</summary><div class="mapgrid">${fields.map((fl) => `<label>${fl}<select data-map="${fl}"><option value="">—</option>${head.map((c, i) => `<option value="${i}" ${m[fl] === i ? "selected" : ""}>${h(c)}</option>`).join("")}</select></label>`).join("")}</div></details>
        <label>${t("minutesFmt")}<select id="dm"><option value="auto">h:mm / ${t("decimal")}</option><option value="min">min</option></select></label>
        <div id="prev" class="fine"></div>
        <button class="btn primary" id="go">${t("importRows")}</button>`;
      const build = () => { const map = {}; $$("[data-map]").forEach((s) => (map[s.dataset.map] = s.value === "" ? null : Number(s.value))); return IO.mapRows(rows, map, $("#dm").value); };
      const pv = () => { const b = build(); const bad = b.filter((r) => R.checks(r).length).length; $("#prev").textContent = `${b.length} ${t("entries")} · ${bad} ⚠ · ${b[0] ? desc(b[0]) : ""}`; };
      $$("#imp select").forEach((s) => s.addEventListener("change", pv)); pv();
      $("#go").textContent = t("reviewImport");
      $("#go").addEventListener("click", () => reviewImport(build(), { filename: f.name, source: "csv" }));
    });
  };


  // ---------- importación con revisión y lotes
  const ST = { new: ["green", "impNew"], same: ["muted", "impSame"], filedup: ["red", "impFileDup"], probable: ["amber", "impProbable"], fileprob: ["amber", "impFileProb"] };
  const desc = (r) => r.kind === "FSTD" ? `${dmy(r.date)} · FSTD ${r.fstd_type || ""} · ${hm(r.fstd_min)}` : `${dmy(r.date)} · ${r.dep || ""}→${r.arr || ""} ${hh(r.off_time)}–${hh(r.on_time)} · ${r.registration || ""} · ${hm(r.total_min)}`;
  function reviewImport(rows, meta) {
    if (!navigator.onLine) { alert(t("offline")); return; }
    const C = RXInt.classify(rows, R.entries);
    const count = (k) => C.filter((c) => c.status === k).length;
    const flagged = C.map((c, i) => [c, i]).filter(([c]) => c.status !== "new");
    modal(`<h3>${t("reviewImport")}</h3>
      <div class="impsum">${Object.keys(ST).map((k) => `<div class="${ST[k][0]}"><b>${count(k)}</b><span>${t(ST[k][1])}</span></div>`).join("")}</div>
      ${flagged.length ? `<p class="fine">${t("impHelp")}</p><div class="implist">${flagged.slice(0, 400).map(([c, i]) => `
        <div class="improw ${ST[c.status][0]}"><div><span class="chip ${ST[c.status][0]}">${t(ST[c.status][1])}</span><b>${h(desc(c.row))}</b>
          ${c.match ? `<small>↔ ${h(desc(c.match))}</small>` : ""}</div>
          <select data-i="${i}">${["skip", "keep"].concat(c.status === "probable" ? ["replace"] : []).map((a) => `<option value="${a}" ${c.action === a ? "selected" : ""}>${t("act_" + a)}</option>`).join("")}</select></div>`).join("")}</div>` : ""}
      <div class="factions"><span class="grow"></span><button class="btn" data-close>${t("cancel")}</button><button class="btn primary" id="impGo"></button></div>
      <p class="fine" id="impProg"></p>`, (o, close) => {
      const upd = () => { $$("[data-i]", o).forEach((sel) => (C[sel.dataset.i].action = sel.value));
        const n = C.filter((c) => c.action !== "skip").length, rep = C.filter((c) => c.action === "replace").length;
        $("#impGo", o).textContent = `${t("importRows")} (${n})${rep ? ` · ${rep} ${t("act_replace").toLowerCase()}` : ""}`; $("#impGo", o).disabled = !n; };
      $$("[data-i]", o).forEach((sel) => sel.addEventListener("change", upd)); upd();
      $("#impGo", o).addEventListener("click", async () => {
        $("#impGo", o).disabled = true;
        const take = C.filter((c) => c.action !== "skip");
        try {
          const repl = take.filter((c) => c.action === "replace").map((c) => c.match.id);
          if (repl.length) await R.removeMany(repl);
          for (const [reg, rs] of R.groupBy(take.map((c) => c.row).filter((r) => r.kind === "FLT"), (r) => r.registration))
            if (!R.aircraft.find((a) => a.registration === reg) && rs[0].ac_type) await R.save("aircraft", { registration: reg, ac_type: rs[0].ac_type, class: rs[0].mp_min ? "MP" : rs[0].me_min ? "ME" : "SE" });
          await R.bulkInsert(take.map((c) => c.row), (n, tot) => ($("#impProg", o).textContent = `${n}/${tot}`), meta);
          close(); toast(`${take.length} ${t("imported")}`, "ok"); location.hash = "#logbook";
        } catch (err) { alert(err.message); $("#impGo", o).disabled = false; }
      });
    });
  }
  async function drawBatches() {
    const el = $("#batches"); if (!el) return;
    try {
      const bs = await R.batches();
      if (!bs.length) { el.textContent = "—"; return; }
      el.innerHTML = bs.map((b) => { const live = R.entries.filter((e) => e.batch_id === b.id).length;
        return `<div class="batch"><div><b>${new Date(b.created_at).toLocaleString(lang)}</b><small>${h(b.filename || b.source || "")} · ${b.row_count} ${t("entries")}${b.status === "undone" ? ` · ${t("undone")}` : ` · ${live} ${t("inLog")}`}</small></div>
          ${b.status === "active" && live ? `<button class="btn small danger" data-undo="${b.id}">${t("undo")}</button>` : ""}</div>`; }).join("");
      $$("[data-undo]", el).forEach((bt) => bt.addEventListener("click", async () => {
        const n = R.entries.filter((e) => e.batch_id === bt.dataset.undo).length;
        if (!confirm(`${t("undoConfirm")} (${n})`)) return;
        bt.disabled = true; try { await R.undoBatch(bt.dataset.undo); toast(t("undone"), "ok"); drawBatches(); } catch (e) { alert(e.message); bt.disabled = false; }
      }));
    } catch (e) { el.textContent = e.message; }
  }

  // ---------- COPIAS DE SEGURIDAD
  const lastBackup = () => {
    let l = null; try { l = localStorage.getItem(`rx:${R.user.id}:lastExport`); } catch {}
    const srv = R.profile && R.profile.last_backup_at;
    const d = [l, srv].filter(Boolean).sort().pop();
    return d ? { at: d, days: Math.floor((Date.now() - Date.parse(d)) / 864e5) } : null;
  };
  async function sendBackupNow(btn) {
    if (!navigator.onLine) { alert(t("offline")); return; }
    btn && (btn.disabled = true);
    try {
      const { data, error } = await sb.functions.invoke("backup-email", { body: {} });
      if (error) { let m = error.message; try { const j = await error.context.json(); m = j.error || m; } catch {} throw new Error(m); }
      if (data && data.error) throw new Error(data.error);
      R.profile.last_backup_at = new Date().toISOString();
      toast(t("backupSent") + " " + data.sent[0].email, "ok");
    } catch (e) { alert(t("backupFail") + "\n" + e.message); }
    btn && (btn.disabled = false);
  }
  async function saveDevice() { const r = await IO.saveToDevice(); if (r !== "cancel") toast(t("savedOk"), "ok"); route(); }

  // ---------- INTEGRIDAD
  const pairKey = (rows) => rows.map((r) => r.id).sort().join("+");
  const reviewed = () => new Set(st().reviewed || []);
  const openIssues = () => { const rv = reviewed(); return RXInt.issues(R.entries).filter((x) => x.type === "check" || x.type === "future" ? true : !rv.has(pairKey(x.rows))); };
  VIEWS.integrity = (el) => {
    const all = RXInt.issues(R.entries); const rv = reviewed();
    const groups = [["overlap", "red"], ["probable", "amber"], ["fstddup", "amber"], ["future", "amber"], ["check", "muted"]];
    const open = all.filter((x) => !["overlap", "probable", "fstddup"].includes(x.type) || !rv.has(pairKey(x.rows)));
    const done = all.length - open.length;
    el.innerHTML = `<div class="panel"><h3>${t("integrity")}</h3><p class="fine">${t("integrityTxt")}</p>
      <div class="impsum">${groups.map(([k, c]) => `<div class="${c}"><b>${open.filter((x) => x.type === k).length}</b><span>${t("iss_" + k)}</span></div>`).join("")}</div>
      ${!open.length ? `<p class="chip green">${t("integrityOk")}</p>` : ""}
      ${done ? `<p class="fine">${done} ${t("reviewedN")} <a href="#" id="unrev">${t("showAgain")}</a></p>` : ""}</div>
      ${groups.map(([k, c]) => { const L = open.filter((x) => x.type === k); if (!L.length) return "";
        return `<div class="panel"><h3>${t("iss_" + k)}</h3>${L.slice(0, 200).map((x) => `<div class="issue ${c}">
          <div>${x.rows.map((r) => `<a href="#entry/${r.id}">${h(desc(r))}</a>`).join("<span class='vs'>↔</span>")}${x.codes ? `<small>${x.codes.map(t).join(" · ")}</small>` : ""}</div>
          ${x.rows.length > 1 ? `<div class="ia"><button class="btn small" data-rev="${pairKey(x.rows)}">${t("markOk")}</button><button class="btn small danger" data-delb="${x.rows[1].id}">${t("delSecond")}</button></div>` : ""}</div>`).join("")}</div>`; }).join("")}`;
    $$("[data-rev]", el).forEach((b) => b.addEventListener("click", async () => { const s2 = st(); const list = new Set(s2.reviewed || []); list.add(b.dataset.rev);
      await R.saveProfile({ settings: { ...s2, reviewed: [...list] } }); route(); }));
    $$("[data-delb]", el).forEach((b) => b.addEventListener("click", async () => { if (!confirm(t("confirmDel"))) return; await R.remove("entries", b.dataset.delb); route(); }));
    const u = $("#unrev"); if (u) u.addEventListener("click", async (e) => { e.preventDefault(); await R.saveProfile({ settings: { ...st(), reviewed: [] } }); route(); });
  };

  // ---------- arranque
  async function start(session) {
    if (!session) { R.user = null; $("#view") && ($("#view").remove()); renderAuth(); return; }
    if (R.user && R.user.id === session.user.id) return;
    R.user = session.user;
    shell(); $("#view").innerHTML = `<div class="panel muted">${t("syncing")}</div>`;
    await R.init(session.user);
    if (R.profile) { if (R.profile.lang && R.profile.lang !== lang) setLang(R.profile.lang); if (R.profile.theme) setTheme(R.profile.theme); }
    shell(); route();
  }
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { mode = "recover"; R.user = null; renderAuth(); return; }
    if (ev === "SIGNED_OUT") { R.user = null; renderAuth(); return; }
    if (ev === "SIGNED_IN" || ev === "INITIAL_SESSION") setTimeout(() => start(session), 0);
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
