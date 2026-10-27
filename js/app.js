/* MEHR FOOD — asosiy ilova kodi.
   Ma'lumotlar data/*.json fayllaridan olinadi. GitHub'dagi shu fayllarni o'zgartirsangiz,
   ilova keyingi ochilishda (yoki ekranga qaytganda) o'zi yangilanadi.
   Ruscha tarjimalar: data/ru/recipes.json va data/ru/ingredients.json (bo'lmasa o'zbekcha ko'rinadi). */
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KIND = k => t("kind")[k];
const DIFF = d => t("diff")[d];
const PANTRY = new Set(["salt","water","oil","spice","sugar","ice","yeast"]);
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s).toLowerCase().replace(/ё/g,"е").replace(/[ʻʼ'`’‘]/g,"").replace(/[^a-z0-9а-я ]+/g," ").replace(/\s+/g," ").trim();
const fmtTime = m => m >= 60 ? (Math.floor(m/60) + " " + t("hour") + (m%60 ? " " + m%60 + " " + t("min") : "")) : m + " " + t("min");
const isOsh = r => r.kind === "ovqat" && /osh\b|oshi\b|palov/i.test(r.nameUz) && !/sho'rva|moshxo/i.test(r.nameUz);

let ALL = [], ING = [], ING_BY = {}, SITE = {}, DATA_SIG = "";
let favs = store.get("mehir-favs", []);
let firstSeen = store.get("mehir-first-seen", null);
const byId = id => ALL.find(r => r.id === id);
const ingName = k => (ING_BY[k] && ING_BY[k].nom) || k;

/* ---------- Ma'lumotlarni yuklash ---------- */
async function getJSON(url){
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache: "no-store"});
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}
async function loadData(){
  const ru = LANG === "ru";
  const [rec, ing, site, rRec, rIng] = await Promise.all([
    getJSON("data/recipes.json"), getJSON("data/ingredients.json"),
    getJSON("data/sozlamalar.json").catch(() => ({})),
    ru ? getJSON("data/ru/recipes.json").catch(() => ({})) : {},
    ru ? getJSON("data/ru/ingredients.json").catch(() => ({})) : {}
  ]);
  const sig = LANG + ":" + rec.length + ":" + ing.length + ":" + JSON.stringify(rec).length + ":" + JSON.stringify(site).length + ":" + JSON.stringify(rRec).length + ":" + JSON.stringify(rIng).length;
  const changed = sig !== DATA_SIG;
  DATA_SIG = sig;
  SITE = site || {};
  ING = ing.map(i => Object.assign({}, i, rIng[i.kalit] || {}, {nomUz: i.nom}));
  ING_BY = Object.fromEntries(ING.map(i => [i.kalit, i]));
  ALL = rec.map(x => prepare(x, rRec[x.id]));
  trackNew();
  return changed;
}
function prepare(x, tr){
  tr = tr || {};
  const tm = tr.masalliqlar || [], ts = tr.qadamlar || [];
  const r = {
    id: x.id, kind: x.tur, name: tr.nom || x.nom, nameUz: x.nom, country: tr.davlat || x.davlat || "", isUz: x.davlat === "O'zbekiston",
    flag: x.bayroq || "", time: +x.vaqt || 0, diff: +x.qiyinlik || 1,
    serv: +x.porsiya || 1, kcal: +x.kkal || 0, desc: tr.tavsif || x.tavsif || "", photo: x.rasm || "", credit: x.rasm_muallifi || null, video: x.video || "",
    ingr: (x.masalliqlar || []).map((m, i) => [(tm[i] && tm[i].nom) || m.nom, (tm[i] && tm[i].miqdor) || m.miqdor, m.kalit || iconKey(m.nom)]),
    steps: (x.qadamlar || []).map((s, i) => ({t: (ts[i] && ts[i].matn) || s.matn, add: s.qoshiladi || [], iz: (ts[i] && ts[i].matn ? ts[i].izoh : s.izoh) || ""}))
  };
  r.keys = [...new Set(r.ingr.map(i => i[2]).filter(k => !PANTRY.has(k)))];
  r.nameN = norm(r.name) + (r.name !== x.nom ? " " + norm(x.nom) : "");
  r.hay = norm([r.name, x.nom, r.country, x.davlat, KIND(r.kind), r.desc, ...r.ingr.map(i => i[0]), ...(x.masalliqlar || []).map(m => m.nom), ...r.keys.map(ingName)].join(" "));
  return r;
}
/* Yangi qo'shilgan retseptlarni aniqlash: birinchi ko'rilgan vaqt saqlanadi, 7 kun "Yangi" belgisi turadi */
let NEW_IDS = new Set(), NEW_COUNT = 0;
function trackNew(){
  const now = Date.now(), first = firstSeen === null;
  firstSeen = firstSeen || {};
  NEW_COUNT = 0;
  for (const r of ALL) if (!(r.id in firstSeen)) { firstSeen[r.id] = first ? 0 : now; if (!first) NEW_COUNT++; }
  store.set("mehir-first-seen", firstSeen);
  NEW_IDS = new Set(ALL.filter(r => firstSeen[r.id] && now - firstSeen[r.id] < 7 * 864e5).map(r => r.id));
}

