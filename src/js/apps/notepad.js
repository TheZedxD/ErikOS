import { pickOpen, pickSave } from '../utils/file-dialogs.js';

export const meta = {
  id: 'notepad',
  name: 'Notepad',
  icon: '/icons/notepad.png',
  comingSoon: false,
};

const AUTOSAVE_KEY = 'notepad-autosave';
const LAST_PATH_KEY = 'notepad-last-path';
const TEXT_TYPES = [
  {
    description: 'Text files',
    accept: {
      'text/plain': ['.txt', '.md', '.csv', '.json', '.js', '.html', '.css'],
    },
  },
];

let codeMirrorPromise = null;

function ensureCodeMirror() {
  if (!codeMirrorPromise) {
    codeMirrorPromise = import('https://esm.sh/codemirror@5.65.16?bundle');
  }
  return codeMirrorPromise.then((mod) => mod.default || mod);
}

function getTitleElement(winEl) {
  return winEl.querySelector('.window-header .title');
}

function setWindowTitle(winEl, name, dirty) {
  const titleEl = getTitleElement(winEl);
  if (titleEl) titleEl.textContent = `${dirty ? '* ' : ''}${meta.name} - ${name}`;
}

function updateStatusBar(statusEl, cursor, dirty, infoText = '') {
  const line = cursor?.line ?? 0;
  const ch = cursor?.ch ?? 0;
  const parts = [`Ln ${line + 1}`, `Col ${ch + 1}`];
  if (infoText) parts.push(infoText);
  if (dirty) parts.push('Unsaved');
  statusEl.textContent = parts.join(' · ');
}

async function ensurePermission(handle, mode = 'read') {
  if (!handle || typeof handle.queryPermission !== 'function') return true;
  try {
    const opts = { mode };
    let status = await handle.queryPermission(opts);
    if (status === 'granted') return true;
    if (status === 'prompt' && typeof handle.requestPermission === 'function') {
      status = await handle.requestPermission(opts);
      return status === 'granted';
    }
    return status === 'granted';
  } catch (err) {
    console.warn('Permission request failed', err);
    return false;
  }
}

async function writeToHandle(handle, contents) {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function launch(ctx, initial = '') {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id)?.element;
  if (!win) return;
  await mount(win, ctx, initial);
}

