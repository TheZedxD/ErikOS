import { APIClient } from '../utils/api.js';

export const meta = { id: 'chat', name: 'Chat', icon: '/icons/chat.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  addLog('Chat opened');
  applyChatColors();

  const api = new APIClient(ctx);

  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = 'display:flex; height:100%; gap:2px;';

  const historyPanel = document.createElement('div');
  historyPanel.style.cssText = `
    width: 30%;
    min-width: 200px;
    background: var(--window-bg);
    border-right: 2px solid var(--window-border-dark);
    display: flex;
    flex-direction: column;
  `;

  const newChatBtn = document.createElement('button');
  newChatBtn.textContent = '+ New Chat';
  newChatBtn.style.cssText = `
    margin: 4px;
    padding: 6px;
    background: var(--button-bg);
    border: 2px solid;
    border-color: var(--btn-border-light) var(--btn-border-dark) var(--btn-border-dark) var(--btn-border-light);
  `;
  historyPanel.append(newChatBtn);

  const convList = document.createElement('div');
  convList.style.cssText = 'flex:1; overflow-y:auto; padding:4px;';
  historyPanel.append(convList);

  const chatPanel = document.createElement('div');
  chatPanel.style.cssText = 'flex:1; display:flex; flex-direction:column;';

  container.append(historyPanel, chatPanel);

  if (!currentUser.conversations) currentUser.conversations = [];
  const historyRespPromise = currentUser
    ? api.getJSON(`/api/ollama/history/${currentUser.id}`).catch(() => ({ ok: false }))
    : Promise.resolve({ ok: false });
  let currentConversation = null;

  function renderConversationList() {
    convList.innerHTML = '';
    currentUser.conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = 'chat-conversation-item';
      if (conv === currentConversation) item.classList.add('active');

      const title = document.createElement('div');
      title.textContent = conv.title || 'Untitled';
      title.style.fontWeight = 'bold';

      const date = document.createElement('div');
      date.textContent = new Date(conv.timestamp).toLocaleDateString();
      date.style.fontSize = '11px';

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'X';
      deleteBtn.style.cssText = 'float:right; padding:2px 4px; font-size:10px;';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
          const idx = currentUser.conversations.indexOf(conv);
          currentUser.conversations.splice(idx, 1);
          saveProfiles(profiles);
          if (conv === currentConversation) {
            startNewChat();
          } else {
            renderConversationList();
          }
        }
      };

      item.append(deleteBtn, title, date);
      item.onclick = () => loadConversation(conv);
      convList.append(item);
    });
  }

  historyRespPromise.then((res) => {
    if (res.ok && Array.isArray(res.data.history) && res.data.history.length) {
      const conv = {
        id: Date.now(),
        title: 'Previous',
        messages: res.data.history,
        timestamp: new Date().toISOString(),
      };
      const hadConvs = currentUser.conversations.length > 0;
      currentUser.conversations.unshift(conv);
      if (!hadConvs) {
        loadConversation(conv);
      } else {
        renderConversationList();
      }
    }
  });

  function generateTitle(message) {
    return message.slice(0, 30) + (message.length > 30 ? '...' : '');
  }

  function renderChatArea() {
    chatPanel.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.classList.add('chat-toolbar');
    const modelLabel = document.createElement('span');
    modelLabel.textContent = 'Model: ';
    const modelSelect = document.createElement('select');
    modelSelect.disabled = true;
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'Settings';
    settingsBtn.addEventListener('click', openChatSettings);
    toolbar.append(modelLabel, modelSelect, settingsBtn);

    const msgList = document.createElement('div');
    msgList.classList.add('chat-messages');
    msgList.style.flex = '1';
    msgList.style.overflowY = 'auto';
    msgList.style.padding = '4px';

    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.gap = '4px';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your message…';
    input.style.flex = '1';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    const sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.textContent = 'Send';
    form.append(input, imageInput, sendBtn);

    chatPanel.append(toolbar, msgList, form);

    function appendMessage(role, text) {
      const msgEl = document.createElement('div');
      msgEl.className = 'chat-message ' + role;
      msgEl.textContent = text;
      msgList.append(msgEl);
      msgList.scrollTop = msgList.scrollHeight;
    }

    currentConversation.messages.forEach((m) => appendMessage(m.role, m.content));

    async function fetchModels() {
      try {
        const res = await api.getJSON('/api/ollama/models');
        modelSelect.innerHTML = '';
        if (!res.ok) throw new Error();
        const data = res.data;
        const models = Array.isArray(data.models) ? data.models : [];
        if (models.length) {
          models.forEach((name) => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            modelSelect.append(opt);
          });
          if (data.defaultText) modelSelect.value = data.defaultText;
          modelSelect.disabled = false;
        } else {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'No models';
          modelSelect.append(opt);
          modelSelect.disabled = true;
          appendMessage(
            'system',
            data.error ||
              'No models detected—please install models or check Ollama\'s configuration'
          );
        }
      } catch (err) {
        modelSelect.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Unavailable';
        modelSelect.append(opt);
        modelSelect.disabled = true;
        appendMessage('system', 'Failed to fetch models');
      }
    }
    fetchModels();

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      let imageData = null;
      if (imageInput.files[0]) {
        try {
          imageData = await fileToBase64(imageInput.files[0]);
          imageData = imageData.split(',')[1];
        } catch (err) {
          console.error(err);
        }
      }
      if (!msg && !imageData) return;
      if (msg) {
        appendMessage('user', msg);
        currentConversation.messages.push({ role: 'user', content: msg });
        if (currentConversation.title === 'New Chat') {
          currentConversation.title = generateTitle(msg);
        }
        saveProfiles(profiles);
        renderConversationList();
        input.value = '';
      }
      appendMessage('assistant', '…');
      const placeholder = msgList.lastChild;
      const selectedModel = modelSelect.value || 'llama2';
      try {
        const res = await api.postJSON('/api/ollama/chat', {
          model: selectedModel,
          prompt: msg,
          history: currentConversation.messages,
          image: imageData,
          profile: currentUser ? currentUser.id : null,
        });
        placeholder.remove();
        if (!res.ok || res.data.error) {
          appendMessage('assistant', 'Error: ' + (res.data && res.data.error ? res.data.error : res.error));
        } else {
          const data = res.data;
          const respText = data.response || '';
          appendMessage('assistant', respText);
          currentConversation.messages = data.history || currentConversation.messages;
          saveProfiles(profiles);
          renderConversationList();
        }
      } catch (err) {
        placeholder.remove();
        appendMessage('assistant', 'Error contacting model');
      } finally {
        fetchModels();
      }
      imageInput.value = '';
    });
  }

  function loadConversation(conv) {
    currentConversation = conv;
    renderConversationList();
    renderChatArea();
  }

  function startNewChat() {
    currentConversation = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date().toISOString(),
    };
    currentUser.conversations.unshift(currentConversation);
    saveProfiles(profiles);
    renderConversationList();
    renderChatArea();
  }

  function openChatSettings() {
    const winContent = document.createElement('div');
    winContent.style.cssText = 'display:flex; flex-direction:column; height:100%;';
    const tabBar = document.createElement('div');
    const appearanceTab = document.createElement('button');
    appearanceTab.textContent = 'Appearance';
    const modelsTab = document.createElement('button');
    modelsTab.textContent = 'Models';
    tabBar.append(appearanceTab, modelsTab);
    const tabBody = document.createElement('div');
    tabBody.style.cssText = 'flex:1; overflow:auto; padding:4px;';
    winContent.append(tabBar, tabBody);

    function showTab(tab) {
      appearanceContent.style.display = tab === 'appearance' ? 'block' : 'none';
      modelsContent.style.display = tab === 'models' ? 'block' : 'none';
      appearanceTab.disabled = tab === 'appearance';
      modelsTab.disabled = tab === 'models';
    }

    const appearanceContent = document.createElement('div');
    tabBody.append(appearanceContent);

    function rgbToHex(rgb) {
      const m = rgb.match(/\d+/g);
      if (!m) return '#000000';
      return '#' + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, '0')).join('');
    }

    const defaults = (() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        userBg: rgbToHex(cs.getPropertyValue('--selection-bg')),
        userText: rgbToHex(cs.getPropertyValue('--window-bg')),
        assistantBg: rgbToHex(cs.getPropertyValue('--window-bg')),
        assistantText: rgbToHex(cs.getPropertyValue('--icon-text')),
      };
    })();

    const colors = Object.assign({}, defaults, currentUser.chatColors || {});

    const fields = [
      ['User Bubble BG', 'userBg'],
      ['User Bubble Text', 'userText'],
      ['Assistant Bubble BG', 'assistantBg'],
      ['Assistant Bubble Text', 'assistantText'],
    ];
    const inputs = {};
    fields.forEach(([labelText, key]) => {
      const row = document.createElement('div');
      row.style.marginBottom = '8px';
      const label = document.createElement('label');
      label.textContent = labelText + ': ';
      const input = document.createElement('input');
      input.type = 'color';
      input.value = colors[key];
      inputs[key] = input;
      label.append(input);
      row.append(label);
      appearanceContent.append(row);
    });
    function saveColors() {
      currentUser.chatColors = {
        userBg: inputs.userBg.value,
        userText: inputs.userText.value,
        assistantBg: inputs.assistantBg.value,
        assistantText: inputs.assistantText.value,
      };
      saveProfiles(profiles);
      applyChatColors();
      renderChatArea();
    }
    Object.values(inputs).forEach((input) => input.addEventListener('input', saveColors));

    const modelsContent = document.createElement('div');
    modelsContent.style.display = 'none';
    tabBody.append(modelsContent);
    const modelList = document.createElement('ul');
    modelsContent.append(modelList);
    const modelInput = document.createElement('input');
    modelInput.type = 'text';
    modelInput.placeholder = 'model name e.g. llama3.2:3b';
    const pullBtn = document.createElement('button');
    pullBtn.textContent = 'Pull';
    const progress = document.createElement('progress');
    progress.style.display = 'none';
    progress.max = 100;
    const output = document.createElement('pre');
    output.style.whiteSpace = 'pre-wrap';
    modelsContent.append(modelInput, pullBtn, progress, output);

    async function loadModelList() {
      modelList.innerHTML = '';
      try {
        const res = await api.getJSON('/api/ollama/models');
        if (res.ok && res.data.models && res.data.models.length) {
          res.data.models.forEach((m) => {
            const li = document.createElement('li');
            li.textContent = m;
            modelList.append(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = (res.data && res.data.error) || 'No models';
          modelList.append(li);
        }
      } catch (err) {
        const li = document.createElement('li');
        li.textContent = 'Failed to load models';
        modelList.append(li);
      }
    }
    loadModelList();

    pullBtn.addEventListener('click', async () => {
      const name = modelInput.value.trim();
      if (!name) return;
      modelInput.disabled = true;
      pullBtn.disabled = true;
      output.textContent = '';
      progress.style.display = 'block';
      try {
        const res = await api.postJSON('/api/execute-command', { command: `ollama pull ${name}` });
        if (!res.ok || !res.data.job_id) throw new Error(res.data?.error || res.error || 'Failed');
        const jobId = res.data.job_id;
        const timer = setInterval(async () => {
          const sres = await api.getJSON(`/api/command-status/${jobId}`);
          if (sres.ok && sres.data.status === 'finished') {
            clearInterval(timer);
            progress.style.display = 'none';
            modelInput.disabled = false;
            pullBtn.disabled = false;
            if (sres.data.returncode === 0) {
              await loadModelList();
              renderChatArea();
            } else {
              output.textContent = sres.data.output || 'Error';
            }
          }
        }, 1000);
      } catch (err) {
        progress.style.display = 'none';
        modelInput.disabled = false;
        pullBtn.disabled = false;
        output.textContent = String(err);
      }
    });

    appearanceTab.addEventListener('click', () => showTab('appearance'));
    modelsTab.addEventListener('click', () => showTab('models'));
    showTab('appearance');

    ctx.windowManager.createWindow('chat-settings', 'Chat Settings', winContent);
  }

  newChatBtn.onclick = startNewChat;

  if (currentUser.conversations.length) {
    loadConversation(currentUser.conversations[0]);
  } else {
    startNewChat();
  }
}
