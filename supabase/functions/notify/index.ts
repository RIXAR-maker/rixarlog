// RIXARLOG · notificaciones push (Web Push, gratuito)
// Programado (x-cron-secret): revisa a todos los usuarios con dispositivos suscritos.
// Manual (JWT del usuario): { test: true } envía una prueba; { run: true } ejecuta la revisión solo para ese usuario.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const secret = async (n: string) => (await db.from("app_secrets").select("value").eq("name", n).single()).data?.value || "";
const APP = "https://rixar-maker.github.io/rixarlog/";
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (iso: string) => Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(today() + "T00:00:00Z")) / DAY);

const TXT: Record<string, Record<string, string>> = {
  es: { rec: "Recencia {type}", recB: "Tus 3 aterrizajes en 90 días caducan {when} ({date}).", recX: "Tu recencia en {type} ha caducado ({date}).",
        doc: "{kind} caduca {when}", docB: "Fecha de caducidad: {date}.", docX: "{kind} ha caducado", sign: "Firmas pendientes",
        signB: "Tienes {n} anotaciones de formación sin firmar en los últimos 30 días.", bk: "Copia de seguridad", bkB: "Hace más de 30 días que no guardas una copia de tu libro fuera del servidor.",
        test: "RIXARLOG", testB: "Las notificaciones funcionan en este dispositivo ✈︎", today: "hoy", tomorrow: "mañana", inN: "en {n} días" },
  en: { rec: "{type} recency", recB: "Your 3 landings in 90 days expire {when} ({date}).", recX: "Your {type} recency has expired ({date}).",
        doc: "{kind} expires {when}", docB: "Expiry date: {date}.", docX: "{kind} has expired", sign: "Pending signatures",
        signB: "You have {n} training entries without signature in the last 30 days.", bk: "Backup", bkB: "You have not saved a copy of your logbook outside the server for over 30 days.",
        test: "RIXARLOG", testB: "Notifications work on this device ✈︎", today: "today", tomorrow: "tomorrow", inN: "in {n} days" },
};
const fill = (s: string, v: Record<string, unknown>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const dmy = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

// misma huella que la app (js/store.js) para saber si una firma sigue siendo válida
const HF = ["kind","date","dep","off_time","arr","on_time","ac_type","registration","se_min","me_min","mp_min","total_min","pic_name",
  "ldg_day","ldg_night","night_min","ifr_min","pic_min","cop_min","dual_min","instr_min","picus","fstd_type","fstd_min","remarks"];
async function hash(r: any) {
  const canon = HF.map((k) => { let v = r[k]; if (k.endsWith("_time") && v) v = String(v).slice(0, 5); if (k === "picus") v = !!v;
    if (v == null || v === "") v = k.endsWith("_min") || k.startsWith("ldg") ? 0 : ""; return v; }).join("|");
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canon));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function all(table: string, uid: string) {
  const out: any[] = [];
  for (let f = 0; ; f += 1000) { const { data, error } = await db.from(table).select("*").eq("user_id", uid).range(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break; }
  return out;
}

async function alertsFor(p: any) {
  const L = TXT[p.lang] || TXT.es; const st = (p.settings || {}).notify || {}; const on = (k: string) => st[k] !== false;
  const when = (d: number) => d === 0 ? L.today : d === 1 ? L.tomorrow : fill(L.inN, { n: d });
  const out: { key: string; title: string; body: string; url: string }[] = [];
  const entries = await all("entries", p.id);
  if (on("recency")) {
    const lim = new Date(Date.now() - 730 * DAY).toISOString().slice(0, 10);
    const types = [...new Set(entries.filter((r) => r.kind === "FLT" && r.date >= lim && r.ac_type).map((r) => r.ac_type))];
    for (const ty of types) {
      const fl = entries.filter((r) => r.kind === "FLT" && r.ac_type === ty).sort((a, b) => b.date.localeCompare(a.date));
      let n = 0, exp: string | null = null;
      for (const r of fl) { n += (r.ldg_day || 0) + (r.ldg_night || 0); if (n >= 3) { exp = new Date(Date.parse(r.date + "T00:00:00Z") + 90 * DAY).toISOString().slice(0, 10); break; } }
      if (!exp) continue; const d = daysTo(exp);
      if ([14, 7, 3, 1, 0].includes(d)) out.push({ key: `rec:${ty}:${exp}:${d}`, title: fill(L.rec, { type: ty }), body: fill(L.recB, { when: when(d), date: dmy(exp) }), url: APP + "#dashboard" });
      if (d === -1) out.push({ key: `rec:${ty}:${exp}:x`, title: fill(L.rec, { type: ty }), body: fill(L.recX, { type: ty, date: dmy(exp) }), url: APP + "#dashboard" });
    }
  }
  if (on("docs")) {
    for (const doc of await all("documents", p.id)) {
      if (!doc.expires) continue; const d = daysTo(doc.expires);
      if ([60, 30, 14, 7, 1, 0].includes(d)) out.push({ key: `doc:${doc.id}:${doc.expires}:${d}`, title: fill(L.doc, { kind: doc.kind, when: when(d) }), body: fill(L.docB, { date: dmy(doc.expires) }), url: APP + "#docs" });
      if (d === -1) out.push({ key: `doc:${doc.id}:${doc.expires}:x`, title: fill(L.docX, { kind: doc.kind }), body: fill(L.docB, { date: dmy(doc.expires) }), url: APP + "#docs" });
    }
  }
  if (on("sign") && new Date().getUTCDay() === 1) {
    const sigs = await all("signatures", p.id); const lim = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
    const re = /LIFUS|LINE ?TRAINING|TRAINING|CHECK|UPRT|SKILL ?TEST|EXAMEN|LPC|OPC|SUELTA|RELEASE/i;
    let n = 0;
    for (const r of entries.filter((e) => e.date >= lim && (e.dual_min > 0 || e.picus || re.test(e.remarks || "")))) {
      const h = await hash(r); if (!sigs.some((s) => s.entry_id === r.id && s.entry_hash === h)) n++;
    }
    if (n) out.push({ key: `sign:${today()}`, title: L.sign, body: fill(L.signB, { n }), url: APP + "#logbook" });
  }
  if (on("backup") && entries.length) {
    const last = p.last_backup_at ? Date.parse(p.last_backup_at) : 0;
    if (Date.now() - last > 30 * DAY) out.push({ key: `bk:${today().slice(0, 7)}`, title: L.bk, body: L.bkB, url: APP + "#settings" });
  }
  return out;
}

async function send(uid: string, msgs: { key: string; title: string; body: string; url: string }[], dedupe = true) {
  const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", uid);
  if (!subs || !subs.length || !msgs.length) return 0;
  let sent = 0;
  for (const m of msgs) {
    if (dedupe) { const { data: seen } = await db.from("notification_log").select("key").eq("user_id", uid).eq("key", m.key).maybeSingle(); if (seen) continue; }
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.key }), { TTL: 86400 }); sent++; }
      catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await db.from("push_subscriptions").delete().eq("id", s.id); else console.error(e); }
    }
    if (dedupe) await db.from("notification_log").insert({ user_id: uid, key: m.key });
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    webpush.setVapidDetails("mailto:noreply@rixarlog.app", await secret("vapid_public"), await secret("vapid_private"));
    const cron = req.headers.get("x-cron-secret");
    if (cron && cron === (await secret("cron_secret"))) {
      const { data: users } = await db.from("push_subscriptions").select("user_id");
      const ids = [...new Set((users || []).map((u: any) => u.user_id))]; const out: unknown[] = [];
      for (const id of ids) {
        const { data: p } = await db.from("profiles").select("*").eq("id", id).single(); if (!p) continue;
        try { out.push({ id, sent: await send(id, await alertsFor(p)) }); } catch (e) { out.push({ id, error: String(e) }); }
      }
      return json({ ok: true, out });
    }
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: ud, error: ue } = await db.auth.getUser(jwt);
    if (ue || !ud?.user) return json({ error: "No autorizado" }, 401);
    const body = await req.json().catch(() => ({}));
    const { data: p } = await db.from("profiles").select("*").eq("id", ud.user.id).single();
    const L = TXT[(p && p.lang) || "es"] || TXT.es;
    if (body.test) return json({ ok: true, sent: await send(ud.user.id, [{ key: "test", title: L.test, body: L.testB, url: APP + "#settings" }], false) });
    const msgs = await alertsFor(p);
    return json({ ok: true, alerts: msgs.map((m) => m.title + " — " + m.body), sent: await send(ud.user.id, msgs, !body.force) });
  } catch (e) { return json({ error: String(e) }, 500); }
});
