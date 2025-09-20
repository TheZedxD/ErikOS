import assert from 'assert';
import { mount as mountNotepad } from '../src/js/apps/notepad.js';

class LocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
}

class ClassList {
  constructor(owner) {
    this.owner = owner;
    this._set = new Set();
  }
  _sync() {
    this.owner._className = Array.from(this._set).join(' ');
  }
  add(...classes) {
    classes.forEach((cls) => {
      if (!cls) return;
      this._set.add(cls);
    });
    this._sync();
  }
  remove(...classes) {
    classes.forEach((cls) => this._set.delete(cls));
    this._sync();
  }
  toggle(cls, force) {
    if (force === undefined) {
      if (this._set.has(cls)) {
        this._set.delete(cls);
        this._sync();
        return false;
      }
      this._set.add(cls);
      this._sync();
      return true;
    }
    if (force) this.add(cls);
    else this.remove(cls);
    return force;
  }
  contains(cls) {
    return this._set.has(cls);
  }
  toString() {
    return Array.from(this._set).join(' ');
  }
}

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parent = null;
    this.ownerDocument = null;
    this.dataset = {};
    this.style = {};
    this.eventListeners = new Map();
    this._text = '';
    this._className = '';
    this.classList = new ClassList(this);
    this.value = '';
  }
  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }
  appendChild(node) {
    if (node == null) return;
    node.parent = this;
    node.ownerDocument = this.ownerDocument;
    this.children.push(node);
    return node;
  }
  remove() {
    if (!this.parent) return;
    const idx = this.parent.children.indexOf(this);
    if (idx >= 0) this.parent.children.splice(idx, 1);
    this.parent = null;
  }
  get textContent() {
    return this._text;
  }
  set textContent(value) {
    this._text = String(value ?? '');
  }
  get className() {
    return this._className;
  }
  set className(value) {
    this._className = String(value ?? '');
    this.classList = new ClassList(this);
    if (this._className.trim()) {
      this._className
        .trim()
        .split(/\s+/)
        .forEach((cls) => this.classList.add(cls));
    }
  }
  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) this.eventListeners.set(type, []);
    this.eventListeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const list = this.eventListeners.get(type);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }
  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;
    if (event.cancelable && typeof event.preventDefault !== 'function') {
      event.preventDefault = () => {
        event.defaultPrevented = true;
      };
    }
    const handlers = this.eventListeners.get(event.type) || [];
    handlers.slice().forEach((handler) => handler.call(this, event));
    return !event.defaultPrevented;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector) {
    const tokens = selector.trim().split(/\s+/);
    const results = [];
    const traverse = (node) => {
      node.children.forEach((child) => {
        if (matchesComplex(child, tokens)) results.push(child);
        traverse(child);
      });
    };
    traverse(this);
    return results;
  }
}

class Document extends Element {
  constructor() {
    super('#document');
    this.ownerDocument = this;
    this.body = new Element('body');
    this.body.ownerDocument = this;
    this.appendChild(this.body);
  }
  createElement(tagName) {
    const el = new Element(tagName);
    el.ownerDocument = this;
    return el;
  }
  querySelector(selector) {
    return this.body.querySelector(selector);
  }
  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

class CustomEvt {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.cancelable = Boolean(options.cancelable);
    this.defaultPrevented = false;
  }
  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
}

function matchesSimple(element, selector) {
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1));
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  return element.tagName === selector.toUpperCase();
}

function matchesComplex(element, tokens) {
  const last = tokens[tokens.length - 1];
  if (!matchesSimple(element, last)) return false;
  let current = element.parent;
  for (let i = tokens.length - 2; i >= 0; i -= 1) {
    const token = tokens[i];
    while (current && !matchesSimple(current, token)) {
      current = current.parent;
    }
    if (!current) return false;
    current = current.parent;
  }
  return true;
}

