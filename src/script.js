(function () {
  const graphPage = document.getElementById("new_graph_page");
  // (network handle tracking removed)
  // Initialize MathQuill fields
  let MQ = MathQuill.getInterface(2);
  const defaultColors = ["#d33b3b", "#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#8c564b"];
  let functions = [
    { data: "", mathField: null, spanId: "function1", color: defaultColors[0] },
    { data: "", mathField: null, spanId: "function2", color: defaultColors[1] }
  ];
  // Function to add a new function dynamically
  function addFunction() {
    const index = functions.length + 1;
    const spanId = `function${index}`;
    const color = defaultColors[functions.length % defaultColors.length];
    const colorIndex = (functions.length + 2) % defaultColors.length;
    const gradients = [
      'linear-gradient(135deg, #1f6feb, #388bfd)',
      'linear-gradient(135deg, #1a7f37, #2da44e)',
      'linear-gradient(135deg, #d33b3b, #ff7f0e)',
      'linear-gradient(135deg, #9467bd, #8c564b)'
    ];
    const inputDiv = document.createElement("div");
    inputDiv.id = `function_input_${index}`;
    inputDiv.className = "function-input";
    inputDiv.innerHTML = `
      <div class="fn-indicator" style="background: ${gradients[colorIndex % gradients.length]};"></div>
      <div id="label_function${index}" class="fn-label-wrapper">
        <span class="fn-label">f₃(x)</span>
      </div>
      <div class="fn-input-wrapper">
        <span id="${spanId}"></span>
      </div>
    `;
    console.log(functions)
    const buttonSection = document.getElementById("user_button_section");
    document.getElementById("user_input_section").insertBefore(inputDiv, buttonSection);
    functions.push({ data: "", mathField: null, spanId: spanId, color: color });
    initializeFunction(functions.length - 1);
  }
  // Initialize a specific function
  function initializeFunction(idx) {
    const func = functions[idx];
    const span = document.getElementById(func.spanId);
    if (span) {
      func.mathField = MQ.MathField(span, {
        spaceBehavesLikeTab: true,
        handlers: { edit: function () { func.data = func.mathField.latex(); } },
        autocapitalize: 'off'
      });
      // Ensure unique id on the textarea for accessibility and associate
      // it with the visible label so assistive tech can announce it.
      const textarea = span.querySelector('textarea');
      if (textarea) {
        textarea.id = func.spanId + '-input';
        const labelId = 'label_' + func.spanId;
        textarea.setAttribute('aria-labelledby', labelId);
      }
    }
  }
  // Initialize existing functions
  functions.forEach((_, idx) => initializeFunction(idx));
  // Add button to add more functions
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "Add Function";
  addButton.addEventListener("click", addFunction);
  document.getElementById("user_button_section").appendChild(addButton);
  // initial canvas
  let ctx = window.Graph.createCanvas(graphPage);
  window.Graph.drawGrid(ctx);
  // Wire buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    if (action === "clear") {
      functions.forEach(func => {
        if (func.mathField) func.mathField.latex("");
        func.data = "";
      });
      window.Graph.drawGrid(ctx);
      return;
    }
    if (action === "plot") {
      const functionData = functions.map(func => ({ data: func.data || "", color: func.color }));
      window.Graph.drawGrid(ctx);
      return;
    }
    if (value) {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")){
        const start = active.selectionStart || 0;
        const end = active.selectionEnd || 0;
        const text = active.value;
        const insert = value === "pi" ? "Math.PI" : value === "e" ? "Math.E" : value;
        active.value = text.slice(0, start) + insert + text.slice(end);
        const pos = start + insert.length;
        active.setSelectionRange(pos, pos);
        active.focus();
      }
    }
  });
  // Setup pan/zoom
  window.Graph.setupPanZoom(graphPage, ctx);
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }
  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    // Redraw the graph with new theme
    window.Graph.clearAndRedraw(ctx, graphPage);
  });
  // Expose useful internals for development / console inspection
  // Access these from the DevTools console as `window.App`
  try {
    window.App = Object.assign({}, window.App || {}, {
      MQ,
      functions,
      graphPage,
      ctx,
      addFunction,
      initializeFunction,
      redraw: () => window.Graph.clearAndRedraw(ctx, graphPage)
    });
  } catch (e) {
    // non-critical if assigning to window fails in some environments
    console.warn('Unable to attach App to window', e);
  }

})();
