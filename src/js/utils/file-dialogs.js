const supportsFileSystemAccess = () =>
  typeof window !== 'undefined' && !!window.showOpenFilePicker;

function buildAcceptString(types = []) {
  if (!Array.isArray(types) || types.length === 0) return '';
  const values = new Set();
  for (const type of types) {
    if (!type || !type.accept) continue;
    for (const [mime, extensions] of Object.entries(type.accept)) {
      if (mime && mime !== '*/*') values.add(mime);
      if (Array.isArray(extensions)) {
        for (const ext of extensions) {
          if (ext) values.add(ext);
        }
      }
    }
  }
  return Array.from(values).join(',');
}

export async function pickOpen({ types = [], multiple = false } = {}) {
  if (supportsFileSystemAccess()) {
    try {
      const handles = await window.showOpenFilePicker({ types, multiple });
      const entries = await Promise.all(
        handles.map(async (handle) => ({
          handle,
          file: await handle.getFile(),
        })),
      );
      return multiple ? entries : entries[0] ?? null;
    } catch (err) {
      if (err?.name === 'AbortError') return multiple ? [] : null;
      throw err;
    }
  }

  const accept = buildAcceptString(types);
  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = Boolean(multiple);
    if (accept) input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    input.style.top = '0';
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []).map((file) => ({ file, handle: null }));
      input.remove();
      resolve(multiple ? files : files[0] ?? null);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(multiple ? [] : null);
    });
    document.body.append(input);
    input.click();
  });
}

export async function pickSave({ suggestedName, types = [] } = {}) {
  if (supportsFileSystemAccess() && window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({ suggestedName, types });
    return {
      kind: 'handle',
      handle,
      suggestedName: handle.name || suggestedName,
      async write(contents, type = 'application/octet-stream') {
        const blob =
          contents instanceof Blob ? contents : new Blob([contents], { type });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      },
    };
  }

  const accept = buildAcceptString(types);
  let downloadName = suggestedName || 'download';
  if (accept) {
    const ext = accept
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.startsWith('.'));
    if (ext && !downloadName.toLowerCase().endsWith(ext.toLowerCase())) {
      downloadName += ext;
    }
  }

  return {
    kind: 'download',
    handle: null,
    suggestedName: downloadName,
    async write(contents, type = 'application/octet-stream') {
      const blob =
        contents instanceof Blob ? contents : new Blob([contents], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = url;
      anchor.download = downloadName;
      document.body.append(anchor);
      anchor.click();
      const cleanup = () => {
        anchor.remove();
        URL.revokeObjectURL(url);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cleanup);
      else setTimeout(cleanup, 0);
    },
  };
}

export function __test__buildAcceptString(types) {
  return buildAcceptString(types);
}
