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

קנה המידה מכויל לפי **מידות הפנים המודפסות על התוכנית** (345, 244, 358,
285, 312, 575 ס״מ...): נמדדו 8 חללים בתמונה והתקבל קנה מידה אחיד של
‎1.8088 פיקסל/ס״מ עם סטיות של עד ±2 ס״מ. כך רהיט בגודל החדר (למשל 285
ס״מ בחדר ההורים) ממלא בדיוק את החלל בין הקירות.

בנוסף, האפליקציה מזהה את הקירות מתוך התמונה עצמה: רהיט שחופף קיר או
אלמנט קבוע (שיש, כיריים) נצבע באדום, ורהיטים נצמדים לפאות הקירות
הפנימיים. "שטח רצפה" בכותרת הוא השטח נטו ללא קירות.

התוכנית המוצגת היא `assets/plan.webp` — גרסה דחוסה (~200KB) של המקור
האיכותי `assets/plan-source.png` (2400×1784). אפשר להחליף את התמונה בכל
רזולוציה של אותו חיתוך בלי שינוי בקוד — הכיול מוגדר ביחס לגודל התמונה.
לחיתוך שונה יש לעדכן את ארבעת שברי הכיול (`PLAN`) ואת `PLAN_IMG` בראש
`app.js`.

> ⚠️ שימו לב: המעטפת החיצונית המצוירת שקולה ל-‏12.14×7.62 מ׳ — מעט יותר
> מהמידה הנומינלית 11.49×7.22 מ׳. מידות הפנים של החדרים הן המדויקות.
> **לכל מידה קריטית מומלץ לאמת מול מדידה בשטח.**

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

Scale is calibrated against the **interior dimensions printed on the plan**
(345, 244, 358, 285, 312, 575 cm...): 8 room spans were measured in the image,
yielding a uniform 1.8088 px/cm with residuals within ±2 cm. A piece sized
exactly like a room (e.g. 285 cm in the parents' bedroom) fits the space
between the walls precisely.

The app also detects walls from the image itself: a piece overlapping a wall
or a fixed element (counter, cooktop) turns red, and pieces snap to interior
wall faces. The "floor area" stat is the net area excluding walls.

> ⚠️ Note: the drawn exterior envelope equals 12.14 × 7.62 m — slightly larger
> than the nominal 11.49 × 7.22 m exterior. The interior room dimensions are
> the accurate ones. **Verify any critical dimension against a real on‑site
> measurement.**

## Tech

Pure **Vanilla JavaScript + HTML + CSS** — no build step, no framework, no
external dependencies. Works offline after first load and runs fully client
side. All asset paths are relative so it works from a GitHub Pages sub‑path.

## Live site

GitHub Pages: `https://<username>.github.io/<repo>/`

## License

MIT — see [LICENSE](./LICENSE).
