import * as notepad from './notepad.js';
import * as gallery from './gallery.js';
import * as sheets from './sheets.js';
import { APIClient } from '../utils/api.js';
import { pickOpen } from '../utils/file-dialogs.js';

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
  const viewToggle = document.createElement('div');
  viewToggle.classList.add('file-view-toggle');
  const listViewBtn = document.createElement('button');
  listViewBtn.textContent = 'List';
  const gridViewBtn = document.createElement('button');
  gridViewBtn.textContent = 'Grid';
  viewToggle.append(listViewBtn, gridViewBtn);

  toolbar.append(
    newFolderBtn,
    uploadBtn,
    renameBtn,
    deleteBtn,
    refreshBtn,
    searchInput,
    viewToggle,
  );

  const body = document.createElement('div');
  body.classList.add('file-manager-body');
  const tree = document.createElement('div');
  tree.classList.add('file-tree');
  const details = document.createElement('div');
  details.classList.add('file-details');
  details.tabIndex = 0;
  body.append(tree, details);
  const breadcrumbs = document.createElement('div');
  breadcrumbs.classList.add('file-breadcrumbs');

  container.append(toolbar, breadcrumbs, body);

  let currentPath = '';
  let currentItems = [];
  let selectedItem = null;
  let selectedIndex = -1;
  let viewMode = 'list';
  const treeNodes = new Map();
  const dialogs = {
    pickOpen: ctx?.fileDialogs?.pickOpen ?? pickOpen,
  };
  let renderedItems = [];

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
    const canModify = !!(selectedItem && !selectedItem.readonly);
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
    if (!selectedItem || selectedItem.readonly)
      return alert('Select an item first');
    const newName = prompt('New name', selectedItem.name);
    if (!newName) return;
    const result = await api.postJSON('/api/rename', {
      path: selectedItem.path,
      new_name: newName,
    });
    if (!result.ok || result.data.ok === false) alert(result.error || result.data.error);
    await loadDirectory(currentPath);
  }

  async function deleteItem() {
    if (!selectedItem || selectedItem.readonly) return alert('Select an item first');
    if (!confirm('Delete ' + selectedItem.name + '?')) return;
    const result = await api.postJSON('/api/delete', { path: selectedItem.path });
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
      const selection = await dialogs.pickOpen({ multiple: true });
      const entries = Array.isArray(selection)
        ? selection
        : selection
        ? [selection]
        : [];
      for (const entry of entries) await uploadFile(entry.file);
    } catch (err) {
      console.error('File picker failed', err);
    }
  }

  window.fileManagerContext = {
    newFolder,
    renameItem,
    deleteItem,
    uploadFile: uploadFileAction,
    hasSelection: () => !!(selectedItem && !selectedItem.readonly),
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

  function selectRow(item, row, index) {
    details
      .querySelectorAll('.file-item.selected, .file-card.selected')
      .forEach((el) => el.classList.remove('selected'));
    if (!item || item.readonly) {
      selectedItem = null;
      selectedIndex = -1;
      updateToolbarState();
      return;
    }
    row.classList.add('selected');
    selectedItem = item;
    selectedIndex = index;
    updateToolbarState();
  }

  function renderDetails() {
    details.innerHTML = '';
    selectedItem = null;
    selectedIndex = -1;
    updateToolbarState();
    listViewBtn.classList.toggle('active', viewMode === 'list');
    gridViewBtn.classList.toggle('active', viewMode === 'grid');

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

    renderedItems = items;

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('file-details-empty');
      empty.textContent = 'This folder is empty.';
      details.append(empty);
      return;
    }

    if (viewMode === 'grid') {
      renderGrid(items);
    } else {
      renderList(items);
    }
  }

  function renderList(items) {
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

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.classList.add('file-item');
      if (item.isParent) row.classList.add('file-parent');
      row.dataset.index = String(index);

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
        selectRow(item, row, index);
      });
      row.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        selectRow(item, row, index);
      });
      row.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        openItem(item);
      });

      details.append(row);
    });
  }

  function renderGrid(items) {
    const grid = document.createElement('div');
    grid.classList.add('file-grid');
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.classList.add('file-card');
      if (item.isParent) card.classList.add('file-parent');
      card.dataset.index = String(index);

      const icon = document.createElement('div');
      icon.classList.add('file-card-icon');
      icon.textContent = item.isDir ? '📁' : '📄';
      const label = document.createElement('div');
      label.classList.add('file-card-label');
      label.textContent = item.name;

      card.append(icon, label);

      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectRow(item, card, index);
      });
      card.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        selectRow(item, card, index);
      });
      card.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        openItem(item);
      });

      grid.append(card);
    });
    details.append(grid);
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
  listViewBtn.addEventListener('click', () => setViewMode('list'));
  gridViewBtn.addEventListener('click', () => setViewMode('grid'));

  newFolderBtn.addEventListener('click', newFolder);
  renameBtn.addEventListener('click', renameItem);
  deleteBtn.addEventListener('click', deleteItem);
  uploadBtn.addEventListener('click', uploadFileAction);

  details.addEventListener('click', (ev) => {
    if (ev.target === details) {
      selectedItem = null;
      selectedIndex = -1;
      updateToolbarState();
      details
        .querySelectorAll('.file-item.selected, .file-card.selected')
        .forEach((el) => el.classList.remove('selected'));
    }
  });

  details.addEventListener('keydown', (ev) => {
    if (!renderedItems.length) return;
    const maxIndex = renderedItems.length - 1;
    const step = viewMode === 'grid' ? Math.max(1, Math.floor(details.clientWidth / 120)) : 1;
    let nextIndex = selectedIndex;
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        nextIndex = Math.min(maxIndex, selectedIndex + (viewMode === 'grid' ? step : 1));
        break;
      case 'ArrowUp':
        ev.preventDefault();
        nextIndex = Math.max(0, selectedIndex - (viewMode === 'grid' ? step : 1));
        break;
      case 'ArrowRight':
        if (viewMode === 'grid') {
          ev.preventDefault();
          nextIndex = Math.min(maxIndex, selectedIndex + 1);
        }
        break;
      case 'ArrowLeft':
        if (viewMode === 'grid') {
          ev.preventDefault();
          nextIndex = Math.max(0, selectedIndex - 1);
        }
        break;
      case 'Enter':
        if (selectedItem) {
          ev.preventDefault();
          openItem(selectedItem);
        }
        return;
      default:
        return;
    }
    if (nextIndex < 0 || Number.isNaN(nextIndex)) nextIndex = 0;
    if (nextIndex > maxIndex) nextIndex = maxIndex;
    const target = details.querySelector(`[data-index="${nextIndex}"]`);
    if (target) {
      selectRow(renderedItems[nextIndex], target, nextIndex);
      target.scrollIntoView({ block: 'nearest' });
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
    renderBreadcrumbs();
  }

  function setViewMode(mode) {
    viewMode = mode;
    listViewBtn.classList.toggle('active', mode === 'list');
    gridViewBtn.classList.toggle('active', mode === 'grid');
    renderDetails();
  }

  function renderBreadcrumbs() {
    breadcrumbs.innerHTML = '';
    const segments = currentPath.split('/').filter(Boolean);
    const makeBtn = (label, pathValue) => {
      const btn = document.createElement('button');
      btn.textContent = label || 'Root';
      btn.addEventListener('click', () => loadDirectory(pathValue));
      return btn;
    };

    breadcrumbs.append(makeBtn('Root', ''));
    let accumulated = '';
    segments.forEach((segment) => {
      const separator = document.createElement('span');
      separator.textContent = '›';
      separator.classList.add('breadcrumb-separator');
      breadcrumbs.append(separator);
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      breadcrumbs.append(makeBtn(segment, accumulated));
    });
  }
}