/* ---------- Ko'rinish bo'laklari ---------- */
function visual(r){
  return r.photo
    ? `<img src="${esc(r.photo)}" alt="${esc(r.name)}" loading="lazy" onerror="this.parentNode.classList.remove('has-photo');this.outerHTML=dishArt(byId('${r.id}'))">`
    : dishArt(r);
}
const vcls = r => r.photo ? " has-photo" : "";
const hasVideo = r => !!r.video;
const newBadge = r => NEW_IDS.has(r.id) ? `<span class="badge-n">${t("isNew")}</span>` : "";
function rowHTML(r, cls = "", extra = "", nm = null){
  return `<button class="row ${cls}" data-open="${r.id}"><div class="thumb${vcls(r)}">${visual(r)}</div>
  <div class="info"><div class="kindtag k-${r.kind}">${KIND(r.kind)} · ${r.flag} ${esc(r.country)}</div><h3>${nm || esc(r.name)}${hasVideo(r) ? `<span class="badge-v">${t("video")}</span>` : ""}${newBadge(r)}</h3>
  <div class="meta"><span>${fmtTime(r.time)}</span><span>${DIFF(r.diff)}</span><span>${r.kcal} ${t("kcal")}</span></div>${extra}</div></button>`;
}
const cardHTML = r => `<button class="card" data-open="${r.id}"><div class="art${vcls(r)}">${visual(r)}</div><div class="c-body"><b>${esc(r.name)}${newBadge(r)}</b><span>${r.flag} ${fmtTime(r.time)}${hasVideo(r) ? " · ▶ " + t("video").toLowerCase() : ""}</span></div></button>`;

/* ---------- Bosh sahifa ---------- */
function renderHome(){
  const tips = t("tips");
  $("#tip").textContent = tips[new Date().getDate() % tips.length];
  $("#hcount").textContent = t("nRecipes", ALL.length);
  const rows = [
    ["#row-new", ALL.filter(r => NEW_IDS.has(r.id))],
    ["#row-osh", ALL.filter(isOsh)],
    ["#row-uz", ALL.filter(r => r.kind === "ovqat" && r.isUz && !isOsh(r))],
    ["#row-world", ALL.filter(r => r.kind === "ovqat" && !r.isUz)],
    ["#row-salat", ALL.filter(r => r.kind === "salat")],
    ["#row-ich", ALL.filter(r => r.kind === "ichimlik")]
  ];
  for (const [sel, list] of rows) { $(sel).innerHTML = list.map(cardHTML).join(""); }
  $("#newSec").hidden = !NEW_IDS.size;
  renderChannel();
  const rb = $("#resBody");
  if (!rb.children.length) rb.innerHTML = ["ovqat","salat","ichimlik"].map(k => rowHTML(pick(k))).join("");
  else rb.querySelectorAll("[data-open]").forEach(b => { const r = byId(b.dataset.open); if (r) b.outerHTML = rowHTML(r); });
  $("#resTitle").textContent = lastMode === "menu" ? t("todayMenu") : t("today") + KIND(lastMode).toLowerCase();
}
function channelBase(){
  const c = (SITE.kanal || "").trim(); if (!c) return "";
  if (/^@[\w.\-]+$/.test(c)) return "https://www.youtube.com/" + c;
  const m = c.match(/youtube\.com\/(@[\w.\-]+|channel\/[\w\-]+|c\/[\w.\-]+|user\/[\w.\-]+)/i);
  return m ? "https://www.youtube.com/" + m[1] : "";
}
function renderChannel(){
  const b = channelBase(); $("#chanSec").hidden = !b; if (!b) return;
  $("#chanBox").innerHTML = `<div class="chan"><span class="yt-ic">${YTSVG(24)}</span><span class="info"><b>${esc(t("ytOn", SITE.kanal_nomi || "MEHR FOOD"))}</b><span>${t("ytSub")}</span></span><a href="${b}?sub_confirmation=1" target="_blank" rel="noopener">${t("subscribe")}</a></div>`;
}

/* ---------- Random ---------- */
let rFilter = "all", last = {}, lastMode = "menu";
function pool(kind){
  let p = ALL.filter(r => r.kind === kind);
  const f = {uz: r => r.isUz, world: r => !r.isUz, fast: r => r.time <= 30, easy: r => r.diff === 1}[rFilter];
  if (f) { const q = p.filter(f); if (q.length) p = q; }
  return p;
}
function pick(kind){
  const p = pool(kind); let c = p.filter(r => r.id !== last[kind]); if (!c.length) c = p;
  const r = c[Math.floor(Math.random() * c.length)]; last[kind] = r.id; return r;
}
function spin(mode){
  lastMode = mode;
  const kinds = mode === "menu" ? ["ovqat","salat","ichimlik"] : [mode];
  $("#resTitle").textContent = mode === "menu" ? t("todayMenu") : t("today") + KIND(mode).toLowerCase();
  const body = $("#resBody"), fin = kinds.map(pick), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let n = 0; const total = reduce ? 0 : 9;
  (function tick(){
    if (n < total) { body.innerHTML = kinds.map(k => { const p = pool(k); return rowHTML(p[Math.floor(Math.random() * p.length)], "spinning"); }).join(""); n++; setTimeout(tick, 70 + n * 14); }
    else body.innerHTML = fin.map(r => rowHTML(r, "popped")).join("");
  })();
  $("#result").scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "nearest"});
}

