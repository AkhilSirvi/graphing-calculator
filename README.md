
---
## Graphing Calculator

Overview
--------
This is a lightweight web-based graphing calculator that accepts user-entered functions (LaTeX-supported via MathQuill or plain expressions) and renders them on an interactive canvas. The app focuses on implicit plotting (contour-like rendering of f(x,y)=0) using a marching-squares style approach, persistent overlay helpers (points/lines), and a small developer console API for programmatic control.

**Live Demo** : https://akhilsirvi.github.io/graphing-calculator/src/

Key features
------------
- Interactive MathQuill input for functions with LaTeX support.
- Implicit function rendering using sampling + linear interpolation across cells (implemented in `src/graph/graph_rendering.js`).
- Pan and zoom with preserved X/Y aspect ratio (`src/graph/graph.js`).
- Persistent overlays: add/remove points and lines in world coordinates; they persist through redraws, panning and resizing.
- Factorial support: postfix `!` is supported (e.g. `5!` or `(x+1)!`). Non-integer factorials use a Lanczos-based Gamma approximation.
- Per-function inline error reporting shown under the related function input when parsing/evaluation fails.

How it works
------------
- Input parsing: MathQuill supplies editable LaTeX/plain input; the code normalizes the string and rewrites known math names to `Math.*` (e.g. `sin` → `Math.sin`). A small preprocessor converts postfix `!` into `factorial(...)` before further conversions.
- Factorial handling: integer factorials use an exact product; non-integer factorials call a Lanczos-based Gamma approximation implemented in `src/graph/graph_rendering.js` (exposed as `window.lanczosGamma` / `window.factorial`).
- Expression evaluation: sanitized expressions are compiled into a lightweight evaluator via `new Function('x','y', 'return (<expr>);')`. Evaluations receive `x` and `y` in world coordinates and must return a numeric value.
- Implicit rendering: the renderer samples the function on a grid covering the visible viewport, evaluates corner values for each grid cell, detects sign changes on edges, and uses linear interpolation to estimate zero crossings — producing short line segments that approximate the implicit curve (a marching-squares-like approach).
- Coordinate transforms: sampling ranges come from the current viewport; `worldToPixel` and `pixelToWorld` convert between world coordinates and canvas pixels so overlays, points, and lines remain correct under pan/zoom.
- Error reporting and UX: parsing/evaluation for each function is wrapped in try/catch; on error the UI inserts a `.fn-error` element beneath the corresponding function input (role=`alert`) with a concise message so users can correct their expression.
- Performance notes: accuracy depends on sampling resolution — higher resolution improves fidelity but increases CPU cost. Color picker changes and function edits trigger incremental redraws.

Usage (end-user)
-----------------
1. Open `src/index.html` in a browser (or run a simple static server for local development).
2. Enter a function into one of the function input boxes. MathQuill accepts LaTeX-style input; plain expressions are also accepted and converted to Math.* functions where appropriate (e.g. `sin`, `cos`, `pi`, `e`).
3. Click `Plot Graph` to render the implicit curve(s). Use the color picker to change the function's color; the indicator updates live.
4. Pan by dragging the graph area and zoom with the mouse wheel; overlays and function plots will re-render automatically.

Notes on expressions
--------------------
- The parser rewrites known math names to `Math.*` calls (e.g. `sin(x)` → `Math.sin(x)`).
- You may use `pi` and `e` (case-insensitive) which are converted to `Math.PI` and `Math.E`.
- Postfix factorial `!` is supported and will be converted to `factorial(...)` before evaluation. Integer factorials use exact product; non-integer factorials use the Lanczos Gamma approximation.

Developer / Console API
-----------------------
From the browser DevTools console you can inspect and control the graphing internals exposed on `window.Graph` and `window.App`.

Common helpers
- `window.Graph.createCanvas(el)` – create and return a 2D context for the graph container `el`.
- `window.Graph.clearAndRedraw(ctx, el)` – redraw grid and overlays.
- `window.Graph.addPoint(x, y, color, radius)` – add a persistent overlay point (world coordinates).
- `window.Graph.clearPoints()` – remove persistent points.
- `window.Graph.addLine(x1,y1,x2,y2,color,width)` – add a persistent line.
- `window.Graph.clearLines()` – remove persistent lines.
- `window.Graph.worldToPixel(ctx,x,y)` / `window.Graph.pixelToWorld(ctx,px,py)` – coordinate conversion helpers.

Examples (console)
------------------
```javascript
window.Graph.addPoint(2, 3, 'deepskyblue', 6);
window.App && window.App.redraw();

window.Graph.addLine(-5, 0, 5, 0, 'cyan', 3);
window.App && window.App.redraw();
```

Developer notes
---------------
- Rendering algorithm lives in `src/graph/graph_rendering.js` (sampling grid resolution and linear interpolation).
- The viewport, canvas creation, pan/zoom and redraw logic are implemented in `src/graph/graph.js`.
- UI wiring and MathQuill hooks are in `src/script.js`.
- Third-party libraries are under `lib/` and listed in `THIRD-PARTY-LICENSES.md`.

Styling and accessibility
-------------------------
- Function inputs include keyboard-accessible MathQuill editors; color pickers update the associated function indicator immediately and are accessible via `aria-label` attributes.
- Per-function syntax errors are rendered beneath each function input using an element with the class `.fn-error` (role set to `alert`). You can style it in `src/style.css`.

Extending the project
---------------------
- Add a dedicated overlay canvas for labels and interactive handles if you need high-frequency updates without redrawing the main grid.
- Add more parser rules or a small expression sandbox if you want advanced mathematical constructs (matrices, symbolic manipulation).

License & third-party
---------------------
See `THIRD-PARTY-LICENSES.md` for licensing information about bundled libraries.

If you'd like, I can:
- Add a short demo page that preloads example functions.
- Add a small UI to list/remove overlays.
- Improve error messages with quick-fix suggestions for common mistakes.

