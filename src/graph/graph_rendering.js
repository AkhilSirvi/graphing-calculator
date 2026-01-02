//we divide grid into mxn then we find values
//  at all the intersection points of grid
//  with for example if f(x,y) = c here sigma
//  is c so we convert into f(x,y)-c = 0 and
//  we then check sign + or - and denote it
//  by 1 or 0 then we use lookup table in
//  each grid and accordingly we create
//  small line at each grid

//lookup table
//a ----- b
//|       |
//|       |
//d ----- c
//case = a*8 + b*4 + c*2 + d*1
const lookup = [
  [],         //0
  [[3,0]],    //1: left-bottom
  [[0,1]],    //2: bottom-right
  [[3,1]],    //3: left-right
  [[2,1]],    //4: top-right
  null,//5: two segments
  [[2,0]],    //6: top-bottom
  [[3,2]],    //7: left-top
  [[3,2]],    //8: mirror of 7
  [[2,0]],    //9: mirror of 6
  null,//10: mirror of 5
  [[2,1]],    //11: mirror of 4
  [[3,1]],    //12: mirror of 3
  [[0,1]],    //13: mirror of 2
  [[3,0]],    //14: mirror of 1
  []          //15
];

// Add Lanczos-based Gamma and factorial helpers and support postfix '!'
// so expressions like (something)! become factorial(something)
(function(){
  window.lanczosGamma = function(z) {
    var g = 7;
    var C = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * window.lanczosGamma(1 - z));
    }
    z -= 1;
    var x = C[0];
    for (var i = 1; i < C.length; i++) x += C[i] / (z + i);
    var t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x;
  };

  window.factorial = function(x) {
    var v = Number(x);
    if (!isFinite(v)) return NaN;
    var isInt = Math.floor(v) === v;
    if (isInt) {
      if (v < 0) return NaN;
      if (v === 0 || v === 1) return 1;
      var r = 1;
      for (var i = 2; i <= v; i++) r *= i;
      return r;
    }
    return window.lanczosGamma(v + 1);
  };

  // Replace postfix factorials: foo! -> factorial(foo)
  function replaceFactorials(expr) {
    if (!expr || expr.indexOf('!') === -1) return expr;
    var i = 0;
    while ((i = expr.indexOf('!', i)) !== -1) {
      var end = i;
      var start = end - 1;
      if (expr[start] === ')') {
        // find matching '('
        var depth = 0;
        while (start >= 0) {
          if (expr[start] === ')') depth++;
          else if (expr[start] === '(') {
            depth--;
            if (depth === 0) break;
          }
          start--;
        }
        if (start < 0) { i = end + 1; continue; }
      } else {
        // identifier/number/variable (letters, digits, dot, underscore)
        while (start >= 0 && /[A-Za-z0-9_.]/.test(expr[start])) start--;
        start++;
      }
      var before = expr.slice(0, start);
      var operand = expr.slice(start, end);
      var after = expr.slice(end + 1);
      expr = before + 'factorial(' + operand + ')' + after;
      i = before.length + ('factorial(' + operand + ')').length;
    }
    return expr;
  }

  // expose small helper to conversion function
  window._replaceFactorials = replaceFactorials;
})();

let m = 10000; // division of x axis
let n = 10000; // division of y axis
let resolution = m*n;

const JUMP = 0.5;        // reject massive jumps
const ZERO_RANGE = 1;  // only care near real zero crossings

function goodTransition(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;

  const signChange = (a <= 0 && b >= 0) || (a >= 0 && b <= 0);
  if (!signChange) return false;

  const jump = Math.abs(a - b);
  if (jump > JUMP) return false;

  if (Math.abs(a) > ZERO_RANGE && Math.abs(b) > ZERO_RANGE) return false;

  return true;
}



