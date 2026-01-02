(function () {
  const viewport = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
  const getIsDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const axisColor = getIsDark() ? "rgba(255,255,255,0.8)" : "rgba(129, 129, 129, 1)";
  // persistent overlay points (world coordinates)
  const points = [];
  // persistent overlay lines (each: {x1,y1,x2,y2,color,width})
  const lines = [];

  function createCanvas(graphPage) {
    const old = graphPage.querySelector("canvas");
    if (old) old.remove();
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;";
    // ensure pointer gestures are handled by our handlers (no browser pinch/scroll)
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.setAttribute("aria-label", "Graph area");
    graphPage.appendChild(canvas);
      // prevent container scrollbars from appearing when interacting with the canvas
      graphPage.style.overflow = "hidden";
      graphPage.style.touchAction = "none";
    let rect = graphPage.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) {
      const headerH = document.querySelector(".header")?.getBoundingClientRect().height || 0;
      const availH = Math.max(200, window.innerHeight - headerH - 24);
      rect = { width: Math.max(rect.width, window.innerWidth * 0.6), height: Math.max(rect.height, availH * 0.6) };
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(200, Math.floor(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
     // preserve mathematical aspect ratio so units on X and Y stay equal
    // when the screen/canvas is resized (prevents axes appearing stretched)
    preserveAspect(viewport, rect.width, rect.height);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // Ensure one unit in X equals one unit in Y after resize by expanding
  // the shorter dimension's world-range to match the canvas aspect ratio.
  function preserveAspect(viewport, w, h) {
    const xRange = viewport.xmax - viewport.xmin;
    const yRange = viewport.ymax - viewport.ymin;
    if (w <= 0 || h <= 0) return;
    const unitsPerPxX = xRange / w;
    const unitsPerPxY = yRange / h;
    if (Math.abs(unitsPerPxX - unitsPerPxY) < 1e-12) return;
    const cx = (viewport.xmin + viewport.xmax) / 2;
    const cy = (viewport.ymin + viewport.ymax) / 2;
    if (unitsPerPxX > unitsPerPxY) {
      // X is coarser; expand Y range
      const targetY = unitsPerPxX * h;
      viewport.ymin = cy - targetY / 2;
      viewport.ymax = cy + targetY / 2;
    } else {
      // Y is coarser; expand X range
      const targetX = unitsPerPxY * w;
      viewport.xmin = cx - targetX / 2;
      viewport.xmax = cx + targetX / 2;
    }
  }

  // Compute drawing transform that maps world coords to a centered region
  // inside the canvas while preserving X/Y aspect ratio (letterbox).
  function getTransform(ctx) {
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const xRange = viewport.xmax - viewport.xmin;
    const yRange = viewport.ymax - viewport.ymin;
    const scale = Math.min(w / xRange, h / yRange);
    const drawW = scale * xRange;
    const drawH = scale * yRange;
    const offsetX = (w - drawW) / 2;
    const offsetY = (h - drawH) / 2;
    return { scale, offsetX, offsetY, drawW, drawH, w, h };
  }

  function niceStep(raw) {
    const exp = Math.floor(Math.log10(raw || 1));
    const base = Math.pow(10, exp);
    const f = raw / base;
    return f <= 1 ? base : f <= 2 ? 2 * base : f <= 5 ? 5 * base : 10 * base;
  }

  function drawGrid(ctx) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    const worldToPixel = (x, y) => ({
      px: ((x - viewport.xmin) / (viewport.xmax - viewport.xmin)) * w,
      py: (1 - (y - viewport.ymin) / (viewport.ymax - viewport.ymin)) * h
    });

    const approxPixelSpacing = 80;
    const xRange = viewport.xmax - viewport.xmin;
    const yRange = viewport.ymax - viewport.ymin;
    const avgRange = (xRange + yRange) / 2;
    const avgDim = (w + h) / 2;
    const spacing = niceStep(avgRange / Math.max(1, avgDim / approxPixelSpacing));
    const xSpacing = spacing;
    const ySpacing = spacing;

    const isDark = getIsDark();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.12)" : "rgba(190,190,190,1)";
    ctx.lineWidth = 1;

    const drawLine = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1 + 0.5, y1 + 0.5);
      ctx.lineTo(x2 + 0.5, y2 + 0.5);
      ctx.stroke();
    };

    const xStart = Math.floor(viewport.xmin / xSpacing) * xSpacing;
    for (let x = xStart; x <= viewport.xmax; x += xSpacing) {
      const { px } = worldToPixel(x, 0);
      drawLine(px, 0, px, h);
    }

    const yStart = Math.floor(viewport.ymin / ySpacing) * ySpacing;
    for (let y = yStart; y <= viewport.ymax; y += ySpacing) {
      const { py } = worldToPixel(0, y);
      drawLine(0, py, w, py);
    }

    // sub-grids
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(240,240,240,1)";
    ctx.lineWidth = 1;
    const subXSpacing = xSpacing / 5;
    const subYSpacing = ySpacing / 5;
    const subXStart = Math.floor(viewport.xmin / subXSpacing) * subXSpacing;
    for (let x = subXStart; x <= viewport.xmax; x += subXSpacing) {
      if (x % xSpacing !== 0) {
        const { px } = worldToPixel(x, 0);
        drawLine(px, 0, px, h);
      }
    }
    const subYStart = Math.floor(viewport.ymin / subYSpacing) * subYSpacing;
    for (let y = subYStart; y <= viewport.ymax; y += subYSpacing) {
      if (y % ySpacing !== 0) {
        const { py } = worldToPixel(0, y);
        drawLine(0, py, w, py);
      }
    }

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    const axisXVisible = viewport.ymin <= 0 && viewport.ymax >= 0;
    const axisYVisible = viewport.xmin <= 0 && viewport.xmax >= 0;
    let axisXpx = null, axisYpy = null;
    if (axisYVisible) {
      const { px } = worldToPixel(0, 0);
      axisXpx = px;
      drawLine(px, 0, px, h);
    }
    if (axisXVisible) {
      const { py } = worldToPixel(0, 0);
      axisYpy = py;
      drawLine(0, py, w, py);
    }

    ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
    ctx.font = "12px sans-serif";

    // helper to draw text clamped inside canvas bounds
    function drawTextClamped(text, x, y, align = "center", baseline = "top") {
      const metrics = ctx.measureText(text);
      const textW = metrics.width;
      const textH = parseInt((ctx.font || "12px").match(/\d+/)) || 12;
      // compute left based on align
      let left = align === "center" ? x - textW / 2 : align === "right" ? x - textW : x;
      const margin = 4;
      left = Math.max(margin, Math.min(w - margin - textW, left));
      // compute top based on baseline
      let top = baseline === "top" ? y : baseline === "bottom" ? y - textH : y - textH / 2;
      top = Math.max(2, Math.min(h - textH - 2, top));
      const oldAlign = ctx.textAlign;
      const oldBaseline = ctx.textBaseline;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(text, left, top);
      ctx.textAlign = oldAlign;
      ctx.textBaseline = oldBaseline;
    }

    // format numbers: use scientific notation for large magnitudes
    function formatLabelNumber(v) {
      if (!isFinite(v)) return String(v);
      if (Math.abs(v) >= 1e6) {
        return v.toExponential(2).replace("e+", "e");
      }
      const n = Number(parseFloat(v.toFixed(6)));
      return String(n);
    }

    // place labels on the side opposite the viewport center
    const centerX = (viewport.xmin + viewport.xmax) / 2;
    const centerY = (viewport.ymin + viewport.ymax) / 2;
    const xLabelAtBottom = centerY >= 0; // if viewport centered above y=0, label bottom
    const yLabelAtLeft = centerX >= 0; // if viewport centered right of x=0, label left

    ctx.textAlign = "center";
    ctx.textBaseline = xLabelAtBottom ? "top" : "bottom";

    const drawTick = (px, py, isX) => {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      if (isX) drawLine(px, py - 6, px, py + 6);
      else drawLine(px - 6, py, px + 6, py);
    };

    const xTickStart = Math.ceil(viewport.xmin / xSpacing) * xSpacing;
    // decide x-label placement: on axis if visible, otherwise opposite side
    let xLabelY;
    if (axisXVisible && axisYpy != null) {
      xLabelY = axisYpy;
      // place labels on the side away from canvas center if possible
      const below = axisYpy < h / 2;
      for (let x = xTickStart; x <= viewport.xmax + 1e-9; x += xSpacing) {
        const { px } = worldToPixel(x, 0);
        const label = Number(parseFloat(x.toFixed(6)));
        const labelStr = formatLabelNumber(label);
        drawTick(px, xLabelY, true);
        // compute label Y and clamp inside canvas
        let labelY = below ? xLabelY + 8 : xLabelY - 8;
        labelY = Math.max(2, Math.min(h - 14, labelY));
        if (!(axisYVisible && Math.abs(x) < 1e-12)) {
          ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
          drawTextClamped(labelStr, px, labelY, "center", below ? "top" : "bottom");
        }
      }
    } else {
      const xLabelAtBottom = centerY >= 0;
      xLabelY = xLabelAtBottom ? h - 4 : 4;
      ctx.textBaseline = xLabelAtBottom ? "top" : "bottom";
      for (let x = xTickStart; x <= viewport.xmax + 1e-9; x += xSpacing) {
        const { px } = worldToPixel(x, 0);
        const label = Number(parseFloat(x.toFixed(6)));
        const labelStr = formatLabelNumber(label);
        drawTick(px, xLabelY, true);
        let labelY = xLabelAtBottom ? xLabelY - 8 : xLabelY + 8;
        // if bottom, place above the bottom tick; if top, place below top tick
        labelY = Math.max(2, Math.min(h - 14, labelY));
        if (!(axisYVisible && Math.abs(x) < 1e-12)) {
          ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
          drawTextClamped(labelStr, px, labelY, "center", xLabelAtBottom ? "bottom" : "top");
        }
      }
    }

    // Y labels: on axis if visible, otherwise on left/right edge opposite viewport center
    const yTickStart = Math.ceil(viewport.ymin / ySpacing) * ySpacing;
    if (axisYVisible && axisXpx != null) {
      const xAt = axisXpx;
      // place labels on the side opposite the axis pixel position
      const leftSide = xAt > w / 2;
      ctx.textAlign = leftSide ? "right" : "left";
      ctx.textBaseline = "middle";
      for (let y = yTickStart; y <= viewport.ymax + 1e-9; y += ySpacing) {
        const { py } = worldToPixel(0, y);
        const label = Number(parseFloat(y.toFixed(6)));
        const labelStr = formatLabelNumber(label);
        drawTick(xAt, py, false);
        let labelX = xAt + (leftSide ? -8 : 8);
        labelX = Math.max(4, Math.min(w - 4, labelX));
        if (!(axisXVisible && Math.abs(y) < 1e-12)) {
          ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
          drawTextClamped(labelStr, labelX, py, leftSide ? "right" : "left", "middle");
        }
      }
    } else {
      const yLabelAtLeft = centerX >= 0;
      const yLabelX = yLabelAtLeft ? 0 : w - 80;
      ctx.textAlign = yLabelAtLeft ? "right" : "left";
      ctx.textBaseline = "middle";
      for (let y = yTickStart; y <= viewport.ymax + 1e-9; y += ySpacing) {
        const { py } = worldToPixel(0, y);
        const label = Number(parseFloat(y.toFixed(6)));
        const labelStr = formatLabelNumber(label);
        drawTick(yLabelX, py, false);
        if (!(axisXVisible && Math.abs(y) < 1e-12)) {
          ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
          drawTextClamped(labelStr, yLabelX + (yLabelAtLeft ? -8 : 8), py, yLabelAtLeft ? "right" : "left", "middle");
        }
      }
    }

    // draw any persistent overlay lines and points after grid + axes
    try {
      drawLines(ctx);
    } catch (e) {
      console.warn('drawLines error', e);
    }
    try {
      drawPoints(ctx);
    } catch (e) {
      // non-fatal: drawing overlays should not break grid rendering
      console.warn('drawPoints error', e);
    }
  }

  function pixelToWorld(ctx, px, py) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const x = viewport.xmin + (px / w) * (viewport.xmax - viewport.xmin);
    const y = viewport.ymin + (1 - py / h) * (viewport.ymax - viewport.ymin);
    return { x, y };
  }

  // Draw persistent points stored in `points` (world coordinates)
  function drawPoints(ctx) {
    if (!points || points.length === 0) return;
    // use worldToPixel to transform coordinates
    points.forEach(pt => {
      try {
        const { px, py } = worldToPixel(ctx, pt.x, pt.y);
        ctx.beginPath();
        ctx.fillStyle = pt.color || 'red';
        ctx.arc(px, py, pt.radius || 6, 0, Math.PI * 2);
        ctx.fill();
      } catch (e) {
        console.warn('Failed drawing point', pt, e);
      }
    });
  }

  // Draw persistent lines stored in `lines` (world coordinates)
  function drawLines(ctx) {
    if (!lines || lines.length === 0) return;
    lines.forEach(ln => {
      try {
        const p1 = worldToPixel(ctx, ln.x1, ln.y1);
        const p2 = worldToPixel(ctx, ln.x2, ln.y2);
        ctx.beginPath();
        ctx.strokeStyle = ln.color || 'rgba(0,0,0,0.8)';
        ctx.lineWidth = ln.width || 2;
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      } catch (e) {
        console.warn('Failed drawing line', ln, e);
      }
    });
  }

  function addLine(x1, y1, x2, y2, color = 'black', width = 2) {
    lines.push({ x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), color, width });
  }

  function clearLines() {
    lines.length = 0;
  }

  function drawLineImmediate(ctx, x1, y1, x2, y2, color = 'black', width = 2) {
    const p1 = worldToPixel(ctx, x1, y1);
    const p2 = worldToPixel(ctx, x2, y2);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.stroke();
  }

  function addPoint(x, y, color = 'red', radius = 6) {
    points.push({ x: Number(x), y: Number(y), color, radius });
  }

  function clearPoints() {
    points.length = 0;
  }

  function drawPointImmediate(ctx, x, y, color = 'red', radius = 6) {
    const { px, py } = worldToPixel(ctx, x, y);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function worldToPixel(ctx, x, y) {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const px = ((x - viewport.xmin) / (viewport.xmax - viewport.xmin)) * w;
    const py = (1 - (y - viewport.ymin) / (viewport.ymax - viewport.ymin)) * h;
    return { px, py };
  }

  function ensureCtx(graphPage, ctx) {
    const canvas = graphPage.querySelector("canvas");
    return canvas ? ctx || canvas.getContext("2d") : createCanvas(graphPage);
  }

  function clearAndRedraw(ctx, graphPage) {
    try {
      if (window.Graph && typeof window.Graph.rebuildImplicit === 'function') {
        window.Graph.rebuildImplicit();
      }
    } catch (e) {}
    drawGrid(ctx);
  }

  function setupPanZoom(graphPage, ctx) {
    // Support both single-finger panning and two-finger pinch-to-zoom.
    let isPanning = false, panStart = null;
    const pointers = new Map();
    let isPinching = false, pinchStartDist = null, pinchStartViewport = null, pinchStartCenter = null;

    function getDistance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    function getMidpoint(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    graphPage.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      const canvas = graphPage.querySelector("canvas");
      if (!canvas) return;
      // store pointer info (client coords)
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      canvas.setPointerCapture(ev.pointerId);

      if (pointers.size >= 2) {
        // start pinch
        isPinching = true;
        isPanning = false;
        // take two pointers
        const it = pointers.values();
        const p1 = it.next().value;
        const p2 = it.next().value;
        // avoid extremely small start distances which lead to huge scale factors
        pinchStartDist = Math.max(getDistance(p1, p2), 1e-3);
        pinchStartViewport = { xmin: viewport.xmin, xmax: viewport.xmax, ymin: viewport.ymin, ymax: viewport.ymax };
        // lock the pinch center in world coordinates and record its pixel position
        try {
          const rect = canvas.getBoundingClientRect();
          const mid = getMidpoint(p1, p2);
          const px = mid.x - rect.left;
          const py = mid.y - rect.top;
          pinchStartCenter = pixelToWorld(ctx, px, py);
          pinchStartCenter._px = px;
          pinchStartCenter._py = py;
        } catch (e) {
          pinchStartCenter = { x: (viewport.xmin + viewport.xmax) / 2, y: (viewport.ymin + viewport.ymax) / 2 };
          pinchStartCenter._px = null;
          pinchStartCenter._py = null;
        }
      } else {
        // single-finger pan start
        isPanning = true;
        panStart = { x: ev.clientX, y: ev.clientY };
      }
    });

    graphPage.addEventListener("pointermove", (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      // update stored pointer location
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const canvas = graphPage.querySelector("canvas");
      if (!canvas) return;

      if (isPinching && pointers.size >= 2) {
        ev.preventDefault();
        // pinch-to-zoom: compute current distance and center
        const it = pointers.values();
        const p1 = it.next().value;
        const p2 = it.next().value;
        const curDist = getDistance(p1, p2);
        if (!pinchStartDist || pinchStartDist === 0) return;
        // clamp zoom factor to a safe range to avoid numeric explosions
        const rawZoom = curDist / pinchStartDist;
        const zoomFactor = Math.max(1e-3, Math.min(1e3, rawZoom));
        // scale relative to the locked pinch start center and viewport (no translation)
        const sv = pinchStartViewport;
        const cx = pinchStartCenter ? pinchStartCenter.x : (sv.xmin + sv.xmax) / 2;
        const cy = pinchStartCenter ? pinchStartCenter.y : (sv.ymin + sv.ymax) / 2;
        let nxmin = cx + (sv.xmin - cx) / zoomFactor;
        let nxmax = cx + (sv.xmax - cx) / zoomFactor;
        let nymin = cy + (sv.ymin - cy) / zoomFactor;
        let nymax = cy + (sv.ymax - cy) / zoomFactor;
        const minSpan = 1e-12;
        const maxSpan = 1e100;
        const newW = Math.abs(nxmax - nxmin);
        const newH = Math.abs(nymax - nymin);
        if (newW < minSpan || newH < minSpan) return;
        if (newW > maxSpan || newH > maxSpan) {
          const halfW = maxSpan / 2;
          nxmin = cx - halfW;
          nxmax = cx + halfW;
          const halfH = maxSpan / 2;
          nymin = cy - halfH;
          nymax = cy + halfH;
        }
        // compensate for any pixel offset so the locked center stays at the same canvas pixel
        try {
          if (pinchStartCenter && pinchStartCenter._px != null) {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            // compute pixel position of the center under the new viewport
            const pxNew = ((cx - nxmin) / (nxmax - nxmin)) * w;
            const pyNew = (1 - (cy - nymin) / (nymax - nymin)) * h;
            const dxPx = pxNew - pinchStartCenter._px;
            const dyPx = pyNew - pinchStartCenter._py;
            // convert pixel offset to world offset in new viewport and shift viewport to compensate
            const shiftWorldX = (dxPx / w) * (nxmax - nxmin);
            const shiftWorldY = -(dyPx / h) * (nymax - nymin);
            nxmin -= shiftWorldX;
            nxmax -= shiftWorldX;
            nymin -= shiftWorldY;
            nymax -= shiftWorldY;
          }
        } catch (e) {}

        viewport.xmin = nxmin;
        viewport.xmax = nxmax;
        viewport.ymin = nymin;
        viewport.ymax = nymax;
        clearAndRedraw(ctx, graphPage);
      } else if (isPanning && panStart) {
        // single-finger pan behavior
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
        clearAndRedraw(ctx, graphPage);
      }
    });

    function endPointer(ev) {
      const canvas = graphPage.querySelector("canvas");
      if (canvas) {
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) {
        isPinching = false;
        pinchStartDist = null;
        pinchStartViewport = null;
        pinchStartCenter = null;
      }
      if (pointers.size === 0) {
        isPanning = false;
        panStart = null;
      }
    }

    graphPage.addEventListener("pointerup", endPointer);
    graphPage.addEventListener("pointercancel", endPointer);

    graphPage.addEventListener("wheel", (ev) => {
      const canvas = graphPage.querySelector("canvas");
      if (!canvas) return;
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const { x: wx, y: wy } = pixelToWorld(ctx, px, py);
      const delta = -ev.deltaY;
      const zoomFactor = Math.exp(delta * 0.0015);
      let nxmin = wx + (viewport.xmin - wx) / zoomFactor;
      let nxmax = wx + (viewport.xmax - wx) / zoomFactor;
      let nymin = wy + (viewport.ymin - wy) / zoomFactor;
      let nymax = wy + (viewport.ymax - wy) / zoomFactor;
      const minSpan = 1e-12;
      const maxSpan = 1e100;
      const newW = Math.abs(nxmax - nxmin);
      const newH = Math.abs(nymax - nymin);
      if (newW < minSpan || newH < minSpan) return;
      if (newW > maxSpan || newH > maxSpan) {
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
      clearAndRedraw(ctx, graphPage);
    }, { passive: false });
      // attach wheel zoom handler to the canvas so wheel events don't scroll the page
      (function attachWheel() {
        const canvas = graphPage.querySelector("canvas");
        if (!canvas) return;
        canvas.addEventListener(
          "wheel",
          (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const rect = canvas.getBoundingClientRect();
            const px = ev.clientX - rect.left;
            const py = ev.clientY - rect.top;
            const { x: wx, y: wy } = pixelToWorld(ctx, px, py);
            const delta = -ev.deltaY;
            const zoomFactor = Math.exp(delta * 0.0015);
            let nxmin = wx + (viewport.xmin - wx) / zoomFactor;
            let nxmax = wx + (viewport.xmax - wx) / zoomFactor;
            let nymin = wy + (viewport.ymin - wy) / zoomFactor;
            let nymax = wy + (viewport.ymax - wy) / zoomFactor;
            const minSpan = 1e-12;
            const maxSpan = 1e100;
            const newW = Math.abs(nxmax - nxmin);
            const newH = Math.abs(nymax - nymin);
            if (newW < minSpan || newH < minSpan) return;
            if (newW > maxSpan || newH > maxSpan) {
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
            clearAndRedraw(ctx, graphPage);
          },
          { passive: false }
        );
      })();

    window.addEventListener("resize", () => {
      ctx = createCanvas(graphPage);
      clearAndRedraw(ctx, graphPage);
    });
  }

  window.Graph = {
    viewport,
    createCanvas,
    drawGrid,
    pixelToWorld,
    worldToPixel,
    ensureCtx,
    clearAndRedraw,
    setupPanZoom
  };
  // expose overlay helpers and persistent points for console/debugging
  try {
    Object.assign(window.Graph, {
      addPoint,
      clearPoints,
      drawPoints,
      drawPointImmediate,
      _points: points,
      addLine,
      clearLines,
      drawLines,
      drawLineImmediate,
      _lines: lines
    });
  } catch (e) {
    console.warn('Unable to attach overlay helpers to window.Graph', e);
  }
})();