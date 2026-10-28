// Capa de datos: Supabase + caché local + cola offline + tiempo real
(function () {
  const C = window.RX_CONFIG;
  const sb = window.supabase.createClient(C.url, C.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const S = {
    sb, user: null, profile: null, entries: [], aircraft: [], documents: [],
    listeners: new Set(), status: "synced", channel: null,
  };
  const ENTRY_COLS = ["id","kind","date","dep","off_time","arr","on_time","ac_type","registration","se_min","me_min","mp_min",
    "total_min","pic_name","ldg_day","ldg_night","to_day","to_night","night_min","ifr_min","pic_min","cop_min","dual_min",
    "instr_min","picus","pf","fstd_type","fstd_min","remarks","source","batch_id","created_at","updated_at"];
  S.ENTRY_COLS = ENTRY_COLS;

  const emit = () => S.listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  S.on = (f) => S.listeners.add(f);
  const key = (k) => `rx:${S.user ? S.user.id : "anon"}:${k}`;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(key(k)); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch {} };

  S.sortEntries = () => {
    S.entries.sort((a, b) =>
      (a.date || "").localeCompare(b.date || "") ||
      ((a.kind === "FSTD" ? "99" : a.off_time || "98")).localeCompare(b.kind === "FSTD" ? "99" : b.off_time || "98") ||
      (a.created_at || "").localeCompare(b.created_at || "") || (a.id || "").localeCompare(b.id || ""));
  };
  const cache = () => { lsSet("entries", S.entries); lsSet("aircraft", S.aircraft); lsSet("documents", S.documents); lsSet("profile", S.profile); };

  async function fetchAll(table, order) {
    const out = []; const step = 1000;
    for (let from = 0; ; from += step) {
      let q = sb.from(table).select("*").range(from, from + step - 1);
      if (order) q = q.order(order, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < step) break;
    }
    return out;
  }

  S.init = async (user) => {
    S.user = user;
    S.entries = lsGet("entries", []); S.aircraft = lsGet("aircraft", []); S.documents = lsGet("documents", []);
    S.profile = lsGet("profile", null);
    S.sortEntries(); emit();
    await S.refresh();
    S.subscribe();
    S.flush();
  };

  S.refresh = async () => {
    if (!navigator.onLine) { S.setStatus("offline"); return; }
    try {
      S.setStatus("syncing");
      const [p, e, a, d] = await Promise.all([
        sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle(),
        fetchAll("entries", "date"), fetchAll("aircraft", "registration"), fetchAll("documents", "expires"),
      ]);
      if (p.error) throw p.error;
      S.profile = p.data || { id: S.user.id, settings: {} };
      S.entries = e; S.aircraft = a; S.documents = d;
      applyOutboxLocally();
      S.sortEntries(); cache();
      S.setStatus(S.outbox().length ? "pending" : "synced");
      emit();
    } catch (err) { console.error(err); S.setStatus(navigator.onLine ? "pending" : "offline"); }
  };

  S.setStatus = (s) => { S.status = s; document.dispatchEvent(new CustomEvent("rx-status")); };

  S.subscribe = () => {
    if (S.channel) sb.removeChannel(S.channel);
    const uid = S.user.id;
    S.channel = sb.channel("rx-" + uid);
    for (const [table, arr] of [["entries", "entries"], ["aircraft", "aircraft"], ["documents", "documents"]]) {
      S.channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${uid}` }, (ev) => {
        const list = S[arr];
        if (ev.eventType === "DELETE") {
          const i = list.findIndex((x) => x.id === ev.old.id); if (i >= 0) list.splice(i, 1);
        } else {
          const i = list.findIndex((x) => x.id === ev.new.id);
          if (i >= 0) list[i] = ev.new; else list.push(ev.new);
        }
        if (arr === "entries") S.sortEntries();
        cache(); emit();
      });
    }
    S.channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, (ev) => {
      S.profile = ev.new; cache(); emit(); document.dispatchEvent(new CustomEvent("rx-profile"));
    });
    S.channel.subscribe();
  };

  // ---- cola offline
  S.outbox = () => lsGet("outbox", []);
  const setOutbox = (o) => lsSet("outbox", o);
  function applyOutboxLocally() {
    for (const op of S.outbox()) {
      const list = S[op.table]; if (!list) continue;
      const i = list.findIndex((x) => x.id === op.row.id);
      if (op.op === "delete") { if (i >= 0) list.splice(i, 1); }
      else if (i >= 0) list[i] = { ...list[i], ...op.row }; else list.push(op.row);
    }
  }
  let flushing = null;
  S.flush = () => { if (!flushing) flushing = doFlush().finally(() => { flushing = null; }); return flushing; };
  const doFlush = async () => {
    if (!navigator.onLine) { S.setStatus("offline"); return; }
    let o = S.outbox(); if (!o.length) return;
    S.setStatus("syncing");
    while (o.length) {
      const op = o[0];
      const { error } = op.op === "delete"
        ? await sb.from(op.table).delete().eq("id", op.row.id)
        : await sb.from(op.table).upsert(op.row);
      if (error) { console.error(error); S.setStatus("pending"); alert("Sync: " + error.message); return; }
      o.shift(); setOutbox(o);
    }
    S.setStatus("synced");
  };
  window.addEventListener("online", () => { S.flush().then(S.refresh); });
  window.addEventListener("offline", () => S.setStatus("offline"));

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  S.uuid = uuid;

  S.save = async (table, row) => {
    row = { ...row };
    if (!row.id) row.id = uuid();
    row.user_id = S.user.id;
    delete row.updated_at;
    const list = S[table];
    const i = list.findIndex((x) => x.id === row.id);
    const local = { ...(i >= 0 ? list[i] : {}), ...row, created_at: (i >= 0 ? list[i].created_at : row.created_at) || new Date().toISOString() };
    if (i >= 0) list[i] = local; else list.push(local);
    if (table === "entries") S.sortEntries();
    cache(); emit();
    const o = S.outbox(); o.push({ op: "upsert", table, row }); setOutbox(o);
    await S.flush();
    return local;
  };
  S.remove = async (table, id) => {
    const list = S[table]; const i = list.findIndex((x) => x.id === id); if (i >= 0) list.splice(i, 1);
    cache(); emit();
    const o = S.outbox(); o.push({ op: "delete", table, row: { id } }); setOutbox(o);
    await S.flush();
  };
  S.bulkInsert = async (rows, onProgress, meta = {}) => {
    if (!navigator.onLine) throw new Error("Offline");
    const base = Date.now();
    const { data: batch, error: be } = await sb.from("import_batches").insert({ user_id: S.user.id, filename: meta.filename || null, source: meta.source || "csv", row_count: rows.length }).select().single();
    if (be) throw be;
    rows = rows.map((r, k) => ({ ...r, id: r.id || uuid(), user_id: S.user.id, batch_id: batch.id, created_at: r.created_at || new Date(base + k).toISOString() }));
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sb.from("entries").upsert(chunk);
      if (error) throw error;
      onProgress && onProgress(Math.min(i + 200, rows.length), rows.length);
    }
    await S.refresh();
  };
  S.batches = async () => {
    const { data, error } = await sb.from("import_batches").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error; return data;
  };
  S.undoBatch = async (id) => {
    const { error } = await sb.from("entries").delete().eq("batch_id", id); if (error) throw error;
    const { error: e2 } = await sb.from("import_batches").update({ status: "undone", undone_at: new Date().toISOString() }).eq("id", id); if (e2) throw e2;
    await S.refresh();
  };
  S.removeMany = async (ids) => {
    for (let i = 0; i < ids.length; i += 200) { const { error } = await sb.from("entries").delete().in("id", ids.slice(i, i + 200)); if (error) throw error; }
  };
  S.saveProfile = async (patch) => {
    S.profile = { ...S.profile, ...patch }; cache(); emit();
    const { error } = await sb.from("profiles").update(patch).eq("id", S.user.id);
    if (error) alert(error.message);
  };
  S.audit = async (before) => {
    let q = sb.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(100);
    if (before) q = q.lt("changed_at", before);
    const { data, error } = await q; if (error) throw error; return data;
  };
  S.deleteAccount = async () => {
    const { error } = await sb.rpc("delete_my_account"); if (error) throw error;
    try { Object.keys(localStorage).filter((k) => k.startsWith("rx:" + S.user.id)).forEach((k) => localStorage.removeItem(k)); } catch {}
    await sb.auth.signOut();
  };

  // ---- cálculos
  const sumBy = (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
  S.sum = sumBy;
  S.totals = (rows) => {
    const F = rows.filter((r) => r.kind === "FLT"), X = rows.filter((r) => r.kind === "FSTD");
    const o = { n: F.length, nFstd: X.length };
    for (const f of ["se_min","me_min","mp_min","total_min","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min","ldg_day","ldg_night","to_day","to_night"]) o[f] = sumBy(F, f);
    o.picus_min = F.filter((r) => r.picus).reduce((s, r) => s + (r.pic_min || 0), 0);
    o.fstd_min = sumBy(X, "fstd_min");
    return o;
  };
  const dayMs = 86400000;
  S.sinceDays = (days) => {
    const lim = new Date(Date.now() - days * dayMs).toISOString().slice(0, 10);
    return S.entries.filter((r) => r.date > lim);
  };
  S.groupBy = (rows, keyf) => {
    const m = new Map();
    for (const r of rows) { const k = keyf(r); if (k == null || k === "") continue; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return m;
  };
  S.checks = (r) => {
    const e = [];
    if (r.kind === "FSTD") { if (!r.fstd_type) e.push("e_fstd"); return e; }
    const t = r.total_min || 0;
    if ((r.se_min || 0) + (r.me_min || 0) + (r.mp_min || 0) !== t) e.push("e_class");
    if ((r.pic_min || 0) + (r.cop_min || 0) + (r.dual_min || 0) + (r.instr_min || 0) !== t &&
        !((r.instr_min || 0) > 0 && (r.pic_min || 0) === t)) e.push("e_func");
    if ((r.night_min || 0) > t) e.push("e_night");
    if ((r.ifr_min || 0) > t) e.push("e_ifr");
    if (r.off_time && r.on_time) {
      const b = ((toMin(r.on_time) - toMin(r.off_time)) % 1440 + 1440) % 1440;
      if (b !== t) e.push("e_block");
    }
    if (!r.pic_name) e.push("e_pic");
    if (r.pf !== false && (r.ldg_day || 0) + (r.ldg_night || 0) === 0) e.push("e_ldg");
    if (!r.dep || !r.arr || !r.ac_type || !r.registration) e.push("e_data");
    return e;
  };
  const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  S.toMin = toMin;
  S.recency = (type) => {
    // fecha en que se pierde la recencia de 3 aterrizajes / 90 días por tipo o clase
    const rows = S.entries.filter((r) => r.kind === "FLT" && (!type || r.ac_type === type)).slice().reverse();
    let n = 0;
    for (const r of rows) {
      n += Math.max((r.ldg_day || 0) + (r.ldg_night || 0), 0);
      if (n >= 3) { const d = new Date(Date.parse(r.date + "T00:00:00Z") + 90 * dayMs); return d.toISOString().slice(0, 10); }
    }
    return null;
  };

  window.RX = S;
})();
