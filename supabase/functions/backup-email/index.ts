// RIXARLOG · copia de seguridad por email (CSV + Excel + JSON)
// Modo programado: cabecera x-cron-secret = CRON_SECRET → todos los usuarios con la copia activada.
// Modo manual: Authorization: Bearer <JWT del usuario> → solo ese usuario ("Enviar copia ahora").
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as XLSX from "npm:xlsx@0.18.5";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("RESEND_FROM") || "RIXARLOG <onboarding@resend.dev>";
async function cronSecret() { const { data } = await db.from("app_secrets").select("value").eq("name", "cron_secret").single(); return data?.value || ""; }
const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const hm = (m: number) => { m = Math.round(m || 0); return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"); };
const hmB = (m: number) => (m ? hm(m) : "");
const FIELDS = ["date","kind","dep","off_time","arr","on_time","ac_type","registration","se_min","me_min","mp_min","total_min",
  "pic_name","ldg_day","ldg_night","to_day","to_night","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min",
  "picus","pf","fstd_type","fstd_min","remarks","id"];
const DUR = ["se_min","me_min","mp_min","total_min","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min","fstd_min"];
const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64s = (str: string) => b64(new TextEncoder().encode(str));

async function fetchAll(table: string, uid: string, order: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").eq("user_id", uid).order(order).range(from, from + 999);
    if (error) throw error; out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

function sortEntries(e: any[]) {
  return e.sort((a, b) => a.date.localeCompare(b.date) ||
    (a.kind === "FSTD" ? "99" : a.off_time || "98").localeCompare(b.kind === "FSTD" ? "99" : b.off_time || "98") ||
    (a.created_at || "").localeCompare(b.created_at || ""));
}

function totals(rows: any[]) {
  const f = rows.filter((r) => r.kind === "FLT"), x = rows.filter((r) => r.kind === "FSTD");
  const s = (k: string, L = f) => L.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  return { n: f.length, nF: x.length, total: s("total_min"), pic: s("pic_min"), cop: s("cop_min"), dual: s("dual_min"), mp: s("mp_min"),
    se: s("se_min"), me: s("me_min"), night: s("night_min"), ifr: s("ifr_min"), ld: s("ldg_day"), ln: s("ldg_night"), fstd: s("fstd_min", x),
    picus: f.filter((r) => r.picus).reduce((a, r) => a + (r.pic_min || 0), 0) };
}

async function backupUser(uid: string, email: string, profile: any) {
  const entries = sortEntries(await fetchAll("entries", uid, "date"));
  const aircraft = await fetchAll("aircraft", uid, "registration");
  const documents = await fetchAll("documents", uid, "created_at");
  const T = totals(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = "RIXARLOG_" + ((profile.full_name || "logbook").replace(/[^\w]+/g, "_")) + "_" + stamp;
  // CSV (mismo formato que exporta e importa la app)
  const csv = "﻿" + [FIELDS.join(",")].concat(entries.map((r) => FIELDS.map((k) =>
    DUR.includes(k) ? hmB(r[k]) : (k === "off_time" || k === "on_time") ? String(r[k] || "").slice(0, 5) : (k === "picus" || k === "pf") ? (r[k] ? "1" : "") : r[k] ?? "").map(esc).join(","))).join("\r\n");
  // Excel
  const head = ["Fecha","Tipo anot.","Salida","OFF UTC","Llegada","ON UTC","Tipo","Matrícula","SP SE","SP ME","MP","Total","PIC",
    "Aterr. día","Aterr. noche","Noche","IFR","PIC","Copiloto","Doble mando","Instructor","PICUS","FSTD tipo","FSTD","Observaciones"];
  const d = (m: number) => (m ? m / 1440 : null);
  const rows = entries.map((r) => [Date.parse(r.date + "T00:00:00Z") / 86400000 + 25569, r.kind, r.dep, String(r.off_time || "").slice(0, 5), r.arr,
    String(r.on_time || "").slice(0, 5), r.ac_type, r.registration, d(r.se_min), d(r.me_min), d(r.mp_min), d(r.total_min), r.pic_name,
    r.ldg_day || null, r.ldg_night || null, d(r.night_min), d(r.ifr_min), d(r.pic_min), d(r.cop_min), d(r.dual_min), d(r.instr_min),
    r.picus ? "Sí" : "", r.fstd_type, d(r.fstd_min), r.remarks]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  for (let i = 1; i <= rows.length; i++) {
    const c0 = ws[XLSX.utils.encode_cell({ r: i, c: 0 })]; if (c0) c0.z = "dd/mm/yyyy";
    for (const c of [8,9,10,11,15,16,17,18,19,20,23]) { const cell = ws[XLSX.utils.encode_cell({ r: i, c })]; if (cell) cell.z = "[h]:mm"; }
  }
  const tot = [["Concepto","Total"],["Tiempo de vuelo",hm(T.total)],["SP SE",hm(T.se)],["SP ME",hm(T.me)],["Multipiloto",hm(T.mp)],["PIC",hm(T.pic)],
    ["PICUS",hm(T.picus)],["Copiloto",hm(T.cop)],["Doble mando",hm(T.dual)],["Noche",hm(T.night)],["IFR",hm(T.ifr)],["Aterrizajes día",T.ld],
    ["Aterrizajes noche",T.ln],["FSTD",hm(T.fstd)],["Vuelos",T.n],["Sesiones FSTD",T.nF],["Copia",new Date().toISOString()]];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Logbook");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tot), "Totales");
  const xlsx = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
  const backup = JSON.stringify({ app: "RIXARLOG", exported_at: new Date().toISOString(), profile, entries, aircraft, documents });
  // cambios desde la última copia
  let changes = 0;
  if (profile.last_backup_at) {
    const { count } = await db.from("audit_log").select("id", { count: "exact", head: true }).eq("user_id", uid).gt("changed_at", profile.last_backup_at);
    changes = count || 0;
  }
  const last = [...entries].reverse().find((r) => r.kind === "FLT");
  const html = `<div style="font-family:Arial,sans-serif;color:#0b1f3a;max-width:560px">
    <div style="background:#0b2d5b;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0"><b style="letter-spacing:.12em">RIXARLOG</b><br><small>Copia de seguridad · ${stamp}</small></div>
    <div style="border:1px solid #d3dce6;border-top:0;padding:16px 20px;border-radius:0 0 8px 8px">
    <p>Hola ${profile.full_name || ""}, adjuntamos la copia de tu libro de vuelo.</p>
    <table style="border-collapse:collapse;font-size:14px">
      ${[["Tiempo de vuelo", hm(T.total)], ["PIC", hm(T.pic)], ["Copiloto", hm(T.cop)], ["Multipiloto", hm(T.mp)], ["Doble mando", hm(T.dual)],
        ["Noche / IFR", hm(T.night) + " / " + hm(T.ifr)], ["Aterrizajes día / noche", T.ld + " / " + T.ln], ["FSTD", hm(T.fstd)],
        ["Anotaciones", String(entries.length)], ["Último vuelo", last ? `${last.date} ${last.dep}–${last.arr} ${last.registration}` : "—"],
        ["Cambios desde la copia anterior", profile.last_backup_at ? String(changes) : "primera copia"]]
        .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5a6b80">${k}</td><td style="padding:4px 0;font-weight:bold">${v}</td></tr>`).join("")}
    </table>
    <p style="font-size:13px;color:#5a6b80">Adjuntos: <b>.csv</b> (datos en bruto, re-importable), <b>.xlsx</b> (Excel) y <b>.json</b> (copia completa para restaurar en Ajustes → Restaurar copia JSON).
    Guarda este email: es una copia fuera del servidor. El PDF EASA lo puedes generar en la app en cualquier momento.</p>
    <p style="font-size:12px;color:#8798ab">Puedes cambiar la frecuencia o desactivar estos emails en Ajustes → Copias de seguridad.</p></div></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [email], subject: `RIXARLOG · copia de seguridad ${stamp} · ${hm(T.total)} h`, html,
      attachments: [{ filename: base + ".csv", content: b64s(csv) }, { filename: base + ".xlsx", content: b64(xlsx) }, { filename: base + ".json", content: b64s(backup) }] }),
  });
  if (!res.ok) throw new Error("Resend " + res.status + ": " + (await res.text()).slice(0, 300));
  await db.from("profiles").update({ last_backup_at: new Date().toISOString() }).eq("id", uid);
  return { email, entries: entries.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!RESEND) return json({ error: "RESEND_API_KEY no configurada" }, 500);
  try {
    const cron = req.headers.get("x-cron-secret");
    if (cron && cron === (await cronSecret())) {
      const { data: profs, error } = await db.from("profiles").select("*");
      if (error) throw error;
      const now = new Date(); const out: unknown[] = [];
      for (const p of profs || []) {
        const b = (p.settings || {}).backup || {};
        if (!b.enabled) continue;
        if (b.freq === "monthly" && now.getUTCDate() > 7) continue;
        const { data: u } = await db.auth.admin.getUserById(p.id);
        const to = b.email || u?.user?.email; if (!to) continue;
        try { out.push(await backupUser(p.id, to, p)); } catch (e) { out.push({ id: p.id, error: String(e) }); }
      }
      return json({ ok: true, sent: out });
    }
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: ud, error: ue } = await db.auth.getUser(jwt);
    if (ue || !ud?.user) return json({ error: "No autorizado" }, 401);
    const { data: p } = await db.from("profiles").select("*").eq("id", ud.user.id).single();
    const to = ((p?.settings || {}).backup || {}).email || ud.user.email;
    return json({ ok: true, sent: [await backupUser(ud.user.id, to, p || {})] });
  } catch (e) { return json({ error: String(e) }, 500); }
});