/* ---------- Retseptlar ro'yxati ---------- */
let curTab = "home", lKind = "all", lCat = "all", lQuery = "";
function baseList(){
  if (curTab === "fav") return ALL.filter(r => favs.includes(r.id));
  return lKind === "all" ? ALL : ALL.filter(r => r.kind === lKind);
}
function renderKinds(){
  const opts = [["all",t("all")],["ovqat",t("foods")],["salat",t("salads")],["ichimlik",t("drinks")]];
  $("#kinds").innerHTML = opts.map(([v,l]) => `<button role="tab" data-k="${v}" aria-selected="${v === lKind}">${l}</button>`).join("");
  $("#kinds").querySelectorAll("button").forEach(b => b.onclick = () => { lKind = b.dataset.k; lCat = "all"; renderKinds(); renderCats(); renderList(); });
}
function renderCats(){
  const base = baseList();
  const countries = [...new Set(base.filter(r => !r.isUz).map(r => r.flag + " " + r.country))].sort((a,b) => a.slice(5).localeCompare(b.slice(5)));
  const chips = [["all",t("all")], ...(base.some(isOsh) ? [["osh",t("oshChip")]] : []), ["uz",t("uzChip")], ["world",t("world")], ["fast",t("fast30")], ["new",t("isNew")], ...countries.map(c => ["c:" + c, c])];
  $("#cats").innerHTML = chips.filter(([v]) => v !== "new" || NEW_IDS.size).map(([v,l]) => `<button class="chip" data-c="${esc(v)}" aria-pressed="${v === lCat}">${esc(l)}</button>`).join("");
  $("#cats").querySelectorAll(".chip").forEach(b => b.onclick = () => { lCat = b.dataset.c; renderCats(); renderList(); });
}
function filtered(){
  let l = baseList();
  if (lCat === "osh") l = l.filter(isOsh);
  else if (lCat === "uz") l = l.filter(r => r.isUz);
  else if (lCat === "world") l = l.filter(r => !r.isUz);
  else if (lCat === "fast") l = l.filter(r => r.time <= 30);
  else if (lCat === "new") l = l.filter(r => NEW_IDS.has(r.id));
  else if (lCat.startsWith("c:")) l = l.filter(r => (r.flag + " " + r.country) === lCat.slice(2));
  const q = norm(lQuery); if (q) l = l.filter(r => (" " + r.hay).includes(" " + q) || r.nameN.includes(q));
  return l;
}
function renderList(){
  const l = filtered();
  $("#lSub").textContent = (curTab === "fav" ? t("favSub") : t("listSub")) + " · " + t("pcs", l.length);
  $("#items").innerHTML = l.length ? l.map(r => rowHTML(r)).join("") :
    (curTab === "fav" && !lQuery && lCat === "all" ? `<div class="empty"><b>${t("noFav")}</b>${t("noFavSub")}</div>`
      : `<div class="empty"><b>${t("nothing")}</b>${t("tryOther")}</div>`);
  $("#lRandom").hidden = !l.length;
}

