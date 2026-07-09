# 🛋️ מתכנן ריהוט לבית טרומי · Prefab Home Furniture Planner

<div dir="rtl">

## עברית

אפליקציית וב סטטית לתכנון סידור הריהוט בדירה הטרומית הספציפית שלנו.
תוכנית הדירה (קירות, דלתות, חלונות, שמות חדרים, שיש וכיורים) מוצגת כרקע
בקנה מידה אמיתי, והמשתמש מוסיף רהיטים, גורר, מסובב ומשנה גודל — כדי לבדוק
מראש איך לסדר את הבית.

האפליקציה מיועדת לשימוש משותף: המשתמש וחמשת השכנים שעוברים לאותה תוכנית
בדיוק פותחים את אותו קישור, אבל לכל אחד נשמר העיצוב הפרטי שלו בדפדפן שלו.

### איך משתמשים

- **הוספת רהיט** — לחצו על פריט בקטלוג (מידות ברירת מחדל בס״מ), או מלאו
  את טופס ״רהיט מותאם״ עם שם, רוחב ועומק בס״מ.
- **הזזה** — גררו את הרהיט (עכבר או אצבע). הרהיט נצמד לרשת של 5 ס״מ,
  נצמד אוטומטית לקירות המעטפת כשמתקרבים, ולא יוצא מגבולות הבית.
- **סיבוב 90°** — לחיצה כפולה / הקשה כפולה על הרהיט, או כפתור ״סיבוב״
  בפאנל הפריט הנבחר. הרוחב והעומק מתחלפים.
- **שינוי גודל / שם / צבע** — דרך פאנל ״פריט נבחר״.
- **שכפול ומחיקה** — דרך פאנל ״פריט נבחר״.
- **חפיפה** — שני רהיטים שחופפים נצבעים באדום.
- **שטח** — למעלה מוצגים שטח כולל, שטח תפוס בריהוט ואחוז.
- **הצג/הסתר שמות** — כפתור בסרגל הכלים.

### שמירה, ייצוא וייבוא

- העיצוב נשמר **אוטומטית בדפדפן שלכם** (`localStorage`), כך שרענון הדף
  משחזר את הפריסה. השמירה פרטית לכל דפדפן ולכל מכשיר — לשכן שלכם יש עותק
  משלו.
- **ייצוא עיצוב** — מוריד קובץ `‎<שם-הבית>.house.json` לגיבוי או להעברה
  בין מכשירים / שיתוף בין שכנים.
- **הורדה כתמונה** — מוריד תמונת PNG של התוכנית עם הרהיטים, נוחה לשיתוף
  בווטסאפ או להדפסה.
- **ייבוא עיצוב** — טוען קובץ `.house.json` (מאמת מבנה לפני טעינה).
- **אפס** — מנקה את הרהיטים (עם אישור). שם הבית נשמר.

### קנה מידה

מידות המבנה: **11.49 × 7.22 מ׳** (סה״כ ~82.9 מ״ר), מהתוכנית הממודדת
המקורית. אלה משמשות כמקור האמת לקנה המידה: מלבן הקירות של הבניין בתמונה
ממופה אל מלבן של 11.49×7.22 מ׳, וכל הרהיטים נגזרים ממנו כך שיוצגו בגודלם
הנכון בס״מ.

אפשר להחליף את `assets/plan.png` בגרסה איכותית יותר של אותה תמונה (אותו
חיתוך/פריים) בכל רזולוציה — הכיול מוגדר ביחס לגודל התמונה ולכן יעבוד כמו
שהוא, בלי שינוי בקוד.

> ⚠️ מידות הפנים המסומנות בתוכנית (למשל חדר 358 ס״מ) עשויות להיות שונות
> ב-~5% מהמידות שמתקבלות מהמעטפת הזו, בגלל אי-דיוקים בין המידות הנומינליות
> לתמונה. **לכל מידה קריטית מומלץ לאמת מול מדידה בשטח.**

</div>

## English

A static web app for planning the furniture layout of one specific prefab
apartment. The floor plan (walls, doors, windows, room names, counters and
sinks) is shown as a fixed, to‑scale background; you add furniture pieces and
drag, rotate and resize them to try out arrangements before moving in.

It is meant to be shared: the owner and five neighbours moving into the exact
same plan open the same link, but each person's design is saved privately in
their own browser.

### How to use

- **Add furniture** — click a catalog item (default sizes in cm) or use the
  *custom* form (name + width + depth in cm).
- **Move** — drag with mouse or finger. Pieces snap to a 5 cm grid, snap to
  the outer walls when close, and stay inside the envelope.
- **Rotate 90°** — double‑click / double‑tap a piece, or the *Rotate* button
  in the selected‑item panel. Width and depth swap.
- **Resize / rename / recolor / duplicate / delete** — via the selected‑item
  panel.
- **Overlap** — two overlapping pieces turn red.
- **Area** — total area, area occupied by furniture, and percentage are shown
  in the header.
- **Show/hide names** — toolbar button.

### Save, export, import

- The design is saved **automatically in your browser** (`localStorage`), so a
  page refresh restores your layout. Storage is per‑browser / per‑device — each
  neighbour keeps a private copy.
- **Export** downloads `‎<home-name>.house.json` for backup, moving between
  devices, or sharing a layout.
- **Download as image** — downloads a PNG of the plan with the furniture,
  handy for sharing or printing.
- **Import** loads a `.house.json` file (structure is validated first).
- **Reset** clears the furniture (with confirmation); the home name is kept.

### Scale

Building size: **11.49 × 7.22 m** (~82.9 m², from the measured original plan).
This is the source of truth for scale — the building's wall rectangle in the
image is mapped to an 11.49 × 7.22 m rectangle, and every furniture piece is
scaled from it so it renders at its true size in cm.

> ⚠️ The interior room dimensions printed on the plan (e.g. a 358 cm room) can
> differ by ~5% from what this envelope mapping yields, due to nominal‑vs‑image
> inaccuracies. **Verify any critical dimension against a real on‑site
> measurement.**

## Tech

Pure **Vanilla JavaScript + HTML + CSS** — no build step, no framework, no
external dependencies. Works offline after first load and runs fully client
side. All asset paths are relative so it works from a GitHub Pages sub‑path.

## Live site

GitHub Pages: `https://<username>.github.io/<repo>/`

## License

MIT — see [LICENSE](./LICENSE).
