# graphing-calculator

Interactive, browser-based graphing calculator for plotting explicit and implicit
equations on a responsive canvas. Includes pan/zoom, axis ticks, and implicit
contour rendering (marching squares).
Live Demo: [https://akhilsirvi.github.io/graphing-calculator/src/](https://akhilsirvi.github.io/graphing-calculator/src/)
![Status](https://img.shields.io/badge/status-in_development-orange)

## Features
- Plot explicit functions y = f(x) (e.g. `sin(x)`, `x^3 - 2*x + 1`).
- Plot implicit equations (e.g. `x^2 + y^2 = 4`).
- Smooth pan (drag) and cursor-centered zoom (mouse wheel).
- Responsive layout for desktop and mobile; high-DPI canvas rendering.

## Quick Start
1. From the project root, serve the `src` directory with a static server. Example:

```powershell
cd src
python -m http.server 8000
```

2. Open http://localhost:8000 in your browser.

## Usage Tips
- Enter expressions in the inputs and click `Plot`.
- Examples:
	- Explicit: `sin(x)`, `x^2 - 3*x + 2`
	- Implicit: `x^2 + y^2 = 4`, `x^3 - y = 0`
- Controls:
	- Pan: click-and-drag on the graph area.
	- Zoom: mouse wheel (centers at cursor position).
	- Quick inserts: use the Pi/E buttons to add constants.

## Development
- Main files: [src/index.html](src/index.html), [src/style.css](src/style.css), [src/script.js](src/script.js).
- No build step required — this is a static site.

## Security Notice
This project currently evaluates user expressions with `new Function(...)` for
convenience. Do NOT host this on a public-facing site without replacing the
evaluator with a safe math parser (e.g., mathjs or a custom expression parser).

## License
See the project LICENSE file.

---
If you want changes to the UI, plotting precision, or a safer parser, open an
issue or request specific improvements.