export async function mount(winEl, ctx, initial = '') {
  const container = winEl.querySelector('.content');
  if (!container) return null;
  container.innerHTML = '';
  container.classList.add('notepad');

  const dialogs = {
    pickOpen: ctx?.fileDialogs?.pickOpen ?? pickOpen,
    pickSave: ctx?.fileDialogs?.pickSave ?? pickSave,
  };
  const loadCodeMirror = ctx?.codeMirrorLoader ?? ensureCodeMirror;

  const layout = document.createElement('div');
  layout.classList.add('notepad-layout');

  const menu = document.createElement('div');
  menu.classList.add('notepad-menu');

  const editorHost = document.createElement('div');
  editorHost.classList.add('notepad-editor-host');

  const status = document.createElement('div');
  status.classList.add('notepad-status');
  status.textContent = 'Ln 1 · Col 1';

  layout.append(menu, editorHost, status);
  container.append(layout);

  function makeButton(label, title, options = {}) {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (title) btn.title = title;
    if (options.toggle) btn.dataset.toggle = '1';
    return btn;
  }

  const newBtn = makeButton('New', 'Create a new document');
  const openBtn = makeButton('Open', 'Open an existing file');
  const saveBtn = makeButton('Save', 'Save changes');
  const saveAsBtn = makeButton('Save As', 'Save with a new name');
  const wrapBtn = makeButton('Wrap', 'Toggle word wrap', { toggle: true });
  const undoBtn = makeButton('Undo', 'Undo last change');
  const redoBtn = makeButton('Redo', 'Redo last change');

  menu.append(newBtn, openBtn, saveBtn, saveAsBtn, wrapBtn, undoBtn, redoBtn);

  const textarea = document.createElement('textarea');
  textarea.classList.add('notepad-textarea');
  editorHost.append(textarea);

  const CodeMirror = await loadCodeMirror();
  const editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: 'text/plain',
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
  });

  editor.setSize('100%', '100%');
  setTimeout(() => editor.refresh(), 0);

  let currentHandle = null;
  let currentName = 'untitled.txt';
  let currentPathInfo = '';
  let dirty = false;
  let wrapEnabled = true;
  let autosaveTimer = null;

  const storedPathInfo = (() => {
    try {
      return localStorage.getItem(LAST_PATH_KEY) || '';
    } catch (_) {
      return '';
    }
  })();

  const storedText = (() => {
    try {
      return localStorage.getItem(AUTOSAVE_KEY);
    } catch (_) {
      return null;
    }
  })();

  const initialState = normalizeInitial(initial, storedText);
  if (initialState.name) currentName = initialState.name;
  if (initialState.path) currentPathInfo = initialState.path;
  else if (initialState.handle?.name) currentPathInfo = initialState.handle.name;
  else if (storedPathInfo) currentPathInfo = storedPathInfo;
  if (initialState.handle) currentHandle = initialState.handle;

  editor.setValue(initialState.content);
  setWindowTitle(winEl, currentName, dirty);
  updateStatusBar(status, editor.getCursor(), dirty, currentPathInfo);
  wrapBtn.classList.toggle('active', wrapEnabled);

  function persistAutosave(text) {
    try {
      localStorage.setItem(AUTOSAVE_KEY, text);
    } catch (_) {
      /* ignore */
    }
  }

  function persistPath(path) {
    try {
      if (path) localStorage.setItem(LAST_PATH_KEY, path);
      else localStorage.removeItem(LAST_PATH_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function markDirty(value) {
    dirty = value;
    setWindowTitle(winEl, currentName, dirty);
    updateStatusBar(status, editor.getCursor(), dirty, currentPathInfo);
  }

  function setContent(content, options = {}) {
    editor.setValue(content ?? '');
    editor.focus();
    markDirty(Boolean(options.dirty));
    if (!options.dirty) persistAutosave(editor.getValue());
  }

  function applyHandle(handle, name, path) {
    currentHandle = handle ?? null;
    currentName = name || handle?.name || 'untitled.txt';
    currentPathInfo = path || handle?.name || '';
    persistPath(currentPathInfo);
    setWindowTitle(winEl, currentName, dirty);
    updateStatusBar(status, editor.getCursor(), dirty, currentPathInfo);
  }

  function editorChanged() {
    persistAutosave(editor.getValue());
    markDirty(true);
  }

  editor.on('change', editorChanged);
  editor.on('cursorActivity', () => {
    updateStatusBar(status, editor.getCursor(), dirty, currentPathInfo);
  });

  winEl.addEventListener('resized', () => editor.refresh());

  async function openFile() {
    try {
      const selection = await dialogs.pickOpen({ types: TEXT_TYPES, multiple: false });
      if (!selection) return;
      const { file, handle } = selection;
      const text = await file.text();
      applyHandle(handle, file.name);
      setContent(text, { dirty: false });
    } catch (err) {
      console.error('Failed to open file', err);
    }
  }

  async function saveFile({ forcePrompt = false } = {}) {
    const text = editor.getValue();
    try {
      if (currentHandle && !forcePrompt) {
        if (await ensurePermission(currentHandle, 'readwrite')) {
          await writeToHandle(currentHandle, text);
          markDirty(false);
          persistAutosave(text);
          return true;
        }
      }
      const picker = await dialogs.pickSave({ suggestedName: currentName, types: TEXT_TYPES });
      await picker.write(text, 'text/plain');
      if (picker.handle) {
        applyHandle(picker.handle, picker.handle.name);
      }
      markDirty(false);
      persistAutosave(text);
      return true;
    } catch (err) {
      console.error('Failed to save file', err);
      return false;
    }
  }

  async function saveFileAs() {
    return saveFile({ forcePrompt: true });
  }

  function newDocument() {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    applyHandle(null, 'untitled.txt', '');
    setContent('', { dirty: false });
    persistPath('');
  }

  function toggleWrap() {
    wrapEnabled = !wrapEnabled;
    editor.setOption('lineWrapping', wrapEnabled);
    wrapBtn.classList.toggle('active', wrapEnabled);
  }

  function bindShortcut(e) {
    if (!e.ctrlKey) return;
    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        newDocument();
        break;
      case 'o':
        e.preventDefault();
        openFile();
        break;
      case 's':
        e.preventDefault();
        saveFile({ forcePrompt: e.shiftKey });
        break;
      default:
        break;
    }
  }

  function autosaveTick() {
    if (!dirty) return;
    const text = editor.getValue();
    if (currentHandle) {
      ensurePermission(currentHandle, 'readwrite')
        .then((granted) => granted && writeToHandle(currentHandle, text))
        .then((result) => {
          if (result !== false) {
            markDirty(false);
            persistAutosave(text);
          }
        })
        .catch((err) => console.warn('Autosave failed', err));
    } else {
      persistAutosave(text);
    }
  }

  newBtn.addEventListener('click', newDocument);
  openBtn.addEventListener('click', openFile);
  saveBtn.addEventListener('click', () => saveFile());
  saveAsBtn.addEventListener('click', () => saveFileAs());
  wrapBtn.addEventListener('click', toggleWrap);
  undoBtn.addEventListener('click', () => editor.undo?.());
  redoBtn.addEventListener('click', () => editor.redo?.());
  winEl.addEventListener('keydown', bindShortcut);

  autosaveTimer = setInterval(autosaveTick, 20000);

  const beforeClose = (ev) => {
    if (!dirty) return;
    const ok = window.confirm('You have unsaved changes. Close anyway?');
    if (!ok) ev.preventDefault();
  };
  winEl.addEventListener('window-before-close', beforeClose);

  const cleanup = () => {
    if (autosaveTimer) clearInterval(autosaveTimer);
    winEl.removeEventListener('window-before-close', beforeClose);
    winEl.removeEventListener('keydown', bindShortcut);
    editor.off?.('change', editorChanged);
  };
  winEl.addEventListener('window-closed', cleanup, { once: true });

  const api = {
    editor,
    get value() {
      return editor.getValue();
    },
    setValue(text) {
      editor.setValue(text);
    },
    isDirty: () => dirty,
    save: saveFile,
    saveAs: saveFileAs,
    newDocument,
    applyHandle,
    dispose: cleanup,
  };
  winEl.__notepad = api;
  return api;
}

function normalizeInitial(initial, autosaved) {
  if (!initial) {
    return {
      content: autosaved || '',
      name: 'untitled.txt',
    };
  }
  if (typeof initial === 'string') {
    return {
      content: initial || autosaved || '',
      name: 'untitled.txt',
    };
  }
  return {
    content: initial.content ?? autosaved ?? '',
    name: initial.name || initial.title || 'untitled.txt',
    path: initial.path || initial.filePath || '',
    handle: initial.handle || null,
  };
}
