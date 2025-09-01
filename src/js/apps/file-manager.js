import * as notepad from './notepad.js';
import * as gallery from './gallery.js';
import * as sheets from './sheets.js';

export const meta = { id: 'file-manager', name: 'File Manager', icon: '/icons/file-manager.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  const container = winEl;
  container.classList.add('file-manager');

  const toolbar = document.createElement('div');
  toolbar.classList.add('file-manager-toolbar');
  const newFolderBtn = document.createElement('button');
  newFolderBtn.textContent = 'New Folder';
  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = 'Upload';
  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search';
  toolbar.append(
    newFolderBtn,
    uploadBtn,
    renameBtn,
    deleteBtn,
    refreshBtn,
    searchInput
  );

  const body = document.createElement('div');
  body.classList.add('file-manager-body');
  const tree = document.createElement('div');
  tree.classList.add('file-tree');
  const details = document.createElement('div');
  details.classList.add('file-details');
  body.append(tree, details);
  container.append(toolbar, body);

  let currentPath = '';
  let currentItems = [];
  let selected = null;

  async function newFolder() {
    const name = prompt('Folder name');
    if (!name) return;
    const result = await apiJSON('/api/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, name }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  async function renameItem() {
    if (!selected) return alert('Select an item first');
    const newName = prompt('New name', selected.name);
    if (!newName) return;
    const result = await apiJSON('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected.path, new_name: newName }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  async function deleteItem() {
    if (!selected) return alert('Select an item first');
    if (!confirm('Delete ' + selected.name + '?')) return;
    const result = await apiJSON('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected.path }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  function uploadFileAction() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.style.display = 'none';
    inp.addEventListener('change', async () => {
      const file = inp.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('path', currentPath);
      fd.append('file', file);
      const result = await apiJSON('/api/upload', { method: 'POST', body: fd });
      if (!result.ok) alert(result.error);
      loadDirectory(currentPath);
    });
    inp.click();
  }

  window.fileManagerContext = {
    newFolder,
    renameItem,
    deleteItem,
    uploadFile: uploadFileAction,
    hasSelection: () => !!selected,
  };

  async function loadDirectory(path) {
    const resp = await apiJSON(
      `/api/list-directory?path=${encodeURIComponent(path)}`
    );
    if (!resp.ok) {
      details.textContent = resp.error || 'Failed to load directory';
      return;
    }
    const data = resp.data;
    currentPath = data.path;
    currentItems = data.items;
    renderTreeRoot();
    renderDetails();
  }

  function renderTreeRoot() {
    tree.innerHTML = '';
    const root = document.createElement('div');
    root.textContent = '/';
    root.classList.add('tree-item');
    root.addEventListener('click', () => loadDirectory(''));
    tree.append(root);
    buildTree('', root, tree);
  }

  async function buildTree(path, elem, containerEl) {
    if (elem.dataset.loaded) return;
    elem.dataset.loaded = '1';
    try {
      const resp = await apiJSON(
        `/api/list-directory?path=${encodeURIComponent(path)}`
      );
      if (!resp.ok) return;
      const data = resp.data;
      const children = document.createElement('div');
      children.classList.add('tree-children');
      data.items
        .filter((i) => i.isDir)
        .forEach((dir) => {
          const child = document.createElement('div');
          child.textContent = dir.name;
          child.classList.add('tree-item');
          child.addEventListener('click', () => loadDirectory(dir.path));
          children.append(child);
          child.addEventListener('dblclick', () =>
            buildTree(dir.path, child, children)
          );
        });
      containerEl.append(children);
    } catch {}
  }

  function renderDetails() {
    details.innerHTML = '';
    selected = null;
    const items = currentItems.filter((i) =>
      i.name.toLowerCase().includes(searchInput.value.toLowerCase())
    );
    items.forEach((item) => {
      const row = document.createElement('div');
      row.classList.add('file-item');
      row.textContent = item.name;
      row.addEventListener('click', () => {
        details
          .querySelectorAll('.file-item.selected')
          .forEach((el) => el.classList.remove('selected'));
        row.classList.add('selected');
        selected = item;
      });
      row.addEventListener('contextmenu', () => {
        details
          .querySelectorAll('.file-item.selected')
          .forEach((el) => el.classList.remove('selected'));
        row.classList.add('selected');
        selected = item;
      });
      row.addEventListener('dblclick', () => openItem(item));
      details.append(row);
    });
  }

  async function openItem(item) {
    if (item.isDir) {
      await loadDirectory(item.path);
      return;
    }
    const ext = item.name.split('.').pop().toLowerCase();
    try {
      if (['txt', 'js', 'json', 'md'].includes(ext)) {
        const res = await fetch('/' + item.path);
        if (!res.ok) throw new Error('Failed to load file');
        const text = await res.text();
        notepad.launch(ctx, text);
      } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) {
        gallery.launch(ctx, ['/' + item.path]);
      } else if (ext === 'csv') {
        const res = await fetch('/' + item.path);
        if (!res.ok) throw new Error('Failed to load file');
        const text = await res.text();
        sheets.launch(ctx, { type: 'csv', name: item.name.replace(/\.csv$/, ''), content: text });
      } else if (ext === 'xlsx') {
        const res = await fetch('/' + item.path);
        if (!res.ok) throw new Error('Failed to load file');
        const buf = await res.arrayBuffer();
        sheets.launch(ctx, { type: 'xlsx', content: buf });
      } else {
        window.open('/' + item.path, '_blank');
      }
    } catch (err) {
      alert('Unable to open file: ' + err);
    }
  }

  searchInput.addEventListener('input', renderDetails);
  refreshBtn.addEventListener('click', () => loadDirectory(currentPath));

  newFolderBtn.addEventListener('click', newFolder);
  renameBtn.addEventListener('click', renameItem);
  deleteBtn.addEventListener('click', deleteItem);
  uploadBtn.addEventListener('click', uploadFileAction);

  loadDirectory('');
}

