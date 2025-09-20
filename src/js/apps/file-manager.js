import * as notepad from './notepad.js';
import * as gallery from './gallery.js';
import * as sheets from './sheets.js';
import { APIClient } from '../utils/api.js';

export const meta = { id: 'file-manager', name: 'File Manager', icon: '/icons/file-manager.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id)?.element;
  if (!win) return;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  ctx.globals?.addLog?.('File Manager opened');
  const container = winEl.querySelector('.content');
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('file-manager');

  const api = new APIClient(ctx);

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
  const treeNodes = new Map();

  function getUserId() {
    return (
      ctx.currentUser?.id ||
      ctx.globals?.currentUser?.id ||
      (typeof window !== 'undefined' ? window.currentUser?.id : null)
    );
  }

  function fileURL(relPath) {
    const parts = relPath.split('/').filter(Boolean).map(encodeURIComponent);
    const joined = parts.join('/');
    const uid = getUserId();
    return uid ? `/users/${encodeURIComponent(uid)}/${joined}` : `/${joined}`;
  }

  function formatSize(bytes) {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = bytes / 1024;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
  }

  function formatDate(seconds) {
    if (!seconds) return '';
    const d = new Date(seconds * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  }

  function parentPath(path) {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }

  function updateToolbarState() {
    const canModify = !!(selected && !selected.readonly);
    renameBtn.disabled = !canModify;
    deleteBtn.disabled = !canModify;
  }

  async function newFolder() {
    const name = prompt('Folder name');
    if (!name) return;
    const result = await api.postJSON('/api/create-folder', {
      path: currentPath,
      name,
    });
    if (!result.ok || result.data.ok === false) alert(result.error || result.data.error);
    await loadDirectory(currentPath);
  }

  async function renameItem() {
    if (!selected || selected.readonly) return alert('Select an item first');
    const newName = prompt('New name', selected.name);
    if (!newName) return;
    const result = await api.postJSON('/api/rename', {
      path: selected.path,
      new_name: newName,
    });
    if (!result.ok || result.data.ok === false) alert(result.error || result.data.error);
    await loadDirectory(currentPath);
  }

  async function deleteItem() {
    if (!selected || selected.readonly) return alert('Select an item first');
    if (!confirm('Delete ' + selected.name + '?')) return;
    const result = await api.postJSON('/api/delete', { path: selected.path });
    if (!result.ok || result.data.ok === false) alert(result.error || result.data.error);
    await loadDirectory(currentPath);
  }

  async function uploadFileAction() {
    async function uploadFile(file) {
      const fd = new FormData();
      fd.append('path', currentPath);
      fd.append('file', file, file.name);
      const result = await api.post('/api/upload', fd);
      if (!result.ok || result.data.ok === false) {
        alert(result.error || result.data.error || 'Upload failed');
      }
      await loadDirectory(currentPath);
    }

    try {
      if (window.showOpenFilePicker) {
        const handles = await window.showOpenFilePicker({
          multiple: true,
        });
        for (const handle of handles) {
          const file = await handle.getFile();
          await uploadFile(file);
        }
        return;
      }
    } catch (err) {
      console.error('File picker failed', err);
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      for (const file of files) await uploadFile(file);
      input.remove();
    });
    document.body.append(input);
    input.click();
  }

  window.fileManagerContext = {
    newFolder,
    renameItem,
    deleteItem,
    uploadFile: uploadFileAction,
    hasSelection: () => !!(selected && !selected.readonly),
  };

  function clearTree() {
    treeNodes.clear();
    tree.innerHTML = '';
  }

  function createTreeNode(labelText, path) {
    const existing = treeNodes.get(path);
    if (existing) {
      existing.label.textContent = labelText;
      return existing;
    }
    const wrapper = document.createElement('div');
    wrapper.classList.add('tree-node');
    const label = document.createElement('div');
    label.classList.add('tree-item');
    label.dataset.path = path;
    label.textContent = labelText;
    const children = document.createElement('div');
    children.classList.add('tree-children');
    wrapper.append(label, children);
    treeNodes.set(path, { wrapper, label, children });

    label.addEventListener('click', (ev) => {
      ev.stopPropagation();
      loadDirectory(path);
    });
    label.addEventListener('dblclick', async (ev) => {
      ev.stopPropagation();
      await buildTree(path, treeNodes.get(path), true);
    });

    return treeNodes.get(path);
  }

  async function buildTree(path, node, force = false) {
    if (!node) return;
    if (node.wrapper.dataset.loading === '1') return;
    if (node.wrapper.dataset.loaded === '1' && !force) return;
    node.wrapper.dataset.loading = '1';
    try {
      const resp = await api.getJSON(`/api/list-directory?path=${encodeURIComponent(path)}`);
      if (!resp.ok || resp.data.ok === false) return;
      const data = resp.data.data || resp.data;
      node.children.innerHTML = '';
      const dirs = data.items.filter((i) => i.isDir);
      dirs.sort((a, b) => a.name.localeCompare(b.name));
      dirs.forEach((dir) => {
        const childNode = createTreeNode(dir.name, dir.path);
        node.children.append(childNode.wrapper);
      });
      node.wrapper.dataset.loaded = '1';
    } catch (err) {
      console.error('Tree load failed', err);
    } finally {
      node.wrapper.dataset.loading = '0';
    }
  }

  async function expandToPath(path) {
    if (!path) {
      highlightTreeSelection();
      return;
    }
    const segments = path.split('/').filter(Boolean);
    let accumulated = '';
    let node = treeNodes.get('');
    for (const segment of segments) {
      if (!node) break;
      await buildTree(accumulated, node);
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      node = treeNodes.get(accumulated);
    }
    if (node) await buildTree(path, node);
    highlightTreeSelection();
  }

  function highlightTreeSelection() {
    tree.querySelectorAll('.tree-item.selected').forEach((el) =>
      el.classList.remove('selected')
    );
    const target = tree.querySelector(`.tree-item[data-path="${CSS.escape(currentPath)}"]`);
    if (target) target.classList.add('selected');
  }

  function renderTreeRoot() {
    clearTree();
    const rootNode = createTreeNode('/', '');
    tree.append(rootNode.wrapper);
    buildTree('', rootNode, true).then(() => expandToPath(currentPath));
  }

  function selectRow(item, row) {
    details
      .querySelectorAll('.file-item.selected')
      .forEach((el) => el.classList.remove('selected'));
    if (!item || item.readonly) {
      selected = null;
      updateToolbarState();
      return;
    }
    row.classList.add('selected');
    selected = item;
    updateToolbarState();
  }

  function renderDetails() {
    details.innerHTML = '';
    selected = null;
    updateToolbarState();

    const header = document.createElement('div');
    header.classList.add('file-item', 'file-header');
    const nameHead = document.createElement('span');
    nameHead.classList.add('file-name');
    nameHead.textContent = 'Name';
    const sizeHead = document.createElement('span');
    sizeHead.classList.add('file-size');
    sizeHead.textContent = 'Size';
    const modHead = document.createElement('span');
    modHead.classList.add('file-modified');
    modHead.textContent = 'Modified';
    header.append(nameHead, sizeHead, modHead);
    details.append(header);

    const query = searchInput.value.trim().toLowerCase();
    const filtered = currentItems
      .filter((item) => item.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const items = [];
    if (currentPath && !query) {
      items.push({
        name: '..',
        path: parentPath(currentPath),
        isDir: true,
        readonly: true,
        isParent: true,
      });
    }
    items.push(...filtered);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('file-details-empty');
      empty.textContent = 'This folder is empty.';
      details.append(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.classList.add('file-item');
      if (item.isParent) row.classList.add('file-parent');

      const nameCell = document.createElement('span');
      nameCell.classList.add('file-name');
      nameCell.textContent = item.name;

      const sizeCell = document.createElement('span');
      sizeCell.classList.add('file-size');
      sizeCell.textContent = item.isDir ? '' : formatSize(item.size);

      const modifiedCell = document.createElement('span');
      modifiedCell.classList.add('file-modified');
      modifiedCell.textContent = item.mtime ? formatDate(item.mtime) : '';

      row.append(nameCell, sizeCell, modifiedCell);

      row.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectRow(item, row);
      });
      row.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        selectRow(item, row);
      });
      row.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        openItem(item);
      });

      details.append(row);
    });
  }

  async function openItem(item) {
    if (item.readonly) {
      if (item.isParent) {
        await loadDirectory(item.path);
      }
      return;
    }
    if (item.isDir) {
      await loadDirectory(item.path);
      return;
    }

    const ext = item.name.split('.').pop().toLowerCase();
    const url = fileURL(item.path);
    try {
      if (['txt', 'js', 'json', 'md', 'py', 'css', 'html'].includes(ext)) {
        const res = await api.get(url, {}, 'text');
        if (!res.ok) throw new Error(res.error);
        notepad.launch(ctx, res.data);
      } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
        const res = await api.get(url, {}, 'blob');
        if (!res.ok) throw new Error(res.error);
        const objectUrl = URL.createObjectURL(res.data);
        gallery.launch(ctx, [objectUrl]);
      } else if (ext === 'csv') {
        const res = await api.get(url, {}, 'text');
        if (!res.ok) throw new Error(res.error);
        sheets.launch(ctx, {
          type: 'csv',
          name: item.name.replace(/\.csv$/, ''),
          content: res.data,
        });
      } else if (ext === 'xlsx') {
        const res = await api.get(url, {}, 'arrayBuffer');
        if (!res.ok) throw new Error(res.error);
        sheets.launch(ctx, { type: 'xlsx', content: res.data });
      } else {
        const res = await api.get(url, {}, 'blob');
        if (!res.ok) throw new Error(res.error);
        const objectUrl = URL.createObjectURL(res.data);
        window.open(objectUrl, '_blank');
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

  details.addEventListener('click', (ev) => {
    if (ev.target === details) {
      selected = null;
      updateToolbarState();
      details
        .querySelectorAll('.file-item.selected')
        .forEach((el) => el.classList.remove('selected'));
    }
  });

  loadDirectory('');

  async function loadDirectory(path) {
    const resp = await api.getJSON(`/api/list-directory?path=${encodeURIComponent(path)}`);
    if (!resp.ok || resp.data.ok === false) {
      details.textContent = resp.error || resp.data.error || 'Failed to load directory';
      return;
    }
    const data = resp.data.data || resp.data;
    currentPath = data.path;
    currentItems = data.items || [];
    renderTreeRoot();
    renderDetails();
  }
}
