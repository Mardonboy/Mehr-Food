# MEHR FOOD 🍲

**Bugun nima ovqat qilaman?** — dunyo oshxonasi retseptlari ilovasi.

👉 **Ilova manzili:** https://mardonboy.github.io/Mehr-Food/

- 113+ retsept: ovqatlar, salatlar, ichimliklar (o'zbek va dunyo oshxonasi)
- Random menyu: ovqat, salat va ichimlikni bir tugmada tanlaydi
- Izlash: nom bo'yicha va **uyda bor mahsulotlar** bo'yicha
- Qadamma-qadam pishirish rejimi: har qadamda nima qo'shiladi, izoh va taymer
- Masalliqlar ensiklopediyasi: 86 mahsulot — kaloriya, oqsil, yog', uglevod, saqlash, maslahat
- Telefonga o'rnatiladi va internetsiz ham ishlaydi
- **Avtomatik yangilanadi:** shu repozitoriydagi fayllarni o'zgartirsangiz, hamma telefonlarda ilova o'zi yangilanadi

---

## 📱 Telefonga o'rnatish

**Android (Chrome):** ilova manzilini oching → yuqoridagi **"O'rnatish"** tugmasini bosing (yoki ⋮ → *Ilovani o'rnatish*).

**iPhone (Safari):** manzilni oching → **Ulashish** tugmasi → **"Bosh ekranga"**.

---

## ➕ Yangi retsept qo'shish (kompyuter shart emas)

1. GitHub'da `data/recipes.json` faylini oching va ✏️ (Edit) tugmasini bosing.
2. Faylning oxiridagi `]` belgisidan oldin, oxirgi retseptdan keyin vergul qo'yib, yangi retseptni yozing. Namunasi: [`data/namuna-retsept.json`](data/namuna-retsept.json).
3. **Commit changes** tugmasini bosing.
4. 1–2 daqiqadan keyin ilovani ochgan har bir odamda yangi retsept paydo bo'ladi va 7 kun davomida **"Yangi"** belgisi bilan ko'rinadi.

### Retsept maydonlari

| Maydon | Ma'nosi | Misol |
|---|---|---|
| `id` | Takrorlanmas nom, faqat lotin harflari va `-` | `"lula-kabob"` |
| `tur` | `ovqat`, `salat` yoki `ichimlik` | `"ovqat"` |
| `nom` | Taom nomi | `"Lula kabob"` |
| `davlat`, `bayroq` | Qaysi oshxonadan | `"Turkiya"`, `"🇹🇷"` |
| `vaqt` | Tayyorlash vaqti, daqiqada | `60` |
| `qiyinlik` | 1 — oson, 2 — o'rtacha, 3 — murakkab | `2` |
| `porsiya` | Necha kishilik | `4` |
| `kkal` | Bir porsiya kaloriyasi | `520` |
| `masalliqlar` | `{"nom": ..., "miqdor": ...}` ro'yxati | |
| `qadamlar` | `{"matn": ..., "qoshiladi": [...], "izoh": ...}` | |
| `rasm` | `images/` papkasidagi surat (ixtiyoriy) | `"images/lula-kabob.jpg"` |
| `video` | YouTube havolasi yoki `videos/...mp4` (ixtiyoriy) | `"https://youtu.be/..."` |

**`qoshiladi`** — shu qadamda qo'shiladigan masalliqlar raqami. Sanash **0 dan** boshlanadi: birinchi masalliq `0`, ikkinchisi `1` va hokazo.

Masalliq rasmi nomidan avtomatik tanlanadi (guruch, sabzi, go'sht...). Agar noto'g'ri tushsa, masalliqqa `"kalit"` qo'shing, masalan `{"nom": "Bedana tuxumi", "miqdor": "10 dona", "kalit": "egg"}`. Barcha kalitlar `data/ingredients.json` da.

### Surat qo'shish
`images/` papkasiga o'ting → **Add file → Upload files** → suratni yuklang (taxminan 960×720, 300 KB dan kichik bo'lsa yaxshi). So'ng retseptga `"rasm": "images/fayl-nomi.jpg"` yozing.

### YouTube kanalni ulash
`data/sozlamalar.json` dagi `"kanal"` ga kanalingizni yozing, masalan `"@mehirfood"`. Shunda retseptdagi video tugmasi faqat sizning kanalingizdan qidiradi, bosh sahifada esa **Obuna bo'lish** tugmasi chiqadi.

---

## 🇷🇺 Rus tili
Ilovaning yuqori o'ng burchagidagi **RU / UZ** tugmasi tilni almashtiradi (tanlov telefonda eslab qolinadi).
- Interfeys matnlari: `js/i18n.js`
- Retseptlar tarjimasi: `data/ru/recipes.json` — retsept `id`si bo'yicha `nom`, `davlat`, `tavsif`, `masalliqlar` va `qadamlar` (soni o'zbekchadagi bilan bir xil bo'lsin)
- Masalliqlar tarjimasi: `data/ru/ingredients.json` — `kalit` bo'yicha

Yangi retseptning ruscha tarjimasini yozmasangiz ham bo'ladi — u rus tilida o'zbekcha ko'rinadi.

---

## 🥕 Yangi masalliq qo'shish
`data/ingredients.json` ga yangi yozuv qo'shing:

```json
{"kalit": "spinach2", "nom": "Ismaloq", "guruh": "Sabzavotlar", "kelib_chiqishi": "Eron",
 "kkal": 23, "oqsil": 2.9, "yog": 0.4, "uglevod": 3.6,
 "tavsif": "...", "saqlash": "...", "maslahat": "...", "rasm": "images/ismaloq.jpg"}
```

`rasm` ixtiyoriy. Agar `kalit` uchun chizilgan belgi bo'lmasa va `rasm` ham ko'rsatilmasa, umumiy belgi chiqadi.

---

## ✅ Avtomatik tekshiruv
Har o'zgarishdan keyin GitHub **Actions** bo'limida "Retseptlarni tekshirish" ishga tushadi. Agar biror xato bo'lsa (vergul tushib qolgan, raqam noto'g'ri, surat topilmadi), qizil ❌ chiqadi va xato qayerdaligi o'zbekcha yoziladi.

---

## 🤖 Android APK (Play Market uchun)
1. https://www.pwabuilder.com saytiga ilova manzilini kiriting.
2. **Package for stores → Android** ni tanlang.
3. Tayyor APK/AAB faylni yuklab oling va Google Play Console'ga joylang.

---

## 📂 Tuzilma

```
index.html            ilova sahifasi
js/app.js             ilova kodi
js/icons.js           mahsulot belgilari (SVG)
sw.js                 internetsiz ishlash va yangilanish
manifest.webmanifest  telefonga o'rnatish sozlamalari
data/recipes.json     retseptlar  ← shu yerni tahrirlang
data/ingredients.json masalliqlar ← shu yerni tahrirlang
data/sozlamalar.json  YouTube kanal
images/               taom suratlari
scripts/tekshir.js    ma'lumotlarni tekshirish
```

## 📷 Suratlar
Taom suratlari [Wikimedia Commons](https://commons.wikimedia.org/) dan olingan va erkin litsenziyalar (CC BY, CC BY-SA, Public domain) asosida ishlatiladi. Har bir suratning muallifi va litsenziyasi ilovada, surat ostida ko'rsatilgan.