function createStubCodeMirror() {
  return {
    fromTextArea(textarea) {
      let value = textarea.value || '';
      const listeners = { change: [], cursorActivity: [] };
      const emit = (type) => {
        for (const handler of listeners[type] || []) handler();
      };
      return {
        setValue(text) {
          value = text ?? '';
          textarea.value = value;
          emit('change');
          emit('cursorActivity');
        },
        getValue() {
          return value;
        },
        on(event, handler) {
          (listeners[event] || (listeners[event] = [])).push(handler);
        },
        off(event, handler) {
          if (!listeners[event]) return;
          listeners[event] = listeners[event].filter((fn) => fn !== handler);
        },
        focus() {},
        refresh() {},
        setOption() {},
        undo() {},
        redo() {},
        setSize() {},
        getCursor() {
          return { line: 0, ch: value.length };
        },
      };
    },
  };
}

const document = new Document();
const windowListeners = new Map();
const windowObj = {
  document,
  CustomEvent: CustomEvt,
  confirm: () => true,
  addEventListener(type, handler) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(handler);
  },
  removeEventListener(type, handler) {
    const list = windowListeners.get(type);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  },
  dispatchEvent(event) {
    const handlers = windowListeners.get(event.type) || [];
    handlers.slice().forEach((handler) => handler.call(windowObj, event));
    return !event.defaultPrevented;
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  localStorage: new LocalStorage(),
};

global.window = windowObj;
global.document = document;
global.CustomEvent = CustomEvt;
global.localStorage = windowObj.localStorage;
global.requestAnimationFrame = windowObj.requestAnimationFrame;

function createWindowShell() {
  const win = document.createElement('div');
  win.classList.add('window');
  const header = document.createElement('div');
  header.classList.add('window-header');
  const title = document.createElement('span');
  title.classList.add('title');
  header.append(title);
  const content = document.createElement('div');
  content.classList.add('content');
  win.append(header, content);
  document.body.append(win);
  return win;
}

async function createNotepadContext() {
  const winEl = createWindowShell();
  const writes = [];
  const handle = {
    name: 'note.txt',
    async createWritable() {
      return {
        async write(data) {
          if (data instanceof Blob) {
            writes.push(await data.text());
          } else {
            writes.push(data);
          }
        },
        async close() {},
      };
    },
    async queryPermission() {
      return 'granted';
    },
    async requestPermission() {
      return 'granted';
    },
  };

  const ctx = {
    codeMirrorLoader: async () => createStubCodeMirror(),
    fileDialogs: {
      pickOpen: async () => null,
      pickSave: async () => ({
        handle,
        async write(data) {
          if (data instanceof Blob) {
            writes.push(await data.text());
          } else {
            writes.push(data);
          }
        },
      }),
    },
  };

  const api = await mountNotepad(winEl, ctx);
  return { api, winEl, writes };
}

async function testSaveRoundTrip() {
  localStorage.clear();
  window.confirm = () => true;
  const { api, winEl, writes } = await createNotepadContext();
  api.setValue('Hello world');
  assert.strictEqual(api.isDirty(), true);

  await api.saveAs();
  assert.ok(writes.length > 0);
  assert.strictEqual(writes[writes.length - 1], 'Hello world');
  assert.strictEqual(api.isDirty(), false);

  api.setValue('Updated text');
  assert.strictEqual(api.isDirty(), true);
  await api.save();
  assert.strictEqual(writes[writes.length - 1], 'Updated text');
  assert.strictEqual(api.isDirty(), false);

  api.dispose();
  winEl.dispatchEvent(new CustomEvt('window-closed'));
  winEl.remove();
}

async function testDirtyWarning() {
  localStorage.clear();
  let confirmCalls = 0;
  window.confirm = () => {
    confirmCalls += 1;
    return false;
  };
  const { api, winEl } = await createNotepadContext();
  api.setValue('Unsaved');

  const attempt = new CustomEvt('window-before-close', { cancelable: true });
  winEl.dispatchEvent(attempt);
  assert.strictEqual(confirmCalls, 1);
  assert.strictEqual(attempt.defaultPrevented, true);

  window.confirm = () => {
    throw new Error('confirm should not be called when clean');
  };
  await api.saveAs();
  const second = new CustomEvt('window-before-close', { cancelable: true });
  const result = winEl.dispatchEvent(second);
  assert.strictEqual(result, true);
  assert.strictEqual(second.defaultPrevented, false);

  api.dispose();
  winEl.dispatchEvent(new CustomEvt('window-closed'));
  winEl.remove();
  window.confirm = () => true;
}

async function run() {
  await testSaveRoundTrip();
  await testDirtyWarning();
  console.log('notepad tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
