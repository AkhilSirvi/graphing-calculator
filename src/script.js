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
  // Track the index of the last-focused MathQuill function field
  let lastFocusedFunctionIndex = null;
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
        <span class="fn-label">f₃(x,y)</span>
      </div>
      <div class="fn-input-wrapper">
        <span id="${spanId}"></span>
      </div>
      <div class="fn-color-picker-wrapper">
        <input type="color" class="fn-color-picker" id="color_${spanId}" value="${color}" title="Change function color" aria-label="Color picker for function ${index}">
      </div>
    `;
    const buttonSection = document.getElementById("user_button_section");
    document.getElementById("user_input_section").insertBefore(inputDiv, buttonSection);
    functions.push({ data: "", mathField: null, spanId: spanId, color: color });
    initializeFunction(functions.length - 1);
    
    // Setup color picker for the new function
    const newColorPicker = document.getElementById(`color_${spanId}`);
    if (newColorPicker) {
      const applyNewColor = (val) => {
        functions[functions.length - 1].color = val;
        const indicator = document.querySelector(`#function_input_${index} .fn-indicator`);
        if (indicator) indicator.style.background = val;
        if (window.Graph && typeof window.Graph.clearAndRedraw === 'function') {
          window.Graph.clearAndRedraw(ctx, graphPage);
        }
      };
      newColorPicker.addEventListener('input', (e) => applyNewColor(e.target.value));
      newColorPicker.addEventListener('change', (e) => applyNewColor(e.target.value));
    }
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
        // Prevent native mobile keyboard from appearing on touch devices
        textarea.setAttribute('inputmode', 'none');
        // When the MathQuill textarea gains focus, remember which function is active
        textarea.addEventListener('focus', () => {
          lastFocusedFunctionIndex = idx;
        });
      }
      // Also mark focus when the visible span is clicked
      span.addEventListener('click', () => {
        lastFocusedFunctionIndex = idx;
        try { if (func.mathField && typeof func.mathField.focus === 'function') func.mathField.focus(); } catch (e) {}
      });
    }
  }
  // Initialize existing functions
  functions.forEach((_, idx) => initializeFunction(idx));
  
  // Setup color pickers for existing functions
  functions.forEach((func, idx) => {
    const colorPicker = document.getElementById(`color_${func.spanId}`);
    if (colorPicker) {
      const applyColor = (val) => {
        func.color = val;
        const indicator = document.querySelector(`#function_input_${idx + 1} .fn-indicator`);
        if (indicator) indicator.style.background = val;
        if (window.Graph && typeof window.Graph.clearAndRedraw === 'function') {
          window.Graph.clearAndRedraw(ctx, graphPage);
        }
      };
      colorPicker.addEventListener('input', (e) => applyColor(e.target.value));
      colorPicker.addEventListener('change', (e) => applyColor(e.target.value));
    }
  });
  
  // Add button to add more functions
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.id = "add-function-btn";
  addButton.className = "add-function-btn";
  addButton.innerHTML = `
    <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Add Function</span>
  `;
  addButton.addEventListener("click", addFunction);
  document.getElementById("user_button_section").appendChild(addButton);
  // initial canvas
  let ctx = window.Graph.createCanvas(graphPage);
  window.Graph.drawGrid(ctx);
  // Wire buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    // Skip if it's the add function button (handled by its own listener)
    if (btn.id === "add-function-btn") return;
    
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
      // refresh stored function data from MathQuill fields
      functions.forEach(func => {
        if (func.mathField && typeof func.mathField.latex === 'function') {
          try { func.data = func.mathField.latex(); } catch (e) {}
        }
      });

      // clear previous overlays then rebuild implicit plots from App.functions
      try { window.Graph.clearLines(); } catch (e) {}
      try { window.Graph.clearPoints(); } catch (e) {}
      try {
        if (typeof window.Graph.rebuildImplicit === 'function') window.Graph.rebuildImplicit();
      } catch (e) {
        console.warn('rebuildImplicit failed', e);
      }
      // immediate draw so user sees plot without panning/zooming
      try { window.Graph.drawGrid(ctx); } catch (e) {}
      return;
    }
    if (value) {
      const active = document.activeElement;
      const mqInsertMap = { pi: '\\pi', e: 'e', sin: '\\sin', cos: '\\cos', tan: '\\tan' };
      const insertForInput = value === 'pi' ? 'Math.PI' : value === 'e' ? 'Math.E' : value;
      const insertForMQ = mqInsertMap[value] || value;

      // If no meaningful element is focused, try the last-focused MathQuill field
      if (!active || active.tagName === 'BUTTON' || active === document.body || active === document.documentElement) {
        if (lastFocusedFunctionIndex !== null) {
          const targetFunc = functions[lastFocusedFunctionIndex];
          if (targetFunc && targetFunc.mathField) {
            try {
              if (typeof targetFunc.mathField.write === 'function') targetFunc.mathField.write(insertForMQ);
              else if (typeof targetFunc.mathField.cmd === 'function') targetFunc.mathField.cmd(insertForMQ);
              targetFunc.mathField.focus();
              return;
            } catch (e) {}
          }
        }
      }

      if (active) {
        // If the active element is an input/textarea that's part of a MathQuill field,
        // forward the insertion to the corresponding MathQuill instance so it updates correctly.
        if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
          const mathFunc = functions.find(f => {
            const span = document.getElementById(f.spanId);
            if (!span) return false;
            const ta = span.querySelector('textarea');
            return ta === active;
          });
          if (mathFunc && mathFunc.mathField) {
            try {
              if (typeof mathFunc.mathField.write === 'function') mathFunc.mathField.write(insertForMQ);
              else if (typeof mathFunc.mathField.cmd === 'function') mathFunc.mathField.cmd(insertForMQ);
              mathFunc.mathField.focus();
              return;
            } catch (e) {}
          }

          // Plain input/textarea fallback behavior
          const start = active.selectionStart || 0;
          const end = active.selectionEnd || 0;
          const text = active.value;
          active.value = text.slice(0, start) + insertForInput + text.slice(end);
          const pos = start + insertForInput.length;
          active.setSelectionRange(pos, pos);
          active.focus();
        } else {
          // Try MathQuill editable field ancestor
          const mqFieldEl = (active.classList && active.classList.contains('mq-editable-field')) ? active : (active.closest ? active.closest('.mq-editable-field') : null);
          let handled = false;
          if (mqFieldEl) {
            const func = functions.find(f => {
              const container = document.getElementById(f.spanId);
              return container && container.contains(mqFieldEl);
            });
            if (func && func.mathField) {
              try {
                if (typeof func.mathField.write === 'function') {
                  func.mathField.write(insertForMQ);
                } else if (typeof func.mathField.cmd === 'function') {
                  func.mathField.cmd(insertForMQ);
                }
                func.mathField.focus();
                handled = true;
              } catch (e) {}
            }
          }

          if (!handled) {
            // Fallback: insert into any contenteditable using execCommand
            try {
              document.execCommand('insertText', false, insertForInput);
            } catch (e) {
              if (active.isContentEditable) {
                active.textContent = (active.textContent || '') + insertForInput;
              }
            }
          }
        }
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
  // Mobile Keyboard Functionality
  const mobileKeyboard = document.getElementById('mobile-keyboard');
  const mobileKeyboardToggle = document.getElementById('mobile-keyboard-toggle');
  const mobileKeyboardClose = document.getElementById('mobile-keyboard-close');
  
  // Toggle mobile keyboard visibility
  function toggleMobileKeyboard() {
    const isVisible = mobileKeyboard.classList.toggle('visible');
    mobileKeyboard.setAttribute('aria-hidden', !isVisible);
  }
  
  // Close mobile keyboard
  function closeMobileKeyboard() {
    mobileKeyboard.classList.remove('visible');
    mobileKeyboard.setAttribute('aria-hidden', 'true');
  }
  
  if (mobileKeyboardToggle) {
    mobileKeyboardToggle.addEventListener('click', toggleMobileKeyboard);
  }
  
  if (mobileKeyboardClose) {
    mobileKeyboardClose.addEventListener('click', closeMobileKeyboard);
  }
  
  // Get the currently active/focused MathQuill field
  function getActiveMathField() {
    if (lastFocusedFunctionIndex !== null && functions[lastFocusedFunctionIndex]) {
      return functions[lastFocusedFunctionIndex].mathField;
    }
    // Default to first function if none focused
    return functions[0] ? functions[0].mathField : null;
  }
  
  // Handle keyboard button clicks
  mobileKeyboard.addEventListener('click', (e) => {
    const btn = e.target.closest('.kb-btn');
    if (!btn) return;
    
    const mathField = getActiveMathField();
    if (!mathField) return;
    
    // Handle actions
    const action = btn.getAttribute('data-action');
    if (action) {
      switch (action) {
        case 'backspace':
          mathField.keystroke('Backspace');
          break;
        case 'left':
          mathField.keystroke('Left');
          break;
        case 'right':
          mathField.keystroke('Right');
          break;
        case 'clear':
          mathField.latex('');
          break;
      }
      return;
    }
    
    // Handle LaTeX commands
    const latex = btn.getAttribute('data-latex');
    if (latex) {
      mathField.cmd(latex);
      mathField.focus();
      return;
    }
    
    // Handle direct commands (numbers, letters, operators)
    const cmd = btn.getAttribute('data-cmd');
    if (cmd) {
      if (cmd === '(') {
        mathField.cmd('(');
        mathField.cmd(')');
        mathField.keystroke('Left');
      } else {
        mathField.typedText(cmd);
      }
      mathField.focus();
    }
  });
  
  // Close keyboard when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileKeyboard.classList.contains('visible') && 
        !mobileKeyboard.contains(e.target) && 
        !mobileKeyboardToggle.contains(e.target)) {
      closeMobileKeyboard();
    }
  });
  
  // Prevent keyboard from closing when clicking inside it
  mobileKeyboard.addEventListener('click', (e) => {
    e.stopPropagation();
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
      redraw: () => window.Graph.clearAndRedraw(ctx, graphPage),
      toggleMobileKeyboard,
      closeMobileKeyboard
    });
  } catch (e) {
    // non-critical if assigning to window fails in some environments
    console.warn('Unable to attach App to window', e);
  }

})();
