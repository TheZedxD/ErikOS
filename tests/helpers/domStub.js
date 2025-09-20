class FakeEvent {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
    this.bubbles = props.bubbles ?? false;
    this.cancelBubble = false;
    this.defaultPrevented = false;
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, handler) {
    const list = this._listeners.get(type) || [];
    list.push(handler);
    this._listeners.set(type, list);
  }

  removeEventListener(type, handler) {
    const list = this._listeners.get(type);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this._listeners.delete(type);
  }

  dispatchEvent(event) {
    if (!event || !event.type) throw new Error("Invalid event");
    event.target ??= this;
    event.currentTarget = this;
    const list = [...(this._listeners.get(event.type) || [])];
    for (const handler of list) {
      handler.call(this, event);
      if (event.cancelBubble) break;
    }
    if (event.bubbles && !event.cancelBubble && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }
}

class ClassList {
  constructor(owner) {
    this._owner = owner;
    this._classes = new Set();
  }

  _sync() {
    this._owner._className = Array.from(this._classes).join(" ");
  }

  _initFromString(str = "") {
    this._classes = new Set(str.split(/\s+/).filter(Boolean));
    this._sync();
  }

  add(...names) {
    for (const name of names) this._classes.add(name);
    this._sync();
  }

  remove(...names) {
    for (const name of names) this._classes.delete(name);
    this._sync();
  }

  contains(name) {
    return this._classes.has(name);
  }

  toggle(name, force) {
    if (force === true) this._classes.add(name);
    else if (force === false) this._classes.delete(name);
    else if (this._classes.has(name)) this._classes.delete(name);
    else this._classes.add(name);
    this._sync();
    return this.contains(name);
  }

  toString() {
    return Array.from(this._classes).join(" ");
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this._ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = new Proxy(
      {},
      {
        set: (obj, key, value) => {
          obj[key] = String(value);
          return true;
        },
      },
    );
    this._className = "";
    this.classList = new ClassList(this);
    this.attributes = new Map();
    this.textContent = "";
    this._defaultWidth = 320;
    this._defaultHeight = 240;
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this.classList._initFromString(String(value));
  }

  get id() {
    return this._id || "";
  }

  set id(value) {
    this._id = String(value);
    if (this._ownerDocument) {
      this._ownerDocument._registerId(this._id, this);
    }
  }

  setAttribute(name, value) {
    if (name === "class") {
      this.className = value;
    } else if (name === "id") {
      this.id = value;
    } else {
      this.attributes.set(name, String(value));
    }
  }

  getAttribute(name) {
    if (name === "class") return this.className;
    if (name === "id") return this.id;
    return this.attributes.get(name) ?? null;
  }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  querySelector(selector) {
    return this._query(selector, true);
  }

  querySelectorAll(selector) {
    const results = [];
    this._query(selector, false, results);
    return results;
  }

  _query(selector, firstOnly, collector = []) {
    for (const child of this.children) {
      if (matchesSelector(child, selector)) {
        if (firstOnly) return child;
        collector.push(child);
      }
      const nested = child._query(selector, firstOnly, collector);
      if (firstOnly && nested) return nested;
    }
    return firstOnly ? null : collector;
  }

  getBoundingClientRect() {
    const left = parseFloat(this.style.left) || 0;
    const top = parseFloat(this.style.top) || 0;
    const width = this._computeWidth();
    const height = this._computeHeight();
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  _computeWidth() {
    const value = this.style.width;
    if (typeof value === "string" && value.endsWith("px")) {
      return parseFloat(value);
    }
    if (value === "100%") return globalThis.window?.innerWidth ?? this._defaultWidth;
    return this._defaultWidth;
  }

  _computeHeight() {
    const value = this.style.height;
    if (typeof value === "string" && value.endsWith("px")) {
      return parseFloat(value);
    }
    if (value === "100%") return globalThis.window?.innerHeight ?? this._defaultHeight;
    return this._defaultHeight;
  }

  get offsetWidth() {
    return this._computeWidth();
  }

  get offsetHeight() {
    return this._computeHeight();
  }
}

class FakeDocument extends FakeEventTarget {
  constructor() {
    super();
    this._ids = new Map();
    this.body = this.createElement("body");
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    return this._ids.get(id) || null;
  }

  _registerId(id, el) {
    if (!id) return;
    this._ids.set(id, el);
  }
}

function matchesSelector(el, selector) {
  if (!selector) return false;
  if (selector.startsWith(".")) {
    return el.classList.contains(selector.slice(1));
  }
  if (selector.startsWith("#")) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith("[")) {
    const content = selector.slice(1, -1);
    const [rawAttr, rawValue] = content.split("=");
    const attr = rawAttr?.trim();
    if (!attr) return false;
    const value = rawValue ? rawValue.trim().replace(/^['"]|['"]$/g, "") : null;
    if (attr.startsWith("data-")) {
      const key = attr
        .slice(5)
        .split("-")
        .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join("");
      const dataVal = el.dataset?.[key];
      return value === null ? dataVal !== undefined : dataVal === value;
    }
    return false;
  }
  return el.tagName.toLowerCase() === selector.toLowerCase();
}

export function createMouseEvent(type, props = {}) {
  return new FakeEvent(type, props);
}

export function setupTestDOM({ width = 1024, height = 768 } = {}) {
  const document = new FakeDocument();
  const root = document.createElement("div");
  root.id = "windows-root";
  const taskbar = document.createElement("div");
  taskbar.id = "taskbar-windows";
  document.body.append(root, taskbar);

  const listeners = new Map();
  const windowTarget = {
    innerWidth: width,
    innerHeight: height,
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type);
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) listeners.delete(type);
    },
    dispatchEvent(event) {
      if (!event || !event.type) throw new Error("Invalid event");
      const list = [...(listeners.get(event.type) || [])];
      for (const handler of list) handler(event);
      return !event?.defaultPrevented;
    },
  };

  globalThis.window = windowTarget;
  globalThis.document = document;
  document.defaultView = windowTarget;

  const storage = new Map();
  globalThis.localStorage = {
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
    getItem(key) {
      return storage.has(String(key)) ? storage.get(String(key)) : null;
    },
    removeItem(key) {
      storage.delete(String(key));
    },
  };

  if (typeof globalThis.CustomEvent !== "function") {
    globalThis.CustomEvent = class CustomEvent extends FakeEvent {
      constructor(type, options = {}) {
        super(type, options);
        this.detail = options.detail;
      }
    };
  }

  return {
    document,
    window: windowTarget,
    root,
    taskbar,
    cleanup() {
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.localStorage;
    },
  };
}

