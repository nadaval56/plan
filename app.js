/* ============================================================
   מתכנן ריהוט לבית טרומי — Vanilla JS, ללא תלות חיצונית
   Furniture planner for a specific prefab home.
   All measurements in METERS internally. x,y = center of item.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Fixed plan geometry ----------
     The real building envelope (11.49 x 7.22 m) maps to the sub-rectangle
     of assets/plan.png (natural size 818x600) where the outer walls sit.
     Measured wall envelope: x in [16,805], y in [40,534]. */
  const PLAN = {
    imgW: 818, imgH: 600,
    x0: 16, y0: 40, x1: 805, y1: 534, // sub-rect of image (px)
  };
  const HOME = { W: 11.49, H: 7.22 }; // meters (width x depth)
  const AREA_TOTAL = HOME.W * HOME.H; // ~82.9 m^2

  const GRID = 0.05;      // snap grid: 5 cm
  const WALL_SNAP = 0.09; // snap to envelope walls within ~9 cm
  const STORAGE_KEY = "house-planner:v1";

  /* ---------- Catalog (defaults in cm) ---------- */
  const CATALOG = [
    { type: "bed_d",     name: "מיטה זוגית",      w: 160, d: 200, color: "#8a5b8f" },
    { type: "bed_s",     name: "מיטה יחיד",       w: 90,  d: 200, color: "#9b6fa0" },
    { type: "wardrobe",  name: "ארון בגדים",      w: 150, d: 60,  color: "#a9744f" },
    { type: "desk",      name: "שולחן עבודה",     w: 120, d: 60,  color: "#c08a3e" },
    { type: "chair",     name: "כיסא",            w: 50,  d: 50,  color: "#4f8a6b" },
    { type: "sofa",      name: "ספה",             w: 220, d: 90,  color: "#3f7a9a" },
    { type: "dining",    name: "שולחן אוכל",      w: 160, d: 90,  color: "#5b8a3f" },
    { type: "dresser",   name: "שידה",            w: 80,  d: 45,  color: "#b07a4f" },
    { type: "nightstand",name: "שידת לילה",       w: 45,  d: 40,  color: "#7a6f5b" },
    { type: "fridge",    name: "מקרר",            w: 70,  d: 70,  color: "#5a6b7a" },
    { type: "tv_unit",   name: "יחידת טלוויזיה",  w: 160, d: 45,  color: "#4a4f5a" },
    { type: "bookshelf", name: "ספרייה",          w: 90,  d: 30,  color: "#6b8a5b" },
  ];

  /* ---------- State ---------- */
  let state = {
    version: 1,
    homeName: "הבית שלי",
    updatedAt: null,
    furniture: [],
  };
  let selectedId = null;
  let showNames = true;
  let ppm = 60; // pixels per meter, recomputed on resize

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const canvasWrap = $("canvasWrap");
  const planBg = $("planBg");
  const furnLayer = $("furnLayer");
  const rulerX = $("rulerX");
  const rulerY = $("rulerY");
  const homeNameInput = $("homeName");
  const selectedCard = $("selectedCard");

  const els = new Map(); // id -> furniture DOM element

  /* ============================================================
     Utilities
     ============================================================ */
  const uid = () =>
    "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = (v) => Math.round(v * 100) / 100;
  const snapGrid = (v) => Math.round(v / GRID) * GRID;

  // footprint (meters) taking rotation into account
  function footprint(item) {
    const swap = item.rot % 180 !== 0;
    return { w: swap ? item.d : item.w, h: swap ? item.w : item.d };
  }

  /* ============================================================
     Layout / scaling
     ============================================================ */
  function computeScale() {
    // available width of the canvas column
    const wrapW = canvasWrap.clientWidth || canvasWrap.parentElement.clientWidth;
    ppm = wrapW / HOME.W;
    const cw = wrapW;
    const ch = HOME.H * ppm;
    canvasWrap.style.height = ch + "px";
    positionBackground(cw, ch);
    buildRulers(cw, ch);
    renderAll();
  }

  // Map plan.png sub-rect [x0,x1]x[y0,y1] to fill the canvas (cw x ch)
  function positionBackground(cw, ch) {
    const sw = PLAN.x1 - PLAN.x0; // sub-rect px width
    const sh = PLAN.y1 - PLAN.y0;
    const scaleX = cw / sw;
    const scaleY = ch / sh;
    planBg.style.backgroundImage = "url(./assets/plan.png)";
    planBg.style.backgroundSize = PLAN.imgW * scaleX + "px " + PLAN.imgH * scaleY + "px";
    planBg.style.backgroundPosition =
      -PLAN.x0 * scaleX + "px " + -PLAN.y0 * scaleY + "px";
  }

  function buildRulers(cw, ch) {
    // horizontal
    let hx = "";
    for (let m = 0; m <= Math.floor(HOME.W); m++) {
      const x = m * ppm;
      hx += `<div class="tick major" style="left:${x}px"></div>`;
      hx += `<div class="lbl" style="left:${x}px">${m}</div>`;
      if (m < HOME.W) {
        const xh = (m + 0.5) * ppm;
        if (xh < cw) hx += `<div class="tick" style="left:${xh}px"></div>`;
      }
    }
    hx += `<div class="lbl" style="left:${HOME.W * ppm}px">${HOME.W}</div>`;
    rulerX.innerHTML = hx;

    let hy = "";
    for (let m = 0; m <= Math.floor(HOME.H); m++) {
      const y = m * ppm;
      hy += `<div class="tick major" style="top:${y}px"></div>`;
      hy += `<div class="lbl" style="top:${y}px">${m}</div>`;
      if (m < HOME.H) {
        const yh = (m + 0.5) * ppm;
        if (yh < ch) hy += `<div class="tick" style="top:${yh}px"></div>`;
      }
    }
    rulerY.innerHTML = hy;
  }

  /* ============================================================
     Rendering
     ============================================================ */
  function renderAll() {
    // remove stale
    for (const [id, el] of els) {
      if (!state.furniture.find((f) => f.id === id)) {
        el.remove();
        els.delete(id);
      }
    }
    state.furniture.forEach(renderItem);
    updateOverlaps();
    updateStats();
  }

  function renderItem(item) {
    let el = els.get(item.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "furn";
      el.dataset.id = item.id;
      const lbl = document.createElement("span");
      lbl.className = "flabel";
      el.appendChild(lbl);
      furnLayer.appendChild(el);
      els.set(item.id, el);
      attachPointer(el, item.id);
    }
    const fp = footprint(item);
    const pxW = fp.w * ppm, pxH = fp.h * ppm;
    el.style.width = pxW + "px";
    el.style.height = pxH + "px";
    el.style.left = (item.x * ppm - pxW / 2) + "px";
    el.style.top = (item.y * ppm - pxH / 2) + "px";
    el.style.background = hexToRgba(item.color, 0.62);
    el.style.borderColor = shade(item.color, -0.25);
    el.querySelector(".flabel").textContent =
      item.name + "\n" + Math.round(item.w * 100) + "×" + Math.round(item.d * 100);
    el.querySelector(".flabel").style.whiteSpace = "pre-line";
    el.classList.toggle("selected", item.id === selectedId);
  }

  function updateOverlaps() {
    const rects = state.furniture.map((f) => {
      const fp = footprint(f);
      return { id: f.id, l: f.x - fp.w / 2, r: f.x + fp.w / 2, t: f.y - fp.h / 2, b: f.y + fp.h / 2 };
    });
    const over = new Set();
    const eps = 0.001;
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.l < b.r - eps && a.r > b.l + eps && a.t < b.b - eps && a.b > b.t + eps) {
          over.add(a.id); over.add(b.id);
        }
      }
    for (const [id, el] of els) el.classList.toggle("overlap", over.has(id));
  }

  function updateStats() {
    const used = state.furniture.reduce((s, f) => s + f.w * f.d, 0);
    $("statTotal").textContent = AREA_TOTAL.toFixed(1) + " מ״ר";
    $("statUsed").textContent = used.toFixed(1) + " מ״ר";
    $("statPct").textContent = Math.round((used / AREA_TOTAL) * 100) + "%";
    $("statCount").textContent = state.furniture.length;
  }

  /* ---------- color helpers ---------- */
  function hexToRgba(hex, a) {
    const c = hex.replace("#", "");
    const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
    const r = parseInt(n.slice(0, 2), 16),
      g = parseInt(n.slice(2, 4), 16),
      b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function shade(hex, amt) {
    const c = hex.replace("#", "");
    const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
    let r = parseInt(n.slice(0, 2), 16),
      g = parseInt(n.slice(2, 4), 16),
      b = parseInt(n.slice(4, 6), 16);
    const f = (v) => clamp(Math.round(v + v * amt), 0, 255);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  /* ============================================================
     Item operations
     ============================================================ */
  function addItem(def) {
    const item = {
      id: uid(),
      name: def.name,
      type: def.type || "custom",
      w: round2(def.w / 100),
      d: round2(def.d / 100),
      x: HOME.W / 2,
      y: HOME.H / 2,
      rot: 0,
      color: def.color || randomColor(),
    };
    constrainItem(item);
    state.furniture.push(item);
    selectedId = item.id;
    renderAll();
    syncSelectedPanel();
    scheduleSave();
  }

  function randomColor() {
    const palette = ["#8a5b8f","#a9744f","#3f7a9a","#5b8a3f","#c08a3e","#4f8a6b","#5a6b7a","#b0554f"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function constrainItem(item) {
    const fp = footprint(item);
    item.x = clamp(item.x, fp.w / 2, HOME.W - fp.w / 2);
    item.y = clamp(item.y, fp.h / 2, HOME.H - fp.h / 2);
  }

  function applySnap(item) {
    const fp = footprint(item);
    // grid snap on center
    item.x = snapGrid(item.x);
    item.y = snapGrid(item.y);
    // wall snap (edges to envelope)
    const left = item.x - fp.w / 2, right = item.x + fp.w / 2;
    const top = item.y - fp.h / 2, bottom = item.y + fp.h / 2;
    if (Math.abs(left) <= WALL_SNAP) item.x = fp.w / 2;
    else if (Math.abs(HOME.W - right) <= WALL_SNAP) item.x = HOME.W - fp.w / 2;
    if (Math.abs(top) <= WALL_SNAP) item.y = fp.h / 2;
    else if (Math.abs(HOME.H - bottom) <= WALL_SNAP) item.y = HOME.H - fp.h / 2;
    constrainItem(item);
  }

  function rotateItem(id) {
    const it = getItem(id);
    if (!it) return;
    it.rot = (it.rot + 90) % 360;
    constrainItem(it);
    renderItem(it);
    updateOverlaps();
    scheduleSave();
  }

  function duplicateItem(id) {
    const it = getItem(id);
    if (!it) return;
    const copy = Object.assign({}, it, { id: uid(), x: it.x + 0.2, y: it.y + 0.2 });
    constrainItem(copy);
    state.furniture.push(copy);
    selectedId = copy.id;
    renderAll();
    syncSelectedPanel();
    scheduleSave();
  }

  function deleteItem(id) {
    state.furniture = state.furniture.filter((f) => f.id !== id);
    if (selectedId === id) selectedId = null;
    const el = els.get(id);
    if (el) { el.remove(); els.delete(id); }
    renderAll();
    syncSelectedPanel();
    scheduleSave();
  }

  const getItem = (id) => state.furniture.find((f) => f.id === id);

  function selectItem(id) {
    selectedId = id;
    for (const [k, el] of els) el.classList.toggle("selected", k === id);
    syncSelectedPanel();
  }

  /* ============================================================
     Pointer drag (mouse + touch via Pointer Events)
     ============================================================ */
  function attachPointer(el, id) {
    let grabDX = 0, grabDY = 0, moved = false, lastTap = 0;

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      selectItem(id);
      const it = getItem(id);
      const p = pointerMeters(e);
      grabDX = p.x - it.x;
      grabDY = p.y - it.y;
      moved = false;
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    });

    el.addEventListener("pointermove", (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const it = getItem(id);
      if (!it) return;
      const p = pointerMeters(e);
      it.x = p.x - grabDX;
      it.y = p.y - grabDY;
      applySnap(it);
      renderItem(it);
      updateOverlaps();
      moved = true;
    });

    const end = (e) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.classList.remove("dragging");
      if (moved) { updateStats(); scheduleSave(); }
      // double-tap / double-click to rotate 90° (works for mouse + touch)
      const now = Date.now();
      if (!moved) {
        if (now - lastTap < 320) { rotateItem(id); lastTap = 0; }
        else lastTap = now;
      }
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    // suppress the browser's native dblclick text-selection/zoom; rotation is
    // handled by the pointerup double-tap detector above.
    el.addEventListener("dblclick", (e) => e.preventDefault());
  }

  function pointerMeters(e) {
    const r = canvasWrap.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / ppm,
      y: (e.clientY - r.top) / ppm,
    };
  }

  // click empty canvas -> deselect
  canvasWrap.addEventListener("pointerdown", (e) => {
    if (e.target === canvasWrap || e.target === planBg || e.target === furnLayer) {
      selectItem(null);
    }
  });

  /* ============================================================
     Selected item panel
     ============================================================ */
  function syncSelectedPanel() {
    const it = getItem(selectedId);
    if (!it) { selectedCard.hidden = true; return; }
    selectedCard.hidden = false;
    $("selName").value = it.name;
    $("selW").value = Math.round(it.w * 100);
    $("selD").value = Math.round(it.d * 100);
    $("selColor").value = normHex(it.color);
  }
  function normHex(c) {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) {
      const n = c.slice(1).split("").map((x) => x + x).join("");
      return "#" + n;
    }
    return "#888888";
  }

  $("selName").addEventListener("input", (e) => {
    const it = getItem(selectedId); if (!it) return;
    it.name = e.target.value; renderItem(it); scheduleSave();
  });
  function updateDim(which, valCm) {
    const it = getItem(selectedId); if (!it) return;
    const m = clamp(round2(valCm / 100), 0.1, 10);
    it[which] = m;
    constrainItem(it); renderItem(it); updateOverlaps(); updateStats(); scheduleSave();
  }
  $("selW").addEventListener("input", (e) => updateDim("w", parseFloat(e.target.value) || 0));
  $("selD").addEventListener("input", (e) => updateDim("d", parseFloat(e.target.value) || 0));
  $("selColor").addEventListener("input", (e) => {
    const it = getItem(selectedId); if (!it) return;
    it.color = e.target.value; renderItem(it); scheduleSave();
  });
  $("btnRotate").addEventListener("click", () => selectedId && rotateItem(selectedId));
  $("btnDuplicate").addEventListener("click", () => selectedId && duplicateItem(selectedId));
  $("btnDelete").addEventListener("click", () => {
    if (selectedId && confirm("למחוק את הרהיט?")) deleteItem(selectedId);
  });

  /* ============================================================
     Catalog + custom form
     ============================================================ */
  function buildCatalog() {
    const c = $("catalog");
    c.innerHTML = "";
    CATALOG.forEach((def) => {
      const b = document.createElement("button");
      b.className = "cat-btn";
      b.innerHTML =
        `<span class="sw" style="background:${def.color}"></span>` +
        `<span>${def.name}</span>` +
        `<small>${def.w}×${def.d} ס״מ</small>`;
      b.addEventListener("click", () => addItem(def));
      c.appendChild(b);
    });
  }
  $("btnAddCustom").addEventListener("click", () => {
    const name = ($("cName").value || "רהיט").trim();
    const w = clamp(parseFloat($("cW").value) || 0, 10, 1000);
    const d = clamp(parseFloat($("cD").value) || 0, 10, 1000);
    addItem({ type: "custom", name, w, d, color: randomColor() });
    $("cName").value = "";
  });

  /* ============================================================
     Home name
     ============================================================ */
  homeNameInput.addEventListener("input", (e) => {
    state.homeName = e.target.value || "הבית שלי";
    scheduleSave();
  });

  /* ============================================================
     Storage (localStorage) — all wrapped in try/catch
     ============================================================ */
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    try {
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (err) {
      console.warn("שמירה נכשלה", err);
    }
  }
  function serialize() {
    return {
      version: 1,
      homeName: state.homeName,
      updatedAt: state.updatedAt,
      furniture: state.furniture.map((f) => ({
        id: f.id, name: f.name, type: f.type,
        w: f.w, d: f.d, x: round2(f.x), y: round2(f.y),
        rot: f.rot, color: f.color,
      })),
    };
  }
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      applyData(data);
      return true;
    } catch (err) {
      console.warn("טעינה נכשלה", err);
      return false;
    }
  }

  function applyData(data) {
    if (!data || typeof data !== "object") throw new Error("bad data");
    const list = Array.isArray(data.furniture) ? data.furniture : [];
    state.homeName = typeof data.homeName === "string" && data.homeName ? data.homeName : "הבית שלי";
    state.furniture = list.map(sanitize).filter(Boolean);
    homeNameInput.value = state.homeName;
    selectedId = null;
    renderAll();
    syncSelectedPanel();
  }

  function sanitize(f) {
    if (!f || typeof f !== "object") return null;
    const num = (v, dflt) => (typeof v === "number" && isFinite(v) ? v : dflt);
    const item = {
      id: typeof f.id === "string" ? f.id : uid(),
      name: typeof f.name === "string" ? f.name : "רהיט",
      type: typeof f.type === "string" ? f.type : "custom",
      w: clamp(num(f.w, 0.5), 0.1, 10),
      d: clamp(num(f.d, 0.5), 0.1, 10),
      x: num(f.x, HOME.W / 2),
      y: num(f.y, HOME.H / 2),
      rot: [0, 90, 180, 270].includes(f.rot) ? f.rot : 0,
      color: typeof f.color === "string" ? f.color : "#888888",
    };
    constrainItem(item);
    return item;
  }

  /* ============================================================
     Export / Import
     ============================================================ */
  $("btnExport").addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (state.homeName || "בית").replace(/[\\/:*?"<>|]/g, "_");
      a.href = url;
      a.download = safe + ".house.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert("ייצוא נכשל: " + err.message);
    }
  });
  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.furniture))
          throw new Error("קובץ לא תקין (חסר שדה furniture)");
        applyData(data);
        saveNow();
        alert("העיצוב נטען בהצלחה ✔");
      } catch (err) {
        alert("ייבוא נכשל: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.onerror = () => alert("קריאת הקובץ נכשלה");
    reader.readAsText(file);
  });

  /* ============================================================
     Toolbar: names toggle + reset
     ============================================================ */
  $("btnToggleNames").addEventListener("click", (e) => {
    showNames = !showNames;
    document.body.classList.toggle("hide-names", !showNames);
    e.target.textContent = showNames ? "🔤 הסתר שמות" : "🔤 הצג שמות";
  });
  $("btnReset").addEventListener("click", () => {
    if (!confirm("לאפס את כל הרהיטים? שם הבית יישמר.")) return;
    state.furniture = [];
    selectedId = null;
    renderAll();
    syncSelectedPanel();
    saveNow();
  });

  /* ============================================================
     Welcome modal (first visit)
     ============================================================ */
  function maybeWelcome(hadData) {
    if (!hadData) $("welcome").hidden = false;
  }
  $("btnWelcomeOk").addEventListener("click", () => ($("welcome").hidden = true));

  /* ============================================================
     Init
     ============================================================ */
  function init() {
    buildCatalog();
    const hadData = loadFromStorage();
    computeScale();
    maybeWelcome(hadData);
    window.addEventListener("resize", debounce(computeScale, 120));
    if (window.ResizeObserver) {
      new ResizeObserver(debounce(computeScale, 120)).observe(canvasWrap.parentElement);
    }
  }
  function debounce(fn, ms) {
    let t = null;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