//mathematical_function_convertion(window.App.functions[0].data)
function mathematical_function_convertion(expr) {
  // handle postfix factorials like (x)! -> factorial(x)
  try { expr = (window._replaceFactorials && typeof window._replaceFactorials === 'function') ? window._replaceFactorials(expr) : expr; } catch (e) {}
      if (expr.includes("=")) {
    const parts = expr.split("=");
    expr = `(${parts.slice(0,-1).join("=")})-(${parts.at(-1)})`;
  }

    const funcs = [
    "sin","cos","tan","asin","acos","atan","atan2",
    "sqrt","abs","log","log10","exp","ceil","floor","round",
    "min","max","pow"
  ];
  const funcPattern = new RegExp(`\\b(${funcs.join("|")})\\s*\\(`, "g");
  expr = expr.replace(funcPattern, "Math.$1(");

  expr = expr.replace(/\bpi\b/gi, "Math.PI");
  expr = expr.replace(/\be\b/gi, "Math.E");
  return expr;

}
function computexy(expr, x, y) {
    const fn = new Function("x", "y", `return ${expr};`);
    return fn(x, y);
}
function main(rawExpr, settings = {m: 100, n: 100, color: 'red', width: 1}) {
  // settings: {m, n, color, width}
  m = settings.m || m;
  n = settings.n || n;
  const color = settings.color || 'red';
  const width = settings.width || 2;

  const expr = mathematical_function_convertion(rawExpr || "0");
  let fn;
  try {
    fn = new Function('x', 'y', `return (${expr});`);
  } catch (e) {
    console.error('Invalid expression', e);
    return;
  }

  const graphPage = document.getElementById('new_graph_page');
  // do not draw directly here; add persistent lines so redraw uses them

  const xmin = window.Graph.viewport.xmin;
  const ymin = window.Graph.viewport.ymin;
  const x_range = window.Graph.viewport.xmax - window.Graph.viewport.xmin;
  const y_range = window.Graph.viewport.ymax - window.Graph.viewport.ymin;
  const x_step = x_range / m;
  const y_step = y_range / n;

  // helper to compute corner function values
  const sample = (x, y) => {
    let v;
    try { v = fn(x,y); }
    catch { console.warn('Error: Function evaluation error'); throw Error('Function evaluation error'); return NaN; }

    if (!isFinite(v)) return NaN;
    return v;
  };

  // interpolation helper: find zero crossing between p1 (v1) and p2 (v2)
  const interp = (x1, y1, v1, x2, y2, v2) => {
    if (!goodTransition(v1, v2)) return null;
 if (!isFinite(v1) || !isFinite(v2)) return null;
  if (v1 === v2) return { x:(x1+x2)/2, y:(y1+y2)/2 };

  const t = v1 / (v1 - v2);
  return { x: x1 + t*(x2-x1), y: y1 + t*(y2-y1) };
  };

  // iterate cells
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const x0 = xmin + i * x_step;
      const x1 = xmin + (i + 1) * x_step;
      const y0 = ymin + j * y_step;
      const y1 = ymin + (j + 1) * y_step;

      // corners: a (top-left), b (top-right), c (bottom-right), d (bottom-left)
      const aV = sample(x0, y1);
      const bV = sample(x1, y1);
      const cV = sample(x1, y0);
      const dV = sample(x0, y0);
      if (!isFinite(aV) || !isFinite(bV) || !isFinite(cV) || !isFinite(dV))
        continue;
      const aBit = aV < 0 ? 1 : 0;
const bBit = bV < 0 ? 1 : 0;
const cBit = cV < 0 ? 1 : 0;
const dBit = dV < 0 ? 1 : 0;

      const idx = aBit * 8 + bBit * 4 + cBit * 2 + dBit * 1;

let segs = lookup[idx];

// special ambiguous cases: 5 and 10
if (idx === 5 || idx === 10) {
  const center = sample((x0 + x1) / 2, (y0 + y1) / 2);

  if (idx === 5) {
    // 0101
    segs = center < 0
      ? [[3,2]]  // connect left → top
      : [[0,1]]  // connect bottom → right
  }

  if (idx === 10) {
    // 1010
    segs = center < 0
      ? [[2,1]]  // top → right
      : [[3,0]]  // left → bottom
  }
}

if (!segs || segs.length === 0) continue;


      // edge point calculator
      const edgePoint = (edge) => {
        switch (edge) {
          case 0: // bottom (d -> c)
            return interp(x0, y0, dV, x1, y0, cV);
          case 1: // right (b -> c)
            return interp(x1, y1, bV, x1, y0, cV);
          case 2: // top (a -> b)
            return interp(x0, y1, aV, x1, y1, bV);
          case 3: // left (a -> d)
            return interp(x0, y1, aV, x0, y0, dV);
        }
      };

      // draw segments for this cell
      for (const seg of segs) {
        const p1 = edgePoint(seg[0]);
        const p2 = edgePoint(seg[1]);
        if (!p1 || !p2) continue;
        // add persistent line (world coordinates) so drawGrid->drawLines will render it
        try {
          window.Graph.addLine(p1.x, p1.y, p2.x, p2.y, color, width);
        } catch (e) {
          console.warn('add segment failed', e);
        }
      }
    }
  }
}

// expose function for UI to call
try { window.Graph.renderImplicit = main; } catch (e) {}

// rebuild implicit plots from stored App.functions (used during pan/zoom redraw)
try {
  window.Graph.rebuildImplicit = function() {
    try { window.Graph.clearLines(); } catch (e) {}
    const funcs = (window.App && Array.isArray(window.App.functions)) ? window.App.functions : [];
    funcs.forEach((func, idx) => {
      if (func && func.data && String(func.data).trim()) {
        // clear previous error for this function input (remove sibling placed below)
        try {
          const container = document.getElementById('function_input_' + (idx + 1));
          if (container) {
            const next = container.nextElementSibling;
            if (next && next.classList && next.classList.contains('fn-error')) next.remove();
          }
        } catch (e) {}

        try {
          window.Graph.renderImplicit(func.data, { m: Math.min(500, m), n: Math.min(500, n), color: func.color, width: 2 });
        } catch (e) {
          console.warn('Error: Function syntax not Defined \n' + func.data, e);
          try {
            const container = document.getElementById('function_input_' + (idx + 1));
            if (container) {
              let err = container.nextElementSibling;
              if (!err || !err.classList || !err.classList.contains('fn-error')) {
                err = document.createElement('div');
                err.className = 'fn-error';
                err.setAttribute('role', 'alert');
                err.style.color = '#c53030';
                err.style.fontSize = '12px';
                err.style.marginTop = '6px';
                container.parentNode.insertBefore(err, container.nextSibling);
              }
              err.textContent = 'Syntax error: ' + (e && e.message ? e.message : 'Invalid expression');
            }
          } catch (ee) {}
        }
      }
    });
  };
} catch (e) {}
