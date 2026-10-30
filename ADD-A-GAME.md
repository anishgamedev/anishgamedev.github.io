# Naya game kaise add karein (ADD-A-GAME) 🎮

Tumhari site ke saare games **ek hi file** mein hain: `games.json`.
Naya game = us file mein **ek naya block** (entry) daalna. Bas.

---

## 1) GameMonetize se game lena (paise wala ✅)

1. gamemonetize.com pe login karo → **Games** catalog kholo → koi family-friendly game chuno.
2. Game ke page pe ye cheezein copy karo:
   - **Game URL / embed link** — kuch aisa: `https://html5.gamemonetize.co/xxxxxxxx/`
   - **Thumbnail** — `https://img.gamemonetize.com/xxxxxxxx/512x384.jpg`
   - Title, description, instructions (controls), width, height
3. GitHub pe apna repo kholo → `games.json` → ✏️ (Edit) dabao.
4. Sabse upar wale `[` ke **turant baad** ye block paste karo (aur end mein comma `,` lagana mat bhoolna):

```json
{
 "slug": "car-parking-pro",
 "title": "Car Parking Pro",
 "provider": "gamemonetize",
 "category": "Racing",
 "kids": true,
 "pick": false,
 "added": "2026-11-05",
 "embed": "https://html5.gamemonetize.co/xxxxxxxx/",
 "thumb": "https://img.gamemonetize.com/xxxxxxxx/512x384.jpg",
 "width": 1280,
 "height": 720,
 "orientation": "landscape",
 "description": "Game ke baare mein 2-3 line.",
 "controls": "Mouse / touch se khelo.",
 "tags": ["car", "parking"]
},
```

5. Neeche **Commit changes** dabao. 1–2 minute mein site update ho jayegi. ✅

### Har field ka matlab
| Field | Kya likhna hai |
|---|---|
| `slug` | Game ka chhota naam link ke liye — sirf small letters, number aur `-` (jaise `car-parking-pro`). Har game ka alag. Link banega: `/game/car-parking-pro/` |
| `title` | Game ka naam jo dikhega |
| `provider` | `gamemonetize`, `gamedistribution` ya apne game ke liye `own` |
| `category` | `Racing`, `Puzzle`, `Arcade`, `Sports` ya `Board` (spelling bilkul aise hi) |
| `kids` | `true` agar chhote bachchon ke liye bhi theek hai, warna `false` |
| `pick` | `true` = "🔥 Top Picks" mein dikhega |
| `added` | Aaj ki date `YYYY-MM-DD` — sabse nayi 12 dates "✨ New" mein aati hain |
| `embed` | Game ka embed link (jo copy kiya) |
| `thumb` | Thumbnail image ka link |
| `width`, `height` | Game ka size (phone wale tall games ke liye height bada) |
| `orientation` | `landscape` (chauda) ya `portrait` (lamba, phone jaisa) |
| `description`, `controls`, `tags` | Text — Google search inhi se game dhoondta hai, achha likho |

---

## 2) GameDistribution se game
Same tareeka, bas `"provider": "gamedistribution"` likho, `embed` = `https://html5.gamedistribution.com/<GAME-ID>/` aur `thumb` = `https://img.gamedistribution.com/<GAME-ID>-512x384.jpg`.
Site khud `gd_sdk_referrer_url` jod deti hai (GameDistribution ke liye zaroori).

## 3) Apna naya game (jaise Auto Wala Rush)
`"provider": "own"` likho. `embed` = tumhare game ka web link. Optional:
`"links": {"apk": "https://indiandevanish.itch.io/..."}` → "Download APK" button aa jayega.
Apni images `assets/img/` folder mein upload karo aur `thumb` mein `/assets/img/naam.webp` likho.

## 4) Game hatana
`games.json` se uska poora `{ ... },` block delete karo → Commit. Page apne aap hat jayega.

---

## ⚠️ Galti se bachne ke tips
- Har block `{` se shuru, `}` pe khatam, aur blocks ke beech **comma** `,`. Aakhri block ke baad comma **nahi**.
- Text mein `"` (double quote) mat likho — uski jagah `'` use karo.
- Galti ho gayi? GitHub pe **Actions** tab mein laal ❌ dikhega aur likha hoga kaunsa game galat hai. Purani file wapas chahiye to `games.json` → History → purana version.
- Sirf family-friendly games: koi khoon-kharaba, horror, jua (gambling) ya kisi badi company ka copy naam wala game nahi (jaise "GTA", "Minecraft", "Barbie" — ye copyright problem de sakte hain).

---

## 💰 Paise (revenue) setup — ek baar karna hai

Yahan **koi ID ya code site mein nahi daalna**. Paisa tumhari **website (domain)** se judta hai:

**GameMonetize**
1. gamemonetize.com pe login → **Publisher → Add Website** → `anishgamedev.github.io` daalo.
2. Site ke root mein `ads.txt` file pehle se hai (GameMonetize wali lines ke saath) — GameMonetize use check karke website verify karta hai. Is file ko mat hatana.
3. Bas — tumhari site pe chalne wale GameMonetize games ke ads ka share tumhare account mein judega.

**GameDistribution** (optional)
1. gamedistribution.com pe **Publisher** account (developer account se alag) → apni website `anishgamedev.github.io` add karo.
2. Site already har GameDistribution game ke link mein `gd_sdk_referrer_url` (tumhara page link) bhejti hai — aur kuch nahi karna.

**ads.txt mein nayi line?** Agar koi network bole "ads.txt mein ye line daalo" → GitHub pe `ads.txt` kholo → ✏️ Edit → line neeche jodo → Commit.

> Password kabhi bhi kisi file mein mat daalna — repo ki saari files sabko dikhti hain.

## 🔎 Google Search mein laana
1. search.google.com/search-console → Add property → URL prefix → `https://anishgamedev.github.io/`
2. "HTML tag" method chuno → `content="...."` wala code copy karo → `config.json` mein `"googleSiteVerification": "code"` → Commit → Verify dabao.
3. Sitemaps → `sitemap.xml` submit karo. Bas! Google 2–7 din mein dikhana shuru karta hai.

## 🏷️ Site ka naam badalna
`config.json` → `"siteName"` badlo → Commit. Har page pe naya naam aa jayega.
