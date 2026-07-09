/* ============================================================
   מתכנן ריהוט לבית טרומי — Vanilla JS, ללא תלות חיצונית
   Furniture planner for a specific prefab home.
   All measurements in METERS internally. x,y = center of item.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Fixed plan geometry ----------
     The real building envelope (11.49 x 7.22 m) maps to the sub-rectangle
     of the plan image where the outer walls sit. Calibration is stored as
     FRACTIONS of the image size (wall envelope measured 115..2311 x
     183..1561 on the 2400x1784 source, assets/plan-source.png), so the
     image can be swapped for any resolution of the same framing without
     code changes. A different crop only needs these four fractions and
     PLAN_IMG updated. */
  const PLAN_IMG = "./assets/plan.webp";
  const PLAN = {
    fx0: 115 / 2400, fy0: 183 / 1784,
    fx1: 2311 / 2400, fy1: 1561 / 1784,
  };
  /* Scale is calibrated against the interior dimensions printed on the plan
     (345/244/358/174/285/312 cm...): least-squares over 8 measured room
     spans gives 1.8088 px/cm on the 2400px source, residuals <= 2 cm.
     The drawn wall envelope (2196x1378 px) therefore represents
     12.14 x 7.62 m. Room interiors match their printed sizes exactly;
     do NOT map the envelope to the nominal 11.49x7.22 exterior — that
     shrinks every room by ~5%. */
  const HOME = { W: 21.96 / 1.8088, H: 13.78 / 1.8088 }; // 12.14 x 7.62 m
  let floorArea = HOME.W * HOME.H * 0.85; // refined from wall grid on load

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
    // lock the side column to the plan card's height (desktop layout)
    const stage = $("stageGrid");
    const side = document.querySelector(".side-panel");
    if (stage && side) {
      side.style.setProperty("--side-h", stage.getBoundingClientRect().height + "px");
    }
    renderAll();
  }

  // Map the plan.png wall sub-rect to fill the canvas (cw x ch).
  // Uses fractional calibration, so it works at any image resolution.
  function positionBackground(cw, ch) {
    const bgW = cw / (PLAN.fx1 - PLAN.fx0);
    const bgH = ch / (PLAN.fy1 - PLAN.fy0);
    planBg.style.backgroundImage = "url(" + PLAN_IMG + ")";
    planBg.style.backgroundSize = bgW + "px " + bgH + "px";
    planBg.style.backgroundPosition =
      -PLAN.fx0 * bgW + "px " + -PLAN.fy0 * bgH + "px";
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
    hx += `<div class="lbl" style="left:${HOME.W * ppm}px">${HOME.W.toFixed(1)}</div>`;
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
    for (const f of state.furniture)
      if (!over.has(f.id) && overlapsWall(f)) over.add(f.id);
    for (const [id, el] of els) el.classList.toggle("overlap", over.has(id));
  }

  function updateStats() {
    const used = state.furniture.reduce((s, f) => s + f.w * f.d, 0);
    $("statTotal").textContent = floorArea.toFixed(1) + " מ״ר";
    $("statUsed").textContent = used.toFixed(1) + " מ״ר";
    $("statPct").textContent = Math.round((used / floorArea) * 100) + "%";
    $("statCount").textContent = state.furniture.length;
  }

  /* ============================================================
     Wall grid — detected from the plan image itself.
     The envelope sub-rect is downsampled to 2.5 cm cells; dark cells
     after a 3x3 morphological opening (which drops text strokes and
     door arcs) are walls/fixed fixtures. Used for: red overlap warning,
     snapping to interior wall faces, and net floor area.
     ============================================================ */
  const CELL = 0.025; // meters per grid cell
  let wallGrid = null, gw = 0, gh = 0;
  let snapLeft = [], snapRight = [], snapTop = [], snapBottom = [];

  function buildWallGrid(img) {
    gw = Math.round(HOME.W / CELL);
    gh = Math.round(HOME.H / CELL);
    const c = document.createElement("canvas");
    c.width = gw; c.height = gh;
    const ctx = c.getContext("2d");
    const iw = img.naturalWidth, ih = img.naturalHeight;
    ctx.drawImage(img,
      PLAN.fx0 * iw, PLAN.fy0 * ih,
      (PLAN.fx1 - PLAN.fx0) * iw, (PLAN.fy1 - PLAN.fy0) * ih,
      0, 0, gw, gh);
    const d = ctx.getImageData(0, 0, gw, gh).data;
    const raw = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) {
      const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      // walls are ~40-140 lum, floor ~250; 150 means a boundary cell counts
      // as wall only if it is mostly wall, so rooms keep their full size
      raw[i] = l < 150 ? 1 : 0;
    }
    // 3x3 erosion (out-of-bounds counts as wall, keeping the outer walls)
    const at = (a, x, y) => (x < 0 || y < 0 || x >= gw || y >= gh) ? 1 : a[y * gw + x];
    const eroded = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        let all = 1;
        for (let dy = -1; dy <= 1 && all; dy++)
          for (let dx = -1; dx <= 1 && all; dx++)
            if (!at(raw, x + dx, y + dy)) all = 0;
        eroded[y * gw + x] = all;
      }
    // 3x3 dilation back
    wallGrid = new Uint8Array(gw * gh);
    let free = 0;
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        let any = 0;
        for (let dy = -1; dy <= 1 && !any; dy++)
          for (let dx = -1; dx <= 1 && !any; dx++)
            if (at(eroded, x + dx, y + dy) === 1 && !(x + dx < 0 || y + dy < 0 || x + dx >= gw || y + dy >= gh)) any = 1;
        wallGrid[y * gw + x] = any;
        if (!any) free++;
      }
    floorArea = free * CELL * CELL;
    buildSnapLines();
  }

  // Wall-face snap lines: boundaries between wall and free space with a
  // contiguous face of at least 40 cm.
  function buildSnapLines() {
    const MINRUN = Math.round(0.4 / CELL);
    snapLeft = []; snapRight = []; snapTop = []; snapBottom = [];
    const cell = (x, y) => wallGrid[y * gw + x];
    for (let x = 1; x < gw; x++) {
      let runWF = 0, runFW = 0;
      for (let y = 0; y <= gh; y++) {
        const wf = y < gh && cell(x - 1, y) === 1 && cell(x, y) === 0; // wall|free
        const fw = y < gh && cell(x - 1, y) === 0 && cell(x, y) === 1; // free|wall
        if (wf) runWF++; else { if (runWF >= MINRUN) snapLeft.push(x * CELL); runWF = 0; }
        if (fw) runFW++; else { if (runFW >= MINRUN) snapRight.push(x * CELL); runFW = 0; }
      }
    }
    for (let y = 1; y < gh; y++) {
      let runWF = 0, runFW = 0;
      for (let x = 0; x <= gw; x++) {
        const wf = x < gw && cell(x, y - 1) === 1 && cell(x, y) === 0;
        const fw = x < gw && cell(x, y - 1) === 0 && cell(x, y) === 1;
        if (wf) runWF++; else { if (runWF >= MINRUN) snapTop.push(y * CELL); runWF = 0; }
        if (fw) runFW++; else { if (runFW >= MINRUN) snapBottom.push(y * CELL); runFW = 0; }
      }
    }
    const dedupe = (arr) => {
      arr.sort((a, b) => a - b);
      return arr.filter((v, i) => i === 0 || v - arr[i - 1] > 0.05);
    };
    snapLeft = dedupe(snapLeft); snapRight = dedupe(snapRight);
    snapTop = dedupe(snapTop); snapBottom = dedupe(snapBottom);
  }

  // Does the item overlap a wall/fixture? (1.5 cm tolerance so a piece
  // sitting flush against a wall is not flagged.)
  function overlapsWall(item) {
    if (!wallGrid) return false;
    const fp = footprint(item);
    const m = 0.015;
    const x0 = Math.max(0, Math.floor((item.x - fp.w / 2 + m) / CELL));
    const x1 = Math.min(gw - 1, Math.ceil((item.x + fp.w / 2 - m) / CELL) - 1);
    const y0 = Math.max(0, Math.floor((item.y - fp.h / 2 + m) / CELL));
    const y1 = Math.min(gh - 1, Math.ceil((item.y + fp.h / 2 - m) / CELL) - 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (wallGrid[y * gw + x]) return true;
    return false;
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
    // snap edges to detected wall faces (interior + exterior)
    const nearest = (arr, v) => {
      let best = null;
      for (const s of arr) if (best === null || Math.abs(s - v) < Math.abs(best - v)) best = s;
      return best;
    };
    const left = item.x - fp.w / 2, right = item.x + fp.w / 2;
    const top = item.y - fp.h / 2, bottom = item.y + fp.h / 2;
    const sL = nearest(snapLeft, left), sR = nearest(snapRight, right);
    const dL = sL === null ? Infinity : Math.abs(sL - left);
    const dR = sR === null ? Infinity : Math.abs(sR - right);
    if (Math.min(dL, dR) <= WALL_SNAP) {
      if (dL <= dR) item.x = sL + fp.w / 2; else item.x = sR - fp.w / 2;
    }
    const sT = nearest(snapTop, top), sB = nearest(snapBottom, bottom);
    const dT = sT === null ? Infinity : Math.abs(sT - top);
    const dB = sB === null ? Infinity : Math.abs(sB - bottom);
    if (Math.min(dT, dB) <= WALL_SNAP) {
      if (dT <= dB) item.y = sT + fp.h / 2; else item.y = sB - fp.h / 2;
    }
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
      // leave any focused text field so Delete / arrows act on the item
      // immediately (preventDefault above suppresses the native blur)
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      selectItem(id);
      const it = getItem(id);
      const p = pointerMeters(e);
      grabDX = p.x - it.x;
      grabDY = p.y - it.y;
      moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* stale pointer */ }
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
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      selectItem(null);
    }
  });

  /* ============================================================
     Selected item panel
     ============================================================ */
  function syncSelectedPanel() {
    const it = getItem(selectedId);
    $("selForm").hidden = !it;
    $("selEmpty").hidden = !!it;
    if (!it) return;
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
      b.addEventListener("click", () => { addItem(def); closeCatalog(); });
      c.appendChild(b);
    });
  }

  /* ---------- catalog popup ---------- */
  const catalogModal = $("catalogModal");
  const openCatalog = () => { catalogModal.hidden = false; };
  const closeCatalog = () => { catalogModal.hidden = true; };
  $("btnOpenCatalog").addEventListener("click", openCatalog);
  $("btnEmptyAdd").addEventListener("click", openCatalog);
  $("btnCatalogClose").addEventListener("click", closeCatalog);
  catalogModal.addEventListener("pointerdown", (e) => {
    if (e.target === catalogModal) closeCatalog();
  });
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
     Snapshot: download the current layout as a PNG image
     ============================================================ */
  $("btnSnapshot").addEventListener("click", () => {
    const img = new Image();
    img.onload = () => {
      try {
        const PPM = 160; // export resolution (px per meter)
        const header = 70;
        const cw = Math.round(HOME.W * PPM);
        const ch = Math.round(HOME.H * PPM);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch + header;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cw, ch + header);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#2b3440";
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.fillText(
          (state.homeName || "הבית שלי") + " — דגם חנניה",
          cw / 2, header / 2);
        // plan background: same fractional sub-rect mapping as on screen
        const iw = img.naturalWidth, ih = img.naturalHeight;
        ctx.drawImage(img,
          PLAN.fx0 * iw, PLAN.fy0 * ih,
          (PLAN.fx1 - PLAN.fx0) * iw, (PLAN.fy1 - PLAN.fy0) * ih,
          0, header, cw, ch);
        state.furniture.forEach((f) => {
          const fp = footprint(f);
          const w = fp.w * PPM, h = fp.h * PPM;
          const x = f.x * PPM - w / 2;
          const y = header + f.y * PPM - h / 2;
          ctx.fillStyle = hexToRgba(f.color, 0.62);
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = shade(f.color, -0.25);
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          if (showNames && w >= 50 && h >= 30) {
            const two = h >= 56;
            ctx.fillStyle = "#1d232b";
            ctx.font = "bold 18px Arial, sans-serif";
            ctx.fillText(f.name, x + w / 2, y + h / 2 - (two ? 11 : 0), w - 8);
            if (two) {
              ctx.font = "15px Arial, sans-serif";
              ctx.fillText(Math.round(f.w * 100) + "×" + Math.round(f.d * 100),
                x + w / 2, y + h / 2 + 12, w - 8);
            }
          }
        });
        canvas.toBlob((blob) => {
          if (!blob) { alert("יצירת התמונה נכשלה"); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const safe = (state.homeName || "בית").replace(/[\\/:*?"<>|]/g, "_");
          a.href = url;
          a.download = safe + ".png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, "image/png");
      } catch (err) {
        alert("הורדת התמונה נכשלה: " + err.message);
      }
    };
    img.onerror = () => alert("טעינת תמונת התוכנית נכשלה");
    img.src = PLAN_IMG;
  });

  /* ============================================================
     Toolbar: names toggle + reset
     ============================================================ */
  $("btnToggleNames").addEventListener("click", (e) => {
    showNames = !showNames;
    document.body.classList.toggle("hide-names", !showNames);
    e.target.textContent = showNames ? "🔤 הסתר תוויות" : "🔤 הצג תוויות";
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
     Keyboard shortcuts
     Delete/Backspace = delete · arrows = nudge (Shift = 25 cm)
     Ctrl+C/X/V = copy/cut/paste · Ctrl+D = duplicate
     ============================================================ */
  let clipboard = null;

  function pasteClipboard() {
    if (!clipboard) return;
    const item = Object.assign({}, clipboard, {
      id: uid(),
      x: clipboard.x + 0.2,
      y: clipboard.y + 0.2,
    });
    constrainItem(item);
    state.furniture.push(item);
    clipboard = Object.assign({}, item); // repeated paste cascades
    selectedId = item.id;
    renderAll();
    syncSelectedPanel();
    scheduleSave();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !catalogModal.hidden) {
      closeCatalog();
      e.preventDefault();
      return;
    }
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const ctrl = e.ctrlKey || e.metaKey;
    const it = getItem(selectedId);
    // e.code is the PHYSICAL key, independent of keyboard language —
    // with a Hebrew layout Ctrl+C reports e.key="ב" but e.code="KeyC"
    const code = e.code;

    if (ctrl && code === "KeyC") {
      if (it) { clipboard = Object.assign({}, it); e.preventDefault(); }
    } else if (ctrl && code === "KeyX") {
      if (it) { clipboard = Object.assign({}, it); deleteItem(it.id); e.preventDefault(); }
    } else if (ctrl && code === "KeyV") {
      if (clipboard) { pasteClipboard(); e.preventDefault(); }
    } else if (ctrl && code === "KeyD") {
      if (it) { duplicateItem(it.id); e.preventDefault(); }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (it) { deleteItem(it.id); e.preventDefault(); }
    } else if (e.key.startsWith("Arrow")) {
      if (!it) return;
      const step = e.shiftKey ? 0.25 : GRID;
      if (e.key === "ArrowLeft") it.x -= step;
      else if (e.key === "ArrowRight") it.x += step;
      else if (e.key === "ArrowUp") it.y -= step;
      else if (e.key === "ArrowDown") it.y += step;
      constrainItem(it); // no wall snap here — it would fight the nudge
      renderItem(it);
      updateOverlaps();
      updateStats();
      scheduleSave();
      e.preventDefault();
    }
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
    // wall detection (non-fatal if it fails, e.g. canvas blocked on file://)
    const gridImg = new Image();
    gridImg.onload = () => {
      try { buildWallGrid(gridImg); } catch (err) { console.warn("זיהוי קירות נכשל", err); }
      renderAll();
    };
    gridImg.src = PLAN_IMG;
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
