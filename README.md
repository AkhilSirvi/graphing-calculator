# graphing-calculator

![Status](https://img.shields.io/badge/status-in_development-orange)

## Third-party libraries

This project includes third-party libraries bundled in `lib/`. See
[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) for details on each
component, their licenses, and any modifications applied in this repository.

---

## Console API (runtime commands)

Use these commands in your browser DevTools Console to inspect and control the graph overlays (points/lines) and redraw behavior.

### Quick checks
- `window.Graph`
- `window.App`
- `Object.keys(window.Graph)`
- `Object.keys(window.App)`

### Redraw / context
- Get a drawing context:
```javascript
const ctx = (window.App && window.App.ctx) || window.Graph.createCanvas(document.getElementById('new_graph_page'));
```
- Redraw the graph (grid + overlays):
```javascript
window.App && window.App.redraw();
// or
window.Graph.clearAndRedraw(ctx, document.getElementById('new_graph_page'));
```

### Points (persistent and immediate)
- Add persistent point:
```javascript
window.Graph.addPoint(x, y, color = 'red', radius = 6);
window.App && window.App.redraw();
```
- Clear persistent points:
```javascript
window.Graph.clearPoints();
window.App && window.App.redraw();
```
- Immediate (one-off) point:
```javascript
window.Graph.drawPointImmediate(ctx, x, y, color = 'red', radius = 6);
```
- Inspect stored points:
```javascript
window.Graph._points
```

Example:
```javascript
window.Graph.addPoint(2, 3, 'deepskyblue', 5);
window.App && window.App.redraw();
```

### Lines (persistent and immediate)
- Add persistent line:
```javascript
window.Graph.addLine(x1,y1,x2,y2,color = 'black', width = 2);
window.App && window.App.redraw();
```
- Clear persistent lines:
```javascript
window.Graph.clearLines();
window.App && window.App.redraw();
```
- Immediate (one-off) line:
```javascript
window.Graph.drawLineImmediate(ctx, x1, y1, x2, y2, color = 'black', width = 2);
```
- Inspect stored lines:
```javascript
window.Graph._lines
```

Example:
```javascript
window.Graph.addLine(-5, 0, 5, 0, 'cyan', 3);
window.App && window.App.redraw();
```

### Coordinate conversion
- World → Pixel: `window.Graph.worldToPixel(ctx, x, y)` → `{px,py}`
- Pixel → World: `window.Graph.pixelToWorld(ctx, px, py)` → `{x,y}`

### Helpers & tips
- Draw and label a point:
```javascript
function drawLabeledPoint(x,y,color='red',r=6){
	const ctx = (window.App && window.App.ctx) || window.Graph.createCanvas(document.getElementById('new_graph_page'));
	window.Graph.drawPointImmediate(ctx,x,y,color,r);
	const p = window.Graph.worldToPixel(ctx,x,y);
	ctx.fillStyle = color;
	ctx.font = '12px sans-serif';
	ctx.fillText(`(${x}, ${y})`, p.px + r + 4, p.py - r - 4);
}
```
- Points/lines are stored in world coordinates and re-drawn after pan/zoom/resize.
- For interactive overlays that must not be cleared by the grid, consider a separate overlay canvas placed above the main canvas.

### Troubleshooting
- If `addPoint` or `addLine` are `undefined`, reload the page and check `Object.keys(window.Graph)`.
- Always use world coordinates for persistent shapes so `worldToPixel` keeps them correct across zoom/pan.

---

File references:
- `src/graph/graph.js`
- `src/script.js` (exposes `window.App`)

If you want a small UI to add/remove points or toggle overlays I can implement that next.
