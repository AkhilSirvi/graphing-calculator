(function () {
  const graphPage = document.getElementById("new_graph_page");

  // persistent viewport (world coordinates)
  const viewport = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

  // create a high-DPI canvas that fills the graphPage
  function createCanvas() {
    const old = graphPage.querySelector("canvas");
    if (old) old.remove();
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.setAttribute("aria-label", "Graph area");
    graphPage.appendChild(canvas);
    let rect = graphPage.getBoundingClientRect();
    // fallback: if the element isn't sized yet (height 0) compute available space
    if (rect.width < 100 || rect.height < 100) {
      const headerH =
        document.querySelector(".header")?.getBoundingClientRect().height || 0;
      const containerPadding = 24; // conservative padding estimate
      const availH = Math.max(
        200,
        window.innerHeight - headerH - containerPadding
      );
      rect = {
        width: Math.max(rect.width, window.innerWidth * 0.6),
        height: Math.max(rect.height, availH * 0.6),
      };
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(200, Math.floor(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function niceStep(raw) {
    const exp = Math.floor(Math.log10(raw || 1));
    const base = Math.pow(10, exp);
    const f = raw / base;
    if (f <= 1) return base;
    if (f <= 2) return 2 * base;
    if (f <= 5) return 5 * base;
    return 10 * base;
  }

  // draw grid and axes according to viewport
  function drawGrid(ctx) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    const worldToPixel = (x, y) => {
      const px = ((x - viewport.xmin) / (viewport.xmax - viewport.xmin)) * w;
      const py =
        (1 - (y - viewport.ymin) / (viewport.ymax - viewport.ymin)) * h;
      return { px, py };
    };

    const approxPixelSpacing = 80;
    const xRange = viewport.xmax - viewport.xmin;
    const yRange = viewport.ymax - viewport.ymin;
    const xSpacing = niceStep(xRange / Math.max(1, w / approxPixelSpacing));
    const ySpacing = niceStep(yRange / Math.max(1, h / approxPixelSpacing));

    // stronger grid contrast for better visibility
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;

    // vertical lines
    const xStart = Math.floor(viewport.xmin / xSpacing) * xSpacing;
    for (let x = xStart; x <= viewport.xmax; x += xSpacing) {
      const { px } = worldToPixel(x, 0);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, 0);
      ctx.lineTo(px + 0.5, h);
      ctx.stroke();
    }

    // horizontal lines
    const yStart = Math.floor(viewport.ymin / ySpacing) * ySpacing;
    for (let y = yStart; y <= viewport.ymax; y += ySpacing) {
      const { py } = worldToPixel(0, y);
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(w, py + 0.5);
      ctx.stroke();
    }

    // axes (more contrast than grid)
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1.5;
    const axisXVisible = viewport.ymin <= 0 && viewport.ymax >= 0;
    const axisYVisible = viewport.xmin <= 0 && viewport.xmax >= 0;
    let axisXpx = null,
      axisYpy = null;
    if (axisYVisible) {
      const { px } = worldToPixel(0, 0);
      axisXpx = px;
      ctx.beginPath();
      ctx.moveTo(px + 0.5, 0);
      ctx.lineTo(px + 0.5, h);
      ctx.stroke();
    }
    if (axisXVisible) {
      const { py } = worldToPixel(0, 0);
      axisYpy = py;
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(w, py + 0.5);
      ctx.stroke();
    }

    // draw tick marks and labels
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // X axis ticks (horizontal)
    const xTickStart = Math.ceil(viewport.xmin / xSpacing) * xSpacing;
    for (let x = xTickStart; x <= viewport.xmax + 1e-9; x += xSpacing) {
      const { px } = worldToPixel(x, 0);
      const label = Number(parseFloat(x.toFixed(6)));
      const yTickTop = axisXVisible ? axisYpy : h - 4;
      // tick line
      ctx.beginPath();
      ctx.moveTo(px + 0.5, yTickTop - 6);
      ctx.lineTo(px + 0.5, yTickTop + 6);
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // label
      // avoid duplicate origin label when both axes are visible
      if (!(axisYVisible && Math.abs(x) < 1e-12)) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(String(label), px, yTickTop + 8);
      }
    }

    // Y axis ticks (vertical)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yTickStart = Math.ceil(viewport.ymin / ySpacing) * ySpacing;
    for (let y = yTickStart; y <= viewport.ymax + 1e-9; y += ySpacing) {
      const { py } = worldToPixel(0, y);
      const label = Number(parseFloat(y.toFixed(6)));
      const xTickLeft = axisYVisible ? axisXpx : 40;
      ctx.beginPath();
      ctx.moveTo(xTickLeft - 6, py + 0.5);
      ctx.lineTo(xTickLeft + 6, py + 0.5);
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // avoid duplicate origin label when both axes are visible
      if (!(axisXVisible && Math.abs(y) < 1e-12)) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(String(label), xTickLeft - 8, py);
      }
    }
  }

  // helpers for coordinate transforms
  function pixelToWorld(px, py) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const x = viewport.xmin + (px / w) * (viewport.xmax - viewport.xmin);
    const y = viewport.ymin + (1 - py / h) * (viewport.ymax - viewport.ymin);
    return { x, y };
  }
  function worldToPixel(x, y) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const px = ((x - viewport.xmin) / (viewport.xmax - viewport.xmin)) * w;
    const py = (1 - (y - viewport.ymin) / (viewport.ymax - viewport.ymin)) * h;
    return { px, py };
  }

  // keep track of last plotted expressions so redraw persists
  const lastPlot = { f1raw: "", f2raw: "" };

  // central plot routine
  function plotRoutine(f1raw, f2raw) {
    if (!ctx) ctx = createCanvas();
    // detect implicit equation like "x^2 + y^2 = 2"
    function makeImplicitEvaluator(raw) {
      if (!raw || raw.indexOf("=") === -1) return null;
      const parts = raw.split("=");
      if (parts.length < 2) return null;
      let expr =
        "(" +
        parts.slice(0, parts.length - 1).join("=") +
        ")-(" +
        parts[parts.length - 1] +
        ")";
      expr = expr.replace(/\^/g, "**");
      expr = expr.replace(/\bln\b/g, "Math.log");
      expr = expr.replace(/\bpi\b/gi, "Math.PI");
      expr = expr.replace(/\be\b/g, "Math.E");
      expr = expr.replace(
        /\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|abs|floor|ceil|sqrt|log|max|min|pow|exp)\s*\(/g,
        "Math.$1("
      );
      try {
        return new Function("x", "y", "return (" + expr + ");");
      } catch (err) {
        console.warn("Invalid implicit expression:", raw, err);
        return null;
      }
    }

    function plotImplicit(fn, color = "#000") {
      if (!fn) return;
      const canvas = ctx.canvas;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const xmin = viewport.xmin,
        xmax = viewport.xmax,
        ymin = viewport.ymin,
        ymax = viewport.ymax;

      // grid resolution: adapt to pixel width but keep reasonable limits
      const cols = Math.min(300, Math.max(80, Math.floor(w / 3)));
      const rows = Math.min(300, Math.max(80, Math.floor(h / 3)));

      // precompute values
      const values = new Array((cols + 1) * (rows + 1));
      for (let j = 0; j <= rows; j++) {
        const y = ymin + (j / rows) * (ymax - ymin);
        for (let i = 0; i <= cols; i++) {
          const x = xmin + (i / cols) * (xmax - xmin);
          let v = NaN;
          try {
            v = fn(x, y);
          } catch (e) {
            v = NaN;
          }
          values[j * (cols + 1) + i] = isFinite(v) ? v : NaN;
        }
      }

      // edge interpolation helper
      function interp(i1, j1, i2, j2) {
        const idx1 = j1 * (cols + 1) + i1;
        const idx2 = j2 * (cols + 1) + i2;
        const v1 = values[idx1];
        const v2 = values[idx2];
        const x1 = xmin + (i1 / cols) * (xmax - xmin);
        const y1 = ymin + (j1 / rows) * (ymax - ymin);
        const x2 = xmin + (i2 / cols) * (xmax - xmin);
        const y2 = ymin + (j2 / rows) * (ymax - ymin);
        if (!isFinite(v1) || !isFinite(v2))
          return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        const t = v1 / (v1 - v2);
        return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
      }

      // marching squares lookup
      const table = {
        0: [],
        1: [[3, 0]],
        2: [[0, 1]],
        3: [[3, 1]],
        4: [[1, 2]],
        5: [
          [3, 0],
          [1, 2],
        ],
        6: [[0, 2]],
        7: [[3, 2]],
        8: [[2, 3]],
        9: [[0, 2]],
        10: [
          [0, 1],
          [2, 3],
        ],
        11: [[1, 2]],
        12: [[1, 3]],
        13: [[0, 1]],
        14: [[3, 0]],
        15: [],
      };

      // iterate cells
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const i0 = i,
            i1 = i + 1;
          const j0 = j,
            j1 = j + 1;
          const v0 = values[j0 * (cols + 1) + i0];
          const v1 = values[j0 * (cols + 1) + i1];
          const v2 = values[j1 * (cols + 1) + i1];
          const v3 = values[j1 * (cols + 1) + i0];
          const b0 = isFinite(v0) && v0 > 0 ? 1 : 0;
          const b1 = isFinite(v1) && v1 > 0 ? 1 : 0;
          const b2 = isFinite(v2) && v2 > 0 ? 1 : 0;
          const b3 = isFinite(v3) && v3 > 0 ? 1 : 0;
          const idx = b0 | (b1 << 1) | (b2 << 2) | (b3 << 3);
          const segs = table[idx];
          if (!segs || segs.length === 0) continue;
          // compute edge points
          const edges = [];
          // edge 0: bottom between (i0,j0)-(i1,j0)
          edges[0] = interp(i0, j0, i1, j0);
          // edge 1: right between (i1,j0)-(i1,j1)
          edges[1] = interp(i1, j0, i1, j1);
          // edge 2: top between (i1,j1)-(i0,j1)
          edges[2] = interp(i1, j1, i0, j1);
          // edge 3: left between (i0,j1)-(i0,j0)
          edges[3] = interp(i0, j1, i0, j0);

          segs.forEach((pair) => {
            const pA = edges[pair[0]];
            const pB = edges[pair[1]];
            const a = worldToPixel(pA.x, pA.y);
            const b = worldToPixel(pB.x, pB.y);
            ctx.moveTo(a.px + 0.5, a.py + 0.5);
            ctx.lineTo(b.px + 0.5, b.py + 0.5);
          });
        }
      }
      ctx.stroke();
    }
    function makeEvaluator(raw) {
      if (!raw || !raw.trim()) return null;
      let expr = raw.trim();
      expr = expr.replace(/\^/g, "**");
      expr = expr.replace(/\bln\b/g, "Math.log");
      expr = expr.replace(/\bpi\b/gi, "Math.PI");
      expr = expr.replace(/\be\b/g, "Math.E");
      expr = expr.replace(
        /\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|abs|floor|ceil|sqrt|log|max|min|pow|exp)\s*\(/g,
        "Math.$1("
      );
      try {
        return new Function("x", "return (" + expr + ");");
      } catch (err) {
        console.warn("Invalid expression:", raw, err);
        return null;
      }
    }
    // detect implicit inputs (contain '=') and use implicit evaluator
    const implicit1 = makeImplicitEvaluator(f1raw);
    const implicit2 = makeImplicitEvaluator(f2raw);
    const f1 = implicit1 ? null : makeEvaluator(f1raw);
    const f2 = implicit2 ? null : makeEvaluator(f2raw);
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const samples = Math.max(400, Math.floor(w));
    const xmin = viewport.xmin;
    const xmax = viewport.xmax;

    function sampleValues(fn) {
      const vals = [];
      for (let i = 0; i < samples; i++) {
        const x = xmin + (i / (samples - 1)) * (xmax - xmin);
        let y;
        try {
          y = fn(x);
        } catch (e) {
          y = NaN;
        }
        if (!isFinite(y)) y = NaN;
        vals.push({ x, y });
      }
      return vals;
    }

    const v1 = f1 ? sampleValues(f1) : null;
    const v2 = f2 ? sampleValues(f2) : null;

    // determine y-range from samples
    let ymin = Infinity,
      ymax = -Infinity;
    [v1, v2].forEach((v) => {
      if (!v) return;
      v.forEach((pt) => {
        if (isFinite(pt.y)) {
          if (pt.y < ymin) ymin = pt.y;
          if (pt.y > ymax) ymax = pt.y;
        }
      });
    });
    if (!isFinite(ymin) || !isFinite(ymax)) {
      ymin = viewport.ymin;
      ymax = viewport.ymax;
    }
    const pad = (ymax - ymin) * 0.1 || 1;
    ymin -= pad;
    ymax += pad;

    function plotValues(vals, color) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      let started = false;
      vals.forEach((pt) => {
        if (!isFinite(pt.y)) {
          started = false;
          return;
        }
        const { px, py } = worldToPixel(pt.x, pt.y);
        if (!started) {
          ctx.moveTo(px + 0.5, py + 0.5);
          started = true;
        } else {
          ctx.lineTo(px + 0.5, py + 0.5);
        }
      });
      ctx.stroke();
    }

    if (v1) plotValues(v1, "#d33b3b");
    if (v2) plotValues(v2, "#1f77b4");

    // plot implicit equations (overrides sampling) if present
    if (implicit1) plotImplicit(implicit1, "#d33b3b");
    if (implicit2) plotImplicit(implicit2, "#1f77b4");

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.font = "14px sans-serif";
    let yText = 18;
    if (f1raw) {
      ctx.fillText("f1: " + f1raw, 12, yText);
      yText += 18;
    }
    if (f2raw) {
      ctx.fillText("f2: " + f2raw, 12, yText);
    }
  }

  function ensureCtx() {
    const canvas = graphPage.querySelector("canvas");
    if (!canvas) {
      ctx = createCanvas();
      drawGrid(ctx);
    }
  }

  function clearAndRedraw() {
    ensureCtx();
    drawGrid(ctx);
    if (lastPlot.f1raw || lastPlot.f2raw)
      plotRoutine(lastPlot.f1raw, lastPlot.f2raw);
  }

  // initial canvas
  let ctx = createCanvas();
  drawGrid(ctx);

  // Wire buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    if (action === "clear") {
      const f1 = document.getElementById("function1");
      const f2 = document.getElementById("function2");
      if (f1) f1.value = "";
      if (f2) f2.value = "";
      lastPlot.f1raw = "";
      lastPlot.f2raw = "";
      drawGrid(ctx);
      return;
    }
    if (action === "plot") {
      const f1raw = f1data || "";
      const f2raw = document.getElementById("function2")?.value || "";
      lastPlot.f1raw = f1raw;
      lastPlot.f2raw = f2raw;
      drawGrid(ctx);
      plotRoutine(f1raw, f2raw);
      return;
    }
    if (value) {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      ) {
        const start = active.selectionStart || 0;
        const end = active.selectionEnd || 0;
        const text = active.value;
        const insert =
          value === "pi" ? "Math.PI" : value === "e" ? "Math.E" : value;
        active.value = text.slice(0, start) + insert + text.slice(end);
        const pos = start + insert.length;
        active.setSelectionRange(pos, pos);
        active.focus();
      }
    }
  });

  // pan/zoom handlers
  let isPanning = false;
  let panStart = null;
  graphPage.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    const canvas = graphPage.querySelector("canvas");
    if (!canvas) return;
    isPanning = true;
    panStart = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  graphPage.addEventListener("pointermove", (ev) => {
    if (!isPanning || !panStart) return;
    const canvas = graphPage.querySelector("canvas");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const dx = ev.clientX - panStart.x;
    const dy = ev.clientY - panStart.y;
    panStart = { x: ev.clientX, y: ev.clientY };
    const wpx = canvas.width / dpr;
    const hpx = canvas.height / dpr;
    const dxWorld = (-dx / wpx) * (viewport.xmax - viewport.xmin);
    const dyWorld = (dy / hpx) * (viewport.ymax - viewport.ymin);
    viewport.xmin += dxWorld;
    viewport.xmax += dxWorld;
    viewport.ymin += dyWorld;
    viewport.ymax += dyWorld;
    clearAndRedraw();
  });
  graphPage.addEventListener("pointerup", (ev) => {
    const canvas = graphPage.querySelector("canvas");
    if (canvas) canvas.releasePointerCapture(ev.pointerId);
    isPanning = false;
    panStart = null;
  });

  // wheel to zoom (center at cursor)
  graphPage.addEventListener(
    "wheel",
    (ev) => {
      const canvas = graphPage.querySelector("canvas");
      if (!canvas) return;
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const { x: wx, y: wy } = pixelToWorld(px, py);
      const delta = -ev.deltaY;
      const zoomFactor = Math.exp(delta * 0.0015);
      const nxmin = wx + (viewport.xmin - wx) / zoomFactor;
      const nxmax = wx + (viewport.xmax - wx) / zoomFactor;
      const nymin = wy + (viewport.ymin - wy) / zoomFactor;
      const nymax = wy + (viewport.ymax - wy) / zoomFactor;
      if (Math.abs(nxmax - nxmin) < 1e-9 || Math.abs(nymax - nymin) < 1e-9)
        return;
      viewport.xmin = nxmin;
      viewport.xmax = nxmax;
      viewport.ymin = nymin;
      viewport.ymax = nymax;
      clearAndRedraw();
    },
    { passive: false }
  );

  // resize handler
  window.addEventListener("resize", () => {
    ctx = createCanvas();
    clearAndRedraw();
  });
})();
