
export const meta = { id: 'notepad', name: 'Notepad', icon: '/icons/notepad.png' };

export function launch(ctx, initialText = "") {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx, initialText);
}

export function mount(winEl, ctx, initialText = "") {
  const container = winEl.querySelector('.content');
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";

  const STORAGE_KEY = "notepad-autosave";

  const menu = document.createElement("div");
  menu.classList.add("notepad-menu");

  function makeBtn(label, title) {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (title) btn.title = title;
    return btn;
  }

  const newBtn = makeBtn("New", "New file");
  const openBtn = makeBtn("Open", "Open file");
  const saveBtn = makeBtn("Save", "Save file");
  const saveAsBtn = makeBtn("Save As", "Save as");
  const wrapBtn = makeBtn("Wrap", "Toggle word wrap");
  const undoBtn = makeBtn("Undo", "Undo");
  const redoBtn = makeBtn("Redo", "Redo");
  menu.append(newBtn, openBtn, saveBtn, saveAsBtn, wrapBtn, undoBtn, redoBtn);
  container.append(menu);

  const textarea = document.createElement("textarea");
  textarea.classList.add("notepad-editor");
  textarea.value = initialText || localStorage.getItem(STORAGE_KEY) || "";
  container.append(textarea);

  const editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: "text/plain",
    lineWrapping: true,
    tabSize: 4,
    indentUnit: 4,
    indentWithTabs: true,
    smartIndent: true,
  });

  winEl.addEventListener("resized", () => editor.refresh());
  setTimeout(() => editor.refresh(), 0);

  let currentFileHandle = null;
  let wrapEnabled = true;

  function downloadFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  editor.on("change", () => {
    try {
      localStorage.setItem(STORAGE_KEY, editor.getValue());
    } catch {}
  });

  newBtn.addEventListener("click", () => {
    if (!confirm("Discard current document?")) return;
    editor.setValue("");
    currentFileHandle = null;
    localStorage.removeItem(STORAGE_KEY);
  });

  openBtn.addEventListener("click", async () => {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Text files",
              accept: {
                "text/plain": [".txt", ".md", ".csv", ".js", ".html", ".css"],
              },
            },
          ],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        const content = await file.text();
        editor.setValue(content);
        currentFileHandle = fileHandle;
        localStorage.setItem(STORAGE_KEY, content);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.md,.csv,.js,.html,.css";
        input.style.display = "none";
        document.body.append(input);
        input.addEventListener("change", () => {
          const file = input.files[0];
          if (!file) return;
          file.text().then((text) => {
            editor.setValue(text);
            localStorage.setItem(STORAGE_KEY, text);
          });
          currentFileHandle = null;
          input.remove();
        });
        input.click();
      }
    } catch (err) {
      console.error(err);
    }
  });

  async function saveToHandle(handle) {
    const text = editor.getValue();
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    alert("File saved successfully.");
  }

  saveBtn.addEventListener("click", async () => {
    const text = editor.getValue();
    try {
      if (currentFileHandle) {
        await saveToHandle(currentFileHandle);
      } else if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: "untitled.txt",
          types: [
            { description: "Text files", accept: { "text/plain": [".txt"] } },
          ],
        });
        await saveToHandle(fileHandle);
        currentFileHandle = fileHandle;
      } else {
        downloadFile("untitled.txt", text);
      }
    } catch (err) {
      console.error(err);
    }
  });

  saveAsBtn.addEventListener("click", async () => {
    const text = editor.getValue();
    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: "untitled.txt",
          types: [
            { description: "Text files", accept: { "text/plain": [".txt"] } },
          ],
        });
        await saveToHandle(fileHandle);
        currentFileHandle = fileHandle;
      } else {
        downloadFile("untitled.txt", text);
      }
    } catch (err) {
      console.error(err);
    }
  });

  wrapBtn.addEventListener("click", () => {
    wrapEnabled = !wrapEnabled;
    editor.setOption("lineWrapping", wrapEnabled);
    wrapBtn.classList.toggle("active", wrapEnabled);
  });

  undoBtn.addEventListener("click", () => editor.undo && editor.undo());
  redoBtn.addEventListener("click", () => editor.redo && editor.redo());
}
