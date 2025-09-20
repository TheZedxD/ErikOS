import assert from 'assert';
import { setupTestDOM, createMouseEvent } from './helpers/domStub.js';
import { WindowManager } from '../src/js/core/windowManager.js';

function testMaximizeRestore() {
  const env = setupTestDOM({ width: 1024, height: 768 });
  try {
    const wm = new WindowManager();
    const content = document.createElement('div');
    const id = wm.createWindow('test-app', 'Test App', content);
    const info = wm.windows.get(id);
    assert(info, 'window info should be stored');

    wm.toggleMaximize(id);
    assert.strictEqual(info.maximized, true, 'window should be maximized');
    assert.strictEqual(info.element.style.left, '0px');
    assert.strictEqual(info.element.style.top, '0px');
    assert.strictEqual(info.element.style.width, '100%');
    assert.strictEqual(info.element.style.height, '100%');
    assert(info.element.classList.contains('maximized'));

    wm.toggleMaximize(id);
    assert.strictEqual(info.maximized, false, 'window should be restored');
    assert.strictEqual(info.element.classList.contains('maximized'), false);
    assert.strictEqual(info.element.style.left, '100px');
    assert.strictEqual(info.element.style.top, '100px');
  } finally {
    env.cleanup();
  }
}

function testBoundsClamping() {
  const env = setupTestDOM({ width: 800, height: 600 });
  try {
    const wm = new WindowManager();
    const content = document.createElement('div');
    const id = wm.createWindow('clamp-app', 'Clamp', content);
    const info = wm.windows.get(id);
    assert(info, 'window info should be stored');

    info.element.style.width = '300px';
    info.element.style.height = '200px';
    const handle = info.dragHandle || info.header.querySelector('.title');

    handle.dispatchEvent(
      createMouseEvent('mousedown', { button: 0, clientX: 150, clientY: 150 })
    );
    window.dispatchEvent(createMouseEvent('mousemove', { clientX: -50, clientY: -50 }));
    window.dispatchEvent(createMouseEvent('mouseup', {}));

    assert.strictEqual(info.element.style.left, '0px');
    assert.strictEqual(info.element.style.top, '0px');

    handle.dispatchEvent(
      createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
    );
    window.dispatchEvent(createMouseEvent('mousemove', { clientX: 600, clientY: 500 }));
    window.dispatchEvent(createMouseEvent('mouseup', {}));

    assert.strictEqual(info.element.style.left, '500px');
    assert.strictEqual(info.element.style.top, '400px');

    const saved = JSON.parse(localStorage.getItem('win-pos-clamp-app'));
    assert.deepStrictEqual(saved, { left: 500, top: 400, width: 300, height: 200 });
  } finally {
    env.cleanup();
  }
}

function run() {
  testMaximizeRestore();
  testBoundsClamping();
  console.log('windowManager tests passed');
}

run();

