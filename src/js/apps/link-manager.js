
export const meta = { id: 'link-manager', name: 'Link Manager', icon: '/icons/link-manager.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  if (!currentUser) {
    const container = winEl.querySelector('.content');
    if (container) container.textContent = 'Please log in to manage links';
    return;
  }

  if (!Array.isArray(currentUser.links)) currentUser.links = [];
  currentUser.links = currentUser.links.map(item => {
    if (item.type) return item;
    return { type: 'link', name: item.name, url: item.url };
    });

  const container = winEl.querySelector('.content');
  container.classList.add('file-manager');
  const toolbar = document.createElement('div');
  toolbar.classList.add('file-manager-toolbar');
  const addFolderBtn = document.createElement('button');
  addFolderBtn.textContent = 'Add Folder';
  const addLinkBtn = document.createElement('button');
  addLinkBtn.textContent = 'Add Link';
  toolbar.append(addFolderBtn, addLinkBtn);
  const content = document.createElement('div');
  content.classList.add('file-manager-content');
  content.classList.add('link-tree');
  container.append(toolbar, content);

  function getNodeByPath(path) {
    let node = { children: currentUser.links };
    path.forEach(idx => { node = node.children[idx]; });
    return node;
  }

  function render() {
    content.innerHTML = '';
    const ul = buildList(currentUser.links, []);
    content.append(ul);
    saveProfiles(profiles);
  }

  function buildList(items, path) {
    const ul = document.createElement('ul');
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.draggable = true;
      const itemPath = path.concat(index);
      li.dataset.path = JSON.stringify(itemPath);
      const label = document.createElement('span');
      if (item.type === 'folder') {
        label.textContent = '📂 ' + item.name;
        label.style.fontWeight = 'bold';
        label.addEventListener('click', () => {
          const subList = li.querySelector('ul');
          if (subList) subList.style.display = subList.style.display === 'none' ? 'block' : 'none';
        });
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (confirm('Delete this folder and its contents?')) {
            const parent = getNodeByPath(path);
            parent.children.splice(index,1);
            render();
          }
        });
        const addFolderInsideBtn = document.createElement('button');
        addFolderInsideBtn.textContent = '+';
        addFolderInsideBtn.title = 'Add folder inside';
        addFolderInsideBtn.addEventListener('click', e => {
          e.stopPropagation();
          const name = prompt('Folder name');
          if (!name) return;
          if (!item.children) item.children = [];
          item.children.push({ type: 'folder', name, children: [] });
          render();
        });
        const addLinkInsideBtn = document.createElement('button');
        addLinkInsideBtn.textContent = 'L';
        addLinkInsideBtn.title = 'Add link inside';
        addLinkInsideBtn.addEventListener('click', e => {
          e.stopPropagation();
          const name = prompt('Link name');
          if (!name) return;
          const url = prompt('URL');
          if (!url) return;
          if (!item.children) item.children = [];
          item.children.push({ type: 'link', name, url });
          render();
        });
        li.append(label, delBtn, addFolderInsideBtn, addLinkInsideBtn);
        const subList = buildList(item.children || [], itemPath);
        li.append(subList);
      } else {
        label.textContent = '🔗 ' + item.name;
        label.style.color = 'blue';
        label.style.textDecoration = 'underline';
        label.addEventListener('click', () => { window.open(item.url, '_blank'); });
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (confirm('Delete this link?')) {
            const parent = getNodeByPath(path);
            parent.children.splice(index,1);
            render();
          }
        });
        li.append(label, delBtn);
      }
      li.addEventListener('dragstart', e => {
        e.stopPropagation();
        e.dataTransfer.setData('application/path', JSON.stringify(itemPath));
      });
      li.addEventListener('dragover', e => { e.preventDefault(); });
      li.addEventListener('drop', e => {
        e.preventDefault();
        const srcPath = JSON.parse(e.dataTransfer.getData('application/path'));
        const destPath = JSON.parse(li.dataset.path);
        if (JSON.stringify(srcPath) === JSON.stringify(destPath)) return;
        const srcParent = srcPath.slice(0,-1);
        const srcIdx = srcPath[srcPath.length-1];
        const srcContainer = srcParent.length===0 ? {children: currentUser.links} : getNodeByPath(srcParent);
        const [moved] = srcContainer.children.splice(srcIdx,1);
        const destParent = destPath.slice(0,-1);
        const destIdx = destPath[destPath.length-1];
        const destContainer = destParent.length===0 ? {children: currentUser.links} : getNodeByPath(destParent);
        const destNode = getNodeByPath(destPath);
        if (destNode.type === 'folder') {
          if (!destNode.children) destNode.children = [];
          destNode.children.push(moved);
        } else {
          destContainer.children.splice(destIdx,0,moved);
        }
        render();
      });
      ul.append(li);
    });
    return ul;
  }

  addFolderBtn.addEventListener('click', () => {
    const name = prompt('Folder name');
    if (!name) return;
    currentUser.links.push({ type: 'folder', name, children: [] });
    render();
  });
  addLinkBtn.addEventListener('click', () => {
    const name = prompt('Link name');
    if (!name) return;
    const url = prompt('URL');
    if (!url) return;
    currentUser.links.push({ type: 'link', name, url });
    render();
  });

  render();
}