/* ---------- Izlash ---------- */
let sMode = "text", sQuery = "", sKind = "all", sTime = "all", sDiff = "all";
let have = new Set(store.get("mehir-have", []));
const saveHave = () => store.set("mehir-have", [...have]);
function chipRow(el, opts, val, set){
  $(el).innerHTML = opts.map(([v,l]) => `<button class="chip" data-v="${v}" aria-pressed="${v === val}">${l}</button>`).join("");
  $(el).querySelectorAll(".chip").forEach(b => b.onclick = () => { set(b.dataset.v); chipRow(el, opts, b.dataset.v, set); renderResults(); });
}
function renderSearch(){
  $("#m-text").setAttribute("aria-selected", sMode === "text"); $("#m-ingr").setAttribute("aria-selected", sMode === "ingr");
  $("#textMode").hidden = sMode !== "text"; $("#ingrMode").hidden = sMode !== "ingr";
  chipRow("#fKind", [["all",t("all")],["ovqat",KIND("ovqat")],["salat",KIND("salat")],["ichimlik",KIND("ichimlik")]], sKind, v => sKind = v);
  chipRow("#fTime", [["all",t("anyTime")],["15",t("upTo15")],["30",t("upTo30")],["60",t("upTo60")]], sTime, v => sTime = v);
  chipRow("#fDiff", [["all",t("anyDiff")],["1",DIFF(1)],["2",DIFF(2)],["3",DIFF(3)]], sDiff, v => sDiff = v);
  $("#sugg").innerHTML = t("sugg").map(s => `<button>${esc(s)}</button>`).join("");
  $("#sugg").querySelectorAll("button").forEach(b => b.onclick = () => {
    if (b.textContent === t("fastFoods")) { sTime = "30"; sQuery = ""; } else sQuery = b.textContent;
    $("#sq").value = sQuery; renderSearch();
  });
  renderPicker(); renderResults();
}
function pickKeys(){
  const f = {}; ALL.forEach(r => r.keys.forEach(k => f[k] = (f[k] || 0) + 1));
  return Object.keys(f).sort((a,b) => f[b] - f[a]);
}
function renderPicker(){
  $("#ingPick").innerHTML = pickKeys().map(k => `<button class="ipk" data-k="${k}" aria-pressed="${have.has(k)}">${svgIcon(k)}${esc(ingName(k))}</button>`).join("");
  $("#ingPick").querySelectorAll(".ipk").forEach(b => b.onclick = () => {
    const k = b.dataset.k; have.has(k) ? have.delete(k) : have.add(k); saveHave();
    b.setAttribute("aria-pressed", have.has(k)); updHaveHead(); renderResults();
  });
  updHaveHead();
}
function updHaveHead(){
  $("#selCount").textContent = have.size ? t("marked", have.size) : t("markHome");
  $("#ingClear").hidden = !have.size;
}
function searchResults(){
  let l = ALL.slice();
  if (sKind !== "all") l = l.filter(r => r.kind === sKind);
  if (sTime !== "all") l = l.filter(r => r.time <= +sTime);
  if (sDiff !== "all") l = l.filter(r => r.diff === +sDiff);
  let res;
  if (sMode === "text") {
    const words = norm(sQuery).split(" ").filter(Boolean);
    res = l.map(r => {
      if (!words.length) return {r, score: 0};
      let sc = 0;
      for (const w of words) {
        if (r.nameN.startsWith(w)) sc += 10;
        else if ((" " + r.nameN).includes(" " + w)) sc += 6;
        else if ((" " + r.hay).includes(" " + w)) sc += 2;
        else return null;
      }
      return {r, score: sc};
    }).filter(Boolean);
  } else {
    res = l.map(r => { const hv = r.keys.filter(k => have.has(k)), miss = r.keys.filter(k => !have.has(k));
      return {r, hv, miss, score: have.size ? hv.length / Math.max(1, r.keys.length) * 100 - miss.length : 0}; })
      .filter(x => !have.size || x.hv.length);
  }
  const sb = $("#sortBy").value;
  res.sort((a,b) => sb === "time" ? a.r.time - b.r.time : sb === "kcal" ? a.r.kcal - b.r.kcal : sb === "name" ? a.r.name.localeCompare(b.r.name) : (b.score - a.score) || (a.r.time - b.r.time));
  return res;
}
function hl(name){
  const w = norm(sQuery).split(" ").filter(x => x.length > 1)[0]; if (!w || sMode !== "text") return null;
  const skip = c => /[ʻʼ'`’‘]/.test(c);
  const nn = name.toLowerCase().replace(/ё/g,"е").replace(/[ʻʼ'`’‘]/g, ""); const i = nn.indexOf(w); if (i < 0) return null;
  let a = 0, c = 0; while (c < i && a < name.length) { if (!skip(name[a])) c++; a++; }
  let b = a, d = 0; while (d < w.length && b < name.length) { if (!skip(name[b])) d++; b++; }
  return esc(name.slice(0,a)) + "<mark>" + esc(name.slice(a,b)) + "</mark>" + esc(name.slice(b));
}
function renderResults(){
  if (curTab !== "search") return;
  const res = searchResults(), n = res.length;
  $("#resCount").textContent = sMode === "ingr" && !have.size ? t("pickProducts") : t("found", n);
  $("#sqClr").hidden = !sQuery;
  $("#sRandom").hidden = !n || (sMode === "ingr" && !have.size);
  if (sMode === "ingr" && !have.size) { $("#sItems").innerHTML = `<div class="empty"><b>${t("fridge")}</b>${t("fridgeSub")}</div>`; return; }
  if (!n) { $("#sItems").innerHTML = `<div class="empty"><b>${t("nothing")}</b>${t("tryOther2")}</div>`; return; }
  $("#sItems").innerHTML = res.slice(0, 150).map(x => {
    let extra = "";
    if (sMode === "ingr") extra = `<div class="match">${x.miss.length ? `<span class="ok">${t("have", x.hv.length, x.r.keys.length)}</span><span class="no">${t("missing")}${x.miss.slice(0,4).map(k => esc(ingName(k))).join(", ")}${x.miss.length > 4 ? "…" : ""}</span>` : `<span class="all">${t("allHave")}</span>`}</div>`;
    else if (sQuery) { const w = norm(sQuery).split(" ")[0]; const hit = x.r.ingr.find(i => (" " + norm(i[0])).includes(" " + w)); if (hit && !x.r.nameN.includes(w)) extra = `<div class="match"><span class="ok">${t("contains")}${esc(hit[0])}</span></div>`; }
    return rowHTML(x.r, "", extra, hl(x.r.name));
  }).join("");
}

/* ---------- Masalliqlar ensiklopediyasi ---------- */
let iGroup = "all", iQuery = "", curIng = null;
const recipesWith = k => ALL.filter(r => r.ingr.some(i => i[2] === k));
function renderIngList(){
  const groups = [...new Set(ING.map(i => i.guruh))];
  if (iGroup !== "all" && !groups.includes(iGroup)) iGroup = "all";
  $("#igroups").innerHTML = [["all",t("all")], ...groups.map(g => [g,g])].map(([v,l]) => `<button class="chip" data-g="${esc(v)}" aria-pressed="${v === iGroup}">${esc(l)}</button>`).join("");
  $("#igroups").querySelectorAll(".chip").forEach(b => b.onclick = () => { iGroup = b.dataset.g; renderIngList(); });
  const q = norm(iQuery);
  const l = ING.filter(i => (iGroup === "all" || i.guruh === iGroup) && (!q || (" " + norm(i.nom + " " + i.nomUz + " " + i.kelib_chiqishi + " " + i.guruh)).includes(" " + q)));
  $("#iSub").textContent = t("ingSub", ING.length);
  $("#icards").innerHTML = l.length ? l.map(i => { const n = recipesWith(i.kalit).length;
    return `<button class="icard" data-ing="${esc(i.kalit)}"><span class="ic">${i.rasm ? `<img src="${esc(i.rasm)}" alt="">` : svgIcon(i.kalit)}</span><b>${esc(i.nom)}</b><span>${i.kkal} ${t("kcal")} · ${n ? t("nDishes", n) : t("per100")}</span></button>`; }).join("")
    : `<div class="empty"><b>${t("nothing")}</b>${t("tryOther3")}</div>`;
}
function openIng(k){
  const i = ING_BY[k]; if (!i) return; curIng = k;
  const recs = recipesWith(k);
  const tot = (+i.oqsil || 0) + (+i.yog || 0) + (+i.uglevod || 0) || 1;
  const bar = (v, c) => `<span style="width:${(v / tot * 100).toFixed(1)}%;background:var(${c})"></span>`;
  $("#isheet").innerHTML = `
  <div class="bar"><div class="wrap"><button class="iconbtn" id="iClose" aria-label="${t("back")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="label">${t("ingredient")}</span><span style="width:42px"></span></div></div>
  <div class="wrap">
    <div class="ihero"><div class="ic">${i.rasm ? `<img src="${esc(i.rasm)}" alt="">` : svgIcon(k)}</div>
      <div><div class="kindtag k-ovqat">${esc(i.guruh)}</div><h1>${esc(i.nom)}</h1><p class="origin">${t("origin")}${esc(i.kelib_chiqishi)}</p></div></div>
    <div class="nutri"><div><b>${i.kkal}</b><span>${t("kcal")}</span></div><div><b>${i.oqsil}</b><span>${t("protein")}</span></div><div><b>${i.yog}</b><span>${t("fat")}</span></div><div><b>${i.uglevod}</b><span>${t("carbs")}</span></div></div>
    <p class="per">${t("per100full")}</p>
    <div class="macro" aria-hidden="true">${bar(+i.oqsil, "--herb")}${bar(+i.yog, "--saffron")}${bar(+i.uglevod, "--cobalt")}</div>
    <div class="macro-l"><span><i style="background:var(--herb)"></i>${t("proteinL")}</span><span><i style="background:var(--saffron)"></i>${t("fatL")}</span><span><i style="background:var(--cobalt)"></i>${t("carbsL")}</span></div>
    <p class="idesc">${esc(i.tavsif)}</p>
    <div class="ibox"><b>${t("storage")}</b>${esc(i.saqlash)}</div>
    <div class="izoh"><b>${t("advice")}</b> ${esc(i.maslahat)}</div>
    <div class="h2row"><h2>${t("withThis")}</h2><span class="label">${t("nDishes", recs.length)}</span></div>
    <div class="items">${recs.length ? recs.map(r => rowHTML(r)).join("") : `<div class="empty">${t("noRecWith")}</div>`}</div>
  </div>`;
  const sh = $("#isheet"); sh.hidden = false; sh.scrollTop = 0; document.body.style.overflow = "hidden";
  $("#iClose").onclick = closeIng;
}
function closeIng(){ $("#isheet").hidden = true; if ($("#sheet").hidden) document.body.style.overflow = ""; }

/* ---------- Retsept sahifasi ---------- */
let portions = 1, cur = null;
function scaleQty(q, f){
  return q.replace(/(\d+(?:\.\d+)?)(?:\/(\d+))?/g, (m, a, b) => {
    let v = (b ? a / b : parseFloat(a)) * f;
    if (Math.abs(v - Math.round(v)) < .05) return String(Math.round(v));
    if (v < 1) { const fr = {.25:"1/4", .33:"1/3", .5:"1/2", .67:"2/3", .75:"3/4"}; const k = Object.keys(fr).find(k => Math.abs(v - k) < .05); if (k) return fr[k]; }
    return String(Math.round(v * 10) / 10);
  });
}
const qty = i => scaleQty(cur.ingr[i][1], portions / cur.serv);
const YTSVG = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8zM10 15.2V8.8l5.2 3.2z"/></svg>`;
const isYT = u => /youtu\.?be/i.test(u);
const isFile = u => /\.(mp4|webm)(\?|$)/i.test(u);
function ytURL(r){
  if (r.video && isYT(r.video)) return r.video;
  const b = channelBase();
  return b ? b + "/search?query=" + encodeURIComponent(r.name) : "https://www.youtube.com/results?search_query=" + encodeURIComponent(r.name + t("ytQuery"));
}
const HEART = f => `<svg width="20" height="20" viewBox="0 0 24 24" fill="${f ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
function openDetail(id, push = true){
  const r = byId(id); if (!r) return; cur = r; portions = r.serv; const fav = favs.includes(id);
  const c = r.credit;
  let media = "";
  if (r.video && isFile(r.video)) media = `<div class="video-box"><div class="label vlabel">${t("videoTitle")}</div><video controls playsinline preload="metadata" src="${esc(r.video)}"></video></div>`;
  else if (r.video && isYT(r.video)) media = `<a class="yt-card" href="${esc(r.video)}" target="_blank" rel="noopener"><span class="yt-ic">${YTSVG(26)}</span><span><b>${esc(t("videoOf", r.name))}</b><span>${esc(SITE.kanal_nomi || "YouTube")} · ${t("newWin")}</span></span></a>`;
  else media = `<p class="vid-note">${channelBase() ? esc(t("vidInChan", SITE.kanal_nomi || t("ourChan"))) : esc(t("vidOnYT", r.name))}</p>`;
  $("#sheet").innerHTML = `
  <div class="bar"><div class="wrap">
    <button class="iconbtn" id="close" aria-label="${t("back")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
    <span class="label">${KIND(r.kind)}</span>
    <button class="iconbtn ${fav ? "on" : ""}" id="favBtn" aria-label="${t("addFav")}" aria-pressed="${fav}">${HEART(fav)}</button>
  </div></div>
  <div class="wrap">
    <div class="d-art${vcls(r)}">${visual(r)}</div>
    <div class="credit">${c ? `${t("photo")}${esc(c.muallif || t("unknownAuthor"))} · ${esc(c.litsenziya || "")} · <a href="${esc(c.manba || "#")}" target="_blank" rel="noopener">Wikimedia Commons</a>` : ""}</div>
    <div class="d-title"><div class="kindtag k-${r.kind}">${r.flag} ${esc(r.country)}</div><h1>${esc(r.name)}</h1><p>${esc(r.desc)}</p></div>
    <div class="stats"><div><b>${fmtTime(r.time)}</b><span>${t("time")}</span></div><div><b>${DIFF(r.diff)}</b><span>${t("difficulty")}</span></div><div><b>${r.kcal}</b><span>${t("kcalPer")}</span></div></div>
    <div class="actions">
      <button class="btn btn-p" id="startCook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>${t("stepByStep")}</button>
      <a class="btn btn-yt" href="${esc(ytURL(r))}" target="_blank" rel="noopener">${YTSVG(20)}${r.video && isYT(r.video) ? t("watchVideo") : channelBase() ? t("inChannel") : t("onYT")}</a>
    </div>
    ${media}
    <div class="h2row"><h2>${t("ingredients")}</h2><div class="stepper"><button id="pm" aria-label="${t("decrease")}">−</button><output id="pv"></output><button id="pp" aria-label="${t("increase")}">+</button></div></div>
    <p class="hint">${t("ingHint")}</p>
    <div class="ingr" id="ingr"></div>
    <div class="h2row"><h2>${t("cooking")}</h2><span class="label">${t("nSteps", r.steps.length)}</span></div>
    <ol class="steps" id="stepsList"></ol>
    <div class="cookbar"><button class="btn btn-p" id="startCook2">${t("startCooking")}</button></div>
  </div>`;
  renderQty();
  const sh = $("#sheet"); sh.hidden = false; if (push) sh.scrollTop = 0; document.body.style.overflow = "hidden";
  $("#close").onclick = () => (history.state && history.state.sheet) ? history.back() : closeDetail();
  $("#pm").onclick = () => { if (portions > 1) { portions--; renderQty(); } };
  $("#pp").onclick = () => { if (portions < 30) { portions++; renderQty(); } };
  $("#startCook").onclick = $("#startCook2").onclick = () => openCook(0);
  $("#favBtn").onclick = () => {
    const i = favs.indexOf(id);
    if (i >= 0) { favs.splice(i, 1); toast(t("removedFav")); } else { favs.push(id); toast(t("addedFav")); }
    store.set("mehir-favs", favs);
    const b = $("#favBtn"), f = favs.includes(id); b.classList.toggle("on", f); b.setAttribute("aria-pressed", f); b.innerHTML = HEART(f);
    if (curTab === "fav") renderList();
  };
  if (push) history.pushState({sheet: id}, "");
}
function addsHTML(s){
  return s.add.length ? `<div class="adds">${s.add.map(i => `<button class="add" data-ing="${cur.ingr[i][2]}">${svgIcon(cur.ingr[i][2])}${esc(cur.ingr[i][0])} <em>${qty(i)}</em></button>`).join("")}</div>` : "";
}
function renderQty(){
  const r = cur; $("#pv").textContent = t("people", portions);
  $("#ingr").innerHTML = r.ingr.map(([n,,k], i) => `<div class="ing"><button class="ic" data-ing="${k}" aria-label="${esc(t("aboutIt", n))}">${svgIcon(k)}</button><label class="tx" for="ing${i}"><input type="checkbox" id="ing${i}"><b>${esc(n)}</b><span>${qty(i)}</span></label></div>`).join("");
  $("#stepsList").innerHTML = r.steps.map(s => `<li><div><p class="txt">${esc(s.t)}</p>${addsHTML(s)}${s.iz ? `<div class="izoh"><b>${t("note")}</b> ${esc(s.iz)}</div>` : ""}</div></li>`).join("");
}
function closeDetail(){ $("#sheet").hidden = true; document.body.style.overflow = ""; }

/* ---------- Pishirish rejimi ---------- */
let ci = 0, tLeft = 0, tInt = null, actx = null, wake = null;
function stepMinutes(s){ const m = s.match(/(\d+(?:\.\d+)?)(?:–\d+)?\s*(daqiqa|soat|мин|час)/i); if (!m) return 0; return parseFloat(m[1]) * (/soat|час/i.test(m[2]) ? 60 : 1); }
async function openCook(i){
  ci = i; $("#cook").hidden = false; renderCook();
  try { if ("wakeLock" in navigator && !wake) wake = await navigator.wakeLock.request("screen"); } catch(e){}
}
function closeCook(){ stopTimer(); $("#cook").hidden = true; try { wake && wake.release(); } catch(e){} wake = null; }
function fmtClock(s){ const m = Math.floor(s / 60), x = s % 60; return (m >= 60 ? Math.floor(m / 60) + ":" + String(m % 60).padStart(2,"0") : m) + ":" + String(x).padStart(2,"0"); }
function renderCook(){
  stopTimer(); const r = cur, n = r.steps.length;
  if (ci >= n) {
    $("#cook").innerHTML = `<div class="cook-body"><div class="wrap done-screen"><div class="d-art${vcls(r)}">${visual(r)}</div><h2>${t("bon")}</h2><p>${esc(t("ready", r.name, portions))}</p>
    <div class="actions"><button class="btn btn-yt" id="cBack">${t("backToRec")}</button><button class="btn btn-p" id="cNext">${t("another", KIND(r.kind).toLowerCase())}</button></div></div></div>`;
    $("#cBack").onclick = closeCook; $("#cNext").onclick = () => { closeCook(); openDetail(pick(r.kind).id); }; return;
  }
  const s = r.steps[ci], mins = stepMinutes(s.t); tLeft = Math.round(mins * 60);
  $("#cook").innerHTML = `
  <div class="cook-top"><div class="wrap"><div class="line"><b>${esc(r.name)}</b>
    <button class="iconbtn" id="cClose" aria-label="${t("close")}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="prog">${r.steps.map((_, k) => `<i class="${k <= ci ? "done" : ""}"></i>`).join("")}</div></div></div>
  <div class="cook-body"><div class="wrap">
    <div class="cook-step">${t("stepOf", ci + 1, n)}</div>
    <div class="cook-text">${esc(s.t)}</div>
    <div class="cook-sub"><div class="label">${t("addedHere")}</div>
      ${s.add.length ? `<div class="cgrid">${s.add.map(i => `<div class="cing"><div class="ic">${svgIcon(r.ingr[i][2])}</div><b>${esc(r.ingr[i][0])}</b><span>${qty(i)}</span></div>`).join("")}</div>` : `<p class="noadd">${t("noAdd")}</p>`}
    </div>
    ${s.iz ? `<div class="cizoh"><b>${t("noteT")}</b>${esc(s.iz)}</div>` : ""}
    ${mins ? `<div class="timer" id="timer"><div><div class="label">${t("timer")}</div><output id="tOut">${fmtClock(tLeft)}</output></div><div class="tb"><button class="go" id="tGo">${t("start")}</button><button id="tReset">${t("reset")}</button></div></div>` : ""}
  </div></div>
  <div class="cook-nav"><div class="wrap"><button class="prev" id="cPrev" ${ci === 0 ? "disabled" : ""}>${t("prev")}</button><button class="next" id="cNextS">${ci === n - 1 ? t("done") : t("next")}</button></div></div>`;
  $("#cClose").onclick = closeCook;
  $("#cPrev").onclick = () => { if (ci > 0) { ci--; renderCook(); } };
  $("#cNextS").onclick = () => { ci++; renderCook(); };
  if (mins) {
    $("#tGo").onclick = () => { if (tInt) { stopTimer(); $("#tGo").textContent = t("resume"); } else startTimer(); };
    $("#tReset").onclick = () => { stopTimer(); tLeft = Math.round(mins * 60); $("#tOut").textContent = fmtClock(tLeft); $("#tGo").textContent = t("start"); $("#timer").classList.remove("ring"); };
  }
  $("#cook .cook-body").scrollTop = 0;
}
function startTimer(){
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  if (tLeft <= 0) return; $("#tGo").textContent = t("pause");
  tInt = setInterval(() => { tLeft--; const o = $("#tOut"); if (o) o.textContent = fmtClock(Math.max(tLeft, 0)); if (tLeft <= 0) { stopTimer(); ring(); } }, 1000);
}
function stopTimer(){ clearInterval(tInt); tInt = null; }
function ring(){
  const tm = $("#timer"); if (tm) tm.classList.add("ring"); const g = $("#tGo"); if (g) g.textContent = t("timeUp"); toast(t("timeUpT"));
  try { navigator.vibrate && navigator.vibrate([300,150,300]); } catch(e){}
  try { if (!actx) return; [0,.45,.9].forEach(d => { const o = actx.createOscillator(), v = actx.createGain(); o.frequency.value = 880; v.gain.setValueAtTime(.25, actx.currentTime + d); v.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d + .35); o.connect(v).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .4); }); } catch(e){}
}

/* ---------- Navigatsiya ---------- */
function go(tab, opts = {}){
  curTab = tab;
  $$("#tabs button").forEach(b => b.dataset.tab === tab ? b.setAttribute("aria-current","page") : b.removeAttribute("aria-current"));
  $("#s-home").hidden = tab !== "home";
  $("#s-list").hidden = !(tab === "list" || tab === "fav");
  $("#s-search").hidden = tab !== "search";
  $("#s-ing").hidden = tab !== "ing";
  if (tab === "search") renderSearch();
  if (tab === "ing") renderIngList();
  if (tab === "list" || tab === "fav") {
    lKind = opts.kind || "all"; lCat = opts.cat || "all"; lQuery = ""; $("#q").value = "";
    $("#lTitle").textContent = tab === "fav" ? t("favs") : t("recipes");
    $("#kinds").hidden = tab === "fav";
    renderKinds(); renderCats(); renderList();
  }
  window.scrollTo(0, 0);
}
function rerenderAll(){
  renderHome();
  if (curTab === "search") renderSearch();
  else if (curTab === "ing") renderIngList();
  else if (curTab === "list" || curTab === "fav") { $("#lTitle").textContent = curTab === "fav" ? t("favs") : t("recipes"); renderKinds(); renderCats(); renderList(); }
  if (curIng && !$("#isheet").hidden) { const keep = $("#isheet").scrollTop; openIng(curIng); $("#isheet").scrollTop = keep; }
  if (cur && !$("#sheet").hidden) { const keep = $("#sheet").scrollTop; openDetail(cur.id, false); $("#sheet").scrollTop = keep; }
  if (cur && !$("#cook").hidden) { cur = byId(cur.id) || cur; renderCook(); }
}

/* ---------- Til ---------- */
const TABS = [["home","tabHome",'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'],["search","tabSearch",'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'],["list","tabList",'<path d="M3 13h18a9 7 0 0 1-18 0zM8 9c-1-2 1-3 0-5M12 9c-1-2 1-3 0-5M16 9c-1-2 1-3 0-5"/>'],["ing","tabIng",'<path d="M12 21c-5 0-8-3-8-7 0-5 4-9 8-11 4 2 8 6 8 11 0 4-3 7-8 7z"/><path d="M12 21V9"/>'],["fav","tabFav",'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>']];
function renderTabs(){
  $("#tabs").innerHTML = TABS.map(([k,l,p]) => `<button data-tab="${k}" ${k === curTab ? 'aria-current="page"' : ""}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>${t(l)}</button>`).join("");
  $$("#tabs button").forEach(b => b.onclick = () => go(b.dataset.tab));
}
/* index.html dagi doimiy matnlar */
function applyStatic(){
  document.documentElement.lang = LANG;
  const set = (sel, k) => { const el = $(sel); if (el) el.textContent = t(k); };
  const ph = (sel, k) => { const el = $(sel); if (el) el.placeholder = t(k); };
  set(".brand small", "tagline"); set("#installBtn", "install"); set("#loading", "loading");
  set("#s-home .panel .label", "handover"); set("#s-home .panel h1", "whatToCook");
  [["all","all"],["uz","uzF"],["world","world"],["fast","fast30"],["easy","easy"]].forEach(([f,k]) => set(`#rFilters [data-f="${f}"]`, k));
  ["ovqat","salat","ichimlik"].forEach(k => { const b = $(`.rbtn[data-r="${k}"]`); if (b) { b.querySelector("b").textContent = KIND(k); b.querySelector("span").textContent = t("randomPick"); } });
  set(".rmenu b", "fullMenu"); set(".rmenu span", "menuSub");
  set("#homeSearch span", "homeSearch"); set("#homeSearch em", "whatsHome"); set("#again", "again");
  const heads = ["newAdded","oshTypes","uzDishes","worldCuisine","salads","drinks"];
  $$("#s-home .sec-h h2").forEach((h, i) => { if (heads[i]) h.textContent = t(heads[i]); });
  $$("#s-home .sec-h .linkbtn").forEach(b => b.textContent = t("seeAll"));
  set(".note b", "tipTitle");
  ph("#q", "qPh"); set("#lRandom", "listRandom");
  set("#s-search .list-head h1", "search"); set("#s-search .list-head p", "searchSub");
  set("#m-text", "byName"); set("#m-ingr", "byHome"); ph("#sq", "sqPh"); set("#ingClear", "clear");
  const sl = $(".sortsel"); if (sl && sl.firstChild && sl.firstChild.nodeType === 3) sl.firstChild.textContent = t("sortBy");
  [["rel","sRel"],["time","sTime"],["kcal","sKcal"],["name","sName"]].forEach(([v,k]) => set(`#sortBy option[value="${v}"]`, k));
  set("#sRandom", "resRandom");
  set("#s-ing .list-head h1", "ingredients"); ph("#iq", "iqPh");
  const lb = $("#langBtn"); if (lb) { lb.textContent = t("langBtn"); lb.setAttribute("aria-label", t("langLabel")); lb.title = t("langLabel"); }
  renderTabs();
}
async function setLang(l){
  if (l === LANG) return;
  LANG = l; try { localStorage.setItem("mehr-lang", l); } catch(e){}
  applyStatic();
  try { await loadData(); } catch(e){}
  rerenderAll();
  toast(t("langSwitched"));
}

/* ---------- Umumiy ---------- */
let tT;
function toast(s, ms = 2200){ const el = $("#toast"); el.textContent = s; el.hidden = false; clearTimeout(tT); tT = setTimeout(() => el.hidden = true, ms); }

function bind(){
  $(".hbtns").insertAdjacentHTML("afterbegin", `<button class="langbtn" id="langBtn"></button>`);
  $("#langBtn").onclick = () => setLang(LANG === "uz" ? "ru" : "uz");
  applyStatic();
  $$("#rFilters .fchip").forEach(b => b.onclick = () => { rFilter = b.dataset.f; $$("#rFilters .fchip").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $$(".rbtn").forEach(b => b.onclick = () => spin(b.dataset.r));
  $("#again").onclick = () => spin(lastMode);
  $$("[data-go]").forEach(b => b.onclick = () => go("list", {kind: b.dataset.go, cat: b.dataset.cat}));
  $("#homeSearch").onclick = () => go("search");
  $("#q").addEventListener("input", e => { lQuery = e.target.value; renderList(); });
  $("#lRandom").onclick = () => { const l = filtered(); if (!l.length) return; const c = l.length > 1 ? l.filter(r => r.id !== last.list) : l; const r = c[Math.floor(Math.random() * c.length)]; last.list = r.id; openDetail(r.id); };
  $("#m-text").onclick = () => { sMode = "text"; $("#sortBy").value = "rel"; renderSearch(); };
  $("#m-ingr").onclick = () => { sMode = "ingr"; $("#sortBy").value = "rel"; renderSearch(); };
  let sqT; $("#sq").addEventListener("input", e => { clearTimeout(sqT); sqT = setTimeout(() => { sQuery = e.target.value; renderResults(); }, 120); });
  $("#sqClr").onclick = () => { sQuery = ""; $("#sq").value = ""; renderResults(); $("#sq").focus(); };
  $("#sortBy").onchange = renderResults;
  $("#ingClear").onclick = () => { have.clear(); saveHave(); renderPicker(); renderResults(); };
  $("#sRandom").onclick = () => { const res = searchResults(); if (!res.length) return; const top = sMode === "ingr" ? res.filter(x => x.score >= res[0].score - 25) : res; openDetail(top[Math.floor(Math.random() * top.length)].r.id); };
  $("#iq").addEventListener("input", e => { iQuery = e.target.value; renderIngList(); });
  document.addEventListener("click", e => {
    const ing = e.target.closest("[data-ing]"); if (ing) { e.preventDefault(); openIng(ing.dataset.ing); return; }
    const o = e.target.closest("[data-open]"); if (o) { if (!$("#isheet").hidden) closeIng(); openDetail(o.dataset.open); }
  });
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("#cook").hidden) closeCook(); else if (!$("#isheet").hidden) closeIng(); else if (!$("#sheet").hidden) closeDetail(); });
  // Telefonning "orqaga" tugmasi ochiq oynani yopsin
  window.addEventListener("popstate", () => { if (!$("#cook").hidden) closeCook(); else if (!$("#isheet").hidden) closeIng(); else if (!$("#sheet").hidden) closeDetail(); });
  // Ilovani o'rnatish (Android/Chrome)
  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("#installBtn").hidden = false; });
  $("#installBtn").onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; $("#installBtn").hidden = true; };
  window.addEventListener("appinstalled", () => { $("#installBtn").hidden = true; toast(t("installed")); });
  // Ekranga qaytganda yangiliklarni tekshirish
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(true); });
}
let lastCheck = 0;
async function refresh(quiet){
  if (Date.now() - lastCheck < 60e3 && quiet) return; lastCheck = Date.now();
  try {
    const changed = await loadData();
    if (changed) { rerenderAll(); if (NEW_COUNT) toast(t("nNew", NEW_COUNT), 3500); }
  } catch(e) { if (!quiet) throw e; }
}
async function start(){
  bind();
  try { await refresh(false); }
  catch(e) {
    $("#s-home").insertAdjacentHTML("afterbegin", `<div class="empty"><b>${t("loadFail")}</b>${t("loadFailSub")}</div>`);
    return;
  }
  $("#loading").hidden = true;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
start();
