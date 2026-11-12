// JLG Habits – widget semanal para la app Scriptable (iOS)
// Pega este archivo completo en un script nuevo de Scriptable.
const SB_URL = "https://sbabjzwmosdcvgzlzbiy.supabase.co";
const SB_KEY = "sb_publishable_iI7LR8w1QJwGlh8D5zr1KA_C2I2FIGh";
const KC = "jlg-habits-refresh";
const GOLD = new Color("#d9b97c"), DIM = new Color("#7b6843"), LINE = new Color("#3a342b"), INK = new Color("#efe6d6"), MUTED = new Color("#978d7a");
const ICONS = { libro: "book", gota: "drop", tenis: "figure.walk", pluma: "pencil", pesa: "dumbbell", cama: "bed.double", luna: "moon", sol: "sun.max", hoja: "leaf", corazon: "heart", manzana: "carrot", musica: "music.note", estudio: "graduationcap", codigo: "chevron.left.forwardslash.chevron.right", dinero: "dollarsign.circle", pantalla: "iphone.slash", reloj: "clock", check: "checkmark" };

function pad(n) { return String(n).padStart(2, "0"); }
function key(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

async function post(path, body) {
  const r = new Request(SB_URL + path);
  r.method = "POST";
  r.headers = { apikey: SB_KEY, "Content-Type": "application/json" };
  r.body = JSON.stringify(body);
  return await r.loadJSON();
}
async function session() {
  if (Keychain.contains(KC)) {
    const j = await post("/auth/v1/token?grant_type=refresh_token", { refresh_token: Keychain.get(KC) });
    if (j.access_token) { Keychain.set(KC, j.refresh_token); return j; }
    Keychain.remove(KC);
  }
  if (config.runsInWidget) return null;
  const a = new Alert();
  a.title = "JLG Habits";
  a.message = "Entra con el correo y la contraseña de tu cuenta de la app. La contraseña no se guarda.";
  a.addTextField("correo");
  a.addSecureTextField("contraseña");
  a.addAction("Entrar");
  a.addCancelAction("Cancelar");
  if (await a.present() === -1) return null;
  const j = await post("/auth/v1/token?grant_type=password", { email: a.textFieldValue(0).trim().toLowerCase(), password: a.textFieldValue(1) });
  if (!j.access_token) { const e = new Alert(); e.title = "No se pudo entrar"; e.message = "Revisa tu correo y contraseña."; e.addAction("OK"); await e.present(); return null; }
  Keychain.set(KC, j.refresh_token);
  return j;
}
async function rest(path, token) {
  const r = new Request(SB_URL + "/rest/v1/" + path);
  r.headers = { apikey: SB_KEY, Authorization: "Bearer " + token };
  return await r.loadJSON();
}
function message(w, t) { const x = w.addText(t); x.textColor = MUTED; x.font = Font.systemFont(13); }
function sym(name, size, color) {
  const s = SFSymbol.named(name) || SFSymbol.named("circle");
  s.applyFont(Font.systemFont(size));
  return { img: s.image, color };
}

async function build() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#11100e");
  w.setPadding(12, 14, 12, 14);
  w.url = "https://jlghabitstracker.github.io/";
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const s = await session();
  if (!s) { message(w, "Abre este script en Scriptable para iniciar sesión."); return w; }
  const now = new Date(), today = key(now);
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  const cfg = (await rest(`user_config?select=habits,profile&user_id=eq.${s.user.id}`, s.access_token))[0] || {};
  const logsArr = await rest(`day_logs?select=day,v&user_id=eq.${s.user.id}&day=gte.${key(days[0])}&day=lte.${key(days[6])}`, s.access_token);
  const logs = {}; (Array.isArray(logsArr) ? logsArr : []).forEach((r) => { logs[r.day] = r.v || {}; });
  const habits = Array.isArray(cfg.habits) ? cfg.habits : [], restMap = (cfg.profile && cfg.profile.rest) || {};
  const v = (h, k) => Number((logs[k] || {})[h.id]) || 0;
  const met = (h, k) => h.type === "count" ? v(h, k) > 0 && v(h, k) >= (h.goal || 0) : v(h, k) >= 1;
  const part = (h, k) => h.type === "count" && v(h, k) > 0 && !met(h, k);
  const off = (h, k, wd) => { const r = restMap[k]; if (r === true || (Array.isArray(r) && r.includes(h.id))) return true; return h.type !== "week" && Array.isArray(h.days) && h.days.length > 0 && !h.days.includes(wd); };

  const big = config.widgetFamily === "large";
  const maxRows = big ? 10 : 4, cell = 16, gap = big ? 9 : 7;
  const head = w.addStack(); head.centerAlignContent();
  const m0 = days[0].toLocaleDateString("es-MX", { month: "short" }), m6 = days[6].toLocaleDateString("es-MX", { month: "short" });
  const title = head.addText(`${days[0].getDate()}${m0 !== m6 ? " " + m0 : ""}–${days[6].getDate()} ${m6}`.replace(".", ""));
  title.font = Font.boldSystemFont(15); title.textColor = INK;
  head.addSpacer();
  ["L", "M", "X", "J", "V", "S", "D"].forEach((l, i) => {
    const c = head.addStack(); c.size = new Size(cell, cell); c.centerAlignContent();
    if (key(days[i]) === today) { c.borderColor = GOLD; c.borderWidth = 1; c.cornerRadius = 4; }
    const t = c.addText(l); t.font = Font.semiboldSystemFont(9); t.textColor = key(days[i]) === today ? GOLD : MUTED;
    if (i < 6) head.addSpacer(gap);
  });
  w.addSpacer(8);
  if (!habits.length) { message(w, "Aún no tienes hábitos."); return w; }
  habits.slice(0, maxRows).forEach((h, idx) => {
    const row = w.addStack(); row.centerAlignContent();
    const ic = sym(ICONS[h.icon] || "checkmark", 11, GOLD); const ii = row.addImage(ic.img); ii.imageSize = new Size(13, 13); ii.tintColor = GOLD;
    row.addSpacer(6);
    const name = row.addText(h.name); name.font = Font.mediumSystemFont(13); name.textColor = INK; name.lineLimit = 1;
    row.addSpacer();
    days.forEach((d, i) => {
      const k = key(d), wd = i, future = k > today;
      let s2;
      if (met(h, k)) s2 = sym("checkmark.circle.fill", 15, GOLD);
      else if (off(h, k, wd)) s2 = sym("minus", 11, LINE);
      else if (future) s2 = sym("circle", 15, LINE);
      else if (part(h, k)) s2 = sym("circle.lefthalf.filled", 15, DIM);
      else s2 = sym("circle", 15, k === today ? MUTED : DIM);
      const c = row.addStack(); c.size = new Size(cell, cell); c.centerAlignContent();
      const im = c.addImage(s2.img); im.imageSize = new Size(15, 15); im.tintColor = s2.color;
      if (i < 6) row.addSpacer(gap);
    });
    if (idx < Math.min(habits.length, maxRows) - 1) w.addSpacer(big ? 7 : 6);
  });
  if (habits.length > maxRows) { w.addSpacer(4); const more = w.addText(`+${habits.length - maxRows} más en la app`); more.font = Font.systemFont(10); more.textColor = MUTED; }
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
