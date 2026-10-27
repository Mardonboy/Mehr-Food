// data/*.json fayllarini tekshiradi. GitHub'da har o'zgarishda avtomatik ishlaydi.
// Mahalliy ishga tushirish: node scripts/tekshir.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const errors = [];
const err = m => errors.push(m);

function load(f){
  try { return JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); }
  catch (e) { err(`${f}: JSON xato — ${e.message}`); return null; }
}

const rec = load("data/recipes.json");
const ing = load("data/ingredients.json");
load("data/sozlamalar.json");

if (Array.isArray(ing)) {
  const seen = new Set();
  ing.forEach((i, n) => {
    const at = `ingredients.json #${n + 1} (${i.nom || "?"})`;
    for (const k of ["kalit", "nom", "guruh"]) if (!i[k]) err(`${at}: "${k}" maydoni bo'sh`);
    for (const k of ["kkal", "oqsil", "yog", "uglevod"]) if (typeof i[k] !== "number") err(`${at}: "${k}" son bo'lishi kerak`);
    if (seen.has(i.kalit)) err(`${at}: "${i.kalit}" kaliti takrorlangan`);
    seen.add(i.kalit);
    if (i.rasm && !fs.existsSync(path.join(root, i.rasm))) err(`${at}: rasm topilmadi — ${i.rasm}`);
  });
}

if (Array.isArray(rec)) {
  const ids = new Set();
  rec.forEach((r, n) => {
    const at = `recipes.json #${n + 1} (${r.nom || "?"})`;
    for (const k of ["id", "tur", "nom", "davlat", "tavsif"]) if (!r[k]) err(`${at}: "${k}" maydoni bo'sh`);
    if (r.id && !/^[a-z0-9-]+$/.test(r.id)) err(`${at}: id faqat kichik lotin harflari, raqam va "-" dan iborat bo'lsin`);
    if (ids.has(r.id)) err(`${at}: "${r.id}" id takrorlangan`);
    ids.add(r.id);
    if (!["ovqat", "salat", "ichimlik"].includes(r.tur)) err(`${at}: "tur" ovqat, salat yoki ichimlik bo'lishi kerak`);
    for (const k of ["vaqt", "qiyinlik", "porsiya", "kkal"]) if (typeof r[k] !== "number") err(`${at}: "${k}" son bo'lishi kerak`);
    if (![1, 2, 3].includes(r.qiyinlik)) err(`${at}: "qiyinlik" 1, 2 yoki 3 bo'lishi kerak`);
    if (!Array.isArray(r.masalliqlar) || !r.masalliqlar.length) err(`${at}: masalliqlar ro'yxati bo'sh`);
    if (!Array.isArray(r.qadamlar) || !r.qadamlar.length) err(`${at}: qadamlar ro'yxati bo'sh`);
    (r.qadamlar || []).forEach((s, i) => {
      if (!s.matn) err(`${at}: ${i + 1}-qadam matni bo'sh`);
      (s.qoshiladi || []).forEach(x => {
        if (!Number.isInteger(x) || x < 0 || x >= (r.masalliqlar || []).length)
          err(`${at}: ${i + 1}-qadamdagi "qoshiladi" ichida ${x} — bunday raqamli masalliq yo'q (0 dan boshlab sanaladi)`);
      });
    });
    if (r.rasm && !fs.existsSync(path.join(root, r.rasm))) err(`${at}: rasm topilmadi — ${r.rasm}`);
    if (r.video && /\.(mp4|webm)$/i.test(r.video) && !fs.existsSync(path.join(root, r.video))) err(`${at}: video topilmadi — ${r.video}`);
  });
  console.log(`Retseptlar: ${rec.length} ta`);
}
if (Array.isArray(ing)) console.log(`Masalliqlar: ${ing.length} ta`);

// Ruscha tarjimalar (ixtiyoriy): tarjima qilinmagan retsept o'zbekcha ko'rinadi
const ruRec = fs.existsSync(path.join(root, "data/ru/recipes.json")) ? load("data/ru/recipes.json") : null;
const ruIng = fs.existsSync(path.join(root, "data/ru/ingredients.json")) ? load("data/ru/ingredients.json") : null;
if (ruRec && Array.isArray(rec)) {
  const noTr = [];
  rec.forEach(r => {
    const tr = ruRec[r.id]; if (!tr) { noTr.push(r.id); return; }
    if (tr.qadamlar && tr.qadamlar.length !== (r.qadamlar || []).length) err(`data/ru/recipes.json (${r.id}): qadamlar soni o'zbekchadagi bilan bir xil bo'lishi kerak (${(r.qadamlar || []).length} ta)`);
    if (tr.masalliqlar && tr.masalliqlar.length !== (r.masalliqlar || []).length) err(`data/ru/recipes.json (${r.id}): masalliqlar soni o'zbekchadagi bilan bir xil bo'lishi kerak (${(r.masalliqlar || []).length} ta)`);
  });
  console.log(`Ruscha tarjima: ${rec.length - noTr.length}/${rec.length} retsept` + (noTr.length ? ` (tarjimasiz: ${noTr.join(", ")})` : ""));
}
if (ruIng && Array.isArray(ing)) console.log(`Ruscha masalliqlar: ${ing.filter(i => ruIng[i.kalit]).length}/${ing.length}`);

if (errors.length) {
  console.error(`\n${errors.length} ta xato topildi:\n - ` + errors.join("\n - "));
  process.exit(1);
}
console.log("Hammasi joyida ✓");
