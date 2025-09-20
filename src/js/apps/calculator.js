
export const meta = { id: 'calculator', name: 'Calculator', icon: '/icons/calculator.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  ctx.globals.addLog?.('Calculator opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '200px';
  container.style.gap = '8px';
  container.setAttribute('role', 'application');

  const display = document.createElement('input');
  display.type = 'text';
  display.readOnly = true;
  display.value = '0';
  display.style.textAlign = 'right';
  display.style.fontSize = '20px';
  display.style.marginBottom = '4px';
  display.setAttribute('aria-live', 'polite');

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
    ['(', ')', 'C', '⌫'],
  ];

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4,1fr)';
  grid.style.gap = '4px';

  function tokenize(expr) {
    const tokens = [];
    let buffer = '';
    const pushBuffer = () => {
      if (buffer) {
        tokens.push(buffer);
        buffer = '';
      }
    };
    for (let i = 0; i < expr.length; i += 1) {
      const ch = expr[i];
      if (/[0-9.]/.test(ch)) {
        buffer += ch;
        continue;
      }
      if (/\s/.test(ch)) {
        pushBuffer();
        continue;
      }
      if ('+-*/()'.includes(ch)) {
        pushBuffer();
        if (ch === '-' && (tokens.length === 0 || '+-*/('.includes(tokens[tokens.length - 1]))) {
          tokens.push('0');
        }
        tokens.push(ch);
        continue;
      }
      throw new Error('Invalid character');
    }
    pushBuffer();
    return tokens;
  }

  function toRpn(tokens) {
    const output = [];
    const ops = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
    for (const token of tokens) {
      if (token === '(') {
        ops.push(token);
      } else if (token === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') {
          output.push(ops.pop());
        }
        if (ops.pop() !== '(') throw new Error('Unmatched parentheses');
      } else if (token in precedence) {
        while (
          ops.length &&
          ops[ops.length - 1] in precedence &&
          precedence[ops[ops.length - 1]] >= precedence[token]
        ) {
          output.push(ops.pop());
        }
        ops.push(token);
      } else {
        if (!/^\d*(?:\.\d+)?$/.test(token)) throw new Error('Invalid number');
        output.push(token);
      }
    }
    while (ops.length) {
      const op = ops.pop();
      if (op === '(') throw new Error('Unmatched parentheses');
      output.push(op);
    }
    return output;
  }

  function evaluateExpression(expr) {
    const rpn = toRpn(tokenize(expr));
    const stack = [];
    for (const token of rpn) {
      if ('+-*/'.includes(token)) {
        const b = Number(stack.pop());
        const a = Number(stack.pop());
        if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Invalid operand');
        let result = 0;
        switch (token) {
          case '+':
            result = a + b;
            break;
          case '-':
            result = a - b;
            break;
          case '*':
            result = a * b;
            break;
          case '/':
            if (b === 0) throw new Error('Division by zero');
            result = a / b;
            break;
          default:
            throw new Error('Unknown operator');
        }
        stack.push(result);
      } else {
        stack.push(Number(token));
      }
    }
    if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Invalid expression');
    return stack[0];
  }

  let expression = '0';

  function setDisplay(value) {
    expression = value;
    display.value = value;
  }

  function appendSymbol(symbol) {
    if (expression === 'Err') {
      setDisplay(/[0-9.(]/.test(symbol) ? symbol : '0');
      if (!/[0-9.(]/.test(symbol)) return;
    }
    if (expression === '0' && /[0-9.]/.test(symbol)) {
      setDisplay(symbol);
    } else if (expression === '0' && symbol === '(') {
      setDisplay(symbol);
    } else {
      setDisplay(expression + symbol);
    }
  }

  function clearAll() {
    setDisplay('0');
  }

  function backspace() {
    if (expression === 'Err') {
      setDisplay('0');
      return;
    }
    if (expression.length <= 1) {
      setDisplay('0');
      return;
    }
    setDisplay(expression.slice(0, -1));
  }

  function calculate() {
    try {
      const result = evaluateExpression(expression);
      setDisplay(String(Number(result.toFixed(10))));
    } catch (err) {
      setDisplay('Err');
    }
  }

  const actions = {
    '=': calculate,
    C: clearAll,
    '⌫': backspace,
  };

  buttons.flat().forEach((label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.fontSize = '18px';
    btn.style.padding = '8px';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Input ${label}`);
    if (label === '=') {
      btn.dataset.default = 'true';
    }
    btn.addEventListener('click', () => {
      if (actions[label]) {
        actions[label]();
      } else {
        appendSymbol(label);
      }
    });
    grid.append(btn);
  });

  const handleKey = (event) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      calculate();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      clearAll();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
      return;
    }
    if (/^[0-9]$/.test(event.key) || ['+', '-', '*', '/', '.', '(', ')'].includes(event.key)) {
      event.preventDefault();
      appendSymbol(event.key);
    }
  };

  const outer = winEl.closest('.window') || winEl;
  outer.addEventListener('keydown', handleKey);
  outer.addEventListener(
    'window-closed',
    () => {
      outer.removeEventListener('keydown', handleKey);
    },
    { once: true },
  );

  container.append(display, grid);
}
