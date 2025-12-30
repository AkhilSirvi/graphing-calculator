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

  // factorial helper using nerdamer (uses Gamma, works for real domain)
  // Fast factorial via Gamma (Lanczos approximation) with caching.
  (function() {
    var cache = new Map();
    // Lanczos coefficients
    var p = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7];

    function lanczosGamma(z) {
      if (isNaN(z)) return NaN;
      if (!isFinite(z)) return z > 0 ? Infinity : NaN;
      if (z < 0.5) {
        return Math.PI / (Math.sin(Math.PI * z) * lanczosGamma(1 - z));
      }
      z -= 1;
      var x = 0.99999999999980993;
      for (var i = 0; i < p.length; i++) {
        x += p[i] / (z + i + 1);
      }
      var t = z + p.length - 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }

    function fastFactorial(v) {
      // accept numbers or numeric strings (evaluate lazily)
      var key = typeof v === 'number' ? v : String(v).trim();
      if (cache.has(key)) return cache.get(key);
      var num = typeof v === 'number' ? v : Number(key);
      var result;
      if (!isFinite(num) || isNaN(num)) result = NaN;
      else {
        // factorial(x) = Gamma(x+1)
        result = lanczosGamma(num + 1);
      }
      cache.set(key, result);
      return result;
    }

    // expose under the previously used global name so generated functions can call it
    window.__nerdFactorial = fastFactorial;
  })();

  // replace postfix factorials like x!, (expr)!, sin(x)!, Math.PI!, etc.
  function replaceFactorials(expr) {
    if (!expr) return expr;
    // normalize spacing around '!'
    expr = expr.replace(/\s*!\s*/g, '!');
    let idx = 0;
    while ((idx = expr.indexOf('!', idx)) !== -1) {
      let j = idx - 1;
      if (j < 0) { idx++; continue; }
      if (expr[j] === ')') {
        // find matching '('
        let depth = 0, k = j;
        for (; k >= 0; k--) {
          if (expr[k] === ')') depth++;
          else if (expr[k] === '(') { depth--; if (depth === 0) break; }
        }
        if (k < 0) { idx++; continue; }
        // include possible function name or dotted prefix before '('
        let start = k;
        let p = start - 1;
        while (p >= 0 && /[A-Za-z0-9_.]/.test(expr[p])) p--;
        start = p + 1;
        const operand = expr.slice(start, idx);
        expr = expr.slice(0, start) + '(__nerdFactorial(' + operand + '))' + expr.slice(idx + 1);
        idx = start + 1;
      } else {
        // identifier or number
        let k = j;
        while (k >= 0 && /[A-Za-z0-9_.]/.test(expr[k])) k--;
        const start = k + 1;
        const operand = expr.slice(start, idx);
        expr = expr.slice(0, start) + '(__nerdFactorial(' + operand + '))' + expr.slice(idx + 1);
        idx = start + 1;
      }
    }
    return expr;
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
      // support reciprocal trig functions (csc/sec/cot)
      expr = expr.replace(/\bcsc\s*\(/g, "1/Math.sin(");
      expr = expr.replace(/\bsec\s*\(/g, "1/Math.cos(");
      expr = expr.replace(/\bcot\s*\(/g, "1/Math.tan(");

      
      // prefix common functions with Math., but avoid double-prefixing Math.*
      expr = expr.replace(/(?<!Math\.)\b(sin|cos|tan|csc|sec|cot|asin|acos|atan|sinh|cosh|tanh|abs|floor|ceil|sqrt|log|max|min|pow|exp)\s*\(/g, "Math.$1(");
      // convert postfix factorials to runtime nerdamer calls
      expr = replaceFactorials(expr);
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
          // return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
          return null;
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
            if (!pA || !pB) return;
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
      // support reciprocal trig functions (csc/sec/cot)
      expr = expr.replace(/\bcsc\s*\(/g, "1/Math.sin(");
      expr = expr.replace(/\bsec\s*\(/g, "1/Math.cos(");
      expr = expr.replace(/\bcot\s*\(/g, "1/Math.tan(");
      expr = expr.replace(/(?<!Math\.)\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|abs|floor|ceil|sqrt|log|max|min|pow|exp)\s*\(/g, "Math.$1(");
      // convert postfix factorials to runtime nerdamer calls
      expr = replaceFactorials(expr);
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
    // sampling configuration (tweak these to change quality/performance)
    const samplingConfig = {
      initialSegmentsFactor: 4, // initialSegments = Math.floor(wpx / factor)
      samplesPerUnit: 6, // additional samples per world unit when zoomed out
      maxDepth: 12,
      pixelTolerance: 1.0,
      maxPoints: 50000,
    };
    const xmin = viewport.xmin;
    const xmax = viewport.xmax;

    function sampleValues(fn) {
      // adaptive subdivision sampling
      const vals = [];
      const canvas = ctx.canvas;
      const wpx = canvas.width / (window.devicePixelRatio || 1);
      const hpx = canvas.height / (window.devicePixelRatio || 1);
        // scale initial segments by canvas pixels and world span
        const initialSegments = Math.max(
          200,
          Math.floor(wpx / samplingConfig.initialSegmentsFactor),
          Math.ceil((xmax - xmin) * samplingConfig.samplesPerUnit)
        );
        const maxDepth = samplingConfig.maxDepth; // recursion depth per segment
        const pixelTolerance = samplingConfig.pixelTolerance; // acceptable pixel error in px
        const maxPoints = samplingConfig.maxPoints; // safety cap

      function safeEval(x) {
        try {
          const y = fn(x);
          return isFinite(y) ? y : NaN;
        } catch (e) {
          return NaN;
        }
      }

      function refine(x0, y0, x1, y1, depth) {
        // always include x0,y0; refinement will add x1,y1 when appropriate
        const out = [];
        const xm = 0.5 * (x0 + x1);
        const ym = safeEval(xm);
        // if any endpoint or midpoint is NaN or we've reached max depth, don't subdivide
        if (!isFinite(y0) || !isFinite(y1) || !isFinite(ym) || depth >= maxDepth) {
          out.push({ x: x0, y: y0 });
          out.push({ x: x1, y: y1 });
          return out;
        }
        // compute pixel error between actual midpoint and linear midpoint
        const pMid = worldToPixel(xm, ym);
        const pLin = worldToPixel(xm, (y0 + y1) / 2);
        const err = Math.hypot(pMid.px - pLin.px, pMid.py - pLin.py);
        if (err <= pixelTolerance) {
          out.push({ x: x0, y: y0 });
          out.push({ x: x1, y: y1 });
          return out;
        }
        // subdivide
        const left = refine(x0, y0, xm, ym, depth + 1);
        const right = refine(xm, ym, x1, y1, depth + 1);
        // merge, avoid duplicate midpoint
        left.pop();
        return left.concat(right);
      }

      // build initial coarse samples and refine per segment
      let totalPoints = 0;
      let prev = null;
      for (let i = 0; i < initialSegments; i++) {
        const x0 = xmin + (i / initialSegments) * (xmax - xmin);
        const x1 = xmin + ((i + 1) / initialSegments) * (xmax - xmin);
        const y0 = safeEval(x0);
        const y1 = safeEval(x1);
        const seg = refine(x0, y0, x1, y1, 0);
        // append segment, avoiding duplicate at join
        for (let j = 0; j < seg.length; j++) {
          const pt = seg[j];
          if (prev && Math.abs(pt.x - prev.x) < 1e-15) continue;
          vals.push(pt);
          prev = pt;
          totalPoints++;
          if (totalPoints > maxPoints) break;
        }
        if (totalPoints > maxPoints) break;
      }
      // ensure last sample at xmax is present
      if (!vals.length || Math.abs(vals[vals.length - 1].x - xmax) > 1e-12) {
        vals.push({ x: xmax, y: safeEval(xmax) });
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
      // threshold in pixels to decide when to break the path
      const canvas = ctx.canvas;
      const h = canvas.height / (window.devicePixelRatio || 1);
      const maxGap = Math.max(40, h * 0.25);
      let prev = null;
      for (let i = 0; i < vals.length; i++) {
        const pt = vals[i];
        if (!isFinite(pt.y)) {
          prev = null;
          continue;
        }
        const { px, py } = worldToPixel(pt.x, pt.y);
        if (!prev) {
          ctx.moveTo(px + 0.5, py + 0.5);
          prev = { px, py };
          continue;
        }
        const dy = Math.abs(py - prev.py);
        // if gap too large (likely an asymptote) start a new subpath
        if (dy > maxGap) {
          ctx.moveTo(px + 0.5, py + 0.5);
        } else {
          ctx.lineTo(px + 0.5, py + 0.5);
        }
        prev = { px, py };
      }
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
      let nxmin = wx + (viewport.xmin - wx) / zoomFactor;
      let nxmax = wx + (viewport.xmax - wx) / zoomFactor;
      let nymin = wy + (viewport.ymin - wy) / zoomFactor;
      let nymax = wy + (viewport.ymax - wy) / zoomFactor;
      // enforce sensible min/max spans to avoid numeric issues
      const minSpan = 1e-12; // don't zoom in beyond this
      const maxSpan = 1e100; // allow very large zoom-out
      const newW = Math.abs(nxmax - nxmin);
      const newH = Math.abs(nymax - nymin);
      if (newW < minSpan || newH < minSpan) return;
      if (newW > maxSpan || newH > maxSpan) {
        // clamp around cursor world point to maxSpan
        const halfW = maxSpan / 2;
        nxmin = wx - halfW;
        nxmax = wx + halfW;
        const halfH = maxSpan / 2;
        nymin = wy - halfH;
        nymax = wy + halfH;
      }
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
